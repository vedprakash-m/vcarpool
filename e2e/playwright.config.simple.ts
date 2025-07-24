import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  timeout: 30000,
  use: {
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'structure-validation',
      testMatch: 'structure-validation.spec.ts',
    },
  ],
});
