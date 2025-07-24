/**
 * Simple Health Check Function
 * Provides basic health monitoring without complex dependencies
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { MonitoringService } from '../services/monitoring.service';

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: Record<string, any>;
}

async function healthCheck(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const monitor = new MonitoringService();

  try {
    monitor.setCorrelationId(context.invocationId);
    monitor.log('info', 'Health check requested', {
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for'),
    });

    // Execute health checks
    const healthResult = await monitor.runHealthChecks();

    const response: HealthResponse = {
      status: healthResult.status,
      timestamp: healthResult.timestamp,
      version: healthResult.version,
      uptime: healthResult.uptime,
      checks: healthResult.checks,
    };

    // Return appropriate HTTP status based on health
    const httpStatus =
      healthResult.status === 'healthy' ? 200 : healthResult.status === 'degraded' ? 206 : 503;

    return {
      status: httpStatus,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify(response, null, 2),
    };
  } catch (error) {
    monitor.log(
      'error',
      'Health check failed',
      {},
      error instanceof Error ? error : new Error(String(error)),
    );

    return {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      }),
    };
  }
}

async function detailedHealthCheck(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const monitor = new MonitoringService();

  try {
    monitor.setCorrelationId(context.invocationId);

    // Basic checks
    const basicHealth = await monitor.runHealthChecks();

    // Additional detailed checks
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const detailedResponse = {
      ...basicHealth,
      system: {
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
          external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB',
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
        node: process.version,
        platform: process.platform,
      },
    };

    return {
      status: basicHealth.status === 'healthy' ? 200 : 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify(detailedResponse, null, 2),
    };
  } catch (error) {
    monitor.log(
      'error',
      'Detailed health check failed',
      {},
      error instanceof Error ? error : new Error(String(error)),
    );

    return {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Detailed health check failed',
      }),
    };
  }
}

async function readinessCheck(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    // Simple readiness check - just verify the function is running
    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'ready',
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    return {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'not ready',
        timestamp: new Date().toISOString(),
      }),
    };
  }
}

// Register the functions
app.http('health-check', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: healthCheck,
});

app.http('health-check-detailed', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health/detailed',
  handler: detailedHealthCheck,
});

app.http('readiness-check', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'ready',
  handler: readinessCheck,
});
