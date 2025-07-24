/**
 * Admin Notifications Management
 *
 * Migrated from JavaScript to TypeScript
 * Consolidates all notification-related operations
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import {
  compose,
  requestId,
  requestLogging,
  authenticate,
  hasRole,
  corsMiddleware,
} from '../src/middleware';
import { container } from '../src/container';
import { UnifiedResponseHandler } from '../src/utils/unified-response.service';
import { UserRole } from '@carpool/shared';
import { handleError, Errors } from '../src/utils/error-handler';
import { ILogger } from '../src/utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Notification interfaces
interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  template: string;
  type: 'email' | 'sms' | 'push' | 'in_app';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Notification {
  id: string;
  userId: string;
  type: 'swap_request' | 'assignment_reminder' | 'trip_update' | 'system_announcement';
  subject: string;
  message: string;
  status: 'pending' | 'sent' | 'failed' | 'read';
  channel: 'email' | 'sms' | 'push' | 'in_app';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: Record<string, any>;
  sentAt?: Date;
  readAt?: Date;
  createdAt: Date;
  createdBy: string;
}

interface BulkNotificationRequest {
  templateId: string;
  recipients: string[]; // user IDs
  variables: Record<string, string>;
  channel: 'email' | 'sms' | 'push' | 'in_app';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduleAt?: Date;
}

// Mock data storage
const mockTemplates: NotificationTemplate[] = [
  {
    id: 'template-1',
    name: 'swap_request_created',
    subject: 'New Carpool Swap Request from {requestingDriverName}',
    template: `Dear {receivingDriverName},

{requestingDriverName} has requested to swap a carpool assignment with you.

Assignment Details:
• Date: {assignmentDate}
• Time: {assignmentTime}
• Route: {assignmentDescription}

Request Message:
"{requestMessage}"

Please log into the Carpool app to accept or decline this request.

Best regards,
Carpool System`,
    type: 'email',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'template-2',
    name: 'assignment_reminder',
    subject: 'Carpool Assignment Reminder for {date}',
    template: `Dear {driverName},

This is a reminder of your carpool assignment for {date}.

Assignment Details:
• Time: {pickupTime}
• Passengers: {passengerList}
• Route: {routeDescription}

Please arrive on time and contact passengers if needed.

Best regards,
Carpool System`,
    type: 'email',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

const mockNotifications: Notification[] = [];

// Handler function
async function adminNotificationsHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const logger = container.resolve<ILogger>('ILogger').child({ requestId: request.requestId });

  try {
    const method = request.method?.toUpperCase();
    const currentUserId = request.auth!.userId;
    const notificationId = request.query.get('notificationId');
    const templateId = request.query.get('templateId');

    logger.info('Admin notifications request', { method, currentUserId });

    switch (method) {
      case 'GET':
        if (templateId) {
          // Get specific template
          const template = mockTemplates.find((t) => t.id === templateId);
          if (!template) {
            throw Errors.NotFound('Template not found');
          }
          return UnifiedResponseHandler.success(template);
        } else if (notificationId) {
          // Get specific notification
          const notification = mockNotifications.find((n) => n.id === notificationId);
          if (!notification) {
            throw Errors.NotFound('Notification not found');
          }
          return UnifiedResponseHandler.success(notification);
        } else if (request.query.get('type') === 'templates') {
          // Get all templates
          return UnifiedResponseHandler.success(mockTemplates);
        } else {
          // Get all notifications with pagination
          const limit = parseInt(request.query.get('limit') || '20');
          const offset = parseInt(request.query.get('offset') || '0');
          const status = request.query.get('status');

          let filteredNotifications = [...mockNotifications];
          if (status) {
            filteredNotifications = filteredNotifications.filter((n) => n.status === status);
          }

          const paginatedNotifications = filteredNotifications.slice(offset, offset + limit);

          return UnifiedResponseHandler.success({
            notifications: paginatedNotifications,
            total: filteredNotifications.length,
            limit,
            offset,
          });
        }

      case 'POST':
        const body = await UnifiedResponseHandler.parseJsonBody(request);
        const action = request.query.get('action');

        if (action === 'send_bulk') {
          // Send bulk notifications
          const bulkRequest: BulkNotificationRequest = body;

          if (!bulkRequest.templateId || !bulkRequest.recipients || !bulkRequest.variables) {
            throw Errors.BadRequest('Template ID, recipients, and variables are required');
          }

          const template = mockTemplates.find((t) => t.id === bulkRequest.templateId);
          if (!template) {
            throw Errors.NotFound('Template not found');
          }

          // Create notifications for each recipient
          const createdNotifications: Notification[] = [];

          for (const userId of bulkRequest.recipients) {
            let processedSubject = template.subject;
            let processedMessage = template.template;

            // Replace variables in template
            for (const [key, value] of Object.entries(bulkRequest.variables)) {
              const placeholder = `{${key}}`;
              processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), value);
              processedMessage = processedMessage.replace(new RegExp(placeholder, 'g'), value);
            }

            const notification: Notification = {
              id: uuidv4(),
              userId,
              type: 'system_announcement',
              subject: processedSubject,
              message: processedMessage,
              status: 'pending',
              channel: bulkRequest.channel,
              priority: bulkRequest.priority,
              metadata: {
                templateId: bulkRequest.templateId,
                variables: bulkRequest.variables,
              },
              createdAt: new Date(),
              createdBy: currentUserId,
            };

            mockNotifications.push(notification);
            createdNotifications.push(notification);
          }

          logger.info('Bulk notifications created', {
            templateId: bulkRequest.templateId,
            recipientCount: bulkRequest.recipients.length,
            createdBy: currentUserId,
          });

          return UnifiedResponseHandler.success({
            message: 'Bulk notifications created successfully',
            notificationsCreated: createdNotifications.length,
            notifications: createdNotifications,
          });
        } else {
          // Create single notification
          const {
            userId,
            type,
            subject,
            message,
            channel = 'email',
            priority = 'medium',
            metadata,
          } = body;

          if (!userId || !type || !subject || !message) {
            throw Errors.BadRequest('User ID, type, subject, and message are required');
          }

          const notification: Notification = {
            id: uuidv4(),
            userId,
            type,
            subject,
            message,
            status: 'pending',
            channel,
            priority,
            metadata,
            createdAt: new Date(),
            createdBy: currentUserId,
          };

          mockNotifications.push(notification);

          logger.info('Notification created', {
            notificationId: notification.id,
            userId,
            type,
            createdBy: currentUserId,
          });

          return UnifiedResponseHandler.success({
            message: 'Notification created successfully',
            notification,
          });
        }

      case 'PUT':
        if (!notificationId) {
          throw Errors.BadRequest('Notification ID is required');
        }

        const updateBody = await UnifiedResponseHandler.parseJsonBody(request);
        const notificationIndex = mockNotifications.findIndex((n) => n.id === notificationId);

        if (notificationIndex === -1) {
          throw Errors.NotFound('Notification not found');
        }

        const existingNotification = mockNotifications[notificationIndex];
        const updatedNotification: Notification = {
          ...existingNotification,
          ...updateBody,
          updatedAt: new Date(),
        };

        mockNotifications[notificationIndex] = updatedNotification;

        logger.info('Notification updated', {
          notificationId,
          updatedBy: currentUserId,
        });

        return UnifiedResponseHandler.success({
          message: 'Notification updated successfully',
          notification: updatedNotification,
        });

      case 'DELETE':
        if (!notificationId) {
          throw Errors.BadRequest('Notification ID is required');
        }

        const deleteIndex = mockNotifications.findIndex((n) => n.id === notificationId);

        if (deleteIndex === -1) {
          throw Errors.NotFound('Notification not found');
        }

        mockNotifications.splice(deleteIndex, 1);

        logger.info('Notification deleted', {
          notificationId,
          deletedBy: currentUserId,
        });

        return UnifiedResponseHandler.success({
          message: 'Notification deleted successfully',
        });

      default:
        throw Errors.BadRequest(`Method ${method} not supported`);
    }
  } catch (error) {
    logger.error('Error in admin notifications function', { error });
    return handleError(error, request);
  }
}

// Register the function with middleware composition
app.http('admin-notifications', {
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  route: 'admin/notifications',
  authLevel: 'anonymous',
  handler: compose(
    requestId,
    requestLogging,
    corsMiddleware,
    authenticate,
    hasRole('group_admin' as UserRole),
  )(adminNotificationsHandler),
});

export default adminNotificationsHandler;
