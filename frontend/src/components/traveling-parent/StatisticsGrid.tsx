import { Users, CheckCircle, Clock, Calendar } from 'lucide-react';

interface StatisticsGridProps {
  statistics: {
    totalTripsMissed: number;
    totalMakeupTripsCompleted: number;
    pendingMakeupTrips: number;
    upcomingMakeupTrips: number;
  };
}

export function StatisticsGrid({ statistics }: StatisticsGridProps) {
  const stats = [
    {
      name: 'Trips Missed',
      value: statistics.totalTripsMissed,
      icon: Calendar,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      name: 'Makeup Trips Completed',
      value: statistics.totalMakeupTripsCompleted,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      name: 'Pending Makeups',
      value: statistics.pendingMakeupTrips,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      name: 'Upcoming Makeups',
      value: statistics.upcomingMakeupTrips,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map(stat => (
        <div
          key={stat.name}
          className="bg-white overflow-hidden shadow rounded-lg"
        >
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className={`flex-shrink-0 p-3 rounded-md ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 truncate">
                  {stat.name}
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
