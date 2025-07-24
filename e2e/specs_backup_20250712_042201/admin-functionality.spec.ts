/**
 * Admin Functionality E2E Tests
 * Tests admin-specific features including user management, group oversight, and system administration
 */

import { test, expect, Page } from '@playwright/test';
import { TestUser, createTestUser, cleanupTestUser, loginAsUser } from '../utils/test-helpers';

test.describe('Admin Functionality', () => {
  let adminUser: TestUser;
  let parentUser: TestUser;

  test.beforeEach(async ({ page }) => {
    adminUser = await createTestUser('admin');
    parentUser = await createTestUser('parent');

    // Login as admin for most tests
    await loginAsUser(page, adminUser.email, adminUser.password);
  });

  test.afterEach(async () => {
    if (adminUser) {
      await cleanupTestUser(adminUser.email);
    }
    if (parentUser) {
      await cleanupTestUser(parentUser.email);
    }
  });

  test('admin can view and manage users', async ({ page }) => {
    await page.goto('/admin');

    // Navigate to user management
    await page.click('[data-testid="admin-users-tab"]');
    await expect(page).toHaveURL('/admin/users');

    // Verify user list is displayed
    await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-row"]')).toHaveCount.greaterThan(0);

    // Test user search
    await page.fill('[data-testid="user-search-input"]', 'test.parent');
    await page.press('[data-testid="user-search-input"]', 'Enter');
    await expect(page.locator('[data-testid="user-row"]')).toContainText('test.parent');

    // Test user filtering
    await page.selectOption('[data-testid="role-filter"]', 'parent');
    await expect(page.locator('[data-testid="user-role-badge"]')).toContainText('Parent');
  });

  test('admin can create and manage user accounts', async ({ page }) => {
    await page.goto('/admin/users');

    // Create new user
    await page.click('[data-testid="create-user-button"]');
    await expect(page.locator('[data-testid="create-user-modal"]')).toBeVisible();

    // Fill user creation form
    await page.fill('[data-testid="new-user-email"]', 'admin.created@example.com');
    await page.fill('[data-testid="new-user-first-name"]', 'Admin');
    await page.fill('[data-testid="new-user-last-name"]', 'Created');
    await page.fill('[data-testid="new-user-phone"]', '+15551234567');
    await page.selectOption('[data-testid="new-user-role"]', 'parent');
    await page.click('[data-testid="create-user-submit"]');

    // Should show success message and user in list
    await expect(page.locator('[data-testid="user-created-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-row"]')).toContainText(
      'admin.created@example.com',
    );

    // Test user editing
    const userRow = page
      .locator('[data-testid="user-row"]')
      .filter({ hasText: 'admin.created@example.com' });
    await userRow.locator('[data-testid="edit-user-button"]').click();

    await page.fill('[data-testid="edit-user-phone"]', '+15559999999');
    await page.click('[data-testid="save-user-changes"]');

    await expect(page.locator('[data-testid="user-updated-success"]')).toBeVisible();
  });

  test('admin can manage carpool groups', async ({ page }) => {
    await page.goto('/admin/groups');

    // Verify groups list
    await expect(page.locator('[data-testid="groups-table"]')).toBeVisible();

    // Test group search and filtering
    await page.fill('[data-testid="group-search-input"]', 'Tesla STEM');
    await page.selectOption('[data-testid="group-status-filter"]', 'active');

    // View group details
    const groupRow = page.locator('[data-testid="group-row"]').first();
    await groupRow.locator('[data-testid="view-group-button"]').click();

    await expect(page.locator('[data-testid="group-details-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="group-participants-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="group-schedule-info"]')).toBeVisible();

    // Test group status management
    await page.click('[data-testid="change-group-status-button"]');
    await page.selectOption('[data-testid="new-group-status"]', 'suspended');
    await page.fill('[data-testid="status-change-reason"]', 'Test suspension for E2E');
    await page.click('[data-testid="confirm-status-change"]');

    await expect(page.locator('[data-testid="group-status-updated"]')).toBeVisible();
  });

  test('admin can handle join requests', async ({ page }) => {
    await page.goto('/admin/join-review');

    // Verify pending requests are shown
    await expect(page.locator('[data-testid="pending-requests-list"]')).toBeVisible();

    if ((await page.locator('[data-testid="join-request-item"]').count()) > 0) {
      const firstRequest = page.locator('[data-testid="join-request-item"]').first();

      // View request details
      await firstRequest.locator('[data-testid="view-request-details"]').click();
      await expect(page.locator('[data-testid="request-details-modal"]')).toBeVisible();

      // Approve the request
      await page.click('[data-testid="approve-request-button"]');
      await page.fill('[data-testid="approval-notes"]', 'Approved via E2E test');
      await page.click('[data-testid="confirm-approval"]');

      await expect(page.locator('[data-testid="request-approved-success"]')).toBeVisible();
    }

    // Test bulk actions
    if ((await page.locator('[data-testid="join-request-checkbox"]').count()) > 1) {
      await page.check('[data-testid="select-all-requests"]');
      await page.click('[data-testid="bulk-approve-button"]');
      await page.click('[data-testid="confirm-bulk-approval"]');

      await expect(page.locator('[data-testid="bulk-action-success"]')).toBeVisible();
    }
  });

  test('admin can manage school and template settings', async ({ page }) => {
    await page.goto('/admin/templates');

    // Verify templates list
    await expect(page.locator('[data-testid="templates-list"]')).toBeVisible();

    // Create new schedule template
    await page.click('[data-testid="create-template-button"]');
    await page.fill('[data-testid="template-name"]', 'E2E Test Template');
    await page.fill('[data-testid="template-description"]', 'Created by E2E test');

    // Configure template schedule
    await page.check('[data-testid="monday-checkbox"]');
    await page.check('[data-testid="wednesday-checkbox"]');
    await page.check('[data-testid="friday-checkbox"]');
    await page.fill('[data-testid="pickup-time"]', '08:00');
    await page.fill('[data-testid="dropoff-time"]', '15:30');

    await page.click('[data-testid="save-template"]');
    await expect(page.locator('[data-testid="template-created-success"]')).toBeVisible();

    // Edit existing template
    const templateRow = page
      .locator('[data-testid="template-row"]')
      .filter({ hasText: 'E2E Test Template' });
    await templateRow.locator('[data-testid="edit-template-button"]').click();

    await page.check('[data-testid="tuesday-checkbox"]');
    await page.click('[data-testid="save-template"]');

    await expect(page.locator('[data-testid="template-updated-success"]')).toBeVisible();
  });

  test('admin can view system analytics and reports', async ({ page }) => {
    await page.goto('/admin');

    // Verify analytics dashboard
    await expect(page.locator('[data-testid="analytics-overview"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-users-metric"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-groups-metric"]')).toBeVisible();
    await expect(page.locator('[data-testid="weekly-trips-metric"]')).toBeVisible();

    // Test date range filtering
    await page.click('[data-testid="date-range-picker"]');
    await page.click('[data-testid="last-30-days"]');

    // Metrics should update
    await expect(page.locator('[data-testid="metrics-loading"]')).toBeVisible();
    await expect(page.locator('[data-testid="metrics-loading"]')).not.toBeVisible();

    // Export report
    await page.click('[data-testid="export-report-button"]');
    await page.selectOption('[data-testid="report-format"]', 'csv');
    await page.click('[data-testid="generate-report"]');

    await expect(page.locator('[data-testid="report-generated-success"]')).toBeVisible();
  });

  test('admin can manage notifications and announcements', async ({ page }) => {
    await page.goto('/admin/notifications');

    // Create system announcement
    await page.click('[data-testid="create-announcement-button"]');
    await page.fill('[data-testid="announcement-title"]', 'E2E Test Announcement');
    await page.fill(
      '[data-testid="announcement-message"]',
      'This is a test announcement created by E2E tests',
    );
    await page.selectOption('[data-testid="announcement-priority"]', 'high');
    await page.check('[data-testid="send-email-notification"]');
    await page.check('[data-testid="send-push-notification"]');

    await page.click('[data-testid="send-announcement"]');
    await expect(page.locator('[data-testid="announcement-sent-success"]')).toBeVisible();

    // View notification history
    await page.click('[data-testid="notification-history-tab"]');
    await expect(page.locator('[data-testid="notification-log"]')).toBeVisible();
    await expect(page.locator('[data-testid="notification-item"]')).toContainText(
      'E2E Test Announcement',
    );
  });

  test('admin can handle emergency situations', async ({ page }) => {
    await page.goto('/admin');

    // Test emergency broadcast
    await page.click('[data-testid="emergency-actions-button"]');
    await page.click('[data-testid="emergency-broadcast"]');

    await page.fill('[data-testid="emergency-title"]', 'E2E Test Emergency');
    await page.fill('[data-testid="emergency-message"]', 'This is a test emergency alert');
    await page.selectOption('[data-testid="emergency-scope"]', 'all-users');

    await page.click('[data-testid="send-emergency-alert"]');
    await page.click('[data-testid="confirm-emergency-send"]');

    await expect(page.locator('[data-testid="emergency-sent-success"]')).toBeVisible();

    // Test system maintenance mode
    await page.click('[data-testid="maintenance-mode-toggle"]');
    await page.fill(
      '[data-testid="maintenance-message"]',
      'System under maintenance for E2E testing',
    );
    await page.click('[data-testid="enable-maintenance-mode"]');

    await expect(page.locator('[data-testid="maintenance-enabled-success"]')).toBeVisible();

    // Disable maintenance mode
    await page.click('[data-testid="disable-maintenance-mode"]');
    await expect(page.locator('[data-testid="maintenance-disabled-success"]')).toBeVisible();
  });

  test('admin permissions and access control', async ({ page }) => {
    // Test that non-admin users cannot access admin pages
    await page.goto('/login');
    await loginAsUser(page, parentUser.email, parentUser.password);

    // Try to access admin page
    await page.goto('/admin');
    await expect(page).toHaveURL('/dashboard'); // Should redirect
    await expect(page.locator('[data-testid="access-denied-message"]')).toBeVisible();

    // Try to access admin API endpoints directly
    const response = await page.request.get('/api/admin/users');
    expect(response.status()).toBe(403); // Forbidden
  });

  test('admin can audit user activities', async ({ page }) => {
    await page.goto('/admin/audit');

    // Verify audit log is displayed
    await expect(page.locator('[data-testid="audit-log-table"]')).toBeVisible();

    // Test audit log filtering
    await page.selectOption('[data-testid="audit-action-filter"]', 'login');
    await page.selectOption('[data-testid="audit-user-type-filter"]', 'parent');
    await page.click('[data-testid="apply-audit-filters"]');

    // Should show filtered results
    await expect(page.locator('[data-testid="audit-entry"]')).toContainText('login');

    // Test date range filtering
    await page.click('[data-testid="audit-date-from"]');
    await page.fill('[data-testid="audit-date-from"]', '2024-01-01');
    await page.click('[data-testid="apply-audit-filters"]');

    // Export audit log
    await page.click('[data-testid="export-audit-log"]');
    await page.selectOption('[data-testid="audit-export-format"]', 'csv');
    await page.click('[data-testid="generate-audit-export"]');

    await expect(page.locator('[data-testid="audit-export-success"]')).toBeVisible();
  });

  test('admin data validation and error handling', async ({ page }) => {
    await page.goto('/admin/users');

    // Test invalid user creation
    await page.click('[data-testid="create-user-button"]');
    await page.fill('[data-testid="new-user-email"]', 'invalid-email');
    await page.fill('[data-testid="new-user-first-name"]', '');
    await page.click('[data-testid="create-user-submit"]');

    // Should show validation errors
    await expect(page.locator('[data-testid="email-validation-error"]')).toContainText(
      'Invalid email',
    );
    await expect(page.locator('[data-testid="name-validation-error"]')).toContainText('required');

    // Test duplicate email prevention
    await page.fill('[data-testid="new-user-email"]', 'test.parent1@example.com'); // Existing email
    await page.fill('[data-testid="new-user-first-name"]', 'Test');
    await page.fill('[data-testid="new-user-last-name"]', 'User');
    await page.click('[data-testid="create-user-submit"]');

    await expect(page.locator('[data-testid="duplicate-email-error"]')).toContainText(
      'email already exists',
    );
  });
});
