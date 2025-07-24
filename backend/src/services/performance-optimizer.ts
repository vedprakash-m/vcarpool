/**
 * Simplified Performance Optimizer
 * Provides basic performance optimization without complex dependencies
 */

import { InvocationContext } from '@azure/functions';

interface PerformanceMetrics {
  executionTime: number;
  memoryUsage: number;
  timestamp: string;
}

interface OptimizationOptions {
  timeout?: number;
  retries?: number;
  cache?: boolean;
}

interface CacheOptions {
  ttl: number;
  key: string;
}

export class PerformanceOptimizer {
  private cache = new Map<string, { value: any; expires: number }>();

  constructor() {
    // Clear expired cache entries every 5 minutes
    setInterval(() => this.clearExpiredCache(), 5 * 60 * 1000);
  }

  /**
   * Memoize a function with caching
   */
  memoize<T extends (...args: any[]) => Promise<any>>(fn: T, options: CacheOptions): T {
    return (async (...args: any[]) => {
      const cacheKey = `${options.key}_${JSON.stringify(args)}`;
      const cached = this.cache.get(cacheKey);

      if (cached && cached.expires > Date.now()) {
        return cached.value;
      }

      const result = await fn(...args);
      this.cache.set(cacheKey, {
        value: result,
        expires: Date.now() + options.ttl,
      });

      return result;
    }) as T;
  }

  /**
   * Optimize a function with timeout and retry logic
   */
  optimizeFunction<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    options: OptimizationOptions = {},
  ): T {
    const { timeout = 30000, retries = 0 } = options;

    return (async (...args: any[]) => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Function timeout')), timeout),
          );

          return await Promise.race([fn(...args), timeoutPromise]);
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          if (attempt === retries) {
            throw lastError;
          }
          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }

      throw lastError;
    }) as T;
  }

  /**
   * Measure function performance
   */
  async measurePerformance<T>(
    fn: () => Promise<T>,
    context?: InvocationContext,
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      const result = await fn();
      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;

      const metrics: PerformanceMetrics = {
        executionTime: endTime - startTime,
        memoryUsage: endMemory - startMemory,
        timestamp: new Date().toISOString(),
      };

      return { result, metrics };
    } catch (error) {
      const endTime = Date.now();
      const metrics: PerformanceMetrics = {
        executionTime: endTime - startTime,
        memoryUsage: 0,
        timestamp: new Date().toISOString(),
      };
      throw error;
    }
  }

  /**
   * Clear expired cache entries
   */
  private clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires <= now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Performance monitoring decorator
   */
  static monitor(options: { name?: string } = {}) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
      const method = descriptor.value;
      const optimizer = new PerformanceOptimizer();

      descriptor.value = async function (...args: any[]) {
        const { result, metrics } = await optimizer.measurePerformance(() =>
          method.apply(this, args),
        );

        console.log(`Performance metrics for ${options.name || propertyName}:`, metrics);
        return result;
      };

      return descriptor;
    };
  }
}
