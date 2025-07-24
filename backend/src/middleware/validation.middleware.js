"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateQueryParams = validateQueryParams;
exports.validatePathParams = validatePathParams;
exports.extractPathParam = extractPathParam;
/**
 * Middleware to validate URL query parameters against a schema
 */
function validateQueryParams(schema) {
    return function (handler) {
        return async (request, context) => {
            try {
                // Create URL from request URL and extract search params
                const url = new URL(request.url);
                const queryParams = {};
                // Convert URLSearchParams to a regular object
                url.searchParams.forEach((value, key) => {
                    queryParams[key] = value;
                });
                // Validate query params against schema
                const validatedQuery = schema.parse(queryParams);
                // Add validated query to request object
                request.validatedQuery = validatedQuery;
                return await handler(request, context);
            }
            catch (error) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        error: 'Invalid query parameters',
                        details: error.errors || error.message
                    }
                };
            }
        };
    };
}
/**
 * Middleware to validate URL path parameters against a schema
 */
function validatePathParams(schema, paramExtractor) {
    return function (handler) {
        return async (request, context) => {
            try {
                // Extract path params using the provided function
                const pathParams = paramExtractor(request);
                // Validate path params against schema
                const validatedParams = schema.parse(pathParams);
                // Add validated params to request object
                request.validatedParams = validatedParams;
                return await handler(request, context);
            }
            catch (error) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        error: 'Invalid path parameters',
                        details: error.errors || error.message
                    }
                };
            }
        };
    };
}
/**
 * Helper to extract a simple path parameter from a URL
 */
function extractPathParam(paramName) {
    return (request) => {
        const urlParts = request.url.split('/');
        const index = urlParts.findIndex(part => part.includes('{' + paramName + '}') || part === paramName);
        if (index !== -1 && index + 1 < urlParts.length) {
            return { [paramName]: urlParts[index + 1] };
        }
        // Try to extract from route template/pattern
        const value = urlParts[urlParts.length - 1];
        return { [paramName]: value };
    };
}
