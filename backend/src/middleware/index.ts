import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { JwtPayload } from '../services/auth.service';
import { ApiResponse } from '@vcarpool/shared';
import { container } from '../container';
import { handleError, AuthenticationError, RateLimitError } from '../utils/error-handler';
import { RateLimiter, createAuthRateLimiter, createAPIRateLimiter, createStrictRateLimiter } from './rate-limiter.middleware';
import { SanitizationMiddleware } from './sanitization.middleware';
import { ValidationMiddleware } from './enhanced-validation.middleware';
import { validateQueryParams, validatePathParams } from './validation.middleware';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface AuthenticatedRequest extends Omit<HttpRequest, 'user'> {
  user?: JwtPayload;
  requestId?: string;
  sanitized?: boolean;
}

/**
 * Generate unique request ID middleware
 */
export function requestId(
  handler: (request: HttpRequest & { requestId: string }, context: InvocationContext) => Promise<HttpResponseInit>
) {
  return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const reqId = request.headers.get('x-request-id') || uuidv4();
    (request as any).requestId = reqId;
    
    // Add request ID to response headers
    const response = await handler(request as any, context);
    return {
      ...response,
      headers: {
        ...response.headers,
        'X-Request-ID': reqId,
      },
    };
  };
}

/**
 * Enhanced authentication middleware with better error handling
 */
export function authenticate(
  handler: (request: AuthenticatedRequest, context: InvocationContext) => Promise<HttpResponseInit>
) {
  return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const requestId = (request as any).requestId || uuidv4();
    
    try {
      const authService = container.authService;
      const authHeader = request.headers.get('authorization');
      const token = authService.extractTokenFromHeader(authHeader || '');
      
      if (!token) {
        throw new AuthenticationError('Authorization token required');
      }

      const payload = authService.verifyAccessToken(token);
      const authenticatedRequest = request as unknown as AuthenticatedRequest;
      authenticatedRequest.user = payload;
      authenticatedRequest.requestId = requestId;
      
      logger.debug('Authentication successful', {
        userId: payload.userId,
        requestId,
      });
      
      return await handler(authenticatedRequest, context);
    } catch (error) {
      logger.warn('Authentication failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      });
      
      return handleError(error, request, requestId);
    }
  };
}

/**
 * Rate limiting middleware
 */
export function rateLimit(limiterType: 'auth' | 'api' | 'strict' = 'api') {
  let limiter;
  switch (limiterType) {
    case 'auth':
      limiter = createAuthRateLimiter();
      break;
    case 'strict':
      limiter = createStrictRateLimiter();
      break;
    default:
      limiter = createAPIRateLimiter();
  }
  
  return limiter.middleware();
}

/**
 * Input sanitization middleware
 */
export function sanitizeInput(
  handler: (request: HttpRequest & { sanitized: true }, context: InvocationContext) => Promise<HttpResponseInit>
) {
  return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const requestId = (request as any).requestId || uuidv4();
    
    try {
      const sanitizedData = SanitizationMiddleware.sanitizeRequestData(request);
      
      // Create a new request object with sanitized data
      const sanitizedRequest = {
        ...request,
        body: sanitizedData.sanitizedBody,
        query: sanitizedData.sanitizedQuery
      };
      
      (sanitizedRequest as any).sanitized = true;
      
      logger.debug('Input sanitization completed', { requestId });
      
      return await handler(sanitizedRequest as any, context);
    } catch (error) {
      logger.warn('Input sanitization failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      });
      
      return handleError(error, request, requestId);
    }
  };
}

/**
 * Enhanced validation middleware using new validation system
 */
export function validateRequest<T>(
  schema: any,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return function(
    handler: (request: HttpRequest & { validated: Record<string, T> }, context: InvocationContext) => Promise<HttpResponseInit>
  ) {
    return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
      const requestId = (request as any).requestId || uuidv4();
      
      try {
        const validator = ValidationMiddleware.validateRequest(schema, source);
        const validatedData = validator(request);
        
        (request as any).validated = (request as any).validated || {};
        (request as any).validated[source] = validatedData;
        
        logger.debug('Request validation successful', {
          source,
          requestId,
        });
        
        return await handler(request as any, context);
      } catch (error) {
        logger.warn('Request validation failed', {
          source,
          error: error instanceof Error ? error.message : 'Unknown error',
          requestId,
        });
        
        return handleError(error, request, requestId);
      }
    };
  };
}

/**
 * Middleware to handle CORS
 */
export function cors(
  handler: (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit>
) {
  return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
    const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400'
        }
      };
    }

    const response = await handler(request, context);
    
    // Add CORS headers to response
    return {
      ...response,
      headers: {
        ...response.headers,
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Credentials': 'true'
      }
    };
  };
}

/**
 * Middleware to validate request body against schema
 */
