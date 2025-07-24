/**
 * Performance Workflows E2E Tests
 * Tests page load times, large dataset handling, concurrent users, and memory leak detection
 */

import { test, expect } from '@playwright/test';
import {
  TestUser,
  createTestUser,
  cleanupTestUser,
  loginAsUser,
  makeApiRequest,
} from '../utils/test-helpers';

test.describe('Performance Workflows', () => {
  let parentUser: TestUser;
  let adminUser: TestUser;

  test.beforeAll(async () => {
    parentUser = await createTestUser('parent');
    adminUser = await createTestUser('admin');
  });

  test.afterAll(async () => {
    if (parentUser) await cleanupTestUser(parentUser.email);
    if (adminUser) await cleanupTestUser(adminUser.email);
  });

  test.describe('Page Load Time Validation', () => {
    test('should load login page within 2 seconds', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/login');

      // Wait for main content to be visible
      await expect(page.locator('form')).toBeVisible();

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000);
    });

    test('should load dashboard within 3 seconds after login', async ({ page }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);

      const startTime = Date.now();
      await page.goto('/dashboard');

      // Wait for dashboard content to be fully loaded
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000);
    });

    test('should load trips page efficiently', async ({ page }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);

      const startTime = Date.now();
      await page.goto('/trips');

      // Wait for trips to be loaded
      await expect(page.locator('[data-testid="trips-container"]')).toBeVisible();

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2500);
    });

    test('should handle slow network conditions gracefully', async ({ page, context }) => {
      // Simulate slow network
      await context.route('**/*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        await route.continue();
      });

      const startTime = Date.now();
      await page.goto('/');

      // Should show loading indicator
      await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();

      // Eventually load
      await expect(page.locator('main')).toBeVisible();

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(8000); // More lenient for slow network
    });
  });

  test.describe('Large Dataset Handling', () => {
    test('should handle large number of trips efficiently', async ({ page, request }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);

      // Create multiple test trips via API (simulate large dataset)
      const tripPromises: Promise<any>[] = [];
      for (let i = 0; i < 50; i++) {
        tripPromises.push(
          makeApiRequest(
            request,
            'POST',
            '/api/trips-list',
            {
              name: `Test Trip ${i}`,
              date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
              capacity: 4,
            },
            {
              Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('authToken'))}`,
            },
          ),
        );
      }

      await Promise.all(tripPromises);

      const startTime = Date.now();
      await page.goto('/trips');

      // Should handle large number of trips
      await expect(page.locator('[data-testid="trip-item"]')).toHaveCount(50);

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000);

      // Test pagination or virtual scrolling
      const pagination = page.locator('[data-testid="pagination"]');
      if ((await pagination.count()) > 0) {
        await expect(pagination).toBeVisible();

        // Test pagination performance
        const paginationStart = Date.now();
        await page.click('[data-testid="next-page"]');
        await expect(page.locator('[data-testid="trip-item"]')).toBeVisible();
        const paginationTime = Date.now() - paginationStart;
        expect(paginationTime).toBeLessThan(1000);
      }
    });

    test('should handle large user lists in admin panel', async ({ page, request }) => {
      await loginAsUser(page, adminUser.email, adminUser.password);

      // Navigate to admin users page
      await page.goto('/admin/users');

      // Should load efficiently even with many users
      const startTime = Date.now();
      await expect(page.locator('[data-testid="users-table"]')).toBeVisible();

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(4000);

      // Test search performance with large dataset
      const searchStart = Date.now();
      await page.fill('input[data-testid="user-search"]', 'test');
      await page.waitForTimeout(500); // Debounce delay

      const searchTime = Date.now() - searchStart;
      expect(searchTime).toBeLessThan(2000);
    });

    test('should handle complex group management efficiently', async ({ page }) => {
      await loginAsUser(page, adminUser.email, adminUser.password);
      await page.goto('/admin/groups');

      // Test loading many groups
      const startTime = Date.now();
      await expect(page.locator('[data-testid="groups-grid"]')).toBeVisible();

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000);

      // Test group details modal performance
      if ((await page.locator('[data-testid="group-card"]').count()) > 0) {
        const modalStart = Date.now();
        await page.click('[data-testid="group-card"]');
        await expect(page.locator('[data-testid="group-details-modal"]')).toBeVisible();

        const modalTime = Date.now() - modalStart;
        expect(modalTime).toBeLessThan(1500);
      }
    });
  });

  test.describe('Concurrent User Scenarios', () => {
    test('should handle multiple simultaneous logins', async ({ browser }) => {
      const contexts: any[] = [];
      const loginPromises: Promise<void>[] = [];

      // Create multiple browser contexts for concurrent users
      for (let i = 0; i < 5; i++) {
        const context = await browser.newContext();
        contexts.push(context);

        const page = await context.newPage();
        loginPromises.push(loginAsUser(page, parentUser.email, parentUser.password));
      }

      const startTime = Date.now();
      await Promise.all(loginPromises);
      const totalTime = Date.now() - startTime;

      // All logins should complete within reasonable time
      expect(totalTime).toBeLessThan(10000);

      // Cleanup
      for (const context of contexts) {
        await context.close();
      }
    });

    test('should handle concurrent trip creation', async ({ browser, request }) => {
      const contexts: any[] = [];
      const tripCreationPromises: Promise<any>[] = [];

      // Create multiple browser contexts
      for (let i = 0; i < 3; i++) {
        const context = await browser.newContext();
        contexts.push(context);

        const page = await context.newPage();
        await loginAsUser(page, parentUser.email, parentUser.password);

        // Create trips concurrently
        tripCreationPromises.push(
          makeApiRequest(
            request,
            'POST',
            '/api/trips-list',
            {
              name: `Concurrent Trip ${i}`,
              date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
              capacity: 4,
            },
            {
              Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('authToken'))}`,
            },
          ),
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(tripCreationPromises);
      const totalTime = Date.now() - startTime;

      // All trips should be created successfully
      responses.forEach((response) => {
        expect(response.status()).toBe(201);
      });

      expect(totalTime).toBeLessThan(5000);

      // Cleanup
      for (const context of contexts) {
        await context.close();
      }
    });

    test('should maintain session isolation between users', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      // Login different users in different contexts
      await loginAsUser(page1, parentUser.email, parentUser.password);
      await loginAsUser(page2, adminUser.email, adminUser.password);

      // Navigate both to dashboard
      await page1.goto('/dashboard');
      await page2.goto('/dashboard');

      // Verify each sees their own data
      const user1Data = await page1.locator('[data-testid="user-info"]').textContent();
      const user2Data = await page2.locator('[data-testid="user-info"]').textContent();

      expect(user1Data).toContain(parentUser.email);
      expect(user2Data).toContain(adminUser.email);
      expect(user1Data).not.toBe(user2Data);

      await context1.close();
      await context2.close();
    });
  });

  test.describe('Memory Leak Detection', () => {
    test('should not leak memory during navigation', async ({ page }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);

      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // Navigate through multiple pages
      const pages = ['/dashboard', '/trips', '/profile', '/trips/create', '/dashboard'];

      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);
      }

      // Force garbage collection if possible
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });

      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // Memory should not increase dramatically
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;

        // Should not increase by more than 50%
        expect(memoryIncreasePercent).toBeLessThan(50);
      }
    });

    test('should clean up event listeners', async ({ page }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);
      await page.goto('/trips');

      // Count initial event listeners
      const initialListeners = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        let count = 0;
        elements.forEach((el) => {
          const events = (el as any)._events || {};
          count += Object.keys(events).length;
        });
        return count;
      });

      // Add some dynamic content that might create listeners
      await page.click('[data-testid="create-trip-button"]');
      await page.waitForSelector('[data-testid="trip-form"]');

      // Cancel and go back
      await page.click('[data-testid="cancel-button"]');
      await page.waitForTimeout(500);

      // Check if listeners were cleaned up
      const finalListeners = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        let count = 0;
        elements.forEach((el) => {
          const events = (el as any)._events || {};
          count += Object.keys(events).length;
        });
        return count;
      });

      // Should not accumulate too many listeners
      expect(finalListeners - initialListeners).toBeLessThan(10);
    });

    test('should handle rapid state updates efficiently', async ({ page }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);
      await page.goto('/trips/create');

      const startTime = Date.now();

      // Simulate rapid typing in form fields
      const rapidInputs = [
        { selector: 'input[name="tripName"]', value: 'Rapid Update Test Trip' },
        { selector: 'input[name="description"]', value: 'Testing rapid state updates' },
        { selector: 'input[name="capacity"]', value: '4' },
      ];

      for (const input of rapidInputs) {
        await page.fill(input.selector, '');

        // Type character by character quickly
        for (const char of input.value) {
          await page.type(input.selector, char, { delay: 10 });
        }
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should handle rapid updates efficiently
      expect(totalTime).toBeLessThan(5000);

      // UI should remain responsive
      await expect(page.locator('button[type="submit"]')).toBeEnabled();
    });
  });

  test.describe('API Performance', () => {
    test('should handle API requests efficiently', async ({ request }) => {
      // Login to get token
      const loginResponse = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
        email: parentUser.email,
        password: parentUser.password,
      });
      const { token } = await loginResponse.json();

      // Test multiple API calls
      const apiCalls = [
        () =>
          makeApiRequest(request, 'GET', '/api/users-me', {}, { Authorization: `Bearer ${token}` }),
        () =>
          makeApiRequest(
            request,
            'GET',
            '/api/trips-list',
            {},
            { Authorization: `Bearer ${token}` },
          ),
        () =>
          makeApiRequest(
            request,
            'GET',
            '/api/notifications-history',
            {},
            { Authorization: `Bearer ${token}` },
          ),
      ];

      const startTime = Date.now();
      const responses = await Promise.all(apiCalls.map((call) => call()));
      const totalTime = Date.now() - startTime;

      // All API calls should complete quickly
      expect(totalTime).toBeLessThan(3000);

      // All responses should be successful
      responses.forEach((response) => {
        expect(response.status()).toBeLessThanOrEqual(299);
      });
    });

    test('should handle API rate limiting gracefully', async ({ request }) => {
      const loginResponse = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
        email: parentUser.email,
        password: parentUser.password,
      });
      const { token } = await loginResponse.json();

      // Make many rapid API calls
      const rapidCalls: Promise<any>[] = [];
      for (let i = 0; i < 20; i++) {
        rapidCalls.push(
          makeApiRequest(request, 'GET', '/api/users-me', {}, { Authorization: `Bearer ${token}` }),
        );
      }

      const responses = await Promise.all(rapidCalls);

      // Should either all succeed or gracefully handle rate limiting
      const successCount = responses.filter((r) => r.status() === 200).length;
      const rateLimitedCount = responses.filter((r) => r.status() === 429).length;

      expect(successCount + rateLimitedCount).toBe(20);

      // If rate limited, should have appropriate headers
      const rateLimitedResponse = responses.find((r) => r.status() === 429);
      if (rateLimitedResponse) {
        expect(rateLimitedResponse.headers()['retry-after']).toBeDefined();
      }
    });
  });
});
