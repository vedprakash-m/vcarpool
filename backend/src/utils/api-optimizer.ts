/**
 * API Performance Optimization Utilities
 * Utilities for optimizing API performance, response times, and resource usage
 */

import { HttpRequest, HttpResponseInit } from '@azure/functions';
import { v4 as uuidv4 } from 'uuid';
import { globalCache, CacheKeyGenerator } from './cache';
import { logger } from './logger';

/**
 * API Response compression utilities
 */
export class ResponseCompression {
  private static readonly COMPRESSION_THRESHOLD = 1024; // 1KB
  private static readonly MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB

  /**
   * Compress response data for large payloads
   */
  static compressResponse(data: any): string {
    try {
      const jsonString = JSON.stringify(data);

      if (jsonString.length < this.COMPRESSION_THRESHOLD) {
        return jsonString;
      }

      // In a real implementation, you might use gzip or other compression
      // For now, we'll implement basic optimizations
      return this.optimizeJsonResponse(data);
    } catch (error) {
      logger.warn('Response compression failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return JSON.stringify(data);
    }
  }

  /**
   * Optimize JSON response structure
   */
  private static optimizeJsonResponse(data: any): string {
    // Remove null values and empty arrays/objects to reduce payload size
    const optimized = this.removeEmptyValues(data);
    return JSON.stringify(optimized);
  }

  /**
   * Recursively remove empty values from objects
   */
  private static removeEmptyValues(obj: any): any {
    if (Array.isArray(obj)) {
      return obj
        .map((item) => this.removeEmptyValues(item))
        .filter((item) => item !== null && item !== undefined);
    }

    if (obj !== null && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const cleanValue = this.removeEmptyValues(value);

        // Skip null, undefined, empty strings, empty arrays, empty objects
        if (
          cleanValue !== null &&
          cleanValue !== undefined &&
          cleanValue !== '' &&
          !(Array.isArray(cleanValue) && cleanValue.length === 0) &&
          !(typeof cleanValue === 'object' && Object.keys(cleanValue).length === 0)
        ) {
          result[key] = cleanValue;
        }
      }
      return result;
    }

    return obj;
  }
}

/**
 * Request batching utilities for bulk operations
 */
export class RequestBatcher {
  private static batchQueues = new Map<string, any[]>();
  private static batchTimers = new Map<string, NodeJS.Timeout>();
  private static readonly BATCH_SIZE = 10;
  private static readonly BATCH_TIMEOUT = 100; // 100ms

  /**
   * Add request to batch queue
   */
  static addToBatch<T>(
    batchKey: string,
    request: T,
    processor: (batch: T[]) => Promise<any[]>,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.batchQueues.has(batchKey)) {
        this.batchQueues.set(batchKey, []);
      }

      const queue = this.batchQueues.get(batchKey)!;
      queue.push({ request, resolve, reject });

      // Process batch if it reaches the size limit
      if (queue.length >= this.BATCH_SIZE) {
        this.processBatch(batchKey, processor);
      } else {
        // Set timer for batch processing
        if (!this.batchTimers.has(batchKey)) {
          const timer = setTimeout(() => {
            this.processBatch(batchKey, processor);
          }, this.BATCH_TIMEOUT);

          this.batchTimers.set(batchKey, timer);
        }
      }
    });
  }

  /**
   * Process accumulated batch
   */
  private static async processBatch<T>(
    batchKey: string,
    processor: (batch: T[]) => Promise<any[]>,
  ): Promise<void> {
    const queue = this.batchQueues.get(batchKey);
    if (!queue || queue.length === 0) return;

    // Clear timer
    const timer = this.batchTimers.get(batchKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(batchKey);
    }

    // Extract requests and callbacks
    const requests = queue.map((item) => item.request);
    const callbacks = queue.map((item) => ({
      resolve: item.resolve,
      reject: item.reject,
    }));

    // Clear queue
    this.batchQueues.set(batchKey, []);

    try {
      const results = await processor(requests);

      // Resolve individual promises
      callbacks.forEach((callback, index) => {
        if (results[index] !== undefined) {
          callback.resolve(results[index]);
        } else {
          callback.reject(new Error('Batch processing failed for item'));
        }
      });
    } catch (error) {
      // Reject all promises in batch
      callbacks.forEach((callback) => {
        callback.reject(error);
      });
    }
  }
}

