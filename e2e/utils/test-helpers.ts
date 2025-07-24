/**
 * E2E Test Helper Functions
 * Utility functions for test data management, user actions, and common patterns
 */

import { Page, expect, APIRequestContext } from '@playwright/test';
import axios from 'axios';

export interface TestUser {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: 'parent' | 'admin';
}

export interface TestCarpoolGroup {
  id?: string;
  name: string;
  school: string;
  schedule: {
    days: string[];
    pickupTime: string;
    dropoffTime: string;
  };
  maxCapacity: number;
  currentParticipants?: number;
  costPerSeat?: number;
  createdBy?: string;
}

export interface TestChild {
  firstName: string;
  lastName: string;
  grade: string;
  school: string;
  birthDate?: string;
}

export interface TestFamily {
  familyName: string;
  parent: TestUser;
  children: TestChild[];
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

/**
 * Makes an API request with proper error handling
 */
export async function makeApiRequest(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: any,
  headers?: Record<string, string>,
) {
  const baseURL = process.env.BACKEND_URL || 'http://localhost:7072';
  const fullUrl = url.startsWith('/') ? `${baseURL}${url}` : `${baseURL}/${url}`;

  const requestOptions: any = {
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    requestOptions.data = data;
  }

  try {
    switch (method.toLowerCase()) {
      case 'get':
        return await request.get(fullUrl, requestOptions);
      case 'post':
        return await request.post(fullUrl, requestOptions);
      case 'put':
        return await request.put(fullUrl, requestOptions);
      case 'delete':
        return await request.delete(fullUrl, requestOptions);
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  } catch (error) {
    console.error(`API request failed: ${method} ${fullUrl}`, error);
    throw error;
  }
}

/**
 * Enhanced API request helper with better error handling and retry logic
 */
export async function makeApiRequestWithRetry(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: any,
  headers?: Record<string, string>,
  retries: number = 3,
) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await makeApiRequest(request, method, url, data, headers);

      // Return successful responses immediately
      if (response.status() < 500) {
        return response;
      }

      // Retry on 5xx errors
      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
    }
  }

  throw lastError || new Error('Request failed after all retries');
}

/**
 * Creates a test user with optional database persistence
 */
export async function createTestUser(
  role: 'parent' | 'admin' = 'parent',
  persistToDb: boolean = true,
): Promise<TestUser> {
  const timestamp = Date.now();
  const user: TestUser = {
    email: `test.${role}.${timestamp}@example.com`,
    password: 'TestPassword123!',
    name: `Test ${role === 'admin' ? 'Administrator' : 'Parent'} ${timestamp}`,
    phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    role,
  };

  if (persistToDb) {
    // Register user via API
    try {
      await registerUserViaAPI(user);
    } catch (error) {
      console.warn('Failed to register user via API, using mock data:', error);
    }
  }

  return user;
}

/**
 * Creates a test family
 */
