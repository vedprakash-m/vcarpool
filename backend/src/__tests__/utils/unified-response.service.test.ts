/**
 * Unified Response Service Test Suite - Comprehensive Coverage
 *
 * Testing all response handler methods to improve coverage from 0% to 80%+
 * Includes all response types, error handling, and utility functions
 */

import { HttpRequest } from '@azure/functions';
import {
  UnifiedResponseHandler,
  createSuccessResponse,
  createErrorResponse,
  handlePreflight,
  validateAuth,
  validateRequiredFields,
  parseJsonBody,
  handleError,
  logRequest,
} from '../../utils/unified-response.service';

// Mock the CORS middleware
jest.mock('../../middleware/cors.middleware', () => ({
  CorsMiddleware: {
    createHeaders: jest.fn(() => ({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    })),
  },
}));

// Mock console methods
const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

// Mock process.env
const originalEnv = process.env;

describe('UnifiedResponseHandler', () => {
  beforeEach(() => {
    consoleSpy.mockClear();
    consoleErrorSpy.mockClear();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('success', () => {
    it('should create success response with default status 200', () => {
      const data = { message: 'Success' };
      const response = UnifiedResponseHandler.success(data);

      expect(response.status).toBe(200);
      expect(response.headers).toEqual({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      });
      expect(response.jsonBody).toEqual({
        success: true,
        data,
        meta: {
          timestamp: expect.any(String),
          version: '1.0.0',
        },
      });
    });

    it('should create success response with custom status', () => {
      const data = { id: 123 };
      const response = UnifiedResponseHandler.success(data, 201);

      expect(response.status).toBe(201);
      expect(response.jsonBody.success).toBe(true);
      expect(response.jsonBody.data).toEqual(data);
    });

    it('should include requestId when provided', () => {
      const data = { test: true };
      const requestId = 'req-123';
      const response = UnifiedResponseHandler.success(data, 200, requestId);

      expect(response.jsonBody.meta.requestId).toBe(requestId);
    });

    it('should merge custom headers', () => {
      const data = { test: true };
      const customHeaders = { 'X-Custom': 'value' };
      const response = UnifiedResponseHandler.success(data, 200, undefined, customHeaders);

      expect(response.headers).toEqual(expect.objectContaining(customHeaders));
    });

    it('should handle complex data types', () => {
      const data = {
        users: [
          { id: 1, name: 'John' },
          { id: 2, name: 'Jane' },
        ],
        pagination: { page: 1, total: 2 },
        metadata: { version: '1.0' },
      };
      const response = UnifiedResponseHandler.success(data);

      expect(response.jsonBody.data).toEqual(data);
    });
  });

  describe('error', () => {
    it('should create error response with default status 400', () => {
      const response = UnifiedResponseHandler.error('VALIDATION_ERROR', 'Invalid input');

      expect(response.status).toBe(400);
      expect(response.headers).toEqual({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      });
      expect(response.jsonBody).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          statusCode: 400,
        },
        meta: {
          timestamp: expect.any(String),
        },
      });
    });

    it('should create error response with custom status', () => {
      const response = UnifiedResponseHandler.error('NOT_FOUND', 'Resource not found', 404);

      expect(response.status).toBe(404);
      expect(response.jsonBody.error.statusCode).toBe(404);
    });

    it('should include error details when provided', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const response = UnifiedResponseHandler.error(
        'VALIDATION_ERROR',
        'Invalid input',
        400,
        details,
      );

      expect(response.jsonBody.error.details).toEqual(details);
    });

    it('should include requestId when provided', () => {
      const requestId = 'req-456';
      const response = UnifiedResponseHandler.error(
        'ERROR',
        'Test error',
        500,
        undefined,
        requestId,
      );

      expect(response.jsonBody.meta.requestId).toBe(requestId);
    });

    it('should merge custom headers', () => {
      const customHeaders = { 'X-Error-Code': 'CUSTOM' };
      const response = UnifiedResponseHandler.error(
        'ERROR',
        'Test',
        400,
        undefined,
        undefined,
        customHeaders,
      );

      expect(response.headers).toEqual(expect.objectContaining(customHeaders));
    });
  });

  describe('preflight', () => {
    it('should create CORS preflight response', () => {
      const response = UnifiedResponseHandler.preflight();

      expect(response.status).toBe(200);
      expect(response.body).toBe('');
      expect(response.headers).toEqual({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      });
    });

    it('should merge additional headers for preflight', () => {
      const customHeaders = { 'X-Custom-Preflight': 'value' };
      const response = UnifiedResponseHandler.preflight(customHeaders);

      expect(response.headers).toEqual(expect.objectContaining(customHeaders));
    });
  });

  describe('validationError', () => {
    it('should create validation error with default message', () => {
      const response = UnifiedResponseHandler.validationError();

      expect(response.status).toBe(400);
      expect(response.jsonBody.error.code).toBe('VALIDATION_ERROR');
      expect(response.jsonBody.error.message).toBe('Validation failed');
    });

    it('should create validation error with custom message and details', () => {
      const details = { missingFields: ['email', 'name'] };
      const response = UnifiedResponseHandler.validationError('Custom validation message', details);

      expect(response.jsonBody.error.message).toBe('Custom validation message');
      expect(response.jsonBody.error.details).toEqual(details);
    });

    it('should include requestId in validation error', () => {
      const requestId = 'req-validation';
      const response = UnifiedResponseHandler.validationError(
        'Validation failed',
        undefined,
        requestId,
      );

      expect(response.jsonBody.meta.requestId).toBe(requestId);
    });
  });

  describe('authError', () => {
    it('should create auth error with default message', () => {
      const response = UnifiedResponseHandler.authError();

      expect(response.status).toBe(401);
      expect(response.jsonBody.error.code).toBe('UNAUTHORIZED');
      expect(response.jsonBody.error.message).toBe('Authentication required');
    });

    it('should create auth error with custom message', () => {
      const response = UnifiedResponseHandler.authError('Invalid token');

      expect(response.jsonBody.error.message).toBe('Invalid token');
    });

    it('should include requestId in auth error', () => {
      const requestId = 'req-auth';
      const response = UnifiedResponseHandler.authError('Auth failed', requestId);

      expect(response.jsonBody.meta.requestId).toBe(requestId);
    });
  });

  describe('forbiddenError', () => {
    it('should create forbidden error with default message', () => {
      const response = UnifiedResponseHandler.forbiddenError();

      expect(response.status).toBe(403);
      expect(response.jsonBody.error.code).toBe('FORBIDDEN');
      expect(response.jsonBody.error.message).toBe('Insufficient permissions');
    });

    it('should create forbidden error with custom message', () => {
      const response = UnifiedResponseHandler.forbiddenError('Admin access required');

      expect(response.jsonBody.error.message).toBe('Admin access required');
    });
  });

  describe('notFoundError', () => {
    it('should create not found error with default message', () => {
      const response = UnifiedResponseHandler.notFoundError();

      expect(response.status).toBe(404);
      expect(response.jsonBody.error.code).toBe('NOT_FOUND');
      expect(response.jsonBody.error.message).toBe('Resource not found');
    });

    it('should create not found error with custom message', () => {
      const response = UnifiedResponseHandler.notFoundError('User not found');

      expect(response.jsonBody.error.message).toBe('User not found');
    });
  });

  describe('methodNotAllowedError', () => {
    it('should create method not allowed error', () => {
      const response = UnifiedResponseHandler.methodNotAllowedError('PATCH');

      expect(response.status).toBe(405);
      expect(response.jsonBody.error.code).toBe('METHOD_NOT_ALLOWED');
      expect(response.jsonBody.error.message).toBe('Method PATCH not allowed');
    });

    it('should include requestId in method not allowed error', () => {
      const requestId = 'req-method';
      const response = UnifiedResponseHandler.methodNotAllowedError('DELETE', requestId);

      expect(response.jsonBody.meta.requestId).toBe(requestId);
    });
  });

  describe('internalError', () => {
    it('should create internal error with default message', () => {
      const response = UnifiedResponseHandler.internalError();

      expect(response.status).toBe(500);
      expect(response.jsonBody.error.code).toBe('INTERNAL_ERROR');
      expect(response.jsonBody.error.message).toBe('Internal server error');
    });

    it('should create internal error with custom message and details', () => {
      const details = { stack: 'Error stack trace' };
      const response = UnifiedResponseHandler.internalError('Database connection failed', details);

      expect(response.jsonBody.error.message).toBe('Database connection failed');
      expect(response.jsonBody.error.details).toEqual(details);
    });
  });

  describe('handleException', () => {
    it('should handle standard errors', () => {
      const error = new Error('Test error message');
      const response = UnifiedResponseHandler.handleException(error);

      expect(response.status).toBe(500);
      expect(response.jsonBody.error.message).toBe('Test error message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Unhandled exception:', error);
    });

    it('should handle errors with statusCode', () => {
      const error = {
        code: 'CUSTOM_ERROR',
        message: 'Custom error message',
        statusCode: 422,
        details: { field: 'value' },
      };
      const response = UnifiedResponseHandler.handleException(error);

      expect(response.status).toBe(422);
      expect(response.jsonBody.error.code).toBe('CUSTOM_ERROR');
      expect(response.jsonBody.error.message).toBe('Custom error message');
      expect(response.jsonBody.error.details).toEqual({ field: 'value' });
    });

    it('should handle errors without message', () => {
      const error = {};
      const response = UnifiedResponseHandler.handleException(error);

      expect(response.status).toBe(500);
      expect(response.jsonBody.error.message).toBe('An unexpected error occurred');
    });

    it('should include stack trace in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      const response = UnifiedResponseHandler.handleException(error);

      expect(response.jsonBody.error.details).toBe('Error stack trace');
    });

    it('should not include stack trace in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      const response = UnifiedResponseHandler.handleException(error);

      expect(response.jsonBody.error.details).toBeUndefined();
    });
  });

  describe('parseJsonBody', () => {
    it('should parse valid JSON body', async () => {
      const mockRequest = {
        method: 'POST',
        text: jest.fn().mockResolvedValue('{"name": "John", "age": 30}'),
      } as any;

      const result = await UnifiedResponseHandler.parseJsonBody(mockRequest);

      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should return empty object for GET requests', async () => {
      const mockRequest = {
        method: 'GET',
      } as any;

      const result = await UnifiedResponseHandler.parseJsonBody(mockRequest);

      expect(result).toEqual({});
    });

    it('should return empty object for DELETE requests', async () => {
      const mockRequest = {
        method: 'DELETE',
      } as any;

      const result = await UnifiedResponseHandler.parseJsonBody(mockRequest);

      expect(result).toEqual({});
    });

    it('should return empty object for empty body', async () => {
      const mockRequest = {
        method: 'POST',
        text: jest.fn().mockResolvedValue(''),
      } as any;

      const result = await UnifiedResponseHandler.parseJsonBody(mockRequest);

      expect(result).toEqual({});
    });

    it('should throw error for invalid JSON', async () => {
      const mockRequest = {
        method: 'POST',
        text: jest.fn().mockResolvedValue('invalid json'),
      } as any;

      await expect(UnifiedResponseHandler.parseJsonBody(mockRequest)).rejects.toThrow(
        'Invalid JSON in request body',
      );
    });
  });

  describe('validateRequiredFields', () => {
    it('should validate successfully when all fields are present', () => {
      const data = { name: 'John', email: 'john@test.com', age: 30 };
      const requiredFields = ['name', 'email'];

      const result = UnifiedResponseHandler.validateRequiredFields(data, requiredFields);

      expect(result.isValid).toBe(true);
      expect(result.missingFields).toBeUndefined();
    });

    it('should identify missing fields', () => {
      const data = { name: 'John' };
      const requiredFields = ['name', 'email', 'age'];

      const result = UnifiedResponseHandler.validateRequiredFields(data, requiredFields);

      expect(result.isValid).toBe(false);
      expect(result.missingFields).toEqual(['email', 'age']);
    });

    it('should treat null values as missing', () => {
      const data = { name: 'John', email: null, age: 30 };
      const requiredFields = ['name', 'email', 'age'];

      const result = UnifiedResponseHandler.validateRequiredFields(data, requiredFields);

      expect(result.isValid).toBe(false);
      expect(result.missingFields).toEqual(['email']);
    });

    it('should treat empty strings as missing', () => {
      const data = { name: 'John', email: '', age: 30 };
      const requiredFields = ['name', 'email', 'age'];

      const result = UnifiedResponseHandler.validateRequiredFields(data, requiredFields);

      expect(result.isValid).toBe(false);
      expect(result.missingFields).toEqual(['email']);
    });

    it('should handle empty required fields array', () => {
      const data = { name: 'John' };
      const requiredFields: string[] = [];

      const result = UnifiedResponseHandler.validateRequiredFields(data, requiredFields);

      expect(result.isValid).toBe(true);
      expect(result.missingFields).toBeUndefined();
    });
  });

  describe('extractRequestMeta', () => {
    it('should extract request metadata from headers', () => {
      const mockRequest = {
        headers: {
          get: jest
            .fn()
            .mockReturnValueOnce('req-123')
            .mockReturnValueOnce('Mozilla/5.0')
            .mockReturnValueOnce('192.168.1.1'),
        },
      } as any;

      const meta = UnifiedResponseHandler.extractRequestMeta(mockRequest);

      expect(meta).toEqual({
        requestId: 'req-123',
        userAgent: 'Mozilla/5.0',
        clientIp: '192.168.1.1',
      });
    });

    it('should handle missing headers', () => {
      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue(null),
        },
      } as any;

      const meta = UnifiedResponseHandler.extractRequestMeta(mockRequest);

      expect(meta).toEqual({
        requestId: undefined,
        userAgent: undefined,
        clientIp: undefined,
      });
    });

    it('should prioritize x-forwarded-for over x-real-ip', () => {
      const mockRequest = {
        headers: {
          get: jest
            .fn()
            .mockReturnValueOnce(null) // x-request-id
            .mockReturnValueOnce(null) // user-agent
            .mockReturnValueOnce('10.0.0.1') // x-forwarded-for
            .mockReturnValueOnce('10.0.0.2'), // x-real-ip
        },
      } as any;

      const meta = UnifiedResponseHandler.extractRequestMeta(mockRequest);

      expect(meta.clientIp).toBe('10.0.0.1');
    });
  });

  describe('paginated', () => {
    it('should create paginated response', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const response = UnifiedResponseHandler.paginated(items, 10, 1, 5);

      expect(response.status).toBe(200);
      expect(response.jsonBody.data).toEqual({
        items,
        pagination: {
          page: 1,
          limit: 5,
          totalCount: 10,
          totalPages: 2,
          hasNext: true,
          hasPrevious: false,
        },
      });
    });

    it('should handle last page correctly', () => {
      const items = [{ id: 6 }];
      const response = UnifiedResponseHandler.paginated(items, 6, 2, 5);

      expect(response.jsonBody.data.pagination).toEqual({
        page: 2,
        limit: 5,
        totalCount: 6,
        totalPages: 2,
        hasNext: false,
        hasPrevious: true,
      });
    });

    it('should use default pagination values', () => {
      const items = [{ id: 1 }];
      const response = UnifiedResponseHandler.paginated(items, 100);

      expect(response.jsonBody.data.pagination).toEqual({
        page: 1,
        limit: 20,
        totalCount: 100,
        totalPages: 5,
        hasNext: true,
        hasPrevious: false,
      });
    });
  });

  describe('withHeaders', () => {
    it('should create response with custom headers', () => {
      const data = { test: true };
      const headers = { 'X-Custom': 'value', 'X-Another': 'header' };
      const response = UnifiedResponseHandler.withHeaders(data, headers, 201);

      expect(response.status).toBe(201);
      expect(response.headers).toEqual(expect.objectContaining(headers));
      expect(response.jsonBody.data).toEqual(data);
    });
  });
});

