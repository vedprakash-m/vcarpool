"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryBuilder = exports.DatabaseQueryOptimizer = void 0;
const logger_1 = require("./logger");
const cache_1 = require("./cache");
/**
 * Default query configuration
 */
const defaultQueryConfig = {
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
class DatabaseQueryOptimizer {
    static SLOW_QUERY_THRESHOLD = 1000; // 1 second
    static HIGH_RU_THRESHOLD = 10; // 10 RUs
    /**
     * Execute an optimized query with caching and performance monitoring
     */
    static async executeQuery(container, querySpec, partitionKey, config = {}) {
        const queryConfig = { ...defaultQueryConfig, ...config };
        const startTime = Date.now();
        // Generate cache key
        const cacheKey = this.generateCacheKey(querySpec, partitionKey);
        // Try to get from cache first
        if (queryConfig.enableCaching) {
            const cached = cache_1.globalCache.get(cacheKey);
            if (cached) {
                logger_1.logger.debug('Query cache hit', {
                    query: querySpec.query,
                    cacheKey,
                    duration: Date.now() - startTime,
                });
                return cached;
            }
        }
        // Prepare feed options
        const feedOptions = {
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
            logger_1.logger.debug('Executing database query', {
                query: querySpec.query,
                parameters: querySpec.parameters,
                partitionKey,
                feedOptions,
            });
            const queryIterator = container.items.query(querySpec, feedOptions);
            const results = [];
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
                    logger_1.logger.warn('High RU consumption detected', {
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
                cache_1.globalCache.set(cacheKey, results, queryConfig.cacheTtl);
            }
            return results;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            logger_1.logger.error('Database query failed', {
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
    static async executePointRead(container, id, partitionKey, cacheTtl = 10 * 60 * 1000 // 10 minutes for point reads
    ) {
        const startTime = Date.now();
        const cacheKey = cache_1.CacheKeyGenerator.withNamespace('point-read', `${container.id}:${id}:${partitionKey}`);
        // Try cache first
        const cached = cache_1.globalCache.get(cacheKey);
        if (cached) {
            logger_1.logger.debug('Point read cache hit', {
                id,
                partitionKey,
                duration: Date.now() - startTime,
            });
            return cached;
        }
        try {
            logger_1.logger.debug('Executing point read', { id, partitionKey });
            // Use type assertion to satisfy ItemDefinition constraint
            const response = await container.item(id, partitionKey).read();
            const duration = Date.now() - startTime;
            if (response.resource) {
                // Cache the result
                cache_1.globalCache.set(cacheKey, response.resource, cacheTtl);
                logger_1.logger.debug('Point read successful', {
                    id,
                    partitionKey,
                    requestCharge: response.requestCharge,
                    duration,
                });
                return response.resource;
            }
            return null;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            if (error.code === 404) {
                logger_1.logger.debug('Point read - document not found', {
                    id,
                    partitionKey,
                    duration,
                });
                return null;
            }
            logger_1.logger.error('Point read failed', {
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
    static async executeBulkOperation(container, operations) {
        const startTime = Date.now();
        try {
            logger_1.logger.debug('Executing bulk operation', {
                operationCount: operations.length,
                operationTypes: [...new Set(operations.map(op => op.operationType))],
            });
            // Convert operations to the expected type based on operation type
            // The CosmosDB SDK expects specific type for each operation
            const bulkOperations = operations.map(op => {
                const baseOperation = {
                    id: op.id,
                    partitionKey: op.partitionKey,
                };
                switch (op.operationType) {
                    case 'Create':
                        return {
                            operationType: 'Create',
                            ...baseOperation,
                            resourceBody: op.resourceBody
                        };
                    case 'Upsert':
                        return {
                            operationType: 'Upsert',
                            ...baseOperation,
                            resourceBody: op.resourceBody
                        };
                    case 'Replace':
                        return {
                            operationType: 'Replace',
                            ...baseOperation,
                            resourceBody: op.resourceBody
                        };
                    case 'Delete':
                        return {
                            operationType: 'Delete',
                            ...baseOperation
                        };
                    default:
                        throw new Error(`Unsupported operation type: ${op.operationType}`);
                }
            });
            // Type assertion to help TypeScript understand our mapping handled the type correctly
            const response = await container.items.bulk(bulkOperations);
            const duration = Date.now() - startTime;
            // Analyze results
            const successful = response.filter(r => r.statusCode >= 200 && r.statusCode < 300);
            const failed = response.filter(r => r.statusCode >= 400);
            if (failed.length > 0) {
                logger_1.logger.warn('Bulk operation partially failed', {
                    total: operations.length,
                    successful: successful.length,
                    failed: failed.length,
                    failedOperations: failed.map(f => ({
                        statusCode: f.statusCode,
                        resourceBody: f.resourceBody, // Using resourceBody instead of resourceId
                    })),
                    duration,
                });
            }
            else {
                logger_1.logger.info('Bulk operation successful', {
                    operationCount: operations.length,
                    totalRequestCharge: response.reduce((sum, r) => sum + (r.requestCharge || 0), 0),
                    duration,
                });
            }
            // Invalidate related cache entries
            this.invalidateRelatedCache(operations);
        }
        catch (error) {
            const duration = Date.now() - startTime;
            logger_1.logger.error('Bulk operation failed', {
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
    static createPaginatedQuery(baseQuery, parameters = [], continuationToken, pageSize = 20) {
        // Add OFFSET LIMIT for pagination if no continuation token
        let query = baseQuery;
        const queryParameters = [...parameters];
        if (!continuationToken && !query.toLowerCase().includes('offset')) {
            // Note: Cosmos DB recommends using continuation tokens over OFFSET for better performance
            logger_1.logger.warn('Using OFFSET for pagination - consider using continuation tokens for better performance');
        }
        return {
            query,
            parameters: queryParameters,
        };
    }
    /**
     * Generate cache key for query
     */
    static generateCacheKey(querySpec, partitionKey) {
        const queryHash = Buffer.from(JSON.stringify({
            query: querySpec.query,
            parameters: querySpec.parameters,
            partitionKey,
        })).toString('base64');
        return cache_1.CacheKeyGenerator.withNamespace('query', queryHash);
    }
    /**
     * Log query performance metrics
     */
    static logQueryMetrics(querySpec, metrics) {
        const { duration, totalRequestCharge, resultCount, pageCount, cached } = metrics;
        // Log as warning if query is slow or expensive
        if (duration > this.SLOW_QUERY_THRESHOLD || totalRequestCharge > this.HIGH_RU_THRESHOLD) {
            logger_1.logger.warn('Slow or expensive query detected', {
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
        }
        else {
            logger_1.logger.debug('Query performance metrics', {
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
    static invalidateRelatedCache(operations) {
        const cacheKeysToInvalidate = new Set();
        for (const operation of operations) {
            // Invalidate specific document cache
            if (operation.id) {
                const pointReadKey = cache_1.CacheKeyGenerator.withNamespace('point-read', `*:${operation.id}:${operation.partitionKey}`);
                cacheKeysToInvalidate.add(pointReadKey);
            }
            // Invalidate related query caches (this is a simplified approach)
            // In a real implementation, you might maintain a more sophisticated cache invalidation strategy
            const relatedKeys = cache_1.globalCache.keys().filter(key => key.includes(operation.partitionKey) || key.includes('query:'));
            relatedKeys.forEach(key => cacheKeysToInvalidate.add(key));
        }
        // Clear the cache entries
        cacheKeysToInvalidate.forEach(key => cache_1.globalCache.delete(key));
        if (cacheKeysToInvalidate.size > 0) {
            logger_1.logger.debug('Cache invalidation completed', {
                invalidatedKeys: cacheKeysToInvalidate.size,
            });
        }
    }
}
exports.DatabaseQueryOptimizer = DatabaseQueryOptimizer;
/**
 * Query builder utility for common patterns
 */
class QueryBuilder {
    query = '';
    parameters = [];
    parameterIndex = 0;
    static create() {
        return new QueryBuilder();
    }
    select(fields = '*') {
        this.query = `SELECT ${fields}`;
        return this;
    }
    from(container, alias) {
        this.query += ` FROM ${container}${alias ? ` ${alias}` : ''}`;
        return this;
    }
    where(condition, value) {
        if (this.query.includes('WHERE')) {
            this.query += ` AND ${condition}`;
        }
        else {
            this.query += ` WHERE ${condition}`;
        }
        if (value !== undefined) {
            this.parameters.push({ name: `@param${this.parameterIndex}`, value });
            this.query = this.query.replace('?', `@param${this.parameterIndex}`);
            this.parameterIndex++;
        }
        return this;
    }
    orderBy(field, direction = 'ASC') {
        this.query += ` ORDER BY ${field} ${direction}`;
        return this;
    }
    limit(count) {
        this.query += ` OFFSET 0 LIMIT ${count}`;
        return this;
    }
    build() {
        return {
            query: this.query,
            parameters: this.parameters,
        };
    }
}
exports.QueryBuilder = QueryBuilder;
//# sourceMappingURL=database-optimizer.js.map