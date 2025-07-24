/**
 * USER DOMAIN SERVICE
 *
 * Consolidated business logic for user management.
 * This replaces the scattered user logic found across multiple services.
 *
 * Key Features:
 * - Unified user lifecycle management
 * - Role-based access control
 * - Verification workflow management
 * - Profile management
 * - Family relationship management
 * - Audit trail integration
 */

import {
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
  ValidationResult,
} from '../entities';

import {
  BaseService,
  ServiceResult,
  ServiceContext,
  DomainEvent,
  ValidationError,
  BusinessRule,
  ServiceDependencies,
} from './index';

export interface UserServiceDependencies extends ServiceDependencies {
  authService: any;
  notificationService: any;
}

export class UserService extends BaseService {
  constructor(dependencies: UserServiceDependencies) {
    super(dependencies, 'UserService');
  }

  /**
   * CREATE USER
   *
   * Creates a new user with complete validation and business rule enforcement.
   */
  async createUser(
    request: CreateUserRequest,
    context: ServiceContext,
  ): Promise<ServiceResult<UserEntity>> {
    try {
      // Validate input
      const validationErrors = await this.validateCreateUserRequest(request);
      if (validationErrors.length > 0) {
        return this.createErrorResult<UserEntity>(
          'Validation failed',
          validationErrors.map((e) => e.message),
        );
      }

      // Check business rules
      const businessRules = this.getCreateUserBusinessRules();
      const ruleErrors = await this.validateBusinessRules(businessRules, { request, context });
      if (ruleErrors.length > 0) {
        return this.createErrorResult<UserEntity>(
          'Business rules violated',
          ruleErrors.map((e) => e.message),
        );
      }

      // Check for existing user
      const existingUser = await this.findUserByEmail(request.email);
      if (existingUser.success && existingUser.data) {
        return this.createErrorResult<UserEntity>('User already exists with this email');
      }

      // Create user entity
      const user: UserEntity = {
        id: this.generateUserId(),
        email: request.email.toLowerCase(),
        entraObjectId: request.entraObjectId,
        authProvider: request.authProvider,
        isActive: true,
        emailVerified: false,
        phoneVerified: false,
        addressVerified: false,
        isActiveDriver: false,
        preferences: {
          isDriver: false,
          notifications: {
            email: true,
            sms: true,
            tripReminders: true,
            swapRequests: true,
            scheduleChanges: true,
          },
        },
        loginAttempts: 0,

        // Profile
        firstName: request.firstName.trim(),
        lastName: request.lastName.trim(),
        fullName: `${request.firstName.trim()} ${request.lastName.trim()}`,
        phoneNumber: request.phoneNumber?.trim(),

        // Business context
        role: request.role,

        // Verification (nested object for additional verification states)
        verification: {
          isEmailVerified: false,
          isPhoneVerified: false,
          isAddressVerified: false,
          isFullyVerified: false,
          // Legacy fields for compatibility
          email: false,
          phone: false,
          address: false,
          emergencyContact: false,
        },

        // Family & relationships
        groupMemberships: [],

        // Contact & emergency
        contactInfo: {
          primaryEmail: request.email.toLowerCase(),
          primaryEmailVerified: false,
          primaryPhone: request.phoneNumber?.trim(),
          primaryPhoneVerified: false,
          preferredContactMethod: 'email',
          canReceiveSMS: !!request.phoneNumber,
          canReceiveEmailNotifications: true,
          canReceivePushNotifications: true,
          verificationAttempts: 0,
        },

        emergencyContacts:
          request.emergencyContactName && request.emergencyContactPhone
            ? [
                {
                  name: request.emergencyContactName,
                  phoneNumber: request.emergencyContactPhone,
                  phone: request.emergencyContactPhone, // Legacy field
                  relationship: 'emergency',
                  verified: false,
                  isVerified: false, // Legacy field
                  isPrimary: true, // Legacy field
                },
              ]
            : [],

        // Geographic
        homeAddress: request.homeAddress,

        // Carpool preferences
        carpoolPreferences: {
          canDrive: false,
          hasValidLicense: false,
          hasInsurance: false,
          preferredDays: [],
          maxPassengers: 0,
          willingToPickupOthers: false,
          morningAvailability: {
            startTime: '07:00',
            endTime: '08:30',
          },
          afternoonAvailability: {
            startTime: '14:30',
            endTime: '16:00',
          },
          needsMakeupOptions: false,
          makeupCommitmentWeeks: 2,
        },

        // Children
        children: [],

        // Metadata
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      };

      // Save to database
      const savedUser = await this.saveUser(user);
      if (!savedUser.success) {
        return this.createErrorResult<UserEntity>('Failed to save user to database');
      }

      // Emit domain event
      await this.logEvent({
        id: this.generateEventId(),
        type: 'user.created',
        entityType: 'user',
        entityId: user.id,
        payload: { user, request },
        context,
        timestamp: new Date(),
        version: 1,
      });

      // Start verification workflow
      await this.initiateUserVerification(user, context);

      return this.createSuccessResult(user);
    } catch (error) {
      this.dependencies.logger.error('Failed to create user', {
        service: this.serviceName,
        error: error instanceof Error ? error.message : 'Unknown error',
        request,
        context,
      });

      return this.createErrorResult<UserEntity>('Internal server error');
    }
  }

