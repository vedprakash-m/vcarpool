const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Rate limiting store (in-memory for simplicity, use Redis in production)
const rateLimitStore = new Map();

/**
 * Security middleware for Azure Functions
 */
class SecurityMiddleware {
  /**
   * Apply CORS headers
   */
  static applyCorsHeaders(context) {
    const headers = {
      "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGINS || "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Requested-With",
      "Access-Control-Max-Age": "86400",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    };

    if (!context.res.headers) {
      context.res.headers = {};
    }

    Object.assign(context.res.headers, headers);
  }

  /**
   * Handle CORS preflight requests
   */
  static handlePreflight(context, req) {
    if (req.method === "OPTIONS") {
      this.applyCorsHeaders(context);
      context.res = {
        status: 200,
        headers: context.res.headers || {},
      };
      return true;
    }
    return false;
  }

  /**
   * Rate limiting middleware
   */
  static rateLimit(context, req, options = {}) {
    const { maxRequests = 100, windowMs = 15 * 60 * 1000 } = options; // 100 requests per 15 minutes

    const clientIp =
      req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "unknown";
    const key = `rate_limit:${clientIp}`;

    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    if (rateLimitStore.has(key)) {
      const requests = rateLimitStore
        .get(key)
        .filter((timestamp) => timestamp > windowStart);
      rateLimitStore.set(key, requests);
    } else {
      rateLimitStore.set(key, []);
    }

    const currentRequests = rateLimitStore.get(key);

    if (currentRequests.length >= maxRequests) {
      this.applyCorsHeaders(context);
      context.res = {
        status: 429,
        headers: {
          ...context.res.headers,
          "Content-Type": "application/json",
          "Retry-After": Math.ceil(windowMs / 1000),
        },
        body: {
          success: false,
          error: "Too many requests. Please try again later.",
          retryAfter: Math.ceil(windowMs / 1000),
        },
      };
      return false;
    }

    currentRequests.push(now);
    rateLimitStore.set(key, currentRequests);
    return true;
  }

  /**
   * Input validation and sanitization
   */
  static validateInput(data, schema) {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];

      // Required field check
      if (
        rules.required &&
        (value === undefined || value === null || value === "")
      ) {
        errors.push(`${field} is required`);
        continue;
      }

      // Skip validation if field is not required and not provided
      if (!rules.required && (value === undefined || value === null)) {
        continue;
      }

      // Type validation
      if (rules.type && typeof value !== rules.type) {
        errors.push(`${field} must be of type ${rules.type}`);
        continue;
      }

      // String validations
      if (rules.type === "string" && typeof value === "string") {
        if (rules.minLength && value.length < rules.minLength) {
          errors.push(
            `${field} must be at least ${rules.minLength} characters long`
          );
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(
            `${field} must be no more than ${rules.maxLength} characters long`
          );
        }
        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push(`${field} format is invalid`);
        }
      }

      // Email validation
      if (rules.email && typeof value === "string") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push(`${field} must be a valid email address`);
        }
      }

      // Enum validation
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rules.enum.join(", ")}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize HTML input to prevent XSS
   */
  static sanitizeHtml(input) {
    if (typeof input !== "string") return input;

    return input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  }

  /**
   * JWT Authentication middleware
   */
  static authenticateToken(context, req, requiredRole = null) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      this.applyCorsHeaders(context);
      context.res = {
        status: 401,
        headers: {
          ...context.res.headers,
          "Content-Type": "application/json",
        },
        body: {
          success: false,
          error: "Access token is required",
        },
      };
      return null;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      // Role-based access control
      if (
        requiredRole &&
        decoded.role !== requiredRole &&
        decoded.role !== "admin"
      ) {
        this.applyCorsHeaders(context);
        context.res = {
          status: 403,
          headers: {
            ...context.res.headers,
            "Content-Type": "application/json",
          },
          body: {
            success: false,
            error: "Insufficient permissions",
          },
        };
        return null;
      }

      return decoded;
    } catch (error) {
      this.applyCorsHeaders(context);
      context.res = {
        status: 401,
        headers: {
          ...context.res.headers,
          "Content-Type": "application/json",
        },
        body: {
          success: false,
          error: "Invalid or expired token",
        },
      };
      return null;
    }
  }

  /**
   * Comprehensive security wrapper for Azure Functions
   */
  static secureFunction(handler, options = {}) {
    return async function (context, req) {
      try {
        // Apply security headers
        SecurityMiddleware.applyCorsHeaders(context);

        // Handle CORS preflight
        if (SecurityMiddleware.handlePreflight(context, req)) {
          return;
        }

        // Rate limiting
        if (options.rateLimit !== false) {
          if (!SecurityMiddleware.rateLimit(context, req, options.rateLimit)) {
            return;
          }
        }

        // Authentication
        let user = null;
        if (options.requireAuth) {
          user = SecurityMiddleware.authenticateToken(
            context,
            req,
            options.requiredRole
          );
          if (!user) {
            return;
          }
        }

        // Input validation
        if (options.validation && req.body) {
          const validation = SecurityMiddleware.validateInput(
            req.body,
            options.validation
          );
          if (!validation.isValid) {
            context.res = {
              status: 400,
              headers: {
                ...context.res.headers,
                "Content-Type": "application/json",
              },
              body: {
                success: false,
                error: "Validation failed",
                details: validation.errors,
              },
            };
            return;
          }
        }

        // Call the actual handler
        await handler(context, req, user);
      } catch (error) {
        context.log.error("Security middleware error:", error);

        SecurityMiddleware.applyCorsHeaders(context);
        context.res = {
          status: 500,
          headers: {
            ...context.res.headers,
            "Content-Type": "application/json",
          },
          body: {
            success: false,
            error: "Internal server error",
          },
        };
      }
    };
  }
}

module.exports = SecurityMiddleware;
