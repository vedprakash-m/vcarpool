import { create } from 'zustand';
import {
  PublicClientApplication,
  AccountInfo,
  InteractionRequiredAuthError,
} from '@azure/msal-browser';
import { VedUser } from '@carpool/shared';
import { apiClient } from '../lib/api-client';

// MSAL Configuration following Apps_Auth_Requirement.md
const msalConfig = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_ENTRA_CLIENT_ID || '',
    authority:
      process.env.NEXT_PUBLIC_ENTRA_AUTHORITY ||
      'https://login.microsoftonline.com/vedprakashmoutlook.onmicrosoft.com',
    redirectUri: typeof window !== 'undefined' ? window.location.origin : '',
  },
  cache: {
    cacheLocation: 'sessionStorage' as const,
    storeAuthStateInCookie: false,
  },
};

const loginRequest = {
  scopes: ['openid', 'profile', 'email'],
};

interface EntraAuthState {
  msalInstance: PublicClientApplication | null;
  vedUser: VedUser | null;
  account: AccountInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authMethod: 'entra' | 'legacy' | null;
  error: string | null;
}

interface EntraAuthActions {
  initialize: () => Promise<void>;
  handleAuthRedirect: () => Promise<void>;
  loginWithEntra: () => Promise<void>;
  loginWithLegacy: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  acquireTokenSilently: () => Promise<string | null>;
  checkAuthStatus: () => Promise<void>;
  clearError: () => void;
}

type EntraAuthStore = EntraAuthState & EntraAuthActions;

