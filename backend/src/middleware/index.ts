import 'reflect-metadata';
import {
  HttpRequest as AzureHttpRequest,
  HttpResponse,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { container } from '../container';
import { ZodSchema } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { userDomainService } from '../services/domains/user-domain.service';
import { UserRole } from '@carpool/shared';
import { ILogger } from '../utils/logger';
import { handleError, Errors } from '../utils/error-handler';

// JWT Payload interface for middleware
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  authProvider: 'legacy' | 'entra';
  iat?: number;
  exp?: number;
}

// Extend the Azure HttpRequest type using declaration merging
// Use a different property name ('auth') to avoid conflict with the read-only 'user' property.
declare module '@azure/functions' {
  interface HttpRequest {
    auth?: JwtPayload;
    requestId: string;
    validated?: {
      body?: any;
      query?: any;
      params?: any;
    };
  }
}

// A middleware is a function that takes a request and context, and returns a response or nothing.
// If it returns a response, the chain stops. If it returns nothing, the next middleware is called.
export type Middleware = (
  request: AzureHttpRequest,
  context: InvocationContext,
) => Promise<HttpResponseInit | void>;

// The final handler is also a middleware, but it's guaranteed to return a response.
export type HttpHandler = (
  request: AzureHttpRequest,
  context: InvocationContext,
) => Promise<HttpResponseInit | HttpResponse>;

/**
 * Composes multiple middlewares into a single handler.
 * The middlewares are executed in the order they are provided.
 */
export function compose(...middlewares: Middleware[]): (handler: HttpHandler) => HttpHandler {
  return (finalHandler) =>
    async (request, context): Promise<HttpResponseInit | HttpResponse> => {
      for (const middleware of middlewares) {
        const response = await middleware(request, context);
        if (response) {
          // If a middleware returns a response, stop processing and return it
          return response;
        }
      }
      // If all middlewares pass, call the final handler
      const finalResponse = await finalHandler(request, context);

      // The final handler must return a response. If it doesn't, something is wrong.
      if (!finalResponse) {
        return handleError(new Error('The final handler did not return a response.'), request);
      }

      return finalResponse;
    };
}

// Middleware to add a request ID to each request
export const requestId: Middleware = async (request, context) => {
  request.requestId = request.headers.get('x-request-id') || uuidv4();
};

// Middleware for basic request logging
export const requestLogging: Middleware = async (request, context) => {
  const logger = container.resolve<ILogger>('ILogger');
  logger.info(`Request received: ${request.method} ${request.url}`, {
    requestId: request.requestId,
    method: request.method,
    url: request.url,
  });
};

// Middleware for authentication
export const authenticate: Middleware = async (request, context) => {
  const logger = container.resolve<ILogger>('ILogger').child({ requestId: request.requestId });

  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      throw Errors.Unauthorized(
        'Authorization token is required. Expected "Bearer <token>" format.',
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const verifyResult = await userDomainService.verifyToken(token);

    if (!verifyResult.success || !verifyResult.user) {
      throw Errors.Unauthorized(verifyResult.message || 'Invalid or expired token.');
    }

    // Create JWT payload for middleware compatibility
    const payload: JwtPayload = {
      userId: verifyResult.user.id,
      email: verifyResult.user.email,
      role: verifyResult.user.role,
      authProvider: verifyResult.user.authProvider,
    };

    request.auth = payload;

    logger.debug('Authentication successful', { userId: payload.userId });
  } catch (error) {
    logger.warn('Authentication failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return handleError(error, request);
  }
};

// Middleware to check for a specific role
export function hasRole(requiredRole: UserRole): Middleware {
  return async (request, context) => {
    if (!request.auth || request.auth.role !== requiredRole) {
      return handleError(Errors.Forbidden('Insufficient permissions.'), request);
    }
  };
}

// Middleware to validate the request body using a Zod schema
export function validateBody<T>(schema: ZodSchema<T>): Middleware {
  return async (request, context) => {
    try {
      const body = await request.json();
      const result = schema.safeParse(body);
      if (!result.success) {
        return handleError(
          Errors.ValidationError('Invalid request body.', result.error.flatten()),
          request,
        );
      }
      request.validated = { ...request.validated, body: result.data };
    } catch (error) {
      return handleError(Errors.BadRequest('Invalid JSON in request body.'), request);
    }
  };
}

// Middleware to validate the query parameters using a Zod schema
export function validateQuery<T>(schema: ZodSchema<T>): Middleware {
  return async (request, context) => {
    const queryParams: { [key: string]: any } = {};
    request.query.forEach((value, key) => {
      queryParams[key] = value;
    });

    const result = schema.safeParse(queryParams);
    if (!result.success) {
      return handleError(
        Errors.ValidationError('Invalid query parameters.', result.error.flatten()),
        request,
      );
    }
    request.validated = { ...request.validated, query: result.data };
  };
}

// Middleware to validate the path parameters using a Zod schema
export function validateParams<T>(schema: ZodSchema<T>): Middleware {
  return async (request, context) => {
    const result = schema.safeParse(request.params);
    if (!result.success) {
      return handleError(
        Errors.ValidationError('Invalid path parameters.', result.error.flatten()),
        request,
      );
    }
    request.validated = { ...request.validated, params: result.data };
  };
}

// Export additional middleware
export { ValidationMiddleware } from './enhanced-validation.middleware';
export { SanitizationMiddleware } from './sanitization.middleware';
export {
  CorsMiddleware,
  corsMiddleware,
  authCors,
  apiCors,
  publicCors,
  adminCors,
  createLegacyCorsHeaders,
} from './cors.middleware';
