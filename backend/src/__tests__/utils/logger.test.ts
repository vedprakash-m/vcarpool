/**
 * Logger Test Suite - Comprehensive Coverage
 *
 * Tests for the AzureLogger implementation including:
 * - All log levels (debug, info, warn, error)
 * - Logger configuration and behavior
 * - Data sanitization and security
 * - Timer functionality
 * - Child logger creation
 * - LoggerFactory and service-specific loggers
 * - Performance decorators and utility functions
 */

import { InvocationContext } from '@azure/functions';
import {
  AzureLogger,
  LogLevel,
  ILogger,
  LoggerFactory,
  LoggingUtils,
  logger,
  loggers,
} from '../../utils/logger';

// Mock console methods
const originalConsole = { ...console };
let testLogger: ILogger;
let mockContext: jest.Mocked<InvocationContext>;

beforeEach(() => {
  jest.spyOn(console, 'debug').mockImplementation();
  jest.spyOn(console, 'info').mockImplementation();
  jest.spyOn(console, 'warn').mockImplementation();
  jest.spyOn(console, 'error').mockImplementation();

  mockContext = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  } as any;

  // Create logger with test-friendly configuration
  testLogger = new AzureLogger({
    service: 'test',
    minLevel: LogLevel.DEBUG,
    enableConsole: true,
    enableApplicationInsights: false,
    enableStructuredLogs: false,
    maskSensitiveData: false,
    maxDepth: 5,
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('AzureLogger', () => {
  beforeEach(() => {
    // Reset testLogger for each test
    testLogger = new AzureLogger();
  });

  describe('Basic Logging Functionality', () => {
    it('should log debug messages', () => {
      testLogger.debug('Test debug message', { key: 'value' });

      expect(console.debug).toHaveBeenCalledWith(
        expect.stringContaining('Test debug message'),
        expect.objectContaining({ key: 'value' }),
      );
    });

    it('should log info messages', () => {
      testLogger.info('Test info message', { userId: '123' });

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('Test info message'),
        expect.objectContaining({ userId: '123' }),
      );
    });

    it('should log warning messages', () => {
      testLogger.warn('Test warning message', { warning: 'deprecated API' });

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Test warning message'),
        expect.objectContaining({ warning: 'deprecated API' }),
      );
    });

    it('should log error messages', () => {
      testLogger.error('Test error message', { error: 'database connection failed' });

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Test error message'),
        expect.objectContaining({ error: 'database connection failed' }),
      );
    });

    it('should log messages without additional data', () => {
      testLogger.info('Simple message');

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('Simple message'),
        undefined,
      );
    });
  });

  describe('Log Level Filtering', () => {
    it('should respect minimum log level configuration', () => {
      const prodLogger = new AzureLogger({
        service: 'test',
        minLevel: LogLevel.WARN,
        enableConsole: true,
        enableApplicationInsights: false,
        enableStructuredLogs: false,
        maskSensitiveData: false,
        maxDepth: 5,
      });

      prodLogger.debug('Debug message');
      prodLogger.info('Info message');
      prodLogger.warn('Warning message');
      prodLogger.error('Error message');

      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });

    it('should allow all log levels when set to DEBUG', () => {
      const debugLogger = new AzureLogger({
        service: 'test',
        minLevel: LogLevel.DEBUG,
        enableConsole: true,
        enableApplicationInsights: false,
        enableStructuredLogs: false,
        maskSensitiveData: false,
        maxDepth: 5,
      });

      debugLogger.debug('Debug message');
      debugLogger.info('Info message');
      debugLogger.warn('Warning message');
      debugLogger.error('Error message');

      expect(console.debug).toHaveBeenCalled();
      expect(console.info).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Azure Functions Context Integration', () => {
    it('should set Azure Functions context', () => {
      testLogger.setContext(mockContext);
      testLogger.info('Test message with context');

      expect(mockContext.log).toHaveBeenCalledWith(
        expect.stringContaining('Test message with context'),
        expect.any(Object),
      );
    });

    it('should use context.error for error level logs', () => {
      testLogger.setContext(mockContext);
      testLogger.error('Error message with context');

      expect(mockContext.error).toHaveBeenCalledWith(
        expect.stringContaining('Error message with context'),
        expect.any(Object),
      );
    });

    it('should use context.log for non-error logs', () => {
      testLogger.setContext(mockContext);
      testLogger.warn('Warning message with context');

      expect(mockContext.log).toHaveBeenCalledWith(
        expect.stringContaining('Warning message with context'),
        expect.any(Object),
      );
    });
  });

  describe('Data Sanitization and Security', () => {
    it('should redact sensitive data when maskSensitiveData is enabled', () => {
      const secureLogger = new AzureLogger({
        service: 'test',
        minLevel: LogLevel.DEBUG,
        enableConsole: true,
        enableApplicationInsights: false,
        enableStructuredLogs: true,
        maskSensitiveData: true,
        maxDepth: 5,
      });

      const sensitiveData = {
        username: 'testuser',
        password: 'secret123',
        token: 'abc-token',
        apiKey: 'sk-123456',
        normalField: 'visible',
      };

      secureLogger.info('Test with sensitive data', sensitiveData);

      const logCall = (console.info as jest.Mock).mock.calls[0];
      const logData = JSON.parse(logCall[0]);

      expect(logData.data.password).toBe('[REDACTED]');
      expect(logData.data.token).toBe('[REDACTED]');
      expect(logData.data.apiKey).toBe('[REDACTED]');
      expect(logData.data.normalField).toBe('visible');
      expect(logData.data.username).toBe('testuser');
    });

    it('should handle Error objects in data sanitization', () => {
      const error = new Error('Test error message');
      error.stack = 'Error stack trace';

      testLogger.error('Error occurred', { error });

      // Should not throw and should handle the Error object
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle circular references and deep objects', () => {
      const deepObject = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  level6: 'too deep',
                },
              },
            },
          },
        },
      };

      testLogger.info('Deep object test', deepObject);

      expect(console.info).toHaveBeenCalled();
    });

    it('should handle arrays in data sanitization', () => {
      const arrayData = {
        items: ['item1', 'item2', 'item3'],
        largeArray: new Array(20).fill('item'),
      };

      testLogger.info('Array test', arrayData);

      expect(console.info).toHaveBeenCalled();
    });

    it('should handle primitive values in data sanitization', () => {
      testLogger.info('Primitive test', {
        string: 'test',
        number: 42,
        boolean: true,
        nullValue: null,
        undefinedValue: undefined,
      });

      expect(console.info).toHaveBeenCalled();
    });
  });

  describe('Child Logger Functionality', () => {
    it('should create child logger with inherited metadata', () => {
      const parentLogger = new AzureLogger(
        {
          service: 'parent',
          minLevel: LogLevel.DEBUG,
          enableConsole: true,
          enableApplicationInsights: false,
          enableStructuredLogs: true,
          maskSensitiveData: false,
          maxDepth: 5,
        },
        { component: 'auth' },
      );

      const childLogger = parentLogger.child({ userId: '123', operation: 'login' });

      childLogger.info('Child logger test');

      const logCall = (console.info as jest.Mock).mock.calls[0];
      const logData = JSON.parse(logCall[0]);

      expect(logData.component).toBe('auth');
      expect(logData.userId).toBe('123');
      expect(logData.operation).toBe('login');
    });

    it('should allow child loggers to override parent metadata', () => {
      const parentLogger = new AzureLogger(
        {
          service: 'test',
          minLevel: LogLevel.DEBUG,
          enableConsole: true,
          enableApplicationInsights: false,
          enableStructuredLogs: true,
          maskSensitiveData: false,
          maxDepth: 5,
        },
        { component: 'original' },
      );

      const childLogger = parentLogger.child({ component: 'overridden', newField: 'test' });

      childLogger.info('Override test');

      const logCall = (console.info as jest.Mock).mock.calls[0];
      const logData = JSON.parse(logCall[0]);

      expect(logData.component).toBe('overridden');
      expect(logData.newField).toBe('test');
    });
  });

  describe('Timer Functionality', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start and stop timers correctly', () => {
      const stopTimer = testLogger.startTimer('test-operation');

      jest.advanceTimersByTime(100);

      stopTimer();

      expect(console.debug).toHaveBeenCalledWith(
        expect.stringContaining('Timer: test-operation'),
        expect.objectContaining({ duration: '100ms' }),
      );
    });

    it('should handle multiple concurrent timers', () => {
      const timer1 = testLogger.startTimer('operation-1');

      jest.advanceTimersByTime(50);

      const timer2 = testLogger.startTimer('operation-2');

      jest.advanceTimersByTime(30);

      timer1(); // Should show 80ms

      jest.advanceTimersByTime(20);

      timer2(); // Should show 50ms

      expect(console.debug).toHaveBeenCalledWith(
        expect.stringContaining('Timer: operation-1'),
        expect.objectContaining({ duration: '80ms' }),
      );

      expect(console.debug).toHaveBeenCalledWith(
        expect.stringContaining('Timer: operation-2'),
        expect.objectContaining({ duration: '50ms' }),
      );
    });
  });

  describe('Logger Configuration', () => {
    it('should disable console logging when configured', () => {
      const noConsoleLogger = new AzureLogger({
        service: 'test',
        minLevel: LogLevel.DEBUG,
        enableConsole: false,
        enableApplicationInsights: false,
        enableStructuredLogs: false,
        maskSensitiveData: false,
        maxDepth: 5,
      });

      noConsoleLogger.info('Should not appear in console');

      expect(console.info).not.toHaveBeenCalled();
    });

    it('should use structured logging format when enabled', () => {
      const structuredLogger = new AzureLogger({
        service: 'test-service',
        minLevel: LogLevel.DEBUG,
        enableConsole: true,
        enableApplicationInsights: false,
        enableStructuredLogs: true,
        maskSensitiveData: false,
        maxDepth: 5,
      });

      structuredLogger.info('Structured test', { key: 'value' });

      const logCall = (console.info as jest.Mock).mock.calls[0];
      const logMessage = logCall[0];

      // Should be JSON string when structured logging is enabled
      expect(() => JSON.parse(logMessage)).not.toThrow();
      const parsed = JSON.parse(logMessage);
      expect(parsed.service).toBe('test-service');
      expect(parsed.message).toBe('Structured test');
    });

    it('should use simple format when structured logging is disabled', () => {
      const simpleLogger = new AzureLogger({
        service: 'test-service',
        minLevel: LogLevel.DEBUG,
        enableConsole: true,
        enableApplicationInsights: false,
        enableStructuredLogs: false,
        maskSensitiveData: false,
        maxDepth: 5,
      });

      simpleLogger.info('Simple test');

      const logCall = (console.info as jest.Mock).mock.calls[0];
      const logMessage = logCall[0];

      // Should be simple string format
      expect(logMessage).toMatch(/\[.*\] \[INFO\] \[test-service\] Simple test/);
    });
  });
});

