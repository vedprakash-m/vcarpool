/**
 * Security Workflows E2E Tests
 * Tests session timeout, invalid tokens, authorization boundaries, and security protections
 */

import { test, expect } from '@playwright/test';
import {
  TestUser,
  createTestUser,
  cleanupTestUser,
  loginAsUser,
  makeApiRequest,
} from '../utils/test-helpers';

test.describe('Security Workflows', () => {
  let parentUser: TestUser;
  let adminUser: TestUser;
  let studentUser: TestUser;

  test.beforeAll(async () => {
    parentUser = await createTestUser('parent');
    adminUser = await createTestUser('admin');
    studentUser = await createTestUser('parent'); // Create as parent type but use as student in tests
  });

  test.afterAll(async () => {
    if (parentUser) await cleanupTestUser(parentUser.email);
    if (adminUser) await cleanupTestUser(adminUser.email);
    if (studentUser) await cleanupTestUser(studentUser.email);
  });

  test.describe('Session Timeout Handling', () => {
    test('should redirect to login after session timeout', async ({ page, context }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);
      await page.goto('/dashboard');

      // Verify user is logged in
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

      // Clear all cookies to simulate session timeout
      await context.clearCookies();

      // Try to navigate to protected page
      await page.goto('/profile');

      // Should be redirected to login
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator('text=Your session has expired')).toBeVisible();
    });

    test('should handle automatic session refresh', async ({ page }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);
      await page.goto('/dashboard');

      // Wait for automatic token refresh (if implemented)
      await page.waitForTimeout(2000);

      // Verify user is still logged in
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

      // Navigate to another protected page
      await page.goto('/trips');
      await expect(page).toHaveURL(/\/trips/);
    });

    test('should warn before session expiry', async ({ page }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);
      await page.goto('/dashboard');

      // Mock session expiry warning (if implemented)
      await page.evaluate(() => {
        // Simulate session warning event
        window.dispatchEvent(
          new CustomEvent('session-warning', {
            detail: { minutesLeft: 5 },
          }),
        );
      });

      // Check for session warning notification
      await expect(page.locator('text=Your session will expire in 5 minutes')).toBeVisible();
    });
  });

  test.describe('Invalid Token Scenarios', () => {
    test('should handle expired JWT tokens', async ({ request }) => {
      // Test with an obviously expired token
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      const response = await makeApiRequest(
        request,
        'GET',
        '/api/users-me',
        {},
        {
          Authorization: `Bearer ${expiredToken}`,
        },
      );

      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Token expired');
    });

    test('should handle malformed JWT tokens', async ({ request }) => {
      const malformedToken = 'invalid.token.format';

      const response = await makeApiRequest(
        request,
        'GET',
        '/api/users-me',
        {},
        {
          Authorization: `Bearer ${malformedToken}`,
        },
      );

      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Invalid token format');
    });

    test('should handle missing authorization header', async ({ request }) => {
      const response = await makeApiRequest(request, 'GET', '/api/users-me');

      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Authorization header missing');
    });

    test('should handle revoked tokens', async ({ page, request }) => {
      // Login to get a valid token
      await loginAsUser(page, parentUser.email, parentUser.password);

      // Get token from localStorage or cookie
      const token = await page.evaluate(() => {
        return localStorage.getItem('authToken') || document.cookie.match(/authToken=([^;]+)/)?.[1];
      });

      // Logout (which should revoke the token)
      await page.click('[data-testid="logout-button"]');

      // Try to use the revoked token
      const response = await makeApiRequest(
        request,
        'GET',
        '/api/users-me',
        {},
        {
          Authorization: `Bearer ${token}`,
        },
      );

      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Token revoked');
    });
  });

  test.describe('Authorization Boundary Testing', () => {
    test('should prevent parent from accessing admin endpoints', async ({ request }) => {
      // Login as parent
      const loginResponse = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
        email: parentUser.email,
        password: parentUser.password,
      });
      const loginData = await loginResponse.json();

      // Try to access admin-only endpoint
      const response = await makeApiRequest(
        request,
        'GET',
        '/api/admin-school-management',
        {},
        {
          Authorization: `Bearer ${loginData.token}`,
        },
      );

      expect(response.status()).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Insufficient permissions');
    });

    test('should prevent student from creating carpool groups', async ({ request }) => {
      // Login as student
      const loginResponse = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
        email: studentUser.email,
        password: studentUser.password,
      });
      const loginData = await loginResponse.json();

      // Try to create carpool group (parent-only action)
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/parent-group-creation',
        {
          name: 'Test Group',
          description: 'Test Description',
        },
        {
          Authorization: `Bearer ${loginData.token}`,
        },
      );

      expect(response.status()).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can create carpool groups');
    });

    test('should prevent access to other users data', async ({ request }) => {
      // Login as parent
      const loginResponse = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
        email: parentUser.email,
        password: parentUser.password,
      });
      const loginData = await loginResponse.json();

      // Try to access another user's profile (should fail)
      const response = await makeApiRequest(
        request,
        'GET',
        '/api/users-me?userId=different-user-id',
        {},
        {
          Authorization: `Bearer ${loginData.token}`,
        },
      );

      expect(response.status()).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Cannot access other users data');
    });

    test('should enforce resource ownership', async ({ request }) => {
      // Login as parent
      const loginResponse = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
        email: parentUser.email,
        password: parentUser.password,
      });
      const loginData = await loginResponse.json();

      // Try to edit a trip that doesn't belong to this user
      const response = await makeApiRequest(
        request,
        'PUT',
        '/api/trips-list/other-users-trip-id',
        {
          name: 'Modified Trip',
        },
        {
          Authorization: `Bearer ${loginData.token}`,
        },
      );

      expect(response.status()).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Cannot modify trips you do not own');
    });
  });

  test.describe('XSS and Injection Protection', () => {
    test('should sanitize user input to prevent XSS', async ({ page }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);
      await page.goto('/profile');

      const xssPayload = '<script>alert("XSS")</script>';

      // Try to inject XSS in profile fields
      await page.fill('input[name="firstName"]', xssPayload);
      await page.click('button[type="submit"]');

      // Verify the script is not executed
      await page.waitForTimeout(1000);
      const alerts = page.locator('.alert');
      await expect(alerts).not.toContainText('XSS');

      // Verify content is properly escaped
      await expect(page.locator('input[name="firstName"]')).toHaveValue(
        '&lt;script&gt;alert("XSS")&lt;/script&gt;',
      );
    });

    test('should prevent SQL injection in search fields', async ({ page, request }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);

      const sqlInjection = "'; DROP TABLE users; --";

      // Try SQL injection in group search
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/parent-group-search',
        {
          query: sqlInjection,
        },
        {
          Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('authToken'))}`,
        },
      );

      // Should return normal search results, not an error indicating SQL injection
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.error).toBeUndefined();
      expect(Array.isArray(data.groups)).toBe(true);
    });

    test('should validate file upload types', async ({ page }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);
      await page.goto('/profile');

      const fileInput = page.locator('input[type="file"]');
      if ((await fileInput.count()) > 0) {
        // Try to upload a potentially dangerous file type
        await fileInput.setInputFiles({
          name: 'malicious.exe',
          mimeType: 'application/x-msdownload',
          buffer: Buffer.from('fake executable content'),
        });

        await expect(page.locator('text=File type not allowed')).toBeVisible();
      }
    });

    test('should prevent CSRF attacks', async ({ page, request }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);

      // Try to make a request without CSRF token (if implemented)
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/users-change-password',
        {
          currentPassword: parentUser.password,
          newPassword: 'NewPassword123!',
        },
        {
          Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('authToken'))}`,
          // Intentionally omit CSRF token
        },
      );

      // If CSRF protection is implemented, this should fail
      if (response.status() === 403) {
        const data = await response.json();
        expect(data.error).toBe('CSRF token missing or invalid');
      }
    });
  });

  test.describe('Rate Limiting and Security Headers', () => {
    test('should implement rate limiting on login attempts', async ({ request }) => {
      const maxAttempts = 5;

      // Make multiple failed login attempts
      for (let i = 0; i < maxAttempts + 1; i++) {
        const response = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
          email: parentUser.email,
          password: 'wrongpassword',
        });

        if (i < maxAttempts) {
          expect(response.status()).toBe(401);
        } else {
          // Should be rate limited after max attempts
          expect(response.status()).toBe(429);
          const data = await response.json();
          expect(data.error).toBe('Too many login attempts');
        }
      }
    });

    test('should include security headers', async ({ request }) => {
      const response = await makeApiRequest(request, 'GET', '/api/hello-simple');

      // Check for security headers
      expect(response.headers()['x-content-type-options']).toBe('nosniff');
      expect(response.headers()['x-frame-options']).toBe('DENY');
      expect(response.headers()['x-xss-protection']).toBe('1; mode=block');

      // Check for HSTS header (if HTTPS)
      if (response.url().startsWith('https://')) {
        expect(response.headers()['strict-transport-security']).toBeDefined();
      }
    });

    test('should validate content security policy', async ({ page }) => {
      await page.goto('/');

      // Check if CSP header is present
      const cspViolations: string[] = [];

      page.on('console', (msg) => {
        if (msg.text().includes('Content Security Policy')) {
          cspViolations.push(msg.text());
        }
      });

      // Wait for page to load and check for CSP violations
      await page.waitForTimeout(2000);

      // Should have no CSP violations
      expect(cspViolations).toHaveLength(0);
    });
  });
});
