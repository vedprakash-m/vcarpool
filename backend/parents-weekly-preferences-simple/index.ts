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
const WeeklyPreferenceSchema = z.object({
  groupId: z.string(),
  weekStartDate: z.string().transform((str) => new Date(str)),
  preferences: z.record(
    z.object({
      canDrive: z.boolean(),
      canPassenger: z.boolean(),
      preferredPickupTime: z.string().optional(),
      preferredDropoffTime: z.string().optional(),
      notes: z.string().optional(),
    }),
  ),
});

// Handler function
async function parentWeeklyPreferencesHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const method = request.method;
    const userId = request.auth!.userId;

    context.log('Parent weekly preferences request', { method, userId });

    // Verify user is a parent
    const user = await userDomainService.getUserById(userId);
    if (!user.success || !user.data) {
      throw Errors.AuthError('User not found');
    }

    if (user.data.role !== UserRole.PARENT) {
      throw Errors.AuthError('Only parents can submit weekly preferences');
    }

    switch (method) {
      case 'GET':
        return await handleGetPreferences(request, userId, context);

      case 'POST':
        return await handleSubmitPreferences(request, userId, context);

      case 'PUT':
        return await handleUpdatePreferences(request, userId, context);

      default:
        throw Errors.BadRequest(`Method ${method} not supported`);
    }
  } catch (error) {
    context.log('Error in parent weekly preferences handler', error);
    return handleError(error, request);
  }
}

// GET: Get weekly preferences
async function handleGetPreferences(
  request: HttpRequest,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const groupId = request.query.get('groupId');
  const weekStartDate = request.query.get('weekStartDate');

  if (!groupId || !weekStartDate) {
    throw Errors.BadRequest('groupId and weekStartDate are required');
  }

  const result = await schedulingDomainService.getWeeklyPreferences(
    userId,
    groupId,
    new Date(weekStartDate),
  );

  if (!result.success) {
    throw Errors.InternalError(result.error || 'Failed to retrieve preferences');
  }

  return {
    status: 200,
    jsonBody: {
      success: true,
      data: result.data,
    },
  };
}

// POST: Submit weekly preferences
async function handleSubmitPreferences(
  request: HttpRequest,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const body = await request.json();
  const validatedData = WeeklyPreferenceSchema.parse(body);

  const result = await schedulingDomainService.submitWeeklyPreferences({
    userId,
    groupId: validatedData.groupId,
    weekStartDate: validatedData.weekStartDate,
    preferences: validatedData.preferences,
  });

  if (!result.success) {
    throw Errors.InternalError(result.error || 'Failed to submit preferences');
  }

  return {
    status: 201,
    jsonBody: {
      success: true,
      data: result.data,
      message: 'Weekly preferences submitted successfully',
    },
  };
}

// PUT: Update weekly preferences
async function handleUpdatePreferences(
  request: HttpRequest,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const body = await request.json();
  const validatedData = WeeklyPreferenceSchema.parse(body);

  const result = await schedulingDomainService.updateWeeklyPreferences({
    userId,
    groupId: validatedData.groupId,
    weekStartDate: validatedData.weekStartDate,
    preferences: validatedData.preferences,
  });

  if (!result.success) {
    throw Errors.InternalError(result.error || 'Failed to update preferences');
  }

  return {
    status: 200,
    jsonBody: {
      success: true,
      data: result.data,
      message: 'Weekly preferences updated successfully',
    },
  };
}

// Register the function
app.http('parent-weekly-preferences', {
  handler: compose(
    corsMiddleware,
    requestId,
    requestLogging,
    authenticate,
    parentWeeklyPreferencesHandler,
  ),
  methods: ['GET', 'POST', 'PUT'],
  route: 'parent/preferences',
});
