import {
  AppError,
  NetworkError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  errorHandler,
} from './error-handling';

/**
 * HTTP-specific error types
 */
export class ApiError extends AppError {
  constructor(
    message: string,
    public readonly status: number,
    public readonly endpoint: string,
    code?: string,
    details?: Record<string, unknown>
  ) {
    super(message, code || `HTTP_${status}`, 'medium', true, details);
    this.name = 'ApiError';
  }
}

export class TimeoutError extends NetworkError {
  constructor(endpoint: string, timeoutMs: number) {
    super(`Request to ${endpoint} timed out after ${timeoutMs}ms`, {
      endpoint,
      timeoutMs,
    });
    this.name = 'TimeoutError';
  }
}

/**
 * Enhanced API error handling utilities
 */
export class ApiErrorHandler {
  /**
   * Convert fetch response to appropriate error type
   */
  static async handleApiResponse(
    response: Response,
    endpoint: string
  ): Promise<void> {
    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText };
      }

      const message =
        errorData.message ||
        errorData.error?.message ||
        `HTTP ${response.status}`;

      switch (response.status) {
        case 400:
          throw new ValidationError(message, errorData.field);
        case 401:
          throw new AuthenticationError(message);
        case 403:
          throw new AuthorizationError(message);
        case 404:
          throw new ApiError(message, 404, endpoint, 'NOT_FOUND');
        case 409:
          throw new ApiError(message, 409, endpoint, 'CONFLICT');
        case 422:
          throw new ValidationError(message, errorData.field);
        case 429:
          throw new ApiError(message, 429, endpoint, 'RATE_LIMIT', {
            retryAfter: response.headers.get('Retry-After'),
          });
        case 500:
        case 502:
        case 503:
        case 504:
          throw new ApiError(
            message,
            response.status,
            endpoint,
            'SERVER_ERROR'
          );
        default:
          throw new ApiError(message, response.status, endpoint);
      }
    }
  }

  /**
   * Handle network errors from fetch
   */
  static handleNetworkError(error: unknown, endpoint: string): never {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new NetworkError(`Failed to connect to ${endpoint}`, { endpoint });
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(
        'Request was cancelled',
        0,
        endpoint,
        'REQUEST_CANCELLED'
      );
    }

    throw error;
  }

  /**
   * Wrapper for fetch with error handling
   */
  static async safeFetch(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = 30000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      await this.handleApiResponse(response, url);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError(url, timeoutMs);
      }

      if (error instanceof AppError) {
        throw error;
      }

      this.handleNetworkError(error, url);
    }
  }
}

/**
 * API request interceptors for consistent error handling
 */
export interface ApiInterceptors {
  request?: (
    config: RequestInit & { url: string }
  ) => (RequestInit & { url: string }) | Promise<RequestInit & { url: string }>;
  response?: (response: Response) => Response | Promise<Response>;
  error?: (error: unknown) => Promise<never> | never;
}

/**
 * Enhanced API client with error handling
 */
export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private interceptors: ApiInterceptors;

  constructor(
    baseUrl: string = '',
    defaultHeaders: Record<string, string> = {},
    interceptors: ApiInterceptors = {}
  ) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders,
    };
    this.interceptors = interceptors;
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Remove authentication token
   */
  removeAuthToken(): void {
    delete this.defaultHeaders['Authorization'];
  }

  /**
   * Make HTTP request with error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    let config = {
      url,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
      ...options,
    };

    // Apply request interceptor
    if (this.interceptors.request) {
      const interceptedConfig = await this.interceptors.request(config);
      config = {
        ...interceptedConfig,
        headers: interceptedConfig.headers || {},
      };
    }

    try {
      const response = await ApiErrorHandler.safeFetch(config.url, config);

      // Apply response interceptor
      if (this.interceptors.response) {
        await this.interceptors.response(response);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      // Apply error interceptor
      if (this.interceptors.error) {
        throw await this.interceptors.error(error);
      }

      // Report error to centralized handler
      await errorHandler.handleError(error, {
        errorBoundary: 'ApiClient',
        componentStack: `${options.method || 'GET'} ${endpoint}`,
      });

      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

/**
 * Default API client instance with error interceptors
 */
export const apiClient = new ApiClient(
  process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
  {},
  {
    error: async (error: unknown) => {
      // Handle common authentication errors
      if (error instanceof AuthenticationError) {
        // Redirect to login or trigger auth refresh
        if (typeof window !== 'undefined') {
          const { useAuthStore } = await import('../store/auth.store');
          const logout = useAuthStore.getState().logout;
          logout();
          window.location.href = '/login';
        }
      }

      throw error;
    },
  }
);

/**
 * Utility for handling form submission errors
 */
export function handleFormError(error: unknown): string {
  if (error instanceof ValidationError) {
    return error.message;
  }

  if (error instanceof AuthenticationError) {
    return 'Please log in to continue.';
  }

  if (error instanceof AuthorizationError) {
    return 'You do not have permission to perform this action.';
  }

  if (error instanceof NetworkError) {
    return 'Unable to connect to the server. Please check your connection and try again.';
  }

  if (error instanceof ApiError) {
    switch (error.status) {
      case 409:
        return 'This action conflicts with existing data. Please refresh and try again.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return error.message;
    }
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Utility functions for API error handling
 */

/**
 * Create a timeout controller for API requests
 */
export function createTimeoutController(timeoutMs: number = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return {
    controller,
    cleanup: () => clearTimeout(timeoutId),
  };
}

/**
 * Handle Axios errors and convert them to our error types
 */
export function handleApiError(
  error: any,
  context: string = 'API request'
): Error {
  // Handle AbortError (timeout)
  if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
    return new TimeoutError(context, 10000);
  }

  // Handle network errors
  if (
    !error.response &&
    (error.code === 'NETWORK_ERROR' || error.message?.includes('Network'))
  ) {
    return new NetworkError(`Network error during ${context}`, {
      originalError: error,
    });
  }

  // Handle Axios response errors
  if (error.response) {
    const { status, data } = error.response;
    const message = data?.message || data?.error || `HTTP ${status} error`;

    switch (status) {
      case 401:
        return new AuthenticationError(message);
      case 403:
        return new AuthorizationError(message);
      case 400:
        return new ValidationError(message, data?.field);
      case 404:
        return new ApiError(`Resource not found: ${context}`, status, context);
      case 409:
        return new ApiError(`Conflict: ${message}`, status, context);
      case 429:
        return new ApiError(`Rate limit exceeded: ${context}`, status, context);
      case 500:
      case 502:
      case 503:
      case 504:
        return new ApiError(`Server error: ${message}`, status, context);
      default:
        return new ApiError(message, status, context);
    }
  }

  // Handle other errors
  if (error instanceof Error) {
    return error;
  }

  // Fallback for unknown errors
  return new AppError(
    `Unknown error during ${context}`,
    'UNKNOWN_ERROR',
    'medium',
    true,
    { originalError: error }
  );
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError;
}
