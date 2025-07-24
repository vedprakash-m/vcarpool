'use client';

import { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/auth.store';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  UserIcon,
  MapPinIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';

interface CalendarAssignment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  routeType:
    | 'school_dropoff'
    | 'school_pickup'
    | 'multi_stop'
    | 'point_to_point';
  description: string;
  driverName?: string;
  driverPhone?: string;
  passengers?: string[];
  pickupLocation?: string;
  dropoffLocation?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

interface CalendarViewProps {
  className?: string;
  showCreateButton?: boolean;
  onDateClick?: (date: string) => void;
}

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const ROUTE_TYPE_COLORS = {
  school_dropoff: 'bg-blue-100 text-blue-800 border-blue-200',
  school_pickup: 'bg-green-100 text-green-800 border-green-200',
  multi_stop: 'bg-purple-100 text-purple-800 border-purple-200',
  point_to_point: 'bg-orange-100 text-orange-800 border-orange-200',
};

const STATUS_COLORS = {
  scheduled: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default memo(function CalendarView({
  className = '',
  showCreateButton = false,
  onDateClick,
}: CalendarViewProps) {
  const { user } = useAuthStore();
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [assignments, setAssignments] = useState<CalendarAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Memoized helper functions for performance
  const getWeekStart = useCallback((date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    return new Date(d.setDate(diff));
  }, []);

  // Memoized week dates calculation
  const weekDates = useMemo(() => {
    const start = getWeekStart(currentWeek);
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentWeek, getWeekStart]);

  // Memoized assignment filtering
  const filteredAssignmentsByDate = useMemo(() => {
    const result: Record<string, CalendarAssignment[]> = {};
    weekDates.forEach(date => {
      const dateString = date.toISOString().split('T')[0];
      const dayAssignments = assignments.filter(
        assignment => assignment.date === dateString
      );
      result[dateString] = filterAssignmentsByRole(dayAssignments);
    });
    return result;
  }, [assignments, weekDates, user]);

  // Function to get assignments for a specific date
  const getAssignmentsForDate = useCallback(
    (date: Date): CalendarAssignment[] => {
      const dateString = date.toISOString().split('T')[0];
      return filteredAssignmentsByDate[dateString] || [];
    },
    [filteredAssignmentsByDate]
  );

  // Optimized load assignments function
  const loadAssignments = useCallback(async () => {
    try {
      setIsLoading(true);
      // For now, use mock data since assignments API isn't fully integrated
      const mockAssignments = getMockAssignments();
      setAssignments(mockAssignments);
    } catch (error) {
      console.error('Load assignments error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Optimized navigation function
  const navigateWeek = useCallback(
    (direction: 'prev' | 'next') => {
      const newWeek = new Date(currentWeek);
      newWeek.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
      setCurrentWeek(newWeek);
    },
    [currentWeek]
  );

  // Optimized date check function
  const isToday = useCallback((date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }, []);

  // Optimized week range formatting
  const weekRangeText = useMemo(() => {
    const start = getWeekStart(currentWeek);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString('en-US', {
        month: 'long',
      })} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
    } else {
      const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
      };
      return `${start.toLocaleDateString(
        'en-US',
        options
      )} - ${end.toLocaleDateString('en-US', options)}, ${start.getFullYear()}`;
    }
  }, [currentWeek, getWeekStart]);

  // Optimized role-based assignment filtering
  const filterAssignmentsByRole = useCallback(
    (assignments: CalendarAssignment[]) => {
      if (!user) return assignments;

      switch (user.role) {
        case 'admin':
          return assignments; // Admin sees all assignments
        case 'parent':
          return assignments.filter(
            assignment =>
              assignment.driverName === `${user.firstName} ${user.lastName}` ||
              assignment.passengers?.includes(
                `${user.firstName} ${user.lastName}`
              ) ||
              assignment.passengers?.some(p => p.includes('Child')) // Simplistic parent-child matching
          );
        case 'student':
          return assignments.filter(assignment =>
            assignment.passengers?.includes(
              `${user.firstName} ${user.lastName}`
            )
          );
        default:
          return [];
      }
    },
    [user]
  );

  // Load assignments for current week
  useEffect(() => {
    loadAssignments();
  }, [loadAssignments, currentWeek, user]);

  return (
    <div className={`bg-white shadow rounded-lg ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">
              📅 Weekly Schedule
            </h2>
            <p className="text-sm text-gray-600 mt-1">{weekRangeText}</p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigateWeek('prev')}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>

            <button
              onClick={() => setCurrentWeek(new Date())}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              Today
            </button>

            <button
              onClick={() => navigateWeek('next')}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading schedule...</p>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-4">
            {/* Day Headers */}
            {DAYS_OF_WEEK.map((day, index) => (
              <div key={day} className="text-center pb-2">
                <div className="text-sm font-medium text-gray-900">{day}</div>
                <div
                  className={`text-lg font-semibold mt-1 ${
                    isToday(weekDates[index])
                      ? 'text-blue-600'
                      : 'text-gray-700'
                  }`}
                >
                  {weekDates[index].getDate()}
                </div>
              </div>
            ))}

            {/* Assignment Cells */}
            {weekDates.map((date, index) => {
              const dayAssignments = filterAssignmentsByRole(
                getAssignmentsForDate(date)
              );

              return (
                <div
                  key={index}
                  className={`min-h-[120px] border rounded-lg p-2 cursor-pointer transition-colors ${
                    isToday(date)
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() =>
                    onDateClick?.(date.toISOString().split('T')[0])
                  }
                >
                  <div className="space-y-1">
                    {dayAssignments.length === 0 ? (
                      <div className="text-center text-gray-400 text-xs mt-4">
                        No trips
                      </div>
                    ) : (
                      dayAssignments.map(assignment => (
                        <div
                          key={assignment.id}
                          className={`p-2 rounded text-xs border ${
                            ROUTE_TYPE_COLORS[assignment.routeType]
                          }`}
                        >
                          <div className="flex items-center space-x-1 mb-1">
                            <ClockIcon className="h-3 w-3" />
                            <span className="font-medium">
                              {assignment.startTime}
                            </span>
                          </div>

                          <div className="truncate font-medium mb-1">
                            {assignment.description}
                          </div>

                          {/* Role-specific information */}
                          {user?.role === 'admin' && (
                            <div className="space-y-1">
                              <div className="flex items-center space-x-1">
                                <UserIcon className="h-3 w-3" />
                                <span className="truncate">
                                  {assignment.driverName || 'TBD'}
                                </span>
                              </div>
                              {assignment.passengers &&
                                assignment.passengers.length > 0 && (
                                  <div className="text-xs text-gray-600">
                                    {assignment.passengers.length} passenger
                                    {assignment.passengers.length > 1
                                      ? 's'
                                      : ''}
                                  </div>
                                )}
                            </div>
                          )}

                          {user?.role === 'parent' && (
                            <div className="space-y-1">
                              {assignment.driverName ===
                              `${user.firstName} ${user.lastName}` ? (
                                <div className="flex items-center space-x-1">
                                  <TruckIcon className="h-3 w-3" />
                                  <span className="text-xs font-medium">
                                    You're driving
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1">
                                  <UserIcon className="h-3 w-3" />
                                  <span className="truncate">
                                    {assignment.driverName}
                                  </span>
                                </div>
                              )}
                              {assignment.pickupLocation && (
                                <div className="flex items-center space-x-1">
                                  <MapPinIcon className="h-3 w-3" />
                                  <span className="truncate text-xs">
                                    {assignment.pickupLocation}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {user?.role === 'student' && (
                            <div className="space-y-1">
                              <div className="flex items-center space-x-1">
                                <UserIcon className="h-3 w-3" />
                                <span className="truncate">
                                  {assignment.driverName}
                                </span>
                              </div>
                              {assignment.pickupLocation && (
                                <div className="flex items-center space-x-1">
                                  <MapPinIcon className="h-3 w-3" />
                                  <span className="truncate text-xs">
                                    {assignment.pickupLocation}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Status indicator */}
                          <div
                            className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                              STATUS_COLORS[assignment.status]
                            }`}
                          >
                            {assignment.status.replace('_', ' ')}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
              <span className="text-gray-600">Drop-off</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
              <span className="text-gray-600">Pick-up</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-100 border border-purple-200 rounded"></div>
              <span className="text-gray-600">Multi-stop</span>
            </div>
          </div>

          {showCreateButton && user?.role === 'admin' && (
            <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
              + Create Assignment
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

// Mock data for demonstration
function getMockAssignments(): CalendarAssignment[] {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  return [
    {
      id: 'assignment-1',
      date: today.toISOString().split('T')[0],
      startTime: '07:30',
      endTime: '08:30',
      routeType: 'school_dropoff',
      description: 'Morning School Drop-off',
      driverName: 'Sarah Johnson',
      driverPhone: '555-0123',
      passengers: ['Emma Johnson', 'Liam Chen'],
      pickupLocation: '123 Maple Street',
      dropoffLocation: 'Lincoln Elementary School',
      status: 'scheduled',
    },
    {
      id: 'assignment-2',
      date: today.toISOString().split('T')[0],
      startTime: '15:15',
      endTime: '16:15',
      routeType: 'school_pickup',
      description: 'Afternoon School Pick-up',
      driverName: 'Michael Chen',
      driverPhone: '555-0124',
      passengers: ['Emma Johnson', 'Liam Chen', 'Ava Wilson'],
      pickupLocation: 'Lincoln Elementary School',
      dropoffLocation: 'Various locations',
      status: 'scheduled',
    },
    {
      id: 'assignment-3',
      date: tomorrow.toISOString().split('T')[0],
      startTime: '07:30',
      endTime: '08:30',
      routeType: 'school_dropoff',
      description: 'Morning School Drop-off',
      driverName: 'Jennifer Davis',
      driverPhone: '555-0125',
      passengers: ['Noah Davis', 'Sophia Wilson'],
      pickupLocation: '789 Pine Road',
      dropoffLocation: 'Lincoln Elementary School',
      status: 'scheduled',
    },
    {
      id: 'assignment-4',
      date: tomorrow.toISOString().split('T')[0],
      startTime: '15:15',
      endTime: '16:15',
      routeType: 'school_pickup',
      description: 'Afternoon School Pick-up',
      driverName: 'David Wilson',
      driverPhone: '555-0126',
      passengers: ['Noah Davis', 'Sophia Wilson', 'Oliver Thompson'],
      pickupLocation: 'Lincoln Elementary School',
      dropoffLocation: 'Various locations',
      status: 'scheduled',
    },
  ];
}
