import { test, expect, Page } from '@playwright/test';

// Test configuration for authentication flows
const TEST_CONFIG = {
  FRONTEND_URL: process.env.E2E_FRONTEND_URL || 'http://localhost:3001',
  BACKEND_URL: process.env.E2E_BACKEND_URL || 'http://localhost:7072',
  LEGACY_USER: {
    email: 'legacy.user@example.com',
    password: 'TestPassword123!',
    name: 'Legacy Test User',
  },
  ENTRA_USER: {
    email: 'entra.user@vedid.onmicrosoft.com',
    password: 'EntraTestPassword123!',
    name: 'Entra Test User',
  },
};

test.describe('Authentication E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto(TEST_CONFIG.FRONTEND_URL);
  });

  test.describe('Legacy Authentication Flow', () => {
    test('should login successfully with valid legacy credentials', async ({ page }) => {
      // Navigate to login page
      await expect(page.locator('h2:has-text("Sign in to Carpool")')).toBeVisible();

      // Check for toggle to legacy login
      const legacyToggle = page.locator('button:has-text("Use Email & Password")');
      if (await legacyToggle.isVisible()) {
        await legacyToggle.click();
      }

      // Fill in legacy credentials
      await page.fill('input[type="email"]', TEST_CONFIG.LEGACY_USER.email);
      await page.fill('input[type="password"]', TEST_CONFIG.LEGACY_USER.password);

      // Submit form
      await page.click('button[type="submit"]:has-text("Sign In")');

      // Wait for navigation to dashboard
      await expect(page).toHaveURL(/\/dashboard/);

      // Verify user is authenticated
      await expect(page.locator('text="Welcome"')).toBeVisible({ timeout: 10000 });
      await expect(page.locator(`text="${TEST_CONFIG.LEGACY_USER.name}"`)).toBeVisible();
    });

    test('should show error for invalid legacy credentials', async ({ page }) => {
      // Navigate to login page and toggle to legacy
      const legacyToggle = page.locator('button:has-text("Use Email & Password")');
      if (await legacyToggle.isVisible()) {
        await legacyToggle.click();
      }

      // Fill in invalid credentials
      await page.fill('input[type="email"]', 'invalid@example.com');
      await page.fill('input[type="password"]', 'wrongpassword');

      // Submit form
      await page.click('button[type="submit"]:has-text("Sign In")');

      // Verify error message
      await expect(page.locator('.bg-red-50')).toBeVisible();
      await expect(page.locator('text="Authentication failed"')).toBeVisible();
    });

    test('should validate required fields for legacy login', async ({ page }) => {
      // Navigate to login page and toggle to legacy
      const legacyToggle = page.locator('button:has-text("Use Email & Password")');
      if (await legacyToggle.isVisible()) {
        await legacyToggle.click();
      }

      // Try to submit without filling fields
      await page.click('button[type="submit"]:has-text("Sign In")');

      // Verify validation (HTML5 validation or custom validation)
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');

      await expect(emailInput).toHaveAttribute('required');
      await expect(passwordInput).toHaveAttribute('required');
    });
  });

  test.describe('Microsoft Entra ID Authentication Flow', () => {
    test('should redirect to Microsoft login when Entra button is clicked', async ({ page }) => {
      // Look for Microsoft login button
      const microsoftButton = page.locator('button:has-text("Continue with Microsoft")');
      await expect(microsoftButton).toBeVisible();

      // Click Microsoft login button
      await microsoftButton.click();

      // Note: In a real E2E test, we would need to handle the Microsoft login redirect
      // For now, we'll just verify the redirect is attempted
      // In production tests, you might use a test tenant with pre-configured test users

      // Wait for either redirect or error handling
      await page.waitForTimeout(2000);

      // Verify we're either redirected or there's proper error handling
      const currentUrl = page.url();
      const hasRedirect =
        currentUrl.includes('login.microsoftonline.com') ||
        currentUrl.includes('error') ||
        currentUrl.includes('dashboard');

      expect(hasRedirect).toBeTruthy();
    });

    test('should handle Entra ID authentication callback', async ({ page }) => {
      // This test would simulate a successful Entra ID callback
      // In a real scenario, this would involve:
      // 1. Mock the Microsoft login redirect
      // 2. Simulate the callback with a valid token
      // 3. Verify the user is authenticated

      // For now, we'll simulate the callback scenario by directly calling the auth endpoint
      const mockToken = 'mock-entra-id-token';

      // Navigate to a callback simulation page or directly test the API
      const response = await page.request.post(
        `${TEST_CONFIG.BACKEND_URL}/api/auth-entra-unified`,
        {
          data: {
            authMethod: 'entra',
          },
          headers: {
            Authorization: `Bearer ${mockToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // In a real test, this would be a valid token and should succeed
      // For this demo, we expect it to fail with invalid token
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Authentication State Management', () => {
    test('should maintain authentication state across page refreshes', async ({ page }) => {
      // First, login with legacy credentials
      const legacyToggle = page.locator('button:has-text("Use Email & Password")');
      if (await legacyToggle.isVisible()) {
        await legacyToggle.click();
      }

      await page.fill('input[type="email"]', TEST_CONFIG.LEGACY_USER.email);
      await page.fill('input[type="password"]', TEST_CONFIG.LEGACY_USER.password);
      await page.click('button[type="submit"]:has-text("Sign In")');

      // Wait for successful login
      await expect(page).toHaveURL(/\/dashboard/);

      // Refresh the page
      await page.reload();

      // Verify user is still authenticated
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.locator(`text="${TEST_CONFIG.LEGACY_USER.name}"`)).toBeVisible();
    });

    test('should handle logout correctly', async ({ page }) => {
      // First, login
      const legacyToggle = page.locator('button:has-text("Use Email & Password")');
      if (await legacyToggle.isVisible()) {
        await legacyToggle.click();
      }

      await page.fill('input[type="email"]', TEST_CONFIG.LEGACY_USER.email);
      await page.fill('input[type="password"]', TEST_CONFIG.LEGACY_USER.password);
      await page.click('button[type="submit"]:has-text("Sign In")');

      // Wait for successful login
      await expect(page).toHaveURL(/\/dashboard/);

      // Find and click logout button
      const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out")');
      await logoutButton.click();

      // Verify redirect to login page
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator('h2:has-text("Sign in to Carpool")')).toBeVisible();
    });

    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Try to access protected route directly
      await page.goto(`${TEST_CONFIG.FRONTEND_URL}/dashboard`);

      // Should be redirected to login
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator('h2:has-text("Sign in to Carpool")')).toBeVisible();
    });
  });

  test.describe('Authentication Method Toggle', () => {
    test('should toggle between Microsoft and legacy login forms', async ({ page }) => {
      // Initially should show Microsoft login
      await expect(page.locator('button:has-text("Continue with Microsoft")')).toBeVisible();

      // Toggle to legacy
      const legacyToggle = page.locator('button:has-text("Use Email & Password")');
      if (await legacyToggle.isVisible()) {
        await legacyToggle.click();

        // Should now show email/password form
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]:has-text("Sign In")')).toBeVisible();

        // Should show toggle back to Microsoft
        const microsoftToggle = page.locator('button:has-text("Use Microsoft Account")');
        if (await microsoftToggle.isVisible()) {
          await microsoftToggle.click();

          // Should be back to Microsoft login
          await expect(page.locator('button:has-text("Continue with Microsoft")')).toBeVisible();
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Intercept and block API requests to simulate network error
      await page.route('**/api/auth-entra-unified', (route) => {
        route.abort('failed');
      });

      // Try to login with legacy credentials
      const legacyToggle = page.locator('button:has-text("Use Email & Password")');
      if (await legacyToggle.isVisible()) {
        await legacyToggle.click();
      }

      await page.fill('input[type="email"]', TEST_CONFIG.LEGACY_USER.email);
      await page.fill('input[type="password"]', TEST_CONFIG.LEGACY_USER.password);
      await page.click('button[type="submit"]:has-text("Sign In")');

      // Should show network error
      await expect(page.locator('.bg-red-50')).toBeVisible();
      await expect(page.locator('text="Network error"')).toBeVisible();
    });

    test('should clear errors when switching authentication methods', async ({ page }) => {
      // Try invalid legacy login to generate error
      const legacyToggle = page.locator('button:has-text("Use Email & Password")');
      if (await legacyToggle.isVisible()) {
        await legacyToggle.click();
      }

      await page.fill('input[type="email"]', 'invalid@example.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]:has-text("Sign In")');

      // Verify error is shown
      await expect(page.locator('.bg-red-50')).toBeVisible();

      // Switch back to Microsoft login
      const microsoftToggle = page.locator('button:has-text("Use Microsoft Account")');
      if (await microsoftToggle.isVisible()) {
        await microsoftToggle.click();

        // Error should be cleared
        await expect(page.locator('.bg-red-50')).not.toBeVisible();
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should be accessible with keyboard navigation', async ({ page }) => {
      // Test keyboard navigation through the form
      await page.keyboard.press('Tab');

      // Should focus on Microsoft login button first
      const microsoftButton = page.locator('button:has-text("Continue with Microsoft")');
      await expect(microsoftButton).toBeFocused();

      // Continue tabbing to reach toggle button
      await page.keyboard.press('Tab');
      const legacyToggle = page.locator('button:has-text("Use Email & Password")');
      if (await legacyToggle.isVisible()) {
        await expect(legacyToggle).toBeFocused();

        // Activate toggle with Enter
        await page.keyboard.press('Enter');

        // Should now focus on email input
        await page.keyboard.press('Tab');
        await expect(page.locator('input[type="email"]')).toBeFocused();
      }
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Check for proper accessibility attributes
      const loginForm = page.locator('form');
      await expect(loginForm).toHaveAttribute('role', 'form');

      // Check input labels
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');

      if (await emailInput.isVisible()) {
        await expect(emailInput).toHaveAttribute('aria-label');
        await expect(passwordInput).toHaveAttribute('aria-label');
      }

      // Check error messages have proper ARIA attributes
      const errorMessage = page.locator('.bg-red-50');
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toHaveAttribute('role', 'alert');
      }
    });
  });
});

// Helper function to setup test data
async function setupTestData(page: Page) {
  // This would create test users in the database if needed
  // For now, we assume test users already exist

  const response = await page.request.post(`${TEST_CONFIG.BACKEND_URL}/api/test-setup`, {
    data: {
      action: 'create-test-users',
      users: [TEST_CONFIG.LEGACY_USER, TEST_CONFIG.ENTRA_USER],
    },
  });

  return response.ok();
}

// Helper function to cleanup test data
async function cleanupTestData(page: Page) {
  const response = await page.request.post(`${TEST_CONFIG.BACKEND_URL}/api/test-cleanup`, {
    data: {
      action: 'cleanup-test-users',
    },
  });

  return response.ok();
}
