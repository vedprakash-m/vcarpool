/**
 * Standardized CORS Middleware for Azure Functions
 * Consolidates CORS handling across all Carpool endpoints
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Middleware } from './index';

export interface CorsOptions {
  origins?: string | string[];
  methods?: string | string[];
  allowedHeaders?: string | string[];
  credentials?: boolean;
  maxAge?: number;
  optionsSuccessStatus?: number;
}

export class CorsMiddleware {
  private static readonly DEFAULT_OPTIONS: Required<CorsOptions> = {
    origins: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-Request-ID',
    ],
    credentials: false,
    maxAge: 86400, // 24 hours
    optionsSuccessStatus: 200,
  };

  /**
   * Create standardized CORS headers
   */
  static createHeaders(options: CorsOptions = {}): Record<string, string> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };

    const headers: Record<string, string> = {
      'Access-Control-Allow-Methods': Array.isArray(config.methods)
        ? config.methods.join(', ')
        : config.methods,
      'Access-Control-Allow-Headers': Array.isArray(config.allowedHeaders)
        ? config.allowedHeaders.join(', ')
        : config.allowedHeaders,
      'Access-Control-Max-Age': config.maxAge.toString(),
      'Content-Type': 'application/json',
      // Security headers
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    };

    // Handle origins
    if (Array.isArray(config.origins)) {
      headers['Access-Control-Allow-Origin'] = config.origins.join(', ');
    } else {
      headers['Access-Control-Allow-Origin'] = config.origins;
    }

    // Handle credentials
    if (config.credentials) {
      headers['Access-Control-Allow-Credentials'] = 'true';

      // If credentials are allowed, origin cannot be "*"
      if (headers['Access-Control-Allow-Origin'] === '*') {
        headers['Access-Control-Allow-Origin'] =
          process.env.FRONTEND_URL || 'https://lively-stone-016bfa20f.6.azurestaticapps.net';
      }
    }

    return headers;
  }

  /**
   * Apply CORS headers to response
   */
  static applyHeaders(response: HttpResponseInit, options: CorsOptions = {}): HttpResponseInit {
    const corsHeaders = this.createHeaders(options);

    return {
      ...response,
      headers: {
        ...corsHeaders,
        ...response.headers,
      },
    };
  }

  /**
   * Handle CORS preflight requests
   */
  static handlePreflight(request: HttpRequest, options: CorsOptions = {}): HttpResponseInit | null {
    if (request.method === 'OPTIONS') {
      const config = { ...this.DEFAULT_OPTIONS, ...options };

      return {
        status: config.optionsSuccessStatus,
        headers: this.createHeaders(options),
        body: '',
      };
    }
    return null;
  }

  /**
   * Middleware factory for different environments
   */
  static create(options: CorsOptions = {}): Middleware {
    return async (
      request: HttpRequest,
      context: InvocationContext,
    ): Promise<HttpResponseInit | void> => {
      // Handle preflight requests immediately
      const preflightResponse = this.handlePreflight(request, options);
      if (preflightResponse) {
        return preflightResponse;
      }

      // Add CORS headers to context for other middleware to use
      const corsHeaders = this.createHeaders(options);

      // Store CORS headers in context for final response
      if (!(context as any).res) {
        (context as any).res = {};
      }

      (context as any).res.headers = {
        ...corsHeaders,
        ...(context as any).res.headers,
      };
    };
  }

  /**
   * Environment-specific CORS configurations
   */
  static readonly configs = {
    development: {
      origins: ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    },

    staging: {
      origins: [
        'https://lively-stone-016bfa20f.6.azurestaticapps.net',
        'https://carpool-staging.azurewebsites.net',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    },

    production: {
      origins: [
        'https://lively-stone-016bfa20f.6.azurestaticapps.net',
        'https://carpool.app',
        'https://www.carpool.app',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    },

    // Fallback for legacy functions
    permissive: {
      origins: '*',
      credentials: false,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    },
  };

  /**
   * Get environment-appropriate CORS middleware
   */
  static forEnvironment(): Middleware {
    const env = process.env.NODE_ENV || 'development';
    const config = this.configs[env as keyof typeof this.configs] || this.configs.development;

    return this.create(config);
  }

  /**
   * Specific configurations for different endpoint types
   */
  static readonly endpointConfigs = {
    auth: {
      origins: this.configs.production.origins,
      credentials: true,
      methods: ['POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    },

    api: {
      origins: this.configs.production.origins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
    },

    public: {
      origins: '*',
      credentials: false,
      methods: ['GET', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Accept'],
    },

    admin: {
      origins: this.configs.production.origins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Admin-Token'],
    },
  };

  /**
   * Create endpoint-specific CORS middleware
   */
  static forEndpoint(type: keyof typeof CorsMiddleware.endpointConfigs): Middleware {
    const config = this.endpointConfigs[type];
    return this.create(config);
  }
}

/**
 * Convenience exports for common use cases
 */
export const corsMiddleware = CorsMiddleware.forEnvironment();
export const authCors = CorsMiddleware.forEndpoint('auth');
export const apiCors = CorsMiddleware.forEndpoint('api');
export const publicCors = CorsMiddleware.forEndpoint('public');
export const adminCors = CorsMiddleware.forEndpoint('admin');

/**
 * Legacy support - maintains compatibility with existing CORS implementations
 */
export function createLegacyCorsHeaders(): Record<string, string> {
  return CorsMiddleware.createHeaders(CorsMiddleware.configs.permissive);
}

export default CorsMiddleware;
