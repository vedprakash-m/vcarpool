/**
 * Configuration Management System
 * Centralized configuration with environment-specific settings, validation, and hot-reloading
 */

import { z } from 'zod';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';

// Configuration Schemas
const DatabaseConfigSchema = z.object({
  connectionString: z.string().min(1, 'Database connection string is required'),
  databaseName: z.string().default('carpool'),
  maxRetries: z.number().min(0).default(3),
  retryDelay: z.number().min(0).default(1000),
  connectionPoolSize: z.number().min(1).default(10),
  requestTimeout: z.number().min(1000).default(30000),
});

const AuthConfigSchema = z.object({
  jwtSecret: z.string().min(32, 'JWT secret must be at least 32 characters'),
  jwtExpiresIn: z.string().default('24h'),
  refreshTokenExpiresIn: z.string().default('7d'),
  bcryptRounds: z.number().min(10).max(15).default(12),
  maxLoginAttempts: z.number().min(1).default(5),
  lockoutDuration: z.number().min(60000).default(900000), // 15 minutes
});

const EmailConfigSchema = z.object({
  provider: z.enum(['sendgrid', 'smtp']).default('sendgrid'),
  apiKey: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  fromEmail: z.string().email(),
  fromName: z.string().default('Carpool'),
});

const CacheConfigSchema = z.object({
  provider: z.enum(['memory']).default('memory'),
  defaultTtl: z.number().min(1000).default(300000), // 5 minutes
  maxSize: z.number().min(100).default(1000),
  checkPeriod: z.number().min(1000).default(60000), // 1 minute
});

const RateLimitConfigSchema = z.object({
  windowMs: z.number().min(1000).default(900000), // 15 minutes
  maxRequests: z.number().min(1).default(100),
  skipSuccessfulRequests: z.boolean().default(false),
  skipFailedRequests: z.boolean().default(false),
  standardHeaders: z.boolean().default(true),
  legacyHeaders: z.boolean().default(false),
});

const MonitoringConfigSchema = z.object({
  applicationInsightsKey: z.string().optional(),
  enableMetrics: z.boolean().default(true),
  enableTracing: z.boolean().default(true),
  enableHealthChecks: z.boolean().default(true),
  metricsInterval: z.number().min(1000).default(60000), // 1 minute
  alertingEnabled: z.boolean().default(true),
  alertWebhookUrl: z.string().url().optional(),
});

const SecurityConfigSchema = z.object({
  enableSanitization: z.boolean().default(true),
  enableSecurityHeaders: z.boolean().default(true),
  corsOrigins: z.array(z.string()).default(['http://localhost:3000']),
  enableThreatDetection: z.boolean().default(true),
  maxUploadSize: z.number().min(1024).default(10485760), // 10MB
  allowedFileTypes: z.array(z.string()).default(['image/jpeg', 'image/png', 'application/pdf']),
});

