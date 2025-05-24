import { z } from 'zod';
export declare const userPreferencesSchema: z.ZodObject<{
    pickupLocation: z.ZodString;
    dropoffLocation: z.ZodString;
    preferredTime: z.ZodString;
    isDriver: z.ZodBoolean;
    maxPassengers: z.ZodOptional<z.ZodNumber>;
    smokingAllowed: z.ZodBoolean;
    musicPreference: z.ZodOptional<z.ZodString>;
    notifications: z.ZodObject<{
        email: z.ZodBoolean;
        sms: z.ZodBoolean;
        tripReminders: z.ZodBoolean;
        swapRequests: z.ZodBoolean;
        scheduleChanges: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        email: boolean;
        sms: boolean;
        tripReminders: boolean;
        swapRequests: boolean;
        scheduleChanges: boolean;
    }, {
        email: boolean;
        sms: boolean;
        tripReminders: boolean;
        swapRequests: boolean;
        scheduleChanges: boolean;
    }>;
}, "strip", z.ZodTypeAny, {
    pickupLocation: string;
    dropoffLocation: string;
    preferredTime: string;
    isDriver: boolean;
    smokingAllowed: boolean;
    notifications: {
        email: boolean;
        sms: boolean;
        tripReminders: boolean;
        swapRequests: boolean;
        scheduleChanges: boolean;
    };
    maxPassengers?: number | undefined;
    musicPreference?: string | undefined;
}, {
    pickupLocation: string;
    dropoffLocation: string;
    preferredTime: string;
    isDriver: boolean;
    smokingAllowed: boolean;
    notifications: {
        email: boolean;
        sms: boolean;
        tripReminders: boolean;
        swapRequests: boolean;
        scheduleChanges: boolean;
    };
    maxPassengers?: number | undefined;
    musicPreference?: string | undefined;
}>;
export declare const createUserSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    phoneNumber: z.ZodOptional<z.ZodString>;
    department: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string | undefined;
    department?: string | undefined;
}, {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string | undefined;
    department?: string | undefined;
}>;
export declare const updateUserSchema: z.ZodObject<{
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    phoneNumber: z.ZodOptional<z.ZodString>;
    department: z.ZodOptional<z.ZodString>;
    preferences: z.ZodOptional<z.ZodObject<{
        pickupLocation: z.ZodString;
        dropoffLocation: z.ZodString;
        preferredTime: z.ZodString;
        isDriver: z.ZodBoolean;
        maxPassengers: z.ZodOptional<z.ZodNumber>;
        smokingAllowed: z.ZodBoolean;
        musicPreference: z.ZodOptional<z.ZodString>;
        notifications: z.ZodObject<{
            email: z.ZodBoolean;
            sms: z.ZodBoolean;
            tripReminders: z.ZodBoolean;
            swapRequests: z.ZodBoolean;
            scheduleChanges: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            email: boolean;
            sms: boolean;
            tripReminders: boolean;
            swapRequests: boolean;
            scheduleChanges: boolean;
        }, {
            email: boolean;
            sms: boolean;
            tripReminders: boolean;
            swapRequests: boolean;
            scheduleChanges: boolean;
        }>;
    }, "strip", z.ZodTypeAny, {
        pickupLocation: string;
        dropoffLocation: string;
        preferredTime: string;
        isDriver: boolean;
        smokingAllowed: boolean;
        notifications: {
            email: boolean;
            sms: boolean;
            tripReminders: boolean;
            swapRequests: boolean;
            scheduleChanges: boolean;
        };
        maxPassengers?: number | undefined;
        musicPreference?: string | undefined;
    }, {
        pickupLocation: string;
        dropoffLocation: string;
        preferredTime: string;
        isDriver: boolean;
        smokingAllowed: boolean;
        notifications: {
            email: boolean;
            sms: boolean;
            tripReminders: boolean;
            swapRequests: boolean;
            scheduleChanges: boolean;
        };
        maxPassengers?: number | undefined;
        musicPreference?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    firstName?: string | undefined;
    lastName?: string | undefined;
    phoneNumber?: string | undefined;
    department?: string | undefined;
    preferences?: {
        pickupLocation: string;
        dropoffLocation: string;
        preferredTime: string;
        isDriver: boolean;
        smokingAllowed: boolean;
        notifications: {
            email: boolean;
            sms: boolean;
            tripReminders: boolean;
            swapRequests: boolean;
            scheduleChanges: boolean;
        };
        maxPassengers?: number | undefined;
        musicPreference?: string | undefined;
    } | undefined;
}, {
    firstName?: string | undefined;
    lastName?: string | undefined;
    phoneNumber?: string | undefined;
    department?: string | undefined;
    preferences?: {
        pickupLocation: string;
        dropoffLocation: string;
        preferredTime: string;
        isDriver: boolean;
        smokingAllowed: boolean;
        notifications: {
            email: boolean;
            sms: boolean;
            tripReminders: boolean;
            swapRequests: boolean;
            scheduleChanges: boolean;
        };
        maxPassengers?: number | undefined;
        musicPreference?: string | undefined;
    } | undefined;
}>;
export declare const createTripSchema: z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    departureTime: z.ZodString;
    arrivalTime: z.ZodString;
    destination: z.ZodString;
    maxPassengers: z.ZodNumber;
    cost: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    maxPassengers: number;
    date: string;
    departureTime: string;
    arrivalTime: string;
    destination: string;
    cost?: number | undefined;
    notes?: string | undefined;
}, {
    maxPassengers: number;
    date: string;
    departureTime: string;
    arrivalTime: string;
    destination: string;
    cost?: number | undefined;
    notes?: string | undefined;
}>;
export declare const createTripValidation: z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    departureTime: z.ZodString;
    arrivalTime: z.ZodString;
    destination: z.ZodString;
    maxPassengers: z.ZodNumber;
    cost: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    maxPassengers: number;
    date: string;
    departureTime: string;
    arrivalTime: string;
    destination: string;
    cost?: number | undefined;
    notes?: string | undefined;
}, {
    maxPassengers: number;
    date: string;
    departureTime: string;
    arrivalTime: string;
    destination: string;
    cost?: number | undefined;
    notes?: string | undefined;
}>;
export declare const updateTripSchema: z.ZodObject<{
    date: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    departureTime: z.ZodOptional<z.ZodString>;
    arrivalTime: z.ZodOptional<z.ZodString>;
    destination: z.ZodOptional<z.ZodString>;
    maxPassengers: z.ZodOptional<z.ZodNumber>;
    cost: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["planned", "active", "completed", "cancelled"]>>;
}, "strip", z.ZodTypeAny, {
    maxPassengers?: number | undefined;
    status?: "planned" | "active" | "completed" | "cancelled" | undefined;
    date?: string | undefined;
    departureTime?: string | undefined;
    arrivalTime?: string | undefined;
    destination?: string | undefined;
    cost?: number | undefined;
    notes?: string | undefined;
}, {
    maxPassengers?: number | undefined;
    status?: "planned" | "active" | "completed" | "cancelled" | undefined;
    date?: string | undefined;
    departureTime?: string | undefined;
    arrivalTime?: string | undefined;
    destination?: string | undefined;
    cost?: number | undefined;
    notes?: string | undefined;
}>;
export declare const createScheduleSchema: z.ZodObject<{
    recurring: z.ZodBoolean;
    startDate: z.ZodString;
    endDate: z.ZodOptional<z.ZodString>;
    daysOfWeek: z.ZodArray<z.ZodNumber, "many">;
    departureTime: z.ZodString;
    isDriver: z.ZodBoolean;
    maxPassengers: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    isDriver: boolean;
    departureTime: string;
    recurring: boolean;
    startDate: string;
    daysOfWeek: number[];
    maxPassengers?: number | undefined;
    endDate?: string | undefined;
}, {
    isDriver: boolean;
    departureTime: string;
    recurring: boolean;
    startDate: string;
    daysOfWeek: number[];
    maxPassengers?: number | undefined;
    endDate?: string | undefined;
}>;
export declare const createSwapRequestSchema: z.ZodObject<{
    targetUserId: z.ZodString;
    requestedDate: z.ZodString;
    offerDate: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    targetUserId: string;
    requestedDate: string;
    offerDate: string;
    reason?: string | undefined;
}, {
    targetUserId: string;
    requestedDate: string;
    offerDate: string;
    reason?: string | undefined;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    phoneNumber: z.ZodOptional<z.ZodString>;
    department: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string | undefined;
    department?: string | undefined;
}, {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string | undefined;
    department?: string | undefined;
}>;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
}, {
    page?: number | undefined;
    limit?: number | undefined;
}>;
export declare const tripQuerySchema: z.ZodObject<{
    date: z.ZodOptional<z.ZodString>;
    driverId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["planned", "active", "completed", "cancelled"]>>;
} & {
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    status?: "planned" | "active" | "completed" | "cancelled" | undefined;
    date?: string | undefined;
    driverId?: string | undefined;
}, {
    status?: "planned" | "active" | "completed" | "cancelled" | undefined;
    date?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    driverId?: string | undefined;
}>;
export declare const userQuerySchema: z.ZodObject<{
    department: z.ZodOptional<z.ZodString>;
    isDriver: z.ZodOptional<z.ZodBoolean>;
} & {
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    isDriver?: boolean | undefined;
    department?: string | undefined;
}, {
    isDriver?: boolean | undefined;
    department?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
}>;
//# sourceMappingURL=validations.d.ts.map