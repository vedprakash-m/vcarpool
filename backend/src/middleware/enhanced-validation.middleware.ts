import { z } from 'zod';
import { HttpRequest } from '@azure/functions';
import { logger } from '../utils/logger';

/**
 * Enhanced validation middleware with comprehensive security checks
 */
export class ValidationMiddleware {
  private static readonly MAX_STRING_LENGTH = 10000;
  private static readonly MAX_ARRAY_LENGTH = 1000;
  private static readonly MAX_OBJECT_DEPTH = 10;
  private static readonly MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB

  /**
   * Custom Zod transformations for security
   */
  static readonly secureString = (maxLength = 255) =>
    z
      .string()
      .trim()
      .max(maxLength, `String too long (max ${maxLength} characters)`)
      .refine(
        (val) => !this.containsSuspiciousPatterns(val),
        'String contains suspicious patterns',
      );

  static readonly secureEmail = z
    .string()
    .email('Invalid email format')
    .max(254, 'Email too long')
    .toLowerCase()
    .refine((val) => this.isValidEmailDomain(val), 'Email domain not allowed');

  static readonly secureUrl = z
    .string()
    .url('Invalid URL format')
    .refine((val) => this.isAllowedUrl(val), 'URL not allowed');

  static readonly secureId = z.string().uuid('Invalid ID format');

  static readonly securePhoneNumber = z
    .string()
    .regex(/^[+\d\s\-\(\)]{10,15}$/, 'Invalid phone number format')
    .transform((val) => val.replace(/\s/g, ''));

  static readonly securePassword = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .refine((val) => this.isStrongPassword(val), 'Password does not meet security requirements');

