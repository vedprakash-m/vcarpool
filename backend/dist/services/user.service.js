"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const uuid_1 = require("uuid");
const user_repository_1 = require("../repositories/user.repository");
const error_handler_1 = require("../utils/error-handler");
class UserService {
    userRepository;
    // Static methods for backward compatibility
    static async getUserByEmail(email) {
        // Create a temporary instance for static calls
        const { containers } = await Promise.resolve().then(() => __importStar(require('../config/database')));
        const userRepository = new user_repository_1.UserRepository(containers.users);
        const userService = new UserService(userRepository);
        return userService.getUserByEmail(email);
    }
    static async createUser(userData) {
        const { containers } = await Promise.resolve().then(() => __importStar(require('../config/database')));
        const userRepository = new user_repository_1.UserRepository(containers.users);
        const userService = new UserService(userRepository);
        return userService.createUser(userData);
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
     * Create a new user
     */
    async createUser(userData) {
        try {
            // Check if user with this email already exists
            const existingUser = await this.userRepository.findByEmail(userData.email);
            if (existingUser) {
                throw error_handler_1.Errors.Conflict('User with this email already exists');
            }
            const user = {
                id: (0, uuid_1.v4)(),
                email: userData.email,
                firstName: userData.firstName,
                lastName: userData.lastName,
                phoneNumber: userData.phoneNumber,
                department: userData.department,
                role: 'parent', // Default role
                preferences: {
                    pickupLocation: '',
                    dropoffLocation: '',
                    preferredTime: '08:00',
                    isDriver: false,
                    smokingAllowed: false,
                    notifications: {
                        email: true,
                        sms: false,
                        tripReminders: true,
                        swapRequests: true,
                        scheduleChanges: true
                    }
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };
            // Store user with password hash
            const userWithPassword = {
                ...user,
                passwordHash: userData.passwordHash
            };
            await this.userRepository.create(userWithPassword);
            // Return user without password hash
            return user;
        }
        catch (error) {
            console.error('Error creating user:', error);
            if (error instanceof Error) {
                throw error; // Re-throw AppErrors
            }
            throw error_handler_1.Errors.InternalServerError(`Error creating user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Find user by email (instance method)
     */
    async findByEmail(email) {
        try {
            const userWithPassword = await this.userRepository.findByEmail(email);
            if (!userWithPassword)
                return null;
            // Remove password hash from response
            const { passwordHash, ...user } = userWithPassword;
            return user;
        }
        catch (error) {
            this.logger.error(`Error finding user by email ${email}:`, error);
            throw error_handler_1.Errors.InternalServerError(`Error finding user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get user by ID
     */
    async getUserById(userId) {
        try {
            return await this.userRepository.findById(userId);
        }
        catch (error) {
            console.error(`Error fetching user ${userId}:`, error);
            throw error_handler_1.Errors.InternalServerError(`Error fetching user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get user by email
     */
    async getUserByEmail(email) {
        try {
            return (await this.userRepository.findByEmail(email));
        }
        catch (error) {
            console.error(`Error fetching user by email ${email}:`, error);
            throw error_handler_1.Errors.InternalServerError(`Error fetching user by email: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Update user profile
     */
    async updateUser(userId, updates) {
        try {
            const existingUser = await this.userRepository.findById(userId);
            if (!existingUser) {
                return null;
            }
            // Merge user preferences if provided
            const updatedPreferences = updates.preferences
                ? {
                    ...existingUser.preferences,
                    ...updates.preferences,
                    notifications: updates.preferences.notifications
                        ? { ...existingUser.preferences.notifications, ...updates.preferences.notifications }
                        : existingUser.preferences.notifications
                }
                : existingUser.preferences;
            const updatedUser = {
                ...existingUser,
                firstName: updates.firstName ?? existingUser.firstName,
                lastName: updates.lastName ?? existingUser.lastName,
                phoneNumber: updates.phoneNumber ?? existingUser.phoneNumber,
                department: updates.department ?? existingUser.department,
                preferences: updatedPreferences,
                updatedAt: new Date()
            };
            return await this.userRepository.update(userId, updatedUser);
        }
        catch (error) {
            console.error(`Error updating user ${userId}:`, error);
            throw error_handler_1.Errors.InternalServerError(`Error updating user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Delete user
     */
    async deleteUser(userId) {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                return false;
            }
            await this.userRepository.delete(userId);
            return true;
        }
        catch (error) {
            console.error(`Error deleting user ${userId}:`, error);
            throw error_handler_1.Errors.InternalServerError(`Error deleting user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get all users with pagination
     */
    async getUsers(options = {}) {
        try {
            let query = 'SELECT * FROM c';
            const parameters = [];
            // Add search filter if provided
            if (options.searchTerm) {
                query += ` WHERE CONTAINS(
          LOWER(c.firstName), @searchTerm) OR 
          CONTAINS(LOWER(c.lastName), @searchTerm) OR 
          CONTAINS(LOWER(c.email), @searchTerm)`;
                parameters.push({
                    name: '@searchTerm',
                    value: options.searchTerm.toLowerCase()
                });
            }
            // Add ordering
            query += ' ORDER BY c.lastName';
            // Get all users with the filter
            const users = await this.userRepository.query({ query, parameters });
            // Calculate total count
            const total = users.length;
            // Apply pagination in the service layer
            let paginatedUsers = users;
            if (options.limit && options.limit > 0) {
                const offset = options.offset || 0;
                paginatedUsers = users.slice(offset, offset + options.limit);
            }
            // Remove password hashes
            const sanitizedUsers = paginatedUsers.map(user => {
                // Use type casting to handle the password hash property
                const userWithPassword = user;
                const { passwordHash, ...userWithoutPassword } = userWithPassword;
                return userWithoutPassword;
            });
            return {
                users: sanitizedUsers,
                total
            };
        }
        catch (error) {
            console.error('Error fetching users:', error);
            throw error_handler_1.Errors.InternalServerError(`Error fetching users: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
exports.UserService = UserService;
//# sourceMappingURL=user.service.js.map