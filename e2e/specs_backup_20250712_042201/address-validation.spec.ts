/**
 * Address Validation E2E Tests
 * Tests address validation workflows, geographic boundary checking, and secure validation
 */

import { test, expect } from '@playwright/test';
import { TestUser, createTestUser, cleanupTestUser, makeApiRequest } from '../utils/test-helpers';

test.describe('Address Validation System', () => {
  let parentUser: TestUser;
  let userToken: string;

  test.beforeAll(async ({ request }) => {
    parentUser = await createTestUser('parent');

    const loginResponse = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
      email: parentUser.email,
      password: parentUser.password,
    });
    const loginData = await loginResponse.json();
    userToken = loginData.token;
  });

  test.afterAll(async () => {
    if (parentUser) await cleanupTestUser(parentUser.email);
  });

  test.describe('Basic Address Validation', () => {
    test('validate valid address - success', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/address-validation',
        {
          street: '123 Main Street',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94105',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.isValid).toBe(true);
      expect(data.standardizedAddress).toBeDefined();
      expect(data.coordinates).toBeDefined();
      expect(data.coordinates.latitude).toBeDefined();
      expect(data.coordinates.longitude).toBeDefined();
    });

    test('validate invalid address - failure', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/address-validation',
        {
          street: 'Invalid Street Name 99999',
          city: 'NonExistentCity',
          state: 'XX',
          zipCode: '00000',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.isValid).toBe(false);
      expect(data.errors).toBeDefined();
      expect(Array.isArray(data.errors)).toBe(true);
    });

    test('validate incomplete address - validation error', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/address-validation',
        {
          street: '123 Main Street',
          city: '',
          state: 'CA',
          zipCode: '94105',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('city');
    });
  });

  test.describe('Secure Address Validation', () => {
    test('secure validation with authentication', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/address-validation-secure',
        {
          street: '456 Oak Avenue',
          city: 'Palo Alto',
          state: 'CA',
          zipCode: '94301',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.isValid).toBe(true);
      expect(data.standardizedAddress).toBeDefined();
      expect(data.securityLevel).toBe('authenticated');
    });

    test('secure validation without authentication - unauthorized', async ({ request }) => {
      const response = await makeApiRequest(request, 'POST', '/api/address-validation-secure', {
        street: '456 Oak Avenue',
        city: 'Palo Alto',
        state: 'CA',
        zipCode: '94301',
      });

      expect(response.status()).toBe(401);
    });
  });

  test.describe('Universal Address Validation', () => {
    test('universal validation with comprehensive data', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/universal-address-validation',
        {
          address: {
            street: '789 Pine Street',
            city: 'San Jose',
            state: 'CA',
            zipCode: '95110',
            country: 'USA',
          },
          options: {
            includeCoordinates: true,
            includeTimezone: true,
            includeBoundaries: true,
          },
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.isValid).toBe(true);
      expect(data.standardizedAddress).toBeDefined();
      expect(data.coordinates).toBeDefined();
      expect(data.timezone).toBeDefined();
      expect(data.boundaries).toBeDefined();
    });
  });

  test.describe('Geographic Boundary Checking', () => {
    test('address within school district - valid', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/address-validation',
        {
          street: '123 School District Avenue',
          city: 'Palo Alto',
          state: 'CA',
          zipCode: '94301',
          validateBoundaries: true,
          schoolDistrict: 'Palo Alto Unified',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.isValid).toBe(true);
      expect(data.withinBoundaries).toBe(true);
      expect(data.schoolDistrict).toBe('Palo Alto Unified');
    });

    test('address outside school district - boundary violation', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/address-validation',
        {
          street: '999 Far Away Street',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90210',
          validateBoundaries: true,
          schoolDistrict: 'Palo Alto Unified',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.isValid).toBe(true);
      expect(data.withinBoundaries).toBe(false);
      expect(data.boundaryViolation).toBeDefined();
    });

    test('validate service area radius', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/address-validation',
        {
          street: '321 Nearby Street',
          city: 'Mountain View',
          state: 'CA',
          zipCode: '94041',
          validateRadius: true,
          centerPoint: {
            latitude: 37.4419,
            longitude: -122.143,
          },
          maxRadius: 10, // miles
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.isValid).toBe(true);
      expect(data.withinRadius).toBeDefined();
      expect(data.distanceFromCenter).toBeDefined();
    });
  });

  test.describe('Batch Address Validation', () => {
    test('validate multiple addresses', async ({ request }) => {
      const addresses = [
        {
          id: 'addr1',
          street: '123 First Street',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94105',
        },
        {
          id: 'addr2',
          street: '456 Second Avenue',
          city: 'San Jose',
          state: 'CA',
          zipCode: '95110',
        },
        {
          id: 'addr3',
          street: 'Invalid Address',
          city: 'Nowhere',
          state: 'XX',
          zipCode: '00000',
        },
      ];

      const response = await makeApiRequest(
        request,
        'POST',
        '/api/address-validation',
        {
          addresses,
          batchMode: true,
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.results)).toBe(true);
      expect(data.results).toHaveLength(3);

      // Check valid addresses
      expect(data.results[0].isValid).toBe(true);
      expect(data.results[1].isValid).toBe(true);

      // Check invalid address
      expect(data.results[2].isValid).toBe(false);
    });
  });

  test.describe('Error Handling', () => {
    test('invalid request format - validation error', async ({ request }) => {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/address-validation',
        {
          invalidField: 'test',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('rate limit exceeded - too many requests', async ({ request }) => {
      // Make multiple rapid requests to trigger rate limiting
      const promises = Array.from({ length: 50 }, () =>
        makeApiRequest(
          request,
          'POST',
          '/api/address-validation',
          {
            street: '123 Test Street',
            city: 'Test City',
            state: 'CA',
            zipCode: '12345',
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
});
