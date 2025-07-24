/**
 * Admin Driver Selection Management
 *
 * Migrated from JavaScript to TypeScript
 * Handles driver designation and selection for weekly assignments
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { authenticate } from '../src/middleware';
import UnifiedResponseHandler from '../src/utils/unified-response.service';

interface PotentialDriver {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  joinedDate: string;
  isAvailable?: boolean;
  preferences?: {
    canDriveOnWeekdays?: boolean;
    canDriveOnWeekends?: boolean;
    maxPassengers?: number;
    preferredTimeSlots?: string[];
  };
}

interface DriverDesignation {
  id: string;
  weekStartDate: string;
  driverId: string;
  assignedDays: string[];
  assignedRoutes: string[];
  notes?: string;
  createdAt: string;
  createdBy: string;
}

interface WeekDriverDesignations {
  weekStartDate: string;
  drivers: Array<{
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
    isActive: boolean;
    designation?: DriverDesignation;
  }>;
  activeDriverCount: number;
  totalPotentialDrivers: number;
}

interface SetDesignationsRequest {
  weekStartDate: string;
  activeDriverIds: string[];
  designations?: Array<{
    driverId: string;
    assignedDays: string[];
    assignedRoutes: string[];
    notes?: string;
  }>;
}

export async function adminDriverSelection(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  context.log('Admin Driver Selection API called');

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

    // Validate admin access
    if (user.role !== 'super_admin' && user.role !== 'group_admin') {
      return UnifiedResponseHandler.forbiddenError('Admin access required');
    }

    const weekStartDate = request.params.weekStartDate;
    const method = request.method.toUpperCase();

    switch (method) {
      case 'GET':
        if (weekStartDate) {
          return await getWeekDriverDesignations(weekStartDate, context);
        } else {
          return await getAllPotentialDrivers(context);
        }

      case 'POST':
      case 'PUT':
        return await setWeekDriverDesignations(request, context);

      default:
        return UnifiedResponseHandler.methodNotAllowedError(`Method ${method} not allowed`);
    }
  } catch (error) {
    context.log('Driver selection error:', error);
    return UnifiedResponseHandler.internalError(
      'Internal server error',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}

// Get all potential drivers (parents with driving capability)
async function getAllPotentialDrivers(context: InvocationContext): Promise<HttpResponseInit> {
  try {
    // For now, return mock data until database integration is complete
    const mockDrivers = getMockPotentialDrivers();
    return UnifiedResponseHandler.success({
      drivers: mockDrivers,
      pagination: {
        total: mockDrivers.length,
        page: 1,
        limit: mockDrivers.length,
      },
    });
  } catch (error) {
    context.log('Get potential drivers error:', error);
    return UnifiedResponseHandler.internalError(
      'Failed to retrieve potential drivers',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}

// Get driver designations for a specific week
async function getWeekDriverDesignations(
  weekStartDate: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    // Validate week start date format
    if (!isValidWeekStartDate(weekStartDate)) {
      return UnifiedResponseHandler.validationError(
        'Invalid week start date format. Expected YYYY-MM-DD for a Monday.',
      );
    }

    // For now, return mock data until database integration is complete
    const mockDesignations = getMockWeekDesignations(weekStartDate);
    return UnifiedResponseHandler.success(mockDesignations);
  } catch (error) {
    context.log('Get week designations error:', error);
    throw error;
  }
}

// Set driver designations for a specific week
async function setWeekDriverDesignations(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const body = (await request.json()) as SetDesignationsRequest;

    // Validate required fields
    if (!body.weekStartDate || !Array.isArray(body.activeDriverIds)) {
      return UnifiedResponseHandler.validationError(
        'weekStartDate and activeDriverIds array are required',
      );
    }

    // Validate week start date
    if (!isValidWeekStartDate(body.weekStartDate)) {
      return UnifiedResponseHandler.validationError(
        'Invalid week start date format. Expected YYYY-MM-DD for a Monday.',
      );
    }

    // For now, simulate the designation setting
    const result = {
      weekStartDate: body.weekStartDate,
      activeDriverIds: body.activeDriverIds,
      designationsSet: body.activeDriverIds.length,
      message: 'Driver designations updated successfully',
    };

    return UnifiedResponseHandler.success(result);
  } catch (error) {
    context.log('Set designations error:', error);
    return UnifiedResponseHandler.internalError(
      'Failed to set driver designations',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}

// Helper function to validate week start date (should be a Monday)
function isValidWeekStartDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return false;

  // Check if it's a Monday (getDay() returns 1 for Monday)
  return date.getDay() === 1;
}

// Mock data for development
function getMockPotentialDrivers(): PotentialDriver[] {
  return [
    {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      phoneNumber: '555-1234',
      pickupLocation: '123 Main St',
      dropoffLocation: 'Tesla STEM High School',
      joinedDate: '2025-01-15',
      isAvailable: true,
      preferences: {
        canDriveOnWeekdays: true,
        canDriveOnWeekends: false,
        maxPassengers: 4,
        preferredTimeSlots: ['morning', 'afternoon'],
      },
    },
    {
      id: 'user-2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phoneNumber: '555-5678',
      pickupLocation: '456 Oak Ave',
      dropoffLocation: 'Tesla STEM High School',
      joinedDate: '2025-02-01',
      isAvailable: true,
      preferences: {
        canDriveOnWeekdays: true,
        canDriveOnWeekends: true,
        maxPassengers: 6,
        preferredTimeSlots: ['afternoon'],
      },
    },
    {
      id: 'user-3',
      name: 'Mike Johnson',
      email: 'mike@example.com',
      phoneNumber: '555-9012',
      pickupLocation: '789 Pine Rd',
      dropoffLocation: 'Tesla STEM High School',
      joinedDate: '2025-01-20',
      isAvailable: false,
      preferences: {
        canDriveOnWeekdays: false,
        canDriveOnWeekends: true,
        maxPassengers: 3,
        preferredTimeSlots: ['morning'],
      },
    },
  ];
}

function getMockWeekDesignations(weekStartDate: string): WeekDriverDesignations {
  const mockDrivers = getMockPotentialDrivers();

  // Simulate some drivers being active for this week
  const activeDriverIds = ['user-1', 'user-2'];

  return {
    weekStartDate,
    drivers: mockDrivers.map((driver) => ({
      id: driver.id,
      name: driver.name,
      email: driver.email,
      phoneNumber: driver.phoneNumber,
      isActive: activeDriverIds.includes(driver.id),
      designation: activeDriverIds.includes(driver.id)
        ? {
            id: `designation-${driver.id}`,
            weekStartDate,
            driverId: driver.id,
            assignedDays: ['Monday', 'Wednesday', 'Friday'],
            assignedRoutes: ['Morning Pickup', 'Afternoon Dropoff'],
            notes: `Active driver for week of ${weekStartDate}`,
            createdAt: new Date().toISOString(),
            createdBy: 'admin-1',
          }
        : undefined,
    })),
    activeDriverCount: activeDriverIds.length,
    totalPotentialDrivers: mockDrivers.length,
  };
}
