/**
 * UNIFIED GROUP ENTITY
 *
 * Single source of truth for carpool group data.
 * Represents the core business domain of carpool groups.
 *
 * Design Principles:
 * - Clear group lifecycle management
 * - Explicit membership and permissions
 * - Geographic and scheduling constraints
 * - Safety and compliance focus
 */

import { GeographicLocation, AuditLogEntry, NotificationPreferences } from './common.entity';
import { UserRole } from './user.entity';

/**
 * GROUP STATUS
 *
 * Clear lifecycle states for group management.
 * Supports both automatic and manual lifecycle transitions.
 */
export type GroupStatus =
  | 'active' // Fully operational group
  | 'forming' // New group, gathering members
  | 'paused' // Temporarily inactive (summer break, etc.)
  | 'inactive' // No recent activity, needs attention
  | 'archived' // Permanently closed, read-only
  | 'deleted'; // Soft-deleted, hidden from users

/**
 * GROUP MEMBERSHIP STATUS
 *
 * Individual member status within a group.
 * Supports complex membership scenarios.
 */
export type MembershipStatus =
  | 'active' // Full participating member
  | 'pending' // Invitation sent, awaiting acceptance
  | 'inactive' // Temporarily not participating
  | 'suspended' // Temporarily restricted access
  | 'removed'; // No longer a member

/**
 * GROUP INVITATION STATUS
 *
 * Tracks invitation lifecycle.
 */
export type InvitationStatus =
  | 'pending' // Sent, awaiting response
  | 'accepted' // Accepted, member added
  | 'declined' // Declined by recipient
  | 'expired' // Expired without response
  | 'cancelled'; // Cancelled by sender

/**
 * GROUP MEMBER
 *
 * Individual member within a carpool group.
 * Links users to groups with specific roles and permissions.
 */
