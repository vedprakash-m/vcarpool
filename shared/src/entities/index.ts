/**
 * UNIFIED ENTITY SYSTEM
 *
 * Single source of truth for all business entities.
 * This replaces the fragmented type definitions scattered across the codebase.
 *
 * Key Improvements:
 * - Business-entity-first design
 * - Complete lifecycle management
 * - Consistent naming and structure
 * - Comprehensive audit trails
 * - Safety and compliance focus
 * - Real-time tracking capabilities
 * - Proper relationship modeling
 *
 * Migration Strategy:
 * 1. Import from this module instead of old types.ts
 * 2. Update all services to use these entities
 * 3. Update all API contracts to match these entities
 * 4. Update database schemas to match these entities
 * 5. Update frontend components to use these entities
 * 6. Deprecate old types.ts after migration is complete
 */

// === CORE ENTITIES ===
export * from './user.entity';
export * from './group.entity';
export * from './school.entity';
export * from './trip.entity';
export * from './common.entity';

// === UNIFIED IMPORTS FOR CONVENIENCE ===
export type {
  // User system
  UserEntity,
  UserRole,
  CreateUserRequest,
  UpdateUserRequest,
  UserQueryFilters,
  UserWithRelationships,
  UserVerificationStatus,
  FamilyMembership,
  UserProfileView,
  AuthenticatedUser,
  DatabaseUser,
} from './user.entity';

export type {
  // Group system
  GroupEntity,
  GroupStatus,
  GroupMember,
  GroupInvitation,
  GroupJoinRequest,
  CreateGroupRequest,
  UpdateGroupRequest,
  GroupQueryFilters,
  GroupWithRelationships,
} from './group.entity';

export type {
  // School system
  SchoolEntity,
  SchoolType,
  SchoolStatus,
  CreateSchoolRequest,
  UpdateSchoolRequest,
  SchoolQueryFilters,
  SchoolWithRelationships,
  PickupLocation,
  SchoolZone,
} from './school.entity';

export type {
  // Trip system
  TripEntity,
  TripStatus,
  TripType,
  TripParticipant,
  CreateTripRequest,
  UpdateTripRequest,
  TripQueryFilters,
  TripWithRelationships,
} from './trip.entity';

export type {
  // Common types
  GeographicLocation,
  ContactInfo,
  TravelSchedule,
  AuditLogEntry,
  NotificationPreferences,
  NotificationType,
  SafetyIncident,
  BusinessHours,
  SystemHealthStatus,
} from './common.entity';

export type {
  MembershipStatus,
  InvitationStatus,
  GroupSchedule,
  GroupServiceArea,
  GroupActivityMetrics,
} from './group.entity';

export type { SchoolCalendarEvent, SchoolTransportationZone } from './school.entity';

export type {
  TripRoute,
  TripVehicle,
  TripTracking,
  TripFeedback,
  TripCommunication,
} from './trip.entity';

/**
 * ENTITY RELATIONSHIP TYPES
 *
 * Common relationship patterns used across entities.
 */
export interface EntityReference {
  id: string;
  name: string;
  type: string;
}

export interface EntityRelationship {
  fromEntityId: string;
  fromEntityType: string;
  toEntityId: string;
  toEntityType: string;
  relationshipType: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * VALIDATION SCHEMAS
 *
 * Common validation patterns for entities.
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
  severity?: 'error' | 'warning' | 'info';
}

export interface EntityValidationContext {
  entityType: string;
  entityId: string;
  validationType: 'create' | 'update' | 'delete' | 'archive';
  performedBy: string;
  timestamp: Date;
}

/**
 * COMMON QUERY PATTERNS
 *
 * Standard query patterns used across all entities.
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface QueryMetadata {
  queryId: string;
  executedAt: Date;
  executionTime: number;
  resultCount: number;
  cacheHit: boolean;
}

/**
 * SYSTEM INTEGRATION TYPES
 *
 * Types for external system integration.
 */
export interface ExternalSystemReference {
  systemName: string;
  systemId: string;
  externalId: string;
  syncStatus: 'synced' | 'pending' | 'failed' | 'disabled';
  lastSyncAt?: Date;
  syncErrors?: string[];
}

export interface IntegrationEvent {
  id: string;
  entityType: string;
  entityId: string;
  eventType: 'create' | 'update' | 'delete' | 'sync';
  externalSystem: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payload: any;
  result?: any;
  error?: string;
  createdAt: Date;
  processedAt?: Date;
}

/**
 * ANALYTICS AND REPORTING TYPES
 *
 * Types for analytics and reporting features.
 */
export interface MetricPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

export interface AnalyticsReport {
  id: string;
  reportType: string;
  title: string;
  description?: string;
  generatedAt: Date;
  generatedBy: string;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  metrics: Record<string, MetricPoint[]>;
  summary: Record<string, number>;
}

/**
 * NOTIFICATION SYSTEM TYPES
 *
 * Types for the notification system.
 */
export interface NotificationTemplate {
  id: string;
  name: string;
  type: import('./common.entity').NotificationType;
  subject: string;
  bodyTemplate: string;
  channels: Array<'email' | 'sms' | 'push'>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationDelivery {
  id: string;
  notificationId: string;
  recipientId: string;
  channel: 'email' | 'sms' | 'push';
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
}

/**
 * ENTITY LIFECYCLE TYPES
 *
 * Common lifecycle management for all entities.
 */
export interface EntityLifecycle {
  entityId: string;
  entityType: string;
  currentStatus: string;
  statusHistory: Array<{
    fromStatus: string;
    toStatus: string;
    reason: string;
    changedBy: string;
    changedAt: Date;
  }>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
  deletedAt?: Date;
}

/**
 * PERMISSION SYSTEM TYPES
 *
 * Types for the permission and authorization system.
 */
export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface RolePermissionMapping {
  role: import('./user.entity').UserRole;
  permissions: Permission[];
  grantedAt: Date;
  grantedBy: string;
}

export interface UserPermissionCheck {
  userId: string;
  permission: string;
  resource: string;
  context?: Record<string, any>;
  result: boolean;
  reason?: string;
  checkedAt: Date;
}

/**
 * MIGRATION HELPER TYPES
 *
 * Types to help with the migration from old type system.
 */
export interface MigrationMapping {
  oldType: string;
  newEntity: string;
  fieldMappings: Record<string, string>;
  transformations: Record<string, (value: any) => any>;
}

export interface MigrationResult {
  totalRecords: number;
  successfulMigrations: number;
  failedMigrations: number;
  errors: Array<{
    recordId: string;
    error: string;
    data: any;
  }>;
  warnings: string[];
  completedAt: Date;
}

/**
 * SYSTEM HEALTH AND MONITORING
 *
 * Types for system health monitoring and alerting.
 */
export interface HealthCheck {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message?: string;
    responseTime?: number;
  }>;
  timestamp: Date;
}

export interface SystemAlert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  source: string;
  affectedServices: string[];
  isResolved: boolean;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}
