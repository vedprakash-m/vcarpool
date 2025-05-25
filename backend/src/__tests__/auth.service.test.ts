/**
 * Test suite for AuthService
 * Tests the core authentication functionality
 */

import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';
import { User } from '@vcarpool/shared';

// Mock the UserRepository
jest.mock('../repositories/user.repository');

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<UserRepository>;

  const mockUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    preferences: {
      pickupLocation: '',
      dropoffLocation: '',
      preferredTime: '08:00',
      isDriver: false,
      smokingAllowed: false,
      notifications: {
        email: true,
        sms: false,
        tripReminders: true,
        swapRequests: true,
        scheduleChanges: true
      }
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    // Create a mock repository
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    } as any;

    authService = new AuthService(mockUserRepository, {} as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('static password methods', () => {
    it('should hash password correctly', async () => {
      const password = 'testpassword123';
      const hashedPassword = await AuthService.hashPassword(password);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(20);
    });

    it('should verify password correctly', async () => {
      const password = 'testpassword123';
      const hashedPassword = await AuthService.hashPassword(password);
      
      const isValid = await AuthService.verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);
      
      const isInvalid = await AuthService.verifyPassword('wrongpassword', hashedPassword);
      expect(isInvalid).toBe(false);
    });
  });

  describe('instance password methods', () => {
    it('should hash password correctly', async () => {
      const password = 'testpassword123';
      const hashedPassword = await authService.hashPasswordInstance(password);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(20);
    });

    it('should verify password correctly', async () => {
      const password = 'testpassword123';
      const hashedPassword = await authService.hashPasswordInstance(password);
      
      const isValid = await authService.verifyPasswordInstance(password, hashedPassword);
      expect(isValid).toBe(true);
      
      const isInvalid = await authService.verifyPasswordInstance('wrongpassword', hashedPassword);
      expect(isInvalid).toBe(false);
    });
  });

  describe('token generation', () => {
    it('should generate JWT access token', () => {
      const user = mockUser;
      const token = authService.generateAccessTokenInstance(user);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate refresh token', () => {
      const user = mockUser;
      const refreshToken = authService.generateRefreshTokenInstance(user);
      
      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe('string');
      expect(refreshToken.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should verify refresh token', () => {
      const user = mockUser;
      const refreshToken = authService.generateRefreshTokenInstance(user);
      
      const decoded = authService.verifyRefreshToken(refreshToken);
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(user.id);
      expect(decoded.email).toBe(user.email);
    });
  });

  describe('token refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const refreshToken = authService.generateRefreshTokenInstance(mockUser);
      
      mockUserRepository.findById.mockResolvedValue(mockUser as any);

      const result = await authService.refreshAccessToken(refreshToken);
      
      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.user).toBeDefined();
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw error with invalid refresh token', async () => {
      await expect(
        authService.refreshAccessToken('invalid-token')
      ).rejects.toThrow();
    });
  });
});
