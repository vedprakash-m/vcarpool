'use client';

import { useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/auth.store';
import { useTripStore } from '../../store/trip.store';
import DashboardLayout from '../../components/DashboardLayout';
import { SectionErrorBoundary } from '../../components/SectionErrorBoundary';
import { 
  PerformanceErrorBoundary, 
  withPerformanceMonitoring,
  createMemoizedComponent,
  VirtualizedList 
} from '../../components/OptimizedComponents';
import { 
  CalendarIcon, 
  TruckIcon as CarIcon, 
  UserGroupIcon, 
  CurrencyDollarIcon,
  ClockIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

// Memoized components for better performance
const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  trend 
}: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  trend?: { value: number; isPositive: boolean };
}) => (
  <div className="bg-white overflow-hidden shadow rounded-lg">
    <div className="p-5">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={`${color} rounded-md p-3`}>
            <Icon className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="flex items-baseline">
              <div className="text-2xl font-semibold text-gray-900">{value}</div>
              {trend && (
                <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </div>
              )}
            </dd>
          </dl>
        </div>
      </div>
    </div>
  </div>
);

const MemoizedStatCard = createMemoizedComponent(StatCard);

const QuickActionCard = ({ 
  action 
}: { 
  action: any 
}) => (
  <button
    onClick={action.action}
    className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg shadow hover:shadow-md transition-shadow duration-200"
  >
    <div>
      <span className={`${action.color} rounded-lg inline-flex p-3 ring-4 ring-white`}>
        <action.icon className="h-6 w-6 text-white" aria-hidden="true" />
      </span>
    </div>
    <div className="mt-4">
      <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600">
        {action.name}
      </h3>
      <p className="mt-2 text-sm text-gray-500">
        {action.description}
      </p>
    </div>
  </button>
);

const MemoizedQuickActionCard = createMemoizedComponent(QuickActionCard);

const RecentTripCard = ({ 
  trip 
}: { 
  trip: any 
}) => (
  <div className="bg-white px-4 py-4 border border-gray-200 rounded-lg">
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <MapPinIcon className="h-5 w-5 text-gray-400 mr-2" />
        <div>
          <p className="text-sm font-medium text-gray-900">{trip.destination}</p>
          <p className="text-sm text-gray-500">
            {new Date(trip.departureTime).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="flex items-center">
        <UserGroupIcon className="h-4 w-4 text-gray-400 mr-1" />
        <span className="text-sm text-gray-600">
          {trip.passengers?.length || 0}/{trip.availableSeats}
        </span>
      </div>
    </div>
  </div>
);

const MemoizedRecentTripCard = createMemoizedComponent(RecentTripCard);

// Loading components
const StatCardSkeleton = () => (
  <div className="bg-white overflow-hidden shadow rounded-lg animate-pulse">
    <div className="p-5">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="bg-gray-300 rounded-md p-3 w-12 h-12"></div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-gray-300 rounded w-1/2"></div>
        </div>
      </div>
    </div>
  </div>
);

function DashboardPage() {
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

// Wrap with performance monitoring and error boundary
const EnhancedDashboardPage = withPerformanceMonitoring(() => {
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

  // ...existing implementation...
}, 'DashboardPage');

export default function DashboardPageWithErrorBoundary() {
  return (
    <PerformanceErrorBoundary>
      <EnhancedDashboardPage />
    </PerformanceErrorBoundary>
  );
}
