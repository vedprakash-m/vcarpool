/**
 * Unified Response Utilities
 * Standardizes all API responses across Carpool backend
 */

import { HttpRequest, HttpResponseInit } from '@azure/functions';
import { CorsMiddleware } from '../middleware/cors.middleware';

export interface StandardResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    statusCode?: number;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    version?: string;
  };
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    statusCode?: number;
  };
  meta: {
    timestamp: string;
    requestId?: string;
  };
}

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  meta: {
    timestamp: string;
    requestId?: string;
    version?: string;
  };
}

export class UnifiedResponseHandler {
  private static readonly VERSION = '1.0.0';

  /**
   * Create standardized success response
   */
  static success<T>(
    data: T,
    status: number = 200,
    requestId?: string,
    headers?: Record<string, string>,
  ): HttpResponseInit {
    const response: SuccessResponse<T> = {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version: this.VERSION,
      },
    };

    return {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...CorsMiddleware.createHeaders(),
        ...headers,
      },
      jsonBody: response,
    };
  }

  /**
   * Create standardized error response
   */
  static error(
    code: string,
    message: string,
    status: number = 400,
    details?: any,
    requestId?: string,
    headers?: Record<string, string>,
  ): HttpResponseInit {
    const response: ErrorResponse = {
      success: false,
      error: {
        code,
        message,
        details,
        statusCode: status,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    };

    return {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...CorsMiddleware.createHeaders(),
        ...headers,
      },
      jsonBody: response,
    };
  }

  /**
   * Handle CORS preflight requests
   */
  static preflight(headers?: Record<string, string>): HttpResponseInit {
    return {
      status: 200,
      headers: {
        ...CorsMiddleware.createHeaders(),
        ...headers,
      },
      body: '',
    };
  }

  /**
   * Validation error response
   */
  static validationError(
    message: string = 'Validation failed',
    details?: any,
    requestId?: string,
  ): HttpResponseInit {
    return this.error('VALIDATION_ERROR', message, 400, details, requestId);
  }

  /**
   * Authentication error response
   */
  static authError(
    message: string = 'Authentication required',
    requestId?: string,
  ): HttpResponseInit {
    return this.error('UNAUTHORIZED', message, 401, undefined, requestId);
  }

  /**
   * Authorization error response
   */
  static forbiddenError(
    message: string = 'Insufficient permissions',
    requestId?: string,
  ): HttpResponseInit {
    return this.error('FORBIDDEN', message, 403, undefined, requestId);
  }

  /**
   * Not found error response
   */
  static notFoundError(
    message: string = 'Resource not found',
    requestId?: string,
  ): HttpResponseInit {
    return this.error('NOT_FOUND', message, 404, undefined, requestId);
  }

  /**
   * Method not allowed error response
   */
  static methodNotAllowedError(method: string, requestId?: string): HttpResponseInit {
    return this.error(
      'METHOD_NOT_ALLOWED',
      `Method ${method} not allowed`,
      405,
      undefined,
      requestId,
    );
  }

  /**
   * Internal server error response
   */
  static internalError(
    message: string = 'Internal server error',
    details?: any,
    requestId?: string,
  ): HttpResponseInit {
    return this.error('INTERNAL_ERROR', message, 500, details, requestId);
  }

  /**
   * Handle exceptions and convert to standardized response
   */
  static handleException(error: Error | any, requestId?: string): HttpResponseInit {
    console.error('Unhandled exception:', error);

    // Check if it's a known error type
    if (error.statusCode) {
      return this.error(
        error.code || 'ERROR',
        error.message || 'An error occurred',
        error.statusCode,
        error.details,
        requestId,
      );
    }

    // Default to internal server error
    return this.internalError(
      error.message || 'An unexpected error occurred',
      process.env.NODE_ENV === 'development' ? error.stack : undefined,
      requestId,
    );
  }

  /**
   * Parse JSON body safely
   */
  static async parseJsonBody(request: HttpRequest): Promise<any> {
    try {
      if (request.method === 'GET' || request.method === 'DELETE') {
        return {};
      }

      const body = await request.text();
      return body ? JSON.parse(body) : {};
    } catch (error) {
      throw new Error('Invalid JSON in request body');
    }
  }

  /**
   * Validate required fields
   */
  static validateRequiredFields(
    data: any,
    requiredFields: string[],
  ): { isValid: boolean; missingFields?: string[] } {
    const missingFields = requiredFields.filter(
      (field) => data[field] === undefined || data[field] === null || data[field] === '',
    );

    return {
      isValid: missingFields.length === 0,
      missingFields: missingFields.length > 0 ? missingFields : undefined,
    };
  }

  /**
   * Extract request metadata
   */
  static extractRequestMeta(request: HttpRequest): {
    requestId?: string;
    userAgent?: string;
    clientIp?: string;
  } {
    return {
      requestId: request.headers.get('x-request-id') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      clientIp:
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    };
  }

  /**
   * Create paginated response
   */
  static paginated<T>(
    items: T[],
    totalCount: number,
    page: number = 1,
    limit: number = 20,
    requestId?: string,
  ): HttpResponseInit {
    const totalPages = Math.ceil(totalCount / limit);
    const hasNext = page < totalPages;
    const hasPrevious = page > 1;

    const data = {
      items,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext,
        hasPrevious,
      },
    };

    return this.success(data, 200, requestId);
  }

  /**
   * Create response with custom headers
   */
  static withHeaders<T>(
    data: T,
    headers: Record<string, string>,
    status: number = 200,
    requestId?: string,
  ): HttpResponseInit {
    return this.success(data, status, requestId, headers);
  }
}

/**
 * Legacy function exports for backward compatibility
 */
export function createSuccessResponse<T>(data: T, status: number = 200): HttpResponseInit {
  return UnifiedResponseHandler.success(data, status);
}

export function createErrorResponse(
  code: string,
  message: string,
  status: number = 400,
): HttpResponseInit {
  return UnifiedResponseHandler.error(code, message, status);
}

export function handlePreflight(request: HttpRequest): HttpResponseInit | null {
  if (request.method === 'OPTIONS') {
    return UnifiedResponseHandler.preflight();
  }
  return null;
}

export function validateAuth(request: HttpRequest): HttpResponseInit | null {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return UnifiedResponseHandler.authError('Missing or invalid authorization token');
  }

  return null;
}

export function validateRequiredFields(data: any, fields: string[]): HttpResponseInit | null {
  const validation = UnifiedResponseHandler.validateRequiredFields(data, fields);

  if (!validation.isValid) {
    return UnifiedResponseHandler.validationError(
      `Missing required fields: ${validation.missingFields?.join(', ')}`,
      { missingFields: validation.missingFields },
    );
  }

  return null;
}

export async function parseJsonBody(request: HttpRequest): Promise<any> {
  return await UnifiedResponseHandler.parseJsonBody(request);
}

export function handleError(
  error: Error | any,
  context?: any,
  customMessage?: string,
): HttpResponseInit {
  const requestId = context?.requestId || context?.request?.requestId || context?.invocationId;

  if (customMessage) {
    console.error(`${customMessage}:`, error);
  }

  return UnifiedResponseHandler.handleException(error, requestId);
}

export function logRequest(request: HttpRequest, context?: any, endpoint?: string): void {
  const meta = UnifiedResponseHandler.extractRequestMeta(request);

  console.log(`[${endpoint || 'API'}] ${request.method} ${request.url}`, {
    ...meta,
    timestamp: new Date().toISOString(),
  });
}

export default UnifiedResponseHandler;
