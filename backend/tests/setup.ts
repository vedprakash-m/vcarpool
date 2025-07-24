/**
 * Enhanced Test Setup Configuration
 * Comprehensive test environment setup for reliable test execution
 */

// Set test environment variables
(process.env as any).NODE_ENV = 'test';
(process.env as any).JWT_SECRET = 'test-jwt-secret';
(process.env as any).JWT_REFRESH_SECRET = 'test-refresh-secret';
(process.env as any).COSMOS_DB_DATABASE_ID = 'carpool-test';

// Timeout configuration for tests
jest.setTimeout(30000); // Increase timeout for CI environments

// Comprehensive test utilities
(global as any).testUtils = {
  createMockUser: (overrides = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),
  
  createMockTrip: (overrides = {}) => ({
    id: 'test-trip-id',
    driverId: 'test-user-id',
    destination: 'Test School',
    departureTime: new Date().toISOString(),
    availableSeats: 4,
    passengers: [],
    status: 'scheduled',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),
  
  // Helper for async test error handling
  catchError: async (promise) => {
    try {
      await promise;
      return null;
    } catch (error) {
      return error;
    }
  }
};

// Mock console methods for cleaner test output
global.console = {
  ...console,
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn()
};
