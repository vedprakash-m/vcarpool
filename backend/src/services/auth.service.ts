import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '@vcarpool/shared';
import { UserRepository } from '../repositories/user.repository';
import { Errors } from '../utils/error-handler';
import { ILogger } from '../utils/logger';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
const JWT_EXPIRES_IN = '24h';
const JWT_REFRESH_EXPIRES_IN = '7d';

export interface JwtPayload {
  userId: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export class AuthService {
  // Static methods for backward compatibility
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateAccessToken(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  static generateRefreshToken(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
  }

  private logger: ILogger;
  
  constructor(
    private userRepository: UserRepository,
    logger?: ILogger
  ) {
    // Use provided logger or create a simple implementation
    this.logger = logger || {
      debug: (message: string, data?: any) => console.debug(message, data),
      info: (message: string, data?: any) => console.info(message, data),
      warn: (message: string, data?: any) => console.warn(message, data),
      error: (message: string, error?: any) => console.error(message, error),
      setContext: () => {},
      child: () => this.logger,
      startTimer: (label: string) => () => console.time(label)
    };
  }

  /**
   * Hash password using bcrypt
   */
  async hashPasswordInstance(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  async verifyPasswordInstance(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT access token
   */
  generateAccessTokenInstance(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };
    
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });
  }

  /**
   * Generate JWT refresh token
   */
  generateRefreshTokenInstance(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };
    
    return jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN
    });
  }

  /**
   * Verify and decode JWT access token
   */
  verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch (error) {
      throw Errors.Unauthorized('Invalid or expired token');
    }
  }

  /**
   * Verify and decode JWT refresh token
   */
  verifyRefreshToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
    } catch (error) {
      throw Errors.Unauthorized('Invalid or expired refresh token');
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }
  
  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string, user: User }> {
    try {
      // Verify the refresh token
      const payload = this.verifyRefreshToken(refreshToken);
      
      // Get user from database
      const user = await this.userRepository.findById(payload.userId);
      
      if (!user) {
        throw Errors.NotFound('User not found');
      }
      
      // Generate new access token
      const accessToken = this.generateAccessTokenInstance(user);
      
      return { accessToken, user };
    } catch (error) {
      throw Errors.Unauthorized('Invalid refresh token');
    }
  }
}
