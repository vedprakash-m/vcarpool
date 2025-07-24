import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { ApiResponse, PaginatedResponse, AuthResult } from '@carpool/shared';
import {
  ApiErrorHandler,
  TimeoutError,
  ApiError,
  createTimeoutController,
  handleApiError,
} from './api-error-handling';
import { errorHandler } from './error-handling';

// Mock data for development
const MOCK_USER = {
  id: 'mock-user-123',
  email: 'admin@carpool.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'parent' as const,
  authProvider: 'legacy' as const,
  isActive: true,
  emailVerified: true,
  phoneVerified: true,
  profilePictureUrl: undefined,
  phoneNumber: '+1234567890',
  emergencyContacts: [],
  groupMemberships: [],
  homeAddress: '123 Main St, City, State',
  addressVerified: true,
  isActiveDriver: true,
  preferences: {
    notifications: {
      email: true,
      push: true,
      sms: false,
      tripReminders: true,
      swapRequests: true,
      scheduleChanges: true,
    },
    privacy: {
      showPhoneNumber: true,
      showEmail: false,
    },
    pickupLocation: 'Home',
    dropoffLocation: 'School',
    preferredTime: '08:00',
    isDriver: true,
    smokingAllowed: false,
  },
  loginAttempts: 0,
  lastLoginAt: new Date(),
  lastActivityAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  permissions: ['user:read', 'user:update', 'trip:create', 'trip:join'],
};

