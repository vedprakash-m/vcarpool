/**
 * Authentication E2E Tests
 * Tests user registration, login, logout, and error handling
 */

import { test, expect, Page } from '@playwright/test';
import { TestUser, createTestUser, cleanupTestUser } from '../utils/test-helpers';

test.describe('Authentication Flow', () => {
  let testUser: TestUser;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.afterEach(async () => {
    if (testUser) {
      await cleanupTestUser(testUser.email);
    }
  });

  test('successful user registration', async ({ page }) => {
    testUser = await createTestUser();

    // Navigate to registration page
    await page.click('text=Sign Up');
    await expect(page).toHaveURL('/register');

    // Fill registration form
    await page.fill('[data-testid="email-input"]', testUser.email);
    await page.fill('[data-testid="password-input"]', testUser.password);
    await page.fill('[data-testid="confirm-password-input"]', testUser.password);
    await page.fill('[data-testid="name-input"]', testUser.name);
    await page.fill('[data-testid="phone-input"]', testUser.phone);

    // Submit registration
    await page.click('[data-testid="register-button"]');

    // Should redirect to dashboard or verification page
    await expect(page).toHaveURL(/\/(dashboard|verify)/);
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('successful user login', async ({ page }) => {
    // Use pre-seeded test user
    const email = 'test.parent1@example.com';
    const password = 'testpass123';

    // Navigate to login page
    await page.click('text=Login');
    await expect(page).toHaveURL('/login');

    // Fill login form
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', password);

    // Submit login
    await page.click('[data-testid="login-button"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    await expect(page.locator('text=Test Parent One')).toBeVisible();
  });

  test('failed login with invalid credentials', async ({ page }) => {
    // Navigate to login page
    await page.click('text=Login');
    await expect(page).toHaveURL('/login');

    // Fill login form with invalid credentials
    await page.fill('[data-testid="email-input"]', 'invalid@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');

    // Submit login
    await page.click('[data-testid="login-button"]');

    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'Invalid credentials',
    );

    // Should stay on login page
    await expect(page).toHaveURL('/login');
  });

  test('successful logout', async ({ page }) => {
    // Login first
    await loginAsTestUser(page);

    // Click user menu and logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    // Should redirect to homepage
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Login')).toBeVisible();
    await expect(page.locator('[data-testid="user-menu"]')).not.toBeVisible();
  });

  test('protected route redirects to login', async ({ page }) => {
    // Try to access dashboard without logging in
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL('/login');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Please log in');
  });

  test('form validation errors', async ({ page }) => {
    await page.click('text=Sign Up');
    await expect(page).toHaveURL('/register');

    // Try to submit empty form
    await page.click('[data-testid="register-button"]');

    // Should show validation errors
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible();

    // Fill invalid email
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.blur('[data-testid="email-input"]');
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Invalid email');

    // Fill mismatched passwords
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.fill('[data-testid="confirm-password-input"]', 'different123');
    await page.blur('[data-testid="confirm-password-input"]');
    await expect(page.locator('[data-testid="confirm-password-error"]')).toContainText(
      'Passwords do not match',
    );
  });
});

// Helper function to login as test user
async function loginAsTestUser(page: Page) {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', 'test.parent1@example.com');
  await page.fill('[data-testid="password-input"]', 'testpass123');
  await page.click('[data-testid="login-button"]');
  await expect(page).toHaveURL('/dashboard');
}
