import { InvocationContext } from '@azure/functions';

// Log levels with numeric values for filtering
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// Enhanced logger interface
export interface ILogger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, error?: Record<string, unknown>): void;
  setContext(context: InvocationContext): void;
  child(metadata: Record<string, unknown>): ILogger;
  startTimer(label: string): () => void;
}

// Logger configuration
interface LoggerConfig {
  service: string;
  minLevel: LogLevel;
  enableConsole: boolean;
  enableApplicationInsights: boolean;
  enableStructuredLogs: boolean;
  maskSensitiveData: boolean;
  maxDepth: number;
}

// Default configuration
const defaultConfig: LoggerConfig = {
  service: 'carpool',
  minLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  enableConsole: true,
  enableApplicationInsights: true,
  enableStructuredLogs: true,
  maskSensitiveData: true,
  maxDepth: 5,
};

// Enhanced logger implementation for Azure Functions
export class AzureLogger implements ILogger {
  private context?: InvocationContext;
  private metadata: Record<string, unknown> = {};
  private timers: Map<string, number> = new Map();

  constructor(
    private config: LoggerConfig = defaultConfig,
    metadata: Record<string, unknown> = {},
  ) {
    this.metadata = { ...metadata, service: config.service };
  }

  setContext(context: InvocationContext): void {
    this.context = context;
  }

  child(metadata: Record<string, unknown>): ILogger {
    return new AzureLogger(this.config, { ...this.metadata, ...metadata });
  }

  startTimer(label: string): () => void {
    const startTime = Date.now();
    this.timers.set(label, startTime);

    return () => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      this.timers.delete(label);
      this.debug(`Timer: ${label}`, { duration: `${duration}ms` });
      return duration;
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.minLevel;
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: LogLevel[level],
      service: this.config.service,
      message,
      ...this.metadata,
      ...(data && {
        data: this.config.maskSensitiveData ? this.sanitizeData(data) : data,
      }),
    };

    // Console logging
    if (this.config.enableConsole) {
      this.logToConsole(level, logEntry);
    }

    // Azure Functions context logging
    if (this.context) {
      this.logToAzureFunctions(level, logEntry);
    }

    // Application Insights (if enabled)
    if (this.config.enableApplicationInsights) {
      this.logToApplicationInsights(level, logEntry);
    }
  }

  private logToConsole(level: LogLevel, logEntry: Record<string, unknown>): void {
    const message = this.config.enableStructuredLogs
      ? JSON.stringify(logEntry)
      : `[${logEntry.timestamp}] [${logEntry.level}] [${logEntry.service}] ${logEntry.message}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(message, logEntry['data']);
        break;
      case LogLevel.INFO:
        console.info(message, logEntry['data']);
        break;
      case LogLevel.WARN:
        console.warn(message, logEntry['data']);
        break;
      case LogLevel.ERROR:
        console.error(message, logEntry['data']);
        break;
    }
  }

  private logToAzureFunctions(level: LogLevel, logEntry: Record<string, unknown>): void {
    const message = `[${logEntry.level}] [${logEntry.service}] ${logEntry.message}`;
    if (level === LogLevel.ERROR) {
      this.context!.error(message, logEntry);
    } else {
      this.context!.log(message, logEntry);
    }
  }

  private logToApplicationInsights(level: LogLevel, logEntry: Record<string, unknown>): void {
    // Implementation would depend on Application Insights SDK
    // For now, this is a placeholder for future enhancement
    if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
      // Application Insights telemetry would be sent here
    }
  }

  private sanitizeData(data: unknown, depth = 0): unknown {
    if (depth > this.config.maxDepth) {
      return '[Max Depth Reached]';
    }

    if (!data) return data;

    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
      return data;
    }

    if (data instanceof Error) {
      return {
        name: data.name,
        message: data.message,
        stack: data.stack,
      };
    }

    if (Array.isArray(data)) {
      return data.slice(0, 10).map((item) => this.sanitizeData(item, depth + 1));
    }

    if (typeof data === 'object') {
      const sanitized: Record<string, unknown> = {};
      const sensitiveKeys = [
        'password',
        'passwordHash',
        'token',
        'accessToken',
        'refreshToken',
        'secret',
        'apiKey',
        'authorization',
        'cookie',
        'sessionId',
      ];

      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        if (
          sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive.toLowerCase()))
        ) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeData(value, depth + 1);
        }
      }

      return sanitized;
    }

    return data;
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, error);
  }
}

/**
 * Logger factory for creating service-specific loggers
 */
export class LoggerFactory {
  private static instance: LoggerFactory;
  private config: LoggerConfig;

  private constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  static getInstance(config?: Partial<LoggerConfig>): LoggerFactory {
    if (!LoggerFactory.instance) {
      LoggerFactory.instance = new LoggerFactory(config);
    }
    return LoggerFactory.instance;
  }

  static configure(config: Partial<LoggerConfig>): void {
    LoggerFactory.instance = new LoggerFactory(config);
  }

  create(service: string, metadata: Record<string, unknown> = {}): ILogger {
    const serviceConfig = { ...this.config, service };
    return new AzureLogger(serviceConfig, metadata);
  }

  createForFunction(functionName: string, context?: InvocationContext): ILogger {
    const logger = this.create('function', { functionName });
    if (context) {
      logger.setContext(context);
    }
    return logger;
  }
}

// Create loggers for different services
const factory = LoggerFactory.getInstance();

export const loggers = {
  auth: factory.create('auth'),
  trip: factory.create('trip'),
  user: factory.create('user'),
  system: factory.create('system'),
  api: factory.create('api'),
  database: factory.create('database'),
  cache: factory.create('cache'),
  email: factory.create('email'),
};

// Default logger
export const logger = loggers.system;

/**
 * Utility functions for logging
 */
export class LoggingUtils {
  /**
   * Create a performance logger that measures execution time
   */
  static performance<T extends any[], R>(logger: ILogger, operation: string) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
      const method = descriptor.value;

      descriptor.value = async function (...args: T): Promise<R> {
        const timer = logger.startTimer(`${operation}.${propertyName}`);
        const metadata = {
          operation,
          method: propertyName,
          args: args.length,
        };

        logger.debug(`Starting ${operation}.${propertyName}`, metadata);

        try {
          const result = await method.apply(this, args);
          const duration = timer();

          logger.info(`Completed ${operation}.${propertyName}`, {
            ...metadata,
            success: true,
            duration,
          });

          return result;
        } catch (error) {
          const duration = timer();

          logger.error(`Failed ${operation}.${propertyName}`, {
            ...metadata,
            success: false,
            duration,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          throw error;
        }
      };
    };
  }

  /**
   * Log user actions for audit trail
   */
  static auditLog(logger: ILogger, action: string, userId?: string, details?: any): void {
    logger.info('User action', {
      type: 'audit',
      action,
      userId,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log security events
   */
  static securityLog(logger: ILogger, event: string, details?: any): void {
    logger.warn('Security event', {
      type: 'security',
      event,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log business metrics
   */
  static metricsLog(logger: ILogger, metric: string, value: number, metadata?: any): void {
    logger.info('Metric', {
      type: 'metric',
      metric,
      value,
      metadata,
      timestamp: new Date().toISOString(),
    });
  }
}