export class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<string> | null = null;
  private isRefreshing = false;
  private isMockMode = false;
  private requestsQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: any) => void;
  }> = [];

  constructor(
    baseURL: string = process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:7071/api'
  ) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Check if mock mode was previously enabled
    if (typeof window !== 'undefined') {
      const mockMode = localStorage.getItem('MOCK_AUTH');
      if (mockMode === 'true') {
        this.isMockMode = true;
      }
    }

    // Temporarily enable mock mode for registration until backend is fixed
    // This allows users to test the complete registration flow
    this.enableMockMode();

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (this.token) {
          if (!config.headers) {
            config.headers = {} as any;
          }
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error: any) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token refresh and errors
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: any) => {
        const originalRequest = error.config;

        // Handle 401 errors with token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshAccessToken();
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, clear tokens and redirect to login
            this.clearToken();
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }

            const handledError = handleApiError(
              refreshError as AxiosError,
              'Token refresh'
            );
            await errorHandler.handleError(handledError, {
              errorBoundary: 'ApiClient',
              componentStack: 'Token refresh',
            });
            return Promise.reject(handledError);
          }
        }

        // Handle other errors using centralized error handling
        const handledError = handleApiError(
          error,
          `${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`
        );

        // Only report errors that aren't handled by specific API calls
        if (!originalRequest._skipErrorReporting) {
          await errorHandler.handleError(handledError, {
            errorBoundary: 'ApiClient',
            componentStack: 'Response interceptor',
          });
        }

        return Promise.reject(handledError);
      }
    );
  }

  // Mock authentication methods
  private mockLogin(credentials: any): Promise<ApiResponse<AuthResult>> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            success: true,
            user: MOCK_USER,
            accessToken: 'mock-token-' + Date.now(),
            refreshToken: 'mock-refresh-token-' + Date.now(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          },
        });
      }, 500); // Simulate network delay
    });
  }

  private mockRegister(userData: any): Promise<ApiResponse<AuthResult>> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            success: true,
            user: {
              ...MOCK_USER,
              email: userData.email,
              firstName: userData.firstName,
              lastName: userData.lastName,
              role: userData.role,
            },
            accessToken: 'mock-token-' + Date.now(),
            refreshToken: 'mock-refresh-token-' + Date.now(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          },
        });
      }, 500);
    });
  }

  // Enable/disable mock mode
  enableMockMode() {
    this.isMockMode = true;
    if (typeof window !== 'undefined') {
      localStorage.setItem('MOCK_AUTH', 'true');
    }
  }

  disableMockMode() {
    this.isMockMode = false;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('MOCK_AUTH');
    }
  }

  setToken(token: string, refreshToken?: string) {
    this.token = token;
    if (refreshToken) {
      this.refreshToken = refreshToken;
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
      }
    }
  }

  clearToken() {
    this.token = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  loadToken() {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');

      if (token) {
        this.token = token;
      }

      if (refreshToken) {
        this.refreshToken = refreshToken;
      }
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<string> {
    // If we're already refreshing, return the existing promise
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.requestsQueue.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    try {
      if (!this.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post<ApiResponse<AuthResult>>(
        `${this.client.defaults.baseURL}/api/auth`,
        {
          action: 'refresh',
          refreshToken: this.refreshToken,
        }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to refresh token');
      }

      const { accessToken, refreshToken } = response.data.data;

      // Update tokens
      this.token = accessToken || null;
      if (refreshToken) {
        this.refreshToken = refreshToken;
      }

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', accessToken || '');
        if (refreshToken) {
          localStorage.setItem('refresh_token', refreshToken);
        }
      }

      // Process any queued requests
      this.requestsQueue.forEach(request => {
        request.resolve(accessToken || '');
      });

      this.requestsQueue = [];
      this.isRefreshing = false;

      return accessToken || '';
    } catch (error) {
      // Clear tokens on refresh failure
      this.clearToken();

      // Reject all queued requests
      this.requestsQueue.forEach(request => {
        request.reject(error);
      });

      this.requestsQueue = [];
      this.isRefreshing = false;

      throw error;
    }
  }

  async get<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    // Check for mock mode and various endpoints
    if (this.isMockMode) {
      // Mock trips stats for dashboard (support both /trips/stats and /v1/trips/stats)
      if (url === '/trips/stats' || url === '/v1/trips/stats') {
        return Promise.resolve({
          success: true,
          data: {
            totalTrips: 12,
            tripsAsDriver: 8,
            tripsAsPassenger: 4,
            totalDistance: 2450,
            costSavings: 450,
            upcomingTrips: 3,
          } as T,
        });
      }

      // Mock trips list (support both /trips and /v1/trips)
      if (url.startsWith('/trips') || url.startsWith('/v1/trips')) {
        return Promise.resolve({
          success: true,
          data: [
            {
              id: 'trip-1',
              driverId: 'mock-driver-1',
              destination: 'Lincoln Elementary School',
              pickupLocations: [],
              date: new Date(Date.now() + 86400000),
              departureTime: '07:45',
              arrivalTime: '08:00',
              maxPassengers: 4,
              passengers: ['child-1'],
              availableSeats: 3,
              cost: 0,
              status: 'planned',
              notes: 'Morning school drop-off',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: 'trip-2',
              driverId: 'mock-driver-2',
              destination: 'Jefferson Middle School',
              pickupLocations: [],
              date: new Date(Date.now() + 172800000),
              departureTime: '15:15',
              arrivalTime: '15:30',
              maxPassengers: 3,
              passengers: [],
              availableSeats: 3,
              cost: 0,
              status: 'planned',
              notes: 'Afternoon pickup',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            totalPages: 1,
          },
        } as any);
      }

      // Mock user profile (support both /users/me and /v1/users/me)
      if (url === '/users/me' || url === '/v1/users/me') {
        return Promise.resolve({
          success: true,
          data: MOCK_USER as T,
        });
      }

      // Mock messages
      if (url.startsWith('/messages')) {
        return Promise.resolve({
          success: true,
          data: {
            data: [
              {
                id: 'msg-1',
                content: 'Welcome to Carpool! This is a mock message.',
                senderId: 'mock-user-456',
                senderName: 'System Admin',
                tripId: 'trip-1',
                createdAt: new Date().toISOString(),
                type: 'SYSTEM',
              },
            ],
            total: 1,
            page: 1,
            limit: 10,
          } as T,
        });
      }

      // Mock any other GET requests
      return Promise.resolve({
        success: true,
        data: {} as T,
      });
    }

    try {
      // Create timeout controller
      const { controller, cleanup } = createTimeoutController(10000);
      const requestConfig = {
        ...config,
        signal: controller.signal,
      };

      const response = await this.client.get(url, requestConfig);
      cleanup();
      return response.data;
    } catch (error) {
      const handledError = handleApiError(error as AxiosError, `GET ${url}`);
      await errorHandler.handleError(handledError, {
        errorBoundary: 'ApiClient',
        componentStack: `GET ${url}`,
      });
      throw handledError;
    }
  }

  async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    // Check for mock mode and auth endpoints
    if (this.isMockMode) {
      if (url === '/api/auth' && data && data.action === 'login') {
        return this.mockLogin(data) as Promise<ApiResponse<T>>;
      }
      if (url === '/api/auth' && data && data.action === 'register') {
        return this.mockRegister(data) as Promise<ApiResponse<T>>;
      }
      // For other endpoints in mock mode, return success
      if (url.startsWith('/api/auth')) {
        return Promise.resolve({
          success: true,
          data: {} as T,
        });
      }
    }

    try {
      // Create timeout controller
      const { controller, cleanup } = createTimeoutController(15000); // Longer timeout for POST requests
      const requestConfig = {
        ...config,
        signal: controller.signal,
      };

      const response = await this.client.post(url, data, requestConfig);
      cleanup();
      return response.data;
    } catch (error) {
      const handledError = handleApiError(error as AxiosError, `POST ${url}`);
      await errorHandler.handleError(handledError, {
        errorBoundary: 'ApiClient',
        componentStack: `POST ${url}`,
      });
      throw handledError;
    }
  }

  async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      // Create timeout controller
      const { controller, cleanup } = createTimeoutController(15000);
      const requestConfig = {
        ...config,
        signal: controller.signal,
      };

      const response = await this.client.put(url, data, requestConfig);
      cleanup();
      return response.data;
    } catch (error) {
      const handledError = handleApiError(error as AxiosError, `PUT ${url}`);
      await errorHandler.handleError(handledError, {
        errorBoundary: 'ApiClient',
        componentStack: `PUT ${url}`,
      });
      throw handledError;
    }
  }

  async delete<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      // Create timeout controller
      const { controller, cleanup } = createTimeoutController(10000);
      const requestConfig = {
        ...config,
        signal: controller.signal,
      };

      const response = await this.client.delete(url, requestConfig);
      cleanup();
      return response.data;
    } catch (error) {
      const handledError = handleApiError(error as AxiosError, `DELETE ${url}`);
      await errorHandler.handleError(handledError, {
        errorBoundary: 'ApiClient',
        componentStack: `DELETE ${url}`,
      });
      throw handledError;
    }
  }

  async getPaginated<T>(
    url: string,
    params?: Record<string, any>,
    config?: AxiosRequestConfig
  ): Promise<PaginatedResponse<T>> {
    try {
      // Create timeout controller
      const { controller, cleanup } = createTimeoutController(10000);
      const requestConfig = {
        ...config,
        signal: controller.signal,
        params: { ...config?.params, ...params },
      };

      const response = await this.client.get(url, requestConfig);
      cleanup();
      return response.data;
    } catch (error) {
      const handledError = handleApiError(
        error as AxiosError,
        `GET ${url} (paginated)`
      );
      await errorHandler.handleError(handledError, {
        errorBoundary: 'ApiClient',
        componentStack: `GET ${url} (paginated)`,
      });
      throw handledError;
    }
  }
}

// Create singleton instance
// Always use production backend API for now since local backend setup is complex
const getApiUrl = () => {
  // For now, always use production API to avoid local setup complexity
  return 'https://carpool-api-prod.azurewebsites.net/api';

  // Future: Enable local development when needed
  // if (
  //   typeof window !== "undefined" &&
  //   window.location.hostname.includes("azurestaticapps.net")
  // ) {
  //   return "https://carpool-api-prod.azurewebsites.net/api";
  // }
  // return process.env.NEXT_PUBLIC_API_URL || "http://localhost:7071/api";
};

export const apiClient = new ApiClient(getApiUrl());

// Initialize token on client side
if (typeof window !== 'undefined') {
  apiClient.loadToken();
}
