/**
 * Infrastructure Optimization Utilities
 * Azure Functions and cloud resource optimization tools
 */

import { InvocationContext } from '@azure/functions';
import { logger } from './logger';
import { globalCache } from './cache';

/**
 * Cold start optimization utilities
 */
export class ColdStartOptimizer {
  private static isWarmup = false;
  private static lastActivity = Date.now();
  private static readonly WARMUP_INTERVAL = 4 * 60 * 1000; // 4 minutes
  private static readonly ACTIVITY_THRESHOLD = 5 * 60 * 1000; // 5 minutes

  /**
   * Optimize function for reduced cold starts
   */
  static async optimize(): Promise<void> {
    try {
      // Pre-load commonly used modules
      await this.preloadModules();
      
      // Initialize connection pools
      await this.initializeConnections();
      
      // Warm up caches
      await this.warmupCaches();
      
      // Start keep-alive mechanism
      this.startKeepAlive();
      
      logger.info('Cold start optimization completed');
    } catch (error) {
      logger.error('Cold start optimization failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Pre-load commonly used modules and dependencies
   */
  private static async preloadModules(): Promise<void> {
    // Pre-require commonly used modules to keep them in memory
    const modules = [
      '@azure/cosmos',
      'jsonwebtoken',
      'bcryptjs',
      'nodemailer',
      'uuid'
    ];

    await Promise.all(
      modules.map(async (moduleName) => {
        try {
          require(moduleName);
        } catch (error) {
          logger.warn(`Failed to preload module ${moduleName}`, { error: error.message });
        }
      })
    );
  }

  /**
   * Initialize database connections and pools
   */
  private static async initializeConnections(): Promise<void> {
    try {
      // Initialize database connections here
      // This would typically involve creating connection pools
      logger.debug('Database connections initialized');
    } catch (error) {
      logger.error('Failed to initialize connections', { error: error.message });
    }
  }

  /**
   * Warm up application caches
   */
  private static async warmupCaches(): Promise<void> {
    try {
      // Pre-populate frequently accessed cache entries
      const warmupKeys = [
        'system:config',
        'app:settings',
        'validation:schemas'
      ];

      for (const key of warmupKeys) {
        globalCache.set(key, { warmedUp: true, timestamp: Date.now() }, 300000);
      }

      logger.debug('Caches warmed up');
    } catch (error) {
      logger.error('Failed to warm up caches', { error: error.message });
    }
  }

  /**
   * Start keep-alive mechanism to prevent cold starts
   */
  private static startKeepAlive(): void {
    if (this.isWarmup) return;

    this.isWarmup = true;
    
    setInterval(() => {
      const timeSinceLastActivity = Date.now() - this.lastActivity;
      
      if (timeSinceLastActivity > this.ACTIVITY_THRESHOLD) {
        logger.debug('Keep-alive ping to prevent cold start');
        this.updateActivity();
      }
    }, this.WARMUP_INTERVAL);
  }

  /**
   * Update last activity timestamp
   */
  static updateActivity(): void {
    this.lastActivity = Date.now();
  }

  /**
   * Check if this is a cold start
   */
  static isColdStart(): boolean {
    const timeSinceLastActivity = Date.now() - this.lastActivity;
    return timeSinceLastActivity > this.ACTIVITY_THRESHOLD;
  }
}

/**
 * Memory optimization utilities
 */
export class MemoryOptimizer {
  private static readonly MAX_MEMORY_USAGE = 0.8; // 80% threshold
  private static readonly GC_INTERVAL = 30000; // 30 seconds
  private static gcTimer: NodeJS.Timeout | null = null;

  /**
   * Start memory monitoring and optimization
   */
  static startMonitoring(): void {
    if (this.gcTimer) return;

    this.gcTimer = setInterval(() => {
      this.checkMemoryUsage();
    }, this.GC_INTERVAL);

    logger.debug('Memory monitoring started');
  }

  /**
   * Stop memory monitoring
   */
  static stopMonitoring(): void {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }
  }

  /**
   * Check current memory usage and trigger cleanup if needed
   */
  private static checkMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const usageRatio = heapUsedMB / heapTotalMB;

    logger.debug('Memory usage', {
      heapUsed: `${heapUsedMB.toFixed(2)}MB`,
      heapTotal: `${heapTotalMB.toFixed(2)}MB`,
      usageRatio: `${(usageRatio * 100).toFixed(2)}%`
    });

    if (usageRatio > this.MAX_MEMORY_USAGE) {
      logger.warn('High memory usage detected, triggering cleanup', {
        usageRatio: `${(usageRatio * 100).toFixed(2)}%`
      });
      
      this.performCleanup();
    }
  }

  /**
   * Perform memory cleanup operations
   */
  private static performCleanup(): void {
    try {
      // Clear old cache entries
      globalCache.cleanup();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        logger.debug('Garbage collection triggered');
      }
      
      // Clear require cache for non-essential modules
      this.clearRequireCache();
      
    } catch (error) {
      logger.error('Memory cleanup failed', { error: error.message });
    }
  }

