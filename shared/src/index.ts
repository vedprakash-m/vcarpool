// Export unified entities (SINGLE SOURCE OF TRUTH)
export * from './entities/user.entity';
export * from './entities/group.entity';
export * from './entities/trip.entity';
export * from './entities/school.entity';

// Export all validation schemas
export * from './validations';

// Export parameter validation schemas
export * from './schemas/trip-params';
export * from './schemas/user-params';
export * from './schemas/chat-schemas';
export * from './schemas/message-schemas';
// Explicitly export password-related schemas for backend
export { forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from './validations';

// Export all utilities
export * from './utils';

// Export unified authentication contracts
export * from './contracts/auth.contract';
export * from './config/jwt.config';

// New Notification contract
export * from './contracts/notification';

// Constants
export const APP_CONFIG = {
  MAX_PASSENGERS_PER_TRIP: 8,
  DEFAULT_TRIP_COST: 5.0,
  NOTIFICATION_DELAY_MINUTES: 30,
  MAX_SWAP_REQUESTS_PER_DAY: 3,
  SESSION_TIMEOUT_HOURS: 24,
  PASSWORD_MIN_LENGTH: 8,
};

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
};

export const SUCCESS_MESSAGES = {
  USER_CREATED: 'User account created successfully',
  USER_UPDATED: 'User profile updated successfully',
  TRIP_CREATED: 'Trip created successfully',
  TRIP_UPDATED: 'Trip updated successfully',
  TRIP_CANCELLED: 'Trip cancelled successfully',
  SWAP_REQUEST_SENT: 'Swap request sent successfully',
  SWAP_REQUEST_ACCEPTED: 'Swap request accepted',
  SWAP_REQUEST_REJECTED: 'Swap request rejected',
};

// Export types
export * from './validations';

// Re-export commonly used types for convenience
export type {
  User,
  Trip,
  Schedule,
  SwapRequest,
  CreateTripRequest,
  UpdateTripRequest,
  JoinTripRequest,
  ApiResponse,
  PaginatedResponse,
  TripStatus,
  UserPreferences,
  Message,
  ChatRoom,
  ChatParticipant,
  Notification,
  NotificationType,
  MessageType,
  RealTimeEvent,
  SendMessageRequest,
  CreateChatRequest,
  UpdateMessageRequest,
  CreateNotificationRequest,
  ChatRoomWithUnreadCount,
  MessageWithSender,
  TripStats,
  // NEW Product Spec Types
  Child,
  Location,
  WeeklyScheduleTemplateSlot,
  DriverWeeklyPreference,
  RideAssignment,
  CreateUserRequest,
  ChangePasswordRequest,
  SubmitWeeklyPreferencesRequest,
  GenerateScheduleRequest,
  CreateChildRequest,
  UpdateChildRequest,
  VedUser,
} from './types';

// Explicitly export types needed by backend services
export type { Family, DayPreference } from './types';
export type { Preference, Assignment } from './types';

// Export types that may be imported individually
export type {
  School,
  NotificationEntity,
  NotificationStatus,
  ScheduleEntity,
  PreferenceEntity,
  ValidationResult,
  PhoneValidation,
  AddressValidation,
  TravelingParentSchedule,
  MakeupOption,
  EmailRequest,
  EmailTemplate,
  FairnessMetrics,
} from './types';

// Export specific constants that tests and other modules need
export { TESLA_STEM_HIGH_SCHOOL } from './types';
