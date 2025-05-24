'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/auth.store';
import { useTripStore } from '../../store/trip.store';
import DashboardLayout from '../../components/DashboardLayout';
import { SectionErrorBoundary } from '../../components/SectionErrorBoundary';
import { 
  CalendarIcon, 
  TruckIcon as CarIcon, 
  UserGroupIcon, 
  CurrencyDollarIcon 
} from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { stats, loading: statsLoading, fetchTripStats } = useTripStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchTripStats();
    }
  }, [isAuthenticated, fetchTripStats]);

  if (!isAuthenticated || !user) {
    return null; // DashboardLayout will handle redirect
  }

  const quickActions = [
    {
      name: 'Create Trip',
      description: 'Create a new carpool trip',
      icon: CarIcon,
      color: 'bg-blue-500',
      action: () => router.push('/trips/create')
    },
    {
      name: 'View Trips',
      description: 'See all your trips',
      icon: CalendarIcon,
      color: 'bg-green-500',
      action: () => router.push('/trips')
    },
    {
      name: 'Find Rides',
      description: 'Find available rides',
      icon: UserGroupIcon,
      color: 'bg-purple-500',
      action: () => router.push('/trips?tab=available')
    }
  ];

  const statCards = [
    {
      name: 'Total Trips',
      value: statsLoading ? '...' : stats?.totalTrips || 0,
      icon: CalendarIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      name: 'As Driver',
      value: statsLoading ? '...' : stats?.tripsAsDriver || 0,
      icon: CarIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      name: 'As Passenger',
      value: statsLoading ? '...' : stats?.tripsAsPassenger || 0,
      icon: UserGroupIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      name: 'Cost Savings',
      value: statsLoading ? '...' : `$${stats?.costSavings?.toFixed(2) || '0.00'}`,
      icon: CurrencyDollarIcon,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user.firstName}!
          </h1>
          <p className="text-gray-600">
            Here's what's happening with your carpool activities.
          </p>
        </div>

        {/* Stats Grid */}
        <SectionErrorBoundary sectionName="Stats Overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.name} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center">
                    <div className={`${stat.bgColor} rounded-lg p-3`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                      <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionErrorBoundary>

        {/* Quick Actions */}
        <SectionErrorBoundary sectionName="Quick Actions">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.name}
                    onClick={action.action}
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-sm transition-all duration-200 text-left"
                  >
                    <div className={`${action.color} rounded-lg p-3 text-white`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-900">{action.name}</h3>
                      <p className="text-sm text-gray-500">{action.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </SectionErrorBoundary>

        {/* Upcoming Trips */}
        <SectionErrorBoundary sectionName="Upcoming Trips">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            {/* ...existing upcoming trips code... */}
          </div>
        </SectionErrorBoundary>
      </div>
    </DashboardLayout>
  );
}