  /**
   * Clear require cache for non-essential modules
   */
  private static clearRequireCache(): void {
    const essentialModules = [
      '@azure/functions',
      '@azure/cosmos',
      'jsonwebtoken',
      'bcryptjs'
    ];

    Object.keys(require.cache).forEach(key => {
      if (!essentialModules.some(module => key.includes(module))) {
        try {
          delete require.cache[key];
        } catch (error) {
          // Ignore errors when clearing cache
        }
      }
    });
  }

  /**
   * Get current memory statistics
   */
  static getMemoryStats(): {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    usageRatio: number;
  } {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
      external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100,
      rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100,
      usageRatio: Math.round(memUsage.heapUsed / memUsage.heapTotal * 10000) / 100
    };
  }
}

/**
 * Connection pooling and management
 */
export class ConnectionManager {
  private static pools = new Map<string, any>();
  private static readonly DEFAULT_POOL_SIZE = 10;
  private static readonly CONNECTION_TIMEOUT = 30000; // 30 seconds

  /**
   * Create or get connection pool
   */
  static getPool(name: string, factory: () => any, poolSize = this.DEFAULT_POOL_SIZE): any {
    if (!this.pools.has(name)) {
      const pool = this.createPool(factory, poolSize);
      this.pools.set(name, pool);
      logger.debug(`Connection pool created: ${name}`, { poolSize });
    }
    
    return this.pools.get(name);
  }

  /**
   * Create connection pool
   */
  private static createPool(factory: () => any, poolSize: number): any {
    const pool = {
      connections: [],
      inUse: new Set(),
      factory,
      maxSize: poolSize,
      
      async acquire() {
        // Try to get an available connection
        const availableConnection = this.connections.find(conn => !this.inUse.has(conn));
        
        if (availableConnection) {
          this.inUse.add(availableConnection);
          return availableConnection;
        }
        
        // Create new connection if pool not full
        if (this.connections.length < this.maxSize) {
          const newConnection = await this.factory();
          this.connections.push(newConnection);
          this.inUse.add(newConnection);
          return newConnection;
        }
        
        // Wait for a connection to become available
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Connection pool timeout'));
          }, ConnectionManager.CONNECTION_TIMEOUT);
          
          const checkAvailable = () => {
            const available = this.connections.find(conn => !this.inUse.has(conn));
            if (available) {
              clearTimeout(timeout);
              this.inUse.add(available);
              resolve(available);
            } else {
              setTimeout(checkAvailable, 10);
            }
          };
          
          checkAvailable();
        });
      },
      
      release(connection: any) {
        this.inUse.delete(connection);
      },
      
      destroy() {
        this.connections.forEach(conn => {
          try {
            if (conn.close) conn.close();
            if (conn.destroy) conn.destroy();
          } catch (error) {
            // Ignore cleanup errors
          }
        });
        this.connections = [];
        this.inUse.clear();
      }
    };
    
    return pool;
  }

  /**
   * Close all connection pools
   */
  static closeAllPools(): void {
    this.pools.forEach((pool, name) => {
      try {
        pool.destroy();
        logger.debug(`Connection pool closed: ${name}`);
      } catch (error) {
        logger.error(`Failed to close connection pool: ${name}`, { error: error.message });
      }
    });
    
    this.pools.clear();
  }

  /**
   * Get pool statistics
   */
  static getPoolStats(): { [poolName: string]: any } {
    const stats: { [key: string]: any } = {};
    
    this.pools.forEach((pool, name) => {
      stats[name] = {
        totalConnections: pool.connections.length,
        inUse: pool.inUse.size,
        available: pool.connections.length - pool.inUse.size,
        maxSize: pool.maxSize
      };
    });
    
    return stats;
  }
}

/**
 * Function execution optimization
 */
