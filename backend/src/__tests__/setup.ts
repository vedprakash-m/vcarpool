import { jest, beforeAll, afterAll } from '@jest/globals';

// Mock external services for testing
jest.mock('axios');
jest.mock('@azure/cosmos');

// Global test configuration
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.COSMOS_DB_ENDPOINT = 'https://test-cosmos.documents.azure.com:443/';
});

afterAll(() => {
  // Cleanup after all tests
  jest.restoreAllMocks();
});
