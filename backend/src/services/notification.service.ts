import {
  Notification,
  NotificationType,
  CreateNotificationRequest,
  User,
  Trip,
} from '@carpool/shared';
import { v4 as uuidv4 } from 'uuid';
import { Container } from '@azure/cosmos';
import { ILogger } from '../utils/logger';
import { Errors } from '../utils/error-handler';
import { AzureLogger } from '../utils/logger';
import { ServiceBusClient } from '@azure/service-bus';
import { PushService } from './push.service';

export interface IPushNotificationService {
  sendPushNotification(userId: string, notification: PushNotificationPayload): Promise<boolean>;
  sendToMultipleUsers(userIds: string[], notification: PushNotificationPayload): Promise<void>;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  icon?: string;
  badge?: number;
  sound?: string;
  clickAction?: string;
  tag?: string;
}

export interface NotificationPayload {
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export class NotificationRepository {
  constructor(private container: Container) {}

  async create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const newNotification: Notification = {
      ...notification,
      id: uuidv4(),
      createdAt: new Date(),
    };

    const { resource } = await this.container.items.create(newNotification);
    return resource as Notification;
  }

  async findByUserId(
    userId: string,
    options: {
      read?: boolean;
      type?: NotificationType;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{ notifications: Notification[]; total: number }> {
    let query = 'SELECT * FROM c WHERE c.userId = @userId';
    const parameters = [{ name: '@userId', value: userId }];

    if (options.read !== undefined) {
      query += ' AND c.read = @read';
      parameters.push({ name: '@read', value: options.read.toString() });
    }

    if (options.type) {
      query += ' AND c.type = @type';
      parameters.push({ name: '@type', value: options.type });
    }

    // Filter out expired notifications
    query += ' AND (c.expiresAt IS NULL OR c.expiresAt > @now)';
    parameters.push({ name: '@now', value: new Date().toISOString() });

    query += ' ORDER BY c.createdAt DESC';

    if (options.limit) {
      query += ` OFFSET ${options.offset || 0} LIMIT ${options.limit}`;
    }

    const { resources: notifications } = await this.container.items
      .query<Notification>({
        query,
        parameters,
      })
      .fetchAll();

    // Get total count
    const countQuery = query
      .replace('SELECT * FROM c', 'SELECT VALUE COUNT(1) FROM c')
      .replace(/ORDER BY .+$/, '')
      .replace(/OFFSET .+ LIMIT .+$/, '');

    const { resources: countResult } = await this.container.items
      .query({
        query: countQuery,
        parameters,
      })
      .fetchAll();

    const total = countResult[0] || 0;

    return { notifications, total };
  }

  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { resource: notification } = await this.container
        .item(notificationId, notificationId)
        .read<Notification>();
      if (!notification) {
        return false;
      }

      const updatedNotification = {
        ...notification,
        read: true,
      };

      await this.container.item(notificationId, notificationId).replace(updatedNotification);
      return true;
    } catch (error: any) {
      if (error.code === 404) {
        return false;
      }
      throw error;
    }
  }

  async markAllAsRead(userId: string): Promise<number> {
    const { notifications } = await this.findByUserId(userId, { read: false });

    let count = 0;
    for (const notification of notifications) {
      const success = await this.markAsRead(notification.id);
      if (success) count++;
    }

    return count;
  }

  async delete(notificationId: string): Promise<boolean> {
    try {
      await this.container.item(notificationId, notificationId).delete();
      return true;
    } catch (error: any) {
      if (error.code === 404) {
        return false;
      }
      throw error;
    }
  }

  async cleanup(): Promise<number> {
    const now = new Date().toISOString();
    const query = {
      query: 'SELECT * FROM c WHERE c.expiresAt != null AND c.expiresAt <= @now',
      parameters: [{ name: '@now', value: now }],
    };

    const { resources: expiredNotifications } = await this.container.items
      .query<Notification>(query)
      .fetchAll();

    let deletedCount = 0;
    for (const notification of expiredNotifications) {
      const success = await this.delete(notification.id);
      if (success) deletedCount++;
    }

    return deletedCount;
  }
}

export class NotificationService {
  private readonly logger = new AzureLogger();
  private sbClient?: ServiceBusClient;

  constructor(
    private notificationRepository: NotificationRepository,
    private pushService: PushService = new PushService(),
  ) {
    const connectionString = process.env.SERVICE_BUS_CONNECTION;
    if (connectionString) {
      this.sbClient = new ServiceBusClient(connectionString);
    } else {
      this.logger.warn('SERVICE_BUS_CONNECTION not set – notifications disabled');
    }
  }

