/**
 * End-to-End Journeys E2E Tests
 * Tests complete user onboarding flows, full carpool lifecycle, and system integration scenarios
 */

import { test, expect } from '@playwright/test';
import {
  TestUser,
  createTestUser,
  cleanupTestUser,
  loginAsUser,
  makeApiRequest,
} from '../utils/test-helpers';

test.describe('End-to-End User Journeys', () => {
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

  test.describe('Complete User Onboarding Flow', () => {
    test('should complete full parent registration and setup', async ({ page }) => {
      // Step 1: Navigate to registration
      await page.goto('/register');

      // Step 2: Fill registration form
      await page.fill('input[name="email"]', 'newparent@example.com');
      await page.fill('input[name="password"]', 'SecurePass123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePass123!');
      await page.fill('input[name="firstName"]', 'John');
      await page.fill('input[name="lastName"]', 'Doe');
      await page.fill('input[name="phone"]', '(555) 123-4567');

      // Step 3: Submit registration
      await page.click('button[type="submit"]');

      // Step 4: Verify email verification prompt
      await expect(page.locator('text=Please verify your email')).toBeVisible();

      // Step 5: Simulate email verification (in real scenario, would check email)
      await page.goto('/verify-email?token=mock-verification-token');
      await expect(page.locator('text=Email verified successfully')).toBeVisible();

      // Step 6: Complete profile setup
      await page.goto('/profile/setup');
      await page.fill('input[name="street"]', '123 Main Street');
      await page.fill('input[name="city"]', 'San Francisco');
      await page.selectOption('select[name="state"]', 'CA');
      await page.fill('input[name="zipCode"]', '94105');

      // Step 7: Add emergency contact
      await page.fill('input[name="emergencyContactName"]', 'Jane Doe');
      await page.fill('input[name="emergencyContactPhone"]', '(555) 987-6543');
      await page.fill('input[name="emergencyContactRelation"]', 'Spouse');

      // Step 8: Add student information
      await page.click('button[data-testid="add-student"]');
      await page.fill('input[name="studentFirstName"]', 'Tommy');
      await page.fill('input[name="studentLastName"]', 'Doe');
      await page.fill('input[name="studentAge"]', '8');
      await page.selectOption('select[name="studentGrade"]', '3');
      await page.selectOption('select[name="school"]', 'Lincoln Elementary');

      // Step 9: Set preferences
      await page.check('input[name="canDrive"]');
      await page.fill('input[name="maxDistance"]', '10');
      await page.selectOption('select[name="preferredTimes"]', 'morning');

      // Step 10: Complete setup
      await page.click('button[data-testid="complete-setup"]');

      // Step 11: Verify successful onboarding
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.locator('text=Welcome to Carpool, John!')).toBeVisible();
      await expect(page.locator('[data-testid="onboarding-complete"]')).toBeVisible();

      // Cleanup
      await cleanupTestUser('newparent@example.com');
    });

    test('should guide new user through first carpool creation', async ({ page }) => {
      const newUser = await createTestUser('parent');
      await loginAsUser(page, newUser.email, newUser.password);

      // Navigate to dashboard (should show onboarding tips)
      await page.goto('/dashboard');
      await expect(page.locator('[data-testid="getting-started-tips"]')).toBeVisible();

      // Click on "Create your first carpool"
      await page.click('[data-testid="create-first-carpool"]');
      await expect(page).toHaveURL(/\/carpool\/create/);

      // Follow guided carpool creation
      await page.fill('input[name="carpoolName"]', 'My First Carpool');
      await page.fill('textarea[name="description"]', 'Test carpool for getting started');

      // Set schedule
      await page.check('input[name="monday"]');
      await page.check('input[name="wednesday"]');
      await page.check('input[name="friday"]');
      await page.fill('input[name="pickupTime"]', '08:00');
      await page.fill('input[name="dropoffTime"]', '15:30');

      // Set capacity and preferences
      await page.fill('input[name="maxParticipants"]', '4');
      await page.check('input[name="allowJoinRequests"]');

      // Create the carpool
      await page.click('button[data-testid="create-carpool"]');

      // Verify success and next steps
      await expect(page.locator('text=Carpool created successfully!')).toBeVisible();
      await expect(page.locator('[data-testid="next-steps-guide"]')).toBeVisible();

      await cleanupTestUser(newUser.email);
    });

    test('should complete admin onboarding and school setup', async ({ page }) => {
      await loginAsUser(page, adminUser.email, adminUser.password);
      await page.goto('/admin/setup');

      // Step 1: School information setup
      await page.fill('input[name="schoolName"]', 'Lincoln Elementary School');
      await page.fill('input[name="schoolAddress"]', '456 School Street');
      await page.fill('input[name="schoolCity"]', 'San Francisco');
      await page.selectOption('select[name="schoolState"]', 'CA');
      await page.fill('input[name="schoolZip"]', '94102');
      await page.fill('input[name="schoolPhone"]', '(555) 555-0123');

      // Step 2: Set school schedule
      await page.fill('input[name="schoolStartTime"]', '08:30');
      await page.fill('input[name="schoolEndTime"]', '15:00');

      // Step 3: Configure grades
      await page.check('input[name="kindergarten"]');
      await page.check('input[name="grade1"]');
      await page.check('input[name="grade2"]');
      await page.check('input[name="grade3"]');
      await page.check('input[name="grade4"]');
      await page.check('input[name="grade5"]');

      // Step 4: Set policies
      await page.fill(
        'textarea[name="carpoolPolicy"]',
        'All drivers must have valid license and insurance',
      );
      await page.fill('input[name="maxDistance"]', '15');
      await page.check('input[name="requireBackground"]');

      // Step 5: Complete setup
      await page.click('button[data-testid="complete-school-setup"]');

      // Verify admin dashboard
      await expect(page).toHaveURL(/\/admin\/dashboard/);
      await expect(page.locator('text=School setup completed')).toBeVisible();
      await expect(page.locator('[data-testid="admin-welcome"]')).toBeVisible();
    });
  });

  test.describe('Full Carpool Lifecycle Scenarios', () => {
    test('should complete entire carpool lifecycle from creation to completion', async ({
      page,
      request,
    }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);

      // Phase 1: Create carpool group
      await page.goto('/carpool/create');
      await page.fill('input[name="carpoolName"]', 'Morning Commute Group');
      await page.fill(
        'textarea[name="description"]',
        'Regular morning carpool to Lincoln Elementary',
      );
      await page.check('input[name="monday"]');
      await page.check('input[name="tuesday"]');
      await page.check('input[name="wednesday"]');
      await page.check('input[name="thursday"]');
      await page.check('input[name="friday"]');
      await page.fill('input[name="pickupTime"]', '07:45');
      await page.fill('input[name="dropoffTime"]', '15:15');
      await page.fill('input[name="maxParticipants"]', '6');
      await page.click('button[data-testid="create-carpool"]');

      const carpoolId = await page.locator('[data-testid="carpool-id"]').textContent();

      // Phase 2: Invite other parents
      await page.click('[data-testid="invite-parents"]');
      await page.fill('input[name="inviteEmail"]', 'parent2@example.com');
      await page.click('button[data-testid="send-invite"]');
      await expect(page.locator('text=Invitation sent')).toBeVisible();

      // Phase 3: Simulate parent joining (would be separate user in real scenario)
      // For test purposes, we'll create another user and have them join
      const parent2 = await createTestUser('parent');

      // Simulate parent2 accepting invitation
      await makeApiRequest(
        request,
        'POST',
        '/api/carpool/join',
        {
          carpoolId: carpoolId,
          userEmail: parent2.email,
        },
        {
          Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('authToken'))}`,
        },
      );

      // Phase 4: Schedule weekly drivers
      await page.goto(`/carpool/${carpoolId}/schedule`);
      await page.selectOption('select[name="mondayDriver"]', parentUser.email);
      await page.selectOption('select[name="tuesdayDriver"]', parent2.email);
      await page.selectOption('select[name="wednesdayDriver"]', parentUser.email);
      await page.selectOption('select[name="thursdayDriver"]', parent2.email);
      await page.selectOption('select[name="fridayDriver"]', parentUser.email);
      await page.click('button[data-testid="save-schedule"]');

      // Phase 5: Create specific trips
      await page.click('[data-testid="create-trip"]');
      await page.fill('input[name="date"]', '2024-01-15');
      await page.selectOption('select[name="driver"]', parentUser.email);
      await page.fill('input[name="pickupLocation"]', '123 Main Street');
      await page.fill('input[name="dropoffLocation"]', 'Lincoln Elementary School');
      await page.click('button[data-testid="create-trip"]');

      // Phase 6: Handle trip modifications
      await page.click('[data-testid="trip-options"]');
      await page.click('[data-testid="request-swap"]');
      await page.fill('textarea[name="swapReason"]', 'Doctor appointment conflict');
      await page.click('button[data-testid="submit-swap-request"]');

      // Phase 7: Complete trip and provide feedback
      await page.goto(`/trips/${carpoolId}/complete`);
      await page.click('input[name="allStudentsPickedUp"]');
      await page.click('input[name="allStudentsDroppedOff"]');
      await page.fill('textarea[name="tripNotes"]', 'Trip completed successfully');
      await page.click('button[data-testid="complete-trip"]');

      // Phase 8: View trip statistics and history
      await page.goto(`/carpool/${carpoolId}/stats`);
      await expect(page.locator('[data-testid="total-trips"]')).toContainText('1');
      await expect(page.locator('[data-testid="completion-rate"]')).toContainText('100%');

      // Cleanup
      await cleanupTestUser(parent2.email);
    });

    test('should handle complex scheduling and driver rotation', async ({ page }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);

      // Create carpool with complex scheduling needs
      await page.goto('/carpool/create');
      await page.fill('input[name="carpoolName"]', 'Complex Schedule Group');

      // Set up rotating schedule
      await page.click('[data-testid="advanced-scheduling"]');
      await page.selectOption('select[name="scheduleType"]', 'rotating');
      await page.fill('input[name="rotationWeeks"]', '4');

      // Week 1 schedule
      await page.click('[data-testid="week-1-tab"]');
      await page.selectOption('select[name="week1MondayDriver"]', parentUser.email);
      await page.selectOption('select[name="week1TuesdayDriver"]', 'parent2@example.com');

      // Week 2 schedule
      await page.click('[data-testid="week-2-tab"]');
      await page.selectOption('select[name="week2MondayDriver"]', 'parent2@example.com');
      await page.selectOption('select[name="week2TuesdayDriver"]', parentUser.email);

      // Create the complex carpool
      await page.click('button[data-testid="create-carpool"]');

      // Verify schedule was created correctly
      await expect(page.locator('[data-testid="schedule-created"]')).toBeVisible();
      await expect(page.locator('text=4-week rotation schedule')).toBeVisible();

      // Test schedule preview for next month
      await page.click('[data-testid="preview-schedule"]');
      await expect(page.locator('[data-testid="schedule-preview"]')).toBeVisible();

      // Verify rotation is working
      const week1Driver = await page.locator('[data-testid="week-1-monday-driver"]').textContent();
      const week2Driver = await page.locator('[data-testid="week-2-monday-driver"]').textContent();
      expect(week1Driver).not.toBe(week2Driver);
    });

    test('should handle emergency situations and backup plans', async ({ page, request }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);

      // Set up carpool with emergency protocols
      await page.goto('/carpool/settings');
      await page.check('input[name="enableEmergencyProtocol"]');
      await page.fill('input[name="emergencyContactPhone"]', '(555) 911-0000');
      await page.fill(
        'textarea[name="emergencyInstructions"]',
        'Call school office and all parents immediately',
      );
      await page.click('button[data-testid="save-emergency-settings"]');

      // Simulate emergency situation
      await page.goto('/carpool/emergency');
      await page.selectOption('select[name="emergencyType"]', 'driver-unable');
      await page.fill(
        'textarea[name="emergencyDetails"]',
        'Car broke down, need immediate backup driver',
      );
      await page.click('button[data-testid="trigger-emergency-protocol"]');

      // Verify emergency notifications sent
      await expect(page.locator('text=Emergency notifications sent')).toBeVisible();
      await expect(page.locator('[data-testid="backup-drivers-contacted"]')).toBeVisible();

      // Test backup driver response
      await page.click('[data-testid="backup-driver-response"]');
      await page.click('input[name="canCover"]');
      await page.fill('input[name="eta"]', '10');
      await page.click('button[data-testid="confirm-backup"]');

      // Verify emergency resolved
      await expect(page.locator('text=Backup driver confirmed')).toBeVisible();
      await expect(page.locator('[data-testid="emergency-resolved"]')).toBeVisible();
    });
  });

  test.describe('Monthly/Weekly Workflow Completion', () => {
    test('should complete monthly carpool management workflow', async ({ page }) => {
      await loginAsUser(page, adminUser.email, adminUser.password);

      // Monthly setup - beginning of month
      await page.goto('/admin/monthly-setup');

      // Review previous month's performance
      await page.click('[data-testid="previous-month-review"]');
      await expect(page.locator('[data-testid="completion-metrics"]')).toBeVisible();
      await expect(page.locator('[data-testid="parent-feedback"]')).toBeVisible();

      // Set up new month schedule
      await page.click('[data-testid="create-monthly-schedule"]');
      await page.selectOption('select[name="month"]', '2024-02');

      // Import recurring carpools
      await page.check('input[name="importRecurring"]');
      await page.click('button[data-testid="import-schedules"]');

      // Handle special events and holidays
      await page.click('[data-testid="add-special-event"]');
      await page.fill('input[name="eventName"]', 'Presidents Day Holiday');
      await page.fill('input[name="eventDate"]', '2024-02-19');
      await page.selectOption('select[name="eventType"]', 'school-closed');
      await page.click('button[data-testid="add-event"]');

      // Review and approve monthly schedule
      await page.click('[data-testid="review-monthly-schedule"]');
      await expect(page.locator('[data-testid="monthly-calendar"]')).toBeVisible();
      await page.click('button[data-testid="approve-schedule"]');

      // Send monthly notifications to parents
      await page.click('[data-testid="send-monthly-notifications"]');
      await expect(page.locator('text=Monthly schedule sent to all parents')).toBeVisible();
    });

    test('should complete weekly carpool coordination workflow', async ({ page }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);

      // Sunday: Week planning
      await page.goto('/weekly-planning');

      // Review upcoming week schedule
      await expect(page.locator('[data-testid="week-overview"]')).toBeVisible();

      // Confirm driver assignments
      const driverAssignments = page.locator('[data-testid="driver-assignment"]');
      const assignmentCount = await driverAssignments.count();

      for (let i = 0; i < assignmentCount; i++) {
        await driverAssignments.nth(i).click();
        await page.click('input[name="confirmAssignment"]');
      }

      // Submit preferences for any open slots
      await page.click('[data-testid="submit-preferences"]');

      // Monday: Week execution
      await page.goto('/dashboard');
      await expect(page.locator('[data-testid="todays-trips"]')).toBeVisible();

      // Check weather and traffic conditions
      await page.click('[data-testid="check-conditions"]');
      await expect(page.locator('[data-testid="weather-widget"]')).toBeVisible();
      await expect(page.locator('[data-testid="traffic-widget"]')).toBeVisible();

      // Friday: Week wrap-up
      await page.goto('/weekly-summary');

      // Review week completion
      await expect(page.locator('[data-testid="week-stats"]')).toBeVisible();

      // Provide feedback on drivers
      await page.click('[data-testid="rate-drivers"]');
      await page.click('[data-testid="driver-rating-5"]');
      await page.fill('textarea[name="driverFeedback"]', 'Excellent driving, always on time');
      await page.click('button[data-testid="submit-feedback"]');

      // Plan for next week
      await page.click('[data-testid="plan-next-week"]');
      await expect(page).toHaveURL(/\/weekly-planning/);
    });
  });

  test.describe('System Integration Scenarios', () => {
    test('should integrate with school management system', async ({ page, request }) => {
      await loginAsUser(page, adminUser.email, adminUser.password);

      // Sync with school calendar
      await page.goto('/admin/integrations');
      await page.click('[data-testid="sync-school-calendar"]');

      // Verify school events imported
      await expect(page.locator('text=School calendar synced successfully')).toBeVisible();

      // Test student roster import
      await page.click('[data-testid="import-student-roster"]');
      await page.setInputFiles('input[type="file"]', {
        name: 'student-roster.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(
          'StudentID,FirstName,LastName,Grade,ParentEmail\n1,John,Doe,3,parent@example.com',
        ),
      });
      await page.click('button[data-testid="process-import"]');

      // Verify import results
      await expect(page.locator('text=1 students imported successfully')).toBeVisible();
    });

    test('should integrate with notification systems', async ({ page }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);

      // Test email notification integration
      await page.goto('/settings/notifications');
      await page.check('input[name="emailNotifications"]');
      await page.check('input[name="smsNotifications"]');
      await page.check('input[name="pushNotifications"]');
      await page.click('button[data-testid="save-notification-settings"]');

      // Test notification delivery
      await page.goto('/test-notifications');
      await page.click('[data-testid="send-test-notification"]');

      // Verify notification was queued
      await expect(page.locator('text=Test notification sent')).toBeVisible();

      // Check notification history
      await page.goto('/notifications/history');
      await expect(page.locator('[data-testid="notification-log"]')).toBeVisible();
    });

    test('should integrate with mapping and routing services', async ({ page }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);

      // Create trip with route optimization
      await page.goto('/trips/create');
      await page.fill('input[name="tripName"]', 'Optimized Route Test');

      // Add multiple pickup locations
      await page.click('[data-testid="add-pickup-location"]');
      await page.fill('input[name="pickup1"]', '123 First Street, San Francisco, CA');
      await page.click('[data-testid="add-pickup-location"]');
      await page.fill('input[name="pickup2"]', '456 Second Avenue, San Francisco, CA');
      await page.click('[data-testid="add-pickup-location"]');
      await page.fill('input[name="pickup3"]', '789 Third Boulevard, San Francisco, CA');

      await page.fill('input[name="destination"]', 'Lincoln Elementary School, San Francisco, CA');

      // Request route optimization
      await page.click('[data-testid="optimize-route"]');

      // Verify route was calculated
      await expect(page.locator('[data-testid="optimized-route"]')).toBeVisible();
      await expect(page.locator('[data-testid="route-duration"]')).toBeVisible();
      await expect(page.locator('[data-testid="route-distance"]')).toBeVisible();

      // Save optimized trip
      await page.click('button[data-testid="save-trip"]');
      await expect(page.locator('text=Trip saved with optimized route')).toBeVisible();
    });

    test('should handle real-time updates and synchronization', async ({ page, browser }) => {
      // Create two browser contexts to simulate real-time sync
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      // Login both users
      await loginAsUser(page1, parentUser.email, parentUser.password);
      await loginAsUser(page2, adminUser.email, adminUser.password);

      // Both navigate to the same carpool
      await page1.goto('/carpool/123/live');
      await page2.goto('/admin/carpool/123/monitor');

      // Parent makes a real-time update
      await page1.fill('input[name="currentLocation"]', 'Approaching pickup location');
      await page1.click('[data-testid="update-location"]');

      // Verify admin sees the update in real-time
      await expect(page2.locator('text=Approaching pickup location')).toBeVisible();

      // Admin sends broadcast message
      await page2.fill(
        'textarea[name="broadcastMessage"]',
        'Traffic delay, pickup delayed by 5 minutes',
      );
      await page2.click('[data-testid="send-broadcast"]');

      // Verify parent receives the message
      await expect(page1.locator('text=Traffic delay, pickup delayed by 5 minutes')).toBeVisible();

      await context1.close();
      await context2.close();
    });
  });
});