/**
 * API pagination optimization
 */
export class PaginationOptimizer {
  private static readonly DEFAULT_PAGE_SIZE = 20;
  private static readonly MAX_PAGE_SIZE = 100;
  private static readonly MIN_PAGE_SIZE = 1;

  /**
   * Optimize pagination parameters
   */
  static optimizePagination(query: any): {
    page: number;
    limit: number;
    offset: number;
    cacheKey: string;
  } {
    const page = Math.max(parseInt(query.page) || 1, 1);
    let limit = parseInt(query.limit) || this.DEFAULT_PAGE_SIZE;

    // Enforce limits
    limit = Math.max(this.MIN_PAGE_SIZE, Math.min(this.MAX_PAGE_SIZE, limit));

    const offset = (page - 1) * limit;
    const cacheKey = `pagination:${page}:${limit}:${JSON.stringify(query)}`;

    return { page, limit, offset, cacheKey };
  }

  /**
   * Create paginated response with metadata
   */
  static createPaginatedResponse<T>(
    data: T[],
    totalCount: number,
    page: number,
    limit: number,
    additionalMeta?: any,
  ): {
    data: T[];
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
      totalCount: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    meta?: any;
  } {
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      ...(additionalMeta && { meta: additionalMeta }),
    };
  }
}

/**
 * Request deduplication for concurrent identical requests
 */
export class RequestDeduplicator {
  private static pendingRequests = new Map<string, Promise<any>>();

  /**
   * Deduplicate identical concurrent requests
   */
  static async deduplicate<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl: number = 5000, // 5 seconds
  ): Promise<T> {
    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      logger.debug('Request deduplicated', { key });
      return this.pendingRequests.get(key)!;
    }

    // Execute request and store promise
    const promise = requestFn();
    this.pendingRequests.set(key, promise);

    // Clean up after completion or timeout
    const cleanup = () => {
      this.pendingRequests.delete(key);
    };

    promise.then(cleanup, cleanup);

    // Set timeout cleanup
    setTimeout(cleanup, ttl);

    return promise;
  }
}

/**
 * Response caching with smart invalidation
 */
export class ResponseCache {
  private static readonly CACHE_PREFIX = 'response:';

