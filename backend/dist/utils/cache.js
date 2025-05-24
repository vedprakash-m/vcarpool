"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheWarmer = exports.globalCache = exports.CacheKeyGenerator = exports.MemoryCache = void 0;
exports.Cacheable = Cacheable;
const logger_1 = require("../utils/logger");
/**
 * High-performance in-memory cache with TTL, LRU eviction, and metrics
 */
class MemoryCache {
    cache = new Map();
    accessOrder = new Map(); // For LRU tracking
    options;
    metrics;
    cleanupTimer;
    accessCounter = 0;
    constructor(options = {}) {
        this.options = {
            defaultTtl: options.defaultTtl || 5 * 60 * 1000, // 5 minutes
            maxSize: options.maxSize || 1000,
            cleanupInterval: options.cleanupInterval || 60 * 1000, // 1 minute
            enableMetrics: options.enableMetrics ?? true,
        };
        this.metrics = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0,
            currentSize: 0,
            hitRate: 0,
        };
        this.startCleanupTimer();
    }
    /**
     * Get an item from the cache
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            this.recordMiss();
            return null;
        }
        const now = Date.now();
        // Check if entry has expired
        if (now - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            this.accessOrder.delete(key);
            this.updateCurrentSize();
            this.recordMiss();
            return null;
        }
        // Update access information
        entry.accessCount++;
        entry.lastAccessed = now;
        this.accessOrder.set(key, ++this.accessCounter);
        this.recordHit();
        return entry.data;
    }
    /**
     * Set an item in the cache
     */
    set(key, data, ttl) {
        const now = Date.now();
        const entryTtl = ttl || this.options.defaultTtl;
        // Check if we need to evict entries
        if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
            this.evictLRU();
        }
        const entry = {
            data,
            timestamp: now,
            ttl: entryTtl,
            accessCount: 1,
            lastAccessed: now,
        };
        this.cache.set(key, entry);
        this.accessOrder.set(key, ++this.accessCounter);
        this.updateCurrentSize();
        this.recordSet();
        logger_1.logger.debug('Cache entry set', { key, ttl: entryTtl });
    }
    /**
     * Delete an item from the cache
     */
    delete(key) {
        const existed = this.cache.delete(key);
        this.accessOrder.delete(key);
        if (existed) {
            this.updateCurrentSize();
            this.recordDelete();
            logger_1.logger.debug('Cache entry deleted', { key });
        }
        return existed;
    }
    /**
     * Check if an item exists in the cache (without updating access)
     */
    has(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return false;
        }
        const now = Date.now();
        if (now - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            this.accessOrder.delete(key);
            this.updateCurrentSize();
            return false;
        }
        return true;
    }
    /**
     * Clear all cache entries
     */
    clear() {
        this.cache.clear();
        this.accessOrder.clear();
        this.updateCurrentSize();
        logger_1.logger.debug('Cache cleared');
    }
    /**
     * Get cache statistics
     */
    getMetrics() {
        this.calculateHitRate();
        return { ...this.metrics };
    }
    /**
     * Get all cache keys (for debugging)
     */
    keys() {
        return Array.from(this.cache.keys());
    }
    /**
     * Get cache size
     */
    size() {
        return this.cache.size;
    }
    /**
     * Evict least recently used entry
     */
    evictLRU() {
        let lruKey = null;
        let lruAccess = Infinity;
        for (const [key, accessTime] of this.accessOrder) {
            if (accessTime < lruAccess) {
                lruAccess = accessTime;
                lruKey = key;
            }
        }
        if (lruKey) {
            this.cache.delete(lruKey);
            this.accessOrder.delete(lruKey);
            this.metrics.evictions++;
            logger_1.logger.debug('LRU eviction', { key: lruKey });
        }
    }
    /**
     * Clean up expired entries
     */
    cleanup() {
        const now = Date.now();
        const expiredKeys = [];
        for (const [key, entry] of this.cache) {
            if (now - entry.timestamp > entry.ttl) {
                expiredKeys.push(key);
            }
        }
        for (const key of expiredKeys) {
            this.cache.delete(key);
            this.accessOrder.delete(key);
        }
        if (expiredKeys.length > 0) {
            this.updateCurrentSize();
            logger_1.logger.debug('Cache cleanup completed', {
                expired: expiredKeys.length,
                remaining: this.cache.size,
            });
        }
    }
    /**
     * Start the cleanup timer
     */
    startCleanupTimer() {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.options.cleanupInterval);
    }
    /**
     * Stop the cleanup timer
     */
    destroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }
        this.clear();
    }
    /**
     * Record cache hit
     */
    recordHit() {
        if (this.options.enableMetrics) {
            this.metrics.hits++;
        }
    }
    /**
     * Record cache miss
     */
    recordMiss() {
        if (this.options.enableMetrics) {
            this.metrics.misses++;
        }
    }
    /**
     * Record cache set
     */
    recordSet() {
        if (this.options.enableMetrics) {
            this.metrics.sets++;
        }
    }
    /**
     * Record cache delete
     */
    recordDelete() {
        if (this.options.enableMetrics) {
            this.metrics.deletes++;
        }
    }
    /**
     * Update current size metric
     */
    updateCurrentSize() {
        if (this.options.enableMetrics) {
            this.metrics.currentSize = this.cache.size;
        }
    }
    /**
     * Calculate hit rate
     */
    calculateHitRate() {
        if (this.options.enableMetrics) {
            const total = this.metrics.hits + this.metrics.misses;
            this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0;
        }
    }
}
exports.MemoryCache = MemoryCache;
/**
 * Cache key generator utilities
 */
