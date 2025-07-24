/**
 * User Domain Service - Unified User Management
 *
 * REMEDIATION: Updated to use the new unified AuthenticationService
 * instead of managing authentication logic directly.
 */

import { UserEntity, CreateUserRequest, AuthenticatedUser } from '@carpool/shared';
import { UserRole } from '@carpool/shared/dist/entities/user.entity';
import { databaseService } from '../database.service';
import { configService } from '../config.service';
import { AuthenticationService } from '../auth/authentication.service';
import { AuthCredentials, AuthResult as NewAuthResult, AuthUserResponse } from '@carpool/shared';

// VedUser interface from Entra ID
export interface VedUser {
  id: string; // Entra ID subject claim
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
}

// Authentication result (backward compatibility)
export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  token?: string;
  refreshToken?: string;
  message?: string;
}

// Login credentials
export interface LoginCredentials {
  email: string;
  password: string;
}

export class UserDomainService {
  private static instance: UserDomainService;
  private authService: AuthenticationService;
  private readonly logger: any;
  private readonly databaseService: any;

  private constructor() {
    // Create a simple logger wrapper
    this.logger = {
      debug: (msg: string, data?: any) => console.debug(msg, data),
      info: (msg: string, data?: any) => console.info(msg, data),
      warn: (msg: string, data?: any) => console.warn(msg, data),
      error: (msg: string, error?: any) => console.error(msg, error),
      setContext: () => {},
      child: () => this.logger,
      startTimer: (label: string) => () => {},
    };

    this.databaseService = databaseService;
    this.authService = new AuthenticationService(databaseService, this.logger);
  }

  public static getInstance(): UserDomainService {
    if (!UserDomainService.instance) {
      UserDomainService.instance = new UserDomainService();
    }
    return UserDomainService.instance;
  }

  /**
   * UNIFIED AUTHENTICATION METHOD
   * Now delegates to the new AuthenticationService
   */
  async authenticateUser(credentials: LoginCredentials | string): Promise<AuthResult> {
    try {
      let authCredentials: AuthCredentials;

      // If string, it's an Entra ID token
      if (typeof credentials === 'string') {
        authCredentials = {
          type: 'entra_token',
          token: credentials,
        };
      } else {
        // Otherwise, it's legacy email/password
        authCredentials = {
          type: 'password',
          email: credentials.email,
          password: credentials.password,
        };
      }

      const authResult = await this.authService.authenticate(authCredentials);

      // Convert to legacy format for backward compatibility
      return {
        success: authResult.success,
        user: authResult.user ? this.authUserToAuthenticatedUser(authResult.user) : undefined,
        token: authResult.accessToken,
        refreshToken: authResult.refreshToken,
        message: authResult.message,
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        message: 'Authentication failed. Please try again.',
      };
    }
  }

  /**
   * Convert AuthUserResponse to AuthenticatedUser for backward compatibility
   */
  private authUserToAuthenticatedUser(authUser: AuthUserResponse): AuthenticatedUser {
    return {
      id: authUser.id,
      email: authUser.email,
      firstName: authUser.firstName,
      lastName: authUser.lastName,
      role: authUser.role,
      authProvider: authUser.authProvider,
      isActive: authUser.isActive,
    };
  }

  /**
   * Refresh token using new AuthenticationService
   */
  async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      const authCredentials: AuthCredentials = {
        type: 'refresh_token',
        token: refreshToken,
      };

      const authResult = await this.authService.authenticate(authCredentials);

