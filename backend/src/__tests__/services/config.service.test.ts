/**
 * Config Service Tests
 *
 * Comprehensive test suite for ConfigService to improve backend test coverage.
 * Tests configuration loading, validation, environment handling, and service methods.
 */

import configService from '../../services/config.service';

// Store original environment variables to restore after tests
const originalEnv = process.env;

// Access the ConfigService class through reflection since it's not exported
const ConfigService = Object.getPrototypeOf(configService).constructor;

describe('ConfigService', () => {
  let configInstance: any;

  beforeEach(() => {
    // Reset the singleton instance for each test
    if (ConfigService.resetInstance) {
      ConfigService.resetInstance();
    } else {
      (ConfigService as any).instance = undefined;
    }

    // Reset environment variables to defaults
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      COSMOS_DB_ENDPOINT: '',
      COSMOS_DB_KEY: '',
      COSMOS_DB_DATABASE: 'carpooldb',
      COSMOS_DB_CONTAINER: 'users',
      JWT_SECRET: 'carpool-dev-secret-key',
      JWT_EXPIRES_IN: '24h',
      BCRYPT_ROUNDS: '12',
      MAX_LOGIN_ATTEMPTS: '5',
      LOCKOUT_DURATION: '15',
      GEOCODING_PROVIDER: 'mock',
      FALLBACK_TO_MOCK: 'true',
      CORS_ORIGINS: 'http://localhost:3000',
      MAX_DISTANCE_KM: '50',
      DEFAULT_SERVICE_RADIUS: '25',
    };
  });

  afterEach(() => {
    // Reset the singleton instance after each test
    if (ConfigService.resetInstance) {
      ConfigService.resetInstance();
    } else {
      (ConfigService as any).instance = undefined;
    }

    // Restore original environment
    process.env = originalEnv;
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = ConfigService.getInstance();
      const instance2 = ConfigService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = ConfigService.getInstance();

      // Reset singleton
      (ConfigService as any).instance = undefined;

      const instance2 = ConfigService.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Configuration Loading', () => {
    it('should load default configuration values', () => {
      configInstance = ConfigService.getInstance();
      const config = configInstance.getConfig();

      expect(config.cosmosDb.databaseName).toBe('carpooldb');
      expect(config.cosmosDb.containerName).toBe('users');
      expect(config.auth.jwtSecret).toBe('carpool-dev-secret-key');
      expect(config.auth.jwtExpiresIn).toBe('24h');
      expect(config.auth.bcryptRounds).toBe(12);
      expect(config.auth.maxLoginAttempts).toBe(5);
      expect(config.auth.lockoutDuration).toBe(15);
      expect(config.geocoding.preferredProvider).toBe('mock');
      expect(config.geocoding.fallbackToMock).toBe(true);
      expect(config.app.environment).toBe('development');
      expect(config.app.corsOrigins).toEqual(['http://localhost:3000']);
      expect(config.app.maxDistanceKm).toBe(50);
      expect(config.app.defaultServiceRadius).toBe(25);
    });

    it('should load custom environment variables', () => {
      process.env.COSMOS_DB_ENDPOINT = 'https://test.cosmosdb.azure.com/';
      process.env.COSMOS_DB_KEY = 'test-key';
      process.env.COSMOS_DB_DATABASE = 'testdb';
      process.env.COSMOS_DB_CONTAINER = 'testcontainer';
      process.env.JWT_SECRET = 'custom-secret';
      process.env.JWT_EXPIRES_IN = '1h';
      process.env.BCRYPT_ROUNDS = '10';
      process.env.MAX_LOGIN_ATTEMPTS = '3';
      process.env.LOCKOUT_DURATION = '30';
      process.env.GOOGLE_MAPS_API_KEY = 'google-key';
      process.env.AZURE_MAPS_KEY = 'azure-key';
      process.env.GEOCODING_PROVIDER = 'google';
      process.env.FALLBACK_TO_MOCK = 'false';
      process.env.NODE_ENV = 'production';
      process.env.CORS_ORIGINS = 'http://localhost:3000,https://example.com';
      process.env.MAX_DISTANCE_KM = '100';
      process.env.DEFAULT_SERVICE_RADIUS = '50';

      configInstance = ConfigService.getInstance();
      const config = configInstance.getConfig();

      expect(config.cosmosDb.endpoint).toBe('https://test.cosmosdb.azure.com/');
      expect(config.cosmosDb.key).toBe('test-key');
      expect(config.cosmosDb.databaseName).toBe('testdb');
      expect(config.cosmosDb.containerName).toBe('testcontainer');
      expect(config.auth.jwtSecret).toBe('custom-secret');
      expect(config.auth.jwtExpiresIn).toBe('1h');
      expect(config.auth.bcryptRounds).toBe(10);
      expect(config.auth.maxLoginAttempts).toBe(3);
      expect(config.auth.lockoutDuration).toBe(30);
      expect(config.geocoding.googleMapsApiKey).toBe('google-key');
      expect(config.geocoding.azureMapsKey).toBe('azure-key');
      expect(config.geocoding.preferredProvider).toBe('google');
      expect(config.geocoding.fallbackToMock).toBe(false);
      expect(config.app.environment).toBe('production');
      expect(config.app.corsOrigins).toEqual(['http://localhost:3000', 'https://example.com']);
      expect(config.app.maxDistanceKm).toBe(100);
      expect(config.app.defaultServiceRadius).toBe(50);
    });

    it('should handle missing CORS_ORIGINS environment variable', () => {
      delete process.env.CORS_ORIGINS;

      configInstance = ConfigService.getInstance();
      const config = configInstance.getConfig();

      expect(config.app.corsOrigins).toEqual(['http://localhost:3000']);
    });

    it('should handle invalid numeric environment variables', () => {
      process.env.BCRYPT_ROUNDS = 'invalid';
      process.env.MAX_LOGIN_ATTEMPTS = 'not-a-number';
      process.env.LOCKOUT_DURATION = 'abc';
      process.env.MAX_DISTANCE_KM = 'abc';
      process.env.DEFAULT_SERVICE_RADIUS = 'xyz';

      configInstance = ConfigService.getInstance();
      const config = configInstance.getConfig();

      expect(config.auth.bcryptRounds).toBeNaN();
      expect(config.auth.maxLoginAttempts).toBeNaN();
      expect(config.auth.lockoutDuration).toBeNaN();
      expect(config.app.maxDistanceKm).toBeNaN();
      expect(config.app.defaultServiceRadius).toBeNaN();
    });
  });

  describe('Configuration Validation', () => {
    it('should pass validation in development environment', () => {
      process.env.NODE_ENV = 'development';

      expect(() => {
        configInstance = ConfigService.getInstance();
      }).not.toThrow();
    });

    it('should pass validation in production with all required configs', () => {
      process.env.NODE_ENV = 'production';
      process.env.COSMOS_DB_ENDPOINT = 'https://test.cosmosdb.azure.com/';
      process.env.COSMOS_DB_KEY = 'test-key';
      process.env.JWT_SECRET = 'custom-production-secret';
      process.env.GOOGLE_MAPS_API_KEY = 'google-key';

      expect(() => {
        configInstance = ConfigService.getInstance();
      }).not.toThrow();
    });

    it('should fail validation in production without Cosmos DB config', () => {
      process.env.NODE_ENV = 'production';
      process.env.COSMOS_DB_ENDPOINT = '';
      process.env.COSMOS_DB_KEY = '';
      process.env.JWT_SECRET = 'custom-production-secret';

      expect(() => {
        configInstance = ConfigService.getInstance();
      }).toThrow(
        'Configuration validation failed: Cosmos DB configuration is required in production',
      );
    });

    it('should fail validation in production with default JWT secret', () => {
      process.env.NODE_ENV = 'production';
      process.env.COSMOS_DB_ENDPOINT = 'https://test.cosmosdb.azure.com/';
      process.env.COSMOS_DB_KEY = 'test-key';
      process.env.JWT_SECRET = 'carpool-dev-secret-key';

      expect(() => {
        configInstance = ConfigService.getInstance();
      }).toThrow('Configuration validation failed: Custom JWT secret is required in production');
    });

    it('should fail validation in production with multiple errors', () => {
      process.env.NODE_ENV = 'production';
      process.env.COSMOS_DB_ENDPOINT = '';
      process.env.COSMOS_DB_KEY = '';
      process.env.JWT_SECRET = 'carpool-dev-secret-key';

      expect(() => {
        configInstance = ConfigService.getInstance();
      }).toThrow(
        'Configuration validation failed: Cosmos DB configuration is required in production, Custom JWT secret is required in production',
      );
    });

    it('should warn about missing geocoding keys in production but not fail', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      process.env.NODE_ENV = 'production';
      process.env.COSMOS_DB_ENDPOINT = 'https://test.cosmosdb.azure.com/';
      process.env.COSMOS_DB_KEY = 'test-key';
      process.env.JWT_SECRET = 'custom-production-secret';
      delete process.env.GOOGLE_MAPS_API_KEY;

      expect(() => {
        configInstance = ConfigService.getInstance();
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Warning: No real geocoding API keys configured in production',
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Configuration Access Methods', () => {
    beforeEach(() => {
      configInstance = ConfigService.getInstance();
    });

    it('should return immutable config copy', () => {
      const config1 = configInstance.getConfig();
      const config2 = configInstance.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different objects

      // Mutating top-level properties should not affect service
      config1.cosmosDb = { ...config1.cosmosDb, databaseName: 'modified' };
      expect(configInstance.getConfig().cosmosDb.databaseName).toBe('carpooldb');

      // Note: Nested objects are shallow copied, so mutations would affect the original
      // This is a limitation of the current implementation
    });

    it('should correctly identify development environment', () => {
      process.env.NODE_ENV = 'development';
      configInstance = ConfigService.getInstance();

      expect(configInstance.isDevelopment()).toBe(true);
      expect(configInstance.isProduction()).toBe(false);
    });

    it('should correctly identify production environment', () => {
      // Reset singleton and set env before creating instance
      (ConfigService as any).instance = undefined;
      process.env.NODE_ENV = 'production';
      process.env.COSMOS_DB_ENDPOINT = 'https://test.cosmosdb.azure.com/';
      process.env.COSMOS_DB_KEY = 'test-key';
      process.env.JWT_SECRET = 'custom-production-secret';

      configInstance = ConfigService.getInstance();

      expect(configInstance.isDevelopment()).toBe(false);
      expect(configInstance.isProduction()).toBe(true);
    });

    it('should correctly identify staging environment', () => {
      // Reset singleton and set env before creating instance
      (ConfigService as any).instance = undefined;
      process.env.NODE_ENV = 'staging';
      configInstance = ConfigService.getInstance();

      expect(configInstance.isDevelopment()).toBe(false);
      expect(configInstance.isProduction()).toBe(false);
    });

    it('should detect real geocoding availability with Google Maps key', () => {
      // Reset singleton and set env before creating instance
      (ConfigService as any).instance = undefined;
      process.env.GOOGLE_MAPS_API_KEY = 'google-key';

      configInstance = ConfigService.getInstance();

      expect(configInstance.hasRealGeocoding()).toBe(true);
    });

    it('should detect real geocoding availability with Azure Maps key', () => {
      // Reset singleton and set env before creating instance
      (ConfigService as any).instance = undefined;
      delete process.env.GOOGLE_MAPS_API_KEY;
      process.env.AZURE_MAPS_KEY = 'azure-key';

      configInstance = ConfigService.getInstance();

      expect(configInstance.hasRealGeocoding()).toBe(true);
    });

    it('should detect real geocoding availability with both keys', () => {
      // Reset singleton and set env before creating instance
      (ConfigService as any).instance = undefined;
      process.env.GOOGLE_MAPS_API_KEY = 'google-key';

      configInstance = ConfigService.getInstance();

      expect(configInstance.hasRealGeocoding()).toBe(true);
    });

    it('should detect no real geocoding when no keys provided', () => {
      delete process.env.GOOGLE_MAPS_API_KEY;

      configInstance = ConfigService.getInstance();

      expect(configInstance.hasRealGeocoding()).toBe(false);
    });

    it('should detect real database availability', () => {
      // Reset singleton and set env before creating instance
      (ConfigService as any).instance = undefined;
      process.env.COSMOS_DB_ENDPOINT = 'https://test.cosmosdb.azure.com/';
      process.env.COSMOS_DB_KEY = 'test-key';

      configInstance = ConfigService.getInstance();

      expect(configInstance.shouldUseRealDatabase()).toBe(true);
    });

    it('should detect no real database when endpoint missing', () => {
      process.env.COSMOS_DB_ENDPOINT = '';
      process.env.COSMOS_DB_KEY = 'test-key';

      configInstance = ConfigService.getInstance();

      expect(configInstance.shouldUseRealDatabase()).toBe(false);
    });

    it('should detect no real database when key missing', () => {
      process.env.COSMOS_DB_ENDPOINT = 'https://test.cosmosdb.azure.com/';
      process.env.COSMOS_DB_KEY = '';

      configInstance = ConfigService.getInstance();

      expect(configInstance.shouldUseRealDatabase()).toBe(false);
    });

    it('should detect no real database when both missing', () => {
      process.env.COSMOS_DB_ENDPOINT = '';
      process.env.COSMOS_DB_KEY = '';

      configInstance = ConfigService.getInstance();

      expect(configInstance.shouldUseRealDatabase()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty CORS_ORIGINS string', () => {
      process.env.CORS_ORIGINS = '';

      configInstance = ConfigService.getInstance();
      const config = configInstance.getConfig();

      expect(config.app.corsOrigins).toEqual(['']);
    });

    it('should handle single CORS origin', () => {
      process.env.CORS_ORIGINS = 'https://example.com';

      configInstance = ConfigService.getInstance();
      const config = configInstance.getConfig();

      expect(config.app.corsOrigins).toEqual(['https://example.com']);
    });

    it('should handle multiple CORS origins with spaces', () => {
      process.env.CORS_ORIGINS = 'http://localhost:3000, https://example.com ,https://test.com';

      configInstance = ConfigService.getInstance();
      const config = configInstance.getConfig();

      expect(config.app.corsOrigins).toEqual([
        'http://localhost:3000',
        ' https://example.com ',
        'https://test.com',
      ]);
    });

    it('should handle FALLBACK_TO_MOCK variations', () => {
      // Test 'true'
      process.env.FALLBACK_TO_MOCK = 'true';
      configInstance = ConfigService.getInstance();
      expect(configInstance.getConfig().geocoding.fallbackToMock).toBe(true);

      // Reset and test 'false'
      (ConfigService as any).instance = undefined;
      process.env.FALLBACK_TO_MOCK = 'false';
      configInstance = ConfigService.getInstance();
      expect(configInstance.getConfig().geocoding.fallbackToMock).toBe(false);

      // Reset and test other values (should be falsy)
      (ConfigService as any).instance = undefined;
      process.env.FALLBACK_TO_MOCK = 'yes';
      configInstance = ConfigService.getInstance();
      expect(configInstance.getConfig().geocoding.fallbackToMock).toBe(false);
    });
  });
});
