/**
 * Custom hook for calendar data management
 * Handles calendar state, assignment loading, and week navigation
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/auth.store';

export interface CalendarAssignment {
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

export function useCalendarData() {
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
  }, [assignments, weekDates, filterAssignmentsByRole]);

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

  // Get assignments for a specific date
  const getAssignmentsForDate = useCallback(
    (date: Date) => {
      const dateString = date.toISOString().split('T')[0];
      return filteredAssignmentsByDate[dateString] || [];
    },
    [filteredAssignmentsByDate]
  );

  // Load assignments for current week
  useEffect(() => {
    loadAssignments();
  }, [loadAssignments, currentWeek, user]);

  return {
    // State
    currentWeek,
    assignments,
    isLoading,
    weekDates,
    weekRangeText,

    // Functions
    navigateWeek,
    isToday,
    getAssignmentsForDate,
    filterAssignmentsByRole,
    setCurrentWeek,
    loadAssignments,
  };
}

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