class CacheKeyGenerator {
    /**
     * Generate a cache key for user data
     */
    static user(userId) {
        return `user:${userId}`;
    }
    /**
     * Generate a cache key for carpool data
     */
    static carpool(carpoolId) {
        return `carpool:${carpoolId}`;
    }
    /**
     * Generate a cache key for user's carpools
     */
    static userCarpools(userId, page = 1, limit = 20) {
        return `user:${userId}:carpools:${page}:${limit}`;
    }
    /**
     * Generate a cache key for carpool search results
     */
    static carpoolSearch(params) {
        const paramStr = Object.entries(params)
            .filter(([_, value]) => value !== undefined)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}:${value}`)
            .join('|');
        return `search:carpools:${paramStr}`;
    }
    /**
     * Generate a cache key for user's bookings
     */
    static userBookings(userId, status) {
        return status
            ? `user:${userId}:bookings:${status}`
            : `user:${userId}:bookings`;
    }
    /**
     * Generate a cache key for user's notifications
     */
    static userNotifications(userId, unreadOnly = false) {
        return `user:${userId}:notifications:${unreadOnly ? 'unread' : 'all'}`;
    }
    /**
     * Generate a cache key for aggregated statistics
     */
    static stats(type, period) {
        return `stats:${type}:${period}`;
    }
    /**
     * Generate a cache key for session data
     */
    static session(sessionId) {
        return `session:${sessionId}`;
    }
    /**
     * Generate a cache key with namespace
     */
    static withNamespace(namespace, key) {
        return `${namespace}:${key}`;
    }
}
exports.CacheKeyGenerator = CacheKeyGenerator;
/**
 * Cache decorator for methods
 */
function Cacheable(keyGenerator, ttl) {
    return function (target, propertyName, descriptor) {
        const method = descriptor.value;
        descriptor.value = async function (...args) {
            // Use the GlobalCache singleton instead of trying to access this.cache
            const cache = exports.globalCache;
            const cacheKey = keyGenerator(args);
            // Try to get from cache
            const cached = cache.get(cacheKey);
            if (cached !== null) {
                logger_1.logger.debug('Cache hit', { method: propertyName, key: cacheKey });
                return cached;
            }
            // Execute method and cache result
            const result = await method.apply(this, args);
            cache.set(cacheKey, result, ttl);
            logger_1.logger.debug('Cache miss - result cached', {
                method: propertyName,
                key: cacheKey,
                ttl,
            });
            return result;
        };
    };
}
// Global cache instance
exports.globalCache = new MemoryCache({
    defaultTtl: 5 * 60 * 1000, // 5 minutes
    maxSize: 2000,
    cleanupInterval: 2 * 60 * 1000, // 2 minutes
    enableMetrics: true,
});
/**
 * Cache warming utilities
 */
class CacheWarmer {
    /**
     * Warm up commonly accessed data
     */
    static async warmupUserData(userId, userService) {
        try {
            const user = await userService.findById(userId);
            if (user) {
                exports.globalCache.set(CacheKeyGenerator.user(userId), user, 15 * 60 * 1000); // 15 minutes
            }
        }
        catch (error) {
            logger_1.logger.warn('Failed to warm up user data', { userId, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    /**
     * Warm up popular carpool searches
     */
    static async warmupPopularSearches(carpoolService) {
        const popularSearches = [
            { origin: 'Downtown', destination: 'University' },
            { origin: 'Airport', destination: 'City Center' },
            { origin: 'Mall', destination: 'Business District' },
        ];
        for (const search of popularSearches) {
            try {
                const results = await carpoolService.search(search);
                const cacheKey = CacheKeyGenerator.carpoolSearch(search);
                exports.globalCache.set(cacheKey, results, 10 * 60 * 1000); // 10 minutes
            }
            catch (error) {
                logger_1.logger.warn('Failed to warm up search data', { search, error: error instanceof Error ? error.message : 'Unknown error' });
            }
        }
    }
}
exports.CacheWarmer = CacheWarmer;
//# sourceMappingURL=cache.js.map