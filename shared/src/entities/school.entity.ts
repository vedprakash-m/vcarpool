/**
 * UNIFIED SCHOOL ENTITY
 *
 * Single source of truth for school data.
 * Represents educational institutions served by the carpool system.
 *
 * Design Principles:
 * - Geographic accuracy for routing
 * - Clear administrative boundaries
 * - Support for complex school structures
 * - Integration with external school systems
 */

import { GeographicLocation, ContactInfo, BusinessHours } from './common.entity';

/**
 * SCHOOL TYPE
 *
 * Classification of educational institutions.
 * Used for filtering and routing logic.
 */
export type SchoolType =
  | 'elementary' // K-5 or K-6
  | 'middle' // 6-8 or 7-8
  | 'high' // 9-12
  | 'k12' // K-12 combined
  | 'charter' // Charter school
  | 'private' // Private school
  | 'magnet' // Magnet/specialty school
  | 'alternative' // Alternative education
  | 'vocational' // Vocational/trade school
  | 'other'; // Other type

/**
 * SCHOOL STATUS
 *
 * Operational status of the school.
 * Affects carpool scheduling and availability.
 */
export type SchoolStatus =
  | 'active' // Currently operational
  | 'inactive' // Temporarily closed
  | 'seasonal' // Seasonal operation
  | 'archived' // Permanently closed
  | 'pending' // New school, not yet active
  | 'maintenance'; // Under maintenance/renovation

/**
 * SCHOOL CALENDAR EVENT
 *
 * Special dates that affect carpool operations.
 * Includes holidays, early dismissals, etc.
 */
export interface SchoolCalendarEvent {
  id: string;
  schoolId: string;

  // Event details
  name: string;
  description?: string;
  type:
    | 'holiday'
    | 'early_dismissal'
    | 'late_start'
    | 'no_school'
    | 'special_event'
    | 'conference_day';

  // Date and time
  date: Date;
  isAllDay: boolean;
  startTime?: string; // "08:00"
  endTime?: string; // "12:00"

  // Impact on carpool
  affectsCarpool: boolean;
  carpoolInstructions?: string;
  alternativeSchedule?: {
    morningPickup?: { startTime: string; endTime: string };
    afternoonDropoff?: { startTime: string; endTime: string };
  };

  // Recurrence
  isRecurring: boolean;
  recurrencePattern?: string; // "yearly", "monthly", "weekly"
  recurrenceEnd?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * SCHOOL TRANSPORTATION ZONE
 *
 * Defines pickup/dropoff locations within school grounds.
 * Critical for safety and traffic management.
 */
export interface SchoolTransportationZone {
  id: string;
  name: string;
  description?: string;

  // Location
  location: GeographicLocation;

  // Zone details
  zoneType: 'pickup' | 'dropoff' | 'both';
  capacity: number;
  isActive: boolean;

  // Time restrictions
  operatingHours: BusinessHours;

