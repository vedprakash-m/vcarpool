/**
 * Test Setup Configuration
 * Global test environment setup, mocks, and utilities
 */

import { jest } from '@jest/globals';

// Mock Azure Functions context
global.mockAzureContext = () => ({
  invocationId: 'test-invocation-id',
  functionName: 'test-function',
  functionDirectory: '/test/path',
  log: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    verbose: jest.fn()
  },
  bindings: {},
  bindingData: {},
  bindingDefinitions: [],
  req: undefined,
  res: undefined,
  done: jest.fn(),
  executionContext: {
    invocationId: 'test-invocation-id',
    functionName: 'test-function',
    functionDirectory: '/test/path'
  }
});

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.COSMOS_DB_ENDPOINT = 'https://test-cosmos.documents.azure.com:443/';
process.env.COSMOS_DB_KEY = 'test-key';
process.env.COSMOS_DB_DATABASE = 'test-vcarpool-db';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.BCRYPT_SALT_ROUNDS = '10';

// Mock external dependencies
jest.mock('@azure/cosmos', () => ({
  CosmosClient: jest.fn().mockImplementation(() => ({
    database: jest.fn().mockReturnValue({
      container: jest.fn().mockReturnValue({
        items: {
          create: jest.fn(),
          query: jest.fn().mockReturnValue({
            fetchAll: jest.fn().mockResolvedValue({ resources: [] })
          })
        },
        item: jest.fn().mockReturnValue({
          read: jest.fn(),
          replace: jest.fn(),
          delete: jest.fn()
        })
      })
    })
  }))
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
  })
}));

// Global test utilities
global.testUtils = {
  createMockUser: () => ({
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'parent',
    createdAt: new Date(),
    updatedAt: new Date()
  }),
  
  createMockTrip: () => ({
    id: 'test-trip-id',
    driverId: 'test-driver-id',
    passengers: [],
    route: {
      origin: { lat: 40.7128, lng: -74.0060 },
      destination: { lat: 40.7589, lng: -73.9851 }
    },
    scheduledTime: new Date(),
    status: 'scheduled',
    createdAt: new Date(),
    updatedAt: new Date()
  }),
  
  createMockRequest: (overrides = {}) => ({
    method: 'GET',
    url: '/api/test',
    headers: {},
    body: {},
    query: {},
    params: {},
    ...overrides
  }),
  
  createMockResponse: () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    header: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis()
  }),
  
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  expectValidationError: (error: any, field: string) => {
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain(field);
  }
};

// Extend Jest matchers
expect.extend({
  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false
      };
    }
  },
  
  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false
      };
    }
  }
});

// Setup console warnings suppression for known test warnings
const originalWarn = console.warn;
console.warn = (...args) => {
  const message = args[0];
  
  // Suppress known warnings
  if (typeof message === 'string' && (
    message.includes('deprecated') ||
    message.includes('experimental')
  )) {
    return;
  }
  
  originalWarn.apply(console, args);
};
