/**
 * Comprehensive API Endpoints E2E Tests
 * Tests all backend API endpoints for functionality, authentication, and error handling
 */

import { test, expect, Page } from '@playwright/test';
import {
  TestUser,
  createTestUser,
  cleanupTestUser,
  loginAsUser,
  makeApiRequest,
} from '../utils/test-helpers';

test.describe('Backend API Endpoints', () => {
  let parentUser: TestUser;
  let adminUser: TestUser;

  test.beforeAll(async () => {
    // Create test users for different roles
    parentUser = await createTestUser('parent');
    adminUser = await createTestUser('admin');
  });

  test.afterAll(async () => {
    // Cleanup test users
    if (parentUser) await cleanupTestUser(parentUser.email);
    if (adminUser) await cleanupTestUser(adminUser.email);
  });

  test.describe('Authentication Endpoints', () => {
    test('auth-login-simple - successful login', async ({ request }) => {
      const response = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
        email: parentUser.email,
        password: parentUser.password,
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.token).toBeDefined();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(parentUser.email);
    });

    test('auth-login-simple - invalid credentials', async ({ request }) => {
      const response = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
        email: parentUser.email,
        password: 'wrongpassword',
      });

      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('Invalid credentials');
    });

    test('auth-register-secure - successful registration', async ({ request }) => {
      const newUser = await createTestUser('parent', false); // Don't save to DB yet

      const response = await makeApiRequest(request, 'POST', '/api/auth-register-secure', {
        familyName: `${newUser.name} Family`,
        parent: {
          firstName: newUser.name.split(' ')[0],
          lastName: newUser.name.split(' ')[1] || 'Doe',
          email: newUser.email,
          password: newUser.password,
          phone: newUser.phone,
        },
        homeAddress: {
          street: '123 Test Street',
          city: 'Redmond',
          state: 'WA',
          zipCode: '98052',
        },
        children: [
          {
            firstName: 'Test',
            lastName: 'Child',
            grade: '9',
            school: 'Tesla STEM High School',
          },
        ],
      });

      expect(response.status()).toBe(201);
      const data = await response.json();
      expect(data.user).toBeDefined();
      expect(data.token).toBeDefined();

      // Cleanup
      await cleanupTestUser(newUser.email);
    });

    test('auth-refresh-token - valid token refresh', async ({ request }) => {
      // First login to get a token
      const loginResponse = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
        email: parentUser.email,
        password: parentUser.password,
      });
      const loginData = await loginResponse.json();

      // Test token refresh
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/auth-refresh-token',
        {},
        {
          Authorization: `Bearer ${loginData.token}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.token).toBeDefined();
      expect(data.token).not.toBe(loginData.token); // Should be a new token
    });
  });

  test.describe('User Management Endpoints', () => {
    let userToken: string;

    test.beforeAll(async ({ request }) => {
      // Get auth token for protected endpoints
      const loginResponse = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
        email: parentUser.email,
        password: parentUser.password,
      });
      const loginData = await loginResponse.json();
      userToken = loginData.token;
    });

    test('users-me - get current user profile', async ({ request }) => {
      const response = await makeApiRequest(request, 'GET', '/api/users-me', null, {
        Authorization: `Bearer ${userToken}`,
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(parentUser.email);
    });

    test('users-change-password - successful password change', async ({ request }) => {
      const newPassword = 'newPassword123!';

      const response = await makeApiRequest(
        request,
        'POST',
        '/api/users-change-password',
        {
          currentPassword: parentUser.password,
          newPassword: newPassword,
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);

      // Change back to original password for cleanup
      await makeApiRequest(
        request,
        'POST',
        '/api/users-change-password',
        {
          currentPassword: newPassword,
          newPassword: parentUser.password,
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );
    });

    test('users-change-password - invalid current password', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/users-change-password',
        {
          currentPassword: 'wrongpassword',
          newPassword: 'newPassword123!',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Current password is incorrect');
    });
  });

  test.describe('Trip Management Endpoints', () => {
    let userToken: string;

    test.beforeAll(async ({ request }) => {
      const loginResponse = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
        email: parentUser.email,
        password: parentUser.password,
      });
      const loginData = await loginResponse.json();
      userToken = loginData.token;
    });

    test('trips-list - get user trips', async ({ request }) => {
      const response = await makeApiRequest(request, 'GET', '/api/trips-list', null, {
        Authorization: `Bearer ${userToken}`,
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.trips)).toBe(true);
    });

    test('trips-stats - get trip statistics', async ({ request }) => {
      const response = await makeApiRequest(request, 'GET', '/api/trips-stats', null, {
        Authorization: `Bearer ${userToken}`,
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.totalTrips).toBeDefined();
      expect(data.completedTrips).toBeDefined();
      expect(data.upcomingTrips).toBeDefined();
    });
  });

  test.describe('Address Validation Endpoints', () => {
    test('address-validation - valid address', async ({ request }) => {
      const response = await makeApiRequest(request, 'POST', '/api/address-validation', {
        street: '1 Microsoft Way',
        city: 'Redmond',
        state: 'WA',
        zipCode: '98052',
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.isValid).toBe(true);
      expect(data.standardizedAddress).toBeDefined();
    });

    test('address-validation - invalid address', async ({ request }) => {
      const response = await makeApiRequest(request, 'POST', '/api/address-validation', {
        street: 'Invalid Street Name 99999',
        city: 'NonexistentCity',
        state: 'XX',
        zipCode: '00000',
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.isValid).toBe(false);
      expect(data.errors).toBeDefined();
    });

    test('universal-address-validation - comprehensive validation', async ({ request }) => {
      const response = await makeApiRequest(request, 'POST', '/api/universal-address-validation', {
        street: '123 Main Street',
        city: 'Redmond',
        state: 'WA',
        zipCode: '98052',
        validateSchoolZone: true,
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.isValid).toBeDefined();
      expect(data.inSchoolZone).toBeDefined();
      expect(data.distanceToSchool).toBeDefined();
    });
  });

  test.describe('Parent Operations Endpoints', () => {
    let userToken: string;

    test.beforeAll(async ({ request }) => {
      const loginResponse = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
        email: parentUser.email,
        password: parentUser.password,
      });
      const loginData = await loginResponse.json();
      userToken = loginData.token;
    });

    test('parent-group-search - search for carpool groups', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'GET',
        '/api/parent-group-search?radius=5&grade=9',
        null,
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.groups)).toBe(true);
    });

    test('parent-group-creation - create new carpool group', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/parent-group-creation',
        {
          name: 'Test Carpool Group',
          description: 'Test group for E2E testing',
          schoolId: 'tesla-stem',
          maxMembers: 4,
          schedule: {
            monday: { departure: '07:30', return: '15:30' },
            tuesday: { departure: '07:30', return: '15:30' },
            wednesday: { departure: '07:30', return: '15:30' },
            thursday: { departure: '07:30', return: '15:30' },
            friday: { departure: '07:30', return: '15:30' },
          },
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(201);
      const data = await response.json();
      expect(data.group).toBeDefined();
      expect(data.group.id).toBeDefined();
    });

    test('parents-weekly-preferences-simple - submit weekly preferences', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/parents-weekly-preferences-simple',
        {
          week: '2025-06-23',
          preferences: {
            monday: { available: true, canDrive: true },
            tuesday: { available: true, canDrive: false },
            wednesday: { available: false, canDrive: false },
            thursday: { available: true, canDrive: true },
            friday: { available: true, canDrive: false },
          },
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  test.describe('Notification Endpoints', () => {
    let userToken: string;

    test.beforeAll(async ({ request }) => {
      const loginResponse = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
        email: parentUser.email,
        password: parentUser.password,
      });
      const loginData = await loginResponse.json();
      userToken = loginData.token;
    });

    test('push-subscribe - register for push notifications', async ({ request }) => {
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
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('notifications-history - get notification history', async ({ request }) => {
      const response = await makeApiRequest(request, 'GET', '/api/notifications-history', null, {
        Authorization: `Bearer ${userToken}`,
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.notifications)).toBe(true);
    });
  });

  test.describe('Admin Endpoints', () => {
    let adminToken: string;

    test.beforeAll(async ({ request }) => {
      const loginResponse = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
        email: adminUser.email,
        password: adminUser.password,
      });
      const loginData = await loginResponse.json();
      adminToken = loginData.token;
    });

    test('admin-carpool-groups - get all carpool groups', async ({ request }) => {
      const response = await makeApiRequest(request, 'GET', '/api/admin-carpool-groups', null, {
        Authorization: `Bearer ${adminToken}`,
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.groups)).toBe(true);
    });

    test('admin-join-requests - get pending join requests', async ({ request }) => {
      const response = await makeApiRequest(request, 'GET', '/api/admin-join-requests', null, {
        Authorization: `Bearer ${adminToken}`,
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.requests)).toBe(true);
    });

    test('admin-role-management - unauthorized access denied', async ({ request }) => {
      // Test with regular user token
      const loginResponse = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
        email: parentUser.email,
        password: parentUser.password,
      });
      const parentData = await loginResponse.json();

      const response = await makeApiRequest(request, 'GET', '/api/admin-role-management', null, {
        Authorization: `Bearer ${parentData.token}`,
      });

      expect(response.status()).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Insufficient permissions');
    });
  });

  test.describe('Security & Verification Endpoints', () => {
    let userToken: string;

    test.beforeAll(async ({ request }) => {
      const loginResponse = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
        email: parentUser.email,
        password: parentUser.password,
      });
      const loginData = await loginResponse.json();
      userToken = loginData.token;
    });

    test('phone-verification - request verification code', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/phone-verification',
        {
          phoneNumber: parentUser.phone,
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
    });

    test('emergency-contact-verification - verify emergency contact', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/emergency-contact-verification',
        {
          contactName: 'Emergency Contact',
          contactPhone: '+1234567890',
          relationship: 'Grandparent',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  test.describe('Trip Management Endpoints', () => {
    let userToken: string;

    test.beforeAll(async ({ request }) => {
      const loginResponse = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
        email: parentUser.email,
        password: parentUser.password,
      });
      const loginData = await loginResponse.json();
      userToken = loginData.token;
    });

    test('trips-list - comprehensive user trips (parent)', async ({ request }) => {
      const response = await makeApiRequest(request, 'GET', '/api/trips-list', null, {
        Authorization: `Bearer ${userToken}`,
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.trips)).toBe(true);
    });

    test('trips-stats - comprehensive trip statistics (parent)', async ({ request }) => {
      const response = await makeApiRequest(request, 'GET', '/api/trips-stats', null, {
        Authorization: `Bearer ${userToken}`,
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.totalTrips).toBeDefined();
      expect(data.totalMiles).toBeDefined();
    });

    test('trips-stats-db - get database trip statistics', async ({ request }) => {
      const response = await makeApiRequest(request, 'GET', '/api/trips-stats-db', null, {
        Authorization: `Bearer ${userToken}`,
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.stats).toBeDefined();
    });
  });

  test.describe('Parent Features Endpoints', () => {
    let userToken: string;

    test.beforeAll(async ({ request }) => {
      const loginResponse = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
        email: parentUser.email,
        password: parentUser.password,
      });
      const loginData = await loginResponse.json();
      userToken = loginData.token;
    });

    test('parent-group-creation - create carpool group', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/parent-group-creation',
        {
          name: 'Test Carpool Group',
          school: 'Lincoln Elementary',
          maxCapacity: 4,
          schedule: {
            days: ['Monday', 'Wednesday', 'Friday'],
            pickupTime: '08:00',
            dropoffTime: '15:30',
          },
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.groupId).toBeDefined();
      expect(data.success).toBe(true);
    });

    test('parent-group-search - search for carpool groups', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/parent-group-search',
        {
          school: 'Lincoln Elementary',
          radius: 5,
          preferences: {
            pickupTimeRange: ['07:30', '08:30'],
            days: ['Monday', 'Wednesday', 'Friday'],
          },
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.groups)).toBe(true);
    });

    test('parent-swap-requests - submit swap request', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/parent-swap-requests',
        {
          originalDate: '2025-06-25',
          requestedDate: '2025-06-26',
          reason: 'Doctor appointment',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.requestId).toBeDefined();
    });

    test('parents-weekly-preferences-simple - set weekly preferences', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/parents-weekly-preferences-simple',
        {
          weekOf: '2025-06-23',
          preferences: {
            Monday: { available: true, preferredTime: '08:00' },
            Wednesday: { available: true, preferredTime: '08:00' },
            Friday: { available: false },
          },
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('traveling-parent-makeup - handle traveling parent scenarios', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/traveling-parent-makeup',
        {
          startDate: '2025-06-30',
          endDate: '2025-07-07',
          alternateArrangements: 'Grandparent pickup',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  test.describe('Additional Admin Endpoints', () => {
    let adminToken: string;

    test.beforeAll(async ({ request }) => {
      const loginResponse = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
        email: adminUser.email,
        password: adminUser.password,
      });
      const loginData = await loginResponse.json();
      adminToken = loginData.token;
    });

    test('admin-assignment-reminders - send assignment reminders', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/admin-assignment-reminders',
        {
          groupId: 'test-group-id',
          reminderType: 'weekly',
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.sent).toBeDefined();
    });

    test('admin-driver-selection - manage driver assignments', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/admin-driver-selection',
        {
          groupId: 'test-group-id',
          driverId: 'test-driver-id',
          week: '2025-06-23',
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('admin-generate-schedule-simple - generate group schedule', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/admin-generate-schedule-simple',
        {
          groupId: 'test-group-id',
          startDate: '2025-06-23',
          endDate: '2025-06-30',
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.schedule).toBeDefined();
    });

    test('admin-group-lifecycle - manage group lifecycle', async ({ request }) => {
      const response = await makeApiRequest(request, 'GET', '/api/admin-group-lifecycle', null, {
        Authorization: `Bearer ${adminToken}`,
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.groups).toBeDefined();
    });

    test('admin-parent-assignments - manage parent assignments', async ({ request }) => {
      const response = await makeApiRequest(request, 'GET', '/api/admin-parent-assignments', null, {
        Authorization: `Bearer ${adminToken}`,
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.assignments).toBeDefined();
    });

    test('admin-prefs-status - check preferences status', async ({ request }) => {
      const response = await makeApiRequest(request, 'GET', '/api/admin-prefs-status', null, {
        Authorization: `Bearer ${adminToken}`,
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.status).toBeDefined();
    });

    test('admin-schedule-templates - manage schedule templates', async ({ request }) => {
      const response = await makeApiRequest(request, 'GET', '/api/admin-schedule-templates', null, {
        Authorization: `Bearer ${adminToken}`,
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.templates)).toBe(true);
    });

    test('admin-school-management - manage schools', async ({ request }) => {
      const response = await makeApiRequest(request, 'GET', '/api/admin-school-management', null, {
        Authorization: `Bearer ${adminToken}`,
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.schools)).toBe(true);
    });

    test('admin-swap-requests - manage swap requests', async ({ request }) => {
      const response = await makeApiRequest(request, 'GET', '/api/admin-swap-requests', null, {
        Authorization: `Bearer ${adminToken}`,
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.requests)).toBe(true);
    });

    test('admin-weekly-scheduling - manage weekly scheduling', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/admin-weekly-scheduling',
        {
          week: '2025-06-23',
          groupId: 'test-group-id',
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.schedule).toBeDefined();
    });
  });

  test.describe('Error Handling & Edge Cases', () => {
    let userToken: string;

    test.beforeAll(async ({ request }) => {
      const loginResponse = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
        email: parentUser.email,
        password: parentUser.password,
      });
      const loginData = await loginResponse.json();
      userToken = loginData.token;
    });

    test('invalid endpoint - 404 error', async ({ request }) => {
      const response = await makeApiRequest(request, 'GET', '/api/non-existent-endpoint', null, {
        Authorization: `Bearer ${userToken}`,
      });

      expect(response.status()).toBe(404);
    });

    test('missing authorization - 401 error', async ({ request }) => {
      const response = await makeApiRequest(request, 'GET', '/api/users-me');

      expect(response.status()).toBe(401);
    });

    test('invalid token - 401 error', async ({ request }) => {
      const response = await makeApiRequest(request, 'GET', '/api/users-me', null, {
        Authorization: 'Bearer invalid-token',
      });

      expect(response.status()).toBe(401);
    });

    test('malformed request body - 400 error', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/parent-group-creation',
        {
          invalidField: 'test',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(400);
    });
  });
});
