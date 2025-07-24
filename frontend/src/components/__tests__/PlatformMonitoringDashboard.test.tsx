import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlatformMonitoringDashboard from '../admin/PlatformMonitoringDashboard';

// Mock the toast hook
const mockToast = jest.fn();
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('PlatformMonitoringDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockImplementation(key => {
      if (key === 'token') return 'mock-token';
      if (key === 'userId') return 'mock-user-id';
      return null;
    });
  });

  const mockPlatformData = {
    metrics: {
      totalUsers: 150,
      activeUsers: 120,
      totalGroups: 25,
      activeGroups: 20,
      totalTrips: 500,
      successfulTrips: 485,
      userGrowthRate: 15.5,
      groupGrowthRate: 8.2,
      avgResponseTime: 125,
      uptime: 99.8,
      errorRate: 0.3,
    },
    systemHealth: {
      status: 'healthy',
      database: {
        status: 'connected',
        responseTime: 45,
        connections: 8,
      },
      api: {
        status: 'healthy',
        avgResponseTime: 120,
        errorRate: 0.2,
      },
      notifications: {
        status: 'operational',
        queueSize: 15,
        failureRate: 0.1,
      },
    },
    userActivity: [
      {
        period: '2024-01-15',
        newUsers: 5,
        activeUsers: 120,
        retainedUsers: 110,
        churnRate: 2.5,
      },
    ],
    alerts: [
      {
        id: 'alert-1',
        type: 'warning',
        title: 'High Response Time',
        message: 'API response time is above normal threshold',
        timestamp: '2024-01-15T10:30:00Z',
        resolved: false,
      },
      {
        id: 'alert-2',
        type: 'info',
        title: 'Scheduled Maintenance',
        message: 'System maintenance completed successfully',
        timestamp: '2024-01-15T09:00:00Z',
        resolved: true,
      },
    ],
  };

  it('renders loading state initially', () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<PlatformMonitoringDashboard />);

    // Check for the presence of loading skeleton elements
    const loadingElements = document.querySelectorAll('.animate-pulse');
    expect(loadingElements).toHaveLength(8);

    // Should not show content yet
    expect(screen.queryByText('Platform Monitoring')).not.toBeInTheDocument();
  });

  it('loads and displays platform metrics', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlatformData.metrics,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlatformData.systemHealth,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activity: mockPlatformData.userActivity }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ alerts: mockPlatformData.alerts }),
      });

    render(<PlatformMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument(); // Total users
      expect(screen.getByText('120')).toBeInTheDocument(); // Active users
      expect(screen.getByText('97.0%')).toBeInTheDocument(); // Trip success rate
      expect(screen.getByText('125ms')).toBeInTheDocument(); // Response time
    });
  });

  it('displays system health status', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlatformData.metrics,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlatformData.systemHealth,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activity: mockPlatformData.userActivity }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ alerts: mockPlatformData.alerts }),
      });

    render(<PlatformMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Database')).toBeInTheDocument();
      expect(screen.getByText('API')).toBeInTheDocument();
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('connected')).toBeInTheDocument();
      expect(screen.getByText('healthy')).toBeInTheDocument();
      expect(screen.getByText('operational')).toBeInTheDocument();
    });
  });

  it('shows alerts with correct types', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlatformData.metrics,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlatformData.systemHealth,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activity: mockPlatformData.userActivity }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ alerts: mockPlatformData.alerts }),
      });

    render(<PlatformMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText('High Response Time')).toBeInTheDocument();
      expect(screen.getByText('Scheduled Maintenance')).toBeInTheDocument();
      expect(screen.getByText('Resolved')).toBeInTheDocument();
    });
  });

  it('resolves alerts when resolve button is clicked', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlatformData.metrics,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlatformData.systemHealth,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activity: mockPlatformData.userActivity }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ alerts: mockPlatformData.alerts }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

    render(<PlatformMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Resolve')).toBeInTheDocument();
    });

    const resolveButton = screen.getByText('Resolve');
    fireEvent.click(resolveButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Alert Resolved',
        description: 'Alert has been marked as resolved',
      });
    });
  });

  it('changes timeframe when dropdown is changed', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlatformData.metrics,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlatformData.systemHealth,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activity: mockPlatformData.userActivity }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ alerts: mockPlatformData.alerts }),
      })
      // Second set of calls after timeframe change
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlatformData.metrics,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlatformData.systemHealth,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activity: mockPlatformData.userActivity }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ alerts: mockPlatformData.alerts }),
      });

    render(<PlatformMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Last 7 Days')).toBeInTheDocument();
    });

    const timeframeSelect = screen.getByDisplayValue('Last 7 Days');
    fireEvent.change(timeframeSelect, { target: { value: '30d' } });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('timeframe=30d'),
        expect.any(Object)
      );
    });
  });

  it('refreshes data when refresh button is clicked', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlatformData.metrics,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlatformData.systemHealth,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activity: mockPlatformData.userActivity }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ alerts: mockPlatformData.alerts }),
      })
      // Second set of calls after refresh
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlatformData.metrics,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlatformData.systemHealth,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activity: mockPlatformData.userActivity }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ alerts: mockPlatformData.alerts }),
      });

    render(<PlatformMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    expect(fetch).toHaveBeenCalledTimes(8); // 4 initial + 4 refresh calls
  });

  it('handles API errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<PlatformMonitoringDashboard />);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to load platform monitoring data',
        variant: 'destructive',
      });
    });
  });

  it('shows no alerts message when there are no alerts', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlatformData.metrics,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlatformData.systemHealth,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activity: mockPlatformData.userActivity }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ alerts: [] }),
      });

    render(<PlatformMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText('No recent alerts')).toBeInTheDocument();
    });
  });

  it('displays growth rates with correct indicators', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlatformData.metrics,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlatformData.systemHealth,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activity: mockPlatformData.userActivity }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ alerts: mockPlatformData.alerts }),
      });

    render(<PlatformMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText('+15.5% growth')).toBeInTheDocument();
      expect(screen.getByText('+8.2% growth')).toBeInTheDocument();
    });
  });
});
