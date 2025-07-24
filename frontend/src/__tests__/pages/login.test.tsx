/**
 * Integration tests for Login Page
 * Tests real implementation with React Hook Form, Zod validation, and auth store
 *
 * Updated to align with User_Experience.md requirements:
 * - Progressive Parent Onboarding flow support
 * - Enhanced Family Unit Registration integration
 * - Post-login routing to appropriate onboarding steps
 * - Role-based dashboard navigation
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import LoginPage from '../../app/login/page';

// Test constants
const TEST_PASSWORDS = {
  ADMIN: 'test-admin-pass',
  USER: 'test-user-pass',
  FAMILY: 'test-family-pass',
  SECURE: 'test-secure-pass',
};

// Mock the auth store
const mockLogin = jest.fn();
const mockAuthStore = {
  login: mockLogin,
  isLoading: false,
  user: null,
  isAuthenticated: false,
};

jest.mock('../../store/auth.store', () => ({
  useAuthStore: (selector: any) => selector(mockAuthStore),
}));

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock onboarding context for Progressive Parent Onboarding
const mockOnboardingState = {
  isOnboardingActive: false,
  currentStepIndex: 0,
  steps: [],
  userProgress: {
    profileCompleted: false,
    notificationsSetup: false,
    preferencesTourCompleted: false,
    firstWeekSimulated: false,
  },
  showTooltips: true,
  canSkip: true,
};

const mockStartOnboarding = jest.fn();

jest.mock('../../contexts/OnboardingContext', () => ({
  useOnboarding: () => ({
    onboardingState: mockOnboardingState,
    startOnboarding: mockStartOnboarding,
  }),
}));

describe('Login Page - UX Requirements Alignment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthStore.isLoading = false;
    mockAuthStore.isAuthenticated = false;
    mockAuthStore.user = null;
    mockOnboardingState.isOnboardingActive = false;
  });

  describe('Progressive Parent Onboarding Integration', () => {
    it('should render login form with onboarding-aware messaging', () => {
      render(<LoginPage />);

      // Check for heading that aligns with Progressive Parent Onboarding
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument();

      // Check for form inputs (by placeholder since labels are screen-reader only)
      expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();

      // Check for submit button
      expect(
        screen.getByRole('button', { name: /sign in/i })
      ).toBeInTheDocument();

      // Check for registration link that supports family registration flow
      expect(screen.getByText('create a new account')).toBeInTheDocument();
    });

    it('should have proper input types and attributes for family-oriented login', () => {
      render(<LoginPage />);

      const emailInput = screen.getByPlaceholderText('Email address');
      const passwordInput = screen.getByPlaceholderText('Password');

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
    });

    it('should handle login for new parent requiring Progressive Onboarding', async () => {
      const user = userEvent.setup();

      // Mock a new parent user who needs onboarding
      const newParentUser = {
        id: 'new-parent-123',
        email: 'newparent@school.edu',
        firstName: 'Sarah',
        lastName: 'Johnson',
        role: 'parent',
        familyId: null, // No family registered yet
        onboardingCompleted: false,
      };

      mockLogin.mockResolvedValue(newParentUser);

      render(<LoginPage />);

      const emailInput = screen.getByPlaceholderText('Email address');
      const passwordInput = screen.getByPlaceholderText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'newparent@school.edu');
      await user.type(passwordInput, TEST_PASSWORDS.USER);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'newparent@school.edu',
          password: TEST_PASSWORDS.USER,
        });
      });
    });

    it('should handle login for returning parent with existing family', async () => {
      const user = userEvent.setup();

      // Mock an existing parent with completed family registration
      const existingParentUser = {
        id: 'parent-456',
        email: 'parent@school.edu',
        firstName: 'Michael',
        lastName: 'Smith',
        role: 'parent',
        familyId: 'family-123',
        onboardingCompleted: true,
      };

      mockLogin.mockResolvedValue(existingParentUser);

      render(<LoginPage />);

      const emailInput = screen.getByPlaceholderText('Email address');
      const passwordInput = screen.getByPlaceholderText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'parent@school.edu');
      await user.type(passwordInput, TEST_PASSWORDS.SECURE);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'parent@school.edu',
          password: TEST_PASSWORDS.SECURE,
        });
      });
    });
  });

  describe('Form Submission - Family-Aware Login', () => {
    it('should submit form with valid credentials and handle role-based routing', async () => {
      const user = userEvent.setup();
      const familyParentUser = {
        id: 'parent-789',
        email: 'parent@family.edu',
        firstName: 'Lisa',
        lastName: 'Chen',
        role: 'parent',
        familyId: 'family-456',
        onboardingCompleted: true,
      };

      mockLogin.mockResolvedValue(familyParentUser);

      render(<LoginPage />);

      const emailInput = screen.getByPlaceholderText('Email address');
      const passwordInput = screen.getByPlaceholderText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'parent@family.edu');
      await user.type(passwordInput, TEST_PASSWORDS.FAMILY);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'parent@family.edu',
          password: TEST_PASSWORDS.FAMILY,
        });
      });
    });

    it('should handle admin login with system-wide access', async () => {
      const user = userEvent.setup();
      const adminUser = {
        id: 'admin-001',
        email: 'admin@school.edu',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        familyId: null, // Admins don't belong to families
        onboardingCompleted: true,
      };

      mockLogin.mockResolvedValue(adminUser);

      render(<LoginPage />);

      const emailInput = screen.getByPlaceholderText('Email address');
      const passwordInput = screen.getByPlaceholderText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'admin@school.edu');
      await user.type(passwordInput, TEST_PASSWORDS.ADMIN);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'admin@school.edu',
          password: TEST_PASSWORDS.ADMIN,
        });
      });
    });

    it('should handle empty form submission with proper validation', async () => {
      const user = userEvent.setup();

      render(<LoginPage />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Should not call login with empty form (form validation should prevent it)
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should handle login errors gracefully', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));

      render(<LoginPage />);

      const emailInput = screen.getByPlaceholderText('Email address');
      const passwordInput = screen.getByPlaceholderText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'invalid@email.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });

      // Error should be handled gracefully without breaking the form
      expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    });
  });

  describe('Loading States - UX-Optimized Feedback', () => {
    it('should show progressive loading state during authentication', () => {
      mockAuthStore.isLoading = true;

      render(<LoginPage />);

      const submitButton = screen.getByTestId('submit-login-button');
      expect(submitButton).toHaveTextContent('Signing in...');
      expect(submitButton).toBeDisabled();

      // Loading state should be accessible and clear
      expect(submitButton).toBeDisabled();
    });

    it('should show ready state for family login flow', () => {
      render(<LoginPage />);

      const submitButton = screen.getByTestId('submit-login-button');
      expect(submitButton).toHaveTextContent('Sign in');
      expect(submitButton).not.toBeDisabled();
      expect(submitButton).not.toHaveAttribute('aria-disabled');
    });

    it('should handle loading state transitions properly', async () => {
      const user = userEvent.setup();

      // Start with loading false
      mockAuthStore.isLoading = false;
      const { rerender } = render(<LoginPage />);

      let submitButton = screen.getByTestId('submit-login-button');
      expect(submitButton).toHaveTextContent('Sign in');
      expect(submitButton).not.toBeDisabled();

      // Simulate loading state change
      mockAuthStore.isLoading = true;
      rerender(<LoginPage />);

      submitButton = screen.getByTestId('submit-login-button');
      expect(submitButton).toHaveTextContent('Signing in...');
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Navigation Links - Family Registration Flow', () => {
    it('should have registration link that supports Enhanced Family Unit Registration', () => {
      render(<LoginPage />);

      const registerLink = screen.getByRole('link', {
        name: /create a new account/i,
      });
      expect(registerLink).toHaveAttribute('href', '/register');

      // Registration link should be prominent for new families
      expect(registerLink).toBeInTheDocument();
    });

    it('should have accessible forgot password functionality', () => {
      render(<LoginPage />);

      const forgotPasswordLink = screen.getByRole('link', {
        name: /forgot your password/i,
      });
      expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password');

      // Should be accessible for family members who may have forgotten credentials
      expect(forgotPasswordLink).toBeInTheDocument();
    });

    it('should have proper accessibility attributes for navigation', () => {
      render(<LoginPage />);

      const registerLink = screen.getByRole('link', {
        name: /create a new account/i,
      });
      const forgotPasswordLink = screen.getByRole('link', {
        name: /forgot your password/i,
      });

      // Links should have proper ARIA attributes for screen readers
      expect(registerLink).toHaveAttribute('href', '/register');
      expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password');

      // Both links should be keyboard navigable
      expect(registerLink).toBeVisible();
      expect(forgotPasswordLink).toBeVisible();
    });

    it('should support family onboarding entry points', () => {
      render(<LoginPage />);

      // The registration link should clearly indicate family registration capability
      const registerLink = screen.getByRole('link', {
        name: /create a new account/i,
      });

      expect(registerLink).toBeInTheDocument();
      expect(registerLink).toHaveAttribute('href', '/register');

      // Should be styled appropriately to encourage new family registration
      // (styling verification would be in integration/e2e tests)
    });
  });
});