      return {
        success: authResult.success,
        user: authResult.user ? this.authUserToAuthenticatedUser(authResult.user) : undefined,
        token: authResult.accessToken,
        refreshToken: authResult.refreshToken,
        message: authResult.message,
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        message: 'Token refresh failed. Please login again.',
      };
    }
  }

  /**
   * Verify token using new AuthenticationService
   */
  async verifyToken(token: string): Promise<AuthResult> {
    try {
      const validationResult = await this.authService.validateToken(token);

      return {
        success: validationResult.valid,
        user: validationResult.user
          ? this.authUserToAuthenticatedUser(validationResult.user)
          : undefined,
        token: validationResult.valid ? token : undefined,
        message: validationResult.message,
      };
    } catch (error) {
      console.error('Token verification error:', error);
      return {
        success: false,
        message: 'Token verification failed.',
      };
    }
  }

  /**
   * REGISTER USER - Create new user directly through database service
   */
  async registerUser(request: CreateUserRequest): Promise<AuthResult> {
    try {
      // Hash password if provided
      let passwordHash: string | undefined;
      if (request.password) {
        const bcrypt = await import('bcrypt');
        passwordHash = await bcrypt.hash(request.password, 12);
      }

      // Create user entity
      const userEntity: Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'> = {
        email: request.email,
        firstName: request.firstName,
        lastName: request.lastName,
        role: request.role,
        authProvider: request.password ? 'legacy' : 'entra',
        passwordHash,
        isActive: true,
        emailVerified: false,
        phoneVerified: false,
        emergencyContacts: [],
        familyId: undefined,
        groupMemberships: [],
        addressVerified: false,
        phoneNumber: request.phoneNumber,
        homeAddress: request.homeAddress,
        isActiveDriver: request.isActiveDriver || false,
        preferences: {
          isDriver: request.isActiveDriver || false,
          notifications: {
            email: true,
            sms: false,
            tripReminders: true,
            swapRequests: true,
            scheduleChanges: true,
          },
        },
        loginAttempts: 0,
      };

      // Create user in database
      const newUser = await databaseService.createUser(userEntity);

      return {
        success: true,
        user: this.toAuthenticatedUser(newUser),
        message: 'User registered successfully',
      };
    } catch (error) {
      console.error('User registration error:', error);
      return {
        success: false,
        message: 'User registration failed. Please try again.',
      };
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserEntity | null> {
    return await databaseService.getUserById(userId);
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<UserEntity | null> {
    return await databaseService.getUserByEmail(email);
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: string,
    updates: Partial<UserEntity>,
    updatedBy: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const updatedUser = {
        ...updates,
        updatedAt: new Date(),
      };

      await databaseService.updateUser(userId, updatedUser);

      return {
        success: true,
        message: 'User profile updated successfully',
      };
    } catch (error) {
      console.error('Update user profile error:', error);
      return {
        success: false,
        message: 'Failed to update user profile',
      };
    }
  }

  /**
   * Update user role (admin only)
   */
  async updateUserRole(
    userId: string,
    newRole: UserRole,
    updatedBy: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await databaseService.updateUser(userId, {
        role: newRole,
        updatedAt: new Date(),
      });

      return {
        success: true,
        message: 'User role updated successfully',
      };
    } catch (error) {
      console.error('Update user role error:', error);
      return {
        success: false,
        message: 'Failed to update user role',
      };
    }
  }

  /**
   * Deactivate user account
   */
  async deactivateUser(
    userId: string,
    deactivatedBy: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await databaseService.updateUser(userId, {
        isActive: false,
        updatedAt: new Date(),
      });

      return {
        success: true,
        message: 'User account deactivated successfully',
      };
    } catch (error) {
      console.error('Deactivate user error:', error);
      return {
        success: false,
        message: 'Failed to deactivate user account',
      };
    }
  }

  /**
   * Password reset - Request password reset link
   */
  async requestPasswordReset(
    email: string,
  ): Promise<{ success: boolean; message?: string; error?: string; resetToken?: string }> {
    try {
      const user = await this.getUserByEmail(email);
      if (!user) {
        // Return success even if user not found (security best practice)
        return {
          success: true,
          message: 'If the email exists, a reset link has been sent',
        };
      }

      // Generate reset token using authentication service
      const resetToken = await this.authService.generatePasswordResetToken(email);

      // Store reset token with expiration (implement in database)
      // For now, we'll delegate to the authentication service
      return {
        success: true,
        message: 'Password reset token generated',
        resetToken,
      };
    } catch (error) {
      this.logger.error('Error requesting password reset:', error);
      return {
        success: false,
        error: 'Failed to process password reset request',
      };
    }
  }

  /**
   * Password reset - Reset password using token
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // Use AuthenticationService's resetPassword method
      const result = await this.authService.resetPassword(token, newPassword);
      return {
        success: result.success,
        message: result.message,
        error: result.success ? undefined : result.message,
      };
    } catch (error) {
      this.logger.error('Error resetting password:', error);
      return {
        success: false,
        error: 'Invalid or expired reset token',
      };
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // Get user
      const user = await this.getUserById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Verify old password
      const isOldPasswordValid = await this.authService.verifyPassword(
        oldPassword,
        user.passwordHash || '',
      );
      if (!isOldPasswordValid) {
        return { success: false, error: 'Invalid current password' };
      }

      // Hash new password
      const newPasswordHash = await this.authService.hashPassword(newPassword);

      // Update user's password
      const updatedUser = await this.databaseService.updateUser(userId, {
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      });

      if (!updatedUser) {
        return { success: false, error: 'Failed to update password' };
      }

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      this.logger.error('Error changing password:', error);
      return {
        success: false,
        error: 'Failed to change password',
      };
    }
  }

  /**
   * Convert UserEntity to AuthenticatedUser (for backward compatibility)
   */
  private toAuthenticatedUser(user: UserEntity): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      authProvider: user.authProvider,
      isActive: user.isActive,
    };
  }
}

// Export singleton instance
export const userDomainService = UserDomainService.getInstance();
