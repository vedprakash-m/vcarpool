/**
 * Carpool Management E2E Tests
 * Tests core carpool functionality including group creation, joining, and trip management
 */

import { test, expect, Page } from '@playwright/test';
import { TestUser, createTestUser, cleanupTestUser, loginAsUser } from '../utils/test-helpers';

test.describe('Carpool Management Flows', () => {
  let parentUser: TestUser;
  let secondParentUser: TestUser;

  test.beforeEach(async ({ page }) => {
    // Create test users
    parentUser = await createTestUser('parent');
    secondParentUser = await createTestUser('parent');

    // Login as the first parent
    await loginAsUser(page, parentUser.email, parentUser.password);
  });

  test.afterEach(async () => {
    // Cleanup test users
    if (parentUser) {
      await cleanupTestUser(parentUser.email);
    }
    if (secondParentUser) {
      await cleanupTestUser(secondParentUser.email);
    }
  });

  test('create a new carpool group', async ({ page }) => {
    // Navigate to trips page
    await page.goto('/trips');
    await expect(page).toHaveURL('/trips');

    // Click create new group/trip button
    await page.click('[data-testid="create-trip-button"]');
    await expect(page).toHaveURL('/trips/create');

    // Fill trip creation form
    await page.fill('[data-testid="trip-title-input"]', 'Morning Carpool to Tesla STEM');
    await page.fill('[data-testid="trip-destination-input"]', 'Tesla STEM High School');
    await page.fill('[data-testid="departure-time-input"]', '07:30');
    await page.fill('[data-testid="return-time-input"]', '15:30');
    await page.selectOption('[data-testid="days-select"]', [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
    ]);
    await page.fill('[data-testid="max-capacity-input"]', '4');
    await page.fill('[data-testid="cost-per-seat-input"]', '5.00');

    // Submit the form
    await page.click('[data-testid="create-trip-submit"]');

    // Should redirect to trips list with success message
    await expect(page).toHaveURL('/trips');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText(
      'Trip created successfully',
    );

    // Verify the trip appears in the list
    await expect(page.locator('[data-testid="trip-card"]')).toContainText(
      'Morning Carpool to Tesla STEM',
    );
  });

  test('view available carpool groups', async ({ page }) => {
    // Navigate to discover/browse trips
    await page.goto('/trips');
    await page.click('[data-testid="discover-tab"]');

    // Should see available trips
    await expect(page.locator('[data-testid="available-trips-list"]')).toBeVisible();

    // Verify trip cards have required information
    const firstTripCard = page.locator('[data-testid="trip-card"]').first();
    await expect(firstTripCard.locator('[data-testid="trip-title"]')).toBeVisible();
    await expect(firstTripCard.locator('[data-testid="departure-time"]')).toBeVisible();
    await expect(firstTripCard.locator('[data-testid="available-seats"]')).toBeVisible();
    await expect(firstTripCard.locator('[data-testid="cost-per-seat"]')).toBeVisible();
  });

  test('join an existing carpool group', async ({ page }) => {
    // First, create a trip as the logged-in user
    await page.goto('/trips/create');
    await page.fill('[data-testid="trip-title-input"]', 'Afternoon Pickup Group');
    await page.fill('[data-testid="trip-destination-input"]', 'Tesla STEM High School');
    await page.fill('[data-testid="departure-time-input"]', '15:30');
    await page.fill('[data-testid="max-capacity-input"]', '3');
    await page.click('[data-testid="create-trip-submit"]');

    // Logout and login as second parent
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    await loginAsUser(page, secondParentUser.email, secondParentUser.password);

    // Navigate to discover trips
    await page.goto('/trips');
    await page.click('[data-testid="discover-tab"]');

    // Find and join the trip
    const tripCard = page
      .locator('[data-testid="trip-card"]')
      .filter({ hasText: 'Afternoon Pickup Group' });
    await expect(tripCard).toBeVisible();
    await tripCard.locator('[data-testid="join-trip-button"]').click();

    // Confirm join request
    await page.click('[data-testid="confirm-join-button"]');

    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText(
      'Join request sent',
    );

    // Trip should now appear in "My Groups" tab
    await page.click('[data-testid="my-groups-tab"]');
    await expect(
      page.locator('[data-testid="trip-card"]').filter({ hasText: 'Afternoon Pickup Group' }),
    ).toBeVisible();
  });

  test('leave a carpool group', async ({ page }) => {
    // Setup: Join a group first (simplified for test)
    await setupUserInGroup(page, parentUser, 'Test Leave Group');

    // Navigate to my groups
    await page.goto('/trips');
    await page.click('[data-testid="my-groups-tab"]');

    // Find the group and click leave
    const tripCard = page
      .locator('[data-testid="trip-card"]')
      .filter({ hasText: 'Test Leave Group' });
    await tripCard.locator('[data-testid="leave-trip-button"]').click();

    // Confirm leave action
    await page.click('[data-testid="confirm-leave-button"]');

    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText(
      'Left group successfully',
    );

    // Group should no longer appear in my groups
    await expect(
      page.locator('[data-testid="trip-card"]').filter({ hasText: 'Test Leave Group' }),
    ).not.toBeVisible();
  });

  test('search and filter carpool groups', async ({ page }) => {
    // Navigate to discover page
    await page.goto('/trips');
    await page.click('[data-testid="discover-tab"]');

    // Test search functionality
    await page.fill('[data-testid="search-input"]', 'Tesla STEM');
    await page.press('[data-testid="search-input"]', 'Enter');

    // Should filter results
    await expect(page.locator('[data-testid="trip-card"]')).toContainText('Tesla STEM');

    // Test time filter
    await page.click('[data-testid="filter-button"]');
    await page.selectOption('[data-testid="time-filter"]', 'morning');
    await page.click('[data-testid="apply-filters"]');

    // Should show only morning trips
    const tripCards = page.locator('[data-testid="trip-card"]');
    const count = await tripCards.count();

    for (let i = 0; i < count; i++) {
      const timeText = await tripCards
        .nth(i)
        .locator('[data-testid="departure-time"]')
        .textContent();
      expect(timeText).toMatch(/^(0[6-9]|1[0-1]):/); // Morning times 06:00-11:59
    }
  });

  test('view trip details and participants', async ({ page }) => {
    // Setup: Create a trip with participants
    await setupTripWithParticipants(page, 'Detailed Trip View Test');

    // Navigate to trips and click on a trip
    await page.goto('/trips');
    const tripCard = page
      .locator('[data-testid="trip-card"]')
      .filter({ hasText: 'Detailed Trip View Test' });
    await tripCard.click();

    // Should navigate to trip details page
    await expect(page).toHaveURL(/\/trips\/\w+/);

    // Verify trip details are displayed
    await expect(page.locator('[data-testid="trip-title"]')).toContainText(
      'Detailed Trip View Test',
    );
    await expect(page.locator('[data-testid="trip-schedule"]')).toBeVisible();
    await expect(page.locator('[data-testid="trip-participants"]')).toBeVisible();
    await expect(page.locator('[data-testid="trip-route-map"]')).toBeVisible();
  });

  test('error handling for invalid trip creation', async ({ page }) => {
    // Navigate to create trip page
    await page.goto('/trips/create');

    // Try to submit empty form
    await page.click('[data-testid="create-trip-submit"]');

    // Should show validation errors
    await expect(page.locator('[data-testid="title-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="destination-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="time-error"]')).toBeVisible();

    // Fill invalid data
    await page.fill('[data-testid="departure-time-input"]', '25:00'); // Invalid time
    await page.fill('[data-testid="max-capacity-input"]', '0'); // Invalid capacity
    await page.blur('[data-testid="max-capacity-input"]');

    // Should show specific validation errors
    await expect(page.locator('[data-testid="time-error"]')).toContainText('Invalid time format');
    await expect(page.locator('[data-testid="capacity-error"]')).toContainText(
      'Capacity must be at least 1',
    );
  });
});

// Helper functions
async function setupUserInGroup(page: Page, user: TestUser, groupName: string) {
  // Create a group and add user to it (mock implementation)
  // In a real implementation, this would use API calls or database setup
  await page.goto('/trips/create');
  await page.fill('[data-testid="trip-title-input"]', groupName);
  await page.fill('[data-testid="trip-destination-input"]', 'Tesla STEM High School');
  await page.fill('[data-testid="departure-time-input"]', '08:00');
  await page.fill('[data-testid="max-capacity-input"]', '4');
  await page.click('[data-testid="create-trip-submit"]');
}

async function setupTripWithParticipants(page: Page, tripName: string) {
  // Create a trip and add some mock participants
  await page.goto('/trips/create');
  await page.fill('[data-testid="trip-title-input"]', tripName);
  await page.fill('[data-testid="trip-destination-input"]', 'Tesla STEM High School');
  await page.fill('[data-testid="departure-time-input"]', '08:00');
  await page.fill('[data-testid="max-capacity-input"]', '4');
  await page.click('[data-testid="create-trip-submit"]');
}
