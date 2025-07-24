/**
 * Mobile App Layout Component
 * Comprehensive mobile-optimized layout with offline support, real-time updates, and touch optimization
 */

'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useMobile } from '@/services/mobile.service';
import { useOffline } from '@/services/offline.service';
import { useRealTime } from '@/services/realtime.service';
import MobileNavigation from '@/components/ui/MobileNavigation';
import PullToRefresh from '@/components/ui/PullToRefresh';
import OfflineIndicator from '@/components/ui/OfflineIndicator';
import RealTimeStatus from '@/components/ui/RealTimeStatus';

interface MobileAppLayoutProps {
  children: React.ReactNode;
  onRefresh?: () => Promise<void>;
  hideNavigation?: boolean;
  showOfflineIndicator?: boolean;
  className?: string;
}

export function MobileAppLayout({
  children,
  onRefresh,
  hideNavigation = false,
  showOfflineIndicator = true,
  className = '',
}: MobileAppLayoutProps) {
  const pathname = usePathname();
  const { isMobile, standalone, hasNotchSupport, setupPullToRefresh } =
    useMobile();
  const { isOnline, isOfflineReady, hasUnsynced } = useOffline();
  const { connectionStatus, requestNotificationPermission } = useRealTime();

  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>('default');

  // Setup PWA features on mount
  useEffect(() => {
    // Request notification permission on mobile
    if (isMobile && 'Notification' in window) {
      setNotificationPermission(Notification.permission);

      if (Notification.permission === 'default') {
        // Delay permission request to avoid interrupting onboarding
        const timer = setTimeout(() => {
          requestNotificationPermission().then(setNotificationPermission);
        }, 5000);

        return () => clearTimeout(timer);
      }
    }
  }, [isMobile, requestNotificationPermission]);

  // Setup global pull-to-refresh if enabled
  useEffect(() => {
    if (isMobile && onRefresh) {
      const cleanup = setupPullToRefresh(onRefresh);
      return cleanup;
    }
  }, [isMobile, onRefresh, setupPullToRefresh]);

  // Don't apply mobile layout on desktop
  if (!isMobile) {
    return <div className={className}>{children}</div>;
  }

  // Determine if we should show navigation
  const shouldShowNavigation =
    !hideNavigation && !pathname.includes('/onboarding');

  // Calculate safe area classes
  const safeAreaClasses = hasNotchSupport
    ? 'safe-area-top safe-area-bottom safe-area-left safe-area-right'
    : '';

  // Main content padding based on navigation and status bars
  const contentPadding = shouldShowNavigation ? 'pb-20' : 'pb-4';

  return (
    <div
      className={`
      min-h-screen bg-gray-50 flex flex-col
      ${safeAreaClasses}
      ${standalone ? 'standalone-app' : ''}
      ${className}
    `}
    >
      {/* Status Bar Area for Standalone Mode */}
      {standalone && (
        <div className="h-6 bg-gray-900 flex items-center justify-between px-4">
          <div className="flex items-center gap-1">
            {/* Signal strength indicator */}
            <div className="flex gap-1">
              {[1, 2, 3].map(bar => (
                <div
                  key={bar}
                  className="w-1 h-2 bg-white rounded-full opacity-80"
                />
              ))}
            </div>
          </div>

          <div className="text-white text-xs font-medium">
            {new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>

          <div className="flex items-center gap-1">
            {/* Battery indicator */}
            <div className="w-6 h-3 border border-white rounded-sm opacity-80">
              <div className="w-full h-full bg-white rounded-sm opacity-60" />
            </div>
          </div>
        </div>
      )}

      {/* Real-time Status Bar (top) */}
      <div className="relative">
        <RealTimeStatus
          className="absolute top-2 right-4 z-30"
          showDetails={false}
        />
      </div>

      {/* Main Content Area */}
      <main
        className={`
        flex-1 relative
        ${contentPadding}
        ${hasNotchSupport ? 'pt-safe' : 'pt-4'}
      `}
      >
        {/* Pull-to-Refresh Wrapper */}
        {onRefresh ? (
          <PullToRefresh onRefresh={onRefresh}>
            <div className="min-h-full">{children}</div>
          </PullToRefresh>
        ) : (
          <div className="min-h-full">{children}</div>
        )}

        {/* Offline Indicator */}
        {showOfflineIndicator && (
          <OfflineIndicator
            position="top"
            showDetails={true}
            className="mt-12"
          />
        )}
      </main>

      {/* Mobile Navigation */}
      {shouldShowNavigation && <MobileNavigation />}

      {/* PWA Install Prompt Space */}
      <div id="pwa-install-prompt" />

      {/* Global Mobile Styles */}
      <style jsx global>{`
        /* PWA and mobile-specific styles */
        .standalone-app {
          user-select: none;
          -webkit-user-select: none;
          -webkit-touch-callout: none;
        }

        /* Safe area support */
        .safe-area-top {
          padding-top: env(safe-area-inset-top);
        }

        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }

        .safe-area-left {
          padding-left: env(safe-area-inset-left);
        }

        .safe-area-right {
          padding-right: env(safe-area-inset-right);
        }

        .pt-safe {
          padding-top: max(1rem, env(safe-area-inset-top));
        }

        /* Touch optimization */
        @media (pointer: coarse) {
          button,
          [role='button'],
          a {
            min-height: 44px;
            min-width: 44px;
          }

          input,
          textarea,
          select {
            font-size: 16px; /* Prevent zoom on iOS */
          }
        }

        /* Smooth scrolling for mobile */
        html {
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }

        /* Disable double-tap zoom */
        * {
          touch-action: manipulation;
        }

        /* Custom scrollbar for mobile */
        ::-webkit-scrollbar {
          width: 4px;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 2px;
        }

        /* PWA splash screen simulation */
        .loading-splash {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          color: white;
        }

        /* Animation utilities */
        .animate-in {
          animation-fill-mode: both;
        }

        .slide-in-from-top-2 {
          animation: slideInFromTop 0.2s ease-out;
        }

        @keyframes slideInFromTop {
          from {
            transform: translateY(-8px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        /* Line clamp utility */
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Focus states for accessibility */
        .focus\\:ring-2:focus {
          outline: 2px solid transparent;
          outline-offset: 2px;
          box-shadow: 0 0 0 2px #3b82f6;
        }

        /* Dark mode support for mobile */
        @media (prefers-color-scheme: dark) {
          .bg-gray-50 {
            background-color: #111827;
          }

          .text-gray-900 {
            color: #f9fafb;
          }

          .text-gray-600 {
            color: #d1d5db;
          }

          .bg-white {
            background-color: #1f2937;
          }

          .border-gray-200 {
            border-color: #374151;
          }
        }
      `}</style>
    </div>
  );
}

export default MobileAppLayout;
