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
async function fairnessTrackingHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const method = request.method;
    const userId = request.auth!.userId;

    context.log('Fairness tracking request', { method, userId });

    // Verify user permissions
    const user = await userDomainService.getUserById(userId);
    if (!user.success || !user.data) {
      throw Errors.AuthError('User not found');
    }

    if (method === 'GET') {
      return await handleGetFairnessMetrics(request, userId, context);
    } else {
      throw Errors.BadRequest(`Method ${method} not supported`);
    }
  } catch (error) {
    context.log('Error in fairness tracking handler', error);
    return handleError(error, request);
  }
}

// GET: Get fairness metrics
async function handleGetFairnessMetrics(
  request: HttpRequest,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const groupId = request.query.get('groupId');
  const weeksBack = parseInt(request.query.get('weeksBack') || '8');

  if (!groupId) {
    throw Errors.BadRequest('groupId is required');
  }

  const result = await schedulingDomainService.getFairnessMetrics(groupId, weeksBack, userId);

  if (!result.success) {
    throw Errors.InternalError(result.error || 'Failed to retrieve fairness metrics');
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
app.http('fairness-tracking', {
  handler: compose(
    corsMiddleware,
    requestId,
    requestLogging,
    authenticate,
    fairnessTrackingHandler,
  ),
  methods: ['GET'],
  route: 'fairness/metrics',
});
