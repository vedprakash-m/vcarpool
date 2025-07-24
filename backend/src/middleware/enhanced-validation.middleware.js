"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationMiddleware = void 0;
const zod_1 = require("zod");
const logger_1 = require("../utils/logger");
/**
 * Enhanced validation middleware with comprehensive security checks
 */
class ValidationMiddleware {
    static MAX_STRING_LENGTH = 10000;
    static MAX_ARRAY_LENGTH = 1000;
    static MAX_OBJECT_DEPTH = 10;
    static MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB
    /**
     * Custom Zod transformations for security
     */
    static secureString = (maxLength = 255) => zod_1.z
        .string()
        .trim()
        .max(maxLength, `String too long (max ${maxLength} characters)`)
        .refine((val) => !this.containsSuspiciousPatterns(val), "String contains suspicious patterns");
    static secureEmail = zod_1.z
        .string()
        .email("Invalid email format")
        .max(254, "Email too long")
        .toLowerCase()
        .refine((val) => this.isValidEmailDomain(val), "Email domain not allowed");
    static secureUrl = zod_1.z
        .string()
        .url("Invalid URL format")
        .refine((val) => this.isAllowedUrl(val), "URL not allowed");
    static secureId = zod_1.z.string().uuid("Invalid ID format");
    static securePhoneNumber = zod_1.z
        .string()
        .regex(/^[+\d\s\-\(\)]{10,15}$/, "Invalid phone number format")
        .transform((val) => val.replace(/\s/g, ""));
    static securePassword = zod_1.z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(128, "Password too long")
        .refine((val) => this.isStrongPassword(val), "Password does not meet security requirements");
    /**
     * Enhanced common schemas with security validations
     */
    static schemas = {
        // User schemas
        userRegistration: zod_1.z.object({
            email: this.secureEmail,
            password: this.securePassword,
            firstName: this.secureString(50),
            lastName: this.secureString(50),
            phone: this.securePhoneNumber.optional(),
            role: zod_1.z.enum(["admin", "parent", "student"]),
        }),
        userUpdate: zod_1.z.object({
            firstName: this.secureString(50).optional(),
            lastName: this.secureString(50).optional(),
            phone: this.securePhoneNumber.optional(),
            profilePicture: this.secureUrl.optional(),
        }),
        loginRequest: zod_1.z.object({
            email: this.secureEmail,
            password: zod_1.z.string().min(1, "Password required"),
        }),
        // Carpool schemas
        carpoolCreate: zod_1.z
            .object({
            origin: this.secureString(200),
            destination: this.secureString(200),
            departureTime: zod_1.z.string().datetime("Invalid departure time"),
            capacity: zod_1.z.number().int().min(1).max(8),
            price: zod_1.z.number().min(0).max(1000),
            description: this.secureString(1000).optional(),
            recurring: zod_1.z.boolean().optional(),
            recurrencePattern: zod_1.z.enum(["daily", "weekly", "monthly"]).optional(),
        })
            .refine((data) => {
            const depTime = new Date(data.departureTime);
            const now = new Date();
            return depTime > now;
        }, "Departure time must be in the future"),
        carpoolUpdate: zod_1.z.object({
            origin: this.secureString(200).optional(),
            destination: this.secureString(200).optional(),
            departureTime: zod_1.z.string().datetime("Invalid departure time").optional(),
            capacity: zod_1.z.number().int().min(1).max(8).optional(),
            price: zod_1.z.number().min(0).max(1000).optional(),
            description: this.secureString(1000).optional(),
            status: zod_1.z.enum(["active", "cancelled", "completed"]).optional(),
        }),
        carpoolSearch: zod_1.z.object({
            origin: this.secureString(200).optional(),
            destination: this.secureString(200).optional(),
            date: zod_1.z.string().date("Invalid date").optional(),
            maxPrice: zod_1.z.number().min(0).max(1000).optional(),
            minSeats: zod_1.z.number().int().min(1).max(8).optional(),
            page: zod_1.z.number().int().min(1).default(1),
            limit: zod_1.z.number().int().min(1).max(100).default(20),
        }),
        // Booking schemas
        bookingCreate: zod_1.z.object({
            carpoolId: this.secureId,
            seats: zod_1.z.number().int().min(1).max(8),
            notes: this.secureString(500).optional(),
        }),
        bookingUpdate: zod_1.z.object({
            status: zod_1.z.enum(["pending", "confirmed", "cancelled"]),
            notes: this.secureString(500).optional(),
        }),
        // Message schemas
        messageCreate: zod_1.z.object({
            recipientId: this.secureId,
            subject: this.secureString(200),
            content: this.secureString(5000),
            priority: zod_1.z.enum(["low", "normal", "high"]).default("normal"),
        }),
        // Notification schemas
        notificationUpdate: zod_1.z.object({
            read: zod_1.z.boolean(),
        }),
        // Rating schemas
        ratingCreate: zod_1.z.object({
            carpoolId: this.secureId,
            rating: zod_1.z.number().int().min(1).max(5),
            comment: this.secureString(1000).optional(),
        }),
        // Generic schemas
        idParam: zod_1.z.object({
            id: this.secureId,
        }),
        paginationQuery: zod_1.z.object({
            page: zod_1.z.coerce.number().int().min(1).default(1),
            limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
            sortBy: this.secureString(50).optional(),
            sortOrder: zod_1.z.enum(["asc", "desc"]).default("desc"),
        }),
    };
    /**
     * Validates password strength
     */
    static isStrongPassword(password) {
        const hasLower = /[a-z]/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
        return hasLower && hasUpper && hasNumber && hasSpecial;
    }
    /**
     * Checks for suspicious patterns in strings
     */
    static containsSuspiciousPatterns(value) {
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
    static isValidEmailDomain(email) {
        const domain = email.split("@")[1];
        // Block known problematic domains
        const blockedDomains = [
            "tempmail.org",
            "10minutemail.com",
            "guerrillamail.com",
            "mailinator.com",
        ];
        return !blockedDomains.includes(domain.toLowerCase());
    }
    /**
     * Validates URL against allowed patterns
     */
    static isAllowedUrl(url) {
        try {
            const urlObj = new URL(url);
            // Only allow HTTPS for external URLs
            if (!["https:", "http:"].includes(urlObj.protocol)) {
                return false;
            }
            // Block localhost and private IPs in production
            if (process.env.NODE_ENV === "production") {
                const hostname = urlObj.hostname.toLowerCase();
                if (hostname === "localhost" ||
                    hostname.startsWith("127.") ||
                    hostname.startsWith("192.168.") ||
                    hostname.startsWith("10.") ||
                    hostname.startsWith("172.")) {
                    return false;
                }
            }
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Validates object depth to prevent prototype pollution
     */
    static validateObjectDepth(obj, currentDepth = 0) {
        if (currentDepth > this.MAX_OBJECT_DEPTH) {
            return false;
        }
        if (obj && typeof obj === "object") {
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
    static validateRequestSize(request) {
        const contentLength = request.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > this.MAX_PAYLOAD_SIZE) {
            throw new Error(`Payload size exceeds limit of ${this.MAX_PAYLOAD_SIZE} bytes`);
        }
        // Check overall request size (approximation)
        const requestSize = JSON.stringify(request).length;
        if (requestSize > this.MAX_PAYLOAD_SIZE * 1.2) {
            // Allow some overhead
            throw new Error(`Request size exceeds limit`);
        }
    }
    /**
     * Validates request and returns typed data
     */
    static validateRequest(schema, source = "body") {
        return (request) => {
            let dataToValidate;
            if (source === "body") {
                dataToValidate = request.body;
            }
            else if (source === "query") {
                dataToValidate = Object.fromEntries(request.query.entries());
            }
            else if (source === "params") {
                dataToValidate = request.params;
            }
            if (dataToValidate &&
                !this.validateObjectDepth(dataToValidate)) {
                throw new Error("Object nesting level exceeds maximum depth");
            }
            try {
                // Use zod schema to parse and validate
                return schema.parse(dataToValidate);
            }
            catch (error) {
                logger_1.logger.warn("Validation failed", {
                    validation: source,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
                throw new Error(`Validation failed for ${source}: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
        };
    }
    /**
     * Batch validation for multiple data sources
     */
    static validateMultiple(validations) {
        const results = {};
        for (const { data, schema, name } of validations) {
            try {
                results[name] = schema.parse(data);
            }
            catch (error) {
                logger_1.logger.warn("Batch validation failed", {
                    validation: name,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
                throw new Error(`Validation failed for ${name}: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
        }
        return results;
    }
}
exports.ValidationMiddleware = ValidationMiddleware;
