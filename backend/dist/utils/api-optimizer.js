"use strict";
/**
 * API Performance Optimization Utilities
 * Utilities for optimizing API performance, response times, and resource usage
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceMonitor = exports.ResponseCache = exports.RequestDeduplicator = exports.PaginationOptimizer = exports.RequestBatcher = exports.ResponseCompression = void 0;
exports.performanceOptimization = performanceOptimization;
const uuid_1 = require("uuid");
const cache_1 = require("./cache");
const logger_1 = require("./logger");
/**
 * API Response compression utilities
 */
class ResponseCompression {
    static COMPRESSION_THRESHOLD = 1024; // 1KB
    static MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
    /**
     * Compress response data for large payloads
     */
    static compressResponse(data) {
        try {
            const jsonString = JSON.stringify(data);
            if (jsonString.length < this.COMPRESSION_THRESHOLD) {
                return jsonString;
            }
            // In a real implementation, you might use gzip or other compression
            // For now, we'll implement basic optimizations
            return this.optimizeJsonResponse(data);
        }
        catch (error) {
            logger_1.logger.warn('Response compression failed', { error: error instanceof Error ? error.message : 'Unknown error' });
            return JSON.stringify(data);
        }
    }
    /**
     * Optimize JSON response structure
     */
    static optimizeJsonResponse(data) {
        // Remove null values and empty arrays/objects to reduce payload size
        const optimized = this.removeEmptyValues(data);
        return JSON.stringify(optimized);
    }
    /**
     * Recursively remove empty values from objects
     */
    static removeEmptyValues(obj) {
        if (Array.isArray(obj)) {
            return obj
                .map(item => this.removeEmptyValues(item))
                .filter(item => item !== null && item !== undefined);
        }
        if (obj !== null && typeof obj === 'object') {
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                const cleanValue = this.removeEmptyValues(value);
                // Skip null, undefined, empty strings, empty arrays, empty objects
                if (cleanValue !== null &&
                    cleanValue !== undefined &&
                    cleanValue !== '' &&
                    !(Array.isArray(cleanValue) && cleanValue.length === 0) &&
                    !(typeof cleanValue === 'object' && Object.keys(cleanValue).length === 0)) {
                    result[key] = cleanValue;
                }
            }
            return result;
        }
        return obj;
    }
}
exports.ResponseCompression = ResponseCompression;
/**
 * Request batching utilities for bulk operations
 */
