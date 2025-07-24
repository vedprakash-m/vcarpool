/**
 * Notification System E2E Tests
 * Tests push notification registration, dispatch, delivery, and history management
 */

import { test, expect } from '@playwright/test';
import { TestUser, createTestUser, cleanupTestUser, makeApiRequest } from '../utils/test-helpers';

test.describe('Notification System', () => {
  let parentUser: TestUser;
  let adminUser: TestUser;
  let userToken: string;
  let adminToken: string;

  test.beforeAll(async ({ request }) => {
    parentUser = await createTestUser('parent');
    adminUser = await createTestUser('admin');

    // Get parent token
    const parentLoginResponse = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
      email: parentUser.email,
      password: parentUser.password,
    });
    const parentLoginData = await parentLoginResponse.json();
    userToken = parentLoginData.token;

    // Get admin token
    const adminLoginResponse = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
      email: adminUser.email,
      password: adminUser.password,
    });
    const adminLoginData = await adminLoginResponse.json();
    adminToken = adminLoginData.token;
  });

  test.afterAll(async () => {
    if (parentUser) await cleanupTestUser(parentUser.email);
    if (adminUser) await cleanupTestUser(adminUser.email);
  });

  test.describe('Push Notification Registration', () => {
    test('register for push notifications - success', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/push-subscribe',
        {
          endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
          keys: {
            p256dh: 'test-p256dh-key',
            auth: 'test-auth-key',
          },
          deviceType: 'web',
          userAgent: 'Mozilla/5.0 (Test Browser)',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.subscriptionId).toBeDefined();
    });

    test('register with invalid subscription data - validation error', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/push-subscribe',
        {
          endpoint: 'invalid-endpoint',
          keys: {
            p256dh: '',
            auth: '',
          },
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('update existing subscription', async ({ request }) => {
      // First register
      await makeApiRequest(
        request,
        'POST',
        '/api/push-subscribe',
        {
          endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-1',
          keys: {
            p256dh: 'test-p256dh-key-1',
            auth: 'test-auth-key-1',
          },
          deviceType: 'web',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      // Update subscription
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/push-subscribe',
        {
          endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-2',
          keys: {
            p256dh: 'test-p256dh-key-2',
            auth: 'test-auth-key-2',
          },
          deviceType: 'web',
          action: 'update',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.updated).toBe(true);
    });

    test('unsubscribe from notifications', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/push-subscribe',
        {
          action: 'unsubscribe',
          deviceType: 'web',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.unsubscribed).toBe(true);
    });
  });

  test.describe('Notification Dispatch', () => {
    test('dispatch single notification - admin', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/notifications-dispatch',
        {
          type: 'reminder',
          title: 'Carpool Reminder',
          message: 'Your carpool duty is tomorrow at 8:00 AM',
          recipients: [parentUser.email],
          priority: 'normal',
          channels: ['push', 'email'],
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.notificationId).toBeDefined();
      expect(data.recipientCount).toBe(1);
    });

    test('dispatch bulk notifications - admin', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/notifications-dispatch',
        {
          type: 'announcement',
          title: 'School Announcement',
          message: 'Important update for all carpool participants',
          recipients: 'all_parents',
          priority: 'high',
          channels: ['push', 'email', 'sms'],
          scheduleFor: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.notificationId).toBeDefined();
      expect(data.scheduled).toBe(true);
    });

    test('dispatch notification with template', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/notifications-dispatch',
        {
          templateId: 'carpool_assignment',
          templateData: {
            parentName: parentUser.name,
            driverName: 'John Doe',
            pickupTime: '8:00 AM',
            date: '2025-06-25',
          },
          recipients: [parentUser.email],
          channels: ['push'],
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.templateUsed).toBe('carpool_assignment');
    });

    test('dispatch emergency notification', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/notifications-dispatch',
        {
          type: 'emergency',
          title: 'Emergency Alert',
          message: 'School closure due to weather conditions',
          recipients: 'all_users',
          priority: 'critical',
          channels: ['push', 'email', 'sms'],
          emergency: true,
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.emergency).toBe(true);
      expect(data.deliveredImmediately).toBe(true);
    });

    test('dispatch notification - unauthorized user', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/notifications-dispatch',
        {
          type: 'reminder',
          title: 'Test',
          message: 'Test message',
          recipients: [parentUser.email],
        },
        {
          Authorization: `Bearer ${userToken}`, // Regular user, not admin
        },
      );

      expect(response.status()).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Insufficient permissions');
    });
  });

  test.describe('Notification Bridge & Delivery', () => {
    test('bridge notification to external services', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/notifications-bridge',
        {
          notificationId: 'test-notification-id',
          services: ['firebase', 'twilio', 'sendgrid'],
          retryPolicy: {
            maxRetries: 3,
            backoffMultiplier: 2,
          },
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.bridgedServices).toBeDefined();
      expect(Array.isArray(data.bridgedServices)).toBe(true);
    });

    test('check notification delivery status', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'GET',
        '/api/notifications-bridge?notificationId=test-notification-id&status=true',
        null,
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.deliveryStatus).toBeDefined();
      expect(data.deliveryAttempts).toBeDefined();
    });
  });

  test.describe('Notification History', () => {
    test('get user notification history', async ({ request }) => {
      const response = await makeApiRequest(request, 'GET', '/api/notifications-history', null, {
        Authorization: `Bearer ${userToken}`,
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.notifications)).toBe(true);
      expect(data.pagination).toBeDefined();
    });

    test('get notification history with filters', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'GET',
        '/api/notifications-history?type=reminder&status=delivered&limit=10&offset=0',
        null,
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.notifications)).toBe(true);
      expect(data.notifications.every((n: any) => n.type === 'reminder')).toBe(true);
    });

    test('mark notification as read', async ({ request }) => {
      // First get notifications to find one to mark as read
      const historyResponse = await makeApiRequest(
        request,
        'GET',
        '/api/notifications-history?limit=1',
        null,
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      const historyData = await historyResponse.json();
      if (historyData.notifications.length > 0) {
        const notificationId = historyData.notifications[0].id;

        const response = await makeApiRequest(
          request,
          'PUT',
          '/api/notifications-history',
          {
            notificationId,
            action: 'mark_read',
          },
          {
            Authorization: `Bearer ${userToken}`,
          },
        );

        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.marked_read).toBe(true);
      }
    });

    test('delete notification from history', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'DELETE',
        '/api/notifications-history',
        {
          notificationId: 'test-notification-id',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.deleted).toBe(true);
    });

    test('get admin notification analytics', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'GET',
        '/api/notifications-history?analytics=true&dateRange=30days',
        null,
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.analytics).toBeDefined();
      expect(data.analytics.totalSent).toBeDefined();
      expect(data.analytics.deliveryRates).toBeDefined();
      expect(data.analytics.engagementMetrics).toBeDefined();
    });
  });

  test.describe('Notification Preferences', () => {
    test('update notification preferences', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'PUT',
        '/api/users-me',
        {
          notificationPreferences: {
            push: {
              enabled: true,
              types: ['reminder', 'announcement', 'assignment'],
            },
            email: {
              enabled: true,
              types: ['reminder', 'announcement', 'emergency'],
              frequency: 'immediate',
            },
            sms: {
              enabled: false,
              types: ['emergency'],
            },
          },
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.preferences).toBeDefined();
    });

    test('respect notification preferences in dispatch', async ({ request }) => {
      // First, disable email notifications for user
      await makeApiRequest(
        request,
        'PUT',
        '/api/users-me',
        {
          notificationPreferences: {
            email: { enabled: false },
            push: { enabled: true },
          },
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      // Then try to send notification via email and push
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/notifications-dispatch',
        {
          type: 'reminder',
          title: 'Test Reminder',
          message: 'Testing preference respect',
          recipients: [parentUser.email],
          channels: ['push', 'email'],
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.channelsUsed).toContain('push');
      expect(data.channelsSkipped).toContain('email');
    });
  });

  test.describe('Error Handling', () => {
    test('invalid notification type - validation error', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/notifications-dispatch',
        {
          type: 'invalid_type',
          title: 'Test',
          message: 'Test message',
          recipients: [parentUser.email],
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('empty recipients list - validation error', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/notifications-dispatch',
        {
          type: 'reminder',
          title: 'Test',
          message: 'Test message',
          recipients: [],
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('recipients');
    });

    test('service unavailable - retry mechanism', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/notifications-bridge',
        {
          notificationId: 'test-notification-id',
          services: ['unavailable_service'],
          retryPolicy: {
            maxRetries: 1,
            backoffMultiplier: 1,
          },
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      // Should still return success but with service failures noted
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.serviceFailures).toBeDefined();
    });
  });
});
