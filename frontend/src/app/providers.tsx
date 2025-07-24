'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useEntraAuthStore } from '@/store/entra-auth.store';
import ErrorBoundary from '@/components/ErrorBoundary';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { Toaster } from 'react-hot-toast';

export function Providers({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore(state => state.initialize);
  const initializeEntra = useEntraAuthStore(state => state.initialize);

  useEffect(() => {
    // Environment variables now configured in Azure Static Web Apps
    console.log('Providers useEffect running...');
    console.log(
      'ENABLE_LEGACY_AUTH:',
      process.env.NEXT_PUBLIC_ENABLE_LEGACY_AUTH
    );
    console.log(
      'ENABLE_ENTRA_AUTH:',
      process.env.NEXT_PUBLIC_ENABLE_ENTRA_AUTH
    );

    // Only initialize the auth system we're actually using
    if (process.env.NEXT_PUBLIC_ENABLE_LEGACY_AUTH === 'true') {
      console.log('Initializing legacy auth...');
      // Initialize legacy auth state
      initialize();

      // Also initialize Entra if both are enabled
      if (process.env.NEXT_PUBLIC_ENABLE_ENTRA_AUTH === 'true') {
        console.log('Also initializing Entra auth...');
        initializeEntra();
      }
    } else if (process.env.NEXT_PUBLIC_ENABLE_ENTRA_AUTH === 'true') {
      console.log('Initializing Entra auth only...');
      // Only initialize Entra ID authentication
      initializeEntra();
    } else {
      console.log('No auth system enabled or incorrect environment variables');
    }
  }, [initialize, initializeEntra]);

  return (
    <ErrorBoundary>
      <NotificationProvider>
        {children}
        <Toaster position="bottom-right" gutter={8} />
      </NotificationProvider>
    </ErrorBoundary>
  );
}