class RequestBatcher {
    static batchQueues = new Map();
    static batchTimers = new Map();
    static BATCH_SIZE = 10;
    static BATCH_TIMEOUT = 100; // 100ms
    /**
     * Add request to batch queue
     */
    static addToBatch(batchKey, request, processor) {
        return new Promise((resolve, reject) => {
            if (!this.batchQueues.has(batchKey)) {
                this.batchQueues.set(batchKey, []);
            }
            const queue = this.batchQueues.get(batchKey);
            queue.push({ request, resolve, reject });
            // Process batch if it reaches the size limit
            if (queue.length >= this.BATCH_SIZE) {
                this.processBatch(batchKey, processor);
            }
            else {
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
    static async processBatch(batchKey, processor) {
        const queue = this.batchQueues.get(batchKey);
        if (!queue || queue.length === 0)
            return;
        // Clear timer
        const timer = this.batchTimers.get(batchKey);
        if (timer) {
            clearTimeout(timer);
            this.batchTimers.delete(batchKey);
        }
        // Extract requests and callbacks
        const requests = queue.map(item => item.request);
        const callbacks = queue.map(item => ({ resolve: item.resolve, reject: item.reject }));
        // Clear queue
        this.batchQueues.set(batchKey, []);
        try {
            const results = await processor(requests);
            // Resolve individual promises
            callbacks.forEach((callback, index) => {
                if (results[index] !== undefined) {
                    callback.resolve(results[index]);
                }
                else {
                    callback.reject(new Error('Batch processing failed for item'));
                }
            });
        }
        catch (error) {
            // Reject all promises in batch
            callbacks.forEach(callback => {
                callback.reject(error);
            });
        }
    }
}
exports.RequestBatcher = RequestBatcher;
/**
 * API pagination optimization
 */
class PaginationOptimizer {
    static DEFAULT_PAGE_SIZE = 20;
    static MAX_PAGE_SIZE = 100;
    static MIN_PAGE_SIZE = 1;
    /**
     * Optimize pagination parameters
     */
    static optimizePagination(query) {
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
    static createPaginatedResponse(data, totalCount, page, limit, additionalMeta) {
        const totalPages = Math.ceil(totalCount / limit);
        return {
            data,
            pagination: {
                page,
                limit,
                totalPages,
                totalCount,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            ...(additionalMeta && { meta: additionalMeta })
        };
    }
}
exports.PaginationOptimizer = PaginationOptimizer;
/**
 * Request deduplication for concurrent identical requests
 */
class RequestDeduplicator {
    static pendingRequests = new Map();
    /**
     * Deduplicate identical concurrent requests
     */
    static async deduplicate(key, requestFn, ttl = 5000 // 5 seconds
    ) {
        // Check if request is already pending
        if (this.pendingRequests.has(key)) {
            logger_1.logger.debug('Request deduplicated', { key });
            return this.pendingRequests.get(key);
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
exports.RequestDeduplicator = RequestDeduplicator;
/**
 * Response caching with smart invalidation
 */
class ResponseCache {
    static CACHE_PREFIX = 'response:';
    /**
     * Get cached response or execute function
     */
    static async getOrSet(key, fn, ttl = 300000, // 5 minutes
    options) {
        const cacheKey = `${this.CACHE_PREFIX}${key}`;
        try {
            const cached = cache_1.globalCache.get(cacheKey);
            if (cached !== null) {
                // Return cached value and optionally refresh in background
                if (options?.staleWhileRevalidate) {
                    // Refresh in background without waiting
                    setImmediate(async () => {
                        try {
                            const fresh = await fn();
                            cache_1.globalCache.set(cacheKey, fresh, ttl);
                            // Note: Tags support removed as not supported by the cache implementation
                        }
                        catch (error) {
                            logger_1.logger.warn('Background cache refresh failed', { key, error: error instanceof Error ? error.message : 'Unknown error' });
                        }
                    });
                }
                return cached;
            }
            // Cache miss - execute function
            const result = await fn();
            cache_1.globalCache.set(cacheKey, result, ttl);
            // Note: Tags support removed as not supported by the cache implementation
            return result;
        }
        catch (error) {
            logger_1.logger.error('Response cache error', { key, error: error instanceof Error ? error.message : 'Unknown error' });
            // Fallback to direct execution
            return fn();
        }
    }
    /**
     * Invalidate cached responses by tag
     * Note: This is a placeholder for tag-based invalidation
     * which is not currently supported by our cache implementation
     */
    static invalidateByTag(tag) {
        // We would need to implement our own tag tracking and invalidation
        // since globalCache doesn't directly support tag-based invalidation
        logger_1.logger.debug('Cache invalidation by tag requested (not implemented)', { tag });
    }
    /**
     * Invalidate specific response cache
     */
    static invalidate(key) {
        const cacheKey = `${this.CACHE_PREFIX}${key}`;
        cache_1.globalCache.delete(cacheKey);
    }
}
exports.ResponseCache = ResponseCache;
/**
 * Performance monitoring for API endpoints
 */
class PerformanceMonitor {
    static metrics = new Map();
    /**
     * Track request performance
     */
    static trackRequest(endpoint, duration, success, slowThreshold = 1000) {
        const key = endpoint;
        const current = this.metrics.get(key) || {
            totalRequests: 0,
            totalDuration: 0,
            averageDuration: 0,
            slowRequests: 0,
            errorRate: 0,
            lastReset: new Date()
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
        }
        else {
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
    static getMetrics(endpoint) {
        if (endpoint) {
            return this.metrics.get(endpoint) || null;
        }
        return Object.fromEntries(this.metrics);
    }
    /**
     * Reset metrics for endpoint
     */
    static resetMetrics(endpoint) {
        this.metrics.set(endpoint, {
            totalRequests: 0,
            totalDuration: 0,
            averageDuration: 0,
            slowRequests: 0,
            errorRate: 0,
            lastReset: new Date()
        });
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
/**
 * Middleware for API performance optimization
 */
function performanceOptimization(options) {
    return function (handler) {
        return async (request) => {
            const startTime = Date.now();
            const requestId = (0, uuid_1.v4)();
            const endpoint = `${request.method} ${request.url}`;
            try {
                let response;
                if (options?.enableDeduplication && request.method === 'GET') {
                    // Deduplicate GET requests
                    const dedupeKey = `${request.method}:${request.url}:${JSON.stringify(request.query)}`;
                    response = await RequestDeduplicator.deduplicate(dedupeKey, () => handler(request));
                }
                else {
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
                // Add performance headers
                if (!response.headers)
                    response.headers = {};
                // Use type-safe method to set headers
                const headers = new Headers(response.headers);
                headers.set('X-Response-Time', `${duration}ms`);
                headers.set('X-Request-ID', requestId);
                response.headers = Object.fromEntries(headers.entries());
                return response;
            }
            catch (error) {
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
//# sourceMappingURL=api-optimizer.js.map