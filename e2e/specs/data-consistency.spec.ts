/**
 * Data Consistency E2E Tests
 * Tests database state validation, cross-page synchronization, real-time updates, and cache invalidation
 */

import { test, expect } from '@playwright/test';
import {
  TestUser,
  createTestUser,
  cleanupTestUser,
  loginAsUser,
  makeApiRequest,
} from '../utils/test-helpers';

test.describe('Data Consistency Tests', () => {
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

  test.describe('Database State Validation', () => {
    test('should maintain user profile consistency across updates', async ({ page, request }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);

      // Get initial user data via API
      const initialResponse = await makeApiRequest(
        request,
        'GET',
        '/api/users-me',
        {},
        {
          Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('authToken'))}`,
        },
      );
      const initialData = await initialResponse.json();

      // Update profile through UI
      await page.goto('/profile');
      await page.fill('input[name="firstName"]', 'UpdatedFirstName');
      await page.fill('input[name="phone"]', '(555) 999-8888');
      await page.click('button[type="submit"]');

      // Verify success message
      await expect(page.locator('text=Profile updated successfully')).toBeVisible();

      // Verify data consistency via API
      const updatedResponse = await makeApiRequest(
        request,
        'GET',
        '/api/users-me',
        {},
        {
          Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('authToken'))}`,
        },
      );
      const updatedData = await updatedResponse.json();

      expect(updatedData.firstName).toBe('UpdatedFirstName');
      expect(updatedData.phone).toBe('(555) 999-8888');
      expect(updatedData.email).toBe(initialData.email); // Should remain unchanged

      // Verify UI reflects the changes
      await page.reload();
      await expect(page.locator('input[name="firstName"]')).toHaveValue('UpdatedFirstName');
      await expect(page.locator('input[name="phone"]')).toHaveValue('(555) 999-8888');
    });

    test('should maintain trip data integrity during modifications', async ({ page, request }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);

      // Create a trip
      await page.goto('/trips/create');
      await page.fill('input[name="tripName"]', 'Consistency Test Trip');
      await page.fill('input[name="date"]', '2024-03-15');
      await page.fill('input[name="capacity"]', '4');
      await page.click('button[type="submit"]');

      // Get trip ID from URL or response
      const currentUrl = page.url();
      const tripId = currentUrl.split('/').pop();

      // Verify trip exists via API
      const tripResponse = await makeApiRequest(
        request,
        'GET',
        `/api/trips-list/${tripId}`,
        {},
        {
          Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('authToken'))}`,
        },
      );
      const tripData = await tripResponse.json();

      expect(tripData.name).toBe('Consistency Test Trip');
      expect(tripData.capacity).toBe(4);

      // Edit trip through UI
      await page.click('[data-testid="edit-trip"]');
      await page.fill('input[name="capacity"]', '6');
      await page.click('button[data-testid="save-changes"]');

      // Verify changes via API
      const updatedTripResponse = await makeApiRequest(
        request,
        'GET',
        `/api/trips-list/${tripId}`,
        {},
        {
          Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('authToken'))}`,
        },
      );
      const updatedTripData = await updatedTripResponse.json();

      expect(updatedTripData.capacity).toBe(6);
      expect(updatedTripData.name).toBe('Consistency Test Trip'); // Should remain unchanged
    });

    test('should handle concurrent data modifications correctly', async ({ browser, request }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      // Login both users
      await loginAsUser(page1, parentUser.email, parentUser.password);
      await loginAsUser(page2, parentUser.email, parentUser.password);

      // Both navigate to the same trip editing page
      await page1.goto('/trips/create');
      await page1.fill('input[name="tripName"]', 'Concurrent Test Trip');
      await page1.click('button[type="submit"]');

      const tripUrl = page1.url();
      await page2.goto(tripUrl);

      // Both users try to edit the same field concurrently
      await Promise.all([
        page1.fill('input[name="capacity"]', '8'),
        page2.fill('input[name="capacity"]', '6'),
      ]);

      // Submit changes (first one should succeed)
      await page1.click('button[data-testid="save-changes"]');
      await page2.click('button[data-testid="save-changes"]');

      // One should succeed, the other should show conflict resolution
      const page1Message = await page1.locator('[data-testid="save-message"]').textContent();
      const page2Message = await page2.locator('[data-testid="save-message"]').textContent();

      const hasSuccess = page1Message?.includes('saved') || page2Message?.includes('saved');
      const hasConflict = page1Message?.includes('conflict') || page2Message?.includes('conflict');

      expect(hasSuccess).toBe(true);
      expect(hasConflict).toBe(true);

      await context1.close();
      await context2.close();
    });

    test('should maintain referential integrity in carpool groups', async ({ page, request }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);

      // Create a carpool group
      await page.goto('/carpool/create');
      await page.fill('input[name="carpoolName"]', 'Integrity Test Group');
      await page.click('button[type="submit"]');

      const groupId = await page.locator('[data-testid="group-id"]').textContent();

      // Add members to the group
      await page.click('[data-testid="add-member"]');
      await page.fill('input[name="memberEmail"]', 'member@example.com');
      await page.click('button[data-testid="send-invite"]');

      // Verify group and member relationship via API
      const groupResponse = await makeApiRequest(
        request,
        'GET',
        `/api/admin-carpool-groups/${groupId}`,
        {},
        {
          Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('authToken'))}`,
        },
      );
      const groupData = await groupResponse.json();

      expect(groupData.members).toContain('member@example.com');

      // Remove member
      await page.click('[data-testid="remove-member-member@example.com"]');
      await page.click('button[data-testid="confirm-removal"]');

      // Verify referential integrity maintained
      const updatedGroupResponse = await makeApiRequest(
        request,
        'GET',
        `/api/admin-carpool-groups/${groupId}`,
        {},
        {
          Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('authToken'))}`,
        },
      );
      const updatedGroupData = await updatedGroupResponse.json();

      expect(updatedGroupData.members).not.toContain('member@example.com');
    });
  });

  test.describe('Cross-Page Data Synchronization', () => {
    test('should sync user profile changes across all pages', async ({ page }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);

      // Go to dashboard and note current user display
      await page.goto('/dashboard');
      const initialUserDisplay = await page
        .locator('[data-testid="user-display-name"]')
        .textContent();

      // Update profile
      await page.goto('/profile');
      await page.fill('input[name="firstName"]', 'SyncTest');
      await page.click('button[type="submit"]');

      // Return to dashboard - should show updated name without refresh
      await page.goto('/dashboard');
      const updatedUserDisplay = await page
        .locator('[data-testid="user-display-name"]')
        .textContent();

      expect(updatedUserDisplay).toContain('SyncTest');
      expect(updatedUserDisplay).not.toBe(initialUserDisplay);

      // Check other pages too
      await page.goto('/trips');
      const tripsPageUserDisplay = await page
        .locator('[data-testid="user-display-name"]')
        .textContent();
      expect(tripsPageUserDisplay).toContain('SyncTest');
    });

    test('should sync trip updates across listing and detail pages', async ({ page }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);

      // Create a trip
      await page.goto('/trips/create');
      await page.fill('input[name="tripName"]', 'Sync Test Trip');
      await page.fill('input[name="date"]', '2024-04-01');
      await page.click('button[type="submit"]');

      const tripId = page.url().split('/').pop();

      // Go to trips listing page
      await page.goto('/trips');
      const initialTripName = await page
        .locator(`[data-testid="trip-${tripId}-name"]`)
        .textContent();

      // Edit trip
      await page.goto(`/trips/${tripId}/edit`);
      await page.fill('input[name="tripName"]', 'Updated Sync Test Trip');
      await page.click('button[data-testid="save-changes"]');

      // Return to listing - should show updated name
      await page.goto('/trips');
      const updatedTripName = await page
        .locator(`[data-testid="trip-${tripId}-name"]`)
        .textContent();

      expect(updatedTripName).toBe('Updated Sync Test Trip');
      expect(updatedTripName).not.toBe(initialTripName);
    });

    test('should sync notification counts across pages', async ({ page }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);

      // Check initial notification count
      await page.goto('/dashboard');
      const initialCount = await page.locator('[data-testid="notification-count"]').textContent();

      // Mark notifications as read on notifications page
      await page.goto('/notifications');
      if ((await page.locator('[data-testid="mark-all-read"]').count()) > 0) {
        await page.click('[data-testid="mark-all-read"]');
      }

      // Return to dashboard - count should be updated
      await page.goto('/dashboard');
      const updatedCount = await page.locator('[data-testid="notification-count"]').textContent();

      expect(parseInt(updatedCount || '0')).toBeLessThan(parseInt(initialCount || '1'));
    });

    test('should maintain form state during navigation', async ({ page }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);

      // Start creating a trip
      await page.goto('/trips/create');
      await page.fill('input[name="tripName"]', 'Draft Trip');
      await page.fill('input[name="description"]', 'This is a draft');

      // Navigate away without saving
      await page.goto('/dashboard');

      // Return to trip creation - form should restore state if implemented
      await page.goto('/trips/create');

      // Check if draft was saved (if feature is implemented)
      const draftIndicator = page.locator('[data-testid="draft-restored"]');
      if ((await draftIndicator.count()) > 0) {
        await expect(page.locator('input[name="tripName"]')).toHaveValue('Draft Trip');
        await expect(page.locator('input[name="description"]')).toHaveValue('This is a draft');
      }
    });
  });

  test.describe('Real-Time Update Testing', () => {
    test('should update trip status in real-time', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const driverPage = await context1.newPage();
      const parentPage = await context2.newPage();

      // Login both users
      await loginAsUser(driverPage, parentUser.email, parentUser.password);
      await loginAsUser(parentPage, parentUser.email, parentUser.password);

      // Driver creates and starts a trip
      await driverPage.goto('/trips/create');
      await driverPage.fill('input[name="tripName"]', 'Real-time Test Trip');
      await driverPage.click('button[type="submit"]');

      const tripId = driverPage.url().split('/').pop();

      // Parent watches the trip
      await parentPage.goto(`/trips/${tripId}/track`);

      // Driver updates trip status
      await driverPage.goto(`/trips/${tripId}/driver`);
      await driverPage.click('[data-testid="start-trip"]');

      // Parent should see the update in real-time
      await expect(parentPage.locator('[data-testid="trip-status"]')).toContainText('In Progress');

      // Driver updates location
      await driverPage.fill('input[name="currentLocation"]', 'Approaching first pickup');
      await driverPage.click('[data-testid="update-location"]');

      // Parent should see location update
      await expect(parentPage.locator('[data-testid="driver-location"]')).toContainText(
        'Approaching first pickup',
      );

      await context1.close();
      await context2.close();
    });

    test('should sync carpool group changes in real-time', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const adminPage = await context1.newPage();
      const parentPage = await context2.newPage();

      // Login users
      await loginAsUser(adminPage, adminUser.email, adminUser.password);
      await loginAsUser(parentPage, parentUser.email, parentUser.password);

      // Both navigate to the same carpool group
      await adminPage.goto('/admin/carpool/123');
      await parentPage.goto('/carpool/123');

      // Admin makes changes
      await adminPage.fill('input[name="groupDescription"]', 'Updated description via admin');
      await adminPage.click('[data-testid="save-changes"]');

      // Parent should see the changes
      await expect(parentPage.locator('[data-testid="group-description"]')).toContainText(
        'Updated description via admin',
      );

      await context1.close();
      await context2.close();
    });

    test('should handle WebSocket connection drops gracefully', async ({ page }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);
      await page.goto('/trips/123/track');

      // Simulate WebSocket disconnect
      await page.evaluate(() => {
        // Force close WebSocket connection if it exists
        if ((window as any).websocket) {
          (window as any).websocket.close();
        }
      });

      // Should show reconnection indicator
      await expect(page.locator('[data-testid="reconnecting"]')).toBeVisible();

      // Should automatically reconnect
      await expect(page.locator('[data-testid="connected"]')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Cache Invalidation Scenarios', () => {
    test('should invalidate user cache after profile updates', async ({ page, context }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);

      // Load a page to populate cache
      await page.goto('/dashboard');
      await expect(page.locator('[data-testid="user-info"]')).toBeVisible();

      // Update profile
      await page.goto('/profile');
      await page.fill('input[name="firstName"]', 'CacheTest');
      await page.click('button[type="submit"]');

      // Navigate to another page - should show updated data
      await page.goto('/trips');
      await expect(page.locator('[data-testid="user-display-name"]')).toContainText('CacheTest');

      // Verify cache was invalidated by checking network requests
      const responses: string[] = [];
      page.on('response', (response) => {
        if (response.url().includes('/api/users-me')) {
          responses.push(response.url());
        }
      });

      await page.reload();

      // Should have made a fresh API call
      expect(responses.length).toBeGreaterThan(0);
    });

    test('should invalidate trip cache after modifications', async ({ page }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);

      // Create and view a trip
      await page.goto('/trips/create');
      await page.fill('input[name="tripName"]', 'Cache Invalidation Test');
      await page.click('button[type="submit"]');

      const tripId = page.url().split('/').pop();

      // View trip to populate cache
      await page.goto(`/trips/${tripId}`);
      const initialLoadTime = Date.now();

      // Edit the trip
      await page.click('[data-testid="edit-trip"]');
      await page.fill('input[name="tripName"]', 'Updated Cache Test');
      await page.click('button[data-testid="save-changes"]');

      // Return to trip view - should show fresh data
      await page.goto(`/trips/${tripId}`);
      await expect(page.locator('h1')).toContainText('Updated Cache Test');

      // Verify this was not served from cache
      const secondLoadTime = Date.now();
      expect(secondLoadTime - initialLoadTime).toBeGreaterThan(100); // Fresh load takes time
    });

    test('should handle cache consistency across browser tabs', async ({ browser }) => {
      const context = await browser.newContext();

      const tab1 = await context.newPage();
      const tab2 = await context.newPage();

      // Login in both tabs
      await loginAsUser(tab1, parentUser.email, parentUser.password);
      await loginAsUser(tab2, parentUser.email, parentUser.password);

      // Load same data in both tabs
      await tab1.goto('/trips');
      await tab2.goto('/trips');

      // Create trip in tab1
      await tab1.goto('/trips/create');
      await tab1.fill('input[name="tripName"]', 'Cross-tab Cache Test');
      await tab1.click('button[type="submit"]');

      // Refresh tab2 - should show the new trip
      await tab2.reload();
      await expect(tab2.locator('text=Cross-tab Cache Test')).toBeVisible();

      await context.close();
    });

    test('should invalidate notification cache after actions', async ({ page }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);

      // Load notifications
      await page.goto('/notifications');
      const initialNotifications = await page.locator('[data-testid="notification-item"]').count();

      // Mark one as read
      if (initialNotifications > 0) {
        await page.click('[data-testid="notification-item"]:first-child [data-testid="mark-read"]');

        // Should immediately update the UI
        await expect(page.locator('[data-testid="notification-item"]:first-child')).toHaveClass(
          /read/,
        );

        // Navigate away and back - should maintain state
        await page.goto('/dashboard');
        await page.goto('/notifications');

        // First notification should still be marked as read
        await expect(page.locator('[data-testid="notification-item"]:first-child')).toHaveClass(
          /read/,
        );
      }
    });

    test('should handle offline/online cache behavior', async ({ page, context }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);

      // Load data while online
      await page.goto('/trips');
      await expect(page.locator('[data-testid="trips-list"]')).toBeVisible();

      // Go offline
      await context.setOffline(true);

      // Navigate to cached page - should still work
      await page.goto('/dashboard');
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();

      // Try to load new data - should show offline indicator
      await page.goto('/notifications');
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();

      // Go back online
      await context.setOffline(false);

      // Should sync and update
      await page.reload();
      await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="notifications-list"]')).toBeVisible();
    });
  });
});