export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;

  // Membership details
  role: UserRole;
  status: MembershipStatus;
  joinedAt: Date;
  lastActiveAt: Date;

  // Children in this group (for parents)
  children: Array<{
    id: string;
    firstName: string;
    lastName: string;
    grade: string;
    schoolId: string;
    studentId?: string;
    specialNeeds?: string;
    carSeatRequired: boolean;

    // Pickup permissions
    pickupAuthorizations: Array<{
      authorizedMemberId: string;
      authorizedMemberName: string;
      relationship: string;
      isActive: boolean;
      authorizedAt: Date;
    }>;
  }>;

  // Driving preferences (for parent members)
  drivingPreferences?: {
    canDrive: boolean;
    hasValidLicense: boolean;
    hasInsurance: boolean;
    preferredDays: Array<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'>;
    maxPassengers: number;
    vehicleInfo?: {
      make: string;
      model: string;
      year: number;
      color: string;
      licensePlate: string;
      passengerCapacity: number;
      hasCarSeats: boolean;
      carSeatTypes: string[];
    };
  };

  // Activity tracking
  metrics: {
    totalTripsCompleted: number;
    totalTripsAsDriver: number;
    totalTripsAsPassenger: number;
    reliabilityScore: number; // 0-100
    lastTripDate?: Date;
    lastPreferenceSubmission?: Date;
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GROUP INVITATION
 *
 * Represents invitations sent to potential group members.
 * Supports both email-based and user-based invitations.
 */
export interface GroupInvitation {
  id: string;
  groupId: string;

  // Invitation target
  email: string;
  targetUserId?: string; // If user exists in system

  // Invitation details
  invitedBy: string; // User ID
  invitedByName: string;
  role: UserRole;
  status: InvitationStatus;

  // Message and context
  personalMessage?: string;
  invitationReason?: string;

  // Lifecycle
  sentAt: Date;
  expiresAt: Date;
  respondedAt?: Date;
  cancelledAt?: Date;

  // Response tracking
  responseToken: string;
  viewedAt?: Date;
  viewCount: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GROUP JOIN REQUEST
 *
 * Represents requests from users to join a group.
 * Supports both open and closed group joining.
 */
export interface GroupJoinRequest {
  id: string;
  groupId: string;
  userId: string;

  // Request details
  requestMessage?: string;
  requestedRole: UserRole;

  // Children to add (for parents)
  childrenToAdd: Array<{
    firstName: string;
    lastName: string;
    grade: string;
    schoolId: string;
    studentId?: string;
    specialNeeds?: string;
    carSeatRequired: boolean;
  }>;

  // Status and lifecycle
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  reviewedBy?: string; // Admin user ID
  reviewedAt?: Date;
  reviewNotes?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GROUP SCHEDULE
 *
 * Defines when and how the group operates.
 * Supports complex scheduling scenarios.
 */
export interface GroupSchedule {
  // Operating days
  operatingDays: Array<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'>;

  // Time windows
  morningPickup?: {
    startTime: string; // "07:30"
    endTime: string; // "08:00"
    isActive: boolean;
  };

  afternoonDropoff?: {
    startTime: string; // "15:00"
    endTime: string; // "16:00"
    isActive: boolean;
  };

  // Special schedules
  specialSchedules: Array<{
    date: Date;
    type: 'no_school' | 'early_dismissal' | 'late_start' | 'special_event';
    morningPickup?: { startTime: string; endTime: string };
    afternoonDropoff?: { startTime: string; endTime: string };
    isActive: boolean;
  }>;

  // Legacy compatibility
  exceptions?: any[];

  // Schedule preferences
  preferenceCollection: {
    isEnabled: boolean;
    collectionDay:
      | 'sunday'
      | 'monday'
      | 'tuesday'
      | 'wednesday'
      | 'thursday'
      | 'friday'
      | 'saturday';
    collectionTime: string; // "18:00"
    reminderHours: number[]; // [48, 24, 6] hours before
    cutoffHours: number; // 12 hours before schedule generation
  };

  // Schedule generation
  scheduleGeneration: {
    isAutomatic: boolean;
    generationDay:
      | 'sunday'
      | 'monday'
      | 'tuesday'
      | 'wednesday'
      | 'thursday'
      | 'friday'
      | 'saturday';
    generationTime: string; // "20:00"
    publishImmediately: boolean;
    requiresApproval: boolean;
    approvalBy?: string; // Admin user ID
  };

  // Metadata
  lastUpdated: Date;
  updatedBy: string;
}

/**
 * GROUP SERVICE AREA
 *
 * Defines geographic boundaries for group membership.
 * Supports both radius-based and zone-based areas.
 */
export interface GroupServiceArea {
  // Center point
  centerLocation: GeographicLocation;

  // Radius-based area
  radiusMiles: number;

  // Zone-based area (optional)
  includeZipCodes?: string[];
  includedZipCodes?: string[]; // Legacy compatibility
  excludeZipCodes?: string[];

  // Boundary polygon (optional, for complex areas)
  boundaryPolygon?: Array<{
    latitude: number;
    longitude: number;
  }>;

  // Validation
  isValidated: boolean;
  validationSource?: 'manual' | 'automated';
  validatedAt?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GROUP ACTIVITY METRICS
 *
 * Tracks group health and engagement.
 * Used for lifecycle management and insights.
 */
export interface GroupActivityMetrics {
  // Participation metrics
  totalMembers: number;
  activeMembers: number;
  totalChildren: number;
  activeDrivers: number;

  // Activity metrics
  lastPreferenceSubmission?: Date;
  lastScheduleGeneration?: Date;
  lastMemberActivity?: Date;
  lastTripCompleted?: Date;

  // Engagement metrics
  averagePreferenceSubmissionRate: number; // 0-100%
  averageTripCompletionRate: number; // 0-100%
  memberSatisfactionScore?: number; // 1-5

  // Inactivity tracking
  consecutiveInactiveWeeks: number;
  inactivityDetectedAt?: Date;

  // Health indicators
  healthScore: number; // 0-100
  healthStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

  // Lifecycle indicators
  isAtRisk: boolean;
  riskFactors: string[];

  // Metadata
  lastCalculated: Date;
  calculatedBy: string;
}

/**
 * MAIN GROUP ENTITY
 *
 * Single source of truth for carpool group data.
 * Represents the complete business domain of carpool groups.
 */
export interface GroupEntity {
  // === IDENTITY ===
  id: string;
  name: string;
  description?: string;

  // === GROUP ADMINISTRATION ===
  groupAdminId: string;
  groupAdminName: string;
  coAdminIds: string[]; // Additional administrators

  // === TARGET SCHOOL ===
  targetSchoolId: string;
  schoolId?: string; // Legacy compatibility
  targetSchoolName: string;
  targetSchoolAddress: string;

  // === GEOGRAPHIC BOUNDARIES ===
  serviceArea: GroupServiceArea;

  // === SCHEDULING ===
  schedule: GroupSchedule;

  // === MEMBERSHIP ===
  members: GroupMember[];
  maxMembers: number;
  maxChildren: number;

  // === INVITATIONS & REQUESTS ===
  pendingInvitations: GroupInvitation[];
  joinRequests: GroupJoinRequest[];

  // === GROUP SETTINGS ===
  settings: {
    isPublic: boolean; // Visible in group directory
    isAcceptingMembers: boolean; // Open to new members
    requiresApproval: boolean; // Admin approval for new members
    allowSelfJoin: boolean; // Users can join without invitation

    // Age and grade restrictions
    allowedGrades: string[];
    minAge?: number;
    maxAge?: number;

    // Communication preferences
    notificationPreferences: NotificationPreferences;
    communicationChannels: Array<'email' | 'sms' | 'app' | 'phone'>;

    // Safety requirements
    backgroundCheckRequired: boolean;
    identityVerificationRequired: boolean;
    emergencyContactRequired: boolean;

    // Driving requirements
    licenseVerificationRequired: boolean;
    insuranceVerificationRequired: boolean;
    vehicleInspectionRequired: boolean;
  };

  // === STATUS & LIFECYCLE ===
  status: GroupStatus;

  // Lifecycle tracking
  lifecycleHistory: Array<{
    fromStatus: GroupStatus;
    toStatus: GroupStatus;
    reason: string;
    changedBy: string;
    changedAt: Date;
  }>;

  // Inactivity management
  inactivityDetectedAt?: Date;
  inactivityWarningsSent: number;
  archiveScheduledDate?: Date;

  // === ACTIVITY METRICS ===
  activityMetrics: GroupActivityMetrics;

  // === AUDIT TRAIL ===
  auditLog: AuditLogEntry[];

  // === METADATA ===
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastModifiedBy: string;

  // Version control
  version: number;
  lastSchemaUpdate: Date;
}

/**
 * GROUP CREATION REQUEST
 *
 * Required data for creating a new group.
 * Supports both admin-created and user-initiated groups.
 */
export interface CreateGroupRequest {
  // Basic information
  name: string;
  description?: string;

  // School target
  targetSchoolId: string;
  schoolId?: string; // Legacy compatibility

  // Geographic area
  serviceArea: {
    centerAddress: string;
    radiusMiles: number;
    includeZipCodes?: string[];
    excludeZipCodes?: string[];
  };

  // Basic schedule
  operatingDays: Array<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'>;
  morningPickup?: {
    startTime: string;
    endTime: string;
  };
  afternoonDropoff?: {
    startTime: string;
    endTime: string;
  };

  // Capacity
  maxMembers: number;
  maxChildren: number;

  // Settings
  isPublic: boolean;
  isAcceptingMembers: boolean;
  requiresApproval: boolean;
  allowedGrades: string[];

  // Creator context
  createdBy: string;
  creationReason?: string;
}

/**
 * GROUP UPDATE REQUEST
 *
 * Allowed fields for updating group information.
 * Excludes sensitive fields like id, createdAt, etc.
 */
export interface UpdateGroupRequest {
  name?: string;
  description?: string;

  // Schedule updates
  schedule?: Partial<GroupSchedule>;

  // Settings updates
  settings?: Partial<GroupEntity['settings']>;

  // Capacity updates
  maxMembers?: number;
  maxChildren?: number;

  // Administrative updates
  coAdminIds?: string[];

  // Update context
  updatedBy: string;
  updateReason?: string;
}

/**
 * GROUP QUERY FILTERS
 *
 * Support for complex group queries.
 * Used for group discovery and admin interfaces.
 */
export interface GroupQueryFilters {
  status?: GroupStatus;
  targetSchoolId?: string;
  isPublic?: boolean;
  isAcceptingMembers?: boolean;
  hasOpenings?: boolean;

  // Geographic filters
  nearLocation?: {
    latitude: number;
    longitude: number;
    radiusMiles: number;
  };
  includesZipCode?: string;

  // Capacity filters
  minMembers?: number;
  maxMembers?: number;

  // Schedule filters
  operatesOnDays?: Array<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'>;
  hasMorningPickup?: boolean;
  hasAfternoonDropoff?: boolean;

  // Date filters
  createdAfter?: Date;
  createdBefore?: Date;
  lastActiveAfter?: Date;

  // Admin filters
  groupAdminId?: string;
  createdBy?: string;

  // Health filters
  healthStatus?: GroupActivityMetrics['healthStatus'];
  isAtRisk?: boolean;
}

/**
 * GROUP WITH RELATIONSHIPS
 *
 * Extended group entity with populated relationships.
 * Used for detailed group views and management interfaces.
 */
export interface GroupWithRelationships extends GroupEntity {
  // Populated relationships
  groupAdmin: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
    isActive: boolean;
  };

  coAdmins: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    isActive: boolean;
  }>;

  targetSchool: {
    id: string;
    name: string;
    address: string;
    location: GeographicLocation;
    district?: string;
    type: string;
    grades: string[];
  };

  // Computed statistics
  statistics: {
    totalMembers: number;
    activeMembers: number;
    totalChildren: number;
    activeDrivers: number;
    averageRating: number;
    totalTripsCompleted: number;
    upcomingTrips: number;
    pendingInvitations: number;
    pendingJoinRequests: number;
  };
}

// Alias for service compatibility
export type GroupMembership = GroupMember;
