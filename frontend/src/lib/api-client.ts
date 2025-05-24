import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { ApiResponse, PaginatedResponse, AuthResponse } from '@vcarpool/shared';

export class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<string> | null = null;
  private isRefreshing = false;
  private requestsQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: any) => void;
  }> = [];

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7071/api') {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest: any = error.config;
        
        // If error is 401 and we have a refresh token, try to refresh
        if (error.response?.status === 401 && this.refreshToken && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            const newToken = await this.refreshAccessToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            // If refresh fails, clear tokens and redirect to login
            this.clearToken();
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );
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
      
      const response = await axios.post<ApiResponse<AuthResponse>>(
        `${this.client.defaults.baseURL}/auth/refresh-token`,
        { refreshToken: this.refreshToken }
      );
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to refresh token');
      }
      
      const { token, refreshToken } = response.data.data;
      
      // Update tokens
      this.token = token;
      if (refreshToken) {
        this.refreshToken = refreshToken;
      }
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', token);
        if (refreshToken) {
          localStorage.setItem('refresh_token', refreshToken);
        }
      }
      
      // Process any queued requests
      this.requestsQueue.forEach(request => {
        request.resolve(token);
      });
      
      this.requestsQueue = [];
      this.isRefreshing = false;
      
      return token;
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

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete(url, config);
    return response.data;
  }

  async getPaginated<T>(
    url: string, 
    params?: Record<string, any>, 
    config?: AxiosRequestConfig
  ): Promise<PaginatedResponse<T>> {
    const response = await this.client.get(url, { 
      ...config, 
      params: { ...config?.params, ...params } 
    });
    return response.data;
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Initialize token on client side
if (typeof window !== 'undefined') {
  apiClient.loadToken();
}
