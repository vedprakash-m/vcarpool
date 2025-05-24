"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const error_handler_1 = require("../utils/error-handler");
// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
const JWT_EXPIRES_IN = '24h';
const JWT_REFRESH_EXPIRES_IN = '7d';
class AuthService {
    userRepository;
    // Static methods for backward compatibility
    static async hashPassword(password) {
        const saltRounds = 12;
        return bcryptjs_1.default.hash(password, saltRounds);
    }
    static async verifyPassword(password, hash) {
        return bcryptjs_1.default.compare(password, hash);
    }
    static generateAccessToken(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
        };
        return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    }
    static generateRefreshToken(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
        };
        return jsonwebtoken_1.default.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
    }
    logger;
    constructor(userRepository, logger) {
        this.userRepository = userRepository;
        // Use provided logger or create a simple implementation
        this.logger = logger || {
            debug: (message, data) => console.debug(message, data),
            info: (message, data) => console.info(message, data),
            warn: (message, data) => console.warn(message, data),
            error: (message, error) => console.error(message, error),
            setContext: () => { },
            child: () => this.logger,
            startTimer: (label) => () => console.time(label)
        };
    }
    /**
     * Hash password using bcrypt
     */
    async hashPasswordInstance(password) {
        const saltRounds = 12;
        return bcryptjs_1.default.hash(password, saltRounds);
    }
    /**
     * Verify password against hash
     */
    async verifyPasswordInstance(password, hash) {
        return bcryptjs_1.default.compare(password, hash);
    }
    /**
     * Generate JWT access token
     */
    generateAccessTokenInstance(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role
        };
        return jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN
        });
    }
    /**
     * Generate JWT refresh token
     */
    generateRefreshTokenInstance(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role
        };
        return jsonwebtoken_1.default.sign(payload, JWT_REFRESH_SECRET, {
            expiresIn: JWT_REFRESH_EXPIRES_IN
        });
    }
    /**
     * Verify and decode JWT access token
     */
    verifyAccessToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, JWT_SECRET);
        }
        catch (error) {
            throw error_handler_1.Errors.Unauthorized('Invalid or expired token');
        }
    }
    /**
     * Verify and decode JWT refresh token
     */
    verifyRefreshToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, JWT_REFRESH_SECRET);
        }
        catch (error) {
            throw error_handler_1.Errors.Unauthorized('Invalid or expired refresh token');
        }
    }
    /**
     * Extract token from Authorization header
     */
    extractTokenFromHeader(authHeader) {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        return authHeader.substring(7); // Remove 'Bearer ' prefix
    }
    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken(refreshToken) {
        try {
            // Verify the refresh token
            const payload = this.verifyRefreshToken(refreshToken);
            // Get user from database
            const user = await this.userRepository.findById(payload.userId);
            if (!user) {
                throw error_handler_1.Errors.NotFound('User not found');
            }
            // Generate new access token
            const accessToken = this.generateAccessTokenInstance(user);
            return { accessToken, user };
        }
        catch (error) {
            throw error_handler_1.Errors.Unauthorized('Invalid refresh token');
        }
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map