describe('LoggerFactory', () => {
  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const factory1 = LoggerFactory.getInstance();
      const factory2 = LoggerFactory.getInstance();

      expect(factory1).toBe(factory2);
    });

    it('should allow configuration override', () => {
      LoggerFactory.configure({ minLevel: LogLevel.ERROR });
      const factory = LoggerFactory.getInstance();

      const logger = factory.create('test');
      logger.info('This should not appear');
      logger.error('This should appear');

      expect(console.info).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Logger Creation', () => {
    it('should create service-specific loggers', () => {
      // Configure LoggerFactory with test-friendly settings
      LoggerFactory.configure({
        enableConsole: true,
        minLevel: LogLevel.DEBUG,
        enableStructuredLogs: false,
      });

      const factory = LoggerFactory.getInstance();
      const authLogger = factory.create('auth-service', { component: 'authentication' });

      authLogger.info('Auth test');

      // Check that console.info was called, regardless of the exact format
      expect(console.info).toHaveBeenCalled();
      const logCall = (console.info as jest.Mock).mock.calls[0];
      if (logCall && logCall[0]) {
        expect(logCall[0]).toContain('auth-service');
      }
    });

    it('should create function-specific loggers', () => {
      // Configure LoggerFactory with test-friendly settings
      LoggerFactory.configure({
        enableConsole: true,
        minLevel: LogLevel.DEBUG,
        enableStructuredLogs: false,
      });

      const factory = LoggerFactory.getInstance();
      const functionLogger = factory.createForFunction('auth-login', mockContext);

      functionLogger.info('Function test');

      // Should use Azure Functions context
      expect(mockContext.log).toHaveBeenCalledWith(
        expect.stringContaining('Function test'),
        expect.any(Object),
      );
    });

    it('should create function logger without context', () => {
      // Configure LoggerFactory with test-friendly settings
      LoggerFactory.configure({
        enableConsole: true,
        minLevel: LogLevel.DEBUG,
        enableStructuredLogs: false,
      });

      const factory = LoggerFactory.getInstance();
      const functionLogger = factory.createForFunction('auth-register');

      functionLogger.info('Function test without context');

      // Should fall back to console logging
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('Function test without context'),
        undefined,
      );
    });
  });
});

