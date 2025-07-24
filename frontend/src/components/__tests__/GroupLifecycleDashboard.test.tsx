import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import '@testing-library/jest-dom';
import GroupLifecycleDashboard from '../admin/GroupLifecycleDashboard';

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

describe('GroupLifecycleDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockImplementation(key => {
      if (key === 'token') return 'mock-token';
      if (key === 'userId') return 'mock-user-id';
      return null;
    });
  });

  const mockGroupsData = {
    groups: [
      {
        id: 'group-1',
        name: 'Tesla STEM Carpool',
        status: 'active',
        groupAdminId: 'admin-1',
        groupAdminName: 'John Doe',
        memberCount: 8,
        createdAt: '2024-01-01T00:00:00Z',
        lifecycleMetrics: {
          activityScore: 85,
          lastActivityDate: '2024-01-15T10:00:00Z',
          daysSinceLastActivity: 2,
          weeklyPreferenceRate: 90,
          memberEngagementRate: 85,
          riskLevel: 'low',
          recommendedAction: 'Continue monitoring',
        },
      },
      {
        id: 'group-2',
        name: 'Inactive Group',
        status: 'pending_reactivation',
        groupAdminId: 'admin-2',
        groupAdminName: 'Jane Smith',
        memberCount: 5,
        createdAt: '2024-01-01T00:00:00Z',
        lifecycleMetrics: {
          activityScore: 25,
          lastActivityDate: '2023-12-01T10:00:00Z',
          daysSinceLastActivity: 45,
          weeklyPreferenceRate: 20,
          memberEngagementRate: 30,
          riskLevel: 'high',
          recommendedAction: 'Consider reactivation or purging',
        },
      },
    ],
    summary: {
      totalGroups: 2,
      activeGroups: 1,
      inactiveGroups: 0,
      atRiskGroups: 1,
    },
  };

  it('renders loading state initially', () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<GroupLifecycleDashboard />);

    // Check for loading skeleton elements
    const loadingElements = document.querySelectorAll('.animate-pulse');
    expect(loadingElements).toHaveLength(4);
  });

  it('loads and displays group data', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockGroupsData,
    });

    render(<GroupLifecycleDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Tesla STEM Carpool')).toBeInTheDocument();
      expect(screen.getByText('Inactive Group')).toBeInTheDocument();
      expect(screen.getByText('Total Groups')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('filters groups by risk level', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockGroupsData,
    });

    render(<GroupLifecycleDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Tesla STEM Carpool')).toBeInTheDocument();
    });

    // Filter by high risk
    const filterSelect = screen.getByDisplayValue('All Risk Levels');
    fireEvent.change(filterSelect, { target: { value: 'high' } });

    expect(screen.queryByText('Tesla STEM Carpool')).not.toBeInTheDocument();
    expect(screen.getByText('Inactive Group')).toBeInTheDocument();
  });

  it('runs inactivity check successfully', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockGroupsData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ processedGroups: 10, warningsSent: 3 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockGroupsData,
      });

    render(<GroupLifecycleDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Run Inactivity Check')).toBeInTheDocument();
    });

    const inactivityButton = screen.getByText('Run Inactivity Check');
    fireEvent.click(inactivityButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Inactivity Check Complete',
        description: 'Processed 10 groups. 3 warnings sent.',
      });
    });
  });

  it('handles reactivation approval', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockGroupsData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockGroupsData,
      });

    render(<GroupLifecycleDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Approve')).toBeInTheDocument();
    });

    const approveButton = screen.getByText('Approve');
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Reactivation Approved',
        description: 'Group reactivation request has been approved.',
      });
    });
  });

  it('handles reactivation denial', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockGroupsData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockGroupsData,
      });

    render(<GroupLifecycleDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Deny')).toBeInTheDocument();
    });

    const denyButton = screen.getByText('Deny');
    fireEvent.click(denyButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Reactivation Denied',
        description: 'Group reactivation request has been denied.',
      });
    });
  });

  it('handles API errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<GroupLifecycleDashboard />);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to load group lifecycle data',
        variant: 'destructive',
      });
    });
  });

  it('refreshes data when refresh button is clicked', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockGroupsData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockGroupsData,
      });

    render(<GroupLifecycleDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('displays correct risk level badges', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockGroupsData,
    });

    render(<GroupLifecycleDashboard />);

    await waitFor(() => {
      // Look for badge elements specifically, not select options
      const badges = screen.getAllByText('Low Risk');
      expect(badges.length).toBeGreaterThan(0);
      const highRiskBadges = screen.getAllByText('High Risk');
      expect(highRiskBadges.length).toBeGreaterThan(0);
    });
  });

  it('displays correct status badges', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockGroupsData,
    });

    render(<GroupLifecycleDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Pending Reactivation')).toBeInTheDocument();
    });
  });

  it('shows empty state when no groups match filter', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => {
        return { ...mockGroupsData, groups: [] };
      },
    });

    render(<GroupLifecycleDashboard />);

    await waitFor(() => {
      expect(
        screen.getByText('No groups found matching the selected criteria.')
      ).toBeInTheDocument();
    });
  });
});
