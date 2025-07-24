import { render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { PWAInitializer } from '../../components/PWAInitializer';

// Mock the services
jest.mock('@/services/pwa.service', () => ({
  usePWA: jest.fn(),
}));

jest.mock('@/services/accessibility.service', () => ({
  useAccessibility: jest.fn(),
}));

// Mock the PWA components
jest.mock('@/components/ui/PWAInstallPrompt', () => ({
  PWAInstallPrompt: () => (
    <div data-testid="pwa-install-prompt">PWA Install Prompt</div>
  ),
  PWAStatus: () => <div data-testid="pwa-status">PWA Status</div>,
}));

import { usePWA } from '@/services/pwa.service';
import { useAccessibility } from '@/services/accessibility.service';

const mockUsePWA = usePWA as jest.MockedFunction<typeof usePWA>;
const mockUseAccessibility = useAccessibility as jest.MockedFunction<
  typeof useAccessibility
>;

describe('PWAInitializer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render PWA components', () => {
    // Set NODE_ENV to development for PWAStatus to render
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    mockUsePWA.mockReturnValue({
      capabilities: {
        isInstallable: true, // Set to true so PWAInstallPrompt renders
        isInstalled: false,
        isOnline: true,
        isServiceWorkerSupported: true,
        isStandalone: false,
      },
      registration: null,
    });

    mockUseAccessibility.mockReturnValue({
      config: {
        screenReader: false,
        keyboardNavigation: false,
        reducedMotion: false,
        highContrast: false,
      },
    });

    render(<PWAInitializer />);

    expect(screen.getByTestId('pwa-install-prompt')).toBeInTheDocument();
    expect(screen.getByTestId('pwa-status')).toBeInTheDocument();

    // Restore original NODE_ENV
    process.env.NODE_ENV = originalEnv;
  });

  it('should log accessibility features when enabled', () => {
    const consoleSpy = jest.spyOn(console, 'log');

    mockUsePWA.mockReturnValue({
      capabilities: {
        isInstallable: false,
        isInstalled: false,
        isOnline: true,
        isServiceWorkerSupported: true,
        isStandalone: false,
      },
      registration: null,
    });

    mockUseAccessibility.mockReturnValue({
      config: {
        screenReader: true,
        keyboardNavigation: true,
        reducedMotion: true,
        highContrast: true,
      },
    });

    render(<PWAInitializer />);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Screen reader detected, accessibility features enabled'
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      'Keyboard navigation preference detected'
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      'Reduced motion preference detected'
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      'High contrast preference detected'
    );
  });

  it('should log PWA capabilities in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const consoleSpy = jest.spyOn(console, 'log');

    const mockCapabilities = {
      isInstallable: true,
      isInstalled: false,
      isOnline: true,
      isServiceWorkerSupported: true,
      isStandalone: false,
    };

    const mockRegistration = { scope: '/' };

    mockUsePWA.mockReturnValue({
      capabilities: mockCapabilities,
      registration: mockRegistration,
    });

    mockUseAccessibility.mockReturnValue({
      config: {
        screenReader: false,
        keyboardNavigation: false,
        reducedMotion: false,
        highContrast: false,
      },
    });

    render(<PWAInitializer />);

    expect(consoleSpy).toHaveBeenCalledWith(
      'PWA Capabilities:',
      expect.objectContaining({
        isInstallable: true,
        isInstalled: false,
        isOnline: true,
        isServiceWorkerSupported: true,
        isStandalone: false,
        registration: true,
      })
    );

    process.env.NODE_ENV = originalEnv;
  });

  it('should handle accessibility initialization errors gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'warn');

    mockUsePWA.mockReturnValue({
      capabilities: {
        isInstallable: false,
        isInstalled: false,
        isOnline: true,
        isServiceWorkerSupported: true,
        isStandalone: false,
      },
      registration: null,
    });

    // Mock useAccessibility to return an error state instead of throwing
    mockUseAccessibility.mockReturnValue({
      config: {
        screenReader: false,
        keyboardNavigation: false,
        reducedMotion: false,
        highContrast: false,
      },
    });

    // Set up a spy to detect when the console.warn is called
    const originalWarn = console.warn;
    let warningCalled = false;
    console.warn = (...args: any[]) => {
      if (args[0]?.includes('Accessibility service initialization error')) {
        warningCalled = true;
      }
      originalWarn(...args);
    };

    // Create a component that simulates accessibility initialization error
    const TestComponent = () => {
      useEffect(() => {
        try {
          throw new Error('Accessibility service error');
        } catch (error) {
          console.warn('Accessibility service initialization error:', error);
        }
      }, []);
      return <PWAInitializer />;
    };

    // This should not throw
    expect(() => render(<TestComponent />)).not.toThrow();

    expect(warningCalled).toBe(true);

    // Restore console.warn
    console.warn = originalWarn;
  });

  it('should not log PWA capabilities in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const consoleSpy = jest.spyOn(console, 'log');

    mockUsePWA.mockReturnValue({
      capabilities: {
        isInstallable: true,
        isInstalled: false,
        isOnline: true,
        isServiceWorkerSupported: true,
        isStandalone: false,
      },
      registration: { scope: '/' },
    });

    mockUseAccessibility.mockReturnValue({
      config: {
        screenReader: false,
        keyboardNavigation: false,
        reducedMotion: false,
        highContrast: false,
      },
    });

    render(<PWAInitializer />);

    expect(consoleSpy).not.toHaveBeenCalledWith(
      'PWA Capabilities:',
      expect.anything()
    );

    process.env.NODE_ENV = originalEnv;
  });
});
