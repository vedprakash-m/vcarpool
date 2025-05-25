import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display the login page', async ({ page }) => {
    await page.goto('/login');
    
    // Check if login form elements are present
    await expect(page.getByRole('heading', { name: /sign in to your account/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email address/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    
    // Check if the registration link is present
    await expect(page.getByRole('link', { name: /create a new account/i })).toBeVisible();
  });
  
  test('should show validation errors with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Try to submit without entering credentials
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Check for validation errors (Zod's default messages)
    await expect(page.getByText(/invalid email/i)).toBeVisible();
    
    // Enter invalid email format
    await page.getByPlaceholder(/email address/i).fill('invalid-email');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Check for email format validation
    await expect(page.getByText(/invalid email/i)).toBeVisible();
  });
});

test.describe('Trip Listing', () => {
  // This test requires authentication
  test.beforeEach(async ({ page }) => {
    // Mock authentication API endpoint
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
              role: 'user'
            },
            token: 'mock-token',
            refreshToken: 'mock-refresh-token'
          }
        })
      });
    });

    // Mock trips API endpoints
    await page.route('**/api/trips/my-trips', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: []
        })
      });
    });

    await page.route('**/api/trips/available', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: []
        })
      });
    });

    // Set Zustand persisted state
    await page.goto('/');
    await page.evaluate(() => {
      // Clear any existing state
      localStorage.clear();
      
      // Set Zustand persisted auth state (using correct key name)
      const authState = {
        state: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            role: 'user'
          },
          token: 'mock-token',
          refreshToken: 'mock-refresh-token',
          isAuthenticated: true,
          isLoading: false,
          loading: false,
          error: null
        },
        version: 0
      };
      localStorage.setItem('auth-storage', JSON.stringify(authState));
    });
    
    // Reload to apply the auth state
    await page.reload();
  });

  test('should navigate to trips page', async ({ page }) => {
    await page.goto('/trips');
    
    // Wait for the page to load and check if we're on the trips page
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Trips', exact: true })).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('should display the homepage', async ({ page }) => {
    await page.goto('/');
    
    // Check for common elements on the homepage
    await expect(page.getByRole('heading', { name: /smart carpool/i })).toBeVisible();
    // Use the header link specifically to avoid ambiguity
    await expect(page.locator('header').getByRole('link', { name: /sign in/i })).toBeVisible();
  });
  
  test('should navigate between pages', async ({ page }) => {
    await page.goto('/');
    
    // Click on login link and verify we navigate to login page (use header link)
    await page.locator('header').getByRole('link', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/login$/);
    
    // Navigate to register page from login
    await page.getByRole('link', { name: /create a new account/i }).click();
    await expect(page).toHaveURL(/\/register$/);
  });
});
