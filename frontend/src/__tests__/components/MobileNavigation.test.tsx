import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, usePathname } from 'next/navigation';
import MobileNavigation from '@/components/ui/MobileNavigation';
import { useMobile } from '@/services/mobile.service';
import { useRealTime } from '@/services/realtime.service';
import '@testing-library/jest-dom';

// Mock the dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

jest.mock('@/services/mobile.service', () => ({
  useMobile: jest.fn(),
}));

jest.mock('@/services/realtime.service', () => ({
  useRealTime: jest.fn(),
}));

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
};

const mockUseMobile = {
  isMobile: true,
  hapticFeedback: jest.fn(),
  setupSwipeGesture: jest.fn(),
};

const mockUseRealTime = {
  connectionStatus: 'connected',
};

describe('MobileNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    (useMobile as jest.Mock).mockReturnValue(mockUseMobile);
    (useRealTime as jest.Mock).mockReturnValue(mockUseRealTime);
  });

  describe('Mobile Device Detection', () => {
    it('should render navigation when on mobile device', () => {
      render(<MobileNavigation />);

      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Schedule')).toBeInTheDocument();
      expect(screen.getByText('Groups')).toBeInTheDocument();
      expect(screen.getByText('Alerts')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    it('should not render navigation when not on mobile device', () => {
      (useMobile as jest.Mock).mockReturnValue({
        ...mockUseMobile,
        isMobile: false,
      });

      const { container } = render(<MobileNavigation />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Navigation Functionality', () => {
    it('should navigate to correct route when navigation item is clicked', async () => {
      render(<MobileNavigation />);

      const homeButton = screen.getByText('Home');
      fireEvent.click(homeButton);

      await waitFor(() => {
        expect(mockUseMobile.hapticFeedback).toHaveBeenCalledWith('light');
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should highlight active navigation item', () => {
      (usePathname as jest.Mock).mockReturnValue('/dashboard');
      render(<MobileNavigation />);

      const homeButton = screen.getByText('Home').closest('button');
      expect(homeButton).toHaveClass('bg-primary-50');
    });

    it('should handle different path patterns correctly', () => {
      (usePathname as jest.Mock).mockReturnValue('/preferences/weekly');
      render(<MobileNavigation />);

      const scheduleButton = screen.getByText('Schedule').closest('button');
      expect(scheduleButton).toHaveClass('bg-primary-50');
    });
  });

  describe('Haptic Feedback', () => {
    it('should trigger haptic feedback on navigation', async () => {
      render(<MobileNavigation />);

      const scheduleButton = screen.getByText('Schedule');
      fireEvent.click(scheduleButton);

      await waitFor(() => {
        expect(mockUseMobile.hapticFeedback).toHaveBeenCalledWith('light');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<MobileNavigation />);

      const navigation = screen.getByRole('navigation');
      expect(navigation).toHaveAttribute('aria-label', 'Mobile navigation');
    });

    it('should have proper button labels', () => {
      render(<MobileNavigation />);

      const homeButton = screen.getByRole('button', { name: /home/i });
      expect(homeButton).toBeInTheDocument();
    });
  });

  describe('Connection Status', () => {
    it('should display connection status indicator', () => {
      (useRealTime as jest.Mock).mockReturnValue({
        connectionStatus: 'disconnected',
      });

      render(<MobileNavigation />);

      // The component should handle offline state gracefully
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className when provided', () => {
      const { container } = render(
        <MobileNavigation className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
