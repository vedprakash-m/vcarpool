/**
 * User Registration E2E Tests
 * Tests the complete user registration flow including form validation and onboarding
 */

import { test, expect, Page } from '@playwright/test';
import { TestUser, createTestUser, cleanupTestUser } from '../utils/test-helpers';

test.describe('User Registration Flow', () => {
  let testUser: TestUser;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.afterEach(async () => {
    if (testUser) {
      await cleanupTestUser(testUser.email);
    }
  });

  test('successful family registration with complete flow', async ({ page }) => {
    testUser = await createTestUser('parent');

    // Navigate to registration page
    await page.click('text=Sign Up');
    await expect(page).toHaveURL('/register');

    // Step 1: Family and Parent Information
    await page.fill('[data-testid="family-name-input"]', `${testUser.name} Family`);
    await page.fill('[data-testid="parent-first-name-input"]', testUser.name.split(' ')[0]);
    await page.fill('[data-testid="parent-last-name-input"]', testUser.name.split(' ')[1] || 'Doe');
    await page.fill('[data-testid="parent-email-input"]', testUser.email);
    await page.fill('[data-testid="parent-password-input"]', testUser.password);
    await page.fill('[data-testid="parent-phone-input"]', testUser.phone);

    // Continue to next step
    await page.click('[data-testid="next-step-button"]');

    // Step 2: Home Address Verification
    await page.fill('[data-testid="address-street-input"]', '123 Test Street');
    await page.fill('[data-testid="address-city-input"]', 'Redmond');
    await page.fill('[data-testid="address-state-input"]', 'WA');
    await page.fill('[data-testid="address-zip-input"]', '98052');

    // Validate address (mock validation)
    await page.click('[data-testid="validate-address-button"]');
    await expect(page.locator('[data-testid="address-validated-indicator"]')).toBeVisible();

    // Continue to next step
    await page.click('[data-testid="next-step-button"]');

    // Step 3: Children Information
    await page.fill('[data-testid="child-first-name-0"]', 'Emma');
    await page.fill('[data-testid="child-last-name-0"]', testUser.name.split(' ')[1] || 'Doe');
    await page.selectOption('[data-testid="child-grade-0"]', '5');
    await page.selectOption('[data-testid="child-school-0"]', 'Tesla STEM High School');

    // Add another child
    await page.click('[data-testid="add-child-button"]');
    await page.fill('[data-testid="child-first-name-1"]', 'Alex');
    await page.fill('[data-testid="child-last-name-1"]', testUser.name.split(' ')[1] || 'Doe');
    await page.selectOption('[data-testid="child-grade-1"]', '8');
    await page.selectOption('[data-testid="child-school-1"]', 'Tesla STEM High School');

    // Submit registration
    await page.click('[data-testid="complete-registration-button"]');

    // Should redirect to dashboard or welcome page
    await expect(page).toHaveURL(/\/(dashboard|welcome|registration-complete)/);
    await expect(page.locator('[data-testid="registration-success-message"]')).toBeVisible();
  });

  test('child registration flow', async ({ page }) => {
    // Navigate to child registration page
    await page.goto('/register/child');
    await expect(page).toHaveURL('/register/child');

    // Fill child registration form
    await page.fill('[data-testid="child-first-name-input"]', 'Sarah');
    await page.fill('[data-testid="child-last-name-input"]', 'Johnson');
    await page.fill('[data-testid="child-email-input"]', 'sarah.johnson@student.example.com');
    await page.fill('[data-testid="child-password-input"]', 'securepass123');
    await page.fill('[data-testid="child-confirm-password-input"]', 'securepass123');
    await page.fill('[data-testid="parent-invite-code-input"]', 'ABC123XYZ');
    await page.fill('[data-testid="child-phone-input"]', '+1555987654');
    await page.selectOption('[data-testid="child-grade-select"]', '10');
    await page.fill('[data-testid="student-id-input"]', 'STU12345');
    await page.fill('[data-testid="emergency-contact-input"]', 'Parent: +1555123456');

    // Submit registration
    await page.click('[data-testid="create-student-account-button"]');

    // Should show success message
    await expect(page.locator('[data-testid="registration-success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="registration-success-message"]')).toContainText(
      'Registration successful',
    );

    // Should redirect to login page after delay
    await page.waitForURL('/login', { timeout: 5000 });
    await expect(page).toHaveURL('/login');
  });

  test('smart registration flow with auto-detection', async ({ page }) => {
    // Navigate to smart registration
    await page.goto('/signup/smart-registration');
    await expect(page).toHaveURL('/signup/smart-registration');

    // Step 1: Family & Address
    await page.fill('[data-testid="parent-name-input"]', 'John Smith');
    await page.fill('[data-testid="parent-email-input"]', 'john.smith@example.com');
    await page.fill('[data-testid="parent-phone-input"]', '+15551234567');

    // Address input
    await page.fill('[data-testid="address-street-input"]', '456 Smart Street');
    await page.fill('[data-testid="address-city-input"]', 'Redmond');
    await page.fill('[data-testid="address-state-input"]', 'WA');
    await page.fill('[data-testid="address-zip-input"]', '98052');

    // Should auto-detect school
    await expect(page.locator('[data-testid="school-detected-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="detected-school-name"]')).toContainText(
      'Tesla STEM High School',
    );

    // Check driving availability
    await page.check('[data-testid="can-drive-checkbox"]');

    // Continue to next step
    await page.click('[data-testid="next-children-button"]');

    // Step 2: Children with auto-inference
    await page.fill('[data-testid="child-name-0"]', 'Emma Smith');
    await page.fill('[data-testid="child-birthdate-0"]', '2013-08-15'); // Should auto-infer grade

    // Should show inferred grade
    await expect(page.locator('[data-testid="inferred-grade-0"]')).toBeVisible();
    await expect(page.locator('[data-testid="inferred-grade-0"]')).toContainText('5th Grade');

    // School should be auto-populated
    await expect(page.locator('[data-testid="auto-school-0"]')).toContainText(
      'Tesla STEM High School',
    );

    // Continue to review
    await page.click('[data-testid="review-registration-button"]');

    // Step 3: Review
    await expect(page.locator('[data-testid="review-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="review-parent-info"]')).toContainText('John Smith');
    await expect(page.locator('[data-testid="review-children-info"]')).toContainText('Emma Smith');

    // Complete registration
    await page.click('[data-testid="complete-registration-button"]');

    // Should redirect to registration complete page
    await expect(page).toHaveURL('/parents/registration-complete');
    await expect(page.locator('[data-testid="smart-registration-success"]')).toBeVisible();
  });

  test('registration form validation errors', async ({ page }) => {
    await page.goto('/register');

    // Try to submit empty form
    await page.click('[data-testid="next-step-button"]');

    // Should show validation errors
    await expect(page.locator('[data-testid="family-name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="parent-first-name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="parent-email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="parent-password-error"]')).toBeVisible();

    // Test invalid email format
    await page.fill('[data-testid="parent-email-input"]', 'invalid-email');
    await page.blur('[data-testid="parent-email-input"]');
    await expect(page.locator('[data-testid="parent-email-error"]')).toContainText('Invalid email');

    // Test weak password
    await page.fill('[data-testid="parent-password-input"]', '123');
    await page.blur('[data-testid="parent-password-input"]');
    await expect(page.locator('[data-testid="parent-password-error"]')).toContainText(
      'at least 8 characters',
    );

    // Test invalid phone number
    await page.fill('[data-testid="parent-phone-input"]', '123');
    await page.blur('[data-testid="parent-phone-input"]');
    await expect(page.locator('[data-testid="parent-phone-error"]')).toContainText('Invalid phone');
  });

  test('duplicate email registration prevention', async ({ page }) => {
    // Try to register with an existing email
    await page.goto('/register');

    await page.fill('[data-testid="family-name-input"]', 'Test Family');
    await page.fill('[data-testid="parent-first-name-input"]', 'John');
    await page.fill('[data-testid="parent-last-name-input"]', 'Doe');
    await page.fill('[data-testid="parent-email-input"]', 'test.parent1@example.com'); // Pre-seeded email
    await page.fill('[data-testid="parent-password-input"]', 'password123');
    await page.fill('[data-testid="parent-phone-input"]', '+15551234567');

    await page.click('[data-testid="next-step-button"]');

    // Fill address
    await page.fill('[data-testid="address-street-input"]', '123 Test Street');
    await page.fill('[data-testid="address-city-input"]', 'Redmond');
    await page.fill('[data-testid="address-state-input"]', 'WA');
    await page.fill('[data-testid="address-zip-input"]', '98052');
    await page.click('[data-testid="validate-address-button"]');
    await page.click('[data-testid="next-step-button"]');

    // Fill child info
    await page.fill('[data-testid="child-first-name-0"]', 'Emma');
    await page.fill('[data-testid="child-last-name-0"]', 'Doe');
    await page.selectOption('[data-testid="child-grade-0"]', '5');

    // Submit registration
    await page.click('[data-testid="complete-registration-button"]');

    // Should show error about duplicate email
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'email address already exists',
    );
  });

  test('address validation requirements', async ({ page }) => {
    await page.goto('/register');

    // Fill initial info and proceed to address step
    await page.fill('[data-testid="family-name-input"]', 'Test Family');
    await page.fill('[data-testid="parent-first-name-input"]', 'John');
    await page.fill('[data-testid="parent-last-name-input"]', 'Doe');
    await page.fill('[data-testid="parent-email-input"]', 'unique@example.com');
    await page.fill('[data-testid="parent-password-input"]', 'password123');
    await page.click('[data-testid="next-step-button"]');

    // Try to proceed without address validation
    await page.fill('[data-testid="address-street-input"]', '123 Unvalidated Street');
    await page.fill('[data-testid="address-city-input"]', 'Unknown City');
    await page.fill('[data-testid="address-state-input"]', 'XX');
    await page.fill('[data-testid="address-zip-input"]', '00000');

    // Next button should be disabled without validation
    await expect(page.locator('[data-testid="next-step-button"]')).toBeDisabled();

    // Validate address
    await page.click('[data-testid="validate-address-button"]');

    // Should show validation error for invalid address
    await expect(page.locator('[data-testid="address-validation-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="address-validation-error"]')).toContainText(
      'Unable to validate address',
    );

    // Enter valid address
    await page.fill('[data-testid="address-street-input"]', '123 Valid Street');
    await page.fill('[data-testid="address-city-input"]', 'Redmond');
    await page.fill('[data-testid="address-state-input"]', 'WA');
    await page.fill('[data-testid="address-zip-input"]', '98052');
    await page.click('[data-testid="validate-address-button"]');

    // Should show success and enable next button
    await expect(page.locator('[data-testid="address-validated-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="next-step-button"]')).toBeEnabled();
  });

  test('child registration form validation', async ({ page }) => {
    await page.goto('/register/child');

    // Submit empty form
    await page.click('[data-testid="create-student-account-button"]');

    // Should show validation errors
    await expect(page.locator('[data-testid="first-name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="invite-code-error"]')).toBeVisible();

    // Test password mismatch
    await page.fill('[data-testid="child-password-input"]', 'password123');
    await page.fill('[data-testid="child-confirm-password-input"]', 'different123');
    await page.blur('[data-testid="child-confirm-password-input"]');

    await expect(page.locator('[data-testid="confirm-password-error"]')).toContainText(
      'Passwords do not match',
    );

    // Test invalid email format
    await page.fill('[data-testid="child-email-input"]', 'invalid-email');
    await page.blur('[data-testid="child-email-input"]');
    await expect(page.locator('[data-testid="email-error"]')).toContainText('valid email');

    // Test short password
    await page.fill('[data-testid="child-password-input"]', '123');
    await page.blur('[data-testid="child-password-input"]');
    await expect(page.locator('[data-testid="password-error"]')).toContainText(
      'at least 8 characters',
    );
  });
});