export const useEntraAuthStore = create<EntraAuthStore>()((set, get) => ({
  // State
  msalInstance: null,
  vedUser: null,
  account: null,
  isLoading: false,
  isAuthenticated: false,
  authMethod: null,
  error: null,

  // Actions
  initialize: async () => {
    try {
      set({ isLoading: true, error: null });

      // Only initialize MSAL in browser environment
      if (typeof window === 'undefined') {
        set({ isLoading: false });
        return;
      }

      console.log('Initializing MSAL...');
      console.log('Current URL:', window.location.href);
      console.log('URL hash:', window.location.hash);

      const msalInstance = new PublicClientApplication(msalConfig);
      await msalInstance.initialize();
      console.log('MSAL initialized successfully');

      set({ msalInstance, isLoading: false });

      // Check if we're coming back from a redirect first
      const isRedirectCallback =
        window.location.hash.includes('code=') ||
        window.location.hash.includes('access_token=') ||
        window.location.hash.includes('error=');

      if (isRedirectCallback) {
        console.log('Detected redirect callback, processing...');
        await get().handleAuthRedirect();
      } else {
        console.log(
          'No redirect callback detected, checking existing auth status...'
        );
        await get().checkAuthStatus();
      }
    } catch (error) {
      console.error('MSAL initialization failed:', error);
      set({
        error: 'Authentication service initialization failed',
        isLoading: false,
      });
    }
  },

  handleAuthRedirect: async () => {
    const { msalInstance } = get();
    if (!msalInstance) {
      console.error('MSAL instance not available');
      return;
    }

    try {
      set({ isLoading: true, error: null });

      console.log('Handling auth redirect...');
      const response = await msalInstance.handleRedirectPromise();
      console.log('Redirect response:', response);

      if (response && response.accessToken) {
        console.log('Processing successful redirect response');
        console.log('Access token length:', response.accessToken.length);

        // Successful login redirect - exchange token with backend using unified auth endpoint
        const apiResponse = await apiClient.post('/auth', {
          action: 'entra-login',
          authProvider: 'entra',
          accessToken: response.accessToken,
        });

        console.log('Backend auth response:', apiResponse);

        if (apiResponse.success && apiResponse.data) {
          const vedUser = (apiResponse.data as { user: VedUser }).user;

          set({
            vedUser,
            account: response.account,
            isAuthenticated: true,
            authMethod: 'entra',
            isLoading: false,
          });

          // Set token for API calls
          apiClient.setToken(response.accessToken);

          // Clear the URL hash to remove auth parameters
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );

          // Redirect to dashboard after successful auth
          console.log('Redirecting to dashboard...');
          window.location.href = '/dashboard';
          return;
        } else {
          console.error('Backend auth failed:', apiResponse);
          set({
            error: 'Authentication with backend failed',
            isLoading: false,
          });
        }
      } else if (response === null) {
        console.log(
          'No response from handleRedirectPromise - this might be normal'
        );

        // Check if there are auth parameters but no response
        if (window.location.hash.includes('code=')) {
          console.warn('Auth code detected but no MSAL response');

          // Try a different approach - force process the hash
          setTimeout(async () => {
            try {
              console.log('Retrying redirect handling...');
              const retryResponse = await msalInstance.handleRedirectPromise();
              if (retryResponse) {
                console.log('Retry successful:', retryResponse);
                await get().handleAuthRedirect();
              } else {
                console.error('Retry also returned null');
                set({
                  error: 'Failed to process authentication response',
                  isLoading: false,
                });
              }
            } catch (retryError) {
              console.error('Retry failed:', retryError);
              set({
                error: 'Failed to process authentication response',
                isLoading: false,
              });
            }
          }, 500);
        } else {
          set({ isLoading: false });
        }
      } else {
        console.log('Unexpected response format:', response);
        set({
          error: 'Unexpected authentication response',
          isLoading: false,
        });
      }
    } catch (redirectError) {
      console.error('Error handling redirect:', redirectError);
      set({
        error: 'Failed to process authentication response',
        isLoading: false,
      });
    }
  },

  loginWithEntra: async () => {
    const { msalInstance } = get();
    if (!msalInstance) {
      throw new Error('MSAL not initialized');
    }

    try {
      set({ isLoading: true, error: null });

      // Perform interactive login
      const loginResponse = await msalInstance.loginRedirect(loginRequest);

      // The redirect will reload the page, so this won't execute
      // The auth status will be checked on page load via checkAuthStatus
    } catch (error) {
      console.error('Entra login failed:', error);
      set({
        error: 'Microsoft sign-in failed. Please try again.',
        isLoading: false,
      });
      throw error;
    }
  },

  loginWithLegacy: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const response = await apiClient.post<{
        user: any;
        token: string;
        refreshToken: string;
      }>('/auth-login-simple', {
        email,
        password,
      });

      if (response.success && response.data) {
        // Convert legacy user to VedUser format
        const legacyUser = response.data.user;
        const vedUser: VedUser = {
          id: legacyUser.id,
          email: legacyUser.email,
          name: `${legacyUser.firstName} ${legacyUser.lastName}`,
          firstName: legacyUser.firstName,
          lastName: legacyUser.lastName,
          permissions: [], // Map from legacy role
          vedProfile: {
            phoneNumber: legacyUser.phoneNumber,
            homeAddress: legacyUser.homeAddress,
            emergencyContact: legacyUser.emergencyContact,
            role: legacyUser.role,
            preferences: legacyUser.preferences,
            isActiveDriver: legacyUser.isActiveDriver,
            travelSchedule: legacyUser.travelSchedule,
          },
        };

        // Set token in API client
        apiClient.setToken(response.data.token, response.data.refreshToken);

        set({
          vedUser,
          isAuthenticated: true,
          authMethod: 'legacy',
          isLoading: false,
        });
      } else {
        throw new Error(response.error || 'Legacy login failed');
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Login failed',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    const { msalInstance, authMethod } = get();

    try {
      set({ isLoading: true });

      if (authMethod === 'entra' && msalInstance) {
        // MSAL logout
        await msalInstance.logoutRedirect();
      } else {
        // Legacy logout
        apiClient.clearToken();
      }

      set({
        vedUser: null,
        account: null,
        isAuthenticated: false,
        authMethod: null,
        isLoading: false,
      });
    } catch (error) {
      console.error('Logout failed:', error);
      set({ isLoading: false });
    }
  },

  acquireTokenSilently: async (): Promise<string | null> => {
    const { msalInstance, account } = get();
    if (!msalInstance || !account) {
      return null;
    }

    try {
      const response = await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account,
      });
      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        // Require user interaction to get token
        try {
          await msalInstance.acquireTokenRedirect({
            ...loginRequest,
            account,
          });
        } catch (redirectError) {
          console.error('Token acquisition redirect failed:', redirectError);
        }
      }
      return null;
    }
  },

  checkAuthStatus: async () => {
    const { msalInstance } = get();
    if (!msalInstance) {
      return;
    }

    try {
      const accounts = msalInstance.getAllAccounts();

      if (accounts.length > 0) {
        const account = accounts[0];

        // Try to get access token silently
        const tokenResponse = await msalInstance.acquireTokenSilent({
          ...loginRequest,
          account,
        });

        if (tokenResponse.accessToken) {
          // Authenticate with backend using Entra token via unified auth endpoint
          const response = await apiClient.post('/auth', {
            action: 'entra-login',
            authProvider: 'entra',
            accessToken: tokenResponse.accessToken,
          });

          if (response.success && response.data) {
            const vedUser = (response.data as { user: VedUser }).user;

            set({
              vedUser,
              account,
              isAuthenticated: true,
              authMethod: 'entra',
              isLoading: false,
            });

            // Set token for API calls
            apiClient.setToken(tokenResponse.accessToken);
          }
        }
      } else {
        // No accounts found, check for legacy authentication
        // This would check for existing tokens in secure storage
        // and validate them with the backend
        set({
          isAuthenticated: false,
          authMethod: null,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Auth status check failed:', error);
      set({
        isAuthenticated: false,
        authMethod: null,
        isLoading: false,
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Export the MSAL instance for use in components
export { msalConfig, loginRequest };