const AppConfigSchema = z.object({
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  port: z.number().min(1).max(65535).default(7071),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  enableDebug: z.boolean().default(false),
  timezone: z.string().default('UTC'),
  database: DatabaseConfigSchema,
  auth: AuthConfigSchema,
  email: EmailConfigSchema,
  cache: CacheConfigSchema,
  rateLimit: RateLimitConfigSchema,
  monitoring: MonitoringConfigSchema,
  security: SecurityConfigSchema,
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export type AuthConfig = z.infer<typeof AuthConfigSchema>;
export type EmailConfig = z.infer<typeof EmailConfigSchema>;
export type CacheConfig = z.infer<typeof CacheConfigSchema>;
export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;
export type MonitoringConfig = z.infer<typeof MonitoringConfigSchema>;
export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;

export interface ConfigSource {
  name: string;
  priority: number;
  load(): Promise<Partial<AppConfig>>;
}

class ConfigurationManager {
  private config: AppConfig;
  private sources: ConfigSource[] = [];
  private watchers: Map<string, any> = new Map();
  private listeners: Array<(config: AppConfig) => void> = [];

  constructor() {
    this.config = this.getDefaultConfig();
    this.initializeSources();
  }

  /**
   * Initialize configuration from all sources
   */
  async initialize(): Promise<void> {
    logger.info('Initializing configuration');

    try {
      // Load configuration from all sources in priority order
      const configData: Partial<AppConfig> = {};

      for (const source of this.sources.sort((a, b) => a.priority - b.priority)) {
        try {
          const sourceConfig = await source.load();
          Object.assign(configData, sourceConfig);
          logger.debug(`Loaded configuration from ${source.name}`);
        } catch (error) {
          logger.warn(`Failed to load configuration from ${source.name}`, { error });
        }
      }

      // Validate and merge configuration
      this.config = AppConfigSchema.parse({
        ...this.getDefaultConfig(),
        ...configData,
      });

      // Start watching for configuration changes
      await this.startWatching();

      logger.info('Configuration initialized successfully', {
        environment: this.config.environment,
        sources: this.sources.map((s) => s.name),
      });
    } catch (error) {
      logger.error('Failed to initialize configuration', { error });
      throw new Error('Configuration initialization failed');
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): AppConfig {
    return { ...this.config };
  }

  /**
   * Get a specific configuration section
   */
  getSection<T extends keyof AppConfig>(section: T): AppConfig[T] {
    return this.config[section];
  }

  /**
   * Update configuration at runtime
   */
  async updateConfig(updates: Partial<AppConfig>): Promise<void> {
    try {
      const newConfig = AppConfigSchema.parse({
        ...this.config,
        ...updates,
      });

      const oldConfig = this.config;
      this.config = newConfig;

      // Notify listeners of configuration change
      this.notifyListeners(newConfig);

      logger.info('Configuration updated', {
        updatedKeys: Object.keys(updates),
        environment: this.config.environment,
      });
    } catch (error) {
      logger.error('Failed to update configuration', { error, updates });
      throw new Error('Configuration update failed');
    }
  }

  /**
   * Validate configuration
   */
  validateConfig(config?: Partial<AppConfig>): { valid: boolean; errors: string[] } {
    try {
      AppConfigSchema.parse(config || this.config);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
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
  onChange(listener: (config: AppConfig) => void): () => void {
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
  async reload(): Promise<void> {
    logger.info('Reloading configuration');
    await this.initialize();
  }

  /**
   * Get configuration schema for documentation
   */
  getSchema(): any {
    return AppConfigSchema;
  }

  /**
   * Export configuration to file
   */
  async exportConfig(filePath: string, format: 'json' | 'yaml' = 'json'): Promise<void> {
    try {
      const configData = this.sanitizeForExport(this.config);

      if (format === 'json') {
        await fsPromises.writeFile(filePath, JSON.stringify(configData, null, 2));
      } else {
        // For YAML export, you would use a YAML library
        throw new Error('YAML export not implemented');
      }

      logger.info('Configuration exported', { filePath, format });
    } catch (error) {
      logger.error('Failed to export configuration', { error, filePath });
      throw error;
    }
  }

  private getDefaultConfig(): AppConfig {
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

  private initializeSources(): void {
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

  private async loadFromEnvironment(): Promise<Partial<AppConfig>> {
    const env = process.env;

    return {
      environment: (env.NODE_ENV as any) || 'development',
      port: env.PORT ? parseInt(env.PORT) : undefined,
      logLevel: env.LOG_LEVEL as any,
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
        provider: env.EMAIL_PROVIDER as any,
        apiKey: env.EMAIL_API_KEY,
        smtpHost: env.SMTP_HOST,
        smtpPort: env.SMTP_PORT ? parseInt(env.SMTP_PORT) : undefined,
        smtpUser: env.SMTP_USER,
        smtpPassword: env.SMTP_PASSWORD,
        fromEmail: env.FROM_EMAIL || 'noreply@carpool.com',
        fromName: env.FROM_NAME || 'Carpool',
      },
      cache: {
        provider: (env.CACHE_PROVIDER as any) || 'memory',
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

  private async loadFromFile(): Promise<Partial<AppConfig>> {
    const configPaths = ['config/config.json', 'config.json', '.carpool.json'];

    for (const configPath of configPaths) {
      try {
        const fullPath = path.resolve(configPath);
        const configFile = await fsPromises.readFile(fullPath, 'utf-8');
        const config = JSON.parse(configFile);
        logger.debug(`Loaded configuration from file: ${configPath}`);
        return config;
      } catch (error) {
        // File doesn't exist or invalid JSON, continue to next
        continue;
      }
    }

    return {};
  }

  private async loadFromKeyVault(): Promise<Partial<AppConfig>> {
    // In a real implementation, you would use Azure Key Vault SDK
    // This is a placeholder for demonstration
    try {
      if (process.env.KEY_VAULT_URL) {
        // Load secrets from Azure Key Vault
        logger.debug('Loading configuration from Azure Key Vault');
        return {};
      }
    } catch (error) {
      logger.warn('Failed to load from Key Vault', { error });
    }

    return {};
  }

  private async startWatching(): Promise<void> {
    // Watch configuration files for changes
    const configPaths = ['config/config.json', 'config.json'];

    for (const configPath of configPaths) {
      try {
        const fullPath = path.resolve(configPath);
        const watcher = fs.watchFile(fullPath, async () => {
          logger.info(`Configuration file changed: ${configPath}`);
          await this.reload();
        });

        this.watchers.set(configPath, watcher);
      } catch (error) {
        // Ignore if file doesn't exist
      }
    }
  }

  private notifyListeners(config: AppConfig): void {
    for (const listener of this.listeners) {
      try {
        listener(config);
      } catch (error) {
        logger.warn('Configuration listener error', { error });
      }
    }
  }

  private sanitizeForExport(config: AppConfig): any {
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
export const configManager = new ConfigurationManager();
