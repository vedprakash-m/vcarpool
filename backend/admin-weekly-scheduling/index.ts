import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import {
  compose,
  requestId,
  requestLogging,
  authenticate,
  validateBody,
  corsMiddleware,
} from '../src/middleware';
import { schedulingDomainService } from '../src/services/domains/scheduling-domain.service';
import { userDomainService } from '../src/services/domains/user-domain.service';
import { handleError, Errors } from '../src/utils/error-handler';
import { z } from 'zod';
import { UserRole } from '@carpool/shared';

// Validation schemas
const WeeklyScheduleSchema = z.object({
  groupId: z.string(),
  weekStartDate: z.string().transform((str) => new Date(str)),
  considerFairness: z.boolean().default(true),
  prioritizePreferences: z.boolean().default(true),
  allowPartialGeneration: z.boolean().default(false),
  notifyParticipants: z.boolean().default(true),
  dryRun: z.boolean().default(false),
});

const ScheduleUpdateSchema = z.object({
  status: z.enum(['draft', 'published', 'archived']).optional(),
  notes: z.string().optional(),
});

// Handler function
async function adminWeeklySchedulingHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const method = request.method;
    const userId = request.auth!.userId;
    const groupId = request.params.groupId;
    const scheduleId = request.params.scheduleId;

    context.log('Admin weekly scheduling request', { method, userId, groupId, scheduleId });

    // Verify admin permissions
    const user = await userDomainService.getUserById(userId);
    if (!user.success || !user.data) {
      throw Errors.AuthError('User not found');
    }

    if (user.data.role !== UserRole.ADMIN && user.data.role !== UserRole.TRIP_ADMIN) {
      throw Errors.AuthError('Insufficient permissions for weekly scheduling');
    }

    switch (method) {
      case 'GET':
        if (scheduleId) {
          return await handleGetSchedule(scheduleId, context);
        } else {
          return await handleGetSchedules(groupId, request, context);
        }

      case 'POST':
        return await handleCreateSchedule(request, userId, context);

      case 'PUT':
        if (!scheduleId) {
          throw Errors.BadRequest('Schedule ID is required for updates');
        }
        return await handleUpdateSchedule(scheduleId, request, userId, context);

      case 'DELETE':
        if (!scheduleId) {
          throw Errors.BadRequest('Schedule ID is required for deletion');
        }
        return await handleDeleteSchedule(scheduleId, userId, context);

      default:
        throw Errors.BadRequest(`Method ${method} not supported`);
    }
  } catch (error) {
    context.log('Error in admin weekly scheduling handler', error);
    return handleError(error, request);
  }
}

// GET: Get specific schedule
async function handleGetSchedule(
  scheduleId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const result = await schedulingDomainService.getSchedule(scheduleId);

  if (!result.success) {
    throw Errors.NotFound(result.error || 'Schedule not found');
  }

  return {
    status: 200,
    jsonBody: {
      success: true,
      data: result.data,
    },
  };
}

// GET: Get schedules for a group
async function handleGetSchedules(
  groupId: string | undefined,
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const weekStartDate = request.query.get('weekStartDate');
  const status = request.query.get('status');
  const limit = parseInt(request.query.get('limit') || '10');

  const result = await schedulingDomainService.getSchedules({
    groupId,
    weekStartDate: weekStartDate ? new Date(weekStartDate) : undefined,
    status: status as 'draft' | 'published' | 'archived',
    limit,
  });

  if (!result.success) {
    throw Errors.InternalError(result.error || 'Failed to retrieve schedules');
  }

  return {
    status: 200,
    jsonBody: {
      success: true,
      data: result.data,
    },
  };
}

// POST: Create new weekly schedule
async function handleCreateSchedule(
  request: HttpRequest,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const body = await request.json();
  const validatedData = WeeklyScheduleSchema.parse(body);

  const result = await schedulingDomainService.generateWeeklySchedule({
    ...validatedData,
    notifyParticipants: validatedData.notifyParticipants,
    dryRun: validatedData.dryRun,
  });

  if (!result.success) {
    throw Errors.InternalError(result.error || 'Failed to create schedule');
  }

  return {
    status: 201,
    jsonBody: {
      success: true,
      data: result.data,
      message: 'Weekly schedule created successfully',
    },
  };
}

// PUT: Update schedule
async function handleUpdateSchedule(
  scheduleId: string,
  request: HttpRequest,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const body = await request.json();
  const validatedData = ScheduleUpdateSchema.parse(body);

  const result = await schedulingDomainService.updateSchedule(scheduleId, validatedData);

  if (!result.success) {
    throw Errors.InternalError(result.error || 'Failed to update schedule');
  }

  return {
    status: 200,
    jsonBody: {
      success: true,
      data: result.data,
      message: 'Schedule updated successfully',
    },
  };
}

// DELETE: Delete schedule
async function handleDeleteSchedule(
  scheduleId: string,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const result = await schedulingDomainService.deleteSchedule(scheduleId);

  if (!result.success) {
    throw Errors.InternalError(result.error || 'Failed to delete schedule');
  }

  return {
    status: 200,
    jsonBody: {
      success: true,
      message: 'Schedule deleted successfully',
    },
  };
}

// Register the function
app.http('admin-weekly-scheduling', {
  handler: compose(
    corsMiddleware,
    requestId,
    requestLogging,
    authenticate,
    adminWeeklySchedulingHandler,
  ),
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  route: 'admin/schedules/{groupId?}/{scheduleId?}',
});
