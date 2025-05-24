"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitoring = exports.MonitoringService = exports.HealthStatus = void 0;
exports.createMonitoringMiddleware = createMonitoringMiddleware;
const logger_1 = require("./logger");
const cache_1 = require("./cache");
/**
 * Health check status
 */
var HealthStatus;
(function (HealthStatus) {
    HealthStatus["HEALTHY"] = "healthy";
    HealthStatus["DEGRADED"] = "degraded";
    HealthStatus["UNHEALTHY"] = "unhealthy";
})(HealthStatus || (exports.HealthStatus = HealthStatus = {}));
/**
 * Default alert configuration
 */
const defaultAlertConfig = {
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
class MonitoringService {
    static instance;
    metrics = new Map();
    healthChecks = new Map();
    lastAlerts = new Map();
    config;
    constructor(config = {}) {
        this.config = { ...defaultAlertConfig, ...config };
        this.initializeHealthChecks();
        this.startMetricsCollection();
    }
    static getInstance(config) {
        if (!MonitoringService.instance) {
            MonitoringService.instance = new MonitoringService(config);
        }
        return MonitoringService.instance;
    }
    /**
     * Record a metric value
     */
    recordMetric(name, value) {
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        const values = this.metrics.get(name);
        values.push(value);
        // Keep only last 1000 values for memory efficiency
        if (values.length > 1000) {
            values.shift();
        }
        // Log metrics for high-level monitoring
        logger_1.LoggingUtils.metricsLog(logger_1.logger, name, value);
    }
    /**
     * Record response time
     */
    recordResponseTime(endpoint, duration) {
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
    recordError(endpoint, error) {
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
    recordSuccess(endpoint) {
        this.recordMetric(`requests.${endpoint}`, 1);
        this.recordMetric('requests.all', 1);
    }
    /**
     * Get current performance metrics
     */
    getPerformanceMetrics() {
        const responseTimesAll = this.metrics.get('response_time.all') || [];
        const requestsAll = this.metrics.get('requests.all') || [];
        const errorsAll = this.metrics.get('errors.all') || [];
        const averageResponseTime = responseTimesAll.length > 0
            ? responseTimesAll.reduce((sum, time) => sum + time, 0) / responseTimesAll.length
            : 0;
        const sortedResponseTimes = [...responseTimesAll].sort((a, b) => a - b);
        const p95Index = Math.floor(sortedResponseTimes.length * 0.95);
        const p99Index = Math.floor(sortedResponseTimes.length * 0.99);
        const totalRequests = requestsAll.reduce((sum, count) => sum + count, 0);
        const totalErrors = errorsAll.reduce((sum, count) => sum + count, 0);
        const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;
        const cacheMetrics = cache_1.globalCache.getMetrics();
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
    async performHealthCheck() {
        const checks = [];
        let overallStatus = HealthStatus.HEALTHY;
        // Run all registered health checks
        for (const [name, checkFunction] of this.healthChecks) {
            try {
                const result = await checkFunction();
                checks.push(result);
                // Determine overall status
                if (result.status === HealthStatus.UNHEALTHY) {
                    overallStatus = HealthStatus.UNHEALTHY;
                }
                else if (result.status === HealthStatus.DEGRADED && overallStatus === HealthStatus.HEALTHY) {
                    overallStatus = HealthStatus.DEGRADED;
                }
            }
            catch (error) {
                const unhealthyResult = {
                    status: HealthStatus.UNHEALTHY,
                    component: name,
                    message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    duration: 0,
                    timestamp: new Date().toISOString(),
                };
                checks.push(unhealthyResult);
                overallStatus = HealthStatus.UNHEALTHY;
                logger_1.logger.error('Health check failed', {
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
        if (metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal > this.config.memoryThreshold) {
            overallStatus = HealthStatus.DEGRADED;
        }
        logger_1.logger.info('Health check completed', {
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
    registerHealthCheck(name, checkFunction) {
        this.healthChecks.set(name, checkFunction);
        logger_1.logger.debug('Health check registered', { name });
    }
    /**
     * Initialize default health checks
     */
    initializeHealthChecks() {
        // Cache health check
        this.registerHealthCheck('cache', async () => {
            const startTime = Date.now();
            try {
                // Test cache operations
                const testKey = 'health-check-test';
                cache_1.globalCache.set(testKey, 'test-value', 1000);
                const value = cache_1.globalCache.get(testKey);
                cache_1.globalCache.delete(testKey);
                const duration = Date.now() - startTime;
                const metrics = cache_1.globalCache.getMetrics();
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
                }
                else {
                    return {
                        status: HealthStatus.UNHEALTHY,
                        component: 'cache',
                        message: 'Cache read/write test failed',
                        duration,
                        timestamp: new Date().toISOString(),
                    };
                }
            }
            catch (error) {
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
            }
            else if (heapUsedPercent > this.config.memoryThreshold) {
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
    startMetricsCollection() {
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
    getErrorRate(endpoint) {
        const requests = this.metrics.get(`requests.${endpoint}`) || [];
        const errors = this.metrics.get(`errors.${endpoint}`) || [];
        const totalRequests = requests.reduce((sum, count) => sum + count, 0);
        const totalErrors = errors.reduce((sum, count) => sum + count, 0);
        return totalRequests > 0 ? totalErrors / totalRequests : 0;
    }
    /**
     * Trigger an alert with cooldown
     */
    triggerAlert(alertType, details) {
        const now = Date.now();
        const lastAlert = this.lastAlerts.get(alertType) || 0;
        // Check cooldown period
        if (now - lastAlert < this.config.alertCooldownMs) {
            return;
        }
        this.lastAlerts.set(alertType, now);
        // Log the alert
        logger_1.LoggingUtils.securityLog(logger_1.logger, alertType, details);
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
    async sendSlackAlert(alertType, details) {
        // Implementation would use Slack webhook
        logger_1.logger.info('Slack alert triggered', { alertType, details });
    }
    /**
     * Send email alert (placeholder)
     */
    async sendEmailAlert(alertType, details) {
        // Implementation would use email service
        logger_1.logger.info('Email alert triggered', { alertType, details });
    }
}
exports.MonitoringService = MonitoringService;
/**
 * Monitoring middleware for Azure Functions
 */
function createMonitoringMiddleware(monitoring) {
    return function monitoringMiddleware(handler) {
        return async (request, context) => {
            const startTime = Date.now();
            const endpoint = `${request.method}:${new URL(request.url).pathname}`;
            try {
                const result = await handler(request, context);
                const duration = Date.now() - startTime;
                // Record successful request
                monitoring.recordSuccess(endpoint);
                monitoring.recordResponseTime(endpoint, duration);
                return result;
            }
            catch (error) {
                const duration = Date.now() - startTime;
                // Record error
                monitoring.recordError(endpoint, error instanceof Error ? error : new Error('Unknown error'));
                monitoring.recordResponseTime(endpoint, duration);
                throw error;
            }
        };
    };
}
// Export singleton instance
exports.monitoring = MonitoringService.getInstance();
//# sourceMappingURL=monitoring-enhanced.js.map