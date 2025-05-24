"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Errors = exports.DatabaseError = exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
exports.handleError = handleError;
const logger_1 = require("./logger");
/**
 * Enhanced base error class
 */
class AppError extends Error {
    statusCode;
    isOperational;
    errorCode;
    details;
    constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR', isOperational = true, details) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.errorCode = errorCode;
        this.details = details;
        // Maintains proper stack trace
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
// Specific error types
class ValidationError extends AppError {
    constructor(message, details) {
        super(message, 400, 'VALIDATION_ERROR', true, details);
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401, 'AUTHENTICATION_ERROR', true);
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403, 'AUTHORIZATION_ERROR', true);
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404, 'NOT_FOUND_ERROR', true);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
        super(message, 409, 'CONFLICT_ERROR', true);
    }
}
exports.ConflictError = ConflictError;
class RateLimitError extends AppError {
    constructor(message = 'Rate limit exceeded', retryAfter) {
        super(message, 429, 'RATE_LIMIT_ERROR', true, { retryAfter });
    }
}
exports.RateLimitError = RateLimitError;
class DatabaseError extends AppError {
    constructor(message, details) {
        super(message, 500, 'DATABASE_ERROR', true, details);
    }
}
exports.DatabaseError = DatabaseError;
/**
 * Enhanced error handling function
 */
function handleError(error, request, requestId) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    // Sanitize request for logging
    const sanitizedRequest = request ? {
        method: request.method,
        url: request.url,
        headers: sanitizeHeaders(Object.fromEntries(request.headers.entries())),
        query: request.query,
    } : null;
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let details = undefined;
    if (error instanceof AppError) {
        statusCode = error.statusCode;
        errorCode = error.errorCode;
        message = error.message;
        details = error.details;
        // Log operational errors as warnings
        logger_1.logger.warn('Operational error occurred', {
            error: {
                name: error.name,
                message: error.message,
                statusCode: error.statusCode,
                errorCode: error.errorCode,
                details: error.details,
            },
            request: sanitizedRequest,
            requestId,
        });
    }
    else {
        // Log unexpected errors as errors
        const errorInfo = error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
        } : { message: String(error) };
        logger_1.logger.error('Unexpected error occurred', {
            error: errorInfo,
            request: sanitizedRequest,
            requestId,
        });
        // Handle known error types
        if (error instanceof Error) {
            if (error.name === 'ValidationError') {
                statusCode = 400;
                errorCode = 'VALIDATION_ERROR';
                message = error.message;
            }
            else if (error.name === 'UnauthorizedError') {
                statusCode = 401;
                errorCode = 'AUTHENTICATION_ERROR';
                message = 'Authentication failed';
            }
            else if (error.name === 'MongoError' || error.name === 'MongooseError') {
                statusCode = 500;
                errorCode = 'DATABASE_ERROR';
                message = 'Database operation failed';
            }
            else {
                message = isDevelopment ? error.message : 'Internal server error';
            }
        }
    }
    const response = {
        success: false,
        error: message,
    };
    // Add details in development or for operational errors
    if (isDevelopment || (error instanceof AppError && error.isOperational)) {
        if (details) {
            response.details = details;
        }
        if (isDevelopment && error instanceof Error) {
            response.stack = error.stack;
        }
    }
    const headers = {
        'Content-Type': 'application/json',
    };
    // Add rate limit headers if applicable
    if (error instanceof RateLimitError && error.details?.retryAfter) {
        headers['Retry-After'] = error.details.retryAfter.toString();
    }
    return {
        status: statusCode,
        headers,
        jsonBody: response,
    };
}
/**
 * Sanitize headers for logging
 */
function sanitizeHeaders(headers) {
    if (!headers)
        return {};
    const sensitiveFields = ['authorization', 'cookie', 'x-api-key'];
    const sanitized = {};
    for (const [key, value] of Object.entries(headers)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
            sanitized[key] = '[REDACTED]';
        }
        else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}
exports.Errors = {
    NotFound: (message = 'Resource not found') => new AppError(message, 404, 'NOT_FOUND'),
    Unauthorized: (message = 'Unauthorized') => new AppError(message, 401, 'UNAUTHORIZED'),
    Forbidden: (message = 'Forbidden') => new AppError(message, 403, 'FORBIDDEN'),
    BadRequest: (message = 'Bad request') => new AppError(message, 400, 'BAD_REQUEST'),
    Conflict: (message = 'Conflict') => new AppError(message, 409, 'CONFLICT'),
    ValidationError: (message = 'Validation failed') => new AppError(message, 400, 'VALIDATION_ERROR'),
    InternalServerError: (message = 'Internal server error') => new AppError(message, 500, 'INTERNAL_ERROR')
};
//# sourceMappingURL=error-handler.js.map