  /**
   * Create a notification
   */
  async createNotification(request: CreateNotificationRequest): Promise<Notification> {
    try {
      const notification = await this.notificationRepository.create({
        ...request,
        read: false,
      });

      // Send push notification if service is available
      if (this.pushService) {
        const pushPayload: PushNotificationPayload = {
          title: request.title,
          body: request.message,
          data: request.data,
          badge: 1,
        };

        await this.pushService.sendPushNotification(request.userId, pushPayload);
      }

      this.logger.info('Notification created', {
        notificationId: notification.id,
        userId: request.userId,
      });
      return notification;
    } catch (error) {
      this.logger.error('Error creating notification', error as Record<string, unknown>);
      throw error;
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    options: {
      read?: boolean;
      type?: NotificationType;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{ notifications: Notification[]; total: number }> {
    try {
      return await this.notificationRepository.findByUserId(userId, options);
    } catch (error) {
      this.logger.error('Error fetching user notifications', { userId, error });
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      // TODO: Add user ownership check
      return await this.notificationRepository.markAsRead(notificationId);
    } catch (error) {
      this.logger.error('Error marking notification as read', {
        notificationId,
        error,
      });
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const count = await this.notificationRepository.markAllAsRead(userId);
      this.logger.info('Marked all notifications as read', { userId, count });
      return count;
    } catch (error) {
      this.logger.error('Error marking all notifications as read', {
        userId,
        error,
      });
      throw error;
    }
  }

  /**
   * Notification helpers for specific events
   */
  async notifyTripJoined(trip: Trip, passengerUser: User): Promise<void> {
    await this.createNotification({
      userId: trip.driverId,
      type: 'trip_joined',
      title: 'New Passenger',
      message: `${passengerUser.firstName} ${passengerUser.lastName} joined your trip to ${trip.destination}`,
      data: {
        tripId: trip.id,
        passengerId: passengerUser.id,
        destination: trip.destination,
      },
    });
  }

  async notifyTripLeft(trip: Trip, passengerUser: User): Promise<void> {
    await this.createNotification({
      userId: trip.driverId,
      type: 'trip_left',
      title: 'Passenger Left',
      message: `${passengerUser.firstName} ${passengerUser.lastName} left your trip to ${trip.destination}`,
      data: {
        tripId: trip.id,
        passengerId: passengerUser.id,
        destination: trip.destination,
      },
    });
  }

  async notifyTripUpdated(trip: Trip, userIds: string[]): Promise<void> {
    const notifications = userIds.map((userId) => ({
      userId,
      type: 'trip_updated' as NotificationType,
      title: 'Trip Updated',
      message: `Trip to ${trip.destination} has been updated. Please check the details.`,
      data: {
        tripId: trip.id,
        destination: trip.destination,
      },
    }));

    await Promise.all(notifications.map((notification) => this.createNotification(notification)));
  }

  async notifyTripCancelled(trip: Trip, userIds: string[]): Promise<void> {
    const notifications = userIds.map((userId) => ({
      userId,
      type: 'trip_cancelled' as NotificationType,
      title: 'Trip Cancelled',
      message: `Trip to ${trip.destination} on ${trip.date.toDateString()} has been cancelled.`,
      data: {
        tripId: trip.id,
        destination: trip.destination,
        date: trip.date.toISOString(),
      },
    }));

    await Promise.all(notifications.map((notification) => this.createNotification(notification)));
  }

  async notifyNewMessage(
    chatId: string,
    senderName: string,
    message: string,
    recipientIds: string[],
  ): Promise<void> {
    const notifications = recipientIds.map((userId) => ({
      userId,
      type: 'message_received' as NotificationType,
      title: `New message from ${senderName}`,
      message: message.length > 50 ? `${message.substring(0, 50)}...` : message,
      data: {
        chatId,
        senderName,
      },
    }));

    await Promise.all(notifications.map((notification) => this.createNotification(notification)));
  }

  async notifyTripReminder(trip: Trip, userIds: string[]): Promise<void> {
    const notifications = userIds.map((userId) => ({
      userId,
      type: 'trip_reminder' as NotificationType,
      title: 'Trip Reminder',
      message: `Your trip to ${trip.destination} is tomorrow at ${trip.departureTime}`,
      data: {
        tripId: trip.id,
        destination: trip.destination,
        departureTime: trip.departureTime,
      },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expire in 24 hours
    }));

    await Promise.all(notifications.map((notification) => this.createNotification(notification)));
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const { total } = await this.getUserNotifications(userId, {
      read: false,
      limit: 1,
    });
    return total;
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpiredNotifications(): Promise<number> {
    try {
      const deletedCount = await this.notificationRepository.cleanup();
      this.logger.info('Cleaned up expired notifications', { deletedCount });
      return deletedCount;
    } catch (error) {
      this.logger.error('Error cleaning up notifications', error as Record<string, unknown>);
      throw error;
    }
  }

  public async sendPasswordResetEmail(email: string, data: any): Promise<void> {
    this.logger.info(`Sending password reset email to ${email}`, data);
    // In a real implementation, call EmailService or external provider
    return;
  }

  async sendToUser(userId: string, payload: NotificationPayload): Promise<void> {
    if (!this.sbClient) return;
    const sender = this.sbClient.createSender(`user-${userId}`);
    await sender.sendMessages({ body: payload });
    await sender.close();
    this.logger.debug('Notification sent', { userId, type: payload.type });
  }

  async broadcastToGroup(groupId: string, payload: NotificationPayload): Promise<void> {
    if (!this.sbClient) return;
    const sender = this.sbClient.createSender(`group-${groupId}`);
    await sender.sendMessages({ body: payload });
    await sender.close();
    this.logger.debug('Group notification', { groupId, type: payload.type });
  }

  /**
   * Generic enqueue used by HTTP notifications-dispatch function.
   */
  async enqueueNotification(raw: {
    type: string;
    payload?: Record<string, unknown>;
    targetUserIds?: string[];
    groupId?: string;
  }): Promise<void> {
    if (!this.sbClient) {
      this.logger.warn(
        'ServiceBusClient not initialised – enqueueNotification is a no-op in local dev',
      );
      return;
    }

    const sender = this.sbClient.createSender(
      process.env.SB_NOTIFICATIONS_TOPIC || 'notifications',
    );
    await sender.sendMessages({ body: raw });
    await sender.close();

    // Fallback to push notifications for offline users
    if (raw.targetUserIds && raw.targetUserIds.length) {
      // TODO: fetch subscriptions from DB; simplified noop for now
    }
  }
}
