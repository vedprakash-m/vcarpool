/**
 * Mobile Navigation Component
 * Optimized bottom navigation for mobile devices with touch-friendly interactions
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useMobile } from '@/services/mobile.service';
import { useRealTime } from '@/services/realtime.service';
import {
  HomeIcon,
  CalendarIcon,
  UserGroupIcon,
  BellIcon,
  UserIcon,
  ExclamationTriangleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  CalendarIcon as CalendarIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  BellIcon as BellIconSolid,
  UserIcon as UserIconSolid,
} from '@heroicons/react/24/solid';

interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconSolid: React.ComponentType<{ className?: string }>;
  badge?: number;
  role?: string[];
}

interface MobileNavigationProps {
  className?: string;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'home',
    label: 'Home',
    href: '/dashboard',
    icon: HomeIcon,
    iconSolid: HomeIconSolid,
  },
  {
    id: 'schedule',
    label: 'Schedule',
    href: '/preferences',
    icon: CalendarIcon,
    iconSolid: CalendarIconSolid,
  },
  {
    id: 'groups',
    label: 'Groups',
    href: '/groups',
    icon: UserGroupIcon,
    iconSolid: UserGroupIconSolid,
  },
  {
    id: 'notifications',
    label: 'Alerts',
    href: '/notifications',
    icon: BellIcon,
    iconSolid: BellIconSolid,
  },
  {
    id: 'profile',
    label: 'Profile',
    href: '/profile',
    icon: UserIcon,
    iconSolid: UserIconSolid,
  },
];

export function MobileNavigation({ className = '' }: MobileNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isMobile, hapticFeedback, setupSwipeGesture } = useMobile();
  const { connectionStatus } = useRealTime();
  const [notificationCount, setNotificationCount] = useState(0);
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Only render on mobile devices
  if (!isMobile) {
    return null;
  }

  const handleNavigation = (item: NavigationItem) => {
    hapticFeedback('light');
    router.push(item.href);
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/' || pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const quickActions = [
    {
      id: 'emergency',
      label: 'Emergency',
      icon: ExclamationTriangleIcon,
      action: () => router.push('/emergency'),
      className: 'bg-red-500 text-white',
    },
    {
      id: 'add-group',
      label: 'New Group',
      icon: PlusIcon,
      action: () => router.push('/groups/create'),
      className: 'bg-blue-500 text-white',
    },
  ];

  return (
    <>
      {/* Quick Actions Overlay */}
      {showQuickActions && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setShowQuickActions(false)}
        >
          <div className="absolute bottom-20 right-4 space-y-3">
            {quickActions.map(action => (
              <button
                key={action.id}
                onClick={e => {
                  e.stopPropagation();
                  hapticFeedback('medium');
                  action.action();
                  setShowQuickActions(false);
                }}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-full shadow-lg
                  transform transition-all duration-200 hover:scale-105
                  ${action.className}
                `}
              >
                <action.icon className="w-5 h-5" />
                <span className="text-sm font-medium whitespace-nowrap">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav
        className={`
          fixed bottom-0 left-0 right-0 z-30
          bg-white border-t border-gray-200
          safe-area-bottom
          ${className}
        `}
        aria-label="Mobile navigation"
      >
        {/* Connection Status Indicator */}
        {!connectionStatus.connected && (
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
            <div className="bg-amber-500 text-white text-xs px-3 py-1 rounded-full">
              {connectionStatus.reconnecting ? 'Reconnecting...' : 'Offline'}
            </div>
          </div>
        )}

        <div className="flex items-center justify-around py-2">
          {navigationItems.map(item => {
            const active = isActive(item.href);
            const IconComponent = active ? item.iconSolid : item.icon;
            const badge =
              item.id === 'notifications' ? notificationCount : item.badge;

            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item)}
                className={`
                  relative flex flex-col items-center justify-center
                  min-w-[44px] min-h-[44px] p-2
                  transition-all duration-200
                  ${
                    active
                      ? 'bg-primary-50 text-blue-600'
                      : 'text-gray-400 hover:text-gray-600'
                  }
                `}
                aria-label={item.label}
              >
                {/* Icon with badge */}
                <div className="relative">
                  <IconComponent
                    className={`
                      w-6 h-6 transition-transform duration-200
                      ${active ? 'scale-110' : 'scale-100'}
                    `}
                  />

                  {badge && badge > 0 && (
                    <div
                      className={`
                      absolute -top-1 -right-1
                      min-w-[18px] h-[18px] 
                      bg-red-500 text-white text-xs
                      rounded-full flex items-center justify-center
                      animate-pulse
                    `}
                    >
                      {badge > 99 ? '99+' : badge}
                    </div>
                  )}
                </div>

                {/* Label */}
                <span
                  className={`
                  text-xs mt-1 transition-all duration-200
                  ${active ? 'font-semibold' : 'font-normal'}
                `}
                >
                  {item.label}
                </span>

                {/* Active indicator */}
                {active && (
                  <div className="absolute bottom-0 w-1 h-1 bg-blue-600 rounded-full" />
                )}
              </button>
            );
          })}

          {/* Quick Actions Button */}
          <button
            onClick={() => {
              hapticFeedback('medium');
              setShowQuickActions(!showQuickActions);
            }}
            className={`
              relative flex flex-col items-center justify-center
              min-w-[44px] min-h-[44px] p-2
              transition-all duration-200
              ${
                showQuickActions
                  ? 'text-blue-600 bg-blue-50 rounded-lg'
                  : 'text-gray-400 hover:text-gray-600'
              }
            `}
            aria-label="Quick Actions"
          >
            <PlusIcon
              className={`
                w-6 h-6 transition-transform duration-200
                ${
                  showQuickActions
                    ? 'rotate-45 scale-110'
                    : 'rotate-0 scale-100'
                }
              `}
            />
            <span
              className={`
              text-xs mt-1 transition-all duration-200
              ${showQuickActions ? 'font-semibold' : 'font-normal'}
            `}
            >
              More
            </span>
          </button>
        </div>
      </nav>

      {/* Bottom padding to prevent content from being hidden behind navigation */}
      <div className="h-20 w-full" />
    </>
  );
}

export default MobileNavigation;
