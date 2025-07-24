'use client';

import { useEffect, memo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { SectionErrorBoundary } from '@/components/SectionErrorBoundary';
import { useAuthStore } from '@/store/auth.store';
import { useTripStore } from '@/store/trip.store';
import {
  useRenderPerformance,
  useThrottle,
} from '@/hooks/usePerformanceOptimization';
import {
  CalendarIcon,
  TruckIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ClockIcon,
  MapPinIcon,
  AcademicCapIcon,
  HomeIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

export default memo(function DashboardPage() {
  useRenderPerformance('DashboardPage');

  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { stats, loading, fetchTripStats } = useTripStore();

  // Throttled navigation functions to prevent rapid clicks

  useEffect(() => {
    if (
      isAuthenticated &&
      user &&
      fetchTripStats &&
      typeof fetchTripStats === 'function'
    ) {
      const result = fetchTripStats();
      if (result && typeof result.catch === 'function') {
        result.catch(console.error);
      }
    }
  }, [isAuthenticated, user, fetchTripStats]);

  // Define hooks before any conditional logic
  const handleWeeklyPreferences = useThrottle(
    useCallback(() => {
      router.push('/parents/preferences');
    }, [router]),
    1000
  );

  const handleManageChildren = useThrottle(
    useCallback(() => {
      router.push('/family/children');
    }, [router]),
    1000
  );

  // Don't render if not authenticated or user is missing
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <AcademicCapIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Good morning, {user.firstName}! 👋
              </h1>
              {stats && (stats.weeklySchoolTrips || 0) > 0 ? (
                <p className="text-gray-600 mt-1">
                  You have {stats.weeklySchoolTrips} school runs scheduled this
                  week
                </p>
              ) : (
                <p className="text-gray-600 mt-1">
                  Ready to start your carpool journey? Discover groups in your
                  area or create your own.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Conditional Statistics Display */}
        <SectionErrorBoundary sectionName="User Statistics">
          {stats && (stats.weeklySchoolTrips || 0) > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <CalendarIcon className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      This Week's School Runs
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '...' : stats?.weeklySchoolTrips || 0}
                    </p>
                    <p className="text-sm text-gray-500">
                      Morning + afternoon trips
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <UserGroupIcon className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Children in Carpool
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '...' : stats?.childrenCount || 0}
                    </p>
                    <p className="text-sm text-gray-500">
                      Active student profiles
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <MapPinIcon className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Miles Saved
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '...' : `${stats?.milesSaved || 0} miles`}
                    </p>
                    <p className="text-sm text-gray-500">through carpooling</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <ClockIcon className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Time Saved This Month
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '...' : `${stats?.timeSavedHours || 0}h`}
                    </p>
                    <p className="text-sm text-gray-500">
                      from coordinated pickups
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <ChartBarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Activity Yet
              </h3>
              <p className="text-gray-600">
                Join a carpool group to start tracking your transportation
                statistics.
              </p>
            </div>
          )}
        </SectionErrorBoundary>

        {/* Dynamic Content Based on User Engagement */}
        <SectionErrorBoundary sectionName="Dashboard Content">
          {stats && (stats.weeklySchoolTrips || 0) > 0 ? (
            // User has active carpool participation - show group-based actions
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Your Carpool Actions
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <button
                    onClick={handleWeeklyPreferences}
                    className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
                  >
                    <CalendarIcon className="h-8 w-8 text-purple-600 mb-2" />
                    <span className="font-medium text-gray-900">
                      Weekly Preferences
                    </span>
                    <span className="text-sm text-gray-500 text-center mt-1">
                      Submit your weekly driving preferences
                    </span>
                  </button>

                  <button
                    onClick={handleManageChildren}
                    className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-colors"
                  >
                    <AcademicCapIcon className="h-8 w-8 text-yellow-600 mb-2" />
                    <span className="font-medium text-gray-900">
                      Manage Children
                    </span>
                    <span className="text-sm text-gray-500 text-center mt-1">
                      Add or edit student profiles
                    </span>
                  </button>

                  <button
                    onClick={() => router.push('/parents/groups')}
                    className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <UserGroupIcon className="h-8 w-8 text-blue-600 mb-2" />
                    <span className="font-medium text-gray-900">
                      Manage Groups
                    </span>
                    <span className="text-sm text-gray-500 text-center mt-1">
                      View and manage your carpool groups
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // User hasn't joined groups - show onboarding
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-8 text-center">
              <UserGroupIcon className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome to Carpool! 🚗
              </h2>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Get started by discovering carpool groups in your area or
                creating your own. Join a community of families making school
                transportation easier, safer, and more sustainable.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                <div className="bg-white rounded-lg p-6 shadow-sm border">
                  <MagnifyingGlassIcon className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Find Carpool Groups
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Search for existing carpool groups near your school and
                    neighborhood.
                  </p>
                  <button
                    onClick={() => router.push('/parents/discover')}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Discover Groups
                  </button>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-sm border">
                  <PlusIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Start Your Own Group
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Be the first to organize carpooling for your school and
                    become a Group Admin.
                  </p>
                  <button
                    onClick={() => router.push('/parents/groups/create')}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Group
                  </button>
                </div>
              </div>

              <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
                <div className="flex items-center justify-center">
                  <InformationCircleIcon className="h-5 w-5 text-yellow-600 mr-2" />
                  <span className="text-sm text-yellow-800">
                    <strong>Next Steps:</strong> Complete your profile setup,
                    verify your address, and add your children's information to
                    get personalized group recommendations.
                  </span>
                </div>
              </div>
            </div>
          )}
        </SectionErrorBoundary>

        {/* Conditional Schedule Display */}
        <SectionErrorBoundary sectionName="Schedule Overview">
          {stats && (stats.weeklySchoolTrips || 0) > 0 ? (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Schedule Overview
                </h2>
              </div>
              <div className="p-6">
                <div className="text-center py-8">
                  <CalendarIcon className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    View Your Schedule
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Check your upcoming carpool assignments and manage your
                    weekly schedule.
                  </p>
                  <button
                    onClick={() => router.push('/parents/schedule')}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Full Schedule
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 rounded-lg p-6 text-center">
              <CalendarIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Scheduled Trips
              </h3>
              <p className="text-gray-600">
                Join a carpool group to start coordinating school
                transportation.
              </p>
            </div>
          )}
        </SectionErrorBoundary>

        {/* Family Efficiency Metrics */}
        <SectionErrorBoundary sectionName="Family Efficiency Metrics">
          {stats && (stats.weeklySchoolTrips || 0) > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* This Week's Impact */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center">
                    <ChartBarIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <h3 className="text-lg font-medium text-gray-900">
                      This Week's Impact
                    </h3>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {stats?.weeklySchoolTrips || 0}
                      </p>
                      <p className="text-sm text-gray-600">Trips coordinated</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {stats?.milesSaved || 0} miles
                      </p>
                      <p className="text-sm text-gray-600">Miles shared</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {Math.round((stats?.milesSaved || 0) * 0.89)} lbs
                      </p>
                      <p className="text-sm text-gray-600">CO2 saved</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {stats?.timeSavedHours || 0} hrs
                      </p>
                      <p className="text-sm text-gray-600">Time saved</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Community Connection */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center">
                    <UserGroupIcon className="h-5 w-5 text-green-600 mr-2" />
                    <h3 className="text-lg font-medium text-gray-900">
                      Your Carpool Activity
                    </h3>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {stats?.totalTrips || 0}
                      </p>
                      <p className="text-sm text-gray-600">Total trips</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {stats?.childrenCount || 0}
                      </p>
                      <p className="text-sm text-gray-600">Children enrolled</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">
                        {stats?.upcomingTrips || 0}
                      </p>
                      <p className="text-sm text-gray-600">Upcoming trips</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-600">
                        {stats?.tripsAsDriver || 0}
                      </p>
                      <p className="text-sm text-gray-600">As driver</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <ChartBarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Track Your Impact
              </h3>
              <p className="text-gray-600 mb-4">
                Once you join a carpool group, you'll see your environmental
                impact, time savings, and community connections here.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold text-gray-400">0</p>
                  <p className="text-sm text-gray-500">Trips</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-400">0 miles</p>
                  <p className="text-sm text-gray-500">Saved</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-400">0 lbs</p>
                  <p className="text-sm text-gray-500">CO2 Reduced</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-400">0 hrs</p>
                  <p className="text-sm text-gray-500">Time Saved</p>
                </div>
              </div>
            </div>
          )}
        </SectionErrorBoundary>
      </div>
    </DashboardLayout>
  );
});
