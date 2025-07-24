import { logger, LoggingUtils } from './logger';
import { globalCache } from './cache';
import { DatabaseQueryOptimizer } from './database-optimizer';

/**
 * Health check status
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
}

/**
 * Health check result
 */
interface HealthCheckResult {
  status: HealthStatus;
  component: string;
  message: string;
  duration: number;
  timestamp: string;
  metadata?: any;
}

/**
 * Performance metrics
 */
interface PerformanceMetrics {
  requestCount: number;
  errorRate: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  activeConnections: number;
  memoryUsage: NodeJS.MemoryUsage;
  cacheHitRate: number;
}

/**
 * Alert configuration
 */
interface AlertConfig {
  errorRateThreshold: number;
  responseTimeThreshold: number;
  memoryThreshold: number;
  enableSlackAlerts: boolean;
  enableEmailAlerts: boolean;
  alertCooldownMs: number;
}

/**
 * Default alert configuration
 */
const defaultAlertConfig: AlertConfig = {
  errorRateThreshold: 0.05, // 5%
  responseTimeThreshold: 5000, // 5 seconds
  memoryThreshold: 0.8, // 80% of available memory
  enableSlackAlerts: false,
  enableEmailAlerts: false,
  alertCooldownMs: 5 * 60 * 1000, // 5 minutes
};

/**
 * Enhanced monitoring and alerting system
 */
export class MonitoringService {
  private static instance: MonitoringService;
  private metrics: Map<string, number[]> = new Map();
  private healthChecks: Map<string, () => Promise<HealthCheckResult>> = new Map();
  private lastAlerts: Map<string, number> = new Map();
  private config: AlertConfig;

  private constructor(config: Partial<AlertConfig> = {}) {
    this.config = { ...defaultAlertConfig, ...config };
    this.initializeHealthChecks();
    this.startMetricsCollection();
  }

