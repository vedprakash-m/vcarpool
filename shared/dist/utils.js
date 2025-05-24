"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncUtils = exports.formatUtils = exports.validationUtils = exports.stringUtils = exports.arrayUtils = exports.dateUtils = void 0;
/**
 * Utility functions for date and time operations
 */
exports.dateUtils = {
    /**
     * Format date to YYYY-MM-DD string
     */
    formatDate: (date) => {
        return date.toISOString().split('T')[0];
    },
    /**
     * Parse date from string
     */
    parseDate: (dateString) => {
        return new Date(dateString);
    },
    /**
     * Check if date is today
     */
    isToday: (date) => {
        const today = new Date();
        return exports.dateUtils.formatDate(date) === exports.dateUtils.formatDate(today);
    },
    /**
     * Check if date is in the future
     */
    isFuture: (date) => {
        return date > new Date();
    },
    /**
     * Get day of week (0 = Sunday, 6 = Saturday)
     */
    getDayOfWeek: (date) => {
        return date.getDay();
    },
    /**
     * Add days to a date
     */
    addDays: (date, days) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }
};
/**
 * Utility functions for arrays
 */
exports.arrayUtils = {
    /**
     * Remove duplicates from array
     */
    unique: (array) => {
        return Array.from(new Set(array));
    },
    /**
     * Group array items by key
     */
    groupBy: (array, key) => {
        return array.reduce((groups, item) => {
            const group = String(item[key]);
            if (!groups[group]) {
                groups[group] = [];
            }
            groups[group].push(item);
            return groups;
        }, {});
    },
    /**
     * Chunk array into smaller arrays
     */
    chunk: (array, size) => {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
};
/**
 * Utility functions for strings
 */
exports.stringUtils = {
    /**
     * Capitalize first letter
     */
    capitalize: (str) => {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },
    /**
     * Convert to title case
     */
    toTitleCase: (str) => {
        return str.split(' ').map(word => exports.stringUtils.capitalize(word)).join(' ');
    },
    /**
     * Generate random string
     */
    randomString: (length) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },
    /**
     * Truncate string with ellipsis
     */
    truncate: (str, maxLength) => {
        if (str.length <= maxLength)
            return str;
        return str.slice(0, maxLength - 3) + '...';
    }
};
/**
 * Utility functions for validation
 */
exports.validationUtils = {
    /**
     * Check if email is valid
     */
    isValidEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    /**
     * Check if phone number is valid
     */
    isValidPhone: (phone) => {
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
        return phoneRegex.test(phone) && phone.length >= 10;
    },
    /**
     * Check if time format is valid (HH:MM)
     */
    isValidTime: (time) => {
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return timeRegex.test(time);
    }
};
/**
 * Utility functions for formatting
 */
exports.formatUtils = {
    /**
     * Format currency
     */
    currency: (amount, currency = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency
        }).format(amount);
    },
    /**
     * Format distance
     */
    distance: (meters) => {
        if (meters < 1000) {
            return `${meters}m`;
        }
        return `${(meters / 1000).toFixed(1)}km`;
    },
    /**
     * Format duration
     */
    duration: (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours === 0) {
            return `${mins}m`;
        }
        return `${hours}h ${mins}m`;
    }
};
/**
 * Async utility functions
 */
exports.asyncUtils = {
    /**
     * Sleep for specified milliseconds
     */
    sleep: (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    /**
     * Retry function with exponential backoff
     */
    retry: async (fn, maxAttempts = 3, baseDelay = 1000) => {
        let lastError;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            }
            catch (error) {
                lastError = error;
                if (attempt === maxAttempts) {
                    throw lastError;
                }
                const delay = baseDelay * Math.pow(2, attempt - 1);
                await exports.asyncUtils.sleep(delay);
            }
        }
        throw lastError;
    }
};
//# sourceMappingURL=utils.js.map