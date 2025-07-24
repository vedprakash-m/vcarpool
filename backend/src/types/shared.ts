// Shared types for backend
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  GROUP_ADMIN = 'group_admin',
  PARENT = 'parent',
  CHILD = 'child',
  STUDENT = 'student',
  TRIP_ADMIN = 'trip_admin',
}

export interface RolePermissions {
  super_admin: {
    platform_management: boolean;
    group_admin_promotion: boolean;
    system_configuration: boolean;
    safety_escalation: boolean;
  };
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
  };
  trip_admin: {
    group_management: boolean;
    member_management: boolean;
    trip_scheduling: boolean;
    emergency_coordination: boolean;
  };
}

export interface NotificationSettings {
  email: boolean;
  sms: boolean;
  tripReminders: boolean;
  swapRequests: boolean;
  scheduleChanges: boolean;
}

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

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  department?: string;
  emergencyContact?: string;
  phone?: string;
  grade?: string;
  role: UserRole;
  rolePermissions?: RolePermissions;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  department?: string;
  role?: UserRole;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
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

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// Trip and transportation related types
export enum TripStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DELAYED = 'delayed',
}

export interface Trip {
  id: string;
  driverId: string;
  groupId: string;
  status: TripStatus;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  pickupLocation: string;
  destination: string;
  maxPassengers: number;
  currentPassengers: string[]; // Array of user IDs
  route?: string;
  estimatedDuration?: number; // in minutes
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTripRequest {
  groupId: string;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  pickupLocation: string;
  destination: string;
  maxPassengers: number;
  notes?: string;
}

// Group and carpool related types
export interface Group {
  id: string;
  name: string;
  description?: string;
  adminId: string;
  school: string;
  maxMembers: number;
  currentMembers: string[]; // Array of user IDs
  serviceAreaMiles: number;
  createdAt: Date;
  updatedAt: Date;
}

// Schedule and preference types
export interface WeeklyPreference {
  userId: string;
  groupId: string;
  weekStartDate: Date;
  dailyPreferences: {
    [day: string]: {
      available: boolean;
      canDrive: boolean;
      maxPassengers?: number;
      preferredRole: 'driver' | 'passenger' | 'either';
      timeConstraints?: string;
    };
  };
  submittedAt: Date;
}

// Emergency and safety types
export interface EmergencyContact {
  name: string;
  relationship: string;
  phoneNumber: string;
  email?: string;
  isPrimary: boolean;
}
