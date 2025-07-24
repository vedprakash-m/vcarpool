/**
 * COMMON ENTITIES
 *
 * Shared types and interfaces used across multiple entities.
 * These represent cross-cutting concerns and common data structures.
 */

/**
 * GEOGRAPHIC LOCATION
 *
 * Standardized location representation with address validation.
 * Supports both manual entry and geocoding services.
 */
export interface GeographicLocation {
  // Raw address data
  address: string;
  formattedAddress?: string; // Standardized by geocoding service

  // Coordinates
  latitude: number;
  longitude: number;

  // Address components
  streetNumber?: string;
  streetName?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;

  // Validation
  isValidated: boolean;
  validationSource?: 'google' | 'azure' | 'manual';
  validatedAt?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * CONTACT INFORMATION
 *
 * Standardized contact data with verification status.
 * Supports multiple contact methods and verification states.
 */
export interface ContactInfo {
  // Primary contact
  primaryPhone?: string;
  primaryPhoneVerified: boolean;
  primaryEmail: string;
  primaryEmailVerified: boolean;

  // Secondary contact
  secondaryPhone?: string;
  secondaryPhoneVerified: boolean;
  secondaryEmail?: string;
  secondaryEmailVerified: boolean;

  // Communication preferences
  preferredContactMethod: 'email' | 'phone' | 'sms' | 'app';
  canReceiveSMS: boolean;
  canReceiveEmailNotifications: boolean;
  canReceivePushNotifications: boolean;

  // Emergency reachability
  bestTimeToContact?: string;
  timeZone?: string;

  // Verification metadata
  lastVerificationAttempt?: Date;
  verificationAttempts: number;
}

/**
 * TRAVEL SCHEDULE
 *
 * Represents complex travel patterns for traveling parents.
 * Supports both regular and irregular travel schedules.
 */
export interface TravelSchedule {
  // Travel pattern type
  isRegularTraveler: boolean;
  travelPattern: 'weekly' | 'monthly' | 'irregular' | 'seasonal';

  // Regular travel (for weekly/monthly patterns)
  regularSchedule?: {
    daysOfWeek: Array<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'>;
    weeksOfMonth?: number[]; // [1, 3] for first and third weeks
    startDate: Date;
    endDate?: Date;
  };

  // Irregular travel (specific dates)
  irregularSchedule?: {
    travelDates: Date[];
    returnDates: Date[];
    isRecurring: boolean;
  };

  // Makeup arrangements
  needsMakeupOptions: boolean;
  makeupCommitmentWeeks: number; // 2-6 weeks advance notice
  preferredMakeupDrivers: string[]; // User IDs

  // Travel metadata
  travelReason?: string;
  estimatedDuration?: string;
  alternateContactDuringTravel?: string;

  // System fields
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

/**
 * AUDIT LOG ENTRY
 *
 * Standardized audit trail for all entity changes.
 * Critical for compliance and debugging.
 */
export interface AuditLogEntry {
  id: string;
  entityType: string; // 'user', 'group', 'trip', etc.
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'archive';

  // Change details
  changedFields: string[];
  oldValues: Record<string, any>;
  newValues: Record<string, any>;

  // Context
  performedBy: string; // User ID
  performedByRole: string; // Role at time of action
  reason?: string; // Optional reason for change

  // Metadata
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

/**
 * NOTIFICATION PREFERENCES
 *
 * User preferences for different types of notifications.
 * Supports granular control over communication channels.
 */
export interface NotificationPreferences {
  // Channel preferences
  email: {
    enabled: boolean;
    frequency: 'immediate' | 'daily' | 'weekly' | 'never';
    types: NotificationType[];
  };

  sms: {
    enabled: boolean;
    frequency: 'immediate' | 'daily' | 'never';
    types: NotificationType[];
  };

  push: {
    enabled: boolean;
    frequency: 'immediate' | 'daily' | 'never';
    types: NotificationType[];
  };

  // Quiet hours
  quietHours: {
    enabled: boolean;
    startTime: string; // "22:00"
    endTime: string; // "07:00"
    timeZone: string;
  };

  // Emergency overrides
  emergencyOverride: boolean; // Always receive emergency notifications

  // Metadata
  lastUpdated: Date;
  updatedBy: string;
}

/**
 * NOTIFICATION TYPES
 *
 * All possible notification types in the system.
 * Used for granular notification preferences.
 */
export type NotificationType =
  | 'trip_scheduled'
  | 'trip_cancelled'
  | 'trip_modified'
  | 'driver_assigned'
  | 'driver_cancelled'
  | 'pickup_reminder'
  | 'pickup_delay'
  | 'trip_completed'
  | 'swap_request'
  | 'swap_approved'
  | 'swap_declined'
  | 'group_invitation'
  | 'group_update'
  | 'group_archived'
  | 'preference_reminder'
  | 'schedule_published'
  | 'emergency_alert'
  | 'safety_report'
  | 'system_maintenance'
  | 'account_security'
  | 'verification_required'
  | 'verification_completed';

/**
 * SAFETY INCIDENT
 *
 * Standardized safety incident reporting.
 * Critical for platform safety and compliance.
 */
export interface SafetyIncident {
  id: string;
  type: 'accident' | 'inappropriate_behavior' | 'vehicle_issue' | 'route_safety' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';

  // Incident details
  description: string;
  location?: GeographicLocation;
  dateTime: Date;

  // Involved parties
  reportedBy: string; // User ID
  involvedUsers: string[]; // User IDs
  involvedChildren: string[]; // Child IDs

  // Trip context
  tripId?: string;
  groupId?: string;

  // Resolution
  status: 'reported' | 'investigating' | 'resolved' | 'escalated';
  assignedTo?: string; // Admin user ID
  resolution?: string;
  resolvedAt?: Date;

  // Follow-up actions
  actionsTaken: string[];
  preventiveMeasures: string[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  escalatedAt?: Date;
}

/**
 * BUSINESS HOURS
 *
 * Standardized business hours representation.
 * Used for operational scheduling and support.
 */
export interface BusinessHours {
  timeZone: string;
  schedule: {
    monday: { open: string; close: string; isClosed: boolean };
    tuesday: { open: string; close: string; isClosed: boolean };
    wednesday: { open: string; close: string; isClosed: boolean };
    thursday: { open: string; close: string; isClosed: boolean };
    friday: { open: string; close: string; isClosed: boolean };
    saturday: { open: string; close: string; isClosed: boolean };
    sunday: { open: string; close: string; isClosed: boolean };
  };

  // Special hours
  holidays: Array<{
    date: Date;
    name: string;
    isClosed: boolean;
    specialHours?: { open: string; close: string };
  }>;

  // Metadata
  lastUpdated: Date;
  updatedBy: string;
}

/**
 * SYSTEM HEALTH STATUS
 *
 * Standardized system health indicators.
 * Used for monitoring and alerting.
 */
export interface SystemHealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'maintenance';
  lastCheck: Date;

  // Metrics
  responseTime: number; // milliseconds
  uptime: number; // percentage
  errorRate: number; // percentage

  // Details
  message?: string;
  details?: Record<string, any>;

  // Incident tracking
  incidentId?: string;
  estimatedResolution?: Date;
}

/**
 * VALIDATION RESULT
 *
 * Standardized validation result for all validation operations.
 * Used throughout the service layer for consistent error handling.
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * VALIDATION ERROR
 *
 * Detailed validation error information.
 * Used for client-side error display and debugging.
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
  severity?: 'error' | 'warning' | 'info';
}
