import { defineConfig, devices } from '@playwright/test';

/**
 * Comprehensive Playwright Configuration for Carpool E2E Testing
 * This configuration sets up multi-browser testing with proper error handling,
 * retries, and detailed reporting for the Carpool application.
 */

export default defineConfig({
  // Test directory
  testDir: './specs',

  // Global test timeout
  timeout: 60000,

  // Expect timeout for assertions
  expect: {
    timeout: 10000,
  },

  // Test execution settings
  fullyParallel: false, // Sequential execution for E2E stability
  forbidOnly: !!process.env.CI, // Fail if test.only() in CI
  retries: process.env.CI ? 2 : 1, // Retry failed tests
  workers: process.env.CI ? 1 : 1, // Single worker for E2E tests

  // Reporter configuration
  reporter: [
    [
      'html',
      {
        outputFolder: 'playwright-report',
        open: process.env.CI ? 'never' : 'on-failure',
      },
    ],
    [
      'json',
      {
        outputFile: 'test-results/results.json',
      },
    ],
    ['line'],
  ],

  // Global setup and teardown
  globalSetup: require.resolve('./utils/global-setup.ts'),
  globalTeardown: require.resolve('./utils/global-teardown.ts'),

  // Output directories
  outputDir: 'test-results/',

  // Test configuration
  use: {
    // Base URL for the application
    baseURL: process.env.FRONTEND_URL || 'http://localhost:3001',

    // Browser settings
    headless: process.env.HEADLESS !== 'false',
    viewport: { width: 1280, height: 720 },

    // Network settings
    ignoreHTTPSErrors: true,

    // Action settings
    actionTimeout: 15000,
    navigationTimeout: 30000,

    // Tracing and screenshots
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Context settings
    contextOptions: {
      // Reduce motion for stable testing
      reducedMotion: 'reduce',
      // Set user agent
      userAgent: 'Carpool-E2E-Tests/1.0',
    },
  },

  // Test projects for different browsers
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup',
    },
    {
      name: 'cleanup',
      testMatch: /.*\.cleanup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Chromium-specific settings
        channel: 'chrome',
        launchOptions: {
          args: [
            '--disable-dev-shm-usage',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
          ],
        },
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
      dependencies: ['setup'],
    },
    // Mobile testing
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 12'],
      },
      dependencies: ['setup'],
    },
  ],

  // Development server (when running locally)
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run start:services',
        port: 3001,
        timeout: 120000,
        reuseExistingServer: !process.env.CI,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});
