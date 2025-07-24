import { HttpRequest, InvocationContext } from '@azure/functions';
import DOMPurify from 'isomorphic-dompurify';
import { logger } from '../utils/logger';

/**
 * Fixed Input sanitization middleware for Azure Functions
 */
export class SanitizationMiddleware {
  private static readonly SUSPICIOUS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:text\/html/gi,
    /vbscript:/gi,
    /expression\s*\(/gi,
    /@import/gi,
    /\$\{.*\}/g,
    /\{\{.*\}\}/g,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
  ];

  /**
   * Sanitizes a string value
   */
  private static sanitizeString(value: string): string {
    if (typeof value !== 'string') {
      return value;
    }

    let sanitized = value.replace(/\0/g, '').trim();

    sanitized = DOMPurify.sanitize(sanitized, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    });

    return sanitized;
  }

  /**
   * Validates input against suspicious patterns
   */
  private static validateInput(value: string, fieldName: string): void {
    for (const pattern of this.SUSPICIOUS_PATTERNS) {
      if (pattern.test(value)) {
        logger.warn('Suspicious pattern detected', {
          field: fieldName,
          pattern: pattern.source,
        });
        throw new Error(`Invalid input detected in field: ${fieldName}`);
      }
    }
  }

  /**
   * Recursively sanitizes an object
   */
  private static sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeString(key);
        sanitized[sanitizedKey] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Creates sanitized request data without modifying original request
   */
  static sanitizeRequestData(request: HttpRequest): {
    sanitizedQuery: Record<string, string>;
    sanitizedBody: any;
  } {
    const result = {
      sanitizedQuery: {} as Record<string, string>,
      sanitizedBody: null as any,
    };

    try {
      // Handle query parameters
      if (request.query) {
        const queryEntries = Array.from(request.query.entries());
        for (const [key, value] of queryEntries) {
          if (key && value) {
            this.validateInput(value, `query.${key}`);
            result.sanitizedQuery[this.sanitizeString(key)] = this.sanitizeString(value);
          }
        }
      }

      // Handle request body
      if (request.body) {
        if (typeof request.body === 'string') {
          try {
            const parsed = JSON.parse(request.body);
            result.sanitizedBody = this.sanitizeObject(parsed);
          } catch (error) {
            this.validateInput(request.body, 'body');
            result.sanitizedBody = this.sanitizeString(request.body);
          }
        } else {
          result.sanitizedBody = this.sanitizeObject(request.body);
        }
      }

      return result;
    } catch (error) {
      logger.error('Request sanitization failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Invalid input detected in request');
    }
  }

  /**
   * Middleware function that returns sanitized data
   */
  static middleware() {
    return (handler: Function) => {
      return async (request: HttpRequest, context: InvocationContext) => {
        try {
          const sanitizedData = this.sanitizeRequestData(request);

          // Add sanitized data to context for use in handlers
          (context as any).sanitizedQuery = sanitizedData.sanitizedQuery;
          (context as any).sanitizedBody = sanitizedData.sanitizedBody;

          return handler(request, context);
        } catch (error) {
          logger.error('Sanitization middleware failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          return {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
            jsonBody: {
              success: false,
              message: 'Invalid input detected',
              timestamp: new Date().toISOString(),
            },
          };
        }
      };
    };
  }
}

export default SanitizationMiddleware;
