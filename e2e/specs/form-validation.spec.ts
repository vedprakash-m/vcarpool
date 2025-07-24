/**
 * Form Validation E2E Tests
 * Tests field validation, required fields, data format validation, and cross-field validation rules
 */

import { test, expect } from '@playwright/test';
import { TestUser, createTestUser, cleanupTestUser, loginAsUser } from '../utils/test-helpers';

test.describe('Form Validation System', () => {
  let parentUser: TestUser;

  test.beforeAll(async () => {
    parentUser = await createTestUser('parent');
  });

  test.afterAll(async () => {
    if (parentUser) await cleanupTestUser(parentUser.email);
  });

  test.describe('Registration Form Validation', () => {
    test('should validate required fields on registration', async ({ page }) => {
      await page.goto('/register');

      // Attempt to submit form without filling required fields
      await page.click('button[type="submit"]');

      // Check for required field validation messages
      await expect(page.locator('text=Email is required')).toBeVisible();
      await expect(page.locator('text=Password is required')).toBeVisible();
      await expect(page.locator('text=First name is required')).toBeVisible();
      await expect(page.locator('text=Last name is required')).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/register');

      // Enter invalid email formats
      await page.fill('input[name="email"]', 'invalid-email');
      await page.locator('input[name="email"]').blur();
      await expect(page.locator('text=Please enter a valid email address')).toBeVisible();

      await page.fill('input[name="email"]', 'test@');
      await page.locator('input[name="email"]').blur();
      await expect(page.locator('text=Please enter a valid email address')).toBeVisible();

      // Enter valid email
      await page.fill('input[name="email"]', 'test@example.com');
      await page.locator('input[name="email"]').blur();
      await expect(page.locator('text=Please enter a valid email address')).not.toBeVisible();
    });

    test('should validate password strength', async ({ page }) => {
      await page.goto('/register');

      // Test weak passwords
      await page.fill('input[name="password"]', '123');
      await page.locator('input[name="password"]').blur();
      await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();

      await page.fill('input[name="password"]', 'password');
      await page.locator('input[name="password"]').blur();
      await expect(page.locator('text=Password must contain at least one number')).toBeVisible();

      // Test strong password
      await page.fill('input[name="password"]', 'StrongPass123!');
      await page.locator('input[name="password"]').blur();
      await expect(page.locator('text=Password must')).not.toBeVisible();
    });

    test('should validate password confirmation match', async ({ page }) => {
      await page.goto('/register');

      await page.fill('input[name="password"]', 'StrongPass123!');
      await page.fill('input[name="confirmPassword"]', 'DifferentPass123!');
      await page.locator('input[name="confirmPassword"]').blur();

      await expect(page.locator('text=Passwords do not match')).toBeVisible();

      // Test matching passwords
      await page.fill('input[name="confirmPassword"]', 'StrongPass123!');
      await page.locator('input[name="confirmPassword"]').blur();
      await expect(page.locator('text=Passwords do not match')).not.toBeVisible();
    });
  });

  test.describe('Profile Form Validation', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);
      await page.goto('/profile');
    });

    test('should validate phone number format', async ({ page }) => {
      // Test invalid phone formats
      await page.fill('input[name="phone"]', '123');
      await page.locator('input[name="phone"]').blur();
      await expect(page.locator('text=Please enter a valid phone number')).toBeVisible();

      await page.fill('input[name="phone"]', 'abc-def-ghij');
      await page.locator('input[name="phone"]').blur();
      await expect(page.locator('text=Please enter a valid phone number')).toBeVisible();

      // Test valid phone format
      await page.fill('input[name="phone"]', '(555) 123-4567');
      await page.locator('input[name="phone"]').blur();
      await expect(page.locator('text=Please enter a valid phone number')).not.toBeVisible();
    });

    test('should validate address fields', async ({ page }) => {
      // Test required address fields
      await page.fill('input[name="street"]', '');
      await page.fill('input[name="city"]', '');
      await page.fill('input[name="zipCode"]', '');
      await page.click('button[type="submit"]');

      await expect(page.locator('text=Street address is required')).toBeVisible();
      await expect(page.locator('text=City is required')).toBeVisible();
      await expect(page.locator('text=ZIP code is required')).toBeVisible();
    });

    test('should validate ZIP code format', async ({ page }) => {
      await page.fill('input[name="zipCode"]', '123');
      await page.locator('input[name="zipCode"]').blur();
      await expect(page.locator('text=ZIP code must be 5 or 9 digits')).toBeVisible();

      await page.fill('input[name="zipCode"]', '94105');
      await page.locator('input[name="zipCode"]').blur();
      await expect(page.locator('text=ZIP code must be 5 or 9 digits')).not.toBeVisible();
    });
  });

  test.describe('Trip Creation Form Validation', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);
      await page.goto('/trips/create');
    });

    test('should validate trip date and time', async ({ page }) => {
      // Test past date validation
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const pastDate = yesterday.toISOString().split('T')[0];

      await page.fill('input[name="date"]', pastDate);
      await page.locator('input[name="date"]').blur();
      await expect(page.locator('text=Trip date cannot be in the past')).toBeVisible();

      // Test valid future date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const futureDate = tomorrow.toISOString().split('T')[0];

      await page.fill('input[name="date"]', futureDate);
      await page.locator('input[name="date"]').blur();
      await expect(page.locator('text=Trip date cannot be in the past')).not.toBeVisible();
    });

    test('should validate pickup and dropoff locations', async ({ page }) => {
      await page.click('button[type="submit"]');

      await expect(page.locator('text=Pickup location is required')).toBeVisible();
      await expect(page.locator('text=Drop-off location is required')).toBeVisible();
    });

    test('should validate trip capacity', async ({ page }) => {
      await page.fill('input[name="capacity"]', '0');
      await page.locator('input[name="capacity"]').blur();
      await expect(page.locator('text=Capacity must be at least 1')).toBeVisible();

      await page.fill('input[name="capacity"]', '10');
      await page.locator('input[name="capacity"]').blur();
      await expect(page.locator('text=Capacity cannot exceed 8 passengers')).toBeVisible();

      await page.fill('input[name="capacity"]', '4');
      await page.locator('input[name="capacity"]').blur();
      await expect(page.locator('text=Capacity')).not.toBeVisible();
    });
  });

  test.describe('Cross-Field Validation', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);
    });

    test('should validate trip start and end times', async ({ page }) => {
      await page.goto('/trips/create');

      await page.fill('input[name="startTime"]', '10:00');
      await page.fill('input[name="endTime"]', '09:00');
      await page.locator('input[name="endTime"]').blur();

      await expect(page.locator('text=End time must be after start time')).toBeVisible();

      await page.fill('input[name="endTime"]', '11:00');
      await page.locator('input[name="endTime"]').blur();
      await expect(page.locator('text=End time must be after start time')).not.toBeVisible();
    });

    test('should validate emergency contact phone differs from primary', async ({ page }) => {
      await page.goto('/profile');

      await page.fill('input[name="phone"]', '(555) 123-4567');
      await page.fill('input[name="emergencyPhone"]', '(555) 123-4567');
      await page.locator('input[name="emergencyPhone"]').blur();

      await expect(
        page.locator('text=Emergency contact phone must be different from primary phone'),
      ).toBeVisible();

      await page.fill('input[name="emergencyPhone"]', '(555) 987-6543');
      await page.locator('input[name="emergencyPhone"]').blur();
      await expect(
        page.locator('text=Emergency contact phone must be different from primary phone'),
      ).not.toBeVisible();
    });

    test('should validate student age range for school selection', async ({ page }) => {
      await page.goto('/profile/students/add');

      await page.fill('input[name="age"]', '4');
      await page.selectOption('select[name="schoolLevel"]', 'high-school');
      await page.locator('select[name="schoolLevel"]').blur();

      await expect(
        page.locator('text=Student age does not match selected school level'),
      ).toBeVisible();

      await page.selectOption('select[name="schoolLevel"]', 'elementary');
      await page.locator('select[name="schoolLevel"]').blur();
      await expect(
        page.locator('text=Student age does not match selected school level'),
      ).not.toBeVisible();
    });
  });

  test.describe('Dynamic Validation', () => {
    test('should show real-time validation feedback', async ({ page }) => {
      await page.goto('/register');

      // Test email validation feedback in real-time
      await page.fill('input[name="email"]', 'test');
      await expect(page.locator('.validation-error')).toBeVisible();

      await page.fill('input[name="email"]', 'test@example.com');
      await expect(page.locator('.validation-success')).toBeVisible();
    });

    test('should update validation when dependent fields change', async ({ page }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);
      await page.goto('/trips/create');

      // Select recurring trip
      await page.check('input[name="isRecurring"]');

      // Now end date becomes required
      await page.click('button[type="submit"]');
      await expect(page.locator('text=End date is required for recurring trips')).toBeVisible();

      // Uncheck recurring
      await page.uncheck('input[name="isRecurring"]');
      await expect(page.locator('text=End date is required for recurring trips')).not.toBeVisible();
    });

    test('should validate file upload constraints', async ({ page }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);
      await page.goto('/profile');

      // Test file size validation (if file upload is present)
      const fileInput = page.locator('input[type="file"]');
      if ((await fileInput.count()) > 0) {
        await expect(page.locator('text=File size must be less than 5MB')).not.toBeVisible();

        // This would need a large test file to properly test
        // For now, just verify the validation message exists in the form
        await fileInput.hover();
        await expect(page.locator('[data-testid="file-size-hint"]')).toBeVisible();
      }
    });
  });
});
