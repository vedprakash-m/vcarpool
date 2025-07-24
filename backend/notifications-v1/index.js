const { NotificationService } = require('../shared/src/services');
const { databaseService } = require('../src/services/database.service');

module.exports = async function notificationsV1(context, req) {
  context.log('v1/notifications endpoint called');

  try {
    const method = req.method;
    const action = req.params.action || 'send';

    // Handle preflight OPTIONS request
    if (method === 'OPTIONS') {
      context.res = {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      };
      return;
    }

    // Initialize NotificationService with actual database service
    const notificationService = new NotificationService({
      database: databaseService,
      cache: null, // TODO: Add cache service when available
      eventBus: null, // TODO: Add event bus when available
      logger: context.log,
      metrics: null, // TODO: Add metrics service when available
      emailService: null, // TODO: Add email service integration
      smsService: null, // TODO: Add SMS service integration
      pushService: null, // TODO: Add push service integration
    });

    if (method === 'POST') {
      if (action === 'send') {
        const notificationRequest = req.body;

        context.log('Sending notification:', {
          type: notificationRequest.type,
          recipientId: notificationRequest.recipientId,
          subject: notificationRequest.subject,
        });

        if (
          !notificationRequest.type ||
          !notificationRequest.recipientId ||
          !notificationRequest.message
        ) {
          context.res = {
            status: 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            },
            body: {
              success: false,
              error: 'Missing required fields: type, recipientId, message',
            },
          };
          return;
        }

        const result = await notificationService.sendNotification(notificationRequest);

        context.res = {
          status: result.success ? 200 : 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
          body: {
            success: result.success,
            data: result.data,
            error: result.error,
          },
        };
        return;
      }

      if (action === 'batch') {
        const batchRequest = req.body;

        context.log('Sending batch notifications:', {
          count: batchRequest.notifications?.length || 0,
        });

        if (!batchRequest.notifications || !Array.isArray(batchRequest.notifications)) {
          context.res = {
            status: 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            },
            body: {
              success: false,
              error: 'Missing required field: notifications array',
            },
          };
          return;
        }

        const result = await notificationService.sendBatchNotifications(batchRequest.notifications);

        context.res = {
          status: result.success ? 200 : 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
          body: {
            success: result.success,
            data: result.data,
            error: result.error,
          },
        };
        return;
      }
    }

    if (method === 'GET') {
      if (action === 'preferences') {
        const userId = req.query.userId;

        context.log('Getting notification preferences for user:', userId);

        if (!userId) {
          context.res = {
            status: 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            },
            body: {
              success: false,
              error: 'Missing required parameter: userId',
            },
          };
          return;
        }

        const result = await notificationService.getNotificationPreferences(userId);

        context.res = {
          status: result.success ? 200 : 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
          body: {
            success: result.success,
            data: result.data,
            error: result.error,
          },
        };
        return;
      }

      if (action === 'history') {
        const userId = req.query.userId;
        const limit = parseInt(req.query.limit) || 50;

        context.log('Getting notification history for user:', userId, 'limit:', limit);

        if (!userId) {
          context.res = {
            status: 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            },
            body: {
              success: false,
              error: 'Missing required parameter: userId',
            },
          };
          return;
        }

        const result = await notificationService.getNotificationHistory(userId, limit);

        context.res = {
          status: result.success ? 200 : 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
          body: {
            success: result.success,
            data: result.data,
            error: result.error,
          },
        };
        return;
      }
    }

    // Method not allowed
    context.res = {
      status: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: {
        success: false,
        error: 'Method not allowed',
      },
    };
  } catch (error) {
    context.log.error('NotificationService error:', error);

    context.res = {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: {
        success: false,
        error: 'Internal server error',
        details: error.message,
      },
    };
  }
};
