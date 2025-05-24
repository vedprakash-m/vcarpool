import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display the login page', async ({ page }) => {
    await page.goto('/login');
    
    // Check if login form elements are present
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    
    // Check if the registration link is present
    await expect(page.getByRole('link', { name: /register/i })).toBeVisible();
  });
  
  test('should show validation errors with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Try to submit without entering credentials
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Check for validation errors
    await expect(page.getByText(/email is required/i)).toBeVisible();
    
    // Enter invalid email format
    await page.getByLabel(/email/i).fill('invalid-email');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Check for email format validation
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });
});

test.describe('Trip Listing', () => {
  // This test requires authentication
  test.beforeEach(async ({ page }) => {
    // Mock authentication for testing
    await page.goto('/');
    
    // Set localStorage to simulate logged in state
    await page.evaluate(() => {
      localStorage.setItem('access_token', 'mock-token');
      localStorage.setItem('refresh_token', 'mock-refresh-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'test-user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      }));
    });
    
    // Reload page to apply authentication
    await page.reload();
  });
  
  test('should navigate to trips page', async ({ page }) => {
    await page.goto('/trips');
    
    // Check if we're on the trips page
    await expect(page.getByRole('heading', { name: /trips/i })).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('should display the homepage', async ({ page }) => {
    await page.goto('/');
    
    // Check for common elements on the homepage
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /login/i })).toBeVisible();
  });
  
  test('should navigate between pages', async ({ page }) => {
    await page.goto('/');
    
    // Click on login link and verify we navigate to login page
    await page.getByRole('link', { name: /login/i }).click();
    await expect(page).toHaveURL(/\/login$/);
    
    // Navigate to register page
    await page.getByRole('link', { name: /register/i }).click();
    await expect(page).toHaveURL(/\/register$/);
  });
});
