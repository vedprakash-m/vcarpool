"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validation = exports.schemas = exports.commonMiddlewares = void 0;
exports.requestId = requestId;
exports.authenticate = authenticate;
exports.rateLimit = rateLimit;
exports.sanitizeInput = sanitizeInput;
exports.validateRequest = validateRequest;
exports.cors = cors;
exports.validateBody = validateBody;
exports.errorHandler = errorHandler;
exports.securityHeaders = securityHeaders;
exports.requestLogging = requestLogging;
exports.compose = compose;
exports.requireRole = requireRole;
exports.conditionalMiddleware = conditionalMiddleware;
const container_1 = require("../container");
const error_handler_1 = require("../utils/error-handler");
const rate_limiter_middleware_1 = require("./rate-limiter.middleware");
const sanitization_middleware_1 = require("./sanitization.middleware");
const enhanced_validation_middleware_1 = require("./enhanced-validation.middleware");
const validation_middleware_1 = require("./validation.middleware");
const logger_1 = require("../utils/logger");
const uuid_1 = require("uuid");
/**
 * Generate unique request ID middleware
 */
function requestId(handler) {
    return async (request, context) => {
        const reqId = request.headers.get('x-request-id') || (0, uuid_1.v4)();
        request.requestId = reqId;
        // Add request ID to response headers
        const response = await handler(request, context);
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
function authenticate(handler) {
    return async (request, context) => {
        const requestId = request.requestId || (0, uuid_1.v4)();
        try {
            const authService = container_1.container.authService;
            const authHeader = request.headers.get('authorization');
            const token = authService.extractTokenFromHeader(authHeader || '');
            if (!token) {
                throw new error_handler_1.AuthenticationError('Authorization token required');
            }
            const payload = authService.verifyAccessToken(token);
            const authenticatedRequest = request;
            authenticatedRequest.user = payload;
            authenticatedRequest.requestId = requestId;
            logger_1.logger.debug('Authentication successful', {
                userId: payload.userId,
                requestId,
            });
            return await handler(authenticatedRequest, context);
        }
        catch (error) {
            logger_1.logger.warn('Authentication failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                requestId,
            });
            return (0, error_handler_1.handleError)(error, request, requestId);
        }
    };
}
/**
 * Rate limiting middleware
 */
function rateLimit(limiterType = 'api') {
    let limiter;
    switch (limiterType) {
        case 'auth':
            limiter = (0, rate_limiter_middleware_1.createAuthRateLimiter)();
            break;
        case 'strict':
            limiter = (0, rate_limiter_middleware_1.createStrictRateLimiter)();
            break;
        default:
            limiter = (0, rate_limiter_middleware_1.createAPIRateLimiter)();
    }
    return limiter.middleware();
}
/**
 * Input sanitization middleware
 */
function sanitizeInput(handler) {
    return async (request, context) => {
        const requestId = request.requestId || (0, uuid_1.v4)();
        try {
            const sanitizedData = sanitization_middleware_1.SanitizationMiddleware.sanitizeRequestData(request);
            // Create a new request object with sanitized data
            const sanitizedRequest = {
                ...request,
                body: sanitizedData.sanitizedBody,
                query: sanitizedData.sanitizedQuery
            };
            sanitizedRequest.sanitized = true;
            logger_1.logger.debug('Input sanitization completed', { requestId });
            return await handler(sanitizedRequest, context);
        }
        catch (error) {
            logger_1.logger.warn('Input sanitization failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                requestId,
            });
            return (0, error_handler_1.handleError)(error, request, requestId);
        }
    };
}
/**
 * Enhanced validation middleware using new validation system
 */
function validateRequest(schema, source = 'body') {
    return function (handler) {
        return async (request, context) => {
            const requestId = request.requestId || (0, uuid_1.v4)();
            try {
                const validator = enhanced_validation_middleware_1.ValidationMiddleware.validateRequest(schema, source);
                const validatedData = validator(request);
                request.validated = request.validated || {};
                request.validated[source] = validatedData;
                logger_1.logger.debug('Request validation successful', {
                    source,
                    requestId,
                });
                return await handler(request, context);
            }
            catch (error) {
                logger_1.logger.warn('Request validation failed', {
                    source,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    requestId,
                });
                return (0, error_handler_1.handleError)(error, request, requestId);
            }
        };
    };
}
/**
 * Middleware to handle CORS
 */
