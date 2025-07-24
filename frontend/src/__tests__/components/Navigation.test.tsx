import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Navigation from '@/components/Navigation';

// Mock the auth store
const mockLogout = jest.fn();
const mockUser = {
  id: '1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'parent',
  createdAt: new Date(),
  updatedAt: new Date(),
  preferences: {
    pickupLocation: 'Test Location',
    dropoffLocation: 'Test Destination',
    preferredTime: '08:00',
    isDriver: true,
    smokingAllowed: false,
    notifications: {
      email: true,
      sms: false,
      tripReminders: true,
      swapRequests: true,
      scheduleChanges: true,
    },
  },
};

jest.mock('@/store/auth.store', () => ({
  useAuthStore: () => ({
    user: mockUser,
    logout: mockLogout,
    isAuthenticated: true,
  }),
}));

const mockPush = jest.fn();

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/dashboard',
}));

describe('Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders navigation items', () => {
    render(<Navigation />);

    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByText('My Trips')).toBeDefined();
    expect(screen.getByText('Profile')).toBeDefined();
  });

  it('logs out user when logout button is clicked', () => {
    render(<Navigation />);

    const logoutButton = screen.getByText('Sign Out');
    fireEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('displays user information', () => {
    render(<Navigation />);

    expect(screen.getByText('Test User')).toBeDefined();
    expect(screen.getByText('parent')).toBeDefined();
  });
});
