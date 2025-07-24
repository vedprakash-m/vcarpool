"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizedBodySymbol = exports.sanitizedQuerySymbol = exports.SanitizationMiddleware = void 0;
const isomorphic_dompurify_1 = __importDefault(require("isomorphic-dompurify"));
const logger_1 = require("../utils/logger");
// Use symbols to avoid property name collisions
const sanitizedQuerySymbol = Symbol("sanitizedQuery");
exports.sanitizedQuerySymbol = sanitizedQuerySymbol;
const sanitizedBodySymbol = Symbol("sanitizedBody");
exports.sanitizedBodySymbol = sanitizedBodySymbol;
/**
 * Fixed Input sanitization middleware for Azure Functions
 */
class SanitizationMiddleware {
    static SUSPICIOUS_PATTERNS = [
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
    static sanitizeString(value) {
        if (typeof value !== "string") {
            return value;
        }
        let sanitized = value.replace(/\0/g, "").trim();
        sanitized = isomorphic_dompurify_1.default.sanitize(sanitized, {
            ALLOWED_TAGS: [],
            ALLOWED_ATTR: [],
            KEEP_CONTENT: true,
        });
        return sanitized;
    }
    /**
     * Validates input against suspicious patterns
     */
    static validateInput(value, fieldName) {
        for (const pattern of this.SUSPICIOUS_PATTERNS) {
            if (pattern.test(value)) {
                logger_1.logger.warn("Suspicious pattern detected", {
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
    static sanitizeObject(obj) {
        if (obj === null || obj === undefined) {
            return obj;
        }
        if (typeof obj === "string") {
            return this.sanitizeString(obj);
        }
        if (typeof obj === "number" || typeof obj === "boolean") {
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map((item) => this.sanitizeObject(item));
        }
        if (typeof obj === "object") {
            const sanitized = {};
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
    static sanitizeRequestData(request) {
        const result = {
            sanitizedQuery: {},
            sanitizedBody: null,
        };
        try {
            // Handle query parameters
            if (request.query) {
                const queryEntries = Array.from(request.query.entries());
                for (const [key, value] of queryEntries) {
                    if (key && value) {
                        this.validateInput(value, `query.${key}`);
                        result.sanitizedQuery[this.sanitizeString(key)] =
                            this.sanitizeString(value);
                    }
                }
            }
            // Handle request body
            if (request.body) {
                if (typeof request.body === "string") {
                    try {
                        const parsed = JSON.parse(request.body);
                        result.sanitizedBody = this.sanitizeObject(parsed);
                    }
                    catch (error) {
                        this.validateInput(request.body, "body");
                        result.sanitizedBody = this.sanitizeString(request.body);
                    }
                }
                else {
                    result.sanitizedBody = this.sanitizeObject(request.body);
                }
            }
            return result;
        }
        catch (error) {
            logger_1.logger.error("Request sanitization failed", {
                error: error instanceof Error ? error.message : "Unknown error",
            });
            throw new Error("Invalid input detected in request");
        }
    }
    /**
     * Middleware function that returns sanitized data
     */
    static middleware() {
        return (handler) => {
            return async (request, context) => {
                try {
                    const sanitizedData = this.sanitizeRequestData(request);
                    // Attach sanitized data to context using symbols
                    context[sanitizedQuerySymbol] = sanitizedData.sanitizedQuery;
                    context[sanitizedBodySymbol] = sanitizedData.sanitizedBody;
                    return handler(request, context);
                }
                catch (error) {
                    logger_1.logger.error("Sanitization middleware failed", {
                        error: error instanceof Error ? error.message : "Unknown error",
                    });
                    return {
                        status: 400,
                        headers: { "Content-Type": "application/json" },
                        jsonBody: {
                            success: false,
                            message: "Invalid input detected",
                            timestamp: new Date().toISOString(),
                        },
                    };
                }
            };
        };
    }
}
exports.SanitizationMiddleware = SanitizationMiddleware;
exports.default = SanitizationMiddleware;
