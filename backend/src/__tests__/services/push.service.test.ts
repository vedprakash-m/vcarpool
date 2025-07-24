/* eslint-disable @typescript-eslint/no-var-requires */

import { PushService } from '../../services/push.service';

// Mock the web-push module
jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

describe('PushService', () => {
  let pushService: PushService;
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('constructor', () => {
    it('should set VAPID details when environment variables are provided', () => {
      process.env.VAPID_PUBLIC_KEY = 'test-public-key';
      process.env.VAPID_PRIVATE_KEY = 'test-private-key';
      
      const webpush = require('web-push');
      
      pushService = new PushService();
      
      expect(webpush.setVapidDetails).toHaveBeenCalledWith(
        'mailto:support@carpool.com',
        'test-public-key',
        'test-private-key'
      );
    });

    it('should not set VAPID details when environment variables are missing', () => {
      delete process.env.VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;
      
      const webpush = require('web-push');
      
      pushService = new PushService();
      
      expect(webpush.setVapidDetails).not.toHaveBeenCalled();
    });

    it('should not set VAPID details when only public key is provided', () => {
      process.env.VAPID_PUBLIC_KEY = 'test-public-key';
      delete process.env.VAPID_PRIVATE_KEY;
      
      const webpush = require('web-push');
      
      pushService = new PushService();
      
      expect(webpush.setVapidDetails).not.toHaveBeenCalled();
    });

    it('should not set VAPID details when only private key is provided', () => {
      delete process.env.VAPID_PUBLIC_KEY;
      process.env.VAPID_PRIVATE_KEY = 'test-private-key';
      
      const webpush = require('web-push');
      
      pushService = new PushService();
      
      expect(webpush.setVapidDetails).not.toHaveBeenCalled();
    });
  });

  describe('sendPush', () => {
    it('should send push notification when VAPID is set', async () => {
      process.env.VAPID_PUBLIC_KEY = 'test-public-key';
      process.env.VAPID_PRIVATE_KEY = 'test-private-key';
      
      const webpush = require('web-push');
      webpush.sendNotification.mockResolvedValue(undefined);
      
      pushService = new PushService();
      
      const subscription = { endpoint: 'test-endpoint' };
      const payload = { title: 'Test', body: 'Test message' };
      
      await pushService.sendPush(subscription, payload);
      
      expect(webpush.sendNotification).toHaveBeenCalledWith(
        subscription,
        JSON.stringify(payload)
      );
    });

    it('should not send push notification when VAPID is not set', async () => {
      delete process.env.VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;
      
      const webpush = require('web-push');
      
      pushService = new PushService();
      
      const subscription = { endpoint: 'test-endpoint' };
      const payload = { title: 'Test', body: 'Test message' };
      
      await pushService.sendPush(subscription, payload);
      
      expect(webpush.sendNotification).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      process.env.VAPID_PUBLIC_KEY = 'test-public-key';
      process.env.VAPID_PRIVATE_KEY = 'test-private-key';
      
      const webpush = require('web-push');
      const error = new Error('Push failed');
      webpush.sendNotification.mockRejectedValue(error);
      
      pushService = new PushService();
      
      const subscription = { endpoint: 'test-endpoint' };
      const payload = { title: 'Test', body: 'Test message' };
      
      await expect(pushService.sendPush(subscription, payload)).resolves.not.toThrow();
      
      expect(mockConsoleError).toHaveBeenCalledWith('Error sending push', error);
    });
  });

  describe('sendPushNotification', () => {
    it('should log notification when VAPID is set', async () => {
      process.env.VAPID_PUBLIC_KEY = 'test-public-key';
      process.env.VAPID_PRIVATE_KEY = 'test-private-key';
      
      pushService = new PushService();
      
      const userId = 'user123';
      const payload = { title: 'Test', body: 'Test message' };
      
      await pushService.sendPushNotification(userId, payload);
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        `Push notification would be sent to user ${userId}:`,
        payload
      );
    });

    it('should not send notification when VAPID is not set', async () => {
      delete process.env.VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;
      
      pushService = new PushService();
      
      const userId = 'user123';
      const payload = { title: 'Test', body: 'Test message' };
      
      await pushService.sendPushNotification(userId, payload);
      
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      process.env.VAPID_PUBLIC_KEY = 'test-public-key';
      process.env.VAPID_PRIVATE_KEY = 'test-private-key';
      
      // Mock console.log to throw an error
      mockConsoleLog.mockImplementation(() => {
        throw new Error('Logging failed');
      });
      
      pushService = new PushService();
      
      const userId = 'user123';
      const payload = { title: 'Test', body: 'Test message' };
      
      await expect(pushService.sendPushNotification(userId, payload)).resolves.not.toThrow();
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error sending push notification',
        expect.any(Error)
      );
    });
  });
});
