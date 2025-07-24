import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { MonitoringService } from '../utils/monitoring-enhanced';

/**
 * Health check function - essential for CI/CD pipelines and monitoring
 * @param request The HTTP request object
 * @param context The invocation context
 * @returns HTTP response with health status
 */
export async function healthCheck(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const startTime = Date.now();

  try {
    // Quick response for initial cold start
    if (request.query.get('quick') === 'true') {
      return {
        status: 200,
        jsonBody: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          environment: process.env.AZURE_FUNCTIONS_ENVIRONMENT || 'development',
          version: process.env.WEBSITE_DEPLOYMENT_ID || 'local',
        },
      };
    }

    // Full health check
    const monitoring = MonitoringService.getInstance();
    const healthStatus = await Promise.race([
      monitoring.performHealthCheck(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), 8000)),
    ]);

    const duration = Date.now() - startTime;

    return {
      status: 200,
      jsonBody: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
        environment: process.env.AZURE_FUNCTIONS_ENVIRONMENT || 'development',
        version: process.env.WEBSITE_DEPLOYMENT_ID || 'local',
        details: healthStatus,
      },
    };
  } catch (error) {
    context.log('Health check failed:', error);

    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';

    return {
      status: errorMessage === 'Health check timeout' ? 503 : 500,
      jsonBody: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: errorMessage,
        environment: process.env.AZURE_FUNCTIONS_ENVIRONMENT || 'development',
      },
    };
  }
}

app.http('healthCheck', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: healthCheck,
});
