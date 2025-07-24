// Local copy of shared types for deployment compatibility
import { z } from 'zod';

// User roles - Updated to match user experience document
export type UserRole =
  | 'admin' // Super Admin
  | 'group_admin' // Group Admin
  | 'parent' // Parent
  | 'child' // Child
  | 'student' // Student
  | 'trip_admin'; // Trip Admin

// Role permissions interface
export interface RolePermissions {
  admin: {
    platform_management: boolean;
    group_admin_promotion: boolean;
    system_configuration: boolean;
  };
  group_admin: {
    group_management: boolean;
    member_management: boolean;
    trip_scheduling: boolean;
    emergency_coordination: boolean;
  };
  parent: {
    trip_participation: boolean;
    preference_submission: boolean;
    child_management: boolean;
  };
  child: {
    schedule_viewing: boolean;
    safety_reporting: boolean;
    profile_management: boolean;
  };
  student: {
    schedule_viewing: boolean;
    safety_reporting: boolean;
    profile_management: boolean;
    trip_participation: boolean;
  };
  trip_admin: {
    trip_scheduling: boolean;
    emergency_coordination: boolean;
    member_management: boolean;
  };
}

// Trip status
export type TripStatus = 'planned' | 'active' | 'completed' | 'cancelled';

// Notification settings interface
export interface NotificationSettings {
  email: boolean;
  sms: boolean;
  tripReminders: boolean;
  swapRequests: boolean;
  scheduleChanges: boolean;
}

// User preferences
export interface UserPreferences {
  pickupLocation: string;
  dropoffLocation: string;
  preferredTime: string;
  isDriver: boolean;
  maxPassengers?: number;
  smokingAllowed: boolean;
  musicPreference?: string;
  notifications: NotificationSettings;
}

// User interface
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  department?: string;
  emergencyContact?: string;
  phone?: string; // Alias for phoneNumber
  grade?: string;
  role: UserRole; // Made required
  rolePermissions?: RolePermissions; // Added role permissions
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
  registrationCompleted?: boolean;
}

// Trip interface
export interface Trip {
  id: string;
  driverId: string;
  passengers: string[];
  date: Date;
  departureTime: string;
  arrivalTime: string;
  pickupLocations: PickupLocation[];
  destination: string;
  maxPassengers: number;
  availableSeats: number;
  status: TripStatus;
  cost?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PickupLocation {
  userId: string;
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  estimatedTime: string;
}

// Trip passenger interface (for compatibility)
export interface TripPassenger {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  pickupLocation?: string;
  joinedAt: Date;
  status: 'confirmed' | 'pending' | 'cancelled';
}

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

// DEPRECATED - This will be replaced by the schema inference
// export interface RegisterRequest {
//   email: string;
//   password: string;
//   firstName: string;
//   lastName: string;
//   phoneNumber?: string;
//   department?: string;
// }

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  department?: string;
  grade?: string;
  emergencyContact?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// Trip request types
export interface CreateTripRequest {
  date: string;
  departureTime: string;
  arrivalTime: string;
  destination: string;
  maxPassengers: number;
  cost?: number;
  notes?: string;
}

export interface UpdateTripRequest {
  date?: string;
  departureTime?: string;
  arrivalTime?: string;
  destination?: string;
  maxPassengers?: number;
  cost?: number;
  notes?: string;
  status?: TripStatus;
}

export interface JoinTripRequest {
  pickupLocation: string;
}

// Validation schemas
export const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  phoneNumber: z.string().optional(),
  department: z.string().optional(),
  grade: z.string().optional(),
  emergencyContact: z.string().optional(),
});

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phoneNumber: z.string().optional(),
  department: z.string().optional(),
});

export const createTripSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  departureTime: z.string().min(1, 'Departure time is required'),
  arrivalTime: z.string().min(1, 'Arrival time is required'),
  destination: z.string().min(1, 'Destination is required'),
  maxPassengers: z.number().min(1).max(8),
  notes: z.string().optional(),
});

export const updateTripSchema = z.object({
  date: z.string().min(1).optional(),
  departureTime: z.string().optional(),
  arrivalTime: z.string().optional(),
  destination: z.string().min(1).optional(),
  maxPassengers: z.number().min(1).max(8).optional(),
  notes: z.string().optional(),
  status: z.enum(['planned', 'active', 'completed', 'cancelled']).optional(),
});

export const joinTripSchema = z.object({
  pickupLocation: z.string().min(1, 'Pickup location is required'),
});

// Auth validation schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export const childSchema = z.object({
  firstName: z.string().min(1, "Child's first name is required"),
  lastName: z.string().min(1, "Child's last name is required"),
  grade: z.string().min(1, "Child's grade is required"),
  school: z.string().min(1, "Child's school is required"),
});

export interface Family {
  id: string;
  name: string;
  parentIds: string[];
  childIds: string[];
  primaryParentId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Child {
  id: string;
  familyId: string;
  firstName: string;
  lastName: string;
  grade: string;
  school: string;
}

export interface Preference {
  familyId: string;
  date: string;
  canDrive: boolean;
}

export interface Assignment {
  familyId: string;
  driverId: string;
  date: Date;
  passengerFamilyIds: string[];
}

export interface RegisterRequest {
  familyName: string;
  parent: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  };
  secondParent?: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  };
  homeAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  children: {
    firstName: string;
    lastName: string;
    grade: string;
    school: string;
  }[];
}

// Keep this in sync with backend/srcs/validations.ts
// The actual Zod schema is defined in the backend package.
// This is just for type inference on the frontend.
// Note: Importing backend schema may cause build issues, so using local schema
export const registerSchema = z.object({
  familyName: z.string().min(1, 'Family name is required'),
  parent: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
  secondParent: z
    .object({
      firstName: z.string().min(1, 'First name is required'),
      lastName: z.string().min(1, 'Last name is required'),
      email: z.string().email('Invalid email address'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
    })
    .optional(),
  children: z
    .array(
      z.object({
        firstName: z.string().min(1, 'First name is required'),
        lastName: z.string().min(1, 'Last name is required'),
        grade: z.string().min(1, 'Grade is required'),
        school: z.string().min(1, 'School is required'),
      })
    )
    .min(1, 'At least one child is required'),
});

// Utility types
export type CreateUserRequest = z.infer<typeof createUserSchema>;
export type CreateTripRequestType = z.infer<typeof createTripSchema>;
export type UpdateTripRequestType = z.infer<typeof updateTripSchema>;
export type JoinTripRequestType = z.infer<typeof joinTripSchema>;
export type LoginRequestType = z.infer<typeof loginSchema>;
export type RegisterRequestType = z.infer<typeof registerSchema>;
