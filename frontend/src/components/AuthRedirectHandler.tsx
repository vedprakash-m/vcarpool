'use client';

import { useEffect } from 'react';
import { useEntraAuthStore } from '@/store/entra-auth.store';

export default function AuthRedirectHandler() {
  const { handleAuthRedirect, isLoading, isAuthenticated } =
    useEntraAuthStore();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Skip if already authenticated
    if (isAuthenticated) {
      console.log('Already authenticated, skipping redirect handler');
      return;
    }

    // Check if we're already processing a redirect
    if (sessionStorage.getItem('msal-redirect-processing') === 'true') {
      console.log('Redirect already being processed, skipping global handler');
      return;
    }

    // Check if we have auth parameters in the URL
    const hasAuthParams =
      window.location.hash.includes('code=') ||
      window.location.search.includes('code=') ||
      window.location.hash.includes('access_token=') ||
      window.location.search.includes('access_token=') ||
      window.location.hash.includes('error=') ||
      window.location.search.includes('error=');

    if (hasAuthParams) {
      console.log(
        'Global auth redirect handler: Processing authentication parameters'
      );

      // Set processing flag
      sessionStorage.setItem('msal-redirect-processing', 'true');

      // Prevent any other interactions during processing
      const preventInteraction = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };

      // Disable all clicks during auth processing
      document.addEventListener('click', preventInteraction, { capture: true });
      document.addEventListener('submit', preventInteraction, {
        capture: true,
      });

      // Handle the redirect
      handleAuthRedirect()
        .catch(error => {
          console.error('Global redirect handler error:', error);
          // Clear URL on error
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
        })
        .finally(() => {
          // Re-enable interactions and clear processing flag
          document.removeEventListener('click', preventInteraction, {
            capture: true,
          });
          document.removeEventListener('submit', preventInteraction, {
            capture: true,
          });
          sessionStorage.removeItem('msal-redirect-processing');
        });
    }
  }, [handleAuthRedirect, isAuthenticated]);

  return null; // This component renders nothing
}
