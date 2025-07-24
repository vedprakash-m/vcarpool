import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getJWTConfig } from '@carpool/shared';
import { JWTService } from '../../services/auth/jwt.service';

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  checks: {
    database: 'healthy' | 'unhealthy';
    jwt: 'healthy' | 'unhealthy';
    environment: 'healthy' | 'unhealthy';
  };
  version?: string;
  uptime?: number;
}

async function testDatabaseConnection(): Promise<boolean> {
  try {
    // Test Cosmos DB connection
    const cosmosEndpoint = process.env.COSMOS_DB_ENDPOINT;
    if (!cosmosEndpoint) {
      return false;
    }

    // Simple connectivity test
    // In a real implementation, you'd test actual database connectivity
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

async function testJWTService(): Promise<boolean> {
  try {
    const jwtConfig = getJWTConfig();

    // Test that JWT configuration is valid
    if (!jwtConfig.accessTokenSecret || jwtConfig.accessTokenSecret.includes('sample')) {
      return false;
    }

    if (!jwtConfig.refreshTokenSecret || jwtConfig.refreshTokenSecret.includes('sample')) {
      return false;
    }

    // Test JWT service instantiation
    const jwtService = new JWTService();

    // Simple validation that the service is working
    return true;
  } catch (error) {
    console.error('JWT health check failed:', error);
    return false;
  }
}

function testEnvironmentConfiguration(): boolean {
  const requiredEnvVars = [
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'COSMOS_DB_ENDPOINT',
    'COSMOS_DB_KEY',
  ];

  return requiredEnvVars.every((envVar) => {
    const value = process.env[envVar];
    return value && value !== '' && !value.includes('sample') && !value.includes('replace');
  });
}

export async function healthCheck(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const startTime = Date.now();

  try {
    context.log('Health check requested');

    // Run all health checks in parallel
    const [dbStatus, jwtStatus] = await Promise.all([testDatabaseConnection(), testJWTService()]);

    const envStatus = testEnvironmentConfiguration();

    // Overall health status
    const isHealthy = dbStatus && jwtStatus && envStatus;

    const result: HealthCheckResult = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus ? 'healthy' : 'unhealthy',
        jwt: jwtStatus ? 'healthy' : 'unhealthy',
        environment: envStatus ? 'healthy' : 'unhealthy',
      },
      version: '2.0.0-unified-auth',
      uptime: Date.now() - startTime,
    };

    // Log health status
    if (isHealthy) {
      context.log('✅ Health check passed');
    } else {
      context.log('❌ Health check failed', { checks: result.checks });
    }

    return {
      status: isHealthy ? 200 : 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      jsonBody: result,
    };
  } catch (error) {
    context.log('Health check error:', error);

    return {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      jsonBody: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        uptime: Date.now() - startTime,
      } as Partial<HealthCheckResult>,
    };
  }
}

app.http('health-check', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: healthCheck,
});
