import { HttpRequest, InvocationContext } from '@azure/functions';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (request: HttpRequest) => string;
}

interface RequestLog {
  timestamps: number[];
  blocked: boolean;
}

export class RateLimiter {
  private requests = new Map<string, RequestLog>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private config: RateLimitConfig) {
    // Clean up old entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  middleware() {
    return (handler: Function) => {
      return async (request: HttpRequest, context: InvocationContext) => {
        const clientKey = this.config.keyGenerator
          ? this.config.keyGenerator(request)
          : this.getClientKey(request);

        if (await this.isRateLimited(clientKey)) {
          context.warn(`Rate limit exceeded for client: ${clientKey}`);
          return {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil(this.config.windowMs / 1000).toString(),
            },
            jsonBody: {
              success: false,
              error: 'Too many requests. Please try again later.',
              retryAfter: this.config.windowMs / 1000,
            },
          };
        }

        this.recordRequest(clientKey);
        return await handler(request, context);
      };
    };
  }

  private getClientKey(request: HttpRequest): string {
    // Try to get client IP from various headers
    const xForwardedFor = request.headers.get('x-forwarded-for');
    const xRealIp = request.headers.get('x-real-ip');
    const xClientIp = request.headers.get('x-client-ip');

    const clientIp = xForwardedFor?.split(',')[0]?.trim() || xRealIp || xClientIp || 'unknown';

    // Include user agent for better fingerprinting
    const userAgent = request.headers.get('user-agent') || 'unknown';
    return `${clientIp}:${Buffer.from(userAgent).toString('base64').slice(0, 20)}`;
  }

  private async isRateLimited(clientKey: string): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    let requestLog = this.requests.get(clientKey);
    if (!requestLog) {
      requestLog = { timestamps: [], blocked: false };
      this.requests.set(clientKey, requestLog);
    }

    // Remove old timestamps
    requestLog.timestamps = requestLog.timestamps.filter((timestamp) => timestamp > windowStart);

    // Check if rate limit exceeded
    if (requestLog.timestamps.length >= this.config.maxRequests) {
      requestLog.blocked = true;
      return true;
    }

    requestLog.blocked = false;
    return false;
  }

  private recordRequest(clientKey: string): void {
    const now = Date.now();
    const requestLog = this.requests.get(clientKey);

    if (requestLog && !requestLog.blocked) {
      requestLog.timestamps.push(now);
    }
  }

  private cleanup(): void {
    const cutoff = Date.now() - this.config.windowMs * 2; // Keep some history

    for (const [key, requestLog] of this.requests.entries()) {
      requestLog.timestamps = requestLog.timestamps.filter((timestamp) => timestamp > cutoff);

      // Remove empty entries
      if (requestLog.timestamps.length === 0) {
        this.requests.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.requests.clear();
  }
}

// Predefined rate limiters for different endpoints
export const createAuthRateLimiter = () =>
  new RateLimiter({
    maxRequests: 5, // 5 login attempts
    windowMs: 15 * 60 * 1000, // 15 minutes
  });

export const createAPIRateLimiter = () =>
  new RateLimiter({
    maxRequests: 100, // 100 requests
    windowMs: 15 * 60 * 1000, // 15 minutes
  });

export const createStrictRateLimiter = () =>
  new RateLimiter({
    maxRequests: 10, // 10 requests
    windowMs: 60 * 1000, // 1 minute
  });

// Export for backward compatibility
export { RateLimiter as RateLimiterMiddleware };
