"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiterMiddleware = exports.createStrictRateLimiter = exports.createAPIRateLimiter = exports.createAuthRateLimiter = exports.RateLimiter = void 0;
class RateLimiter {
    config;
    requests = new Map();
    cleanupInterval;
    constructor(config) {
        this.config = config;
        // Clean up old entries every minute
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 60000);
    }
    middleware() {
        return (handler) => {
            return async (request, context) => {
                const clientKey = this.config.keyGenerator
                    ? this.config.keyGenerator(request)
                    : this.getClientKey(request);
                if (await this.isRateLimited(clientKey)) {
                    context.warn(`Rate limit exceeded for client: ${clientKey}`);
                    return {
                        status: 429,
                        headers: {
                            'Content-Type': 'application/json',
                            'Retry-After': Math.ceil(this.config.windowMs / 1000).toString()
                        },
                        jsonBody: {
                            success: false,
                            error: 'Too many requests. Please try again later.',
                            retryAfter: this.config.windowMs / 1000
                        }
                    };
                }
                this.recordRequest(clientKey);
                return await handler(request, context);
            };
        };
    }
    getClientKey(request) {
        // Try to get client IP from various headers
        const xForwardedFor = request.headers.get('x-forwarded-for');
        const xRealIp = request.headers.get('x-real-ip');
        const xClientIp = request.headers.get('x-client-ip');
        const clientIp = xForwardedFor?.split(',')[0]?.trim() ||
            xRealIp ||
            xClientIp ||
            'unknown';
        // Include user agent for better fingerprinting
        const userAgent = request.headers.get('user-agent') || 'unknown';
        return `${clientIp}:${Buffer.from(userAgent).toString('base64').slice(0, 20)}`;
    }
    async isRateLimited(clientKey) {
        const now = Date.now();
        const windowStart = now - this.config.windowMs;
        let requestLog = this.requests.get(clientKey);
        if (!requestLog) {
            requestLog = { timestamps: [], blocked: false };
            this.requests.set(clientKey, requestLog);
        }
        // Remove old timestamps
        requestLog.timestamps = requestLog.timestamps.filter(timestamp => timestamp > windowStart);
        // Check if rate limit exceeded
        if (requestLog.timestamps.length >= this.config.maxRequests) {
            requestLog.blocked = true;
            return true;
        }
        requestLog.blocked = false;
        return false;
    }
    recordRequest(clientKey) {
        const now = Date.now();
        const requestLog = this.requests.get(clientKey);
        if (requestLog && !requestLog.blocked) {
            requestLog.timestamps.push(now);
        }
    }
    cleanup() {
        const cutoff = Date.now() - this.config.windowMs * 2; // Keep some history
        for (const [key, requestLog] of this.requests.entries()) {
            requestLog.timestamps = requestLog.timestamps.filter(timestamp => timestamp > cutoff);
            // Remove empty entries
            if (requestLog.timestamps.length === 0) {
                this.requests.delete(key);
            }
        }
    }
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.requests.clear();
    }
}
exports.RateLimiter = RateLimiter;
exports.RateLimiterMiddleware = RateLimiter;
// Predefined rate limiters for different endpoints
const createAuthRateLimiter = () => new RateLimiter({
    maxRequests: 5, // 5 login attempts
    windowMs: 15 * 60 * 1000 // 15 minutes
});
exports.createAuthRateLimiter = createAuthRateLimiter;
const createAPIRateLimiter = () => new RateLimiter({
    maxRequests: 100, // 100 requests
    windowMs: 15 * 60 * 1000 // 15 minutes
});
exports.createAPIRateLimiter = createAPIRateLimiter;
const createStrictRateLimiter = () => new RateLimiter({
    maxRequests: 10, // 10 requests
    windowMs: 60 * 1000 // 1 minute
});
exports.createStrictRateLimiter = createStrictRateLimiter;
