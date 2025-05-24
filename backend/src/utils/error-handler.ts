import { HttpRequest, HttpResponseInit } from '@azure/functions';
import { ApiResponse } from '@vcarpool/shared';
import { logger } from './logger';

/**
 * Enhanced base error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errorCode: string;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errorCode = errorCode;
    this.details = details;
    
    // Maintains proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR', true);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR', true);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR', true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR', true);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_ERROR', true, { retryAfter });
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'DATABASE_ERROR', true, details);
  }
}

/**
 * Enhanced error handling function
 */
export function handleError(
  error: unknown, 
  request?: HttpRequest, 
  requestId?: string
): HttpResponseInit {
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
  let details: any = undefined;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    errorCode = error.errorCode;
    message = error.message;
    details = error.details;

    // Log operational errors as warnings
    logger.warn('Operational error occurred', {
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
  } else {
    // Log unexpected errors as errors
    const errorInfo = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : { message: String(error) };

    logger.error('Unexpected error occurred', {
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
      } else if (error.name === 'UnauthorizedError') {
        statusCode = 401;
        errorCode = 'AUTHENTICATION_ERROR';
        message = 'Authentication failed';
      } else if (error.name === 'MongoError' || error.name === 'MongooseError') {
        statusCode = 500;
        errorCode = 'DATABASE_ERROR';
        message = 'Database operation failed';
      } else {
        message = isDevelopment ? error.message : 'Internal server error';
      }
    }
  }

  const response: ApiResponse = {
    success: false,
    error: message,
  };

  // Add details in development or for operational errors
  if (isDevelopment || (error instanceof AppError && error.isOperational)) {
    if (details) {
      (response as any).details = details;
    }
    
    if (isDevelopment && error instanceof Error) {
      (response as any).stack = error.stack;
    }
  }

  const headers: Record<string, string> = {
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
function sanitizeHeaders(headers?: Record<string, string>): Record<string, string> {
  if (!headers) return {};

  const sensitiveFields = ['authorization', 'cookie', 'x-api-key'];
  const sanitized: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(headers)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
export const Errors = {
  NotFound: (message: string = 'Resource not found') => 
    new AppError(message, 404, 'NOT_FOUND'),
  
  Unauthorized: (message: string = 'Unauthorized') => 
    new AppError(message, 401, 'UNAUTHORIZED'),
  
  Forbidden: (message: string = 'Forbidden') => 
    new AppError(message, 403, 'FORBIDDEN'),
  
  BadRequest: (message: string = 'Bad request') => 
    new AppError(message, 400, 'BAD_REQUEST'),
  
  Conflict: (message: string = 'Conflict') => 
    new AppError(message, 409, 'CONFLICT'),
  
  ValidationError: (message: string = 'Validation failed') => 
    new AppError(message, 400, 'VALIDATION_ERROR'),
  
  InternalServerError: (message: string = 'Internal server error') => 
    new AppError(message, 500, 'INTERNAL_ERROR')
};