function cors(handler) {
    return async (request, context) => {
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
function validateBody(schema) {
    return function (handler) {
        return async (request, context) => {
            try {
                const body = await request.json();
                const validatedBody = schema.parse(body);
                request.validatedBody = validatedBody;
                return await handler(request, context);
            }
            catch (error) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        error: 'Invalid request body',
                        details: error.errors || error.message
                    }
                };
            }
        };
    };
}
/**
 * Enhanced error handling middleware
 */
function errorHandler(handler) {
    return async (request, context) => {
        const requestId = request.requestId || (0, uuid_1.v4)();
        try {
            return await handler(request, context);
        }
        catch (error) {
            logger_1.logger.error('Unhandled error in middleware', {
                error: error.message,
                stack: error.stack,
                requestId,
            });
            return (0, error_handler_1.handleError)(error, request, requestId);
        }
    };
}
/**
 * Security headers middleware
 */
function securityHeaders(handler) {
    return async (request, context) => {
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
function requestLogging(handler) {
    return async (request, context) => {
        const requestId = request.requestId || (0, uuid_1.v4)();
        const startTime = Date.now();
        logger_1.logger.info('Request started', {
            method: request.method,
            url: request.url,
            userAgent: request.headers.get('user-agent'),
            requestId,
        });
        try {
            const response = await handler(request, context);
            const duration = Date.now() - startTime;
            logger_1.logger.info('Request completed', {
                method: request.method,
                url: request.url,
                status: response.status,
                duration,
                requestId,
            });
            return response;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            logger_1.logger.error('Request failed', {
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
function compose(...middlewares) {
    return (handler) => {
        return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
    };
}
/**
 * Common middleware combinations for different endpoint types
 */
exports.commonMiddlewares = {
    /**
     * Base middleware stack for all endpoints
     */
    base: compose(errorHandler, securityHeaders, requestLogging, requestId, cors),
    /**
     * Middleware stack for public endpoints
     */
    public: compose(errorHandler, securityHeaders, requestLogging, requestId, cors, rateLimit('api'), sanitizeInput),
    /**
     * Middleware stack for authenticated endpoints
     */
    authenticated: compose(errorHandler, securityHeaders, requestLogging, requestId, cors, rateLimit('api'), sanitizeInput, authenticate),
    /**
     * Middleware stack for admin endpoints
     */
    admin: compose(errorHandler, securityHeaders, requestLogging, requestId, cors, rateLimit('strict'), sanitizeInput, authenticate, requireRole('admin')),
    /**
     * Middleware stack for auth endpoints (login, register)
     */
    auth: compose(errorHandler, securityHeaders, requestLogging, requestId, cors, rateLimit('auth'), sanitizeInput),
};
/**
 * Role-based authorization middleware
 */
function requireRole(requiredRole) {
    return function (handler) {
        return async (request, context) => {
            const requestId = request.requestId || (0, uuid_1.v4)();
            if (!request.user) {
                logger_1.logger.warn('Authorization check failed - no user', { requestId });
                throw new error_handler_1.AuthenticationError('Authentication required');
            }
            if (request.user.role !== requiredRole) {
                logger_1.logger.warn('Authorization check failed - insufficient role', {
                    requiredRole,
                    userRole: request.user.role,
                    userId: request.user.userId,
                    requestId,
                });
                throw new Error('Insufficient permissions');
            }
            logger_1.logger.debug('Authorization check passed', {
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
function conditionalMiddleware(condition, middleware) {
    return function (handler) {
        return async (request, context) => {
            if (condition(request)) {
                return await middleware(handler)(request, context);
            }
            return await handler(request, context);
        };
    };
}
// Export commonly used validation schemas
exports.schemas = enhanced_validation_middleware_1.ValidationMiddleware.schemas;
// Export validation utilities for backward compatibility
exports.validation = {
    validateQueryParams: validation_middleware_1.validateQueryParams,
    validatePathParams: validation_middleware_1.validatePathParams,
    validateRequest: enhanced_validation_middleware_1.ValidationMiddleware.validateRequest,
    validateMultiple: enhanced_validation_middleware_1.ValidationMiddleware.validateMultiple
};
//# sourceMappingURL=index.js.map