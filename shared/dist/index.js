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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUCCESS_MESSAGES = exports.ERROR_CODES = exports.APP_CONFIG = void 0;
// Export all types
__exportStar(require("./types"), exports);
// Export all validation schemas
__exportStar(require("./validations"), exports);
// Export parameter validation schemas
__exportStar(require("./schemas/trip-params"), exports);
__exportStar(require("./schemas/user-params"), exports);
// Export all utilities
__exportStar(require("./utils"), exports);
// Constants
exports.APP_CONFIG = {
    MAX_PASSENGERS_PER_TRIP: 8,
    DEFAULT_TRIP_COST: 5.00,
    NOTIFICATION_DELAY_MINUTES: 30,
    MAX_SWAP_REQUESTS_PER_DAY: 3,
    SESSION_TIMEOUT_HOURS: 24,
    PASSWORD_MIN_LENGTH: 8
};
exports.ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    CONFLICT: 'CONFLICT',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    RATE_LIMITED: 'RATE_LIMITED'
};
exports.SUCCESS_MESSAGES = {
    USER_CREATED: 'User account created successfully',
    USER_UPDATED: 'User profile updated successfully',
    TRIP_CREATED: 'Trip created successfully',
    TRIP_UPDATED: 'Trip updated successfully',
    TRIP_CANCELLED: 'Trip cancelled successfully',
    SWAP_REQUEST_SENT: 'Swap request sent successfully',
    SWAP_REQUEST_ACCEPTED: 'Swap request accepted',
    SWAP_REQUEST_REJECTED: 'Swap request rejected'
};
//# sourceMappingURL=index.js.map