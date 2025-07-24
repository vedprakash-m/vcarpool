/**
 * Notifications Dispatch
 *
 * Migrated from JavaScript to TypeScript
 * Handles notification dispatch for enqueueing
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import {
  compose,
  requestId,
  requestLogging,
  corsMiddleware,
  validateBody,
} from '../src/middleware';
import { notificationDomainService } from '../src/services/domains/notification-domain.service';
import { NotificationType } from '@carpool/shared';
import { handleError, Errors } from '../src/utils/error-handler';
import { z } from 'zod';

// Validation schema
const DispatchNotificationSchema = z.object({
  type: z.enum([
    'trip_joined',
    'trip_left',
    'trip_cancelled',
    'trip_updated',
    'message_received',
    'trip_reminder',
    'pickup_reminder',
  ]),
  payload: z.record(z.any()),
  targetUserIds: z.array(z.string()).optional(),
  groupId: z.string().optional(),
});

async function notificationsDispatch(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    context.log('notifications-dispatch HTTP trigger invoked');

    const body = await request.json();
    const validatedData = DispatchNotificationSchema.parse(body);

    await notificationDomainService.dispatchNotification({
      type: validatedData.type as NotificationType,
      payload: validatedData.payload,
      targetUserIds: validatedData.targetUserIds,
      groupId: validatedData.groupId,
    });

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: 'Notification enqueued successfully',
      },
    };
  } catch (error) {
    return handleError(error, request);
  }
}

app.http('notifications-dispatch', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: compose(
    requestId,
    requestLogging,
    corsMiddleware,
    validateBody(DispatchNotificationSchema),
  )(notificationsDispatch),
});

export default notificationsDispatch;