  /**
   * Get cached response or execute function
   */
  static async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = 300000, // 5 minutes
    options?: {
      staleWhileRevalidate?: boolean;
      tags?: string[];
    },
  ): Promise<T> {
    const cacheKey = `${this.CACHE_PREFIX}${key}`;

    try {
      const cached = globalCache.get(cacheKey);

      if (cached !== null) {
        // Return cached value and optionally refresh in background
        if (options?.staleWhileRevalidate) {
          // Refresh in background without waiting
          setImmediate(async () => {
            try {
              const fresh = await fn();
              globalCache.set(cacheKey, fresh, ttl);
              // Note: Tags support removed as not supported by the cache implementation
            } catch (error) {
              logger.warn('Background cache refresh failed', {
                key,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          });
        }

        return cached as T;
      }

      // Cache miss - execute function
      const result = await fn();
      globalCache.set(cacheKey, result, ttl);
      // Note: Tags support removed as not supported by the cache implementation

      return result;
    } catch (error) {
      logger.error('Response cache error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Fallback to direct execution
      return fn();
    }
  }

  /**
   * Invalidate cached responses by tag
   * Note: This is a placeholder for tag-based invalidation
   * which is not currently supported by our cache implementation
   */
  static invalidateByTag(tag: string): void {
    // We would need to implement our own tag tracking and invalidation
    // since globalCache doesn't directly support tag-based invalidation
    logger.debug('Cache invalidation by tag requested (not implemented)', {
      tag,
    });
  }

  /**
   * Invalidate specific response cache
   */
  static invalidate(key: string): void {
    const cacheKey = `${this.CACHE_PREFIX}${key}`;
    globalCache.delete(cacheKey);
  }
}

/**
 * Performance monitoring for API endpoints
 */
export class PerformanceMonitor {
  private static metrics = new Map<
    string,
    {
      totalRequests: number;
      totalDuration: number;
      averageDuration: number;
      slowRequests: number;
      errorRate: number;
      lastReset: Date;
    }
  >();

  /**
   * Track request performance
   */
  static trackRequest(
    endpoint: string,
    duration: number,
    success: boolean,
    slowThreshold: number = 1000,
  ): void {
    const key = endpoint;
    const current = this.metrics.get(key) || {
      totalRequests: 0,
      totalDuration: 0,
      averageDuration: 0,
      slowRequests: 0,
      errorRate: 0,
      lastReset: new Date(),
    };

    current.totalRequests++;
    current.totalDuration += duration;
    current.averageDuration = current.totalDuration / current.totalRequests;

    if (duration > slowThreshold) {
      current.slowRequests++;
    }

    if (!success) {
      const errorCount = current.totalRequests * current.errorRate + 1;
      current.errorRate = errorCount / current.totalRequests;
    } else {
      const errorCount = current.totalRequests * current.errorRate;
      current.errorRate = errorCount / current.totalRequests;
    }

    this.metrics.set(key, current);

    // Reset metrics daily
    const hoursSinceReset = (Date.now() - current.lastReset.getTime()) / (1000 * 60 * 60);
    if (hoursSinceReset >= 24) {
      this.resetMetrics(key);
    }
  }

  /**
   * Get performance metrics for endpoint
   */
  static getMetrics(endpoint?: string): any {
    if (endpoint) {
      return this.metrics.get(endpoint) || null;
    }

    return Object.fromEntries(this.metrics);
  }

  /**
   * Reset metrics for endpoint
   */
  private static resetMetrics(endpoint: string): void {
    this.metrics.set(endpoint, {
      totalRequests: 0,
      totalDuration: 0,
      averageDuration: 0,
      slowRequests: 0,
      errorRate: 0,
      lastReset: new Date(),
    });
  }
}

/**
 * Middleware for API performance optimization
 */
export function performanceOptimization(options?: {
  enableCompression?: boolean;
  enableCaching?: boolean;
  enableDeduplication?: boolean;
  enableMetrics?: boolean;
}) {
  return function (handler: (request: HttpRequest) => Promise<HttpResponseInit>) {
    return async (request: HttpRequest): Promise<HttpResponseInit> => {
      const startTime = Date.now();
      const requestId = uuidv4();
      const endpoint = `${request.method} ${request.url}`;

      try {
        let response: HttpResponseInit;

        if (options?.enableDeduplication && request.method === 'GET') {
          // Deduplicate GET requests
          const dedupeKey = `${request.method}:${request.url}:${JSON.stringify(request.query)}`;
          response = await RequestDeduplicator.deduplicate(dedupeKey, () => handler(request));
        } else {
          response = await handler(request);
        }

        // Apply compression if enabled
        if (options?.enableCompression && response.jsonBody) {
          const compressed = ResponseCompression.compressResponse(response.jsonBody);
          response.jsonBody = JSON.parse(compressed);
        }

        const duration = Date.now() - startTime;

        // Track metrics if enabled
        if (options?.enableMetrics) {
          const isSuccess = response.status ? response.status < 400 : true;
          PerformanceMonitor.trackRequest(endpoint, duration, isSuccess);
        }

        // Add performance headers directly to the headers object
        if (!response.headers) response.headers = {};
        const headers = response.headers as Record<string, string>;
        headers['X-Response-Time'] = `${duration}ms`;
        headers['X-Request-ID'] = requestId;

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;

        // Track error metrics
        if (options?.enableMetrics) {
          PerformanceMonitor.trackRequest(endpoint, duration, false);
        }

        throw error;
      }
    };
  };
}
