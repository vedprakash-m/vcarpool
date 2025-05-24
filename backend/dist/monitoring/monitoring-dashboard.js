"use strict";
/**
 * Advanced Monitoring Dashboard
 * Provides comprehensive monitoring and alerting for the application
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitoringDashboard = void 0;
const logger_1 = require("../utils/logger");
const monitoring_enhanced_1 = require("../utils/monitoring-enhanced");
const monitoringService = monitoring_enhanced_1.MonitoringService.getInstance();
const security_scanner_1 = require("../security/security-scanner");
const cache_1 = require("../utils/cache");
class AdvancedMonitoringDashboard {
    metrics;
    metricsHistory = [];
    alertHistory = [];
    startTime = new Date();
    constructor() {
        this.metrics = this.initializeMetrics();
        this.startMetricsCollection();
        this.startAlertProcessing();
    }
    /**
     * Get current dashboard metrics
     */
    getCurrentMetrics() {
        return { ...this.metrics };
    }
    /**
     * Get metrics history for a specific time range
     */
    getMetricsHistory(hours = 24) {
        const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
        return this.metricsHistory.filter(entry => entry.timestamp > cutoff);
    }
    /**
     * Get performance trends
     */
    getPerformanceTrends(hours = 24) {
        const history = this.getMetricsHistory(hours);
        return {
            responseTime: history.map(entry => ({
                timestamp: entry.timestamp,
                value: entry.metrics.performance.responseTime.average
            })),
            throughput: history.map(entry => ({
                timestamp: entry.timestamp,
                value: entry.metrics.performance.throughput.requestsPerSecond
            })),
            errorRate: history.map(entry => ({
                timestamp: entry.timestamp,
                value: entry.metrics.performance.errorRate
            })),
            memoryUsage: history.map(entry => ({
                timestamp: entry.timestamp,
                value: entry.metrics.system.memoryUsage.percentage
            }))
        };
    }
    /**
     * Get system health status
     */
    getSystemHealth() {
        const issues = [];
        const recommendations = [];
        let score = 100;
        // Check memory usage
        if (this.metrics.system.memoryUsage.percentage > 90) {
            issues.push('High memory usage detected');
            recommendations.push('Consider scaling up or optimizing memory usage');
            score -= 20;
        }
        else if (this.metrics.system.memoryUsage.percentage > 75) {
            issues.push('Elevated memory usage');
            recommendations.push('Monitor memory usage trends');
            score -= 10;
        }
        // Check error rate
        if (this.metrics.performance.errorRate > 5) {
            issues.push('High error rate');
            recommendations.push('Investigate error causes and implement fixes');
            score -= 25;
        }
        else if (this.metrics.performance.errorRate > 1) {
            issues.push('Elevated error rate');
            recommendations.push('Monitor error trends');
            score -= 10;
        }
        // Check response time
        if (this.metrics.performance.responseTime.p95 > 5000) {
            issues.push('Slow response times');
            recommendations.push('Optimize slow endpoints and database queries');
            score -= 15;
        }
        // Check security
        if (this.metrics.security.riskScore > 70) {
            issues.push('High security risk');
            recommendations.push('Review security threats and implement mitigations');
            score -= 30;
        }
        // Determine status
        let status;
        if (score >= 90)
            status = 'healthy';
        else if (score >= 70)
            status = 'warning';
        else
            status = 'critical';
        return { status, score, issues, recommendations };
    }
    /**
     * Generate monitoring report
     */
    generateReport(period = 'daily') {
        const hours = period === 'hourly' ? 1 : period === 'daily' ? 24 : 168;
        const trends = this.getPerformanceTrends(hours);
        const health = this.getSystemHealth();
        const incidents = this.alertHistory
            .filter(alert => {
            const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
            return new Date(alert.timestamp) > cutoff;
        })
            .filter(alert => alert.severity === 'high' || alert.severity === 'critical');
        const summary = this.generateSummary(period, health, incidents.length);
        return {
            summary,
            metrics: this.metrics,
            trends,
            incidents,
            recommendations: health.recommendations
        };
    }
    initializeMetrics() {
        return {
            system: {
                uptime: 0,
                memoryUsage: { used: 0, total: 0, percentage: 0 },
                cpuUsage: 0,
                diskUsage: { used: 0, total: 0, percentage: 0 },
                networkStats: { bytesIn: 0, bytesOut: 0, connectionsActive: 0 },
                functionExecutions: { total: 0, successful: 0, failed: 0, averageExecutionTime: 0 }
            },
            performance: {
                responseTime: { average: 0, p50: 0, p95: 0, p99: 0 },
                throughput: { requestsPerSecond: 0, requestsPerMinute: 0 },
                errorRate: 0,
                cacheHitRate: 0,
                databasePerformance: { averageQueryTime: 0, activeConnections: 0, queryCount: 0 }
            },
            security: {
                threatsDetected: 0,
                threatsByType: {},
                riskScore: 0,
                failedAuthAttempts: 0,
                blockedRequests: 0,
                suspiciousActivity: 0
            },
            business: {
                activeUsers: 0,
                newRegistrations: 0,
                carpoolsCreated: 0,
                ridesCompleted: 0,
                userEngagement: { dailyActiveUsers: 0, weeklyActiveUsers: 0, monthlyActiveUsers: 0 }
            },
            alerts: {
                activeAlerts: 0,
                alertsByPriority: {},
                recentAlerts: []
            }
        };
    }
    startMetricsCollection() {
        // Collect metrics every minute
        setInterval(async () => {
            try {
                await this.collectSystemMetrics();
                await this.collectPerformanceMetrics();
                await this.collectSecurityMetrics();
                await this.collectBusinessMetrics();
                await this.collectAlertMetrics();
                // Store metrics history
                this.metricsHistory.push({
                    timestamp: new Date(),
                    metrics: { ...this.metrics }
                });
                // Keep only last 7 days of history
                const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                this.metricsHistory = this.metricsHistory.filter(entry => entry.timestamp > cutoff);
            }
            catch (error) {
                logger_1.logger.error('Failed to collect metrics', { error });
            }
        }, 60 * 1000);
    }
    startAlertProcessing() {
        // Process alerts every 30 seconds
        setInterval(async () => {
            try {
                const health = this.getSystemHealth();
                if (health.status === 'critical') {
                    await this.sendAlert({
                        title: 'System Health Critical',
                        message: `System health score: ${health.score}. Issues: ${health.issues.join(', ')}`,
                        severity: 'critical',
                        data: { health }
                    });
                }
                else if (health.status === 'warning') {
                    await this.sendAlert({
                        title: 'System Health Warning',
                        message: `System health score: ${health.score}. Issues: ${health.issues.join(', ')}`,
                        severity: 'warning',
                        data: { health }
                    });
                }
            }
            catch (error) {
                logger_1.logger.error('Alert processing failed', { error });
            }
        }, 30 * 1000);
    }
    async collectSystemMetrics() {
        // Get process memory usage
        const memUsage = process.memoryUsage();
        this.metrics.system.uptime = Date.now() - this.startTime.getTime();
        this.metrics.system.memoryUsage = {
            used: memUsage.heapUsed,
            total: memUsage.heapTotal,
            percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
        };
        // In a real implementation, you would collect actual CPU, disk, and network stats
        this.metrics.system.cpuUsage = Math.random() * 100; // Simulated
        this.metrics.system.diskUsage = {
            used: 1000000000, // Simulated
            total: 10000000000,
            percentage: 10
        };
    }
    async collectPerformanceMetrics() {
        // Get cache metrics
        const cacheStats = cache_1.globalCache.getMetrics();
        this.metrics.performance.cacheHitRate = cacheStats.hitRate;
        // In a real implementation, you would collect actual performance metrics
        // from your monitoring service or application performance monitoring (APM) tool
    }
    async collectSecurityMetrics() {
        const securityMetrics = security_scanner_1.securityScanner.getSecurityMetrics();
        this.metrics.security = {
            threatsDetected: securityMetrics.totalThreats,
            threatsByType: securityMetrics.threatsByType,
            riskScore: securityMetrics.riskTrend[securityMetrics.riskTrend.length - 1]?.riskScore || 0,
            failedAuthAttempts: 0, // Would come from auth service
            blockedRequests: 0, // Would come from rate limiter
            suspiciousActivity: securityMetrics.totalThreats
        };
    }
    async collectBusinessMetrics() {
        // In a real implementation, you would query your database for business metrics
        // This is simulated data
        this.metrics.business = {
            activeUsers: Math.floor(Math.random() * 1000),
            newRegistrations: Math.floor(Math.random() * 50),
            carpoolsCreated: Math.floor(Math.random() * 200),
            ridesCompleted: Math.floor(Math.random() * 500),
            userEngagement: {
                dailyActiveUsers: Math.floor(Math.random() * 500),
                weeklyActiveUsers: Math.floor(Math.random() * 1500),
                monthlyActiveUsers: Math.floor(Math.random() * 5000)
            }
        };
    }
    async collectAlertMetrics() {
        const recentAlerts = this.alertHistory
            .slice(-10)
            .map(alert => ({
            id: alert.id,
            title: alert.title,
            severity: alert.severity,
            timestamp: alert.timestamp,
            acknowledged: alert.acknowledged || false
        }));
        this.metrics.alerts = {
            activeAlerts: this.alertHistory.filter(alert => !alert.acknowledged).length,
            alertsByPriority: this.alertHistory.reduce((acc, alert) => {
                acc[alert.severity] = (acc[alert.severity] || 0) + 1;
                return acc;
            }, {}),
            recentAlerts
        };
    }
    async sendAlert(alert) {
        const alertWithId = {
            ...alert,
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            acknowledged: false
        };
        this.alertHistory.push(alertWithId);
        // Log alert instead of using unavailable sendAlert method
        logger_1.logger.warn('Alert triggered', alertWithId);
    }
    generateSummary(period, health, incidentCount) {
        const statusEmoji = health.status === 'healthy' ? '✅' : health.status === 'warning' ? '⚠️' : '🚨';
        return `${statusEmoji} ${period.charAt(0).toUpperCase() + period.slice(1)} Report
Health Score: ${health.score}/100 (${health.status})
Incidents: ${incidentCount}
Active Users: ${this.metrics.business.activeUsers}
Response Time (P95): ${this.metrics.performance.responseTime.p95}ms
Error Rate: ${this.metrics.performance.errorRate}%
Memory Usage: ${this.metrics.system.memoryUsage.percentage.toFixed(1)}%`;
    }
}
exports.monitoringDashboard = new AdvancedMonitoringDashboard();
//# sourceMappingURL=monitoring-dashboard.js.map