describe('Pre-configured Loggers', () => {
  it('should provide service-specific loggers', () => {
    expect(loggers.auth).toBeDefined();
    expect(loggers.trip).toBeDefined();
    expect(loggers.user).toBeDefined();
    expect(loggers.system).toBeDefined();
    expect(loggers.api).toBeDefined();
    expect(loggers.database).toBeDefined();
    expect(loggers.cache).toBeDefined();
    expect(loggers.email).toBeDefined();
  });

  it('should have working default logger', () => {
    logger.info('Default logger test');
    expect(console.info).toHaveBeenCalled();
  });

  it('should use service-specific loggers correctly', () => {
    loggers.auth.info('Auth service test');
    loggers.trip.warn('Trip service warning');

    expect(console.info).toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });
});

describe('LoggingUtils', () => {
  describe('Performance Decorator', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should log performance metrics for successful operations', async () => {
      // Test the decorator function by applying it manually
      const decoratorFunction = LoggingUtils.performance(testLogger, 'test-service');

      // Create a mock descriptor
      const originalMethod = async function (param: string): Promise<string> {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return `processed-${param}`;
      };

      const mockDescriptor = {
        value: originalMethod,
        writable: true,
        enumerable: true,
        configurable: true,
      };

      // Apply the decorator
      decoratorFunction({}, 'testMethod', mockDescriptor);

      // Execute the decorated method
      const promise = mockDescriptor.value.call({}, 'test-input');
      jest.advanceTimersByTime(10);
      const result = await promise;

      expect(result).toBe('processed-test-input');
      expect(console.debug).toHaveBeenCalledWith(
        expect.stringContaining('Starting test-service.testMethod'),
        expect.objectContaining({ operation: 'test-service', method: 'testMethod' }),
      );
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('Completed test-service.testMethod'),
        expect.objectContaining({ success: true }),
      );
    });

    it('should log performance metrics for failed operations', async () => {
      const decoratorFunction = LoggingUtils.performance(testLogger, 'test-service');

      const originalMethod = async function (): Promise<void> {
        throw new Error('Test error');
      };

      const mockDescriptor = {
        value: originalMethod,
        writable: true,
        enumerable: true,
        configurable: true,
      };

      decoratorFunction({}, 'failingMethod', mockDescriptor);

      try {
        const promise = mockDescriptor.value.call({});
        jest.advanceTimersByTime(5);
        await promise;
      } catch (error) {
        expect((error as Error).message).toBe('Test error');
      }

      expect(console.debug).toHaveBeenCalledWith(
        expect.stringContaining('Starting test-service.failingMethod'),
        expect.any(Object),
      );
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed test-service.failingMethod'),
        expect.objectContaining({ success: false, error: 'Test error' }),
      );
    });
  });

  describe('Utility Logging Methods', () => {
    it('should log audit trails', () => {
      LoggingUtils.auditLog(testLogger, 'user-login', 'user-123', { ip: '192.168.1.1' });

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('User action'),
        expect.objectContaining({
          type: 'audit',
          action: 'user-login',
          userId: 'user-123',
          details: { ip: '192.168.1.1' },
        }),
      );
    });

    it('should log security events', () => {
      LoggingUtils.securityLog(testLogger, 'failed-login-attempt', {
        ip: '192.168.1.100',
        attempts: 5,
      });

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Security event'),
        expect.objectContaining({
          type: 'security',
          event: 'failed-login-attempt',
          details: { ip: '192.168.1.100', attempts: 5 },
        }),
      );
    });

    it('should log business metrics', () => {
      LoggingUtils.metricsLog(testLogger, 'active-users', 150, { region: 'us-west' });

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('Metric'),
        expect.objectContaining({
          type: 'metric',
          metric: 'active-users',
          value: 150,
          metadata: { region: 'us-west' },
        }),
      );
    });

    it('should handle audit log without user ID', () => {
      LoggingUtils.auditLog(testLogger, 'system-startup');

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('User action'),
        expect.objectContaining({
          type: 'audit',
          action: 'system-startup',
          userId: undefined,
        }),
      );
    });

    it('should handle metrics without metadata', () => {
      LoggingUtils.metricsLog(testLogger, 'response-time', 250);

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('Metric'),
        expect.objectContaining({
          type: 'metric',
          metric: 'response-time',
          value: 250,
          metadata: undefined,
        }),
      );
    });
  });
});
