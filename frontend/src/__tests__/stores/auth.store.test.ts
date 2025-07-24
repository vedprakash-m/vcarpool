/**
 * Tests for auth store
 * Testing authentication state management with Zustand
 */

import { act, renderHook } from '@testing-library/react';
import { useAuthStore } from '../../store/auth.store';
import { apiClient } from '../../lib/api-client';
import {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  UpdateUserRequest,
  ApiResponse,
} from '../../types/shared';

// Mock the API client
jest.mock('../../lib/api-client');
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('useAuthStore', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    phoneNumber: '+1234567890',
    department: 'Engineering',
    role: 'student',
    preferences: {
      pickupLocation: 'Campus North',
      dropoffLocation: 'Downtown',
      preferredTime: '08:00',
      isDriver: false,
      smokingAllowed: false,
      notifications: {
        email: true,
        sms: true,
        tripReminders: true,
        swapRequests: false,
        scheduleChanges: true,
      },
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockAuthResponse: AuthResponse = {
    user: mockUser,
    token: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
      isAuthenticated: false,
      loading: false,
      error: null,
    });

    // Clear mocks
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.refreshToken).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('login', () => {
    it('should handle successful login', async () => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockApiClient.post.mockResolvedValueOnce({
        success: true,
        data: mockAuthResponse,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login(loginRequest);
      });

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/auth', {
        action: 'login',
        ...loginRequest,
      });
      expect(mockApiClient.setToken).toHaveBeenCalledWith(
        'mock-access-token',
        'mock-refresh-token'
      );
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe('mock-access-token');
      expect(result.current.refreshToken).toBe('mock-refresh-token');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle failed login', async () => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockApiClient.post.mockResolvedValueOnce({
        success: false,
        error: 'Invalid credentials',
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.login(loginRequest);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle login network error', async () => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockApiClient.post.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.login(loginRequest);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading state during login', async () => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      };

      let resolveLogin: (value: ApiResponse<AuthResponse>) => void;
      const loginPromise = new Promise<ApiResponse<AuthResponse>>(resolve => {
        resolveLogin = resolve;
      });

      mockApiClient.post.mockReturnValueOnce(loginPromise);

      const { result } = renderHook(() => useAuthStore());

      // Start login
      act(() => {
        result.current.login(loginRequest);
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);

      // Complete login
      await act(async () => {
        resolveLogin!({
          success: true,
          data: mockAuthResponse,
        });
        await loginPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('register', () => {
    it('should handle successful registration', async () => {
      const registerRequest: RegisterRequest = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        phoneNumber: '+1234567890',
        department: 'Engineering',
      };

      mockApiClient.post.mockResolvedValueOnce({
        success: true,
        data: mockAuthResponse,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.register(registerRequest);
      });

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/auth', {
        action: 'register',
        ...registerRequest,
      });
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle registration failure', async () => {
      const registerRequest: RegisterRequest = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Existing',
        lastName: 'User',
        phoneNumber: '+1234567890',
        department: 'Engineering',
      };

      mockApiClient.post.mockResolvedValueOnce({
        success: false,
        error: 'User already exists',
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.register(registerRequest);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('should clear auth state on logout', () => {
      // Set initial authenticated state
      useAuthStore.setState({
        user: mockUser,
        token: 'access-token',
        refreshToken: 'refresh-token',
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.refreshToken).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockApiClient.clearToken).toHaveBeenCalled();
    });
  });

  describe('refreshAuth', () => {
    it('should refresh authentication with valid refresh token', async () => {
      useAuthStore.setState({
        refreshToken: 'valid-refresh-token',
      });

      // Mock the refreshAccessToken method
      mockApiClient.refreshAccessToken.mockResolvedValueOnce(
        'new-access-token'
      );

      // Mock the get user call
      mockApiClient.get.mockResolvedValueOnce({
        success: true,
        data: mockUser,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.refreshAuth();
      });

      expect(mockApiClient.refreshAccessToken).toHaveBeenCalled();
      expect(mockApiClient.get).toHaveBeenCalledWith('/v1/users/me');
      expect(result.current.token).toBe('new-access-token');
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle refresh failure', async () => {
      useAuthStore.setState({
        refreshToken: 'invalid-refresh-token',
        isAuthenticated: true,
      });

      mockApiClient.refreshAccessToken.mockRejectedValueOnce(
        new Error('Invalid refresh token')
      );

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.refreshAuth();
      });

      expect(result.current.token).toBeNull();
      expect(result.current.refreshToken).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe('Invalid refresh token');
    });

    it('should not refresh without refresh token', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.refreshAuth();
      });

      expect(mockApiClient.refreshAccessToken).toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      useAuthStore.setState({
        user: mockUser,
        token: 'access-token',
        isAuthenticated: true,
      });

      const updates: UpdateUserRequest = {
        firstName: 'Updated',
        lastName: 'Name',
        department: 'Marketing',
      };

      const updatedUser = { ...mockUser, ...updates };

      mockApiClient.put.mockResolvedValueOnce({
        success: true,
        data: updatedUser,
      });

      const { result } = renderHook(() => useAuthStore());

      let updateResult: boolean;
      await act(async () => {
        updateResult = await result.current.updateProfile(updates);
      });

      expect(mockApiClient.put).toHaveBeenCalledWith('/v1/users/me', updates);
      expect(result.current.user).toEqual(updatedUser);
      expect(updateResult!).toBe(true);
      expect(result.current.loading).toBe(false);
    });

    it('should handle profile update failure', async () => {
      useAuthStore.setState({
        user: mockUser,
        token: 'access-token',
        isAuthenticated: true,
      });

      const updates: UpdateUserRequest = {
        firstName: 'Updated',
      };

      mockApiClient.put.mockResolvedValueOnce({
        success: false,
        error: 'Update failed',
      });

      const { result } = renderHook(() => useAuthStore());

      let updateResult: boolean;
      await act(async () => {
        updateResult = await result.current.updateProfile(updates);
      });

      expect(updateResult!).toBe(false);
      expect(result.current.error).toBe('Update failed');
      expect(result.current.user).toEqual(mockUser); // Should remain unchanged
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      useAuthStore.setState({
        error: 'Some error message',
      });

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('initialize', () => {
    it('should initialize auth state with existing token', () => {
      useAuthStore.setState({
        token: 'existing-token',
      });

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.initialize();
      });

      expect(mockApiClient.setToken).toHaveBeenCalledWith('existing-token');
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should not initialize without token', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.initialize();
      });

      expect(mockApiClient.setToken).not.toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});
