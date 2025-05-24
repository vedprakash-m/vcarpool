'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import ErrorBoundary from '@/components/ErrorBoundary';

export function Providers({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    // Initialize auth state on app startup
    initialize();
  }, [initialize]);

  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}
