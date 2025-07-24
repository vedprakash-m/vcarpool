import { HttpRequest, HttpResponseInit } from '@azure/functions';
import { ZodSchema } from 'zod';
import { ApiResponse } from '@carpool/shared';

/**
 * Middleware to validate URL query parameters against a schema
 */
export function validateQueryParams<T>(schema: ZodSchema<T>) {
  return function (
    handler: (
      request: HttpRequest & { validatedQuery: T },
      context: any,
    ) => Promise<HttpResponseInit>,
  ) {
    return async (request: HttpRequest, context: any): Promise<HttpResponseInit> => {
      try {
        // Create URL from request URL and extract search params
        const url = new URL(request.url);
        const queryParams: Record<string, string> = {};

        // Convert URLSearchParams to a regular object
        url.searchParams.forEach((value, key) => {
          queryParams[key] = value;
        });

        // Validate query params against schema
        const validatedQuery = schema.parse(queryParams);

        // Add validated query to request object
        (request as any).validatedQuery = validatedQuery;
        return await handler(request as any, context);
      } catch (error: any) {
        return {
          status: 400,
          jsonBody: {
            success: false,
            error: 'Invalid query parameters',
            details: error.errors || error.message,
          } as ApiResponse,
        };
      }
    };
  };
}

/**
 * Middleware to validate URL path parameters against a schema
 */
export function validatePathParams<T>(
  schema: ZodSchema<T>,
  paramExtractor: (request: HttpRequest) => Record<string, string>,
) {
  return function (
    handler: (
      request: HttpRequest & { validatedParams: T },
      context: any,
    ) => Promise<HttpResponseInit>,
  ) {
    return async (request: HttpRequest, context: any): Promise<HttpResponseInit> => {
      try {
        // Extract path params using the provided function
        const pathParams = paramExtractor(request);

        // Validate path params against schema
        const validatedParams = schema.parse(pathParams);

        // Add validated params to request object
        (request as any).validatedParams = validatedParams;
        return await handler(request as any, context);
      } catch (error: any) {
        return {
          status: 400,
          jsonBody: {
            success: false,
            error: 'Invalid path parameters',
            details: error.errors || error.message,
          } as ApiResponse,
        };
      }
    };
  };
}

/**
 * Helper to extract a simple path parameter from a URL
 */
export function extractPathParam(paramName: string) {
  return (request: HttpRequest): Record<string, string> => {
    const urlParts = request.url.split('/');
    const index = urlParts.findIndex(
      (part) => part.includes('{' + paramName + '}') || part === paramName,
    );

    if (index !== -1 && index + 1 < urlParts.length) {
      return { [paramName]: urlParts[index + 1] };
    }

    // Try to extract from route template/pattern
    const value = urlParts[urlParts.length - 1];
    return { [paramName]: value };
  };
}
