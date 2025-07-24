/**
 * Parent Group Creation
 *
 * Migrated from JavaScript to TypeScript
 * Handles carpool group creation by parent users
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import {
  compose,
  requestId,
  requestLogging,
  authenticate,
  validateBody,
  corsMiddleware,
} from '../src/middleware';
import { groupDomainService } from '../src/services/domains/group-domain.service';
import { databaseService } from '../src/services/database.service';
import { UserRole } from '@carpool/shared';
import { handleError, Errors } from '../src/utils/error-handler';
import { z } from 'zod';

// Validation schemas
const GroupCreationSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  targetSchoolId: z.string(),
  serviceArea: z.object({
    centerLocation: z.object({
      lat: z.number(),
      lng: z.number(),
    }),
    radiusMiles: z.number().min(1).max(25),
    includeZipCodes: z.array(z.string()).optional(),
    excludeZipCodes: z.array(z.string()).optional(),
  }),
  maxChildren: z.number().min(2).max(12),
  ageGroups: z.array(z.string()).optional(),
  schedule: z.object({
    daysOfWeek: z.array(z.string()),
    morningPickup: z
      .object({
        startTime: z.string(),
        endTime: z.string(),
      })
      .optional(),
    afternoonDropoff: z
      .object({
        startTime: z.string(),
        endTime: z.string(),
      })
      .optional(),
  }),
});

interface GroupTemplate {
  id: string;
  name: string;
  description: string;
  schedule: {
    daysOfWeek: string[];
    morningPickup?: {
      startTime: string;
      endTime: string;
    };
    afternoonDropoff?: {
      startTime: string;
      endTime: string;
    };
  };
  defaultRadius: number;
  defaultCapacity: number;
  ageGroups: string[];
}

interface EligibilityCheck {
  canCreate: boolean;
  reasons: string[];
  warnings: string[];
  recommendations: string[];
}

// Handler function
async function parentGroupCreationHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const method = request.method;
    const action = request.query.get('action');
    const userId = request.auth!.userId; // Ensured by authenticate middleware

    context.log('Parent group creation request', { method, action, userId });

    // Verify user is a parent
    const user = await databaseService.getUserById(userId);
    if (!user) {
      throw Errors.Unauthorized('User not found');
    }

    if (user.role !== 'parent') {
      throw Errors.Forbidden('Only parents can create groups');
    }

    switch (method) {
      case 'POST':
        if (!action) {
          return await handleGroupCreation(request, userId, context);
        }
        break;

      case 'GET':
        if (action === 'templates') {
          return await handleGetTemplates(context);
        }
        if (action === 'check-eligibility') {
          return await handleEligibilityCheck(request, userId, context);
        }
        break;
    }

    throw Errors.BadRequest(`Method ${method} with action ${action} not allowed`);
  } catch (error) {
    context.log('Parent group creation error:', error);
    return handleError(error, request);
  }
}

async function handleGroupCreation(
  request: HttpRequest,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const body = await request.json();
    const validatedData = GroupCreationSchema.parse(body);

    context.log('Creating new carpool group', { userId, groupName: validatedData.name });

    // Create group request for the domain service
    const groupRequest = {
      name: validatedData.name,
      description: validatedData.description || '',
      schoolId: validatedData.targetSchoolId,
      maxMembers: Math.min(validatedData.maxChildren, 12),
      createdBy: userId,
      addresses: [], // No addresses provided in this interface
      scheduleTemplate: 'custom', // Custom schedule from the request
    };

    // Use GroupDomainService to create the group
    const result = await groupDomainService.createGroup(groupRequest, 'parent');

    if (!result.success) {
      throw Errors.ValidationError(result.error || 'Failed to create group');
    }

    return {
      status: 201,
      jsonBody: {
        success: true,
        data: {
          group: result.data,
          message: `🎉 Congratulations! Your carpool group "${result.data?.name}" has been created successfully. You are now the Group Admin and can start inviting other families!`,
          nextSteps: [
            'Invite other families from your school and neighborhood',
            'Set up your first weekly schedule',
            'Share your group with friends and neighbors',
            'Review group settings and safety guidelines',
          ],
        },
      },
    };
  } catch (error) {
    context.log('Group creation error:', error);
    throw error;
  }
}

async function handleGetTemplates(context: InvocationContext): Promise<HttpResponseInit> {
  const templates: GroupTemplate[] = [
    {
      id: 'morning-pickup',
      name: 'Morning School Pickup',
      description: 'Standard morning carpool for school pickup',
      schedule: {
        daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        morningPickup: {
          startTime: '07:30',
          endTime: '08:00',
        },
      },
      defaultRadius: 5,
      defaultCapacity: 6,
      ageGroups: ['K', '1', '2', '3', '4', '5'],
    },
    {
      id: 'afternoon-dropoff',
      name: 'Afternoon School Dropoff',
      description: 'Standard afternoon carpool for school dropoff',
      schedule: {
        daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        afternoonDropoff: {
          startTime: '15:00',
          endTime: '16:00',
        },
      },
      defaultRadius: 5,
      defaultCapacity: 6,
      ageGroups: ['K', '1', '2', '3', '4', '5'],
    },
    {
      id: 'full-day',
      name: 'Full Day Carpool',
      description: 'Both morning pickup and afternoon dropoff',
      schedule: {
        daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        morningPickup: {
          startTime: '07:30',
          endTime: '08:00',
        },
        afternoonDropoff: {
          startTime: '15:00',
          endTime: '16:00',
        },
      },
      defaultRadius: 3,
      defaultCapacity: 4,
      ageGroups: ['K', '1', '2', '3', '4', '5'],
    },
    {
      id: 'weekend-activities',
      name: 'Weekend Activities',
      description: 'Weekend sports, activities, and events',
      schedule: {
        daysOfWeek: ['saturday', 'sunday'],
        morningPickup: {
          startTime: '09:00',
          endTime: '10:00',
        },
        afternoonDropoff: {
          startTime: '16:00',
          endTime: '17:00',
        },
      },
      defaultRadius: 10,
      defaultCapacity: 8,
      ageGroups: ['K', '1', '2', '3', '4', '5', '6', '7', '8'],
    },
  ];

  return {
    status: 200,
    jsonBody: {
      success: true,
      data: {
        templates,
        message: 'Group creation templates retrieved successfully',
      },
    },
  };
}

async function handleEligibilityCheck(
  request: HttpRequest,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const schoolId = request.query.get('schoolId');

  const eligibilityChecks: EligibilityCheck = {
    canCreate: true,
    reasons: [],
    warnings: [],
    recommendations: [],
  };

  // Get user details
  const user = await databaseService.getUserById(userId);
  if (!user) {
    throw Errors.Unauthorized('User not found');
  }

  // Check if user is an active driver
  if (!user.isActiveDriver) {
    eligibilityChecks.warnings.push(
      'Consider verifying your driver status for better member trust',
    );
  }

  // Check existing groups for this school (simplified check for now)
  // In a real implementation, this would check the database for existing groups
  const mockExistingGroupCount = 0; // This would be replaced with actual database query

  if (mockExistingGroupCount >= 3) {
    eligibilityChecks.canCreate = false;
    eligibilityChecks.reasons.push('Maximum 3 active groups per school reached');
  } else if (mockExistingGroupCount >= 1) {
    eligibilityChecks.warnings.push(
      `You already manage ${mockExistingGroupCount} group(s) for this school`,
    );
  }

  // Add helpful recommendations
  eligibilityChecks.recommendations = [
    'Start with a small group (4-6 children) and expand gradually',
    'Consider your daily schedule when setting pickup/dropoff times',
    'Choose a service area within 5 miles for better coordination',
    'Invite neighbors and school families you already know',
  ];

  return {
    status: 200,
    jsonBody: {
      success: true,
      data: {
        eligibility: eligibilityChecks,
        message: 'Eligibility check completed successfully',
      },
    },
  };
}

// Register the function with middleware
app.http('parent-group-creation', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'parent/groups/create',
  handler: compose(
    requestId,
    requestLogging,
    corsMiddleware,
    authenticate,
    validateBody(GroupCreationSchema.optional()),
  )(parentGroupCreationHandler),
});
