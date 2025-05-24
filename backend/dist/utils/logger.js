"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingUtils = exports.logger = exports.loggers = exports.LoggerFactory = exports.AzureLogger = exports.LogLevel = void 0;
// Log levels with numeric values for filtering
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
// Default configuration
const defaultConfig = {
    service: 'vcarpool',
    minLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
    enableConsole: true,
    enableApplicationInsights: true,
    enableStructuredLogs: true,
    maskSensitiveData: true,
    maxDepth: 5,
};
// Enhanced logger implementation for Azure Functions
class AzureLogger {
    config;
    context;
    metadata = {};
    timers = new Map();
    constructor(config = defaultConfig, metadata = {}) {
        this.config = config;
        this.metadata = { ...metadata, service: config.service };
    }
    setContext(context) {
        this.context = context;
    }
    child(metadata) {
        return new AzureLogger(this.config, { ...this.metadata, ...metadata });
    }
    startTimer(label) {
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
    shouldLog(level) {
        return level >= this.config.minLevel;
    }
    log(level, message, data) {
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
            ...(data && { data: this.config.maskSensitiveData ? this.sanitizeData(data) : data }),
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
    logToConsole(level, logEntry) {
        const message = this.config.enableStructuredLogs
            ? JSON.stringify(logEntry)
            : `[${logEntry.timestamp}] [${logEntry.level}] [${logEntry.service}] ${logEntry.message}`;
        switch (level) {
            case LogLevel.DEBUG:
                console.debug(message, logEntry.data);
                break;
            case LogLevel.INFO:
                console.info(message, logEntry.data);
                break;
            case LogLevel.WARN:
                console.warn(message, logEntry.data);
                break;
            case LogLevel.ERROR:
                console.error(message, logEntry.data);
                break;
        }
    }
    logToAzureFunctions(level, logEntry) {
        const message = `[${logEntry.level}] [${logEntry.service}] ${logEntry.message}`;
        if (level === LogLevel.ERROR) {
            this.context.error(message, logEntry);
        }
        else {
            this.context.log(message, logEntry);
        }
    }
    logToApplicationInsights(level, logEntry) {
        // Implementation would depend on Application Insights SDK
        // For now, this is a placeholder for future enhancement
        if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
            // Application Insights telemetry would be sent here
        }
    }
    sanitizeData(data, depth = 0) {
        if (depth > this.config.maxDepth) {
            return '[Max Depth Reached]';
        }
        if (!data)
            return data;
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
            return data.slice(0, 10).map(item => this.sanitizeData(item, depth + 1));
        }
        if (typeof data === 'object') {
            const sanitized = {};
            const sensitiveKeys = [
                'password', 'passwordHash', 'token', 'accessToken', 'refreshToken',
                'secret', 'apiKey', 'authorization', 'cookie', 'sessionId'
            ];
            for (const [key, value] of Object.entries(data)) {
                if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()))) {
                    sanitized[key] = '[REDACTED]';
                }
                else {
                    sanitized[key] = this.sanitizeData(value, depth + 1);
                }
            }
            return sanitized;
        }
        return data;
    }
    debug(message, data) {
        this.log(LogLevel.DEBUG, message, data);
    }
    info(message, data) {
        this.log(LogLevel.INFO, message, data);
    }
    warn(message, data) {
        this.log(LogLevel.WARN, message, data);
    }
    error(message, error) {
        this.log(LogLevel.ERROR, message, error);
    }
}
exports.AzureLogger = AzureLogger;
/**
 * Logger factory for creating service-specific loggers
 */
class LoggerFactory {
    static instance;
    config;
    constructor(config = {}) {
        this.config = { ...defaultConfig, ...config };
    }
    static getInstance(config) {
        if (!LoggerFactory.instance) {
            LoggerFactory.instance = new LoggerFactory(config);
        }
        return LoggerFactory.instance;
    }
    static configure(config) {
        LoggerFactory.instance = new LoggerFactory(config);
    }
    create(service, metadata = {}) {
        const serviceConfig = { ...this.config, service };
        return new AzureLogger(serviceConfig, metadata);
    }
    createForFunction(functionName, context) {
        const logger = this.create('function', { functionName });
        if (context) {
            logger.setContext(context);
        }
        return logger;
    }
}
exports.LoggerFactory = LoggerFactory;
// Create loggers for different services
const factory = LoggerFactory.getInstance();
exports.loggers = {
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
exports.logger = exports.loggers.system;
/**
 * Utility functions for logging
 */
class LoggingUtils {
    /**
     * Create a performance logger that measures execution time
     */
    static performance(logger, operation) {
        return function (target, propertyName, descriptor) {
            const method = descriptor.value;
            descriptor.value = async function (...args) {
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
                }
                catch (error) {
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
    static auditLog(logger, action, userId, details) {
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
    static securityLog(logger, event, details) {
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
    static metricsLog(logger, metric, value, metadata) {
        logger.info('Metric', {
            type: 'metric',
            metric,
            value,
            metadata,
            timestamp: new Date().toISOString(),
        });
    }
}
exports.LoggingUtils = LoggingUtils;
//# sourceMappingURL=logger.js.map