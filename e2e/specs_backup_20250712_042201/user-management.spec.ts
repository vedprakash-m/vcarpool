/**
 * User Management E2E Tests
 * Tests profile management, password changes, phone verification, and user settings
 */

import { test, expect } from '@playwright/test';
import { TestUser, createTestUser, cleanupTestUser, makeApiRequest } from '../utils/test-helpers';

test.describe('User Management System', () => {
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

  test.describe('Profile Management', () => {
    test('get user profile - users-me', async ({ request }) => {
      const response = await makeApiRequest(request, 'GET', '/api/users-me', null, {
        Authorization: `Bearer ${userToken}`,
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(parentUser.email);
      expect(data.user.name).toBe(parentUser.name);
      expect(data.user.role).toBe('parent');
    });

    test('update user profile - basic information', async ({ request }) => {
      const updatedData = {
        name: 'Updated Parent Name',
        phone: '+1987654321',
        address: {
          street: '456 Updated Street',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94105',
        },
        preferences: {
          notifications: {
            email: true,
            push: true,
            sms: false,
          },
          language: 'en',
          timezone: 'America/Los_Angeles',
        },
      };

      const response = await makeApiRequest(request, 'PUT', '/api/users-me', updatedData, {
        Authorization: `Bearer ${userToken}`,
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user.name).toBe(updatedData.name);
      expect(data.user.phone).toBe(updatedData.phone);
    });

    test('update user profile - invalid data validation', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'PUT',
        '/api/users-me',
        {
          email: 'invalid-email-format',
          phone: 'invalid-phone',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.validationErrors).toBeDefined();
    });

    test('update profile picture', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'PUT',
        '/api/users-me',
        {
          profilePicture: {
            url: 'https://example.com/profile.jpg',
            type: 'url',
          },
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user.profilePicture).toBeDefined();
    });

    test('add child to profile', async ({ request }) => {
      const childData = {
        firstName: 'Test',
        lastName: 'Child',
        grade: '3rd',
        school: 'Lincoln Elementary',
        birthDate: '2018-05-15',
        medicalInfo: {
          allergies: ['Peanuts'],
          medications: [],
          emergencyContacts: [
            {
              name: 'Grandparent',
              phone: '+1234567890',
              relationship: 'Grandmother',
            },
          ],
        },
      };

      const response = await makeApiRequest(
        request,
        'PUT',
        '/api/users-me',
        {
          children: [childData],
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user.children).toBeDefined();
      expect(data.user.children[0].firstName).toBe(childData.firstName);
    });
  });

  test.describe('Password Management', () => {
    test('change password - valid current password', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'PUT',
        '/api/users-change-password',
        {
          currentPassword: parentUser.password,
          newPassword: 'NewSecurePassword123!',
          confirmPassword: 'NewSecurePassword123!',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.passwordChanged).toBe(true);

      // Update test user password for cleanup
      parentUser.password = 'NewSecurePassword123!';
    });

    test('change password - invalid current password', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'PUT',
        '/api/users-change-password',
        {
          currentPassword: 'WrongPassword',
          newPassword: 'NewSecurePassword123!',
          confirmPassword: 'NewSecurePassword123!',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('current password');
    });

    test('change password - password mismatch', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'PUT',
        '/api/users-change-password',
        {
          currentPassword: parentUser.password,
          newPassword: 'NewSecurePassword123!',
          confirmPassword: 'DifferentPassword123!',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('passwords do not match');
    });

    test('change password - weak password validation', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'PUT',
        '/api/users-change-password',
        {
          currentPassword: parentUser.password,
          newPassword: '123',
          confirmPassword: '123',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('password strength');
    });
  });

  test.describe('Phone Verification', () => {
    test('request phone verification code', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/phone-verification',
        {
          phoneNumber: '+1234567890',
          action: 'request',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.verificationId).toBeDefined();
      expect(data.codeSent).toBe(true);
    });

    test('verify phone number with code', async ({ request }) => {
      // First request verification
      const requestResponse = await makeApiRequest(
        request,
        'POST',
        '/api/phone-verification',
        {
          phoneNumber: '+1234567890',
          action: 'request',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      const requestData = await requestResponse.json();
      const verificationId = requestData.verificationId;

      // Verify with code (using test code for E2E)
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/phone-verification',
        {
          verificationId,
          code: '123456', // Test verification code
          action: 'verify',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.verified).toBe(true);
    });

    test('verify phone number - invalid code', async ({ request }) => {
      // First request verification
      const requestResponse = await makeApiRequest(
        request,
        'POST',
        '/api/phone-verification',
        {
          phoneNumber: '+1234567890',
          action: 'request',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      const requestData = await requestResponse.json();
      const verificationId = requestData.verificationId;

      // Verify with wrong code
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/phone-verification',
        {
          verificationId,
          code: '000000',
          action: 'verify',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('invalid');
    });

    test('resend verification code', async ({ request }) => {
      // First request verification
      const requestResponse = await makeApiRequest(
        request,
        'POST',
        '/api/phone-verification',
        {
          phoneNumber: '+1234567890',
          action: 'request',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      const requestData = await requestResponse.json();
      const verificationId = requestData.verificationId;

      // Resend code
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/phone-verification',
        {
          verificationId,
          action: 'resend',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.resent).toBe(true);
    });

    test('phone verification - rate limiting', async ({ request }) => {
      // Send multiple verification requests rapidly
      const promises = Array.from({ length: 10 }, () =>
        makeApiRequest(
          request,
          'POST',
          '/api/phone-verification',
          {
            phoneNumber: '+1234567890',
            action: 'request',
          },
          {
            Authorization: `Bearer ${userToken}`,
          },
        ),
      );

      const responses = await Promise.all(promises);

      // At least one should be rate limited
      const rateLimitedResponses = responses.filter((r) => r.status() === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  test.describe('Emergency Contact Verification', () => {
    test('add emergency contact', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/emergency-contact-verification',
        {
          contactName: 'John Doe',
          contactPhone: '+1987654321',
          relationship: 'Uncle',
          contactEmail: 'john.doe@example.com',
          isPrimary: false,
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.contactId).toBeDefined();
    });

    test('verify emergency contact', async ({ request }) => {
      // First add a contact
      const addResponse = await makeApiRequest(
        request,
        'POST',
        '/api/emergency-contact-verification',
        {
          contactName: 'Jane Smith',
          contactPhone: '+1876543210',
          relationship: 'Aunt',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      const addData = await addResponse.json();
      const contactId = addData.contactId;

      // Then verify the contact
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/emergency-contact-verification',
        {
          contactId,
          action: 'verify',
          verificationCode: '123456', // Test verification code
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.verified).toBe(true);
    });

    test('update emergency contact', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'PUT',
        '/api/emergency-contact-verification',
        {
          contactId: 'existing-contact-id',
          contactName: 'Updated Contact Name',
          contactPhone: '+1555666777',
          relationship: 'Guardian',
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

    test('delete emergency contact', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'DELETE',
        '/api/emergency-contact-verification',
        {
          contactId: 'contact-to-delete',
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

    test('emergency contact validation - invalid phone', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/emergency-contact-verification',
        {
          contactName: 'Invalid Contact',
          contactPhone: 'not-a-phone-number',
          relationship: 'Friend',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('phone');
    });
  });

  test.describe('User Settings & Preferences', () => {
    test('update notification preferences', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'PUT',
        '/api/users-me',
        {
          preferences: {
            notifications: {
              email: {
                enabled: true,
                frequency: 'daily_digest',
                types: ['reminder', 'announcement'],
              },
              push: {
                enabled: true,
                frequency: 'immediate',
                types: ['reminder', 'emergency', 'assignment'],
              },
              sms: {
                enabled: false,
                types: ['emergency'],
              },
            },
            privacy: {
              profileVisible: true,
              phoneVisible: false,
              addressVisible: false,
            },
            carpool: {
              autoAcceptRequests: false,
              maxDistance: 5,
              preferredTimes: {
                morning: '08:00',
                afternoon: '15:30',
              },
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
      expect(data.user.preferences).toBeDefined();
    });

    test('update language and timezone', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'PUT',
        '/api/users-me',
        {
          preferences: {
            language: 'es',
            timezone: 'America/Los_Angeles',
            dateFormat: 'MM/DD/YYYY',
            timeFormat: '12h',
          },
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user.preferences.language).toBe('es');
    });

    test('enable two-factor authentication', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/users-me/2fa',
        {
          action: 'enable',
          method: 'sms',
          phoneNumber: parentUser.phone,
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.twoFactorEnabled).toBe(true);
      expect(data.backupCodes).toBeDefined();
    });

    test('disable two-factor authentication', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/users-me/2fa',
        {
          action: 'disable',
          confirmationCode: '123456',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.twoFactorEnabled).toBe(false);
    });
  });

  test.describe('Account Security', () => {
    test('get account security overview', async ({ request }) => {
      const response = await makeApiRequest(request, 'GET', '/api/users-me/security', null, {
        Authorization: `Bearer ${userToken}`,
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.securityStatus).toBeDefined();
      expect(data.lastLogin).toBeDefined();
      expect(data.activeDevices).toBeDefined();
      expect(data.securityScore).toBeDefined();
    });

    test('view login history', async ({ request }) => {
      const response = await makeApiRequest(request, 'GET', '/api/users-me/login-history', null, {
        Authorization: `Bearer ${userToken}`,
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.loginHistory)).toBe(true);
      expect(data.loginHistory[0]).toHaveProperty('timestamp');
      expect(data.loginHistory[0]).toHaveProperty('ipAddress');
      expect(data.loginHistory[0]).toHaveProperty('userAgent');
    });

    test('revoke device access', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/users-me/revoke-device',
        {
          deviceId: 'test-device-id',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.deviceRevoked).toBe(true);
    });

    test('request account deletion', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/users-me/delete-account',
        {
          reason: 'Testing account deletion flow',
          confirmPassword: parentUser.password,
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.deletionScheduled).toBe(true);
      expect(data.deletionDate).toBeDefined();
    });

    test('cancel account deletion', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/users-me/cancel-deletion',
        {
          confirmPassword: parentUser.password,
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.deletionCancelled).toBe(true);
    });
  });

  test.describe('Error Handling', () => {
    test('unauthorized access - no token', async ({ request }) => {
      const response = await makeApiRequest(request, 'GET', '/api/users-me');

      expect(response.status()).toBe(401);
    });

    test('invalid token format', async ({ request }) => {
      const response = await makeApiRequest(request, 'GET', '/api/users-me', null, {
        Authorization: 'Bearer invalid-token-format',
      });

      expect(response.status()).toBe(401);
    });

    test('expired token handling', async ({ request }) => {
      const response = await makeApiRequest(request, 'GET', '/api/users-me', null, {
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired.token',
      });

      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('expired');
    });

    test('concurrent profile updates - conflict handling', async ({ request }) => {
      // Simulate concurrent updates
      const promises = Array.from({ length: 5 }, () =>
        makeApiRequest(
          request,
          'PUT',
          '/api/users-me',
          {
            name: `Concurrent Update ${Date.now()}`,
          },
          {
            Authorization: `Bearer ${userToken}`,
          },
        ),
      );

      const responses = await Promise.all(promises);

      // At least one should succeed
      const successfulResponses = responses.filter((r) => r.status() === 200);
      expect(successfulResponses.length).toBeGreaterThan(0);
    });
  });
});
