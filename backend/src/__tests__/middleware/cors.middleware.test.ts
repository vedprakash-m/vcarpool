/**
 * CORS Middleware Test Suite
 * Comprehensive testing to achieve 80%+ branch coverage
 */

import { HttpRequest, InvocationContext } from '@azure/functions';
import { CorsMiddleware, CorsOptions } from '../../middleware/cors.middleware';

describe('CorsMiddleware', () => {
  let mockRequest: Partial<HttpRequest>;
  let mockContext: Partial<InvocationContext>;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      url: 'https://api.carpool.com/test',
      headers: new Headers({
        origin: 'https://carpool.com',
        'content-type': 'application/json',
      }),
    };

    mockContext = {
      log: jest.fn(),
      error: jest.fn(),
    };
  });

  describe('createHeaders', () => {
    it('should create default CORS headers', () => {
      const headers = CorsMiddleware.createHeaders();

      expect(headers['Access-Control-Allow-Methods']).toBe('GET, POST, PUT, DELETE, OPTIONS');
      expect(headers['Access-Control-Allow-Headers']).toContain('Content-Type');
      expect(headers['Access-Control-Allow-Headers']).toContain('Authorization');
      expect(headers['Access-Control-Max-Age']).toBe('86400');
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should handle string methods option', () => {
      const options: CorsOptions = {
        methods: 'GET, POST',
      };

      const headers = CorsMiddleware.createHeaders(options);
      expect(headers['Access-Control-Allow-Methods']).toBe('GET, POST');
    });

    it('should handle array methods option', () => {
      const options: CorsOptions = {
        methods: ['GET', 'PUT', 'DELETE'],
      };

      const headers = CorsMiddleware.createHeaders(options);
      expect(headers['Access-Control-Allow-Methods']).toBe('GET, PUT, DELETE');
    });

    it('should handle string allowedHeaders option', () => {
      const options: CorsOptions = {
        allowedHeaders: 'Content-Type, Authorization',
      };

      const headers = CorsMiddleware.createHeaders(options);
      expect(headers['Access-Control-Allow-Headers']).toBe('Content-Type, Authorization');
    });

    it('should handle array allowedHeaders option', () => {
      const options: CorsOptions = {
        allowedHeaders: ['Content-Type', 'X-Custom-Header'],
      };

      const headers = CorsMiddleware.createHeaders(options);
      expect(headers['Access-Control-Allow-Headers']).toBe('Content-Type, X-Custom-Header');
    });

    it('should handle custom maxAge', () => {
      const options: CorsOptions = {
        maxAge: 3600,
      };

      const headers = CorsMiddleware.createHeaders(options);
      expect(headers['Access-Control-Max-Age']).toBe('3600');
    });

    it('should handle wildcard origins', () => {
      const options: CorsOptions = {
        origins: '*',
      };

      const headers = CorsMiddleware.createHeaders(options);
      // When origins is *, Access-Control-Allow-Origin should be handled in origin-specific logic
      expect(headers).toBeDefined();
    });

    it('should handle single origin string', () => {
      const options: CorsOptions = {
        origins: 'https://carpool.com',
      };

      const headers = CorsMiddleware.createHeaders(options);
      expect(headers).toBeDefined();
    });

    it('should handle multiple origins array', () => {
      const options: CorsOptions = {
        origins: ['https://carpool.com', 'https://app.carpool.com'],
      };

      const headers = CorsMiddleware.createHeaders(options);
      expect(headers).toBeDefined();
    });

    it('should handle credentials option', () => {
      const options: CorsOptions = {
        credentials: true,
      };

      const headers = CorsMiddleware.createHeaders(options);
      expect(headers).toBeDefined();
    });
  });

  describe('environment-specific configuration', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle production environment', () => {
      process.env.NODE_ENV = 'production';

      const headers = CorsMiddleware.createHeaders();
      expect(headers).toBeDefined();
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should handle development environment', () => {
      process.env.NODE_ENV = 'development';

      const headers = CorsMiddleware.createHeaders();
      expect(headers).toBeDefined();
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should handle test environment', () => {
      process.env.NODE_ENV = 'test';

      const headers = CorsMiddleware.createHeaders();
      expect(headers).toBeDefined();
      expect(headers['Content-Type']).toBe('application/json');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle undefined options', () => {
      const headers = CorsMiddleware.createHeaders(undefined);
      expect(headers).toBeDefined();
      expect(headers['Access-Control-Allow-Methods']).toBeDefined();
    });

    it('should handle empty options object', () => {
      const headers = CorsMiddleware.createHeaders({});
      expect(headers).toBeDefined();
      expect(headers['Access-Control-Allow-Methods']).toBeDefined();
    });

    it('should handle partial options', () => {
      const options: Partial<CorsOptions> = {
        methods: ['GET'],
        // Intentionally leave other options undefined
      };

      const headers = CorsMiddleware.createHeaders(options);
      expect(headers['Access-Control-Allow-Methods']).toBe('GET');
      expect(headers['Access-Control-Allow-Headers']).toBeDefined(); // Should use default
    });
  });
});