  static getInstance(config?: Partial<AlertConfig>): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService(config);
    }
    return MonitoringService.instance;
  }

  /**
   * Record a metric value
   */
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const values = this.metrics.get(name)!;
    values.push(value);

    // Keep only last 1000 values for memory efficiency
    if (values.length > 1000) {
      values.shift();
    }

    // Log metrics for high-level monitoring
    LoggingUtils.metricsLog(logger, name, value);
  }

  /**
   * Record response time
   */
  recordResponseTime(endpoint: string, duration: number): void {
    this.recordMetric(`response_time.${endpoint}`, duration);
    this.recordMetric('response_time.all', duration);

    // Check if response time exceeds threshold
    if (duration > this.config.responseTimeThreshold) {
      this.triggerAlert('slow_response', {
        endpoint,
        duration,
        threshold: this.config.responseTimeThreshold,
      });
    }
  }

  /**
   * Record error
   */
  recordError(endpoint: string, error: Error): void {
    this.recordMetric(`errors.${endpoint}`, 1);
    this.recordMetric('errors.all', 1);

    // Calculate error rate
    const errorRate = this.getErrorRate(endpoint);
    if (errorRate > this.config.errorRateThreshold) {
      this.triggerAlert('high_error_rate', {
        endpoint,
        errorRate,
        threshold: this.config.errorRateThreshold,
        error: error.message,
      });
    }
  }

  /**
   * Record successful request
   */
  recordSuccess(endpoint: string): void {
    this.recordMetric(`requests.${endpoint}`, 1);
    this.recordMetric('requests.all', 1);
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const responseTimesAll = this.metrics.get('response_time.all') || [];
    const requestsAll = this.metrics.get('requests.all') || [];
    const errorsAll = this.metrics.get('errors.all') || [];

    const averageResponseTime =
      responseTimesAll.length > 0
        ? responseTimesAll.reduce((sum, time) => sum + time, 0) / responseTimesAll.length
        : 0;

    const sortedResponseTimes = [...responseTimesAll].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedResponseTimes.length * 0.95);
    const p99Index = Math.floor(sortedResponseTimes.length * 0.99);

    const totalRequests = requestsAll.reduce((sum, count) => sum + count, 0);
    const totalErrors = errorsAll.reduce((sum, count) => sum + count, 0);
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

    const cacheMetrics = globalCache.getMetrics();
    const memoryUsage = process.memoryUsage();

    return {
      requestCount: totalRequests,
      errorRate,
      averageResponseTime,
      p95ResponseTime: sortedResponseTimes[p95Index] || 0,
      p99ResponseTime: sortedResponseTimes[p99Index] || 0,
      activeConnections: 0, // Would need to be tracked separately
      memoryUsage,
      cacheHitRate: cacheMetrics.hitRate,
    };
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<{
    status: HealthStatus;
    checks: HealthCheckResult[];
    metrics: PerformanceMetrics;
  }> {
    const checks: HealthCheckResult[] = [];
    let overallStatus = HealthStatus.HEALTHY;

    // Run all registered health checks
    for (const [name, checkFunction] of this.healthChecks) {
      try {
        const result = await checkFunction();
        checks.push(result);

        // Determine overall status
        if (result.status === HealthStatus.UNHEALTHY) {
          overallStatus = HealthStatus.UNHEALTHY;
        } else if (
          result.status === HealthStatus.DEGRADED &&
          overallStatus === HealthStatus.HEALTHY
        ) {
          overallStatus = HealthStatus.DEGRADED;
        }
      } catch (error) {
        const unhealthyResult: HealthCheckResult = {
          status: HealthStatus.UNHEALTHY,
          component: name,
          message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: 0,
          timestamp: new Date().toISOString(),
        };

        checks.push(unhealthyResult);
        overallStatus = HealthStatus.UNHEALTHY;

        logger.error('Health check failed', {
          component: name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const metrics = this.getPerformanceMetrics();

    // Check system metrics
    if (metrics.errorRate > this.config.errorRateThreshold) {
      overallStatus = HealthStatus.DEGRADED;
    }

    if (
      metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal >
      this.config.memoryThreshold
    ) {
      overallStatus = HealthStatus.DEGRADED;
    }

    logger.info('Health check completed', {
      status: overallStatus,
      checksCount: checks.length,
      metrics: {
        errorRate: metrics.errorRate,
        averageResponseTime: metrics.averageResponseTime,
        memoryUsagePercent: metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal,
        cacheHitRate: metrics.cacheHitRate,
      },
    });

    return {
      status: overallStatus,
      checks,
      metrics,
    };
  }

  /**
   * Register a custom health check
   */
  registerHealthCheck(name: string, checkFunction: () => Promise<HealthCheckResult>): void {
    this.healthChecks.set(name, checkFunction);
    logger.debug('Health check registered', { name });
  }

  /**
   * Initialize default health checks
   */
  private initializeHealthChecks(): void {
    // Cache health check
    this.registerHealthCheck('cache', async () => {
      const startTime = Date.now();

      try {
        // Test cache operations
        const testKey = 'health-check-test';
        globalCache.set(testKey, 'test-value', 1000);
        const value = globalCache.get(testKey);
        globalCache.delete(testKey);

        const duration = Date.now() - startTime;
        const metrics = globalCache.getMetrics();

        if (value === 'test-value') {
          return {
            status: HealthStatus.HEALTHY,
            component: 'cache',
            message: 'Cache is operational',
            duration,
            timestamp: new Date().toISOString(),
            metadata: {
              hitRate: metrics.hitRate,
              currentSize: metrics.currentSize,
            },
          };
        } else {
          return {
            status: HealthStatus.UNHEALTHY,
            component: 'cache',
            message: 'Cache read/write test failed',
            duration,
            timestamp: new Date().toISOString(),
          };
        }
      } catch (error) {
        return {
          status: HealthStatus.UNHEALTHY,
          component: 'cache',
          message: `Cache error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        };
      }
    });

    // Memory health check
    this.registerHealthCheck('memory', async () => {
      const startTime = Date.now();
      const memoryUsage = process.memoryUsage();
      const heapUsedPercent = memoryUsage.heapUsed / memoryUsage.heapTotal;

      let status = HealthStatus.HEALTHY;
      let message = 'Memory usage is normal';

      if (heapUsedPercent > 0.9) {
        status = HealthStatus.UNHEALTHY;
        message = 'Memory usage is critically high';
      } else if (heapUsedPercent > this.config.memoryThreshold) {
        status = HealthStatus.DEGRADED;
        message = 'Memory usage is elevated';
      }

      return {
        status,
        component: 'memory',
        message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        metadata: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          heapUsedPercent: Math.round(heapUsedPercent * 100),
          rss: memoryUsage.rss,
          external: memoryUsage.external,
        },
      };
    });
  }

  /**
   * Start periodic metrics collection
   */
  private startMetricsCollection(): void {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      const metrics = this.getPerformanceMetrics();

      // Record system metrics
      this.recordMetric('system.memory.heap_used', metrics.memoryUsage.heapUsed);
      this.recordMetric('system.memory.heap_total', metrics.memoryUsage.heapTotal);
      this.recordMetric('system.memory.rss', metrics.memoryUsage.rss);
      this.recordMetric('system.cache.hit_rate', metrics.cacheHitRate);
      this.recordMetric('system.error_rate', metrics.errorRate);

      // Check for memory alerts
      const heapUsedPercent = metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal;
      if (heapUsedPercent > this.config.memoryThreshold) {
        this.triggerAlert('high_memory_usage', {
          heapUsedPercent: Math.round(heapUsedPercent * 100),
          threshold: Math.round(this.config.memoryThreshold * 100),
          heapUsed: metrics.memoryUsage.heapUsed,
          heapTotal: metrics.memoryUsage.heapTotal,
        });
      }
    }, 30000);
  }

  /**
   * Get error rate for a specific endpoint
   */
  private getErrorRate(endpoint: string): number {
    const requests = this.metrics.get(`requests.${endpoint}`) || [];
    const errors = this.metrics.get(`errors.${endpoint}`) || [];

    const totalRequests = requests.reduce((sum, count) => sum + count, 0);
    const totalErrors = errors.reduce((sum, count) => sum + count, 0);

    return totalRequests > 0 ? totalErrors / totalRequests : 0;
  }

  /**
   * Trigger an alert with cooldown
   */
  private triggerAlert(alertType: string, details: any): void {
    const now = Date.now();
    const lastAlert = this.lastAlerts.get(alertType) || 0;

    // Check cooldown period
    if (now - lastAlert < this.config.alertCooldownMs) {
      return;
    }

    this.lastAlerts.set(alertType, now);

    // Log the alert
    LoggingUtils.securityLog(logger, alertType, details);

    // Send notifications (placeholder for actual implementation)
    if (this.config.enableSlackAlerts) {
      this.sendSlackAlert(alertType, details);
    }

    if (this.config.enableEmailAlerts) {
      this.sendEmailAlert(alertType, details);
    }
  }

  /**
   * Send Slack alert (placeholder)
   */
  private async sendSlackAlert(alertType: string, details: any): Promise<void> {
    // Implementation would use Slack webhook
    logger.info('Slack alert triggered', { alertType, details });
  }

  /**
   * Send email alert (placeholder)
   */
  private async sendEmailAlert(alertType: string, details: any): Promise<void> {
    // Implementation would use email service
    logger.info('Email alert triggered', { alertType, details });
  }
}

/**
 * Monitoring middleware for Azure Functions
 */
export function createMonitoringMiddleware(monitoring: MonitoringService) {
  return function monitoringMiddleware(handler: any) {
    return async (request: any, context: any) => {
      const startTime = Date.now();
      const endpoint = `${request.method}:${new URL(request.url).pathname}`;

      try {
        const result = await handler(request, context);
        const duration = Date.now() - startTime;

        // Record successful request
        monitoring.recordSuccess(endpoint);
        monitoring.recordResponseTime(endpoint, duration);

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        // Record error
        monitoring.recordError(
          endpoint,
          error instanceof Error ? error : new Error('Unknown error'),
        );
        monitoring.recordResponseTime(endpoint, duration);

        throw error;
      }
    };
  };
}

// Export singleton instance
export const monitoring = MonitoringService.getInstance();
