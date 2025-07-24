/**
 * Notifications Bridge
 *
 * Migrated from JavaScript to TypeScript
 * Handles relaying notifications to Web PubSub for real-time updates
 */

import { app, InvocationContext } from '@azure/functions';
import { WebPubSubServiceClient } from '@azure/web-pubsub';
import { v4 as uuidv4 } from 'uuid';
import { notificationDomainService } from '../src/services/domains/notification-domain.service';

async function notificationsBridge(notification: any, context: InvocationContext): Promise<void> {
  try {
    context.log('notifications-bridge Service Bus trigger invoked', notification);

    const hub = process.env.WEB_PUBSUB_HUB || 'vc-notify';
    const endpoint = process.env.WEB_PUBSUB_CONNECTION || '';

    if (!endpoint) {
      context.log('WEB_PUBSUB_CONNECTION not configured – skipping publish');
      return;
    }

    const serviceClient = new WebPubSubServiceClient(endpoint, hub);

    // Process notification through domain service
    await notificationDomainService.processNotificationBridge(notification);

    // Broadcast to all connected clients
    const enrichedNotification = {
      ...notification,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
    };

    await serviceClient.sendToAll(enrichedNotification);

    context.log('Notification relayed to Web PubSub successfully');
  } catch (error) {
    context.log('Error relaying notification to Web PubSub:', error);
  }
}

app.serviceBusQueue('notifications-bridge', {
  connection: 'ServiceBusConnection',
  queueName: 'notifications',
  handler: notificationsBridge,
});

export default notificationsBridge;
