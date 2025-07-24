import { HttpRequest } from '@azure/functions';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  Errors,
  handleError,
} from '../../utils/error-handler';
import { AzureLogger, ILogger } from '../../utils/logger';

// Mock the logger module
jest.mock('../../utils/logger', () => ({
  AzureLogger: jest.fn(),
}));

const MockedAzureLogger = AzureLogger as jest.MockedClass<typeof AzureLogger>;

describe('Error Handler', () => {
  let mockLogger: jest.Mocked<ILogger>;
  let mockRequest: HttpRequest;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      setContext: jest.fn(),
      child: jest.fn(),
      startTimer: jest.fn(),
    };

    // Mock AzureLogger to return our mock logger
    MockedAzureLogger.mockImplementation(() => mockLogger as any);

    // Create mock request
    mockRequest = {
      method: 'GET',
      url: 'https://api.example.com/test',
      headers: {},
      query: {},
      params: {},
      requestId: 'test-request-123',
    } as HttpRequest;

    // Set test environment
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  describe('Error Classes', () => {
    describe('AppError', () => {
      it('should create AppError with default values', () => {
        const error = new AppError('Test error');

        expect(error.message).toBe('Test error');
        expect(error.statusCode).toBe(500);
        expect(error.code).toBe('INTERNAL_ERROR');
        expect(error.isOperational).toBe(true);
        expect(error.details).toBeUndefined();
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(AppError);
      });

      it('should create AppError with custom values', () => {
        const details = { field: 'value' };
        const error = new AppError('Custom error', 400, 'CUSTOM_ERROR', false, details);

        expect(error.message).toBe('Custom error');
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe('CUSTOM_ERROR');
        expect(error.isOperational).toBe(false);
        expect(error.details).toBe(details);
      });
    });

    describe('ValidationError', () => {
      it('should create ValidationError with correct defaults', () => {
        const error = new ValidationError('Invalid input');

        expect(error.message).toBe('Invalid input');
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.isOperational).toBe(true);
      });

      it('should create ValidationError with details', () => {
        const details = { field: 'email', issue: 'invalid format' };
        const error = new ValidationError('Invalid email', details);

        expect(error.details).toBe(details);
      });
    });

    describe('AuthenticationError', () => {
      it('should create AuthenticationError with default message', () => {
        const error = new AuthenticationError();

        expect(error.message).toBe('Authentication failed');
        expect(error.statusCode).toBe(401);
        expect(error.code).toBe('AUTHENTICATION_ERROR');
      });

      it('should create AuthenticationError with custom message', () => {
        const error = new AuthenticationError('Token expired');

        expect(error.message).toBe('Token expired');
      });
    });

    describe('AuthorizationError', () => {
      it('should create AuthorizationError with default message', () => {
        const error = new AuthorizationError();

        expect(error.message).toBe('Access denied');
        expect(error.statusCode).toBe(403);
        expect(error.code).toBe('AUTHORIZATION_ERROR');
      });

      it('should create AuthorizationError with custom message', () => {
        const error = new AuthorizationError('Insufficient permissions');

        expect(error.message).toBe('Insufficient permissions');
      });
    });

    describe('NotFoundError', () => {
      it('should create NotFoundError with default message', () => {
        const error = new NotFoundError();

        expect(error.message).toBe('Resource not found');
        expect(error.statusCode).toBe(404);
        expect(error.code).toBe('NOT_FOUND_ERROR');
      });

      it('should create NotFoundError with custom message', () => {
        const error = new NotFoundError('User not found');

        expect(error.message).toBe('User not found');
      });
    });

    describe('ConflictError', () => {
      it('should create ConflictError with default message', () => {
        const error = new ConflictError();

        expect(error.message).toBe('Resource conflict');
        expect(error.statusCode).toBe(409);
        expect(error.code).toBe('CONFLICT_ERROR');
      });

      it('should create ConflictError with custom message', () => {
        const error = new ConflictError('Email already exists');

        expect(error.message).toBe('Email already exists');
      });
    });

    describe('RateLimitError', () => {
      it('should create RateLimitError with default message', () => {
        const error = new RateLimitError();

        expect(error.message).toBe('Rate limit exceeded');
        expect(error.statusCode).toBe(429);
        expect(error.code).toBe('RATE_LIMIT_ERROR');
      });

      it('should create RateLimitError with retryAfter', () => {
        const error = new RateLimitError('Too many requests', 60);

        expect(error.message).toBe('Too many requests');
        expect(error.details).toEqual({ retryAfter: 60 });
      });
    });

    describe('DatabaseError', () => {
      it('should create DatabaseError with message', () => {
        const error = new DatabaseError('Connection failed');

        expect(error.message).toBe('Connection failed');
        expect(error.statusCode).toBe(500);
        expect(error.code).toBe('DATABASE_ERROR');
      });

      it('should create DatabaseError with details', () => {
        const details = { connectionString: 'redacted', timeout: 5000 };
        const error = new DatabaseError('Query timeout', details);

        expect(error.details).toBe(details);
      });
    });
  });

  describe('Errors factory', () => {
    it('should create BadRequest error', () => {
      const error = Errors.BadRequest('Bad request', { field: 'value' });

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.message).toBe('Bad request');
      expect(error.details).toEqual({ field: 'value' });
    });

    it('should create Unauthorized error', () => {
      const error = Errors.Unauthorized('Unauthorized');

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('should create Forbidden error', () => {
      const error = Errors.Forbidden('Forbidden');

      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
    });

    it('should create NotFound error', () => {
      const error = Errors.NotFound('Not found');

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should create Conflict error', () => {
      const error = Errors.Conflict('Conflict');

      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });

    it('should create InternalServerError', () => {
      const error = Errors.InternalServerError('Internal error');

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
    });

    it('should create ValidationError', () => {
      const error = Errors.ValidationError('Validation failed');

      expect(error.statusCode).toBe(422);
      expect(error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('handleError function', () => {
    describe('with HttpRequest and logger', () => {
      it('should handle AppError correctly', () => {
        const appError = new AppError('Test app error', 400, 'TEST_ERROR', true, { test: true });

        const response = handleError(appError, mockRequest, mockLogger);

        expect(response.status).toBe(400);
        expect(response.jsonBody).toEqual({
          success: false,
          error: {
            code: 'TEST_ERROR',
            message: 'Test app error',
          },
          details: { test: true },
          requestId: 'test-request-123',
        });

        expect(mockLogger.error).toHaveBeenCalledWith('Test app error', {
          error: appError,
          requestId: 'test-request-123',
          statusCode: 400,
        });
      });

      it('should handle AppError without details', () => {
        const appError = new AppError('Simple error', 404, 'NOT_FOUND');

        const response = handleError(appError, mockRequest, mockLogger);

        expect(response.status).toBe(404);
        expect(response.jsonBody).toEqual({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Simple error',
          },
          requestId: 'test-request-123',
        });
      });

      it('should handle generic Error', () => {
        const genericError = new Error('Generic error message');

        const response = handleError(genericError, mockRequest, mockLogger);

        expect(response.status).toBe(500);
        expect(response.jsonBody).toEqual({
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected internal error occurred.',
          },
          requestId: 'test-request-123',
        });
      });

      it('should handle non-Error objects', () => {
        const nonError = 'String error';

        const response = handleError(nonError, mockRequest, mockLogger);

        expect(response.status).toBe(500);
        expect(response.jsonBody).toEqual({
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred.',
          },
          requestId: 'test-request-123',
        });
      });

      it('should include stack trace in development', () => {
        process.env.NODE_ENV = 'development';
        const error = new Error('Dev error');

        const response = handleError(error, mockRequest, mockLogger);

        expect(response.jsonBody).toHaveProperty('stack');
        expect(response.jsonBody.stack).toBe(error.stack);
      });

      it('should not include stack trace in production', () => {
        process.env.NODE_ENV = 'production';
        const error = new Error('Prod error');

        const response = handleError(error, mockRequest, mockLogger);

        expect(response.jsonBody).not.toHaveProperty('stack');
      });
    });

    describe('with logger only (no HttpRequest)', () => {
      it('should handle error with logger directly', () => {
        const appError = new AppError('Logger only error', 400, 'LOGGER_ERROR');

        const response = handleError(appError, mockLogger);

        expect(response.status).toBe(400);
        expect(response.jsonBody).toEqual({
          success: false,
          error: {
            code: 'LOGGER_ERROR',
            message: 'Logger only error',
          },
          requestId: undefined,
        });

        expect(mockLogger.error).toHaveBeenCalledWith('Logger only error', {
          error: appError,
          requestId: undefined,
          statusCode: 400,
        });
      });

      it('should create default logger when request provided without logger', () => {
        const appError = new AppError('Default logger error', 500);

        const response = handleError(appError, mockRequest);

        expect(response.status).toBe(500);
        expect(MockedAzureLogger).toHaveBeenCalled();
      });
    });

    describe('error message extraction', () => {
      it('should extract message from error object', () => {
        const error = { message: 'Object error message' };

        handleError(error, mockLogger);

        expect(mockLogger.error).toHaveBeenCalledWith('Object error message', expect.any(Object));
      });

      it('should handle error object without message', () => {
        const error = { code: 'NO_MESSAGE' };

        handleError(error, mockLogger);

        expect(mockLogger.error).toHaveBeenCalledWith('Unknown error', expect.any(Object));
      });

      it('should handle null error', () => {
        handleError(null, mockLogger);

        expect(mockLogger.error).toHaveBeenCalledWith('Unknown error', expect.any(Object));
      });

      it('should handle undefined error', () => {
        handleError(undefined, mockLogger);

        expect(mockLogger.error).toHaveBeenCalledWith('Unknown error', expect.any(Object));
      });
    });
  });
});
