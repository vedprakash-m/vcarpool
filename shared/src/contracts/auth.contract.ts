/**
 * Unified Authentication Service Contract
 *
 * Single source of truth for all authentication operations.
 * Replaces the fragmented authentication services with a unified interface.
 */

import { UserEntity, UserRole, AuthProvider } from '../entities/user.entity';

// Unified authentication credentials
export interface AuthCredentials {
  type: 'password' | 'entra_token' | 'refresh_token';
  email?: string;
  password?: string;
  token?: string;
}

// Standardized authentication result
export interface AuthResult {
  success: boolean;
  user?: AuthUserResponse;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  message?: string;
}

// Token validation result
export interface TokenValidationResult {
  valid: boolean;
  user?: AuthUserResponse;
  payload?: JWTPayload;
  message?: string;
}

// Clean user object for responses (no sensitive data)
export interface AuthUserResponse extends Omit<UserEntity, 'passwordHash' | 'entraObjectId'> {
  permissions: string[];
}

// Standardized JWT payload structure
export interface JWTPayload {
  sub: string; // User ID (standard JWT claim)
  email: string;
  role: UserRole;
  permissions: string[];
  authProvider: AuthProvider;
  iat: number; // Issued at
  exp: number; // Expires at
  iss: string; // Issuer
  aud: string; // Audience
}

/**
 * Master Authentication Service Interface
 *
 * All authentication services must implement this contract
 */
export interface IAuthenticationService {
  /**
   * Authenticate user with various credential types
   */
  authenticate(credentials: AuthCredentials): Promise<AuthResult>;

  /**
   * Validate access token and return user information
   */
  validateToken(token: string): Promise<TokenValidationResult>;

  /**
   * Refresh access token using refresh token
   */
  refreshToken(refreshToken: string): Promise<AuthResult>;

  /**
   * Revoke/logout token
   */
  revokeToken(token: string): Promise<void>;

  /**
   * Generate password reset token
   */
  generatePasswordResetToken(email: string): Promise<string>;

  /**
   * Reset password using reset token
   */
  resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }>;
}

/**
 * JWT Service Interface
 */
export interface IJWTService {
  generateAccessToken(user: UserEntity): string;
  generateRefreshToken(user: UserEntity): string;
  validateAccessToken(token: string): Promise<JWTPayload>;
  validateRefreshToken(token: string): Promise<JWTPayload>;
  extractTokenFromHeader(authHeader?: string): string | null;
}

/**
 * Entra ID Token Validator Interface
 */
export interface IEntraTokenValidator {
  validateToken(token: string): Promise<EntraIDClaims>;
  mapToUserEntity(claims: EntraIDClaims): Promise<UserEntity>;
}

/**
 * Entra ID Token Claims (from Microsoft)
 */
export interface EntraIDClaims {
  sub: string; // Subject (user ID)
  name: string;
  email: string;
  given_name?: string;
  family_name?: string;
  aud: string; // Audience
  iss: string; // Issuer
  iat: number;
  exp: number;
}

/**
 * Password Validator Interface
 */
export interface IPasswordValidator {
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash: string): Promise<boolean>;
  validatePasswordStrength(password: string): { valid: boolean; message?: string };
}
