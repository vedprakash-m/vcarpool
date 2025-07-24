import { useState, useEffect } from 'react';

export interface MakeupOption {
  id: string;
  proposedDate: string;
  proposedTime: string;
  makeupType: 'extra_week' | 'split_weeks' | 'weekend_trip';
  tripsToMakeup: number;
  status: 'proposed' | 'approved' | 'rejected' | 'completed';
  notes?: string;
  adminNotes?: string;
  createdAt: string;
}

export interface TravelingParentDashboardData {
  user: {
    id: string;
    role: string;
    makeupBalance: number;
  };
  group: {
    id: string;
    name: string;
  };
  travelSchedule: {
    hasUpcomingTravel: boolean;
    travelPeriods: Array<{
      startDate: string;
      endDate: string;
      reason: string;
      affectedTrips: number;
    }>;
  };
  makeupOptions: MakeupOption[];
  availableDates: Array<{
    date: string;
    dayOfWeek: string;
    available: boolean;
    conflictReason?: string;
  }>;
  statistics: {
    totalTripsMissed: number;
    totalMakeupTripsCompleted: number;
    pendingMakeupTrips: number;
    upcomingMakeupTrips: number;
  };
}

export interface MakeupProposal {
  proposedDate: string;
  proposedTime: string;
  makeupType: 'extra_week' | 'split_weeks' | 'weekend_trip';
  tripsToMakeup: number;
  notes: string;
}

export function useTravelingParentData() {
  const [dashboardData, setDashboardData] =
    useState<TravelingParentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/traveling-parent/dashboard');
      const data = await response.json();

      if (data.success) {
        setDashboardData(data.data);
      } else {
        setError(data.error || 'Failed to load dashboard');
      }
    } catch (err) {
      setError('Network error loading dashboard');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const submitMakeupProposal = async (proposal: MakeupProposal) => {
    try {
      const response = await fetch('/api/traveling-parent/makeup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          makeupProposal: {
            ...proposal,
            groupId: dashboardData?.group.id,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh dashboard data
        await fetchDashboardData();
        return { success: true };
      } else {
        return {
          success: false,
          error: data.error || 'Failed to submit proposal',
        };
      }
    } catch (err) {
      console.error('Proposal submission error:', err);
      return { success: false, error: 'Network error submitting proposal' };
    }
  };

  const deleteMakeupProposal = async (proposalId: string) => {
    try {
      const response = await fetch(
        `/api/traveling-parent/makeup/${proposalId}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (data.success) {
        await fetchDashboardData();
        return { success: true };
      } else {
        return {
          success: false,
          error: data.error || 'Failed to delete proposal',
        };
      }
    } catch (err) {
      console.error('Proposal deletion error:', err);
      return { success: false, error: 'Network error deleting proposal' };
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return {
    dashboardData,
    loading,
    error,
    submitMakeupProposal,
    deleteMakeupProposal,
    refetch: fetchDashboardData,
    setError,
  };
}
