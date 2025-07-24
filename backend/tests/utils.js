"use strict";
/**
 * Test Utilities
 * Common testing utilities, mocks, and helpers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.expectAsync = exports.delay = exports.TestAssertions = exports.MockServices = exports.TestDataFactory = void 0;
const uuid_1 = require("uuid");
class TestDataFactory {
    /**
     * Create a test user with optional overrides
     */
    static createUser(overrides = {}) {
        return {
            id: (0, uuid_1.v4)(),
            email: 'test@example.com',
            name: 'Test User',
            role: 'parent',
            phoneNumber: '+1234567890',
            emergencyContact: {
                name: 'Emergency Contact',
                phoneNumber: '+0987654321',
                relationship: 'spouse'
            },
            address: {
                street: '123 Test St',
                city: 'Test City',
                state: 'TS',
                zipCode: '12345',
                coordinates: { lat: 40.7128, lng: -74.0060 }
            },
            preferences: {
                notifications: {
                    email: true,
                    sms: true,
                    push: true
                },
                privacy: {
                    shareLocation: true,
                    shareContact: true
                }
            },
            verificationStatus: {
                email: true,
                phone: true,
                identity: true
            },
            createdAt: new Date(),
            updatedAt: new Date(),
            ...overrides
        };
    }
    /**
     * Create a test trip with optional overrides
     */
    static createTrip(overrides = {}) {
        return {
            id: (0, uuid_1.v4)(),
            driverId: (0, uuid_1.v4)(),
            schoolId: (0, uuid_1.v4)(),
            type: 'pickup',
            status: 'scheduled',
            capacity: 4,
            currentPassengers: 0,
            route: {
                origin: {
                    address: '123 Start St, Test City, TS 12345',
                    coordinates: { lat: 40.7128, lng: -74.0060 }
                },
                destination: {
                    address: '456 School Ave, Test City, TS 12345',
                    coordinates: { lat: 40.7589, lng: -73.9851 }
                },
                waypoints: [],
                estimatedDuration: 1800, // 30 minutes
                estimatedDistance: 15000 // 15 km
            },
            schedule: {
                date: new Date(),
                departureTime: new Date(),
                estimatedArrival: new Date(Date.now() + 30 * 60 * 1000)
            },
            passengers: [],
            price: {
                basePrice: 10.00,
                currency: 'USD',
                paymentMethod: 'card'
            },
            safety: {
                emergencyContacts: [],
                specialInstructions: '',
                childSafetySeats: 0
            },
            createdAt: new Date(),
            updatedAt: new Date(),
            ...overrides
        };
    }
    /**
     * Create a test trip request with optional overrides
     */
    static createTripRequest(overrides = {}) {
        return {
            id: (0, uuid_1.v4)(),
            parentId: (0, uuid_1.v4)(),
            studentId: (0, uuid_1.v4)(),
            tripId: (0, uuid_1.v4)(),
            status: 'pending',
            requestType: 'join',
            message: 'Please let my child join this trip',
            pickupLocation: {
                address: '789 Pickup St, Test City, TS 12345',
                coordinates: { lat: 40.7200, lng: -74.0100 }
            },
            specialRequirements: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            ...overrides
        };
    }
    /**
     * Create a test school with optional overrides
     */
    static createSchool(overrides = {}) {
        return {
            id: (0, uuid_1.v4)(),
            name: 'Test Elementary School',
            address: {
                street: '456 School Ave',
                city: 'Test City',
                state: 'TS',
                zipCode: '12345',
                coordinates: { lat: 40.7589, lng: -73.9851 }
            },
            contact: {
                phone: '+1234567890',
                email: 'contact@testschool.edu',
                website: 'https://testschool.edu'
            },
            schedule: {
                startTime: '08:00',
                endTime: '15:30',
                timezone: 'America/New_York'
            },
            zones: [
                {
                    id: (0, uuid_1.v4)(),
                    name: 'Main Entrance',
                    coordinates: { lat: 40.7589, lng: -73.9851 },
                    type: 'pickup'
                }
            ],
            policies: {
                carpoolGuidelines: 'Standard carpool guidelines',
                safetyRequirements: 'All drivers must be verified',
                cancellationPolicy: '24 hours notice required'
            },
            createdAt: new Date(),
            updatedAt: new Date(),
            ...overrides
        };
    }
}
exports.TestDataFactory = TestDataFactory;
class MockServices {
    /**
     * Mock authentication service
     */
    static createAuthService() {
        return {
            generateToken: jest.fn().mockResolvedValue('mock-jwt-token'),
            verifyToken: jest.fn().mockResolvedValue({ userId: 'test-user-id' }),
            hashPassword: jest.fn().mockResolvedValue('hashed-password'),
            comparePassword: jest.fn().mockResolvedValue(true),
            generatePasswordResetToken: jest.fn().mockResolvedValue('reset-token')
        };
    }
    /**
     * Mock email service
     */
    static createEmailService() {
        return {
            sendWelcomeEmail: jest.fn().mockResolvedValue(true),
            sendTripNotification: jest.fn().mockResolvedValue(true),
            sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
            sendTripReminder: jest.fn().mockResolvedValue(true)
        };
    }
    /**
     * Mock notification service
     */
    static createNotificationService() {
        return {
            sendPushNotification: jest.fn().mockResolvedValue(true),
            sendSMSNotification: jest.fn().mockResolvedValue(true),
            sendEmailNotification: jest.fn().mockResolvedValue(true)
        };
    }
    /**
     * Mock database service
     */
    static createDatabaseService() {
        const mockData = new Map();
        return {
            create: jest.fn().mockImplementation(async (container, item) => {
                const id = item.id || (0, uuid_1.v4)();
                const itemWithId = { ...item, id };
                mockData.set(`${container}:${id}`, itemWithId);
                return itemWithId;
            }),
            findById: jest.fn().mockImplementation(async (container, id) => {
                return mockData.get(`${container}:${id}`) || null;
            }),
            findByQuery: jest.fn().mockImplementation(async (container, query) => {
                const items = Array.from(mockData.values())
                    .filter(item => item && typeof item === 'object');
                return items;
            }),
            update: jest.fn().mockImplementation(async (container, id, updates) => {
                const existing = mockData.get(`${container}:${id}`);
                if (!existing)
                    return null;
                const updated = { ...existing, ...updates, updatedAt: new Date() };
                mockData.set(`${container}:${id}`, updated);
                return updated;
            }),
            delete: jest.fn().mockImplementation(async (container, id) => {
                const existing = mockData.get(`${container}:${id}`);
                if (existing) {
                    mockData.delete(`${container}:${id}`);
                    return true;
                }
                return false;
            }),
            // Helper to clear mock data
            clearMockData: () => mockData.clear(),
            // Helper to get mock data
            getMockData: () => mockData
        };
    }
}
exports.MockServices = MockServices;
class TestAssertions {
    /**
     * Assert that an object matches the User schema
     */
    static assertValidUser(user) {
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('name');
        expect(user).toHaveProperty('role');
        expect(user.id).toBeValidUUID();
        expect(user.email).toBeValidEmail();
        expect(['admin', 'parent', 'student', 'driver']).toContain(user.role);
    }
    /**
     * Assert that an object matches the Trip schema
     */
    static assertValidTrip(trip) {
        expect(trip).toHaveProperty('id');
        expect(trip).toHaveProperty('driverId');
        expect(trip).toHaveProperty('route');
        expect(trip).toHaveProperty('schedule');
        expect(trip.id).toBeValidUUID();
        expect(trip.driverId).toBeValidUUID();
        expect(['scheduled', 'active', 'completed', 'cancelled']).toContain(trip.status);
    }
    /**
     * Assert that an HTTP response has expected structure
     */
    static assertValidApiResponse(response, expectedStatus = 200) {
        expect(response).toHaveProperty('status', expectedStatus);
        expect(response).toHaveProperty('data');
    }
    /**
     * Assert that an error response has expected structure
     */
    static assertValidErrorResponse(response, expectedStatus = 400) {
        expect(response).toHaveProperty('status', expectedStatus);
        expect(response).toHaveProperty('error');
        expect(response.error).toHaveProperty('message');
    }
}
exports.TestAssertions = TestAssertions;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
exports.delay = delay;
const expectAsync = async (fn) => {
    try {
        const result = await fn();
        return expect(result);
    }
    catch (error) {
        return expect(error);
    }
};
exports.expectAsync = expectAsync;
