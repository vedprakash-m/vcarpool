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
import { handleError, Errors } from '../src/utils/error-handler';
import { z } from 'zod';

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

const ScheduleGenerationSchema = z.object({
  groupId: z.string(),
  weekStartDate: z.string().transform((str) => new Date(str)),
  considerFairness: z.boolean().default(true),
  prioritizePreferences: z.boolean().default(true),
  allowPartialGeneration: z.boolean().default(false),
  notifyParticipants: z.boolean().default(true),
  dryRun: z.boolean().default(false),
});

// Handler function
async function schedulingHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const method = request.method;
    const action = request.query.get('action');
    const userId = request.auth!.userId; // Ensured by authenticate middleware

    context.log('Scheduling request', { method, action, userId });

    switch (method) {
      case 'GET':
        if (action === 'preference-status') {
          return await handleGetPreferenceStatus(request, userId, context);
        } else if (action === 'fairness-metrics') {
          return await handleGetFairnessMetrics(request, userId, context);
        } else {
          throw Errors.BadRequest('Invalid action for GET request');
        }

      case 'POST':
        if (action === 'submit-preferences') {
          return await handleSubmitPreferences(request, userId, context);
        } else if (action === 'generate-schedule') {
          return await handleGenerateSchedule(request, userId, context);
        } else if (action === 'send-reminders') {
          return await handleSendReminders(request, userId, context);
        } else {
          throw Errors.BadRequest('Invalid action for POST request');
        }

      default:
        throw Errors.BadRequest(`Method ${method} not supported`);
    }
  } catch (error) {
    context.log('Error in scheduling handler', error);
    return handleError(error, request);
  }
}

// GET: Get preference submission status
async function handleGetPreferenceStatus(
  request: HttpRequest,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const groupId = request.query.get('groupId');
  const weekStartDate = request.query.get('weekStartDate');

  if (!groupId || !weekStartDate) {
    throw Errors.BadRequest('groupId and weekStartDate are required');
  }

  const result = await schedulingDomainService.getPreferenceStatus(
    groupId,
    new Date(weekStartDate),
    userId,
  );

  if (!result.success) {
    throw new Error(result.error || 'Failed to get preference status');
  }

  return {
    status: 200,
    jsonBody: {
      success: true,
      data: result.data,
      message: result.message || 'Preference status retrieved successfully',
    },
  };
}

// GET: Get fairness metrics
async function handleGetFairnessMetrics(
  request: HttpRequest,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const groupId = request.query.get('groupId');

  if (!groupId) {
    throw Errors.BadRequest('groupId is required');
  }

  const result = await schedulingDomainService.getFairnessMetrics(groupId, userId);

  if (!result.success) {
    throw new Error(result.error || 'Failed to get fairness metrics');
  }

  return {
    status: 200,
    jsonBody: {
      success: true,
      data: result.data,
      message: result.message || 'Fairness metrics retrieved successfully',
    },
  };
}

// POST: Submit weekly preferences
async function handleSubmitPreferences(
  request: HttpRequest,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const body = request.validated?.body;

  const preferenceData = {
    userId: userId,
    groupId: body.groupId,
    weekStartDate: body.weekStartDate,
    preferences: body.preferences,
  };

  const result = await schedulingDomainService.submitWeeklyPreferences(preferenceData);

  if (!result.success) {
    throw new Error(result.error || 'Failed to submit preferences');
  }

  context.log('Weekly preferences submitted', { userId, groupId: body.groupId });

  return {
    status: 200,
    jsonBody: {
      success: true,
      data: result.data,
      message: result.message || 'Preferences submitted successfully',
    },
  };
}

// POST: Generate weekly schedule
async function handleGenerateSchedule(
  request: HttpRequest,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const body = request.validated?.body;

  const options = {
    groupId: body.groupId,
    weekStartDate: body.weekStartDate,
    considerFairness: body.considerFairness,
    prioritizePreferences: body.prioritizePreferences,
    allowPartialGeneration: body.allowPartialGeneration,
    notifyParticipants: body.notifyParticipants,
    dryRun: body.dryRun,
  };

  const result = await schedulingDomainService.generateWeeklySchedule(options);

  if (!result.success) {
    throw new Error(result.error || 'Failed to generate schedule');
  }

  context.log('Weekly schedule generated', {
    groupId: body.groupId,
    weekStartDate: body.weekStartDate,
    assignmentCount: result.data?.assignments?.length || 0,
  });

  return {
    status: 200,
    jsonBody: {
      success: true,
      data: result.data,
      message: result.message || 'Schedule generated successfully',
      warnings: result.warnings,
    },
  };
}

// POST: Send preference reminders
async function handleSendReminders(
  request: HttpRequest,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const groupId = request.query.get('groupId');
  const weekStartDate = request.query.get('weekStartDate');

  if (!groupId || !weekStartDate) {
    throw Errors.BadRequest('groupId and weekStartDate are required');
  }

  const result = await schedulingDomainService.sendPreferenceReminders(
    groupId,
    new Date(weekStartDate),
    userId,
  );

  if (!result.success) {
    throw new Error(result.error || 'Failed to send reminders');
  }

  context.log('Preference reminders sent', { groupId, weekStartDate });

  return {
    status: 200,
    jsonBody: {
      success: true,
      message: result.message || 'Reminders sent successfully',
    },
  };
}

// Register the function with middleware
app.http('scheduling-operations', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'scheduling',
  handler: compose(
    requestId,
    requestLogging,
    corsMiddleware,
    authenticate,
    validateBody(z.union([WeeklyPreferenceSchema, ScheduleGenerationSchema]).optional()),
  )(schedulingHandler),
});
