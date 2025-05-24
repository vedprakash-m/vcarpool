/**
 * Utility functions for date and time operations
 */
export declare const dateUtils: {
    /**
     * Format date to YYYY-MM-DD string
     */
    formatDate: (date: Date) => string;
    /**
     * Parse date from string
     */
    parseDate: (dateString: string) => Date;
    /**
     * Check if date is today
     */
    isToday: (date: Date) => boolean;
    /**
     * Check if date is in the future
     */
    isFuture: (date: Date) => boolean;
    /**
     * Get day of week (0 = Sunday, 6 = Saturday)
     */
    getDayOfWeek: (date: Date) => number;
    /**
     * Add days to a date
     */
    addDays: (date: Date, days: number) => Date;
};
/**
 * Utility functions for arrays
 */
export declare const arrayUtils: {
    /**
     * Remove duplicates from array
     */
    unique: <T>(array: T[]) => T[];
    /**
     * Group array items by key
     */
    groupBy: <T, K extends keyof T>(array: T[], key: K) => Record<string, T[]>;
    /**
     * Chunk array into smaller arrays
     */
    chunk: <T>(array: T[], size: number) => T[][];
};
/**
 * Utility functions for strings
 */
export declare const stringUtils: {
    /**
     * Capitalize first letter
     */
    capitalize: (str: string) => string;
    /**
     * Convert to title case
     */
    toTitleCase: (str: string) => string;
    /**
     * Generate random string
     */
    randomString: (length: number) => string;
    /**
     * Truncate string with ellipsis
     */
    truncate: (str: string, maxLength: number) => string;
};
/**
 * Utility functions for validation
 */
export declare const validationUtils: {
    /**
     * Check if email is valid
     */
    isValidEmail: (email: string) => boolean;
    /**
     * Check if phone number is valid
     */
    isValidPhone: (phone: string) => boolean;
    /**
     * Check if time format is valid (HH:MM)
     */
    isValidTime: (time: string) => boolean;
};
/**
 * Utility functions for formatting
 */
export declare const formatUtils: {
    /**
     * Format currency
     */
    currency: (amount: number, currency?: string) => string;
    /**
     * Format distance
     */
    distance: (meters: number) => string;
    /**
     * Format duration
     */
    duration: (minutes: number) => string;
};
/**
 * Async utility functions
 */
export declare const asyncUtils: {
    /**
     * Sleep for specified milliseconds
     */
    sleep: (ms: number) => Promise<void>;
    /**
     * Retry function with exponential backoff
     */
    retry: <T>(fn: () => Promise<T>, maxAttempts?: number, baseDelay?: number) => Promise<T>;
};
//# sourceMappingURL=utils.d.ts.map