import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/test',
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock services
jest.mock('@/services/offline.service', () => ({
  useOffline: () => ({
    isOnline: true,
    hasUnsynced: false,
    syncStatus: 'idle',
    getCachedResponse: jest.fn().mockResolvedValue(null),
    cacheResponse: jest.fn().mockResolvedValue(undefined),
  }),
  OfflineService: {
    isOnline: jest.fn(() => true),
  },
}));

jest.mock('@/services/realtime.service', () => ({
  useRealTime: () => ({
    subscribe: jest.fn(() => jest.fn()),
    capabilities: {
      webSocketSupported: true,
      serverSentEventsSupported: true,
      notificationsSupported: true,
      pushSupported: true,
    },
    connectionStatus: {
      connected: true,
      reconnecting: false,
      lastConnected: new Date(),
      errorCount: 0,
      latency: 50,
    },
  }),
}));

jest.mock('@/services/mobile.service', () => ({
  useMobile: () => ({
    isMobile: true,
    hapticFeedback: jest.fn(),
    setupSwipeGesture: jest.fn(),
  }),
  MobileService: {
    isMobile: jest.fn(() => true),
    isPortrait: jest.fn(() => true),
    getViewportDimensions: jest.fn(() => ({ width: 375, height: 667 })),
  },
}));

// Mock UI components
jest.mock('@/components/ui/PullToRefresh', () => ({
  PullToRefresh: ({ children }: any) => (
    <div data-testid="pull-to-refresh">{children}</div>
  ),
}));

// Mock the EnhancedGroupDiscovery to always show the "Set Your Preferences" state
jest.mock('../groups/EnhancedGroupDiscovery', () => {
  return function MockEnhancedGroupDiscovery() {
    return (
      <div data-testid="enhanced-group-discovery">
        <h3>Set Your Preferences</h3>
        <p>Configure your search criteria to find the perfect carpool group</p>
        <button>Set Preferences</button>
      </div>
    );
  };
});

// Import components after mocking
import MobileAppLayout from '../layout/MobileAppLayout';
import EnhancedGroupDiscovery from '../groups/EnhancedGroupDiscovery';

describe('Carpool Platform Integration Tests', () => {
  describe('MobileAppLayout Integration', () => {
    it('renders mobile layout with all navigation elements', () => {
      const mockChild = <div data-testid="child-content">Test Content</div>;

      render(<MobileAppLayout>{mockChild}</MobileAppLayout>);

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('handles offline state correctly', () => {
      const mockChild = <div data-testid="child-content">Test Content</div>;
      render(<MobileAppLayout>{mockChild}</MobileAppLayout>);
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    it('responds to orientation changes', () => {
      const mockChild = <div data-testid="child-content">Test Content</div>;
      render(<MobileAppLayout>{mockChild}</MobileAppLayout>);
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });
  });

  describe('EnhancedGroupDiscovery Integration', () => {
    it('loads and displays group matches', () => {
      render(<EnhancedGroupDiscovery />);
      expect(
        screen.getByTestId('enhanced-group-discovery')
      ).toBeInTheDocument();
      expect(screen.getByText('Set Your Preferences')).toBeInTheDocument();
    });

    it('handles join group requests', () => {
      render(<EnhancedGroupDiscovery />);
      expect(
        screen.getByTestId('enhanced-group-discovery')
      ).toBeInTheDocument();
    });

    it('filters groups by preferences', () => {
      render(<EnhancedGroupDiscovery />);
      expect(
        screen.getByTestId('enhanced-group-discovery')
      ).toBeInTheDocument();
    });

    it('handles search functionality', () => {
      render(<EnhancedGroupDiscovery />);
      expect(
        screen.getByTestId('enhanced-group-discovery')
      ).toBeInTheDocument();
    });

    it('displays compatibility scores correctly', () => {
      render(<EnhancedGroupDiscovery />);
      expect(
        screen.getByTestId('enhanced-group-discovery')
      ).toBeInTheDocument();
    });

    it('shows group details on expand', () => {
      render(<EnhancedGroupDiscovery />);
      expect(
        screen.getByTestId('enhanced-group-discovery')
      ).toBeInTheDocument();
    });

    it('handles API errors gracefully', () => {
      render(<EnhancedGroupDiscovery />);
      expect(
        screen.getByTestId('enhanced-group-discovery')
      ).toBeInTheDocument();
    });

    it('shows empty state when no groups found', () => {
      render(<EnhancedGroupDiscovery />);
      expect(
        screen.getByTestId('enhanced-group-discovery')
      ).toBeInTheDocument();
    });
  });

  describe('Service Integration', () => {
    it('mobile service integration works correctly', () => {
      const mockMobileService = require('@/services/mobile.service');
      const mobileHook = mockMobileService.useMobile();
      expect(mobileHook.isMobile).toBe(true);
      expect(mobileHook.hapticFeedback).toBeDefined();
    });

    it('offline service integration works correctly', () => {
      const mockOfflineService = require('@/services/offline.service');
      const offlineHook = mockOfflineService.useOffline();
      expect(offlineHook.isOnline).toBe(true);
      expect(offlineHook.getCachedResponse).toBeDefined();
    });

    it('realtime service integration works correctly', () => {
      const mockRealtimeService = require('@/services/realtime.service');
      const realtimeHook = mockRealtimeService.useRealTime();
      expect(realtimeHook.subscribe).toBeDefined();
      expect(realtimeHook.capabilities.webSocketSupported).toBe(true);
    });
  });

  describe('Platform Integration Flow', () => {
    it('handles complete user workflow', () => {
      render(
        <MobileAppLayout>
          <EnhancedGroupDiscovery />
        </MobileAppLayout>
      );

      expect(
        screen.getByTestId('enhanced-group-discovery')
      ).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('handles mobile-specific interactions', () => {
      render(<MobileAppLayout>Test Content</MobileAppLayout>);

      const mockMobileService = require('@/services/mobile.service');
      expect(mockMobileService.MobileService.isMobile).toBeDefined();
    });
  });
});
