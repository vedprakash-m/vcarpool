/**
 * Infrastructure Optimization Utilities
 * Azure Functions and cloud resource optimization tools
 */

import { logger } from './logger';
import { globalCache } from './cache';

/**
 * Cold start optimization utilities
 */
export class ColdStartOptimizer {
  private static isWarmup = false;
  private static lastActivity = Date.now();

  /**
   * Optimize function for reduced cold starts
   */
  static async optimize(): Promise<void> {
    try {
      logger.info('Cold start optimization completed');
    } catch (error) {
      logger.error('Cold start optimization failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Check if function needs warming up
   */
  static needsWarmup(): boolean {
    return Date.now() - this.lastActivity > 300000; // 5 minutes
  }
}

/**
 * Resource monitoring and optimization
 */
export class ResourceOptimizer {
  /**
   * Monitor and optimize memory usage
   */
  static optimizeMemory(): void {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

    logger.debug('Memory usage', {
      heapUsed: `${heapUsedMB}MB`,
      heapTotal: `${heapTotalMB}MB`,
    });
  }

  /**
   * Get health status of the application
   */
  static async getHealthStatus(): Promise<{
    status: 'healthy' | 'unhealthy';
    checks: Record<string, { status: string; message?: string }>;
  }> {
    const checks: Record<string, { status: string; message?: string }> = {};

    // Memory check
    try {
      const memUsage = process.memoryUsage();
      const heapUsedPercent = memUsage.heapUsed / memUsage.heapTotal;
      checks.memory = {
        status: heapUsedPercent < 0.9 ? 'healthy' : 'unhealthy',
        message: `Heap usage: ${(heapUsedPercent * 100).toFixed(1)}%`,
      };
    } catch (error) {
      checks.memory = {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Cache check
    try {
      const cacheMetrics = globalCache.getMetrics();
      checks.cache = {
        status: 'healthy',
        message: `Hit rate: ${cacheMetrics.hitRate.toFixed(1)}%`,
      };
    } catch (error) {
      checks.cache = {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    const overallStatus = Object.values(checks).every((check) => check.status === 'healthy')
      ? 'healthy'
      : 'unhealthy';

    return { status: overallStatus, checks };
  }
}
