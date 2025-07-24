"use strict";
/**
 * Test Utilities
 * Shared helper functions for tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.wait = void 0;
exports.createMockCosmosClient = createMockCosmosClient;
exports.createMockUser = createMockUser;
exports.createMockTrip = createMockTrip;
exports.catchError = catchError;
exports.retry = retry;
exports.createMockHttpRequest = createMockHttpRequest;
/**
 * Create a mock Cosmos DB client for testing
 */
function createMockCosmosClient() {
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
    };
}
/**
 * Mock a user with customizable properties
 */
function createMockUser(overrides = {}) {
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
function createMockTrip(overrides = {}) {
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
async function catchError(promise) {
    try {
        await promise;
        return null;
    }
    catch (error) {
        return error;
    }
}
/**
 * Wait for a specified number of milliseconds
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
exports.wait = wait;
/**
 * Retry a function multiple times until it succeeds
 */
async function retry(fn, options = { times: 3, delay: 300 }) {
    try {
        return await fn();
    }
    catch (error) {
        if (options.times <= 1)
            throw error;
        await (0, exports.wait)(options.delay);
        return retry(fn, {
            times: options.times - 1,
            delay: options.delay
        });
    }
}
/**
 * Mock an HTTP request object for Azure Functions testing
 */
function createMockHttpRequest(options = {}) {
    return {
        method: options.method || 'GET',
        headers: options.headers || {},
        query: options.query || {},
        params: options.params || {},
        body: options.body,
        url: options.url || 'https://example.com/api/function'
    };
}
