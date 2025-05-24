import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, LoginRequest, RegisterRequest, AuthResponse, UpdateUserRequest } from '@vcarpool/shared';
import { apiClient } from '../lib/api-client';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  updateProfile: (updates: UpdateUserRequest) => Promise<boolean>;
  initialize: () => void;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
      isAuthenticated: false,
      loading: false,
      error: null,

      // Actions
      clearError: () => set({ error: null }),
      login: async (credentials: LoginRequest) => {
        try {
          set({ isLoading: true });
          
          const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
          
          if (response.success && response.data) {
            const { user, token, refreshToken } = response.data;
            
            // Set token in API client with refresh token
            apiClient.setToken(token, refreshToken);
            
            set({
              user,
              token,
              refreshToken,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            throw new Error(response.error || 'Login failed');
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (userData: RegisterRequest) => {
        try {
          set({ isLoading: true });
          
          const response = await apiClient.post<AuthResponse>('/auth/register', userData);
          
          if (response.success && response.data) {
            const { user, token, refreshToken } = response.data;
            
            // Set token in API client with refresh token
            apiClient.setToken(token, refreshToken);
            
            set({
              user,
              token,
              refreshToken,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            throw new Error(response.error || 'Registration failed');
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        apiClient.clearToken();
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      refreshAuth: async () => {
        try {
          set({ loading: true });
          
          // Use apiClient's refreshAccessToken method
          const token = await apiClient.refreshAccessToken();
          
          // Get the current user info to verify our session
          const userResponse = await apiClient.get<User>('/users/me');
          
          if (userResponse.success && userResponse.data) {
            set({ 
              user: userResponse.data, 
              token,
              isAuthenticated: true,
              loading: false,
              error: null
            });
            return;
          }
          
          throw new Error('Failed to get user data');
        } catch (error) {
          console.error('Error refreshing auth:', error);
          
          // Clear all auth data on refresh failure
          apiClient.clearToken();
          set({ 
            user: null, 
            token: null, 
            refreshToken: null,
            isAuthenticated: false, 
            loading: false,
            error: error instanceof Error ? error.message : 'Authentication refresh failed' 
          });
        }
      },

      updateUser: async (updates: Partial<User>) => {
        try {
          const response = await apiClient.put<User>('/users/me', updates);
          
          if (response.success && response.data) {
            set({ user: response.data });
          } else {
            throw new Error(response.error || 'Update failed');
          }
        } catch (error) {
          throw error;
        }
      },

      updateProfile: async (updates: UpdateUserRequest) => {
        try {
          set({ loading: true, error: null });
          
          const response = await apiClient.put<User>('/users/me', updates);
          
          if (response.success && response.data) {
            set({ 
              user: response.data,
              loading: false 
            });
            return true;
          } else {
            set({ 
              error: response.error || 'Update failed',
              loading: false 
            });
            return false;
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Update failed',
            loading: false 
          });
          return false;
        }
      },

      initialize: () => {
        const { token } = get();
        if (token) {
          apiClient.setToken(token);
          set({ isAuthenticated: true });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