export function validateBody<T>(schema: any) {
  return function(
    handler: (request: HttpRequest & { validatedBody: T }, context: InvocationContext) => Promise<HttpResponseInit>
  ) {
    return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
      try {
        const body = await request.json();
        const validatedBody = schema.parse(body);
        
        (request as any).validatedBody = validatedBody;
        return await handler(request as any, context);
      } catch (error: any) {
        return {
          status: 400,
          jsonBody: {
            success: false,
            error: 'Invalid request body',
            details: error.errors || error.message
          } as ApiResponse
        };
      }
    };
  };
}



/**
 * Enhanced error handling middleware
 */
export function errorHandler(
  handler: (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit>
) {
  return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const requestId = (request as any).requestId || uuidv4();
    
    try {
      return await handler(request, context);
    } catch (error: any) {
      logger.error('Unhandled error in middleware', {
        error: error.message,
        stack: error.stack,
        requestId,
      });
      
      return handleError(error, request, requestId);
    }
  };
}

/**
 * Security headers middleware
 */
export function securityHeaders(
  handler: (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit>
) {
  return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const response = await handler(request, context);
    
    return {
      ...response,
      headers: {
        ...response.headers,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': "default-src 'self'",
      },
    };
  };
}

/**
 * Request logging middleware
 */
export function requestLogging(
  handler: (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit>
) {
  return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const requestId = (request as any).requestId || uuidv4();
    const startTime = Date.now();
    
    logger.info('Request started', {
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent'),
      requestId,
    });
    
    try {
      const response = await handler(request, context);
      const duration = Date.now() - startTime;
      
      logger.info('Request completed', {
        method: request.method,
        url: request.url,
        status: response.status,
        duration,
        requestId,
      });
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Request failed', {
        method: request.method,
        url: request.url,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        requestId,
      });
      
      throw error;
    }
  };
}

/**
 * Compose multiple middlewares with better error handling
 */
export function compose(...middlewares: Array<(handler: any) => any>) {
  return (handler: any) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}

/**
 * Common middleware combinations for different endpoint types
 */
export const commonMiddlewares = {
  /**
   * Base middleware stack for all endpoints
   */
  base: compose(
    errorHandler,
    securityHeaders,
    requestLogging,
    requestId,
    cors
  ),

  /**
   * Middleware stack for public endpoints
   */
  public: compose(
    errorHandler,
    securityHeaders,
    requestLogging,
    requestId,
    cors,
    rateLimit('api'),
    sanitizeInput
  ),

  /**
   * Middleware stack for authenticated endpoints
   */
  authenticated: compose(
    errorHandler,
    securityHeaders,
    requestLogging,
    requestId,
    cors,
    rateLimit('api'),
    sanitizeInput,
    authenticate
  ),

  /**
   * Middleware stack for admin endpoints
   */
  admin: compose(
    errorHandler,
    securityHeaders,
    requestLogging,
    requestId,
    cors,
    rateLimit('strict'),
    sanitizeInput,
    authenticate,
    requireRole('admin')
  ),

  /**
   * Middleware stack for auth endpoints (login, register)
   */
  auth: compose(
    errorHandler,
    securityHeaders,
    requestLogging,
    requestId,
    cors,
    rateLimit('auth'),
    sanitizeInput
  ),
};

/**
 * Role-based authorization middleware
 */
export function requireRole(requiredRole: string) {
  return function(
    handler: (request: AuthenticatedRequest, context: InvocationContext) => Promise<HttpResponseInit>
  ) {
    return async (request: AuthenticatedRequest, context: InvocationContext): Promise<HttpResponseInit> => {
      const requestId = request.requestId || uuidv4();
      
      if (!request.user) {
        logger.warn('Authorization check failed - no user', { requestId });
        throw new AuthenticationError('Authentication required');
      }
      
      if (request.user.role !== requiredRole) {
        logger.warn('Authorization check failed - insufficient role', {
          requiredRole,
          userRole: request.user.role,
          userId: request.user.userId,
          requestId,
        });
        throw new Error('Insufficient permissions');
      }
      
      logger.debug('Authorization check passed', {
        requiredRole,
        userId: request.user.userId,
        requestId,
      });
      
      return await handler(request, context);
    };
  };
}

/**
 * Conditional middleware application
 */
export function conditionalMiddleware(
  condition: (request: HttpRequest) => boolean,
  middleware: (handler: any) => any
) {
  return function(handler: any) {
    return async (request: HttpRequest, context: InvocationContext) => {
      if (condition(request)) {
        return await middleware(handler)(request, context);
      }
      return await handler(request, context);
    };
  };
}

// Export commonly used validation schemas
export const schemas = ValidationMiddleware.schemas;

// Export validation utilities for backward compatibility
export const validation = {
  validateQueryParams,
  validatePathParams,
  validateRequest: ValidationMiddleware.validateRequest,
  validateMultiple: ValidationMiddleware.validateMultiple
};
