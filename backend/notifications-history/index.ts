/**
 * Notifications History
 *
 * Migrated from JavaScript to TypeScript
 * Handles fetching notification history for users
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import {
  compose,
  requestId,
  requestLogging,
  corsMiddleware,
  authenticate,
} from '../src/middleware';
import { notificationDomainService } from '../src/services/domains/notification-domain.service';
import { UserRole } from '@carpool/shared';
import { handleError, Errors } from '../src/utils/error-handler';

async function notificationsHistory(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    context.log('notifications-history HTTP trigger invoked');

    const userId = request.query.get('userId');
    const limit = parseInt(request.query.get('limit') || '20', 10);
    const skip = parseInt(request.query.get('skip') || '0', 10);
    const readParam = request.query.get('read');
    const read = readParam ? readParam === 'true' : undefined;

    if (!userId) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'userId query parameter is required',
        },
      };
    }

    const result = await notificationDomainService.getUserNotificationHistory({
      userId,
      limit,
      skip,
      read,
    });

    return {
      status: 200,
      jsonBody: {
        success: true,
        data: result,
      },
    };
  } catch (error) {
    return handleError(error, request);
  }
}

app.http('notifications-history', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: compose(requestId, requestLogging, corsMiddleware, authenticate)(notificationsHistory),
});

export default notificationsHistory;
