/**
 * UNIFIED TRIP ENTITY
 *
 * Single source of truth for trip data.
 * Represents individual carpool trips with complete lifecycle management.
 *
 * Design Principles:
 * - Complete trip lifecycle tracking
 * - Safety-first design
 * - Real-time status updates
 * - Audit trail for compliance
 * - Integration with external systems
 */

import { GeographicLocation, AuditLogEntry } from './common.entity';

/**
 * TRIP STATUS
 *
 * Complete lifecycle states for trip management.
 * Supports both automatic and manual state transitions.
 */
export type TripStatus =
  | 'scheduled' // Trip planned, not yet started
  | 'confirmed' // Driver confirmed, ready to start
  | 'in_progress' // Trip actively in progress
  | 'completed' // Trip successfully completed
  | 'cancelled' // Trip cancelled before start
  | 'delayed' // Trip delayed but still happening
  | 'rescheduled' // Trip moved to different time
  | 'failed' // Trip failed to complete
  | 'abandoned' // Trip abandoned mid-journey
  | 'archived'; // Historical record

/**
 * TRIP TYPE
 *
 * Different types of trips supported by the system.
 */
export type TripType =
  | 'morning_pickup' // Morning school pickup
  | 'afternoon_dropoff' // Afternoon school dropoff
  | 'field_trip' // School field trip
  | 'activity' // After-school activity
  | 'emergency' // Emergency trip
  | 'makeup' // Makeup trip for traveling parent
  | 'one_time' // One-time special trip
  | 'recurring'; // Part of recurring schedule

/**
 * TRIP PARTICIPANT
 *
 * Individual participant in a trip.
 * Includes both drivers and passengers.
 */
export interface TripParticipant {
  id: string;
  tripId: string;

  // Participant identity
  userId: string;
  userName: string;
  userPhone?: string;

  // Participation details
  role: 'driver' | 'passenger' | 'child' | 'guardian';

  // For child participants
  childId?: string;
  childName?: string;
  childGrade?: string;
  parentId?: string;
  parentName?: string;
  parentPhone?: string;

  // Status
  status: 'confirmed' | 'pending' | 'cancelled' | 'no_show' | 'completed';

  // Pickup/dropoff details
  pickupLocation?: GeographicLocation;
  dropoffLocation?: GeographicLocation;
  pickupTime?: Date;
  dropoffTime?: Date;

  // Safety information
  emergencyContact?: string;
  emergencyPhone?: string;
  specialNeeds?: string;
  carSeatRequired?: boolean;

  // Confirmation tracking
  confirmedAt?: Date;
  confirmedBy?: string;

  // Completion tracking
  pickedUpAt?: Date;
  droppedOffAt?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * TRIP VEHICLE
 *
 * Vehicle information for the trip.
 * Critical for safety and identification.
 */
export interface TripVehicle {
  // Vehicle identification
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;

  // Capacity and safety
  passengerCapacity: number;
  hasCarSeats: boolean;
  carSeatTypes: string[];

  // Insurance and registration
  insuranceCompany?: string;
  insurancePolicyNumber?: string;
  registrationState?: string;
  registrationExpiry?: Date;

  // Verification
  isVerified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;

  // Metadata
  lastUpdated: Date;
  updatedBy: string;
}

/**
 * TRIP ROUTE
 *
 * Planned route for the trip.
 * Supports both simple and complex routing.
 */
export interface TripRoute {
  id: string;

  // Route waypoints
  waypoints: Array<{
    id: string;
    location: GeographicLocation;
    type: 'pickup' | 'dropoff' | 'school' | 'waypoint';
    participantId?: string;
    estimatedTime: Date;
    actualTime?: Date;
    notes?: string;
  }>;

  // Route details
  totalDistance: number; // miles
  estimatedDuration: number; // minutes
  actualDuration?: number; // minutes

  // Navigation
  routeInstructions?: string;
  mapUrl?: string;

  // Optimization
  isOptimized: boolean;
  optimizedAt?: Date;
  optimizationScore?: number; // 0-100

  // Traffic considerations
  trafficConditions?: 'light' | 'moderate' | 'heavy' | 'severe';
  estimatedDelay?: number; // minutes

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * TRIP COMMUNICATION
 *
 * Communication log for the trip.
 * Tracks all messages and updates.
 */
export interface TripCommunication {
  id: string;
  tripId: string;

  // Message details
  type: 'notification' | 'update' | 'emergency' | 'delay' | 'cancellation' | 'completion';
  subject: string;
  message: string;

  // Sender/recipient
  sentBy: string;
  sentByName: string;
  recipients: Array<{
    userId: string;
    userName: string;
    channel: 'email' | 'sms' | 'push' | 'app';
    deliveredAt?: Date;
    readAt?: Date;
  }>;

