import { logger } from '../utils/logger';

/**
 * Cache entry interface
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Cache configuration options
 */
interface CacheOptions {
  defaultTtl?: number; // Default TTL in milliseconds
  maxSize?: number; // Maximum number of entries
  cleanupInterval?: number; // Cleanup interval in milliseconds
  enableMetrics?: boolean; // Enable cache metrics collection
}

/**
 * Cache metrics interface
 */
interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  currentSize: number;
  hitRate: number;
}

/**
 * High-performance in-memory cache with TTL, LRU eviction, and metrics
 */
export class MemoryCache<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder = new Map<string, number>(); // For LRU tracking
  private options: Required<CacheOptions>;
  private metrics: CacheMetrics;
  private cleanupTimer?: NodeJS.Timeout;
  private accessCounter = 0;

  constructor(options: CacheOptions = {}) {
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
  get(key: string): T | null {
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
  set(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const entryTtl = ttl || this.options.defaultTtl;

    // Check if we need to evict entries
    if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
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

    logger.debug('Cache entry set', { key, ttl: entryTtl });
  }

  /**
   * Delete an item from the cache
   */
  delete(key: string): boolean {
    const existed = this.cache.delete(key);
    this.accessOrder.delete(key);

    if (existed) {
      this.updateCurrentSize();
      this.recordDelete();
      logger.debug('Cache entry deleted', { key });
    }

    return existed;
  }

  /**
   * Check if an item exists in the cache (without updating access)
   */
  has(key: string): boolean {
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
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.updateCurrentSize();
    logger.debug('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getMetrics(): CacheMetrics {
    this.calculateHitRate();
    return { ...this.metrics };
  }

  /**
   * Get all cache keys (for debugging)
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
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
      logger.debug('LRU eviction', { key: lruKey });
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

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
      logger.debug('Cache cleanup completed', {
        expired: expiredKeys.length,
        remaining: this.cache.size,
      });
    }
  }

  /**
   * Start the cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }

  /**
   * Stop the cleanup timer
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
  }

  /**
   * Record cache hit
   */
  private recordHit(): void {
    if (this.options.enableMetrics) {
      this.metrics.hits++;
    }
  }

  /**
   * Record cache miss
   */
  private recordMiss(): void {
    if (this.options.enableMetrics) {
      this.metrics.misses++;
    }
  }

  /**
   * Record cache set
   */
  private recordSet(): void {
    if (this.options.enableMetrics) {
      this.metrics.sets++;
    }
  }

  /**
   * Record cache delete
   */
  private recordDelete(): void {
    if (this.options.enableMetrics) {
      this.metrics.deletes++;
    }
  }

  /**
   * Update current size metric
   */
  private updateCurrentSize(): void {
    if (this.options.enableMetrics) {
      this.metrics.currentSize = this.cache.size;
    }
  }

  /**
   * Calculate hit rate
   */
  private calculateHitRate(): void {
    if (this.options.enableMetrics) {
      const total = this.metrics.hits + this.metrics.misses;
      this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0;
    }
  }

  /**
   * Clean up expired entries (public version of private cleanup)
   */
  cleanupExpiredEntries(): void {
    // Call the private cleanup method
    this.cleanup();
  }
}

/**
 * Cache key generator utilities
 */
export class CacheKeyGenerator {
  /**
   * Generate a cache key for user data
   */
  static user(userId: string): string {
    return `user:${userId}`;
  }

  /**
   * Generate a cache key for carpool data
   */
  static carpool(carpoolId: string): string {
    return `carpool:${carpoolId}`;
  }

  /**
   * Generate a cache key for user's carpools
   */
  static userCarpools(userId: string, page = 1, limit = 20): string {
    return `user:${userId}:carpools:${page}:${limit}`;
  }

  /**
   * Generate a cache key for carpool search results
   */
  static carpoolSearch(params: {
    origin?: string;
    destination?: string;
    date?: string;
    page?: number;
    limit?: number;
  }): string {
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
  static userBookings(userId: string, status?: string): string {
    return status ? `user:${userId}:bookings:${status}` : `user:${userId}:bookings`;
  }

  /**
   * Generate a cache key for user's notifications
   */
  static userNotifications(userId: string, unreadOnly = false): string {
    return `user:${userId}:notifications:${unreadOnly ? 'unread' : 'all'}`;
  }

  /**
   * Generate a cache key for aggregated statistics
   */
  static stats(type: string, period: string): string {
    return `stats:${type}:${period}`;
  }

  /**
   * Generate a cache key for session data
   */
  static session(sessionId: string): string {
    return `session:${sessionId}`;
  }

  /**
   * Generate a cache key with namespace
   */
  static withNamespace(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }
}

/**
 * Cacheable decorator for methods
 */
export function Cacheable<T = unknown>(keyGenerator: (args: unknown[]) => string, ttl?: number) {
  return function (target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      // Use the GlobalCache singleton instead of trying to access this.cache
      const cache = globalCache as MemoryCache<T>; // Type assertion for singleton
      const cacheKey = keyGenerator(args);

      // Try to get from cache
      const cached = cache.get(cacheKey);
      if (cached !== null) {
        logger.debug('Cache hit', { method: propertyName, key: cacheKey });
        return cached;
      }

      // Execute method and cache result
      const result = await method.apply(this, args);
      cache.set(cacheKey, result, ttl);

      logger.debug('Cache miss - result cached', {
        method: propertyName,
        key: cacheKey,
        ttl,
      });

      return result;
    };
  };
}

// Global cache instance
export const globalCache = new MemoryCache({
  defaultTtl: 5 * 60 * 1000, // 5 minutes
  maxSize: 2000,
  cleanupInterval: 2 * 60 * 1000, // 2 minutes
  enableMetrics: true,
});

/**
 * Cache warming utilities
 */
export class CacheWarmer {
  /**
   * Warm up commonly accessed data
   */
  static async warmupUserData(userId: string, userService: any): Promise<void> {
    try {
      const user = await userService.findById(userId);
      if (user) {
        globalCache.set(CacheKeyGenerator.user(userId), user, 15 * 60 * 1000); // 15 minutes
      }
    } catch (error) {
      logger.warn('Failed to warm up user data', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Warm up popular carpool searches
   */
  static async warmupPopularSearches(carpoolService: any): Promise<void> {
    const popularSearches = [
      { origin: 'Downtown', destination: 'University' },
      { origin: 'Airport', destination: 'City Center' },
      { origin: 'Mall', destination: 'Business District' },
    ];

    for (const search of popularSearches) {
      try {
        const results = await carpoolService.search(search);
        const cacheKey = CacheKeyGenerator.carpoolSearch(search);
        globalCache.set(cacheKey, results, 10 * 60 * 1000); // 10 minutes
      } catch (error) {
        logger.warn('Failed to warm up search data', {
          search,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }
}
