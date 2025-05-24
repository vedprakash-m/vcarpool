import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* The directory where we'll store failed test artifacts */
  outputDir: './e2e/test-results',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry failing tests on CI */
  retries: process.env.CI ? 2 : 0,
  
  /* Reporter to use */
  reporter: [['html', { open: 'never' }]],
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in navigations */
    baseURL: process.env.E2E_TEST_URL || 'http://localhost:3000',
    
    /* Collect trace on failure, or when explicitly requested */
    trace: 'on-first-retry',
    
    /* Capture screenshot after each test */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'on-first-retry',
  },
  
  /* Configure projects for different browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    /* Test against mobile viewports */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  
  /* Run local development server before the tests */
  webServer: {
    command: process.env.CI ? '' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes
  },
});