  // Priority
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isEmergency: boolean;

  // Status
  status: 'sent' | 'delivered' | 'read' | 'failed';

  // Metadata
  sentAt: Date;
  createdAt: Date;
}

/**
 * TRIP TRACKING
 *
 * Real-time tracking information for the trip.
 * Used for live updates and safety monitoring.
 */
export interface TripTracking {
  tripId: string;

  // Current status
  isActive: boolean;
  currentLocation?: GeographicLocation;
  lastLocationUpdate?: Date;

  // Progress
  currentWaypointIndex: number;
  completedWaypoints: number;
  totalWaypoints: number;
  progressPercentage: number;

  // Timing
  startedAt?: Date;
  estimatedCompletionTime?: Date;
  actualCompletionTime?: Date;

  // Delays
  isDelayed: boolean;
  delayReason?: string;
  estimatedDelay?: number; // minutes

  // Safety
  lastSafetyCheck?: Date;
  emergencyAlerts: Array<{
    type: 'location' | 'speed' | 'route' | 'communication' | 'other';
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    triggeredAt: Date;
    resolvedAt?: Date;
  }>;

  // Device tracking
  trackingDeviceId?: string;
  trackingMethod?: 'mobile_app' | 'gps_device' | 'manual';

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * TRIP FEEDBACK
 *
 * Feedback and rating system for trips.
 * Used for quality assurance and improvement.
 */
export interface TripFeedback {
  id: string;
  tripId: string;

  // Feedback source
  submittedBy: string;
  submittedByName: string;
  submittedByRole: 'driver' | 'passenger' | 'parent' | 'admin';

  // Rating (1-5 stars)
  overallRating: number;

  // Specific ratings
  ratings: {
    punctuality: number; // 1-5
    safety: number; // 1-5
    communication: number; // 1-5
    vehicle: number; // 1-5
    driver: number; // 1-5
  };

  // Comments
  positiveComments?: string;
  negativeComments?: string;
  suggestions?: string;

  // Issues reported
  issues: Array<{
    type: 'safety' | 'punctuality' | 'communication' | 'vehicle' | 'behavior' | 'other';
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;

  // Follow-up
  requiresFollowUp: boolean;
  followUpAssignedTo?: string;
  followUpCompleted?: boolean;
  followUpNotes?: string;

  // Metadata
  submittedAt: Date;
  createdAt: Date;
}

/**
 * MAIN TRIP ENTITY
 *
 * Single source of truth for trip data.
 * Represents the complete business domain of carpool trips.
 */
export interface TripEntity {
  // === IDENTITY ===
  id: string;
  groupId: string;
  groupName: string;

  // === CLASSIFICATION ===
  type: TripType;
  status: TripStatus;

  // === SCHEDULING ===
  scheduledDate: Date;
  scheduledStartTime: Date;
  scheduledEndTime: Date;

  // Actual timing
  actualStartTime?: Date;
  actualEndTime?: Date;

  // === PARTICIPANTS ===
  participants: TripParticipant[];

  // Driver information
  driverId: string;
  driverName: string;
  driverPhone?: string;
  backupDriverId?: string;
  backupDriverName?: string;

  // === VEHICLE ===
  vehicle: TripVehicle;

  // === ROUTE ===
  route: TripRoute;

  // === SCHOOL CONTEXT ===
  schoolId: string;
  schoolName: string;
  schoolAddress: string;
  schoolLocation: GeographicLocation;

  // === STATUS TRACKING ===
  statusHistory: Array<{
    fromStatus: TripStatus;
    toStatus: TripStatus;
    reason: string;
    changedBy: string;
    changedAt: Date;
  }>;

  // === COMMUNICATION ===
  communications: TripCommunication[];

  // === TRACKING ===
  tracking?: TripTracking;

  // === FEEDBACK ===
  feedback: TripFeedback[];

  // === SAFETY & COMPLIANCE ===
  safetyChecks: Array<{
    type: 'pre_trip' | 'in_transit' | 'post_trip' | 'emergency';
    checkedBy: string;
    checkedAt: Date;
    status: 'passed' | 'failed' | 'warning';
    notes?: string;
    issues?: string[];
  }>;

  // Emergency information
  emergencyContacts: Array<{
    name: string;
    phone: string;
    relationship: string;
    isNotified: boolean;
    notifiedAt?: Date;
  }>;

  // === FINANCIAL ===
  costs: {
    fuelCost?: number;
    tolls?: number;
    parking?: number;
    maintenance?: number;
    totalCost?: number;
    reimbursements?: Array<{
      type: string;
      amount: number;
      paidBy: string;
      paidTo: string;
      paidAt: Date;
    }>;
  };

