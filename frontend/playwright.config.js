"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
/**
 * See https://playwright.dev/docs/test-configuration.
 */
// Import test setup
require("./e2e/test-setup");
exports.default = (0, test_1.defineConfig)({
    testDir: "./e2e",
    /* The directory where we'll store failed test artifacts */
    outputDir: "./e2e/test-results",
    /* Timeout for each test */
    timeout: process.env.CI ? 120000 : 60000, // 120 seconds for CI environments, 60 for local
    /* Timeout for expect assertions */
    expect: {
        timeout: process.env.CI ? 20000 : 10000, // 20 seconds for assertions in CI, 10 locally
    },
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry failing tests on CI */
    retries: process.env.CI ? 2 : 0,
    /* Reporter to use */
    reporter: [["html", { open: "never" }]],
    /* Shared settings for all the projects below */
    use: {
        /* Base URL to use in navigations - Updated to use port 3001 */
        baseURL: process.env.CI
            ? "http://localhost:3000"
            : process.env.E2E_TEST_URL || "http://localhost:3001",
        /* Collect trace on failure, or when explicitly requested */
        trace: process.env.CI ? "on" : "on-first-retry",
        /* Capture screenshot after each test */
        screenshot: "only-on-failure",
        /* Record video on failure */
        video: process.env.CI ? "on" : "on-first-retry",
        /* Use more reliable navigation and action timeouts for CI */
        actionTimeout: process.env.CI ? 20000 : 5000,
        navigationTimeout: process.env.CI ? 45000 : 10000,
    },
    /* Configure projects for different browsers - Simplified for debugging */
    projects: process.env.CI
        ? [
            // In CI, only run on Chromium for speed and stability
            {
                name: "chromium",
                use: { ...test_1.devices["Desktop Chrome"] },
            },
        ]
        : [
            // In local development, focus on Chromium for debugging
            {
                name: "chromium",
                use: { ...test_1.devices["Desktop Chrome"] },
            },
            // Temporarily disable other browsers for debugging
            // {
            //   name: 'firefox',
            //   use: { ...devices['Desktop Firefox'] },
            // },
            // {
            //   name: 'webkit',
            //   use: { ...devices['Desktop Safari'] },
            // },
            /* Test against mobile viewports */
            // {
            //   name: 'mobile-chrome',
            //   use: { ...devices['Pixel 5'] },
            // },
            // {
            //   name: 'mobile-safari',
            //   use: { ...devices['iPhone 12'] },
            // },
        ],
    /* Run local development server before the tests */
    webServer: process.env.CI
        ? {
            command: "npm run build && npm run start",
            url: "http://localhost:3000",
            reuseExistingServer: false,
            timeout: 240000, // 4 minutes for CI environment (increased from 3)
            cwd: ".",
            stdout: "pipe",
            stderr: "pipe",
        }
        : {
            command: "PORT=3001 npm run dev",
            url: "http://localhost:3001",
            reuseExistingServer: true,
            timeout: 120000, // 2 minutes
            cwd: ".",
        },
});
