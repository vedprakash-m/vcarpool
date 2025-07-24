/**
 * Dashboard and Navigation E2E Tests
 * Tests core dashboard functionality, navigation, and user interface interactions
 */

import { test, expect, Page } from '@playwright/test';
import { TestUser, createTestUser, cleanupTestUser, loginAsUser } from '../utils/test-helpers';

test.describe('Dashboard and Navigation', () => {
  let parentUser: TestUser;
  let adminUser: TestUser;

  test.beforeEach(async ({ page }) => {
    parentUser = await createTestUser('parent');
    adminUser = await createTestUser('admin');
  });

  test.afterEach(async () => {
    if (parentUser) {
      await cleanupTestUser(parentUser.email);
    }
    if (adminUser) {
      await cleanupTestUser(adminUser.email);
    }
  });

  test('parent dashboard displays correctly', async ({ page }) => {
    await loginAsUser(page, parentUser.email, parentUser.password);
    await page.goto('/dashboard');

    // Verify dashboard layout
    await expect(page.locator('[data-testid="user-welcome"]')).toContainText(parentUser.name);
    await expect(page.locator('[data-testid="dashboard-summary"]')).toBeVisible();

    // Check dashboard sections
    await expect(page.locator('[data-testid="my-groups-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="upcoming-trips-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="recent-notifications-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="quick-actions-section"]')).toBeVisible();

    // Verify quick action buttons
    await expect(page.locator('[data-testid="create-trip-quick-action"]')).toBeVisible();
    await expect(page.locator('[data-testid="find-groups-quick-action"]')).toBeVisible();
    await expect(page.locator('[data-testid="view-schedule-quick-action"]')).toBeVisible();
  });

  test('admin dashboard displays correctly', async ({ page }) => {
    await loginAsUser(page, adminUser.email, adminUser.password);
    await page.goto('/dashboard');

    // Verify admin-specific sections
    await expect(page.locator('[data-testid="admin-overview-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="system-stats-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="pending-requests-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="admin-actions-section"]')).toBeVisible();

    // Check admin-specific stats
    await expect(page.locator('[data-testid="total-users-stat"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-groups-stat"]')).toBeVisible();
    await expect(page.locator('[data-testid="pending-approvals-stat"]')).toBeVisible();
  });

  test('navigation menu works correctly', async ({ page }) => {
    await loginAsUser(page, parentUser.email, parentUser.password);
    await page.goto('/dashboard');

    // Test main navigation items
    await page.click('[data-testid="nav-trips"]');
    await expect(page).toHaveURL('/trips');

    await page.click('[data-testid="nav-dashboard"]');
    await expect(page).toHaveURL('/dashboard');

    await page.click('[data-testid="nav-profile"]');
    await expect(page).toHaveURL('/profile');

    // Test mobile navigation (if responsive)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
  });

  test('user profile management', async ({ page }) => {
    await loginAsUser(page, parentUser.email, parentUser.password);
    await page.goto('/profile');

    // Verify profile information is displayed
    await expect(page.locator('[data-testid="profile-name"]')).toContainText(parentUser.name);
    await expect(page.locator('[data-testid="profile-email"]')).toContainText(parentUser.email);
    await expect(page.locator('[data-testid="profile-phone"]')).toContainText(parentUser.phone);

    // Test profile editing
    await page.click('[data-testid="edit-profile-button"]');
    await page.fill('[data-testid="profile-name-input"]', 'Updated Name');
    await page.fill('[data-testid="profile-phone-input"]', '+15559999999');
    await page.click('[data-testid="save-profile-button"]');

    // Should show success message
    await expect(page.locator('[data-testid="profile-update-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="profile-name"]')).toContainText('Updated Name');
  });

  test('password change functionality', async ({ page }) => {
    await loginAsUser(page, parentUser.email, parentUser.password);
    await page.goto('/profile');

    // Navigate to password change section
    await page.click('[data-testid="change-password-tab"]');

    // Fill password change form
    await page.fill('[data-testid="current-password-input"]', parentUser.password);
    await page.fill('[data-testid="new-password-input"]', 'newpassword123');
    await page.fill('[data-testid="confirm-new-password-input"]', 'newpassword123');
    await page.click('[data-testid="change-password-button"]');

    // Should show success message
    await expect(page.locator('[data-testid="password-change-success"]')).toBeVisible();

    // Test login with new password
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    await loginAsUser(page, parentUser.email, 'newpassword123');
    await expect(page).toHaveURL('/dashboard');
  });

  test('notification center functionality', async ({ page }) => {
    await loginAsUser(page, parentUser.email, parentUser.password);
    await page.goto('/dashboard');

    // Click notification bell
    await page.click('[data-testid="notification-bell"]');
    await expect(page.locator('[data-testid="notification-dropdown"]')).toBeVisible();

    // Verify notification items
    await expect(page.locator('[data-testid="notification-item"]').first()).toBeVisible();

    // Mark notification as read
    await page.click('[data-testid="mark-read-button"]');
    await expect(page.locator('[data-testid="notification-item"]').first()).toHaveClass(/read/);

    // Navigate to all notifications
    await page.click('[data-testid="view-all-notifications"]');
    await expect(page).toHaveURL('/notifications');
  });

  test('quick actions from dashboard', async ({ page }) => {
    await loginAsUser(page, parentUser.email, parentUser.password);
    await page.goto('/dashboard');

    // Test create trip quick action
    await page.click('[data-testid="create-trip-quick-action"]');
    await expect(page).toHaveURL('/trips/create');

    // Go back to dashboard
    await page.goto('/dashboard');

    // Test find groups quick action
    await page.click('[data-testid="find-groups-quick-action"]');
    await expect(page).toHaveURL('/trips');
    await expect(page.locator('[data-testid="discover-tab"]')).toHaveClass(/active/);

    // Go back to dashboard
    await page.goto('/dashboard');

    // Test view schedule quick action
    await page.click('[data-testid="view-schedule-quick-action"]');
    await expect(page).toHaveURL(/\/(schedule|calendar)/);
  });

  test('search functionality', async ({ page }) => {
    await loginAsUser(page, parentUser.email, parentUser.password);
    await page.goto('/dashboard');

    // Test global search
    await page.fill('[data-testid="global-search-input"]', 'Tesla STEM');
    await page.press('[data-testid="global-search-input"]', 'Enter');

    // Should show search results
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-result-item"]')).toContainText('Tesla STEM');

    // Test search filters
    await page.click('[data-testid="search-filter-trips"]');
    await expect(page.locator('[data-testid="search-result-item"]')).toContainText('Trip');

    // Clear search
    await page.click('[data-testid="clear-search-button"]');
    await expect(page.locator('[data-testid="search-results"]')).not.toBeVisible();
  });

  test('responsive design on mobile', async ({ page }) => {
    await loginAsUser(page, parentUser.email, parentUser.password);

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');

    // Verify mobile layout
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="desktop-nav"]')).not.toBeVisible();

    // Test mobile menu
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();

    // Test mobile navigation
    await page.click('[data-testid="mobile-nav-trips"]');
    await expect(page).toHaveURL('/trips');
    await expect(page.locator('[data-testid="mobile-nav-menu"]')).not.toBeVisible();
  });

  test('error handling and fallbacks', async ({ page }) => {
    await loginAsUser(page, parentUser.email, parentUser.password);
    await page.goto('/dashboard');

    // Test handling of failed data loading
    // Mock network failure for trip data
    await page.route('**/api/trips**', (route) => route.abort());
    await page.reload();

    // Should show error state
    await expect(page.locator('[data-testid="trips-error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-load-button"]')).toBeVisible();

    // Test retry functionality
    await page.unroute('**/api/trips**');
    await page.click('[data-testid="retry-load-button"]');

    // Should load successfully after retry
    await expect(page.locator('[data-testid="my-groups-section"]')).toBeVisible();
  });

  test('accessibility features', async ({ page }) => {
    await loginAsUser(page, parentUser.email, parentUser.password);
    await page.goto('/dashboard');

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();

    // Test screen reader compatibility
    await expect(page.locator('[data-testid="main-content"]')).toHaveAttribute('role', 'main');
    await expect(page.locator('[data-testid="nav-menu"]')).toHaveAttribute('role', 'navigation');

    // Test high contrast mode detection
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('body')).toHaveClass(/dark-theme/);

    // Test focus indicators
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toHaveCSS('outline-width', /[1-9]/);
  });

  test('loading states and skeletons', async ({ page }) => {
    await loginAsUser(page, parentUser.email, parentUser.password);

    // Slow down network to see loading states
    await page.route('**/api/**', (route) => {
      setTimeout(() => route.continue(), 1000);
    });

    await page.goto('/dashboard');

    // Should show loading skeletons
    await expect(page.locator('[data-testid="dashboard-skeleton"]')).toBeVisible();
    await expect(page.locator('[data-testid="trips-skeleton"]')).toBeVisible();

    // Wait for content to load
    await expect(page.locator('[data-testid="dashboard-skeleton"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="my-groups-section"]')).toBeVisible();
  });
});
