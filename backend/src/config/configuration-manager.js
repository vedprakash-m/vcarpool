'use strict';
/**
 * Configuration Management System
 * Centralized configuration with environment-specific settings, validation, and hot-reloading
 */
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== 'default') __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, '__esModule', { value: true });
exports.configManager = void 0;
const zod_1 = require('zod');
const logger_1 = require('../utils/logger');
const fs = __importStar(require('fs'));
const fsPromises = __importStar(require('fs/promises'));
const path = __importStar(require('path'));
// Configuration Schemas
const DatabaseConfigSchema = zod_1.z.object({
  connectionString: zod_1.z.string().min(1, 'Database connection string is required'),
  databaseName: zod_1.z.string().default('carpool'),
  maxRetries: zod_1.z.number().min(0).default(3),
  retryDelay: zod_1.z.number().min(0).default(1000),
  connectionPoolSize: zod_1.z.number().min(1).default(10),
  requestTimeout: zod_1.z.number().min(1000).default(30000),
});
const AuthConfigSchema = zod_1.z.object({
  jwtSecret: zod_1.z.string().min(32, 'JWT secret must be at least 32 characters'),
  jwtExpiresIn: zod_1.z.string().default('24h'),
  refreshTokenExpiresIn: zod_1.z.string().default('7d'),
  bcryptRounds: zod_1.z.number().min(10).max(15).default(12),
  maxLoginAttempts: zod_1.z.number().min(1).default(5),
  lockoutDuration: zod_1.z.number().min(60000).default(900000), // 15 minutes
});
const EmailConfigSchema = zod_1.z.object({
  provider: zod_1.z.enum(['sendgrid', 'smtp']).default('sendgrid'),
  apiKey: zod_1.z.string().optional(),
  smtpHost: zod_1.z.string().optional(),
  smtpPort: zod_1.z.number().optional(),
  smtpUser: zod_1.z.string().optional(),
  smtpPassword: zod_1.z.string().optional(),
  fromEmail: zod_1.z.string().email(),
  fromName: zod_1.z.string().default('Carpool'),
});
const CacheConfigSchema = zod_1.z.object({
  provider: zod_1.z.enum(['memory']).default('memory'),
  defaultTtl: zod_1.z.number().min(1000).default(300000), // 5 minutes
  maxSize: zod_1.z.number().min(100).default(1000),
  checkPeriod: zod_1.z.number().min(1000).default(60000), // 1 minute
});
const RateLimitConfigSchema = zod_1.z.object({
  windowMs: zod_1.z.number().min(1000).default(900000), // 15 minutes
  maxRequests: zod_1.z.number().min(1).default(100),
  skipSuccessfulRequests: zod_1.z.boolean().default(false),
  skipFailedRequests: zod_1.z.boolean().default(false),
  standardHeaders: zod_1.z.boolean().default(true),
  legacyHeaders: zod_1.z.boolean().default(false),
});
const MonitoringConfigSchema = zod_1.z.object({
  applicationInsightsKey: zod_1.z.string().optional(),
  enableMetrics: zod_1.z.boolean().default(true),
  enableTracing: zod_1.z.boolean().default(true),
  enableHealthChecks: zod_1.z.boolean().default(true),
  metricsInterval: zod_1.z.number().min(1000).default(60000), // 1 minute
  alertingEnabled: zod_1.z.boolean().default(true),
  alertWebhookUrl: zod_1.z.string().url().optional(),
});
const SecurityConfigSchema = zod_1.z.object({
  enableSanitization: zod_1.z.boolean().default(true),
  enableSecurityHeaders: zod_1.z.boolean().default(true),
  corsOrigins: zod_1.z.array(zod_1.z.string()).default(['http://localhost:3000']),
  enableThreatDetection: zod_1.z.boolean().default(true),
  maxUploadSize: zod_1.z.number().min(1024).default(10485760), // 10MB
  allowedFileTypes: zod_1.z
    .array(zod_1.z.string())
    .default(['image/jpeg', 'image/png', 'application/pdf']),
});
const AppConfigSchema = zod_1.z.object({
  environment: zod_1.z.enum(['development', 'staging', 'production']).default('development'),
  port: zod_1.z.number().min(1).max(65535).default(7071),
  logLevel: zod_1.z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  enableDebug: zod_1.z.boolean().default(false),
  timezone: zod_1.z.string().default('UTC'),
  database: DatabaseConfigSchema,
  auth: AuthConfigSchema,
  email: EmailConfigSchema,
  cache: CacheConfigSchema,
  rateLimit: RateLimitConfigSchema,
  monitoring: MonitoringConfigSchema,
  security: SecurityConfigSchema,
});
class ConfigurationManager {
  config;
  sources = [];
  watchers = new Map();
  listeners = [];
  constructor() {
    this.config = this.getDefaultConfig();
    this.initializeSources();
  }
  /**
   * Initialize configuration from all sources
   */
  async initialize() {
    logger_1.logger.info('Initializing configuration');
    try {
      // Load configuration from all sources in priority order
      const configData = {};
      for (const source of this.sources.sort((a, b) => a.priority - b.priority)) {
        try {
          const sourceConfig = await source.load();
          Object.assign(configData, sourceConfig);
          logger_1.logger.debug(`Loaded configuration from ${source.name}`);
        } catch (error) {
          logger_1.logger.warn(`Failed to load configuration from ${source.name}`, { error });
        }
      }
      // Validate and merge configuration
      this.config = AppConfigSchema.parse({
        ...this.getDefaultConfig(),
        ...configData,
      });
      // Start watching for configuration changes
      await this.startWatching();
      logger_1.logger.info('Configuration initialized successfully', {
        environment: this.config.environment,
        sources: this.sources.map((s) => s.name),
      });
    } catch (error) {
      logger_1.logger.error('Failed to initialize configuration', { error });
      throw new Error('Configuration initialization failed');
    }
  }
  /**
   * Get the current configuration
   */
  getConfig() {
    return { ...this.config };
  }
  /**
   * Get a specific configuration section
   */
  getSection(section) {
    return this.config[section];
  }
  /**
   * Update configuration at runtime
   */
  async updateConfig(updates) {
    try {
      const newConfig = AppConfigSchema.parse({
        ...this.config,
        ...updates,
      });
      const oldConfig = this.config;
      this.config = newConfig;
      // Notify listeners of configuration change
      this.notifyListeners(newConfig);
      logger_1.logger.info('Configuration updated', {
        updatedKeys: Object.keys(updates),
        environment: this.config.environment,
      });
    } catch (error) {
      logger_1.logger.error('Failed to update configuration', { error, updates });
      throw new Error('Configuration update failed');
    }
  }
  /**
   * Validate configuration
   */
  validateConfig(config) {
    try {
      AppConfigSchema.parse(config || this.config);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof zod_1.z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
        };
      }
      return { valid: false, errors: ['Unknown validation error'] };
    }
  }
  /**
   * Add a configuration change listener
   */
  onChange(listener) {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  /**
   * Reload configuration from all sources
   */
  async reload() {
    logger_1.logger.info('Reloading configuration');
    await this.initialize();
  }
  /**
   * Get configuration schema for documentation
   */
  getSchema() {
    return AppConfigSchema;
  }
  /**
   * Export configuration to file
   */
  async exportConfig(filePath, format = 'json') {
    try {
      const configData = this.sanitizeForExport(this.config);
      if (format === 'json') {
        await fsPromises.writeFile(filePath, JSON.stringify(configData, null, 2));
      } else {
        // For YAML export, you would use a YAML library
        throw new Error('YAML export not implemented');
      }
      logger_1.logger.info('Configuration exported', { filePath, format });
    } catch (error) {
      logger_1.logger.error('Failed to export configuration', { error, filePath });
      throw error;
    }
  }
  getDefaultConfig() {
    return {
      environment: 'development',
      port: 7071,
      logLevel: 'info',
      enableDebug: false,
      timezone: 'UTC',
      database: {
        connectionString: '',
        databaseName: 'carpool',
        maxRetries: 3,
        retryDelay: 1000,
        connectionPoolSize: 10,
        requestTimeout: 30000,
      },
      auth: {
        jwtSecret: '',
        jwtExpiresIn: '24h',
        refreshTokenExpiresIn: '7d',
        bcryptRounds: 12,
        maxLoginAttempts: 5,
        lockoutDuration: 900000,
      },
      email: {
        provider: 'sendgrid',
        fromEmail: 'noreply@carpool.com',
        fromName: 'Carpool',
      },
      cache: {
        provider: 'memory',
        defaultTtl: 300000,
        maxSize: 1000,
        checkPeriod: 60000,
      },
      rateLimit: {
        windowMs: 900000,
        maxRequests: 100,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
        standardHeaders: true,
        legacyHeaders: false,
      },
      monitoring: {
        enableMetrics: true,
        enableTracing: true,
        enableHealthChecks: true,
        metricsInterval: 60000,
        alertingEnabled: true,
      },
      security: {
        enableSanitization: true,
        enableSecurityHeaders: true,
        corsOrigins: ['http://localhost:3000'],
        enableThreatDetection: true,
        maxUploadSize: 10485760,
        allowedFileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
      },
    };
  }
  initializeSources() {
    // Environment variables source (highest priority)
    this.sources.push({
      name: 'environment',
      priority: 100,
      load: async () => this.loadFromEnvironment(),
    });
    // Configuration file source
    this.sources.push({
      name: 'file',
      priority: 50,
      load: async () => this.loadFromFile(),
    });
    // Azure Key Vault source (if available)
    this.sources.push({
      name: 'keyvault',
      priority: 75,
      load: async () => this.loadFromKeyVault(),
    });
  }
  async loadFromEnvironment() {
    const env = process.env;
    return {
      environment: env.NODE_ENV || 'development',
      port: env.PORT ? parseInt(env.PORT) : undefined,
      logLevel: env.LOG_LEVEL,
      enableDebug: env.ENABLE_DEBUG === 'true',
      timezone: env.TIMEZONE,
      database: {
        connectionString: env.COSMOS_DB_CONNECTION_STRING || '',
        databaseName: env.COSMOS_DB_NAME || 'carpool',
        maxRetries: env.DB_MAX_RETRIES ? parseInt(env.DB_MAX_RETRIES) : 3,
        retryDelay: env.DB_RETRY_DELAY ? parseInt(env.DB_RETRY_DELAY) : 1000,
        connectionPoolSize: env.DB_POOL_SIZE ? parseInt(env.DB_POOL_SIZE) : 10,
        requestTimeout: env.DB_TIMEOUT ? parseInt(env.DB_TIMEOUT) : 30000,
      },
      auth: {
        jwtSecret: env.JWT_SECRET || 'default-jwt-secret-change-in-production',
        jwtExpiresIn: env.JWT_EXPIRES_IN || '24h',
        refreshTokenExpiresIn: env.REFRESH_TOKEN_EXPIRES_IN || '7d',
        bcryptRounds: env.BCRYPT_ROUNDS ? parseInt(env.BCRYPT_ROUNDS) : 12,
        maxLoginAttempts: env.MAX_LOGIN_ATTEMPTS ? parseInt(env.MAX_LOGIN_ATTEMPTS) : 5,
        lockoutDuration: env.LOCKOUT_DURATION ? parseInt(env.LOCKOUT_DURATION) : 300000,
      },
      email: {
        provider: env.EMAIL_PROVIDER,
        apiKey: env.EMAIL_API_KEY,
        smtpHost: env.SMTP_HOST,
        smtpPort: env.SMTP_PORT ? parseInt(env.SMTP_PORT) : undefined,
        smtpUser: env.SMTP_USER,
        smtpPassword: env.SMTP_PASSWORD,
        fromEmail: env.FROM_EMAIL || 'noreply@carpool.com',
        fromName: env.FROM_NAME || 'Carpool',
      },
      cache: {
        provider: env.CACHE_PROVIDER || 'memory',
        defaultTtl: env.CACHE_TTL ? parseInt(env.CACHE_TTL) : 3600,
        maxSize: env.CACHE_MAX_SIZE ? parseInt(env.CACHE_MAX_SIZE) : 1000,
        checkPeriod: env.CACHE_CHECK_PERIOD ? parseInt(env.CACHE_CHECK_PERIOD) : 600,
      },
      monitoring: {
        applicationInsightsKey: env.APPINSIGHTS_INSTRUMENTATIONKEY,
        enableMetrics: env.ENABLE_METRICS === 'true',
        enableTracing: env.ENABLE_TRACING === 'true',
        enableHealthChecks: env.ENABLE_HEALTH_CHECKS !== 'false',
        metricsInterval: env.METRICS_INTERVAL ? parseInt(env.METRICS_INTERVAL) : 60000,
        alertingEnabled: env.ALERTING_ENABLED !== 'false',
        alertWebhookUrl: env.ALERT_WEBHOOK_URL,
      },
      security: {
        enableSanitization: env.ENABLE_SANITIZATION !== 'false',
        enableSecurityHeaders: env.ENABLE_SECURITY_HEADERS !== 'false',
        corsOrigins: env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',') : ['http://localhost:3000'],
        enableThreatDetection: env.ENABLE_THREAT_DETECTION !== 'false',
        maxUploadSize: env.MAX_UPLOAD_SIZE ? parseInt(env.MAX_UPLOAD_SIZE) : 10485760,
        allowedFileTypes: env.ALLOWED_FILE_TYPES
          ? env.ALLOWED_FILE_TYPES.split(',')
          : ['jpg', 'jpeg', 'png', 'pdf'],
      },
    };
  }
  async loadFromFile() {
    const configPaths = ['config/config.json', 'config.json', '.carpool.json'];
    for (const configPath of configPaths) {
      try {
        const fullPath = path.resolve(configPath);
        const configFile = await fsPromises.readFile(fullPath, 'utf-8');
        const config = JSON.parse(configFile);
        logger_1.logger.debug(`Loaded configuration from file: ${configPath}`);
        return config;
      } catch (error) {
        // File doesn't exist or invalid JSON, continue to next
        continue;
      }
    }
    return {};
  }
  async loadFromKeyVault() {
    // In a real implementation, you would use Azure Key Vault SDK
    // This is a placeholder for demonstration
    try {
      if (process.env.KEY_VAULT_URL) {
        // Load secrets from Azure Key Vault
        logger_1.logger.debug('Loading configuration from Azure Key Vault');
        return {};
      }
    } catch (error) {
      logger_1.logger.warn('Failed to load from Key Vault', { error });
    }
    return {};
  }
  async startWatching() {
    // Watch configuration files for changes
    const configPaths = ['config/config.json', 'config.json'];
    for (const configPath of configPaths) {
      try {
        const fullPath = path.resolve(configPath);
        const watcher = fs.watchFile(fullPath, async () => {
          logger_1.logger.info(`Configuration file changed: ${configPath}`);
          await this.reload();
        });
        this.watchers.set(configPath, watcher);
      } catch (error) {
        // Ignore if file doesn't exist
      }
    }
  }
  notifyListeners(config) {
    for (const listener of this.listeners) {
      try {
        listener(config);
      } catch (error) {
        logger_1.logger.warn('Configuration listener error', { error });
      }
    }
  }
  sanitizeForExport(config) {
    const sanitized = { ...config };
    // Remove sensitive information
    if (sanitized.auth?.jwtSecret) {
      sanitized.auth.jwtSecret = '***REDACTED***';
    }
    if (sanitized.email?.apiKey) {
      sanitized.email.apiKey = '***REDACTED***';
    }
    if (sanitized.email?.smtpPassword) {
      sanitized.email.smtpPassword = '***REDACTED***';
    }
    if (sanitized.database?.connectionString) {
      sanitized.database.connectionString = '***REDACTED***';
    }
    return sanitized;
  }
}
// Singleton instance
exports.configManager = new ConfigurationManager();