export function createTestFamily(user?: TestUser): TestFamily {
  const parent = user || {
    email: `test.parent.${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Test Parent',
    phone: '+12345678901',
    role: 'parent' as const,
  };

  return {
    familyName: `${parent.name} Family`,
    parent,
    children: [
      {
        firstName: 'Test',
        lastName: 'Child',
        grade: '9',
        school: 'Tesla STEM High School',
      },
    ],
    address: {
      street: '123 Test Street',
      city: 'Redmond',
      state: 'WA',
      zipCode: '98052',
    },
  };
}

/**
 * Creates a test carpool group
 */
export async function createTestCarpoolGroup(createdBy?: string): Promise<TestCarpoolGroup> {
  const timestamp = Date.now();
  return {
    name: `Test Carpool Group ${timestamp}`,
    school: 'Tesla STEM High School',
    schedule: {
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      pickupTime: '08:00',
      dropoffTime: '15:30',
    },
    maxCapacity: 4,
    currentParticipants: 1,
    costPerSeat: 5.0,
    createdBy,
  };
}

/**
 * Logs in a user via the UI
 */
export async function loginAsUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="submit-login-button"]');
  await expect(page).toHaveURL('/dashboard');
}

/**
 * Registers a new user via the API (for setup)
 */
export async function registerUserViaAPI(user: TestUser, family?: TestFamily): Promise<void> {
  try {
    const registrationData = {
      familyName: family?.familyName || `${user.name} Family`,
      parent: {
        firstName: user.name.split(' ')[0],
        lastName: user.name.split(' ')[1] || 'Doe',
        email: user.email,
        password: user.password,
        phoneNumber: user.phone,
      },
      children: family?.children || [
        {
          firstName: 'Test',
          lastName: 'Child',
          grade: '9',
          school: 'Tesla STEM High School',
        },
      ],
      homeAddress: family?.address || {
        street: '123 Test Street',
        city: 'Redmond',
        state: 'WA',
        zipCode: '98052',
      },
    };

    const response = await axios.post(
      `${process.env.BACKEND_URL || 'http://localhost:7072'}/api/auth-register-secure`,
      registrationData,
    );

    if (response.status !== 201) {
      throw new Error(`Registration failed: ${response.statusText}`);
    }
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
}

/**
 * Cleanup a test user by email
 */
export async function cleanupTestUser(email: string): Promise<void> {
  try {
    // Call cleanup API endpoint or database directly
    const response = await axios.delete(
      `${process.env.BACKEND_URL || 'http://localhost:7072'}/api/test-user/${encodeURIComponent(email)}`,
    );
    console.log(`User ${email} cleaned up successfully`);
  } catch (error) {
    console.warn(`Failed to cleanup user ${email}:`, error);
  }
}

/**
 * Wait for element to be visible
 */
export async function waitForElement(page: Page, selector: string, timeout = 10000): Promise<void> {
  await expect(page.locator(selector)).toBeVisible({ timeout });
}

/**
 * Fill form field and verify
 */
export async function fillAndVerifyField(
  page: Page,
  selector: string,
  value: string,
): Promise<void> {
  await page.fill(selector, value);
  await expect(page.locator(selector)).toHaveValue(value);
}

/**
 * Navigate and verify URL
 */
export async function navigateAndVerify(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await expect(page).toHaveURL(url);
}

/**
 * Click button and wait for navigation
 */
export async function clickAndWaitForNavigation(
  page: Page,
  selector: string,
  expectedUrl?: string,
): Promise<void> {
  await Promise.all([page.waitForNavigation(), page.click(selector)]);

  if (expectedUrl) {
    await expect(page).toHaveURL(expectedUrl);
  }
}

/**
 * Check for error messages
 */
export async function expectErrorMessage(page: Page, errorText: string): Promise<void> {
  await expect(page.locator('[data-testid="error-message"]')).toContainText(errorText);
}

/**
 * Check for success messages
 */
export async function expectSuccessMessage(page: Page, successText: string): Promise<void> {
  await expect(page.locator('[data-testid="success-message"]')).toContainText(successText);
}

/**
 * Take a screenshot with descriptive name
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({
    path: `test-results/screenshots/${name}-${Date.now()}.png`,
    fullPage: true,
  });
}

/**
 * Wait for API response
 */
export async function waitForAPIResponse(page: Page, urlPattern: string | RegExp): Promise<any> {
  const response = await page.waitForResponse(urlPattern);
  return response.json();
}

/**
 * Check if element is visible
 */
export async function isElementVisible(page: Page, selector: string): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout: 1000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear local storage and session storage
 */
export async function clearStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Set viewport for mobile testing
 */
export async function setMobileViewport(page: Page): Promise<void> {
  await page.setViewportSize({ width: 375, height: 667 });
}

/**
 * Set viewport for desktop testing
 */
export async function setDesktopViewport(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 720 });
}

/**
 * Mock API response
 */
export async function mockAPIResponse(page: Page, url: string, response: any): Promise<void> {
  await page.route(url, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Seed test data to database
 */
export async function seedTestData(): Promise<void> {
  try {
    const response = await axios.post(
      `${process.env.BACKEND_URL || 'http://localhost:7072'}/api/test-seed-data`,
    );
    console.log('Test data seeded successfully');
  } catch (error) {
    console.warn('Failed to seed test data:', error);
  }
}

/**
 * Reset test database
 */
export async function resetTestDatabase(): Promise<void> {
  try {
    const response = await axios.post(
      `${process.env.BACKEND_URL || 'http://localhost:7072'}/api/test-reset-database`,
    );
    console.log('Test database reset successfully');
  } catch (error) {
    console.warn('Failed to reset test database:', error);
  }
}

/**
 * Wait for notification to be sent and received
 */
export async function waitForNotification(
  request: APIRequestContext,
  userToken: string,
  expectedType?: string,
  timeoutMs: number = 10000,
) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const response = await makeApiRequest(
      request,
      'GET',
      '/api/notifications-history?limit=1',
      null,
      { Authorization: `Bearer ${userToken}` },
    );

    const data = await response.json();
    if (data.notifications && data.notifications.length > 0) {
      const latestNotification = data.notifications[0];
      if (!expectedType || latestNotification.type === expectedType) {
        return latestNotification;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Notification not received within ${timeoutMs}ms`);
}

/**
 * Create a test group and return its ID
 */
export async function createTestGroup(
  request: APIRequestContext,
  userToken: string,
  groupData?: Partial<TestCarpoolGroup>,
): Promise<string> {
  const defaultGroup = await createTestCarpoolGroup();
  const group = { ...defaultGroup, ...groupData };

  const response = await makeApiRequest(request, 'POST', '/api/parent-group-creation', group, {
    Authorization: `Bearer ${userToken}`,
  });

  const data = await response.json();
  return data.groupId;
}

/**
 * Clean up test group
 */
export async function cleanupTestGroup(
  request: APIRequestContext,
  adminToken: string,
  groupId: string,
): Promise<void> {
  try {
    await makeApiRequest(
      request,
      'DELETE',
      `/api/admin-group-lifecycle/delete/${groupId}`,
      { reason: 'Test cleanup' },
      { Authorization: `Bearer ${adminToken}` },
    );
  } catch (error) {
    console.warn(`Failed to cleanup test group ${groupId}:`, error);
  }
}