  /**
   * UPDATE USER
   *
   * Updates user information with validation and business rule enforcement.
   */
  async updateUser(
    userId: string,
    request: UpdateUserRequest,
    context: ServiceContext,
  ): Promise<ServiceResult<UserEntity>> {
    try {
      // Get existing user
      const existingUser = await this.findUserById(userId);
      if (!existingUser.success || !existingUser.data) {
        return this.createErrorResult<UserEntity>('User not found');
      }

      // Check permissions
      const canUpdate = await this.canUpdateUser(existingUser.data, context);
      if (!canUpdate) {
        return this.createErrorResult<UserEntity>('Insufficient permissions');
      }

      // Validate input
      const validationErrors = await this.validateUpdateUserRequest(request);
      if (validationErrors.length > 0) {
        return this.createErrorResult<UserEntity>(
          'Validation failed',
          validationErrors.map((e) => e.message),
        );
      }

      // Apply updates
      const updatedUser: UserEntity = {
        ...existingUser.data,
        firstName: request.firstName ?? existingUser.data.firstName,
        lastName: request.lastName ?? existingUser.data.lastName,
        phoneNumber: request.phoneNumber ?? existingUser.data.phoneNumber,
        profilePictureUrl: request.profilePictureUrl ?? existingUser.data.profilePictureUrl,
        homeAddress: request.homeAddress ?? existingUser.data.homeAddress,
        contactInfo: request.contactInfo
          ? { ...existingUser.data.contactInfo, ...request.contactInfo }
          : existingUser.data.contactInfo,
        emergencyContacts: request.emergencyContacts ?? existingUser.data.emergencyContacts,
        carpoolPreferences: request.carpoolPreferences
          ? { ...existingUser.data.carpoolPreferences, ...request.carpoolPreferences }
          : existingUser.data.carpoolPreferences,
        children: request.children ?? existingUser.data.children,
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      };

      // Update full name if first or last name changed
      if (request.firstName || request.lastName) {
        updatedUser.fullName = `${updatedUser.firstName} ${updatedUser.lastName}`;
      }

      // Save to database
      const savedUser = await this.saveUser(updatedUser);
      if (!savedUser.success) {
        return this.createErrorResult<UserEntity>('Failed to save user updates');
      }

      // Emit domain event
      await this.logEvent({
        id: this.generateEventId(),
        type: 'user.updated',
        entityType: 'user',
        entityId: userId,
        payload: { oldUser: existingUser.data, newUser: updatedUser, request },
        context,
        timestamp: new Date(),
        version: 1,
      });

      return this.createSuccessResult(updatedUser);
    } catch (error) {
      this.dependencies.logger.error('Failed to update user', {
        service: this.serviceName,
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        request,
        context,
      });

      return this.createErrorResult('Internal server error');
    }
  }

