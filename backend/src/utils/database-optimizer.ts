import { Container, SqlQuerySpec, FeedOptions } from '@azure/cosmos';
import { logger } from './logger';
import { globalCache, CacheKeyGenerator } from './cache';

/**
 * Query performance metrics
 */
interface QueryMetrics {
  requestCharge: number;
  retrievedDocumentCount: number;
  retrievedDocumentSize: number;
  outputDocumentCount: number;
  outputDocumentSize: number;
  indexHitRatio: number;
  totalQueryExecutionTimeInMs: number;
}

/**
 * Query optimization configuration
 */
interface QueryConfig {
  enableCaching: boolean;
  cacheTtl: number;
  maxItemCount: number;
  enableCrossPartitionQuery: boolean;
  maxDegreeOfParallelism: number;
  enableOptimisticDirectExecution: boolean;
  enableLowPrecisionOrderBy: boolean;
}

/**
 * Default query configuration
 */
const defaultQueryConfig: QueryConfig = {
  enableCaching: true,
  cacheTtl: 5 * 60 * 1000, // 5 minutes
  maxItemCount: 100,
  enableCrossPartitionQuery: true,
  maxDegreeOfParallelism: 10,
  enableOptimisticDirectExecution: true,
  enableLowPrecisionOrderBy: false,
};

/**
 * Enhanced database query utility with performance optimization
 */
export class DatabaseQueryOptimizer {
  private static readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second
  private static readonly HIGH_RU_THRESHOLD = 10; // 10 RUs

  /**
   * Execute an optimized query with caching and performance monitoring
   */
  static async executeQuery<T>(
    container: Container,
    querySpec: SqlQuerySpec,
    partitionKey?: string,
    config: Partial<QueryConfig> = {},
  ): Promise<T[]> {
    const queryConfig = { ...defaultQueryConfig, ...config };
    const startTime = Date.now();

    // Generate cache key
    const cacheKey = this.generateCacheKey(querySpec, partitionKey);

    // Try to get from cache first
    if (queryConfig.enableCaching) {
      const cached = globalCache.get(cacheKey);
      if (cached) {
        logger.debug('Query cache hit', {
          query: querySpec.query,
          cacheKey,
          duration: Date.now() - startTime,
        });
        return cached as T[];
      }
    }

    // Prepare feed options
    const feedOptions: FeedOptions = {
      maxItemCount: queryConfig.maxItemCount,
      // Remove unsupported enableCrossPartitionQuery option
      maxDegreeOfParallelism: queryConfig.maxDegreeOfParallelism,
      // The following options may need to be updated based on the latest Azure SDK
      // enableOptimisticDirectExecution and enableLowPrecisionOrderBy removed as they aren't in FeedOptions
    };

    if (partitionKey) {
      feedOptions.partitionKey = partitionKey;
    }

    try {
      logger.debug('Executing database query', {
        query: querySpec.query,
        parameters: querySpec.parameters,
        partitionKey,
        feedOptions,
      });

      const queryIterator = container.items.query<T>(querySpec, feedOptions);
      const results: T[] = [];
      let totalRequestCharge = 0;
      let pageCount = 0;

      // Fetch all pages
      while (queryIterator.hasMoreResults()) {
        const response = await queryIterator.fetchNext();

        if (response.resources) {
          results.push(...response.resources);
        }

        totalRequestCharge += response.requestCharge;
        pageCount++;

        // Log metrics for each page if it's expensive
        if (response.requestCharge > this.HIGH_RU_THRESHOLD) {
          logger.warn('High RU consumption detected', {
            query: querySpec.query,
            page: pageCount,
            requestCharge: response.requestCharge,
            resultCount: response.resources?.length || 0,
          });
        }
      }

      const duration = Date.now() - startTime;

      // Log performance metrics
      this.logQueryMetrics(querySpec, {
        duration,
        totalRequestCharge,
        resultCount: results.length,
        pageCount,
        cached: false,
      });

      // Cache results if enabled and query was successful
      if (queryConfig.enableCaching && results.length > 0) {
        globalCache.set(cacheKey, results, queryConfig.cacheTtl);
      }

      return results;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Database query failed', {
        query: querySpec.query,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        partitionKey,
      });

