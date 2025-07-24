'use client';

import { useTravelingParentData } from '@/hooks/useTravelingParentData';
import { ErrorState } from './traveling-parent/ErrorState';
import { LoadingState, NoGroupState } from './traveling-parent/LoadingState';
import { DashboardHeader } from './traveling-parent/DashboardHeader';
import { TravelScheduleCard } from './traveling-parent/TravelScheduleCard';
import { StatisticsGrid } from './traveling-parent/StatisticsGrid';
import { MakeupProposalForm } from './traveling-parent/MakeupProposalForm';
import { MakeupOptionsList } from './traveling-parent/MakeupOptionsList';

/**
 * TravelingParentMakeupDashboard - Container Component
 *
 * Refactored to follow container/presentational pattern for better maintainability.
 * This component handles state management and business logic while delegating
 * UI rendering to smaller, focused presentational components.
 *
 * Original file was 551 lines - now reduced to ~60 lines with better separation of concerns.
 */
export default function TravelingParentMakeupDashboard() {
  const {
    dashboardData,
    loading,
    error,
    submitMakeupProposal,
    deleteMakeupProposal,
    refetch,
    setError,
  } = useTravelingParentData();

  // Handle error state
  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={() => {
          setError(null);
          refetch();
        }}
      />
    );
  }

  // Handle loading state
  if (loading) {
    return <LoadingState />;
  }

  // Handle no group membership
  if (!dashboardData) {
    return <NoGroupState />;
  }

  // Main dashboard render
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        groupName={dashboardData.group.name}
        makeupBalance={dashboardData.user.makeupBalance}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Statistics Overview */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Overview
            </h2>
            <StatisticsGrid statistics={dashboardData.statistics} />
          </section>

          {/* Travel Schedule */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Travel Schedule
            </h2>
            <TravelScheduleCard
              hasUpcomingTravel={dashboardData.travelSchedule.hasUpcomingTravel}
              travelPeriods={dashboardData.travelSchedule.travelPeriods}
            />
          </section>

          {/* Makeup Management */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Makeup Trips
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <MakeupProposalForm
                  onSubmit={submitMakeupProposal}
                  availableDates={dashboardData.availableDates}
                />
              </div>
              <div>
                <MakeupOptionsList
                  makeupOptions={dashboardData.makeupOptions}
                  onDelete={deleteMakeupProposal}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