  // === WEATHER & CONDITIONS ===
  conditions: {
    weather?: string;
    temperature?: number;
    precipitation?: string;
    visibility?: string;
    roadConditions?: string;
    impactedByWeather: boolean;
  };

  // === EXTERNAL INTEGRATIONS ===
  externalReferences: {
    scheduleId?: string;
    notificationIds?: string[];
    trackingDeviceId?: string;
    insuranceClaimId?: string;
  };

  // === AUDIT TRAIL ===
  auditLog: AuditLogEntry[];

  // === METADATA ===
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastModifiedBy: string;

  // Version control
  version: number;
  scheduledBy: string;
  scheduledAt: Date;

  // Recurring trip context
  recurringTripId?: string;
  isRecurring: boolean;
  recurrencePattern?: string;

  // Cancellation details
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: Date;

  // Completion confirmation
  completionConfirmedBy?: string;
  completionConfirmedAt?: Date;
  completionNotes?: string;
}

/**
 * TRIP CREATION REQUEST
 *
 * Required data for creating a new trip.
 * Supports both manual and automated trip creation.
 */
export interface CreateTripRequest {
  // Basic information
  groupId: string;
  type: TripType;

  // Scheduling
  scheduledDate: Date;
  scheduledStartTime: Date;
  scheduledEndTime: Date;

  // Driver assignment
  driverId: string;
  backupDriverId?: string;

  // Participants
  participantIds: string[];
  childIds?: string[];

  // Route
  pickupLocations: Array<{
    participantId: string;
    location: GeographicLocation;
  }>;
  dropoffLocations: Array<{
    participantId: string;
    location: GeographicLocation;
  }>;

  // Vehicle
  vehicleInfo: TripVehicle;

  // Context
  schoolId: string;
  createdBy: string;
  schedulingReason?: string;

  // Recurring trip
  isRecurring?: boolean;
  recurrencePattern?: string;
  recurringTripId?: string;
}

/**
 * TRIP UPDATE REQUEST
 *
 * Allowed fields for updating trip information.
 * Supports status changes and real-time updates.
 */
export interface UpdateTripRequest {
  status?: TripStatus;

  // Timing updates
  actualStartTime?: Date;
  actualEndTime?: Date;

  // Route updates
  currentLocation?: GeographicLocation;
  estimatedDelay?: number;

  // Participant updates
  participantStatuses?: Array<{
    participantId: string;
    status: TripParticipant['status'];
    pickedUpAt?: Date;
    droppedOffAt?: Date;
  }>;

  // Driver updates
  driverId?: string;
  backupDriverId?: string;

  // Status change context
  statusChangeReason?: string;
  updatedBy: string;

  // Completion details
  completionNotes?: string;

  // Cancellation details
  cancellationReason?: string;
}

/**
 * TRIP QUERY FILTERS
 *
 * Support for complex trip queries.
 * Used for scheduling, reporting, and analytics.
 */
export interface TripQueryFilters {
  status?: TripStatus;
  type?: TripType;
  groupId?: string;
  schoolId?: string;
  driverId?: string;
  participantId?: string;

  // Date filters
  scheduledAfter?: Date;
  scheduledBefore?: Date;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };

  // Status filters
  isActive?: boolean;
  isCompleted?: boolean;
  isCancelled?: boolean;
  requiresFollowUp?: boolean;

  // Geographic filters
  nearLocation?: {
    latitude: number;
    longitude: number;
    radiusMiles: number;
  };

  // Recurring filters
  isRecurring?: boolean;
  recurringTripId?: string;

  // Performance filters
  hasDelays?: boolean;
  hasIssues?: boolean;
  ratingBelow?: number;

  // Metadata filters
  createdBy?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

/**
 * TRIP WITH RELATIONSHIPS
 *
 * Extended trip entity with populated relationships.
 * Used for detailed trip views and management interfaces.
 */
export interface TripWithRelationships extends TripEntity {
  // Populated relationships
  group: {
    id: string;
    name: string;
    status: string;
    adminName: string;
    adminPhone?: string;
  };

  school: {
    id: string;
    name: string;
    address: string;
    location: GeographicLocation;
    emergencyPhone?: string;
  };

  driver: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    rating?: number;
    isVerified: boolean;
  };

  backupDriver?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    rating?: number;
    isVerified: boolean;
  };

  // Computed statistics
  statistics: {
    totalParticipants: number;
    totalChildren: number;
    totalDistance: number;
    totalDuration: number;
    averageRating: number;
    onTimePercentage: number;
    completionRate: number;
  };
}
