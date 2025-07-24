/**
 * Master Authentication Service
 *
 * Unified implementation that replaces all fragmented authentication services:
 * - AuthService (container-based)
 * - SecureAuthService (singleton)
 * - UnifiedAuthService (static)
 * - EntraAuthService (hybrid)
 */

import * as bcrypt from 'bcrypt';
import {
  IAuthenticationService,
  AuthCredentials,
  AuthResult,
  TokenValidationResult,
  AuthUserResponse,
  IJWTService,
  IPasswordValidator,
  UserEntity,
  UserRole,
  AuthProvider,
} from '@carpool/shared';
import { JWTService } from './jwt.service';
import { DatabaseService } from '../database.service';
import { ILogger } from '../../utils/logger';

/**
 * Password Validator Implementation
 */
export class PasswordValidator implements IPasswordValidator {
  private readonly saltRounds = 12;

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  validatePasswordStrength(password: string): { valid: boolean; message?: string } {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!/(?=.*\d)/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      return { valid: false, message: 'Password must contain at least one special character' };
    }
    return { valid: true };
  }
}

/**
 * Master Authentication Service
 */
export class AuthenticationService implements IAuthenticationService {
  private readonly jwtService: IJWTService;
  private readonly passwordValidator: IPasswordValidator;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly logger: ILogger,
    jwtService?: IJWTService,
  ) {
    this.jwtService = jwtService || new JWTService();
    this.passwordValidator = new PasswordValidator();
  }

  /**
   * Authenticate user with various credential types
   */
  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      switch (credentials.type) {
        case 'password':
          return this.authenticateWithPassword(credentials);
        case 'entra_token':
          return this.authenticateWithEntraToken(credentials);
        case 'refresh_token':
          return this.authenticateWithRefreshToken(credentials);
        default:
          return {
            success: false,
            message: 'Unsupported authentication type',
          };
      }
    } catch (error) {
      this.logger.error('Authentication failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        message: 'Authentication failed. Please try again.',
      };
    }
  }

  /**
   * Validate access token
   */
  async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      const payload = await this.jwtService.validateAccessToken(token);

      // Get fresh user data from database
      const user = await this.databaseService.getUserByEmail(payload.email);
      if (!user || !user.isActive) {
        return {
          valid: false,
          message: 'User not found or account deactivated',
        };
      }

      const authUser = this.mapToAuthUserResponse(user);

      return {
        valid: true,
        user: authUser,
        payload,
      };
    } catch (error) {
      return {
        valid: false,
        message: error instanceof Error ? error.message : 'Token validation failed',
      };
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      const payload = await this.jwtService.validateRefreshToken(refreshToken);

      // Get fresh user data
      const user = await this.databaseService.getUserByEmail(payload.email);
      if (!user || !user.isActive) {
        return {
          success: false,
          message: 'User not found or account deactivated',
        };
      }

      // Generate new tokens
      const accessToken = this.jwtService.generateAccessToken(user);
      const newRefreshToken = this.jwtService.generateRefreshToken(user);

      return {
        success: true,
        user: this.mapToAuthUserResponse(user),
        accessToken,
        refreshToken: newRefreshToken,
        message: 'Token refreshed successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Invalid or expired refresh token',
      };
    }
  }

  /**
   * Revoke token (logout)
   */
  async revokeToken(token: string): Promise<void> {
    // For now, we'll just log the revocation
    // In a full implementation, we'd add the token to a blacklist
    this.logger.info('Token revoked', { token: token.substring(0, 10) + '...' });
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(email: string): Promise<string> {
    const user = await this.databaseService.getUserByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    return (this.jwtService as JWTService).generatePasswordResetToken(user);
  }

  /**
   * Reset password using reset token
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Validate password strength
      const passwordValidation = this.passwordValidator.validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        return {
          success: false,
          message: passwordValidation.message || 'Invalid password',
        };
      }

      // Validate reset token
      const payload = await this.jwtService.validateAccessToken(token);

      // Get user and update password
      const user = await this.databaseService.getUserByEmail(payload.email);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      const hashedPassword = await this.passwordValidator.hashPassword(newPassword);
      await this.databaseService.updateUser(user.email, { passwordHash: hashedPassword });

      return {
        success: true,
        message: 'Password reset successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Invalid or expired reset token',
      };
    }
  }

  /**
   * Hash password using internal password validator
   */
  async hashPassword(password: string): Promise<string> {
    return this.passwordValidator.hashPassword(password);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return this.passwordValidator.verifyPassword(password, hash);
  }

  /**
   * Get JWT service instance (for access to specific JWT methods)
   */
  getJWTService(): IJWTService {
    return this.jwtService;
  }

  /**
   * Authenticate with email/password
   */
  private async authenticateWithPassword(credentials: AuthCredentials): Promise<AuthResult> {
    if (!credentials.email || !credentials.password) {
      return {
        success: false,
        message: 'Email and password are required',
      };
    }

    const user = await this.databaseService.getUserByEmail(credentials.email);
    if (!user || !user.isActive) {
      return {
        success: false,
        message: 'Invalid email or password',
      };
    }

    if (!user.passwordHash) {
      return {
        success: false,
        message: 'Password authentication not available for this account',
      };
    }

    const isPasswordValid = await this.passwordValidator.verifyPassword(
      credentials.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      return {
        success: false,
        message: 'Invalid email or password',
      };
    }

    // Generate tokens
    const accessToken = this.jwtService.generateAccessToken(user);
    const refreshToken = this.jwtService.generateRefreshToken(user);

    return {
      success: true,
      user: this.mapToAuthUserResponse(user),
      accessToken,
      refreshToken,
      message: 'Authentication successful',
    };
  }

  /**
   * Authenticate with Entra ID token (placeholder)
   */
  private async authenticateWithEntraToken(credentials: AuthCredentials): Promise<AuthResult> {
    // TODO: Implement proper Entra ID token validation
    return {
      success: false,
      message: 'Entra ID authentication not yet implemented',
    };
  }

  /**
   * Authenticate with refresh token
   */
  private async authenticateWithRefreshToken(credentials: AuthCredentials): Promise<AuthResult> {
    if (!credentials.token) {
      return {
        success: false,
        message: 'Refresh token is required',
      };
    }

    return this.refreshToken(credentials.token);
  }

  /**
   * Map UserEntity to AuthUserResponse (remove sensitive data)
   */
  private mapToAuthUserResponse(user: UserEntity): AuthUserResponse {
    const permissions = this.getPermissionsForRole(user.role);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      authProvider: user.authProvider,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      phoneNumber: user.phoneNumber,
      emergencyContacts: user.emergencyContacts,
      profilePictureUrl: user.profilePictureUrl,
      familyId: user.familyId,
      groupMemberships: user.groupMemberships,
      homeAddress: user.homeAddress,
      homeLocation: user.homeLocation,
      addressVerified: user.addressVerified,
      isActiveDriver: user.isActiveDriver,
      preferences: user.preferences,
      travelSchedule: user.travelSchedule,
      loginAttempts: user.loginAttempts,
      lastLoginAt: user.lastLoginAt,
      lastActivityAt: user.lastActivityAt,
      verification: user.verification,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      permissions,
    };
  }

  /**
   * Get permissions for user role
   */
  private getPermissionsForRole(role: UserRole): string[] {
    const permissions: Record<UserRole, string[]> = {
      super_admin: [
        'admin:read',
        'admin:write',
        'admin:delete',
        'groups:manage',
        'users:manage',
        'system:manage',
        'trips:manage',
        'notifications:manage',
      ],
      group_admin: [
        'groups:read',
        'groups:write',
        'groups:manage_own',
        'trips:read',
        'trips:write',
        'users:read_group',
        'notifications:send_group',
      ],
      parent: [
        'profile:read',
        'profile:write',
        'groups:read',
        'groups:join',
        'trips:read',
        'trips:participate',
        'preferences:manage',
        'children:manage',
      ],
      student: ['profile:read', 'trips:read', 'trips:participate'],
    };

    return permissions[role] || permissions.parent;
  }
}

// Export singleton instance for backward compatibility during migration
export const authenticationService = new AuthenticationService(
  DatabaseService.getInstance(),
  console as any, // Temporary logger
);