      throw error;
    }
  }

  /**
   * Execute a single document query with optimization
   */
  static async executePointRead<T>(
    container: Container,
    id: string,
    partitionKey: string,
    cacheTtl = 10 * 60 * 1000, // 10 minutes for point reads
  ): Promise<T | null> {
    const startTime = Date.now();
    const cacheKey = CacheKeyGenerator.withNamespace(
      'point-read',
      `${container.id}:${id}:${partitionKey}`,
    );

    // Try cache first
    const cached = globalCache.get(cacheKey);
    if (cached) {
      logger.debug('Point read cache hit', {
        id,
        partitionKey,
        duration: Date.now() - startTime,
      });
      return cached as T;
    }

    try {
      logger.debug('Executing point read', { id, partitionKey });

      // Use type assertion to satisfy ItemDefinition constraint
      const response = await container.item(id, partitionKey).read<T & Record<string, any>>();
      const duration = Date.now() - startTime;

      if (response.resource) {
        // Cache the result
        globalCache.set(cacheKey, response.resource, cacheTtl);

        logger.debug('Point read successful', {
          id,
          partitionKey,
          requestCharge: response.requestCharge,
          duration,
        });

        return response.resource;
      }

      return null;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      if (error.code === 404) {
        logger.debug('Point read - document not found', {
          id,
          partitionKey,
          duration,
        });
        return null;
      }

      logger.error('Point read failed', {
        id,
        partitionKey,
        error: error.message,
        duration,
      });

      throw error;
    }
  }

  /**
   * Execute bulk operations with optimization
   */
  static async executeBulkOperation<T>(
    container: Container,
    operations: Array<{
      operationType: 'Create' | 'Upsert' | 'Replace' | 'Delete';
      resourceBody?: T;
      id?: string;
      partitionKey: string;
    }>,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      logger.debug('Executing bulk operation', {
        operationCount: operations.length,
        operationTypes: [...new Set(operations.map((op) => op.operationType))],
      });

      // Convert operations to the expected type based on operation type
      // The CosmosDB SDK expects specific type for each operation
      const bulkOperations = operations.map((op) => {
        const baseOperation = {
          id: op.id,
          partitionKey: op.partitionKey,
        };

        switch (op.operationType) {
          case 'Create':
            return {
              operationType: 'Create' as const,
              ...baseOperation,
              resourceBody: op.resourceBody,
            };
          case 'Upsert':
            return {
              operationType: 'Upsert' as const,
              ...baseOperation,
              resourceBody: op.resourceBody,
            };
          case 'Replace':
            return {
              operationType: 'Replace' as const,
              ...baseOperation,
              resourceBody: op.resourceBody,
            };
          case 'Delete':
            return {
              operationType: 'Delete' as const,
              ...baseOperation,
            };
          default:
            throw new Error(`Unsupported operation type: ${op.operationType}`);
        }
      });

      // Type assertion to help TypeScript understand our mapping handled the type correctly
      const response = await container.items.bulk(bulkOperations as any);
      const duration = Date.now() - startTime;

      // Analyze results
      const successful = response.filter((r) => r.statusCode >= 200 && r.statusCode < 300);
      const failed = response.filter((r) => r.statusCode >= 400);

      if (failed.length > 0) {
        logger.warn('Bulk operation partially failed', {
          total: operations.length,
          successful: successful.length,
          failed: failed.length,
          failedOperations: failed.map((f) => ({
            statusCode: f.statusCode,
            resourceBody: f.resourceBody, // Using resourceBody instead of resourceId
          })),
          duration,
        });
      } else {
        logger.info('Bulk operation successful', {
          operationCount: operations.length,
          totalRequestCharge: response.reduce((sum, r) => sum + (r.requestCharge || 0), 0),
          duration,
        });
      }

      // Invalidate related cache entries
      this.invalidateRelatedCache(operations);
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Bulk operation failed', {
        operationCount: operations.length,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      });

      throw error;
    }
  }

  /**
   * Create optimized query for pagination
   */
  static createPaginatedQuery(
    baseQuery: string,
    parameters: any[] = [],
    continuationToken?: string,
    pageSize = 20,
  ): SqlQuerySpec {
    // Add OFFSET LIMIT for pagination if no continuation token
    const query = baseQuery;
    const queryParameters = [...parameters];

    if (!continuationToken && !query.toLowerCase().includes('offset')) {
      // Note: Cosmos DB recommends using continuation tokens over OFFSET for better performance
      logger.warn(
        'Using OFFSET for pagination - consider using continuation tokens for better performance',
      );
    }

    return {
      query,
      parameters: queryParameters,
    };
  }

  /**
   * Generate cache key for query
   */
  private static generateCacheKey(querySpec: SqlQuerySpec, partitionKey?: string): string {
    const queryHash = Buffer.from(
      JSON.stringify({
        query: querySpec.query,
        parameters: querySpec.parameters,
        partitionKey,
      }),
    ).toString('base64');

    return CacheKeyGenerator.withNamespace('query', queryHash);
  }

  /**
   * Log query performance metrics
   */
  private static logQueryMetrics(
    querySpec: SqlQuerySpec,
    metrics: {
      duration: number;
      totalRequestCharge: number;
      resultCount: number;
      pageCount: number;
      cached: boolean;
    },
  ): void {
    const { duration, totalRequestCharge, resultCount, pageCount, cached } = metrics;

    // Log as warning if query is slow or expensive
    if (duration > this.SLOW_QUERY_THRESHOLD || totalRequestCharge > this.HIGH_RU_THRESHOLD) {
      logger.warn('Slow or expensive query detected', {
        query: querySpec.query.substring(0, 200), // Truncate long queries
        duration,
        totalRequestCharge,
        resultCount,
        pageCount,
        cached,
        performance: {
          isSlowQuery: duration > this.SLOW_QUERY_THRESHOLD,
          isExpensiveQuery: totalRequestCharge > this.HIGH_RU_THRESHOLD,
          avgRuPerResult: resultCount > 0 ? totalRequestCharge / resultCount : 0,
        },
      });
    } else {
      logger.debug('Query performance metrics', {
        query: querySpec.query.substring(0, 200),
        duration,
        totalRequestCharge,
        resultCount,
        pageCount,
        cached,
      });
    }
  }

  /**
   * Invalidate cache entries related to bulk operations
   */
  private static invalidateRelatedCache(
    operations: Array<{ partitionKey: string; id?: string }>,
  ): void {
    const cacheKeysToInvalidate = new Set<string>();

    for (const operation of operations) {
      // Invalidate specific document cache
      if (operation.id) {
        const pointReadKey = CacheKeyGenerator.withNamespace(
          'point-read',
          `*:${operation.id}:${operation.partitionKey}`,
        );
        cacheKeysToInvalidate.add(pointReadKey);
      }

      // Invalidate related query caches (this is a simplified approach)
      // In a real implementation, you might maintain a more sophisticated cache invalidation strategy
      const relatedKeys = globalCache
        .keys()
        .filter((key) => key.includes(operation.partitionKey) || key.includes('query:'));

      relatedKeys.forEach((key) => cacheKeysToInvalidate.add(key));
    }

    // Clear the cache entries
    cacheKeysToInvalidate.forEach((key) => globalCache.delete(key));

    if (cacheKeysToInvalidate.size > 0) {
      logger.debug('Cache invalidation completed', {
        invalidatedKeys: cacheKeysToInvalidate.size,
      });
    }
  }
}

/**
 * Query builder utility for common patterns
 */
export class QueryBuilder {
  private query: string = '';
  private parameters: any[] = [];
  private parameterIndex: number = 0;

  static create(): QueryBuilder {
    return new QueryBuilder();
  }

  select(fields: string = '*'): this {
    this.query = `SELECT ${fields}`;
    return this;
  }

  from(container: string, alias?: string): this {
    this.query += ` FROM ${container}${alias ? ` ${alias}` : ''}`;
    return this;
  }

  where(condition: string, value?: any): this {
    if (this.query.includes('WHERE')) {
      this.query += ` AND ${condition}`;
    } else {
      this.query += ` WHERE ${condition}`;
    }

    if (value !== undefined) {
      this.parameters.push({ name: `@param${this.parameterIndex}`, value });
      this.query = this.query.replace('?', `@param${this.parameterIndex}`);
      this.parameterIndex++;
    }

    return this;
  }

  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.query += ` ORDER BY ${field} ${direction}`;
    return this;
  }

  limit(count: number): this {
    this.query += ` OFFSET 0 LIMIT ${count}`;
    return this;
  }

  build(): SqlQuerySpec {
    return {
      query: this.query,
      parameters: this.parameters,
    };
  }
}
