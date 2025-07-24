import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useRouter, usePathname } from 'next/navigation';
import Navigation from '../../components/Navigation';
import { useAuthStore } from '../../store/auth.store';

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock auth store
jest.mock('../../store/auth.store', () => ({
  useAuthStore: jest.fn(),
}));

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  HomeIcon: ({ className, ...props }: any) => (
    <svg data-testid="home-icon" className={className} {...props} />
  ),
  CalendarIcon: ({ className, ...props }: any) => (
    <svg data-testid="calendar-icon" className={className} {...props} />
  ),
  TruckIcon: ({ className, ...props }: any) => (
    <svg data-testid="truck-icon" className={className} {...props} />
  ),
  UserCircleIcon: ({ className, ...props }: any) => (
    <svg data-testid="user-circle-icon" className={className} {...props} />
  ),
  ArrowRightOnRectangleIcon: ({ className, ...props }: any) => (
    <svg data-testid="logout-icon" className={className} {...props} />
  ),
  PlusIcon: ({ className, ...props }: any) => (
    <svg data-testid="plus-icon" className={className} {...props} />
  ),
}));

describe('Navigation - Realistic Implementation Tests', () => {
  const mockPush = jest.fn();
  const mockLogout = jest.fn();

  const mockUser = {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    role: 'parent',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });

    (usePathname as jest.Mock).mockReturnValue('/dashboard');

    (useAuthStore as jest.Mock).mockReturnValue({
      user: mockUser,
      logout: mockLogout,
    });
  });

  describe('Core Functionality', () => {
    it('renders navigation with all essential elements', () => {
      render(<Navigation />);

      // Logo and branding
      expect(screen.getByText('Carpool')).toBeInTheDocument();
      expect(screen.getByTestId('truck-icon')).toBeInTheDocument();

      // Navigation items
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('My Trips')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();

      // Logout button
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    it('displays user information when user is logged in', () => {
      render(<Navigation />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('parent')).toBeInTheDocument();
      expect(screen.getByText('JD')).toBeInTheDocument(); // User initials
    });

    it('handles user with missing first name gracefully', () => {
      (useAuthStore as jest.Mock).mockReturnValue({
        user: { ...mockUser, firstName: null },
        logout: mockLogout,
      });

      render(<Navigation />);

      expect(screen.getByText('Unknown Doe')).toBeInTheDocument();
      expect(screen.getByText('?D')).toBeInTheDocument();
    });

    it('handles user with missing last name gracefully', () => {
      (useAuthStore as jest.Mock).mockReturnValue({
        user: { ...mockUser, lastName: null },
        logout: mockLogout,
      });

      render(<Navigation />);

      expect(screen.getByText('John User')).toBeInTheDocument();
      expect(screen.getByText('J?')).toBeInTheDocument();
    });

    it('handles user with missing role gracefully', () => {
      (useAuthStore as jest.Mock).mockReturnValue({
        user: { ...mockUser, role: null },
        logout: mockLogout,
      });

      render(<Navigation />);

      expect(screen.getByText('user')).toBeInTheDocument();
    });
  });

  describe('Navigation Functionality', () => {
    it('navigates to dashboard when Dashboard is clicked', () => {
      render(<Navigation />);

      const dashboardButton = screen.getByText('Dashboard');
      fireEvent.click(dashboardButton);

      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('navigates to trips when My Trips is clicked', () => {
      render(<Navigation />);

      const tripsButton = screen.getByText('My Trips');
      fireEvent.click(tripsButton);

      expect(mockPush).toHaveBeenCalledWith('/trips');
    });

    it('navigates to profile when Profile is clicked', () => {
      render(<Navigation />);

      const profileButton = screen.getByText('Profile');
      fireEvent.click(profileButton);

      expect(mockPush).toHaveBeenCalledWith('/profile');
    });

    it('calls logout and redirects when Sign Out is clicked', () => {
      render(<Navigation />);

      const signOutButton = screen.getByText('Sign Out');
      fireEvent.click(signOutButton);

      expect(mockLogout).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  describe('Active State Management', () => {
    it('highlights dashboard when on dashboard page', () => {
      (usePathname as jest.Mock).mockReturnValue('/dashboard');
      render(<Navigation />);

      const dashboardButton = screen.getByText('Dashboard');
      expect(dashboardButton).toHaveClass('bg-primary-100', 'text-primary-700');
    });

    it('highlights trips when on trips page', () => {
      (usePathname as jest.Mock).mockReturnValue('/trips');
      render(<Navigation />);

      const tripsButton = screen.getByText('My Trips');
      expect(tripsButton).toHaveClass('bg-primary-100', 'text-primary-700');
    });

    it('highlights profile when on profile page', () => {
      (usePathname as jest.Mock).mockReturnValue('/profile');
      render(<Navigation />);

      const profileButton = screen.getByText('Profile');
      expect(profileButton).toHaveClass('bg-primary-100', 'text-primary-700');
    });

    it('shows inactive state for non-current pages', () => {
      (usePathname as jest.Mock).mockReturnValue('/dashboard');
      render(<Navigation />);

      const tripsButton = screen.getByText('My Trips');
      expect(tripsButton).toHaveClass('text-gray-600');
      expect(tripsButton).not.toHaveClass('bg-primary-100');
    });
  });

  describe('Visual Structure and Styling', () => {
    it('applies correct navigation structure classes', () => {
      const { container } = render(<Navigation />);

      const nav = container.querySelector('nav');
      expect(nav).toHaveClass(
        'bg-white',
        'shadow-sm',
        'border-r',
        'border-gray-200'
      );
    });

    it('displays all navigation icons correctly', () => {
      render(<Navigation />);

      expect(screen.getByTestId('truck-icon')).toBeInTheDocument();
      expect(screen.getByTestId('home-icon')).toBeInTheDocument();
      expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();
      expect(screen.getByTestId('user-circle-icon')).toBeInTheDocument();
      expect(screen.getByTestId('logout-icon')).toBeInTheDocument();
    });

    it('applies proper spacing and layout classes', () => {
      const { container } = render(<Navigation />);

      const contentDiv = container.querySelector('div.px-4.py-6');
      expect(contentDiv).toBeInTheDocument();
    });

    it('styles user information section correctly', () => {
      render(<Navigation />);

      const userSection = screen.getByText('John Doe').closest('div');
      // Check the container that has the actual styling
      const styledContainer = userSection?.closest('.bg-gray-50');
      expect(styledContainer).toHaveClass('bg-gray-50', 'rounded-lg');
    });
  });

  describe('No User State', () => {
    it('handles navigation when user is null', () => {
      (useAuthStore as jest.Mock).mockReturnValue({
        user: null,
        logout: mockLogout,
      });

      render(<Navigation />);

      // Should still render navigation items
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('My Trips')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();

      // Should not render user info
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    it('navigation still works when user is null', () => {
      (useAuthStore as jest.Mock).mockReturnValue({
        user: null,
        logout: mockLogout,
      });

      render(<Navigation />);

      const dashboardButton = screen.getByText('Dashboard');
      fireEvent.click(dashboardButton);

      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('Accessibility', () => {
    it('provides accessible navigation buttons', () => {
      render(<Navigation />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);

      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
      });
    });

    it('ensures proper semantic HTML structure', () => {
      const { container } = render(<Navigation />);

      const nav = container.querySelector('nav');
      const list = container.querySelector('ul');
      const listItems = container.querySelectorAll('li');

      expect(nav).toBeInTheDocument();
      expect(list).toBeInTheDocument();
      expect(listItems.length).toBe(3); // Three navigation items
    });

    it('provides accessible user information', () => {
      render(<Navigation />);

      const userSection = screen.getByText('John Doe');
      expect(userSection).toBeVisible();

      const roleText = screen.getByText('parent');
      expect(roleText).toBeVisible();
    });
  });

  describe('Integration Scenarios', () => {
    it('handles rapid navigation clicks', () => {
      render(<Navigation />);

      const dashboardButton = screen.getByText('Dashboard');
      const tripsButton = screen.getByText('My Trips');

      fireEvent.click(dashboardButton);
      fireEvent.click(tripsButton);
      fireEvent.click(dashboardButton);

      expect(mockPush).toHaveBeenCalledTimes(3);
      expect(mockPush).toHaveBeenNthCalledWith(1, '/dashboard');
      expect(mockPush).toHaveBeenNthCalledWith(2, '/trips');
      expect(mockPush).toHaveBeenNthCalledWith(3, '/dashboard');
    });

    it('maintains state across pathname changes', () => {
      const { rerender } = render(<Navigation />);

      // Change pathname and rerender
      (usePathname as jest.Mock).mockReturnValue('/trips');
      rerender(<Navigation />);

      const tripsButton = screen.getByText('My Trips');
      expect(tripsButton).toHaveClass('bg-primary-100', 'text-primary-700');
    });

    it('handles different user roles correctly', () => {
      const adminUser = { ...mockUser, role: 'admin' };
      (useAuthStore as jest.Mock).mockReturnValue({
        user: adminUser,
        logout: mockLogout,
      });

      render(<Navigation />);

      expect(screen.getByText('admin')).toBeInTheDocument();
    });
  });

  describe('Component Lifecycle', () => {
    it('cleans up properly on unmount', () => {
      const { unmount } = render(<Navigation />);

      expect(() => unmount()).not.toThrow();
    });

    it('handles multiple renders correctly', () => {
      const { rerender } = render(<Navigation />);

      expect(screen.getByText('Carpool')).toBeInTheDocument();

      rerender(<Navigation />);

      expect(screen.getByText('Carpool')).toBeInTheDocument();
    });

    it('maintains consistent behavior across re-renders', () => {
      const { rerender } = render(<Navigation />);

      let dashboardButton = screen.getByText('Dashboard');
      fireEvent.click(dashboardButton);

      rerender(<Navigation />);

      dashboardButton = screen.getByText('Dashboard');
      fireEvent.click(dashboardButton);

      expect(mockPush).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('handles missing user properties gracefully', () => {
      (useAuthStore as jest.Mock).mockReturnValue({
        user: {},
        logout: mockLogout,
      });

      render(<Navigation />);

      expect(screen.getByText('Unknown User')).toBeInTheDocument();
      expect(screen.getByText('??')).toBeInTheDocument();
      expect(screen.getByText('user')).toBeInTheDocument();
    });

    it('handles auth store errors gracefully', () => {
      (useAuthStore as jest.Mock).mockReturnValue({
        user: undefined,
        logout: mockLogout,
      });

      expect(() => render(<Navigation />)).not.toThrow();
    });

    it('handles logout function calls correctly', () => {
      const workingLogout = jest.fn();

      (useAuthStore as jest.Mock).mockReturnValue({
        user: mockUser,
        logout: workingLogout,
      });

      render(<Navigation />);

      const signOutButton = screen.getByText('Sign Out');
      fireEvent.click(signOutButton);

      // Verify both logout and navigation were called
      expect(workingLogout).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  describe('Performance', () => {
    it('renders efficiently', () => {
      const startTime = performance.now();
      render(<Navigation />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    it('handles frequent re-renders efficiently', () => {
      const { rerender } = render(<Navigation />);

      for (let i = 0; i < 10; i++) {
        rerender(<Navigation />);
      }

      expect(screen.getByText('Carpool')).toBeInTheDocument();
    });
  });
});
