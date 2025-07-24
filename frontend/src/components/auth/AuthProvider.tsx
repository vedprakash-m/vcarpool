'use client';

import React, { ReactNode, useEffect } from 'react';
import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import { useEntraAuthStore, msalConfig } from '../../store/entra-auth.store';

// Create MSAL instance outside of component to prevent re-creation
let msalInstance: PublicClientApplication;

if (typeof window !== 'undefined') {
  msalInstance = new PublicClientApplication(msalConfig);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const initialize = useEntraAuthStore(state => state.initialize);

  useEffect(() => {
    // Initialize authentication when component mounts
    initialize();
  }, [initialize]);

  // Only render MSAL provider on client side
  if (typeof window === 'undefined') {
    return <>{children}</>;
  }

  return (
    <MsalProvider instance={msalInstance}>
      <AuthInitializer>{children}</AuthInitializer>
    </MsalProvider>
  );
}

// Component to handle auth initialization after MSAL provider is ready
function AuthInitializer({ children }: { children: ReactNode }) {
  const { initialize, checkAuthStatus } = useEntraAuthStore();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await initialize();
        await checkAuthStatus();
      } catch (error) {
        console.error('Auth initialization failed:', error);
      }
    };

    initializeAuth();
  }, [initialize, checkAuthStatus]);

  return <>{children}</>;
}
