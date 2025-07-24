/**
 * Simplified Monitoring Service
 * Provides basic monitoring functionality without complex Application Insights integration
 */

import { InvocationContext } from '@azure/functions';
import { v4 as uuidv4 } from 'uuid';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  duration: number;
  checks: Record<
    string,
    {
      status: 'pass' | 'fail' | 'warn';
      time: number;
      output?: string;
    }
  >;
  version: string;
  uptime: number;
}

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  correlationId: string;
  userId?: string;
  functionName?: string;
  data?: any;
  error?: {
    message: string;
    stack: string;
    code?: string;
  };
}

interface AlertConfig {
  name: string;
  condition: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

export class MonitoringService {
  private correlationId: string;
  private healthChecks: Map<string, () => Promise<any>> = new Map();
  private alerts: AlertConfig[] = [];

  constructor() {
    this.correlationId = uuidv4();
    this.log('info', 'MonitoringService initialized', {
      correlationId: this.correlationId,
    });
  }

  /**
   * Get the current correlation ID
   */
  getCorrelationId(): string {
    return this.correlationId;
  }

  /**
   * Set a new correlation ID
   */
  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  /**
   * Structured logging with correlation tracking
   */
  log(level: LogEntry['level'], message: string, data?: any, error?: Error): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId: this.correlationId,
      data,
    };

    if (error) {
      logEntry.error = {
        message: error.message,
        stack: error.stack || '',
        code: (error as any).code,
      };
    }

    // Console output for local development
    const formattedMessage = `[${level.toUpperCase()}] ${message} - ${this.correlationId}`;

    switch (level) {
      case 'debug':
        console.debug(formattedMessage, JSON.stringify(logEntry, null, 2));
        break;
      case 'info':
        console.info(formattedMessage, JSON.stringify(logEntry, null, 2));
        break;
      case 'warn':
        console.warn(formattedMessage, JSON.stringify(logEntry, null, 2));
        break;
      case 'error':
        console.error(formattedMessage, JSON.stringify(logEntry, null, 2));
        break;
    }
  }

  /**
   * Track custom events
   */
  trackEvent(
    name: string,
    properties?: Record<string, any>,
    measurements?: Record<string, number>,
  ): void {
    this.log('info', `Event tracked: ${name}`, { properties, measurements });
  }

  /**
   * Track performance metrics
   */
  trackMetric(name: string, value: number, properties?: Record<string, any>): void {
    this.log('debug', `Metric tracked: ${name} = ${value}`, properties);
  }

  /**
   * Track exceptions
   */
  trackException(error: Error, properties?: Record<string, any>): void {
    this.log('error', 'Exception tracked', properties, error);
  }

  /**
   * Register a health check
   */
  registerHealthCheck(name: string, checkFunction: () => Promise<any>): void {
    this.healthChecks.set(name, checkFunction);
    this.log('info', `Health check registered: ${name}`);
  }

  /**
   * Run all health checks
   */
  async runHealthChecks(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const checks: HealthCheckResult['checks'] = {};
    let overallStatus: HealthCheckResult['status'] = 'healthy';

    for (const [name, checkFunction] of this.healthChecks) {
      const checkStartTime = Date.now();
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), 5000),
        );

        await Promise.race([checkFunction(), timeoutPromise]);

        checks[name] = {
          status: 'pass',
          time: Date.now() - checkStartTime,
        };
      } catch (error) {
        checks[name] = {
          status: 'fail',
          time: Date.now() - checkStartTime,
          output: error instanceof Error ? error.message : String(error),
        };
        overallStatus = 'unhealthy';
      }
    }

    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      checks,
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
    };

    this.log('info', `Health check completed: ${overallStatus}`, {
      duration: result.duration,
      checksCount: Object.keys(checks).length,
    });

    return result;
  }

  /**
   * Configure alerts
   */
  configureAlert(config: AlertConfig): void {
    this.alerts.push(config);
    this.log('info', `Alert configured: ${config.name}`, {
      severity: config.severity,
      condition: config.condition,
    });
  }

  /**
   * Middleware decorator for automatic function monitoring
   */
  static middleware(operationName: string) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
      const method = descriptor.value;

      descriptor.value = async function (context: InvocationContext, ...args: any[]) {
        const monitor = new MonitoringService();
        const startTime = Date.now();

        try {
          monitor.log('info', `Function started: ${operationName}`, {
            functionName: propertyName,
            invocationId: context.invocationId,
          });

          const result = await method.apply(this, [context, ...args]);

          monitor.log('info', `Function completed: ${operationName}`, {
            functionName: propertyName,
            duration: Date.now() - startTime,
            invocationId: context.invocationId,
          });

          return result;
        } catch (error) {
          monitor.log(
            'error',
            `Function failed: ${operationName}`,
            {
              functionName: propertyName,
              duration: Date.now() - startTime,
              invocationId: context.invocationId,
            },
            error instanceof Error ? error : new Error(String(error)),
          );
          throw error;
        }
      };

      return descriptor;
    };
  }

  /**
   * Flush any pending telemetry
   */
  async flush(): Promise<void> {
    // In a real implementation, this would flush Application Insights
    return new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
  }
}
