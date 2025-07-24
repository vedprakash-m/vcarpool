import { renderHook, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useProtectedRoute } from '../../hooks/useProtectedRoute';
import { useRBAC } from '../../contexts/RBACContext';
import { useAuthStore } from '../../store/auth.store';
import { UserRole } from '../../types/shared';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../../contexts/RBACContext', () => ({
  useRBAC: jest.fn(),
}));

jest.mock('../../store/auth.store', () => ({
  useAuthStore: jest.fn(),
}));

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseRBAC = useRBAC as jest.MockedFunction<typeof useRBAC>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<
  typeof useAuthStore
>;

describe('useProtectedRoute', () => {
  const mockPush = jest.fn();
  const mockHasRole = jest.fn();
  const mockHasPermission = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    });

    mockUseRBAC.mockReturnValue({
      hasRole: mockHasRole,
      hasPermission: mockHasPermission,
    });
  });

  it('should redirect to login when not authenticated', async () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
    });

    renderHook(() => useProtectedRoute());

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('should redirect to unauthorized when authenticated but missing required role', async () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
    });

    mockHasRole.mockReturnValue(false);

    renderHook(() =>
      useProtectedRoute({
        requiredRole: 'admin',
      })
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/unauthorized');
    });
  });

  it('should redirect to custom path when missing required role', async () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
    });

    mockHasRole.mockReturnValue(false);

    renderHook(() =>
      useProtectedRoute({
        requiredRole: 'admin',
        redirectTo: '/access-denied',
      })
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/access-denied');
    });
  });

  it('should redirect when missing required permission', async () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
    });

    mockHasRole.mockReturnValue(true);
    mockHasPermission.mockReturnValue(false);

    renderHook(() =>
      useProtectedRoute({
        requiredRole: 'admin',
        requiredPermission: 'manageUsers',
      })
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/unauthorized');
    });
  });

  it('should not redirect when all requirements are met', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
    });

    mockHasRole.mockReturnValue(true);
    mockHasPermission.mockReturnValue(true);

    const { result } = renderHook(() =>
      useProtectedRoute({
        requiredRole: 'admin',
        requiredPermission: 'manageUsers',
      })
    );

    expect(mockPush).not.toHaveBeenCalled();
    expect(result.current.isAuthorized).toBe(true);
  });

  it('should return correct authorization status for authenticated user without role requirements', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
    });

    const { result } = renderHook(() => useProtectedRoute());

    expect(result.current.isAuthorized).toBe(true);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should return false authorization status when not authenticated', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
    });

    const { result } = renderHook(() => useProtectedRoute());

    expect(result.current.isAuthorized).toBe(false);
  });

  it('should return false authorization status when missing role', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
    });

    mockHasRole.mockReturnValue(false);

    const { result } = renderHook(() =>
      useProtectedRoute({
        requiredRole: 'admin',
      })
    );

    expect(result.current.isAuthorized).toBe(false);
  });

  it('should return false authorization status when missing permission', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
    });

    mockHasRole.mockReturnValue(true);
    mockHasPermission.mockReturnValue(false);

    const { result } = renderHook(() =>
      useProtectedRoute({
        requiredRole: 'admin',
        requiredPermission: 'manageUsers',
      })
    );

    expect(result.current.isAuthorized).toBe(false);
  });

  it('should check hasRole with correct role parameter', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
    });

    mockHasRole.mockReturnValue(true);

    renderHook(() =>
      useProtectedRoute({
        requiredRole: 'parent',
      })
    );

    expect(mockHasRole).toHaveBeenCalledWith('parent');
  });

  it('should check hasPermission with correct permission parameter', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
    });

    mockHasRole.mockReturnValue(true);
    mockHasPermission.mockReturnValue(true);

    renderHook(() =>
      useProtectedRoute({
        requiredRole: 'admin',
        requiredPermission: 'viewReports',
      })
    );

    expect(mockHasPermission).toHaveBeenCalledWith('viewReports');
  });
});