  // Safety information
  safetyInstructions?: string;
  emergencyContact?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * PICKUP LOCATION
 *
 * Represents a specific location where students can be picked up or dropped off.
 * Used for carpool routing and scheduling.
 */
export interface PickupLocation {
  id: string;
  name: string;
  address: string;
  location: GeographicLocation;
  type: 'school' | 'home' | 'meeting_point' | 'other';
  isActive: boolean;
  accessibility: {
    wheelchairAccessible: boolean;
    hasParking: boolean;
    isSafe: boolean;
    notes?: string;
  };
  restrictions: {
    timeWindows: Array<{
      startTime: string;
      endTime: string;
      days: Array<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'>;
    }>;
    maxCapacity?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * SCHOOL ZONE
 *
 * Represents the geographic zone or district that a school serves.
 * Used for determining eligibility and routing boundaries.
 */
export interface SchoolZone {
  id: string;
  name: string;
  schoolId: string;
  description?: string;

  // Geographic boundaries
  boundaryPolygon: Array<{
    latitude: number;
    longitude: number;
  }>;

  // Address-based boundaries
  includedZipCodes: string[];
  excludedZipCodes: string[];
  includedStreets: string[];
  excludedStreets: string[];

  // Zone properties
  isActive: boolean;
  priority: number; // Higher priority zones take precedence

  // Transportation options
  busService: boolean;
  carpoolEligible: boolean;
  walkingZone: boolean;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastUpdated: Date;
  updatedBy: string;
}

/**
 * MAIN SCHOOL ENTITY
 *
 * Single source of truth for school data.
 * Represents the complete business domain of schools.
 */
export interface SchoolEntity {
  // === IDENTITY ===
  id: string;
  name: string;
  fullName?: string; // Official full name
  shortName?: string; // Common abbreviation

  // === ADMINISTRATIVE ===
  schoolCode?: string; // District/state code
  districtId?: string; // School district ID
  districtName?: string; // School district name

  // === CLASSIFICATION ===
  type: SchoolType;
  status: SchoolStatus;

  // === GEOGRAPHIC ===
  location: GeographicLocation;

  // Transportation zones
  transportationZones: SchoolTransportationZone[];

  // Service area (for reference)
  serviceArea?: {
    radiusMiles: number;
    includeZipCodes?: string[];
    excludeZipCodes?: string[];
  };

  // === ACADEMIC ===
  gradesServed: string[]; // ["K", "1", "2", "3", "4", "5"]
  studentCapacity: number;
  currentEnrollment?: number;

  // Academic calendar
  academicYear: {
    startDate: Date;
    endDate: Date;
    yearName: string; // "2024-2025"
  };

  // === SCHEDULE ===
  regularSchedule: {
    monday: { startTime: string; endTime: string; isActive: boolean };
    tuesday: { startTime: string; endTime: string; isActive: boolean };
    wednesday: { startTime: string; endTime: string; isActive: boolean };
    thursday: { startTime: string; endTime: string; isActive: boolean };
    friday: { startTime: string; endTime: string; isActive: boolean };
  };

  // Special schedules
  specialSchedules: Array<{
    dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
    startTime: string;
    endTime: string;
    reason: string;
    isActive: boolean;
  }>;

  // === CALENDAR ===
  calendarEvents: SchoolCalendarEvent[];

  // === CONTACT INFORMATION ===
  contactInfo: ContactInfo;

  // Administrative contacts
  contacts: Array<{
    role: 'principal' | 'assistant_principal' | 'secretary' | 'transportation' | 'safety' | 'other';
    name: string;
    email?: string;
    phone?: string;
    extension?: string;
    isActive: boolean;
  }>;

  // === OPERATIONAL HOURS ===
  operatingHours: BusinessHours;

  // === SAFETY & COMPLIANCE ===
  safetyInformation: {
    emergencyContactName: string;
    emergencyContactPhone: string;
    safetyInstructions?: string;

    // Visitor requirements
    visitorCheckInRequired: boolean;
    backgroundCheckRequired: boolean;
    idVerificationRequired: boolean;

    // Pickup/dropoff rules
    pickupRules: string[];
    dropoffRules: string[];
    authorizedPickupRequired: boolean;

    // Emergency procedures
    emergencyProcedures?: string;
    evacuationPlan?: string;
    weatherPolicies?: string;
  };

  // === CARPOOL INTEGRATION ===
  carpoolSettings: {
    isParticipating: boolean;
    requiresApproval: boolean;
    approvalContactId?: string;

    // Carpool zones
    preferredPickupZone?: string;
    preferredDropoffZone?: string;

    // Restrictions
    maxCarpoolGroups?: number;
    maxChildrenPerGroup?: number;

    // Communication
    notificationPreferences: {
      scheduleChanges: boolean;
      emergencyAlerts: boolean;
      groupUpdates: boolean;
    };
  };

  // === EXTERNAL INTEGRATIONS ===
  externalSystems: {
    studentInformationSystem?: {
      systemName: string;
      systemId: string;
      isActive: boolean;
    };

    parentPortal?: {
      portalName: string;
      portalUrl: string;
      isActive: boolean;
    };

    transportationSystem?: {
      systemName: string;
      systemId: string;
      isActive: boolean;
    };
  };

  // === METADATA ===
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastModifiedBy: string;

  // Version control
  version: number;
  isVerified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;

  // Data sources
  dataSource: 'manual' | 'import' | 'integration' | 'verified';
  lastDataSync?: Date;
}

/**
 * SCHOOL CREATION REQUEST
 *
 * Required data for creating a new school.
 * Supports both manual entry and bulk import.
 */
export interface CreateSchoolRequest {
  // Basic information
  name: string;
  fullName?: string;
  type: SchoolType;

  // Location
  address: string;

  // Administrative
  districtId?: string;
  districtName?: string;
  schoolCode?: string;

  // Academic
  gradesServed: string[];
  studentCapacity: number;

  // Schedule
  regularSchedule: {
    monday: { startTime: string; endTime: string; isActive: boolean };
    tuesday: { startTime: string; endTime: string; isActive: boolean };
    wednesday: { startTime: string; endTime: string; isActive: boolean };
    thursday: { startTime: string; endTime: string; isActive: boolean };
    friday: { startTime: string; endTime: string; isActive: boolean };
  };

  // Contact information
  primaryContactName: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;

  // Safety
  emergencyContactName: string;
  emergencyContactPhone: string;

  // Creator context
  createdBy: string;
  dataSource: SchoolEntity['dataSource'];
}

/**
 * SCHOOL UPDATE REQUEST
 *
 * Allowed fields for updating school information.
 * Excludes sensitive fields like id, createdAt, etc.
 */
export interface UpdateSchoolRequest {
  name?: string;
  fullName?: string;
  type?: SchoolType;
  status?: SchoolStatus;

  // Location updates
  address?: string;

  // Academic updates
  gradesServed?: string[];
  studentCapacity?: number;
  currentEnrollment?: number;

  // Schedule updates
  regularSchedule?: Partial<SchoolEntity['regularSchedule']>;

  // Contact updates
  contactInfo?: Partial<ContactInfo>;
  contacts?: SchoolEntity['contacts'];

  // Safety updates
  safetyInformation?: Partial<SchoolEntity['safetyInformation']>;

  // Carpool settings
  carpoolSettings?: Partial<SchoolEntity['carpoolSettings']>;

  // Update context
  updatedBy: string;
  updateReason?: string;
}

/**
 * SCHOOL QUERY FILTERS
 *
 * Support for complex school queries.
 * Used for school discovery and admin interfaces.
 */
export interface SchoolQueryFilters {
  status?: SchoolStatus;
  type?: SchoolType;
  districtId?: string;

  // Geographic filters
  nearLocation?: {
    latitude: number;
    longitude: number;
    radiusMiles: number;
  };
  includesZipCode?: string;
  city?: string;
  state?: string;

  // Academic filters
  servesGrade?: string;
  minCapacity?: number;
  maxCapacity?: number;

  // Participation filters
  isParticipatingInCarpool?: boolean;
  hasActiveGroups?: boolean;

  // Data quality filters
  isVerified?: boolean;
  dataSource?: SchoolEntity['dataSource'];

  // Date filters
  createdAfter?: Date;
  createdBefore?: Date;
  lastSyncAfter?: Date;
}

/**
 * SCHOOL WITH RELATIONSHIPS
 *
 * Extended school entity with populated relationships.
 * Used for detailed school views and management interfaces.
 */
export interface SchoolWithRelationships extends SchoolEntity {
  // Related carpool groups
  carpoolGroups: Array<{
    id: string;
    name: string;
    status: string;
    memberCount: number;
    isActive: boolean;
    lastActivity: Date;
  }>;

  // Statistics
  statistics: {
    totalCarpoolGroups: number;
    activeCarpoolGroups: number;
    totalCarpoolMembers: number;
    totalChildrenServed: number;
    averageGroupSize: number;
    totalTripsCompleted: number;
  };

  // District information (if available)
  district?: {
    id: string;
    name: string;
    totalSchools: number;
    carpoolParticipation: number;
  };
}