  /**
   * FIND USER BY ID
   */
  async findUserById(userId: string): Promise<ServiceResult<UserEntity>> {
    try {
      const user = await this.dependencies.database.findUserById(userId);
      if (!user) {
        return this.createErrorResult('User not found');
      }

      return this.createServiceResult(true, user);
    } catch (error) {
      this.dependencies.logger.error('Failed to find user by ID', {
        service: this.serviceName,
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });

      return this.createErrorResult('Internal server error');
    }
  }

  /**
   * FIND USER BY EMAIL
   */
  async findUserByEmail(email: string): Promise<ServiceResult<UserEntity>> {
    try {
      const user = await this.dependencies.database.findUserByEmail(email.toLowerCase());
      if (!user) {
        return this.createErrorResult('User not found');
      }

      return this.createServiceResult(true, user);
    } catch (error) {
      this.dependencies.logger.error('Failed to find user by email', {
        service: this.serviceName,
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
      });

      return this.createErrorResult('Internal server error');
    }
  }

  /**
   * VERIFY USER EMAIL
   */
  async verifyUserEmail(
    userId: string,
    verificationToken: string,
    context: ServiceContext,
  ): Promise<ServiceResult<boolean>> {
    try {
      const user = await this.findUserById(userId);
      if (!user.success || !user.data) {
        return this.createErrorResult('User not found');
      }

      // Verify token (implementation depends on your token system)
      const isValidToken = await this.verifyEmailToken(userId, verificationToken);
      if (!isValidToken) {
        return this.createErrorResult('Invalid verification token');
      }

      // Update verification status
      const updatedUser: UserEntity = {
        ...user.data,
        emailVerified: true,
        verification: {
          isEmailVerified: true,
          isPhoneVerified: user.data.verification?.isPhoneVerified || false,
          isAddressVerified: user.data.verification?.isAddressVerified || false,
          isFullyVerified: false, // Will be calculated below
          email: true,
          phone: user.data.verification?.phone || false,
          address: user.data.verification?.address || false,
          emergencyContact: user.data.verification?.emergencyContact || false,
        },
        contactInfo: {
          ...user.data.contactInfo,
          primaryEmailVerified: true,
        },
        updatedAt: new Date(),
      };

      // Check if fully verified
      if (updatedUser.verification) {
        updatedUser.verification.isFullyVerified = this.checkFullVerification(
          updatedUser.verification,
        );
      }

      // Save to database
      const savedUser = await this.saveUser(updatedUser);
      if (!savedUser.success) {
        return this.createErrorResult('Failed to save verification status');
      }

      // Emit domain event
      await this.logEvent({
        id: this.generateEventId(),
        type: 'user.email_verified',
        entityType: 'user',
        entityId: userId,
        payload: { user: updatedUser },
        context,
        timestamp: new Date(),
        version: 1,
      });

      return this.createServiceResult(true, true);
    } catch (error) {
      this.dependencies.logger.error('Failed to verify user email', {
        service: this.serviceName,
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        context,
      });

      return this.createErrorResult('Internal server error');
    }
  }

  // Private helper methods

  private async validateCreateUserRequest(request: CreateUserRequest): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    if (!request.email || !this.isValidEmail(request.email)) {
      errors.push({
        field: 'email',
        message: 'Valid email is required',
        code: 'INVALID_EMAIL',
      });
    }

    if (!request.firstName || request.firstName.trim().length < 2) {
      errors.push({
        field: 'firstName',
        message: 'First name must be at least 2 characters',
        code: 'INVALID_FIRST_NAME',
      });
    }

    if (!request.lastName || request.lastName.trim().length < 2) {
      errors.push({
        field: 'lastName',
        message: 'Last name must be at least 2 characters',
        code: 'INVALID_LAST_NAME',
      });
    }

    if (!request.role || !this.isValidRole(request.role)) {
      errors.push({
        field: 'role',
        message: 'Valid role is required',
        code: 'INVALID_ROLE',
      });
    }

