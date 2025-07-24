/**
 * Notifications Azure Communication Services
 *
 * Migrated from JavaScript to TypeScript
 * Handles sending notifications via Azure Communication Services (Email/SMS)
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
import { handleError, Errors } from '../src/utils/error-handler';
import { z } from 'zod';

// Validation schema
const AzureCommNotificationSchema = z.object({
  recipients: z.array(
    z.object({
      id: z.string(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      name: z.string().optional(),
    }),
  ),
  templateName: z.string(),
  data: z.record(z.any()),
  channel: z.enum(['email', 'sms', 'both']),
  priority: z.enum(['high', 'normal', 'low']).optional(),
});

async function notificationsAzureComm(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    context.log('notifications-azure-comm HTTP trigger invoked');

    const body = await request.json();
    const validatedData = AzureCommNotificationSchema.parse(body);

    if (validatedData.recipients.length === 0) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'Recipients array cannot be empty',
        },
      };
    }

    context.log(
      `Processing notification: ${validatedData.templateName} to ${validatedData.recipients.length} recipients via ${validatedData.channel}`,
    );

    const result = await notificationDomainService.sendAzureCommNotification({
      recipients: validatedData.recipients,
      templateName: validatedData.templateName,
      data: validatedData.data,
      channel: validatedData.channel,
      priority: validatedData.priority || 'normal',
    });

    return {
      status: 200,
      jsonBody: {
        success: true,
        data: result,
        message: 'Notification sent successfully via Azure Communication Services',
      },
    };
  } catch (error) {
    return handleError(error, request);
  }
}

app.http('notifications-azure-comm', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: compose(
    requestId,
    requestLogging,
    corsMiddleware,
    validateBody(AzureCommNotificationSchema),
  )(notificationsAzureComm),
});

export default notificationsAzureComm;
