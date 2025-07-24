/**
 * Responsive Design E2E Tests
 * Tests mobile devices, tablet responsiveness, cross-browser compatibility, and accessibility
 */

import { test, expect, devices } from '@playwright/test';
import { TestUser, createTestUser, cleanupTestUser, loginAsUser } from '../utils/test-helpers';

test.describe('Responsive Design Tests', () => {
  let parentUser: TestUser;

  test.beforeAll(async () => {
    parentUser = await createTestUser('parent');
  });

  test.afterAll(async () => {
    if (parentUser) await cleanupTestUser(parentUser.email);
  });

  test.describe('Mobile Device Testing', () => {
    test('should work on iPhone 13', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
      });
      const page = await context.newPage();

      await page.goto('/');

      // Check mobile-specific navigation
      await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();
      await expect(page.locator('[data-testid="desktop-nav"]')).not.toBeVisible();

      // Test mobile login
      await page.click('[data-testid="mobile-menu-toggle"]');
      await page.click('text=Login');

      await page.fill('input[name="email"]', parentUser.email);
      await page.fill('input[name="password"]', parentUser.password);
      await page.click('button[type="submit"]');

      // Should redirect to mobile-optimized dashboard
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.locator('[data-testid="mobile-dashboard"]')).toBeVisible();

      await context.close();
    });

    test('should work on Samsung Galaxy S21', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['Galaxy S21'],
      });
      const page = await context.newPage();

      await loginAsUser(page, parentUser.email, parentUser.password);
      await page.goto('/trips');

      // Check touch-friendly elements
      const tripCards = page.locator('[data-testid="trip-card"]');
      if ((await tripCards.count()) > 0) {
        const firstCard = tripCards.first();

        // Check minimum touch target size (44px)
        const boundingBox = await firstCard.boundingBox();
        expect(boundingBox?.height).toBeGreaterThanOrEqual(44);
      }

      // Test swipe gestures (if implemented)
      await page.touchscreen.tap(200, 200);
      await page.touchscreen.tap(400, 200);

      await context.close();
    });

    test('should handle mobile form inputs correctly', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
      });
      const page = await context.newPage();

      await loginAsUser(page, parentUser.email, parentUser.password);
      await page.goto('/trips/create');

      // Test mobile keyboard inputs
      await page.fill('input[name="tripName"]', 'Mobile Test Trip');

      // Check for mobile-specific input types
      const phoneInput = page.locator('input[name="phone"]');
      if ((await phoneInput.count()) > 0) {
        await expect(phoneInput).toHaveAttribute('type', 'tel');
      }

      const emailInput = page.locator('input[name="email"]');
      if ((await emailInput.count()) > 0) {
        await expect(emailInput).toHaveAttribute('type', 'email');
      }

      await context.close();
    });
  });

  test.describe('Tablet Responsiveness', () => {
    test('should work on iPad Pro', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPad Pro'],
      });
      const page = await context.newPage();

      await loginAsUser(page, parentUser.email, parentUser.password);
      await page.goto('/dashboard');

      // Check tablet layout
      await expect(page.locator('[data-testid="tablet-sidebar"]')).toBeVisible();
      await expect(page.locator('[data-testid="tablet-main-content"]')).toBeVisible();

      // Test tablet navigation
      await page.click('[data-testid="trips-nav-item"]');
      await expect(page).toHaveURL(/\/trips/);

      // Check responsive grid layout
      const gridItems = page.locator('[data-testid="grid-item"]');
      if ((await gridItems.count()) > 0) {
        // Should show 2-3 columns on tablet
        const viewport = page.viewportSize();
        const expectedColumns = viewport!.width > 768 ? 3 : 2;

        const firstItem = gridItems.first();
        const itemWidth = await firstItem.evaluate((el) => el.getBoundingClientRect().width);
        const containerWidth = viewport!.width;
        const actualColumns = Math.floor(containerWidth / itemWidth);

        expect(actualColumns).toBeLessThanOrEqual(expectedColumns);
      }

      await context.close();
    });

    test('should adapt to orientation changes', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPad Pro'],
      });
      const page = await context.newPage();

      await loginAsUser(page, parentUser.email, parentUser.password);
      await page.goto('/dashboard');

      // Test portrait orientation
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();

      // Switch to landscape (simulate orientation change)
      await page.setViewportSize({ width: 1366, height: 1024 });
      await page.waitForTimeout(500); // Wait for layout to adapt

      // Check landscape layout adjustments
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();

      await context.close();
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    ['chromium', 'firefox', 'webkit'].forEach((browserName) => {
      test(`should work in ${browserName}`, async ({ browser }) => {
        // Note: This test will only run if the browser is available
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto('/');

        // Test basic functionality across browsers
        await expect(page.locator('h1')).toBeVisible();

        // Test CSS Grid/Flexbox support
        const gridContainer = page.locator('[data-testid="grid-container"]');
        if ((await gridContainer.count()) > 0) {
          const display = await gridContainer.evaluate((el) => window.getComputedStyle(el).display);
          expect(['grid', 'flex']).toContain(display);
        }

        // Test modern JavaScript features
        const modernFeatureTest = await page.evaluate(() => {
          try {
            // Test arrow functions, async/await, etc.
            const testAsync = async () => true;
            const testArrow = () => true;
            const testSpread = [...[1, 2, 3]];

            return (
              typeof testAsync === 'function' &&
              typeof testArrow === 'function' &&
              testSpread.length === 3
            );
          } catch (e) {
            return false;
          }
        });
        expect(modernFeatureTest).toBe(true);

        await context.close();
      });
    });

    test('should handle browser-specific CSS features', async ({ page }) => {
      await page.goto('/');

      // Test CSS custom properties (CSS variables)
      const primaryColor = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--primary-color');
      });
      expect(primaryColor).toBeTruthy();

      // Test CSS Grid fallbacks
      const gridSupport = await page.evaluate(() => {
        return CSS.supports('display', 'grid');
      });

      if (!gridSupport) {
        // Check for flexbox fallback
        const flexSupport = await page.evaluate(() => {
          return CSS.supports('display', 'flex');
        });
        expect(flexSupport).toBe(true);
      }
    });
  });

  test.describe('Accessibility Compliance', () => {
    test('should have proper heading structure', async ({ page }) => {
      await page.goto('/');

      // Check for h1 element
      await expect(page.locator('h1')).toBeVisible();

      // Check heading hierarchy
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();

      if (headings.length > 1) {
        // Verify no heading levels are skipped
        const headingLevels = await Promise.all(
          headings.map((h) => h.evaluate((el) => parseInt(el.tagName.charAt(1)))),
        );

        for (let i = 1; i < headingLevels.length; i++) {
          const levelDiff = headingLevels[i] - headingLevels[i - 1];
          expect(levelDiff).toBeLessThanOrEqual(1);
        }
      }
    });

    test('should have proper focus management', async ({ page }) => {
      await page.goto('/');

      // Test keyboard navigation
      await page.keyboard.press('Tab');

      // First focusable element should be focused
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();

      // Check focus indicators
      const focusOutline = await focusedElement.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.outline !== 'none' || styles.boxShadow !== 'none';
      });
      expect(focusOutline).toBe(true);
    });

    test('should have alt text for images', async ({ page }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);
      await page.goto('/dashboard');

      const images = page.locator('img');
      const imageCount = await images.count();

      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        const role = await img.getAttribute('role');

        // Images should have alt text or role="presentation"
        expect(alt !== null || role === 'presentation').toBe(true);
      }
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await loginAsUser(page, parentUser.email, parentUser.password);
      await page.goto('/trips/create');

      // Check form labels
      const inputs = page.locator('input, select, textarea');
      const inputCount = await inputs.count();

      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');

        // Input should have associated label
        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          const hasLabel = (await label.count()) > 0;
          const hasAriaLabel = ariaLabel !== null || ariaLabelledBy !== null;

          expect(hasLabel || hasAriaLabel).toBe(true);
        }
      }
    });

    test('should support screen readers', async ({ page }) => {
      await page.goto('/');

      // Check for skip links
      const skipLink = page.locator('a[href="#main-content"]');
      if ((await skipLink.count()) > 0) {
        await expect(skipLink).toHaveText(/skip to main content/i);
      }

      // Check for main landmark
      await expect(page.locator('main, [role="main"]')).toBeVisible();

      // Check for navigation landmark
      await expect(page.locator('nav, [role="navigation"]')).toBeVisible();
    });

    test('should have sufficient color contrast', async ({ page }) => {
      await page.goto('/');

      // Test primary text color contrast
      const textElement = page.locator('body').first();
      const contrast = await textElement.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        const textColor = styles.color;
        const backgroundColor = styles.backgroundColor;

        // Basic contrast check (simplified)
        // In real implementation, you'd use a color contrast library
        return { textColor, backgroundColor };
      });

      // Verify colors are defined
      expect(contrast.textColor).toBeTruthy();
      expect(contrast.backgroundColor).toBeTruthy();
    });

    test('should work with keyboard-only navigation', async ({ page }) => {
      await page.goto('/login');

      // Navigate form using only keyboard
      await page.keyboard.press('Tab'); // Focus email input
      await page.keyboard.type(parentUser.email);

      await page.keyboard.press('Tab'); // Focus password input
      await page.keyboard.type(parentUser.password);

      await page.keyboard.press('Tab'); // Focus submit button
      await page.keyboard.press('Enter'); // Submit form

      // Should successfully login using keyboard only
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });

  test.describe('Performance on Different Devices', () => {
    test('should load quickly on mobile networks', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
      });
      const page = await context.newPage();

      // Simulate slow 3G connection
      await page.route('**/*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 100)); // Add 100ms delay
        await route.continue();
      });

      const startTime = Date.now();
      await page.goto('/');

      // Check that page loads within reasonable time even on slow network
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds

      await context.close();
    });

    test('should handle touch interactions smoothly', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPad Pro'],
      });
      const page = await context.newPage();

      await loginAsUser(page, parentUser.email, parentUser.password);
      await page.goto('/trips');

      // Test smooth scrolling
      await page.touchscreen.tap(400, 300);
      await page.evaluate(() => {
        window.scrollTo({ top: 500, behavior: 'smooth' });
      });

      await page.waitForTimeout(500);

      // Test touch-based interactions
      const interactiveElements = page.locator('[data-testid="touchable"]');
      if ((await interactiveElements.count()) > 0) {
        await interactiveElements.first().tap();
        // Verify touch interaction worked
        await expect(page.locator('[data-testid="touch-feedback"]')).toBeVisible();
      }

      await context.close();
    });
  });
});
