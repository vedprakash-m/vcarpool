// Test configuration to improve coverage collection
module.exports = {
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Improved coverage patterns
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/app/**/page.tsx', // App router pages (will test separately)
    '!src/app/**/layout.tsx', // Layouts (will test separately)
    '!src/app/**/loading.tsx', // Loading pages
    '!src/app/**/error.tsx', // Error pages
    '!src/app/**/not-found.tsx', // Not found pages
    '!src/**/index.{ts,tsx}', // Index files
  ],

  // Test match patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{ts,tsx}',
  ],
};