describe('Legacy function exports', () => {
  describe('createSuccessResponse', () => {
    it('should create success response using legacy function', () => {
      const data = { legacy: true };
      const response = createSuccessResponse(data, 201);

      expect(response.status).toBe(201);
      expect(response.jsonBody.success).toBe(true);
      expect(response.jsonBody.data).toEqual(data);
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response using legacy function', () => {
      const response = createErrorResponse('LEGACY_ERROR', 'Legacy error message', 422);

      expect(response.status).toBe(422);
      expect(response.jsonBody.success).toBe(false);
      expect(response.jsonBody.error.code).toBe('LEGACY_ERROR');
    });
  });

  describe('handlePreflight', () => {
    it('should handle OPTIONS request', () => {
      const mockRequest = { method: 'OPTIONS' } as HttpRequest;
      const response = handlePreflight(mockRequest);

      expect(response).not.toBeNull();
      expect(response?.status).toBe(200);
    });

    it('should return null for non-OPTIONS request', () => {
      const mockRequest = { method: 'GET' } as HttpRequest;
      const response = handlePreflight(mockRequest);

      expect(response).toBeNull();
    });
  });

  describe('validateAuth', () => {
    it('should return null for valid authorization header', () => {
      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue('Bearer valid-token'),
        },
      } as any;

      const response = validateAuth(mockRequest);

      expect(response).toBeNull();
    });

    it('should return auth error for missing authorization header', () => {
      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue(null),
        },
      } as any;

      const response = validateAuth(mockRequest);

      expect(response).not.toBeNull();
      expect(response?.status).toBe(401);
    });

    it('should return auth error for invalid authorization format', () => {
      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue('Invalid token'),
        },
      } as any;

      const response = validateAuth(mockRequest);

      expect(response).not.toBeNull();
      expect(response?.status).toBe(401);
    });
  });

  describe('validateRequiredFields legacy function', () => {
    it('should return null for valid data', () => {
      const data = { name: 'John', email: 'john@test.com' };
      const fields = ['name', 'email'];
      const response = validateRequiredFields(data, fields);

      expect(response).toBeNull();
    });

    it('should return validation error for missing fields', () => {
      const data = { name: 'John' };
      const fields = ['name', 'email'];
      const response = validateRequiredFields(data, fields);

      expect(response).not.toBeNull();
      expect(response?.status).toBe(400);
      expect(response?.jsonBody.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('parseJsonBody legacy function', () => {
    it('should parse JSON body', async () => {
      const mockRequest = {
        method: 'POST',
        text: jest.fn().mockResolvedValue('{"test": true}'),
      } as any;

      const result = await parseJsonBody(mockRequest);

      expect(result).toEqual({ test: true });
    });
  });

  describe('handleError', () => {
    it('should handle error with context', () => {
      const error = new Error('Test error');
      const context = { requestId: 'req-123' };
      const response = handleError(error, context);

      expect(response.status).toBe(500);
      expect(response.jsonBody.meta.requestId).toBe('req-123');
    });

    it('should handle error with custom message', () => {
      const error = new Error('Original error');
      const response = handleError(error, undefined, 'Custom error context');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Custom error context:', error);
    });

    it('should extract requestId from context.invocationId', () => {
      const error = new Error('Test error');
      const context = { invocationId: 'invocation-456' };
      const response = handleError(error, context);

      expect(response.jsonBody.meta.requestId).toBe('invocation-456');
    });
  });

  describe('logRequest', () => {
    it('should log request information', () => {
      const mockRequest = {
        method: 'POST',
        url: 'https://api.test.com/users',
        headers: {
          get: jest
            .fn()
            .mockReturnValueOnce('req-123')
            .mockReturnValueOnce('Mozilla/5.0')
            .mockReturnValueOnce('192.168.1.1'),
        },
      } as any;

      logRequest(mockRequest, undefined, 'UserAPI');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[UserAPI] POST https://api.test.com/users',
        expect.objectContaining({
          requestId: 'req-123',
          userAgent: 'Mozilla/5.0',
          clientIp: '192.168.1.1',
          timestamp: expect.any(String),
        }),
      );
    });

    it('should use default endpoint name when not provided', () => {
      const mockRequest = {
        method: 'GET',
        url: 'https://api.test.com/health',
        headers: {
          get: jest.fn().mockReturnValue(null),
        },
      } as any;

      logRequest(mockRequest);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[API] GET https://api.test.com/health',
        expect.any(Object),
      );
    });
  });
});
