"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userQuerySchema = exports.tripQuerySchema = exports.paginationSchema = exports.registerSchema = exports.loginSchema = exports.createSwapRequestSchema = exports.createScheduleSchema = exports.updateTripSchema = exports.createTripValidation = exports.createTripSchema = exports.updateUserSchema = exports.createUserSchema = exports.userPreferencesSchema = void 0;
const zod_1 = require("zod");
// User validation schemas
exports.userPreferencesSchema = zod_1.z.object({
    pickupLocation: zod_1.z.string().min(1, 'Pickup location is required'),
    dropoffLocation: zod_1.z.string().min(1, 'Dropoff location is required'),
    preferredTime: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    isDriver: zod_1.z.boolean(),
    maxPassengers: zod_1.z.number().min(1).max(8).optional(),
    smokingAllowed: zod_1.z.boolean(),
    musicPreference: zod_1.z.string().optional(),
    notifications: zod_1.z.object({
        email: zod_1.z.boolean(),
        sms: zod_1.z.boolean(),
        tripReminders: zod_1.z.boolean(),
        swapRequests: zod_1.z.boolean(),
        scheduleChanges: zod_1.z.boolean()
    })
});
exports.createUserSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    firstName: zod_1.z.string().min(1, 'First name is required'),
    lastName: zod_1.z.string().min(1, 'Last name is required'),
    phoneNumber: zod_1.z.string().optional(),
    department: zod_1.z.string().optional()
});
exports.updateUserSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1).optional(),
    lastName: zod_1.z.string().min(1).optional(),
    phoneNumber: zod_1.z.string().optional(),
    department: zod_1.z.string().optional(),
    preferences: exports.userPreferencesSchema.optional()
});
// Trip validation schemas
exports.createTripSchema = zod_1.z.object({
    date: zod_1.z.string().refine((date) => {
        const tripDate = new Date(date);
        return !isNaN(tripDate.getTime());
    }, 'Invalid date format'),
    departureTime: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
    arrivalTime: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
    destination: zod_1.z.string().min(1, 'Destination is required'),
    maxPassengers: zod_1.z.number().min(1, 'At least 1 passenger required').max(8, 'Maximum 8 passengers allowed'),
    cost: zod_1.z.number().min(0, 'Cost cannot be negative').optional(),
    notes: zod_1.z.string().optional()
});
exports.createTripValidation = exports.createTripSchema;
exports.updateTripSchema = zod_1.z.object({
    date: zod_1.z.string().refine((date) => {
        const tripDate = new Date(date);
        return !isNaN(tripDate.getTime());
    }, 'Invalid date format').optional(),
    departureTime: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    arrivalTime: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    destination: zod_1.z.string().min(1).optional(),
    maxPassengers: zod_1.z.number().min(1).max(8).optional(),
    cost: zod_1.z.number().min(0).optional(),
    notes: zod_1.z.string().optional(),
    status: zod_1.z.enum(['planned', 'active', 'completed', 'cancelled']).optional()
});
// Schedule validation schemas
exports.createScheduleSchema = zod_1.z.object({
    recurring: zod_1.z.boolean(),
    startDate: zod_1.z.string().datetime(),
    endDate: zod_1.z.string().datetime().optional(),
    daysOfWeek: zod_1.z.array(zod_1.z.number().min(0).max(6)),
    departureTime: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    isDriver: zod_1.z.boolean(),
    maxPassengers: zod_1.z.number().min(1).max(8).optional()
});
// Swap request validation schemas
exports.createSwapRequestSchema = zod_1.z.object({
    targetUserId: zod_1.z.string().uuid(),
    requestedDate: zod_1.z.string().datetime(),
    offerDate: zod_1.z.string().datetime(),
    reason: zod_1.z.string().optional()
});
// Auth validation schemas
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1, 'Password is required')
});
exports.registerSchema = exports.createUserSchema;
// Pagination schema
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.number().min(1).default(1),
    limit: zod_1.z.number().min(1).max(100).default(10)
});
// Query schemas
exports.tripQuerySchema = zod_1.z.object({
    date: zod_1.z.string().datetime().optional(),
    driverId: zod_1.z.string().uuid().optional(),
    status: zod_1.z.enum(['planned', 'active', 'completed', 'cancelled']).optional()
}).merge(exports.paginationSchema);
exports.userQuerySchema = zod_1.z.object({
    department: zod_1.z.string().optional(),
    isDriver: zod_1.z.boolean().optional()
}).merge(exports.paginationSchema);
//# sourceMappingURL=validations.js.map