    if (request.phoneNumber && !this.isValidPhoneNumber(request.phoneNumber)) {
      errors.push({
        field: 'phoneNumber',
        message: 'Invalid phone number format',
        code: 'INVALID_PHONE_NUMBER',
      });
    }

    return errors;
  }

  private async validateUpdateUserRequest(request: UpdateUserRequest): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    if (request.firstName && request.firstName.trim().length < 2) {
      errors.push({
        field: 'firstName',
        message: 'First name must be at least 2 characters',
        code: 'INVALID_FIRST_NAME',
      });
    }

    if (request.lastName && request.lastName.trim().length < 2) {
      errors.push({
        field: 'lastName',
        message: 'Last name must be at least 2 characters',
        code: 'INVALID_LAST_NAME',
      });
    }

    if (request.phoneNumber && !this.isValidPhoneNumber(request.phoneNumber)) {
      errors.push({
        field: 'phoneNumber',
        message: 'Invalid phone number format',
        code: 'INVALID_PHONE_NUMBER',
      });
    }

    return errors;
  }

  private getCreateUserBusinessRules(): BusinessRule[] {
    return [
      {
        id: 'unique_email',
        name: 'Unique Email',
        description: 'Email must be unique across all users',
        evaluate: async (context: any) => {
          const existingUser = await this.findUserByEmail(context.request.email);
          return !existingUser.success || !existingUser.data;
        },
        errorMessage: 'Email already exists in the system',
        severity: 'error',
      },
      {
        id: 'terms_acceptance',
        name: 'Terms Acceptance',
        description: 'User must accept terms and conditions',
        evaluate: (context: any) => context.request.agreesToTerms === true,
        errorMessage: 'Must accept terms and conditions',
        severity: 'error',
      },
      {
        id: 'privacy_policy_acceptance',
        name: 'Privacy Policy Acceptance',
        description: 'User must accept privacy policy',
        evaluate: (context: any) => context.request.agreesToPrivacyPolicy === true,
        errorMessage: 'Must accept privacy policy',
        severity: 'error',
      },
    ];
  }

  private getRolePermissions(role: UserRole): any {
    // This would be implemented based on your role permission system
    // For now, return a placeholder
    return {};
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  }

  private isValidRole(role: string): boolean {
    const validRoles: UserRole[] = ['super_admin', 'group_admin', 'parent', 'student'];
    return validRoles.includes(role as UserRole);
  }

  private checkFullVerification(verification: UserVerificationStatus): boolean {
    return (
      (verification.email ?? false) &&
      (verification.phone ?? false) &&
      (verification.address ?? false) &&
      (verification.emergencyContact ?? false)
    );
  }

  private async canUpdateUser(user: UserEntity, context: ServiceContext): Promise<boolean> {
    // Users can update their own profile
    if (user.id === context.userId) {
      return true;
    }

    // Admins can update any user
    if (context.userRole === 'super_admin') {
      return true;
    }

    // Group admins can update members of their groups
    if (context.userRole === 'group_admin') {
      // This would require checking group memberships
      return false; // Placeholder
    }

    return false;
  }

  private async saveUser(user: UserEntity): Promise<ServiceResult<UserEntity>> {
    try {
      const savedUser = await this.dependencies.database.saveUser(user);
      return this.createServiceResult(true, savedUser);
    } catch (error) {
      return this.createErrorResult('Database error');
    }
  }

  private async verifyEmailToken(userId: string, token: string): Promise<boolean> {
    // This would be implemented based on your token system
    // For now, return true as placeholder
    return true;
  }

  private async initiateUserVerification(user: UserEntity, context: ServiceContext): Promise<void> {
    // Send verification email
    await this.dependencies.notificationService.sendEmailVerification(user.email, user.id);

    // Log verification initiated
    this.dependencies.logger.info('User verification initiated', {
      service: this.serviceName,
      userId: user.id,
      email: user.email,
      context,
    });
  }
}
