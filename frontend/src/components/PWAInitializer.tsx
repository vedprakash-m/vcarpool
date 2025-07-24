/**
 * PWA Initializer Component
 * Handles service worker registration and PWA setup
 */

'use client';

import { useEffect } from 'react';
import { usePWA } from '@/services/pwa.service';
import { useAccessibility } from '@/services/accessibility.service';
import { PWAInstallPrompt, PWAStatus } from '@/components/ui/PWAInstallPrompt';

export function PWAInitializer() {
  const { capabilities, registration } = usePWA();

  // Always call hooks at the top level - error handling happens in the hook itself
  const { config: accessibilityConfig } = useAccessibility();

  useEffect(() => {
    // Initialize accessibility features on app load
    try {
      if (accessibilityConfig.screenReader) {
        console.log('Screen reader detected, accessibility features enabled');
      }

      if (accessibilityConfig.keyboardNavigation) {
        console.log('Keyboard navigation preference detected');
      }

      if (accessibilityConfig.reducedMotion) {
        console.log('Reduced motion preference detected');
      }

      if (accessibilityConfig.highContrast) {
        console.log('High contrast preference detected');
      }
    } catch (error) {
      console.warn('Accessibility initialization error:', error);
    }
  }, [accessibilityConfig]);

  useEffect(() => {
    // Log PWA capabilities for debugging
    if (process.env.NODE_ENV === 'development') {
      try {
        console.log('PWA Capabilities:', {
          isInstallable: capabilities.isInstallable,
          isInstalled: capabilities.isInstalled,
          isOnline: capabilities.isOnline,
          isServiceWorkerSupported: capabilities.isServiceWorkerSupported,
          isStandalone: capabilities.isStandalone,
          registration: !!registration,
        });
      } catch (error) {
        console.warn('PWA capabilities logging error:', error);
      }
    }
  }, [capabilities, registration]);

  return (
    <>
      {/* PWA Install Prompt - only show on non-installed devices */}
      {!capabilities.isInstalled && capabilities.isInstallable && (
        <PWAInstallPrompt
          className="fixed bottom-4 right-4 z-50"
          hideAfterInstall={true}
        />
      )}

      {/* PWA Status Indicator - for debugging/info */}
      {process.env.NODE_ENV === 'development' && (
        <PWAStatus className="fixed top-4 right-4 z-50" />
      )}
    </>
  );
}

export default PWAInitializer;
