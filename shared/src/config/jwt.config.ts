/**
 * Unified JWT Configuration
 *
 * Single source of truth for JWT token configuration across all services.
 * Eliminates the inconsistent JWT implementations.
 */

export interface JWTConfig {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenExpiry: string; // e.g., '1h', '15m'
  refreshTokenExpiry: string; // e.g., '7d', '30d'
  issuer: string; // e.g., 'carpool-app'
  audience: string; // e.g., 'carpool-users'
  algorithm: 'HS256' | 'RS256'; // Signing algorithm
}

/**
 * Default JWT Configuration
 * Uses environment variables with secure defaults
 */
export const getJWTConfig = (): JWTConfig => {
  return {
    accessTokenSecret:
      process.env.JWT_ACCESS_SECRET || 'carpool-access-secret-change-in-production',
    refreshTokenSecret:
      process.env.JWT_REFRESH_SECRET || 'carpool-refresh-secret-change-in-production',
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '1h',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    issuer: process.env.JWT_ISSUER || 'carpool-app',
    audience: process.env.JWT_AUDIENCE || 'carpool-users',
    algorithm: (process.env.JWT_ALGORITHM as 'HS256' | 'RS256') || 'HS256',
  };
};

/**
 * JWT Token Types
 */
export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFICATION = 'email_verification',
}

/**
 * Standard JWT Payload Structure
 * Ensures consistency across all token operations
 */
export interface StandardJWTPayload {
  // Standard JWT claims
  sub: string; // Subject (User ID)
  iat: number; // Issued at
  exp: number; // Expires at
  iss: string; // Issuer
  aud: string; // Audience

  // Custom claims
  type: TokenType; // Token type
  email: string;
  role: string;
  permissions: string[];
  authProvider: string;

  // Optional claims
  familyId?: string;
  groupMemberships?: string[];
}

/**
 * JWT Token Options
 */
export interface JWTSignOptions {
  secret: string;
  expiresIn: string;
  issuer: string;
  audience: string;
  algorithm: 'HS256' | 'RS256';
}

/**
 * JWT Verification Options
 */
export interface JWTVerifyOptions {
  secret: string;
  issuer: string;
  audience: string;
  algorithms: ('HS256' | 'RS256')[];
}

/**
 * Create JWT sign options from config
 */
export const createSignOptions = (config: JWTConfig, tokenType: TokenType): JWTSignOptions => {
  const secret =
    tokenType === TokenType.REFRESH ? config.refreshTokenSecret : config.accessTokenSecret;

  const expiresIn =
    tokenType === TokenType.REFRESH ? config.refreshTokenExpiry : config.accessTokenExpiry;

  return {
    secret,
    expiresIn,
    issuer: config.issuer,
    audience: config.audience,
    algorithm: config.algorithm,
  };
};

/**
 * Create JWT verify options from config
 */
export const createVerifyOptions = (config: JWTConfig, tokenType: TokenType): JWTVerifyOptions => {
  const secret =
    tokenType === TokenType.REFRESH ? config.refreshTokenSecret : config.accessTokenSecret;

  return {
    secret,
    issuer: config.issuer,
    audience: config.audience,
    algorithms: [config.algorithm],
  };
};
