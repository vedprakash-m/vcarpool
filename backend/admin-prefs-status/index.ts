import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import {
  compose,
  requestId,
  requestLogging,
  authenticate,
  corsMiddleware,
} from '../src/middleware';
import { schedulingDomainService } from '../src/services/domains/scheduling-domain.service';
import { userDomainService } from '../src/services/domains/user-domain.service';
import { handleError, Errors } from '../src/utils/error-handler';
import { UserRole } from '@carpool/shared';

// Handler function
async function adminPrefsStatusHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const method = request.method;
    const userId = request.auth!.userId;

    context.log('Admin prefs status request', { method, userId });

    // Verify admin permissions
    const user = await userDomainService.getUserById(userId);
    if (!user.success || !user.data) {
      throw Errors.AuthError('User not found');
    }

    if (user.data.role !== UserRole.ADMIN && user.data.role !== UserRole.TRIP_ADMIN) {
      throw Errors.AuthError('Insufficient permissions for preference status');
    }

    if (method === 'GET') {
      return await handleGetPreferenceStatus(request, userId, context);
    } else {
      throw Errors.BadRequest(`Method ${method} not supported`);
    }
  } catch (error) {
    context.log('Error in admin prefs status handler', error);
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
    throw Errors.InternalError(result.error || 'Failed to retrieve preference status');
  }

  return {
    status: 200,
    jsonBody: {
      success: true,
      data: result.data,
    },
  };
}

// Register the function
app.http('admin-prefs-status', {
  handler: compose(
    corsMiddleware,
    requestId,
    requestLogging,
    authenticate,
    adminPrefsStatusHandler,
  ),
  methods: ['GET'],
  route: 'admin/preferences/status',
});
