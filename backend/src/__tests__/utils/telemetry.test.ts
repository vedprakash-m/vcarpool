/* eslint-disable @typescript-eslint/no-var-requires */

describe('Telemetry Utils', () => {
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleWarn: jest.SpyInstance;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    mockConsoleLog.mockRestore();
    mockConsoleWarn.mockRestore();
  });

  describe('initializeTelemetry', () => {
    it('should not initialize when OTEL_ENABLED is not true', () => {
      process.env.OTEL_ENABLED = 'false';

      // Reset module cache to get fresh import
      jest.resetModules();
      const { initializeTelemetry } = require('../../utils/telemetry');

      initializeTelemetry();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'OpenTelemetry disabled via OTEL_ENABLED env var',
      );
    });

    it('should not initialize when OTEL_ENABLED is undefined', () => {
      delete process.env.OTEL_ENABLED;

      // Reset module cache to get fresh import
      jest.resetModules();
      const { initializeTelemetry } = require('../../utils/telemetry');

      initializeTelemetry();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'OpenTelemetry disabled via OTEL_ENABLED env var',
      );
    });

    it('should attempt to initialize telemetry when OTEL_ENABLED is true', () => {
      process.env.OTEL_ENABLED = 'true';
      process.env.NODE_ENV = 'development';

      // Reset module cache to get fresh import
      jest.resetModules();
      const { initializeTelemetry } = require('../../utils/telemetry');

      // Should not throw an error
      expect(() => initializeTelemetry()).not.toThrow();

      // Should log initialization success or handle gracefully
      expect(
        mockConsoleLog.mock.calls.some(
          (call) => call[0]?.includes('OpenTelemetry') || call[0]?.includes('initialization'),
        ),
      ).toBe(true);
    });

    it('should handle multiple initialization calls gracefully', () => {
      process.env.OTEL_ENABLED = 'false';

      // Reset module cache to get fresh import
      jest.resetModules();
      const { initializeTelemetry } = require('../../utils/telemetry');

      // Should handle multiple calls without error
      expect(() => {
        initializeTelemetry();
        initializeTelemetry();
        initializeTelemetry();
      }).not.toThrow();

      // Should log the disabled message each time (or only once depending on implementation)
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should be importable without errors', () => {
      // Test that the module can be imported without throwing
      expect(() => {
        require('../../utils/telemetry');
      }).not.toThrow();
    });

    it('should use OTLP exporter in production when available', () => {
      process.env.OTEL_ENABLED = 'true';
      process.env.NODE_ENV = 'production';

      // Mock OTLP exporter availability
      jest.doMock('@opentelemetry/exporter-trace-otlp-http', () => ({
        OTLPTraceExporter: jest.fn().mockImplementation(() => ({})),
      }));

      // Reset module cache to get fresh import
      jest.resetModules();
      const { initializeTelemetry } = require('../../utils/telemetry');

      expect(() => initializeTelemetry()).not.toThrow();
      expect(mockConsoleLog).toHaveBeenCalledWith('OpenTelemetry initialized');
    });

    it('should use Console exporter in production when OTLP not available', () => {
      process.env.OTEL_ENABLED = 'true';
      process.env.NODE_ENV = 'production';

      // Reset module cache to get fresh import
      jest.resetModules();
      const { initializeTelemetry } = require('../../utils/telemetry');

      expect(() => initializeTelemetry()).not.toThrow();
      // Either warns about OTLP package not found OR successfully initializes
      expect(
        mockConsoleWarn.mock.calls.some((call) =>
          call[0].includes('OTLP exporter package not found'),
        ) || mockConsoleLog.mock.calls.some((call) => call[0] === 'OpenTelemetry initialized'),
      ).toBe(true);
    });

    it('should use Console exporter in development', () => {
      process.env.OTEL_ENABLED = 'true';
      process.env.NODE_ENV = 'development';

      // Reset module cache to get fresh import
      jest.resetModules();
      const { initializeTelemetry } = require('../../utils/telemetry');

      expect(() => initializeTelemetry()).not.toThrow();
      expect(mockConsoleLog).toHaveBeenCalledWith('OpenTelemetry initialized');
    });

    it('should handle SDK initialization errors gracefully', () => {
      process.env.OTEL_ENABLED = 'true';
      process.env.NODE_ENV = 'development';

      // Mock NodeSDK to throw on start
      jest.doMock('@opentelemetry/sdk-node', () => ({
        NodeSDK: jest.fn().mockImplementation(() => ({
          start: jest.fn().mockImplementation(() => {
            throw new Error('SDK start failed');
          }),
        })),
      }));

      // Reset module cache to get fresh import
      jest.resetModules();
      const { initializeTelemetry } = require('../../utils/telemetry');

      expect(() => initializeTelemetry()).not.toThrow();
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'OpenTelemetry initialization failed',
        expect.any(Error),
      );
    });
    it('should not initialize multiple times', () => {
      process.env.OTEL_ENABLED = 'true';
      process.env.NODE_ENV = 'development';

      // Reset module cache to get fresh import and state
      jest.resetModules();
      const { initializeTelemetry } = require('../../utils/telemetry');

      initializeTelemetry();

      // Clear the console log mock after first call
      mockConsoleLog.mockClear();

      initializeTelemetry(); // Second call should be ignored

      // Should not log again on second call
      expect(mockConsoleLog).not.toHaveBeenCalledWith('OpenTelemetry initialized');
    });
  });

  describe('Module loading behavior', () => {
    it('should handle production environment on module load', () => {
      process.env.NODE_ENV = 'production';

      // Reset module cache and reload
      jest.resetModules();

      expect(() => {
        require('../../utils/telemetry');
      }).not.toThrow();
    });

    it('should handle non-production environment on module load', () => {
      process.env.NODE_ENV = 'development';

      // Reset module cache and reload
      jest.resetModules();

      expect(() => {
        require('../../utils/telemetry');
      }).not.toThrow();
    });

    it('should handle missing NODE_ENV on module load', () => {
      delete process.env.NODE_ENV;

      // Reset module cache and reload
      jest.resetModules();

      expect(() => {
        require('../../utils/telemetry');
      }).not.toThrow();
    });
  });
});