/**
 * Wait for system to process background operations
 */
export async function waitForSystemProcessing(ms: number = 2000): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Validate API response structure
 */
export function validateApiResponse(response: any, expectedFields: string[]): void {
  for (const field of expectedFields) {
    if (field.includes('.')) {
      // Handle nested fields like 'user.email'
      const parts = field.split('.');
      let current = response;
      for (const part of parts) {
        if (current[part] === undefined) {
          throw new Error(`Expected field '${field}' not found in response`);
        }
        current = current[part];
      }
    } else {
      if (response[field] === undefined) {
        throw new Error(`Expected field '${field}' not found in response`);
      }
    }
  }
}

/**
 * Generate test data for bulk operations
 */
export function generateTestUsers(count: number, role: 'parent' | 'admin' = 'parent'): TestUser[] {
  return Array.from({ length: count }, (_, i) => ({
    email: `test.user.${i}.${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: `Test User ${i + 1}`,
    phone: `+1555000${String(i).padStart(4, '0')}`,
    role,
  }));
}

/**
 * Batch create test users
 */
export async function createTestUsers(
  request: APIRequestContext,
  adminToken: string,
  users: TestUser[],
): Promise<TestUser[]> {
  const createdUsers: TestUser[] = [];

  for (const user of users) {
    try {
      const response = await makeApiRequest(
        request,
        'POST',
        '/api/admin-create-user',
        {
          email: user.email,
          password: user.password,
          name: user.name,
          phone: user.phone,
          role: user.role,
        },
        { Authorization: `Bearer ${adminToken}` },
      );

      if (response.status() === 200) {
        createdUsers.push(user);
      }
    } catch (error) {
      console.warn(`Failed to create user ${user.email}:`, error);
    }
  }

  return createdUsers;
}

/**
 * Batch cleanup test users
 */
export async function cleanupTestUsers(
  request: APIRequestContext,
  adminToken: string,
  users: TestUser[],
): Promise<void> {
  for (const user of users) {
    try {
      await cleanupTestUser(user.email);
    } catch (error) {
      console.warn(`Failed to cleanup user ${user.email}:`, error);
    }
  }
}

/**
 * Create test trip data
 */
export function createTestTrip(overrides?: any) {
  return {
    type: 'pickup',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    time: '08:00',
    route: {
      startLocation: {
        address: '123 Start Street, San Francisco, CA 94105',
        coordinates: { latitude: 37.7749, longitude: -122.4194 },
      },
      stops: [
        {
          address: '456 Stop 1, San Francisco, CA 94105',
          coordinates: { latitude: 37.7849, longitude: -122.4094 },
          pickupTime: '08:05',
          children: ['test-child-1'],
        },
      ],
      destination: {
        address: 'Test School, San Francisco, CA',
        coordinates: { latitude: 37.7549, longitude: -122.4394 },
        arrivalTime: '08:20',
      },
    },
    vehicle: {
      make: 'Toyota',
      model: 'Sienna',
      licensePlate: 'TEST123',
      color: 'Blue',
      seatCount: 7,
    },
    ...overrides,
  };
}

/**
 * Simulate real-world delay
 */
export async function simulateNetworkDelay(min: number = 100, max: number = 500): Promise<void> {
  const delay = Math.random() * (max - min) + min;
  await new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Check if endpoint is available
 */
export async function checkEndpointHealth(
  request: APIRequestContext,
  endpoint: string,
): Promise<boolean> {
  try {
    const response = await makeApiRequest(request, 'GET', `/api/${endpoint}/health`);
    return response.status() === 200;
  } catch {
    return false;
  }
}

/**
 * Generate random test data
 */
export class TestDataGenerator {
  static randomEmail(): string {
    return `test.${Date.now()}.${Math.random().toString(36).substr(2, 9)}@example.com`;
  }

  static randomPhone(): string {
    const num = Math.floor(Math.random() * 9000000000) + 1000000000;
    return `+1${num}`;
  }

  static randomAddress(): { street: string; city: string; state: string; zipCode: string } {
    const streets = ['Main St', 'Oak Ave', 'Pine Rd', 'Cedar Ln', 'Elm Dr'];
    const cities = ['San Francisco', 'San Jose', 'Oakland', 'Berkeley', 'Palo Alto'];
    const streetNum = Math.floor(Math.random() * 9999) + 1;
    const zipCode = Math.floor(Math.random() * 90000) + 10000;

    return {
      street: `${streetNum} ${streets[Math.floor(Math.random() * streets.length)]}`,
      city: cities[Math.floor(Math.random() * cities.length)],
      state: 'CA',
      zipCode: zipCode.toString(),
    };
  }

  static randomFutureDate(daysFromNow: number = 7): string {
    const date = new Date();
    date.setDate(date.getDate() + Math.floor(Math.random() * daysFromNow) + 1);
    return date.toISOString().split('T')[0];
  }
}
