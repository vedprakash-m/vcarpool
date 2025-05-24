export * from './types';
export * from './validations';
export * from './schemas/trip-params';
export * from './schemas/user-params';
export * from './utils';
export declare const APP_CONFIG: {
    MAX_PASSENGERS_PER_TRIP: number;
    DEFAULT_TRIP_COST: number;
    NOTIFICATION_DELAY_MINUTES: number;
    MAX_SWAP_REQUESTS_PER_DAY: number;
    SESSION_TIMEOUT_HOURS: number;
    PASSWORD_MIN_LENGTH: number;
};
export declare const ERROR_CODES: {
    VALIDATION_ERROR: string;
    NOT_FOUND: string;
    UNAUTHORIZED: string;
    FORBIDDEN: string;
    CONFLICT: string;
    INTERNAL_ERROR: string;
    RATE_LIMITED: string;
};
export declare const SUCCESS_MESSAGES: {
    USER_CREATED: string;
    USER_UPDATED: string;
    TRIP_CREATED: string;
    TRIP_UPDATED: string;
    TRIP_CANCELLED: string;
    SWAP_REQUEST_SENT: string;
    SWAP_REQUEST_ACCEPTED: string;
    SWAP_REQUEST_REJECTED: string;
};
//# sourceMappingURL=index.d.ts.map