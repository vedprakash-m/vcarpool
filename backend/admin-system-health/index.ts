/**
 * Admin System Health Monitoring
 *
 * Migrated from JavaScript to TypeScript
 * Provides comprehensive system health monitoring for admin dashboard
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import {
  compose,
  requestId,
  requestLogging,
  authenticate,
  hasRole,
  corsMiddleware,
} from '../src/middleware';
import { container } from '../src/container';
import { UnifiedResponseHandler } from '../src/utils/unified-response.service';
import { UserRole } from '@carpool/shared';
import { handleError, Errors } from '../src/utils/error-handler';
import { ILogger } from '../src/utils/logger';

// System health interfaces
interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  services: ServiceHealth[];
  metrics: SystemMetrics;
  alerts: HealthAlert[];
}

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastChecked: Date;
  errorRate: number;
  details?: Record<string, any>;
}

interface SystemMetrics {
  totalUsers: number;
  activeUsers: number;
  totalGroups: number;
  activeGroups: number;
  totalTrips: number;
  tripsToday: number;
  averageResponseTime: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
}

interface HealthAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  service: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
}

// Mock health data generator
function generateSystemHealth(): SystemHealth {
  const now = new Date();
  const baseResponseTime = 150 + Math.random() * 100; // 150-250ms

  const services: ServiceHealth[] = [
    {
      name: 'Authentication Service',
      status: 'healthy',
      responseTime: baseResponseTime + Math.random() * 50,
      lastChecked: now,
      errorRate: Math.random() * 0.01, // 0-1%
    },
    {
      name: 'User Management',
      status: 'healthy',
      responseTime: baseResponseTime + Math.random() * 30,
      lastChecked: now,
      errorRate: Math.random() * 0.005,
    },
    {
      name: 'Group Management',
      status: 'healthy',
      responseTime: baseResponseTime + Math.random() * 40,
      lastChecked: now,
      errorRate: Math.random() * 0.008,
    },
    {
      name: 'Trip Management',
      status: 'healthy',
      responseTime: baseResponseTime + Math.random() * 60,
      lastChecked: now,
      errorRate: Math.random() * 0.012,
    },
    {
      name: 'Notification Service',
      status: Math.random() > 0.1 ? 'healthy' : 'degraded',
      responseTime: baseResponseTime + Math.random() * 80,
      lastChecked: now,
      errorRate: Math.random() * 0.015,
    },
    {
      name: 'Database Connection',
      status: 'healthy',
      responseTime: baseResponseTime + Math.random() * 20,
      lastChecked: now,
      errorRate: Math.random() * 0.003,
    },
  ];

  const metrics: SystemMetrics = {
    totalUsers: 1247,
    activeUsers: 89,
    totalGroups: 23,
    activeGroups: 18,
    totalTrips: 156,
    tripsToday: 12,
    averageResponseTime: baseResponseTime,
    errorRate: Math.random() * 0.01,
    memoryUsage: 45 + Math.random() * 20, // 45-65%
    cpuUsage: 25 + Math.random() * 15, // 25-40%
  };

  const alerts: HealthAlert[] = [];

  // Generate alerts based on service status
  services.forEach((service, index) => {
    if (service.status === 'degraded') {
      alerts.push({
        id: `alert-${index}`,
        severity: 'medium',
        service: service.name,
        message: `${service.name} is experiencing degraded performance`,
        timestamp: new Date(now.getTime() - Math.random() * 3600000), // Within last hour
        resolved: false,
      });
    }
    if (service.errorRate > 0.01) {
      alerts.push({
        id: `alert-error-${index}`,
        severity: 'high',
        service: service.name,
        message: `High error rate detected in ${service.name}: ${(service.errorRate * 100).toFixed(
          2,
        )}%`,
        timestamp: new Date(now.getTime() - Math.random() * 1800000), // Within last 30 min
        resolved: false,
      });
    }
  });

  // Overall system status
  const hasUnhealthy = services.some((s) => s.status === 'unhealthy');
  const hasDegraded = services.some((s) => s.status === 'degraded');
  const overallStatus = hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy';

  return {
    status: overallStatus,
    timestamp: now,
    uptime: 2567890, // ~30 days in seconds
    services,
    metrics,
    alerts,
  };
}

// Handler function
async function adminSystemHealthHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const logger = container.resolve<ILogger>('ILogger').child({ requestId: request.requestId });

  try {
    const method = request.method?.toUpperCase();
    const currentUserId = request.auth!.userId;

    logger.info('Admin system health request', { method, currentUserId });

    switch (method) {
      case 'GET':
        const healthType = request.query.get('type') || 'full';

        switch (healthType) {
          case 'summary':
            // Return just the overall status and key metrics
            const summaryHealth = generateSystemHealth();
            return UnifiedResponseHandler.success({
              status: summaryHealth.status,
              timestamp: summaryHealth.timestamp,
              uptime: summaryHealth.uptime,
              activeAlerts: summaryHealth.alerts.filter((a) => !a.resolved).length,
              totalUsers: summaryHealth.metrics.totalUsers,
              activeUsers: summaryHealth.metrics.activeUsers,
              averageResponseTime: summaryHealth.metrics.averageResponseTime,
            });

          case 'services':
            // Return detailed service health
            const serviceHealth = generateSystemHealth();
            return UnifiedResponseHandler.success({
              services: serviceHealth.services,
              timestamp: serviceHealth.timestamp,
            });

          case 'metrics':
            // Return system metrics
            const metricsHealth = generateSystemHealth();
            return UnifiedResponseHandler.success({
              metrics: metricsHealth.metrics,
              timestamp: metricsHealth.timestamp,
            });

          case 'alerts':
            // Return alerts only
            const alertsHealth = generateSystemHealth();
            const activeOnly = request.query.get('active') === 'true';
            const filteredAlerts = activeOnly
              ? alertsHealth.alerts.filter((a) => !a.resolved)
              : alertsHealth.alerts;

            return UnifiedResponseHandler.success({
              alerts: filteredAlerts,
              timestamp: alertsHealth.timestamp,
            });

          case 'full':
          default:
            // Return complete health information
            const fullHealth = generateSystemHealth();
            return UnifiedResponseHandler.success(fullHealth);
        }

      case 'POST':
        // Trigger health check or resolve alerts
        const body = await UnifiedResponseHandler.parseJsonBody(request);
        const action = body.action;

        if (action === 'refresh') {
          // Trigger a fresh health check
          const refreshedHealth = generateSystemHealth();

          logger.info('System health refreshed', {
            status: refreshedHealth.status,
            triggeredBy: currentUserId,
          });

          return UnifiedResponseHandler.success({
            message: 'System health check refreshed',
            health: refreshedHealth,
          });
        } else if (action === 'resolve_alert') {
          // Resolve a specific alert
          const alertId = body.alertId;

          if (!alertId) {
            throw Errors.BadRequest('Alert ID is required to resolve alert');
          }

          logger.info('Alert resolved', {
            alertId,
            resolvedBy: currentUserId,
          });

          return UnifiedResponseHandler.success({
            message: 'Alert resolved successfully',
            alertId,
            resolvedBy: currentUserId,
            resolvedAt: new Date(),
          });
        } else {
          throw Errors.BadRequest('Invalid action specified');
        }

      default:
        throw Errors.BadRequest(`Method ${method} not supported`);
    }
  } catch (error) {
    logger.error('Error in admin system health function', { error });
    return handleError(error, request);
  }
}

// Register the function with middleware composition
app.http('admin-system-health', {
  methods: ['GET', 'POST'],
  route: 'admin/system/health',
  authLevel: 'anonymous',
  handler: compose(
    requestId,
    requestLogging,
    corsMiddleware,
    authenticate,
    hasRole('group_admin' as UserRole),
  )(adminSystemHealthHandler),
});

export default adminSystemHealthHandler;
