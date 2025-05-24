import { z } from 'zod';

// User validation schemas
export const userPreferencesSchema = z.object({
  pickupLocation: z.string().min(1, 'Pickup location is required'),
  dropoffLocation: z.string().min(1, 'Dropoff location is required'),
  preferredTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  isDriver: z.boolean(),
  maxPassengers: z.number().min(1).max(8).optional(),
  smokingAllowed: z.boolean(),
  musicPreference: z.string().optional(),
  notifications: z.object({
    email: z.boolean(),
    sms: z.boolean(),
    tripReminders: z.boolean(),
    swapRequests: z.boolean(),
    scheduleChanges: z.boolean()
  })
});

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phoneNumber: z.string().optional(),
  department: z.string().optional()
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phoneNumber: z.string().optional(),
  department: z.string().optional(),
  preferences: userPreferencesSchema.optional()
});

// Trip validation schemas
export const createTripSchema = z.object({
  date: z.string().refine((date) => {
    const tripDate = new Date(date);
    return !isNaN(tripDate.getTime());
  }, 'Invalid date format'),
  departureTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  arrivalTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  destination: z.string().min(1, 'Destination is required'),
  maxPassengers: z.number().min(1, 'At least 1 passenger required').max(8, 'Maximum 8 passengers allowed'),
  cost: z.number().min(0, 'Cost cannot be negative').optional(),
  notes: z.string().optional()
});

export const createTripValidation = createTripSchema;

export const updateTripSchema = z.object({
  date: z.string().refine((date) => {
    const tripDate = new Date(date);
    return !isNaN(tripDate.getTime());
  }, 'Invalid date format').optional(),
  departureTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  arrivalTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  destination: z.string().min(1).optional(),
  maxPassengers: z.number().min(1).max(8).optional(),
  cost: z.number().min(0).optional(),
  notes: z.string().optional(),
  status: z.enum(['planned', 'active', 'completed', 'cancelled']).optional()
});

// Schedule validation schemas
export const createScheduleSchema = z.object({
  recurring: z.boolean(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  daysOfWeek: z.array(z.number().min(0).max(6)),
  departureTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  isDriver: z.boolean(),
  maxPassengers: z.number().min(1).max(8).optional()
});

// Swap request validation schemas
export const createSwapRequestSchema = z.object({
  targetUserId: z.string().uuid(),
  requestedDate: z.string().datetime(),
  offerDate: z.string().datetime(),
  reason: z.string().optional()
});

// Auth validation schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required')
});

export const registerSchema = createUserSchema;

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10)
});

// Query schemas
export const tripQuerySchema = z.object({
  date: z.string().datetime().optional(),
  driverId: z.string().uuid().optional(),
  status: z.enum(['planned', 'active', 'completed', 'cancelled']).optional()
}).merge(paginationSchema);

export const userQuerySchema = z.object({
  department: z.string().optional(),
  isDriver: z.boolean().optional()
}).merge(paginationSchema);
