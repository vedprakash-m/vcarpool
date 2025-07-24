/**
 * Admin Parent Assignments Management
 *
 * Migrated from JavaScript to TypeScript
 * Provides parent assignment management for admin dashboard
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { authenticate } from '../src/middleware';
import UnifiedResponseHandler from '../src/utils/unified-response.service';

interface ParentAssignment {
  id: string;
  weekStartDate: string;
  driverId: string;
  driverName: string;
  driverContact: {
    email?: string;
    phoneNumber?: string;
  };
  routeType: 'school_pickup' | 'school_dropoff';
  tripDate: string;
  tripTime: string;
  passengers: Array<{
    id: string;
    name: string;
    phoneNumber?: string;
  }>;
  passengerCount: number;
  notes?: string;
}

interface WeeklyAssignmentSummary {
  weekStartDate: string;
  assignments: ParentAssignment[];
  totalAssignments: number;
  weekSummary: {
    totalTrips: number;
    totalPassengers: number;
    dropoffTrips: number;
    pickupTrips: number;
    estimatedDrivingTime: string;
  };
}

export async function adminParentAssignments(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  context.log('Parent Assignments API called');

  try {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return UnifiedResponseHandler.preflight();
    }

    // Apply authentication middleware
    const authResponse = await authenticate(request, context);
    if (authResponse) {
      return authResponse;
    }

    // Check if user is authenticated
    if (!request.auth) {
      return UnifiedResponseHandler.authError('Authentication required');
    }

    const user = request.auth;
    const weekStartDate = request.params.weekStartDate;

    // Validate admin access
    if (user.role !== 'super_admin' && user.role !== 'group_admin') {
      return UnifiedResponseHandler.forbiddenError('Admin access required');
    }

    // Set current week as default if no week specified
    const targetWeek = weekStartDate || getCurrentMondayDate();

    switch (request.method) {
      case 'GET':
        return await getParentAssignments(targetWeek);

      default:
        return UnifiedResponseHandler.methodNotAllowedError(`Method ${request.method} not allowed`);
    }
  } catch (error) {
    context.log('Parent assignments error:', error);
    return UnifiedResponseHandler.internalError(
      'Failed to process parent assignments',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}

async function getParentAssignments(weekStartDate: string): Promise<HttpResponseInit> {
  try {
    // Validate week start date format
    if (!weekStartDate || !isValidDate(weekStartDate)) {
      return UnifiedResponseHandler.validationError(
        'Invalid week start date format. Expected YYYY-MM-DD.',
      );
    }

    // For now, return mock data until database integration is complete
    const mockAssignments = getMockParentAssignments(weekStartDate);
    return UnifiedResponseHandler.success(mockAssignments);
  } catch (error) {
    throw error;
  }
}

// Helper function to get current Monday date
function getCurrentMondayDate(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysUntilMonday);
  return monday.toISOString().split('T')[0];
}

// Helper function to validate date format
function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

// Mock data for development
function getMockParentAssignments(weekStartDate: string): WeeklyAssignmentSummary {
  const assignments: ParentAssignment[] = [
    {
      id: 'assignment-1',
      weekStartDate,
      driverId: 'user-1',
      driverName: 'John Doe',
      driverContact: {
        email: 'john@example.com',
        phoneNumber: '555-1234',
      },
      routeType: 'school_pickup',
      tripDate: weekStartDate,
      tripTime: '8:00 AM',
      passengers: [
        {
          id: 'child-1',
          name: 'Emily Smith',
          phoneNumber: '555-5678',
        },
        {
          id: 'child-2',
          name: 'Michael Johnson',
          phoneNumber: '555-9012',
        },
      ],
      passengerCount: 2,
      notes: 'Regular pickup route',
    },
    {
      id: 'assignment-2',
      weekStartDate,
      driverId: 'user-2',
      driverName: 'Jane Smith',
      driverContact: {
        email: 'jane@example.com',
        phoneNumber: '555-5678',
      },
      routeType: 'school_dropoff',
      tripDate: weekStartDate,
      tripTime: '3:30 PM',
      passengers: [
        {
          id: 'child-3',
          name: 'Sarah Williams',
          phoneNumber: '555-3456',
        },
      ],
      passengerCount: 1,
      notes: 'Afternoon dropoff',
    },
  ];

  const totalPassengers = assignments.reduce(
    (sum, assignment) => sum + assignment.passengerCount,
    0,
  );

  return {
    weekStartDate,
    assignments,
    totalAssignments: assignments.length,
    weekSummary: {
      totalTrips: assignments.length,
      totalPassengers,
      dropoffTrips: assignments.filter((a) => a.routeType === 'school_dropoff').length,
      pickupTrips: assignments.filter((a) => a.routeType === 'school_pickup').length,
      estimatedDrivingTime: `${assignments.length} hours`,
    },
  };
}