  /**
   * Enhanced common schemas with security validations
   */
  static readonly schemas = {
    // User schemas
    userRegistration: z.object({
      email: this.secureEmail,
      password: this.securePassword,
      firstName: this.secureString(50),
      lastName: this.secureString(50),
      phone: this.securePhoneNumber.optional(),
      role: z.enum(['admin', 'parent', 'student']),
    }),

    userUpdate: z.object({
      firstName: this.secureString(50).optional(),
      lastName: this.secureString(50).optional(),
      phone: this.securePhoneNumber.optional(),
      profilePicture: this.secureUrl.optional(),
    }),

    loginRequest: z.object({
      email: this.secureEmail,
      password: z.string().min(1, 'Password required'),
    }),

    // Carpool schemas
    carpoolCreate: z
      .object({
        origin: this.secureString(200),
        destination: this.secureString(200),
        departureTime: z.string().datetime('Invalid departure time'),
        capacity: z.number().int().min(1).max(8),
        price: z.number().min(0).max(1000),
        description: this.secureString(1000).optional(),
        recurring: z.boolean().optional(),
        recurrencePattern: z.enum(['daily', 'weekly', 'monthly']).optional(),
      })
      .refine((data) => {
        const depTime = new Date(data.departureTime);
        const now = new Date();
        return depTime > now;
      }, 'Departure time must be in the future'),

    carpoolUpdate: z.object({
      origin: this.secureString(200).optional(),
      destination: this.secureString(200).optional(),
      departureTime: z.string().datetime('Invalid departure time').optional(),
      capacity: z.number().int().min(1).max(8).optional(),
      price: z.number().min(0).max(1000).optional(),
      description: this.secureString(1000).optional(),
      status: z.enum(['active', 'cancelled', 'completed']).optional(),
    }),

    carpoolSearch: z.object({
      origin: this.secureString(200).optional(),
      destination: this.secureString(200).optional(),
      date: z.string().date('Invalid date').optional(),
      maxPrice: z.number().min(0).max(1000).optional(),
      minSeats: z.number().int().min(1).max(8).optional(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(20),
    }),

    // Booking schemas
    bookingCreate: z.object({
      carpoolId: this.secureId,
      seats: z.number().int().min(1).max(8),
      notes: this.secureString(500).optional(),
    }),

    bookingUpdate: z.object({
      status: z.enum(['pending', 'confirmed', 'cancelled']),
      notes: this.secureString(500).optional(),
    }),

    // Message schemas
    messageCreate: z.object({
      recipientId: this.secureId,
      subject: this.secureString(200),
      content: this.secureString(5000),
      priority: z.enum(['low', 'normal', 'high']).default('normal'),
    }),

    // Notification schemas
    notificationUpdate: z.object({
      read: z.boolean(),
    }),

    // Rating schemas
    ratingCreate: z.object({
      carpoolId: this.secureId,
      rating: z.number().int().min(1).max(5),
      comment: this.secureString(1000).optional(),
    }),

    // Generic schemas
    idParam: z.object({
      id: this.secureId,
    }),

    paginationQuery: z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      sortBy: this.secureString(50).optional(),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }),
  };

  /**
   * Validates password strength
   */
  private static isStrongPassword(password: string): boolean {
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    return hasLower && hasUpper && hasNumber && hasSpecial;
  }

  /**
   * Checks for suspicious patterns in strings
   */
  private static containsSuspiciousPatterns(value: string): boolean {
    const patterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /\$\{.*\}/,
      /\{\{.*\}\}/,
      /('|(\\')|(;)|(\';)|(\|\|)|(\/\*)|(\*\/)|(\-\-)|(\bOR\b)|(\bAND\b))/i,
      /\$where|\$ne|\$gt|\$lt|\$gte|\$lte|\$in|\$nin|\$regex/i,
    ];
    return patterns.some((pattern) => pattern.test(value));
  }

  /**
   * Validates email domain against allowed list
   */
  private static isValidEmailDomain(email: string): boolean {
    const domain = email.split('@')[1];

    // Block known problematic domains
    const blockedDomains = [
      'tempmail.org',
      '10minutemail.com',
      'guerrillamail.com',
      'mailinator.com',
    ];

    return !blockedDomains.includes(domain.toLowerCase());
  }

  /**
   * Validates URL against allowed patterns
   */
  private static isAllowedUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);

      // Only allow HTTPS for external URLs
      if (!['https:', 'http:'].includes(urlObj.protocol)) {
        return false;
      }

      // Block localhost and private IPs in production
      if (process.env.NODE_ENV === 'production') {
        const hostname = urlObj.hostname.toLowerCase();
        if (
          hostname === 'localhost' ||
          hostname.startsWith('127.') ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.') ||
          hostname.startsWith('172.')
        ) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates object depth to prevent prototype pollution
   */
  private static validateObjectDepth(obj: any, currentDepth = 0): boolean {
    if (currentDepth > this.MAX_OBJECT_DEPTH) {
      return false;
    }

    if (obj && typeof obj === 'object') {
      for (const value of Object.values(obj)) {
        if (!this.validateObjectDepth(value, currentDepth + 1)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Validates request size limits
   */
  private static validateRequestSize(request: HttpRequest): void {
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > this.MAX_PAYLOAD_SIZE) {
      throw new Error(`Payload size exceeds limit of ${this.MAX_PAYLOAD_SIZE} bytes`);
    }

    // Check overall request size (approximation)
    const requestSize = JSON.stringify(request as unknown as Record<string, unknown>).length;
    if (requestSize > this.MAX_PAYLOAD_SIZE * 1.2) {
      // Allow some overhead
      throw new Error(`Request size exceeds limit`);
    }
  }

  /**
   * Validates request and returns typed data
   */
  static validateRequest<T extends z.ZodSchema>(
    schema: T,
    source: 'body' | 'query' | 'params' = 'body',
  ) {
    return (request: HttpRequest): z.infer<T> => {
      let dataToValidate: any;

      if (source === 'body') {
        dataToValidate = (request as any).body;
      } else if (source === 'query') {
        dataToValidate = Object.fromEntries(request.query.entries());
      } else if (source === 'params') {
        dataToValidate = (request as any).params;
      }

      if (dataToValidate && !this.validateObjectDepth(dataToValidate as Record<string, unknown>)) {
        throw new Error('Object nesting level exceeds maximum depth');
      }

      try {
        // Use zod schema to parse and validate
        return schema.parse(dataToValidate);
      } catch (error) {
        logger.warn('Validation failed', {
          validation: source,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new Error(
          `Validation failed for ${source}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    };
  }

  /**
   * Batch validation for multiple data sources
   */
  static validateMultiple(
    validations: Array<{
      data: any;
      schema: z.ZodSchema;
      name: string;
    }>,
  ): Record<string, any> {
    const results: Record<string, any> = {};

    for (const { data, schema, name } of validations) {
      try {
        results[name] = schema.parse(data);
      } catch (error) {
        logger.warn('Batch validation failed', {
          validation: name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new Error(
          `Validation failed for ${name}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    }

    return results;
  }
}
