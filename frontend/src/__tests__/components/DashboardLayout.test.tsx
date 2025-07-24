import { render, screen, waitFor } from '@testing-library/react';
import { useRouter, usePathname } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuthStore } from '@/store/auth.store';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock auth store
jest.mock('@/store/auth.store', () => ({
  useAuthStore: jest.fn(),
}));

// Mock Navigation component
jest.mock('../../components/Navigation', () => {
  return function MockNavigation() {
    return <nav data-testid="navigation">Navigation</nav>;
  };
});

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<
  typeof useAuthStore
>;

describe('DashboardLayout', () => {
  const mockPush = jest.fn();

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
  });

  it('should show loading spinner when authentication is loading', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      loading: false,
    });

    render(
      <DashboardLayout>
        <div>Dashboard Content</div>
      </DashboardLayout>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
  });

  it('should show loading spinner when loading state is true', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      loading: true,
    });

    render(
      <DashboardLayout>
        <div>Dashboard Content</div>
      </DashboardLayout>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
  });

  it('should render children without navigation on public paths', () => {
    mockUsePathname.mockReturnValue('/login');
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      loading: false,
    });

    render(
      <DashboardLayout>
        <div>Login Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText('Login Content')).toBeInTheDocument();
    expect(screen.queryByTestId('navigation')).not.toBeInTheDocument();
  });

  it('should redirect to login if not authenticated on protected path', async () => {
    mockUsePathname.mockReturnValue('/dashboard');
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      loading: false,
    });

    render(
      <DashboardLayout>
        <div>Dashboard Content</div>
      </DashboardLayout>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('should render navigation and children when authenticated', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      loading: false,
    });

    render(
      <DashboardLayout>
        <div>Dashboard Content</div>
      </DashboardLayout>
    );

    expect(screen.getByTestId('navigation')).toBeInTheDocument();
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });

  it('should not redirect on trips page in development mode when not authenticated', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    mockUsePathname.mockReturnValue('/trips');
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      loading: false,
    });

    render(
      <DashboardLayout>
        <div>Trips Content</div>
      </DashboardLayout>
    );

    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByText('Trips Content')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should handle all public paths correctly', () => {
    const publicPaths = ['/', '/login', '/register'];

    publicPaths.forEach(path => {
      mockUsePathname.mockReturnValue(path);
      mockUseAuthStore.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        loading: false,
      });

      const { unmount } = render(
        <DashboardLayout>
          <div>Public Content</div>
        </DashboardLayout>
      );

      expect(screen.getByText('Public Content')).toBeInTheDocument();
      expect(screen.queryByTestId('navigation')).not.toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();

      unmount();
    });
  });

  it('should not redirect when on public path even if not authenticated', () => {
    mockUsePathname.mockReturnValue('/');
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      loading: false,
    });

    render(
      <DashboardLayout>
        <div>Home Content</div>
      </DashboardLayout>
    );

    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByText('Home Content')).toBeInTheDocument();
  });
});
