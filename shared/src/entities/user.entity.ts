/**
 * Unified User Entity - Single Source of Truth
 * Replaces all conflicting user type definitions across the system
 *
 * REMEDIATION: Simplified from 7 roles to 4, unified authentication
 */

// Import types from other entities to avoid circular dependencies
import type { GroupMembership } from './group.entity';

// SIMPLIFIED ROLE SYSTEM - Only 4 business roles
export type UserRole = 'super_admin' | 'group_admin' | 'parent' | 'student';

// Authentication provider types
export type AuthProvider = 'entra' | 'legacy';

// Geographic location
export interface GeographicLocation {
  address: string;
  latitude: number;
  longitude: number;
  zipCode?: string;
  city?: string;
  state?: string;
  country?: string;
}

// Emergency contact
export interface EmergencyContact {
  name: string;
  phoneNumber: string;
  phone?: string; // Legacy field for compatibility
  relationship: string;
  verified: boolean;
  isVerified?: boolean; // Legacy field for compatibility
  isPrimary?: boolean; // Legacy field for compatibility
}

// Group membership - imported from group.entity.ts
// Note: GroupMembership type is defined in group.entity.ts to avoid circular dependencies

// User preferences
export interface UserPreferences {
  pickupLocation?: string;
  dropoffLocation?: string;
  preferredTime?: string;
  isDriver: boolean;
  smokingAllowed?: boolean;
  notifications: {
    email: boolean;
    sms: boolean;
    tripReminders: boolean;
    swapRequests: boolean;
    scheduleChanges: boolean;
  };
}

// Travel schedule for traveling parents
export interface TravelSchedule {
  isRegularTraveler: boolean;
  travelPattern?: 'weekly' | 'monthly' | 'irregular';
  needsMakeupOptions: boolean;
  makeupCommitmentWeeks: number;
}

/**
 * UNIFIED USER ENTITY
 * Single source of truth for all user data
 */
export interface UserEntity {
  // Core Identity
  id: string;
  email: string;

  // Authentication
  authProvider: AuthProvider;
  entraObjectId?: string;
  passwordHash?: string; // Only for legacy users
  isActive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;

  // Profile
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  emergencyContacts: EmergencyContact[];
  profilePictureUrl?: string;
  contactInfo?: any;
  carpoolPreferences?: any;
  children?: any;
  fullName?: string;

  // Business Context
  role: UserRole;
  familyId?: string;
  groupMemberships: GroupMembership[];

  // Geographic
  homeAddress?: string;
  homeLocation?: GeographicLocation;
  addressVerified: boolean;

  // Carpool Features
  isActiveDriver: boolean;
  preferences: UserPreferences;
  travelSchedule?: TravelSchedule;

  // Security & Audit
  loginAttempts: number;
  lockedUntil?: Date;
  lastLoginAt?: Date;
  lastActivityAt?: Date;
  verification?: UserVerificationStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DERIVED TYPES
 */
export type CreateUserRequest = Pick<
  UserEntity,
  'email' | 'firstName' | 'lastName' | 'role' | 'authProvider'
> & {
  password?: string;
  phoneNumber?: string;
  homeAddress?: string;
  entraObjectId?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
};

export type UserProfileView = Omit<
  UserEntity,
  'passwordHash' | 'entraObjectId' | 'loginAttempts' | 'lockedUntil'
>;

export type AuthenticatedUser = Pick<
  UserEntity,
  'id' | 'email' | 'firstName' | 'lastName' | 'role' | 'authProvider' | 'isActive'
>;

export type DatabaseUser = UserEntity;

export type UpdateUserRequest = Partial<
  Pick<UserEntity, 'firstName' | 'lastName' | 'phoneNumber' | 'homeAddress' | 'preferences'>
> & {
  entraObjectId?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContacts?: EmergencyContact[];
  profilePictureUrl?: string;
  contactInfo?: any;
  carpoolPreferences?: any;
  children?: any;
};

export type UserQueryFilters = {
  role?: UserRole;
  isActive?: boolean;
  emailVerified?: boolean;
  groupId?: string;
  schoolId?: string;
  zipCode?: string;
};

export type UserWithRelationships = UserEntity & {
  groups?: any[];
  children?: any[];
  family?: any;
};

export type UserVerificationStatus = {
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isAddressVerified: boolean;
  isFullyVerified: boolean;
  // Legacy fields for compatibility
  email?: boolean;
  phone?: boolean;
  address?: boolean;
  emergencyContact?: boolean;
};

export type FamilyMembership = {
  familyId: string;
  userId: string;
  role: 'parent' | 'child';
  joinedAt: Date;
  status: 'active' | 'inactive';
};

/**
 * ROLE PERMISSIONS
 */
export const ROLE_PERMISSIONS: Record<UserRole, readonly string[]> = {
  super_admin: [
    'platform_management',
    'group_admin_promotion',
    'system_configuration',
    'safety_escalation',
    'view_all_data',
    'manage_system',
  ] as const,

  group_admin: [
    'group_management',
    'member_management',
    'trip_scheduling',
    'emergency_coordination',
    'view_group_data',
    'manage_group_members',
  ] as const,

  parent: [
    'trip_participation',
    'preference_submission',
    'child_management',
    'view_own_trips',
    'manage_family',
    'emergency_response',
  ] as const,

  student: [
    'schedule_viewing',
    'safety_reporting',
    'profile_management',
    'view_own_schedule',
    'update_limited_profile',
  ] as const,
} as const;

/**
 * UTILITY FUNCTIONS
 */
export function hasPermission(user: UserEntity, permission: string): boolean {
  return ROLE_PERMISSIONS[user.role].includes(permission as any);
}

export function getUserPermissions(user: UserEntity): readonly string[] {
  return ROLE_PERMISSIONS[user.role];
}

export function canManageGroup(user: UserEntity, groupId: string): boolean {
  if (user.role === 'super_admin') return true;
  if (user.role === 'group_admin') {
    return user.groupMemberships.some(
      (membership) => membership.groupId === groupId && membership.role === 'group_admin',
    );
  }
  return false;
}

export function isFamilyMember(user1: UserEntity, user2: UserEntity): boolean {
  return user1.familyId !== undefined && user1.familyId === user2.familyId;
}