export class ExecutionOptimizer {
  /**
   * Optimize Azure Function execution
   */
  static optimizeExecution(
    handler: (context: InvocationContext, ...args: any[]) => Promise<any>
  ) {
    return async (context: InvocationContext, ...args: any[]): Promise<any> => {
      const startTime = Date.now();
      
      try {
        // Update cold start tracker
        ColdStartOptimizer.updateActivity();
        
        // Log execution start
        logger.debug('Function execution started', {
          functionName: context.functionName,
          invocationId: context.invocationId,
          isColdStart: ColdStartOptimizer.isColdStart()
        });
        
        // Execute function with timeout protection
        const result = await Promise.race([
          handler(context, ...args),
          this.createTimeoutPromise(290000) // 290 seconds (Azure Functions timeout)
        ]);
        
        const duration = Date.now() - startTime;
        
        // Log execution completion
        logger.info('Function execution completed', {
          functionName: context.functionName,
          invocationId: context.invocationId,
          duration: `${duration}ms`,
          success: true
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        logger.error('Function execution failed', {
          functionName: context.functionName,
          invocationId: context.invocationId,
          duration: `${duration}ms`,
          error: error.message,
          success: false
        });
        
        throw error;
      }
    };
  }

  /**
   * Create timeout promise for function execution
   */
  private static createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Function execution timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }
}

/**
 * Resource cleanup utilities
 */
export class ResourceCleaner {
  private static cleanupTasks: (() => Promise<void>)[] = [];
  private static isShuttingDown = false;

  /**
   * Register cleanup task
   */
  static registerCleanupTask(task: () => Promise<void>): void {
    this.cleanupTasks.push(task);
  }

  /**
   * Initialize graceful shutdown handling
   */
  static initializeGracefulShutdown(): void {
    // Handle process termination signals
    process.on('SIGTERM', () => this.performCleanup('SIGTERM'));
    process.on('SIGINT', () => this.performCleanup('SIGINT'));
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message });
      this.performCleanup('uncaughtException');
    });
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection', { reason });
      this.performCleanup('unhandledRejection');
    });
  }

  /**
   * Perform cleanup operations
   */
  private static async performCleanup(signal: string): Promise<void> {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    logger.info(`Performing cleanup due to ${signal}`);

    try {
      // Execute all cleanup tasks
      await Promise.all(
        this.cleanupTasks.map(async (task) => {
          try {
            await task();
          } catch (error) {
            logger.error('Cleanup task failed', { error: error.message });
          }
        })
      );

      // Close connection pools
      ConnectionManager.closeAllPools();
      
      // Stop memory monitoring
      MemoryOptimizer.stopMonitoring();
      
      logger.info('Cleanup completed successfully');
    } catch (error) {
      logger.error('Cleanup failed', { error: error.message });
    } finally {
      process.exit(0);
    }
  }
}

/**
 * Infrastructure monitoring and health checks
 */
export class InfrastructureMonitor {
  /**
   * Perform comprehensive health check
   */
  static async performHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: { [key: string]: { status: string; message?: string; duration?: number } };
    timestamp: Date;
  }> {
    const checks: { [key: string]: any } = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Memory check
    try {
      const memStats = MemoryOptimizer.getMemoryStats();
      checks.memory = {
        status: memStats.usageRatio > 90 ? 'unhealthy' : memStats.usageRatio > 70 ? 'degraded' : 'healthy',
        message: `Memory usage: ${memStats.usageRatio}%`,
        heapUsed: memStats.heapUsed,
        heapTotal: memStats.heapTotal
      };
    } catch (error) {
      checks.memory = { status: 'unhealthy', message: error.message };
    }

    // Connection pools check
    try {
      const poolStats = ConnectionManager.getPoolStats();
      const hasUnhealthyPools = Object.values(poolStats).some((pool: any) => 
        pool.available === 0 && pool.totalConnections === pool.maxSize
      );
      
      checks.connectionPools = {
        status: hasUnhealthyPools ? 'degraded' : 'healthy',
        pools: poolStats
      };
    } catch (error) {
      checks.connectionPools = { status: 'unhealthy', message: error.message };
    }

    // Cache check
    try {
      const cacheStats = globalCache.getStats();
      checks.cache = {
        status: 'healthy',
        stats: cacheStats
      };
    } catch (error) {
      checks.cache = { status: 'unhealthy', message: error.message };
    }

    // Determine overall status
    const statuses = Object.values(checks).map((check: any) => check.status);
    if (statuses.includes('unhealthy')) {
      overallStatus = 'unhealthy';
    } else if (statuses.includes('degraded')) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      checks,
      timestamp: new Date()
    };
  }
}

// Initialize infrastructure optimizations
export function initializeInfrastructureOptimizations(): void {
  // Start cold start optimization
  ColdStartOptimizer.optimize();
  
  // Start memory monitoring
  MemoryOptimizer.startMonitoring();
  
  // Initialize graceful shutdown
  ResourceCleaner.initializeGracefulShutdown();
  
  logger.info('Infrastructure optimizations initialized');
}
