/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

const config = {
  // Test environment
  testEnvironment: 'jsdom',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Transform files
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
        },
      },
    ],
    '^.+\\.(js|jsx)$': ['babel-jest'],
  },

  // Module name mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@carpool/shared$': '<rootDir>/../shared/src',
    '^@carpool/shared/(.*)$': '<rootDir>/../shared/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },

  // Test match patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js|jsx)',
    '<rootDir>/src/**/*.(test|spec).(ts|tsx|js|jsx)',
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/e2e/',
    '<rootDir>/src/__tests__/accessibility/AccessibilityIntegration.test.tsx',
    '<rootDir>/src/__tests__/usePerformanceMonitoring.test.ts',
    '<rootDir>/src/__tests__/pwa/PWAIntegration.test.tsx',
    '<rootDir>/src/__tests__/stores/auth.store.test.ts',
    '<rootDir>/src/__tests__/pages/HomePage.test.tsx',
    '<rootDir>/src/__tests__/pages/TripsPage.test.tsx',
    '<rootDir>/src/__tests__/components/LoadingSpinner.realistic.test.tsx',
    '<rootDir>/src/__tests__/components/DashboardComponents.test.tsx',
    '<rootDir>/src/__tests__/components/calendar/CalendarLoading.realistic.test.tsx',
    '<rootDir>/src/__tests__/stores/trip.store.test.ts',
    '<rootDir>/src/__tests__/pages/TripsPage.realistic.test.tsx',
    '<rootDir>/src/__tests__/components/ErrorBoundary.test.tsx',
    '<rootDir>/src/__tests__/components/ui/Card.realistic.test.tsx',
    '<rootDir>/src/__tests__/components/Navigation.realistic.test.tsx',
  ],

  // Transform ignore patterns
  transformIgnorePatterns: ['/node_modules/(?!(@carpool/shared)/)'],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.stories.{ts,tsx}',
  ],

  // Clear mocks
  clearMocks: true,

  // Automatically reset mock state before every test
  resetMocks: true,

  // Automatically restore mock state and implementation before every test
  restoreMocks: true,
};

module.exports = config;
