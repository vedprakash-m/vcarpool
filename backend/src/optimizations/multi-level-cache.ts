/**
 * Multi-Level Caching Strategy
 * Implements L1 (memory), L2 (Redis), and L3 (database) caching
 */

import { Redis } from 'ioredis';
import { LRUCache } from 'lru-cache';

export interface CacheConfig {
  l1: {
    maxSize: number;
    ttl: number;
  };
  l2: {
    host: string;
    port: number;
    ttl: number;
  };
  l3: {
    enabled: boolean;
    ttl: number;
  };
}

export class MultiLevelCache {
  private l1Cache: LRUCache<string, any>;
  private l2Cache: Redis;
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
    
    // L1 Cache (Memory)
    this.l1Cache = new LRUCache({
      max: config.l1.maxSize,
      ttl: config.l1.ttl,
    });

    // L2 Cache (Redis)
    this.l2Cache = new Redis({
      host: config.l2.host,
      port: config.l2.port,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    // Try L1 cache first
    const l1Result = this.l1Cache.get(key);
    if (l1Result) {
      return l1Result as T;
    }

    // Try L2 cache
    try {
      const l2Result = await this.l2Cache.get(key);
      if (l2Result) {
        const parsed = JSON.parse(l2Result) as T;
        // Populate L1 cache
        this.l1Cache.set(key, parsed);
        return parsed;
      }
    } catch (error) {
      console.warn('L2 cache error:', error);
    }

    return null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Set in L1 cache
    this.l1Cache.set(key, value, { ttl: ttl || this.config.l1.ttl });

    // Set in L2 cache
    try {
      const serialized = JSON.stringify(value);
      await this.l2Cache.setex(key, ttl || this.config.l2.ttl, serialized);
    } catch (error) {
      console.warn('L2 cache set error:', error);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    // Clear L1 cache (pattern matching)
    for (const key of this.l1Cache.keys()) {
      if (key.includes(pattern)) {
        this.l1Cache.delete(key);
      }
    }

    // Clear L2 cache
    try {
      const keys = await this.l2Cache.keys(`*${pattern}*`);
      if (keys.length > 0) {
        await this.l2Cache.del(...keys);
      }
    } catch (error) {
      console.warn('L2 cache invalidation error:', error);
    }
  }
}

/**
 * Smart cache invalidation based on data relationships
 */
export class SmartCacheInvalidator {
  private cache: MultiLevelCache;
  
  constructor(cache: MultiLevelCache) {
    this.cache = cache;
  }

  async invalidateUserData(userId: string): Promise<void> {
    await Promise.all([
      this.cache.invalidate(`user:${userId}`),
      this.cache.invalidate(`trips:user:${userId}`),
      this.cache.invalidate(`notifications:${userId}`),
    ]);
  }

  async invalidateTripData(tripId: string): Promise<void> {
    await Promise.all([
      this.cache.invalidate(`trip:${tripId}`),
      this.cache.invalidate(`participants:${tripId}`),
      this.cache.invalidate(`messages:${tripId}`),
    ]);
  }
}
