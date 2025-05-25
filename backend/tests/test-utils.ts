/**
 * Test Utilities
 * Shared helper functions for tests
 */

import type { CosmosClient } from '@azure/cosmos';

/**
 * Create a mock Cosmos DB client for testing
 */
export function createMockCosmosClient() {
  return {
    database: jest.fn().mockReturnValue({
      container: jest.fn().mockReturnValue({
        items: {
          create: jest.fn().mockResolvedValue({ resource: {} }),
          query: jest.fn().mockReturnValue({
            fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
            fetchNext: jest.fn().mockResolvedValue({ resources: [] })
          }),
          upsert: jest.fn().mockResolvedValue({ resource: {} }),
          delete: jest.fn().mockResolvedValue({}),
          read: jest.fn().mockResolvedValue({ resource: {} }),
        }
      })
    })
  } as unknown as CosmosClient;
}

/**
 * Mock a user with customizable properties
 */
export function createMockUser(overrides = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

/**
 * Mock a trip with customizable properties
 */
export function createMockTrip(overrides = {}) {
  return {
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
  };
}

/**
 * Helper for capturing errors in async tests
 */
export async function catchError<T>(promise: Promise<T>): Promise<Error | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    return error as Error;
  }
}

/**
 * Wait for a specified number of milliseconds
 */
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry a function multiple times until it succeeds
 */
export async function retry<T>(
  fn: () => Promise<T>, 
  options = { times: 3, delay: 300 }
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (options.times <= 1) throw error;
    await wait(options.delay);
    return retry(fn, { 
      times: options.times - 1,
      delay: options.delay
    });
  }
}

/**
 * Mock an HTTP request object for Azure Functions testing
 */
export function createMockHttpRequest(options: {
  method?: string;
  headers?: Record<string, string>;
  query?: Record<string, string | string[]>;
  params?: Record<string, string>;
  body?: any;
  url?: string;
} = {}) {
  return {
    method: options.method || 'GET',
    headers: options.headers || {},
    query: options.query || {},
    params: options.params || {},
    body: options.body,
    url: options.url || 'https://example.com/api/function'
  };
}
