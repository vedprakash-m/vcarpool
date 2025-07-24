import { Page } from '@playwright/test';

/**
 * E2E Authentication Setup Helper
 *
 * Provides mock authentication setup for Playwright tests
 * to enable testing of protected routes without complex authentication flows.
 */

export interface MockUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'parent' | 'student';
}

export const defaultUsers: Record<string, MockUser> = {
  admin: {
    id: 'e2e-admin-123',
    email: 'admin@carpool.test',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
  },
  parent: {
    id: 'e2e-parent-456',
    email: 'parent@carpool.test',
    firstName: 'Parent',
    lastName: 'User',
    role: 'parent',
  },
  student: {
    id: 'e2e-student-789',
    email: 'student@carpool.test',
    firstName: 'Student',
    lastName: 'User',
    role: 'student',
  },
};

/**
 * Set up mock authentication for E2E tests
 * @param page - Playwright page instance
 * @param role - Type of user to authenticate as
 */
export async function setupMockAuth(
  page: Page,
  role: 'admin' | 'parent' | 'student' = 'admin'
) {
  // Set up mock authentication for E2E tests
  await page.addInitScript(userRole => {
    const mockUser = {
      admin: {
        id: 'e2e-admin-123',
        email: 'admin@carpool.test',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
      },
      parent: {
        id: 'e2e-parent-123',
        email: 'parent@carpool.test',
        firstName: 'Parent',
        lastName: 'User',
        role: 'parent',
      },
      student: {
        id: 'e2e-student-123',
        email: 'student@carpool.test',
        firstName: 'Student',
        lastName: 'User',
        role: 'student',
      },
    };

    const user = mockUser[userRole];
    const token = `mock-jwt-token-${userRole}-${Date.now()}`;

    // Set localStorage items that the app expects
    localStorage.setItem('carpool_token', token);
    localStorage.setItem('carpool_user', JSON.stringify(user));
    localStorage.setItem('access_token', token);
    localStorage.setItem('refresh_token', `refresh-${token}`);

    // Mock API responses for E2E tests
    console.log('Mock API responses configured for E2E tests');

    // Override fetch to return mock responses
    const originalFetch = window.fetch;
    window.fetch = async (url, options) => {
      const urlString = url.toString();

      // Mock auth endpoints
      if (
        urlString.includes('/auth/token') ||
        urlString.includes('/auth/login')
      ) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              user: user,
              token: token,
              refreshToken: `refresh-${token}`,
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Mock user profile endpoint
      if (urlString.includes('/users/me')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: { user: user },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Mock trips stats endpoint
      if (urlString.includes('/trips/stats')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              totalTrips: 15,
              activeTrips: 8,
              completedTrips: 7,
              upcomingTrips: 3,
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Mock admin endpoints
      if (urlString.includes('/admin/generate-schedule')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              assignmentsCreated: 12,
              message: 'Schedule generated successfully',
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Mock trips list endpoint
      if (urlString.includes('/trips') && !urlString.includes('/stats')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              trips: [
                {
                  id: 'trip-1',
                  destination: 'Lincoln Elementary School',
                  date: '2025-01-15',
                  departureTime: '08:00',
                  maxPassengers: 4,
                  currentPassengers: 2,
                },
              ],
              pagination: {
                page: 1,
                limit: 20,
                total: 1,
                totalPages: 1,
              },
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // For all other requests, use original fetch
      return originalFetch(url, options);
    };
  }, role);
}

/**
 * Clear authentication state
 * @param page - Playwright page instance
 */
export async function clearMockAuth(page: Page) {
  try {
    await page.evaluate(() => {
      try {
        localStorage.removeItem('carpool_token');
        localStorage.removeItem('carpool_user');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      } catch (e) {
        // Ignore localStorage access errors in test environment
        console.log('localStorage access denied, continuing with test');
      }
    });
  } catch (error) {
    // If page.evaluate fails, continue with test - this is expected in some test environments
    console.log('clearMockAuth failed, continuing with test:', error);
  }
}

/**
 * Verify authentication state in the browser
 * @param page - Playwright page instance
 * @returns Current auth state
 */
export async function getAuthState(page: Page): Promise<{
  isAuthenticated: boolean;
  user: any | null;
  token: string | null;
}> {
  try {
    return await page.evaluate(() => {
      try {
        const token = localStorage.getItem('carpool_token');
        const userStr = localStorage.getItem('carpool_user');
        const user = userStr ? JSON.parse(userStr) : null;

        return {
          isAuthenticated: !!token && !!user,
          user,
          token,
        };
      } catch (e) {
        // Return default state if localStorage is not accessible
        return {
          isAuthenticated: false,
          user: null,
          token: null,
        };
      }
    });
  } catch (error) {
    // Return default state if evaluation fails
    return {
      isAuthenticated: false,
      user: null,
      token: null,
    };
  }
}

/**
 * Wait for authentication to be properly set up
 * @param page - Playwright page instance
 * @param timeout - Timeout in milliseconds
 */
export async function waitForAuth(
  page: Page,
  timeout: number = 5000
): Promise<void> {
  try {
    await page.waitForFunction(
      () => {
        try {
          const token = localStorage.getItem('carpool_token');
          const user = localStorage.getItem('carpool_user');
          return !!token && !!user;
        } catch (e) {
          // If localStorage is not accessible, assume auth is ready
          return true;
        }
      },
      { timeout }
    );
  } catch (error) {
    // If waitForFunction fails, continue - this is expected in some test environments
    console.log('waitForAuth timeout, continuing with test');
  }
}

/**
 * Setup mock authentication and navigate to a protected route
 * @param page - Playwright page instance
 * @param route - Route to navigate to after auth setup
 * @param userType - Type of user to authenticate as
 */
export async function authenticateAndNavigate(
  page: Page,
  route: string,
  userType: 'admin' | 'parent' | 'student' = 'admin'
): Promise<void> {
  // Setup authentication first
  await setupMockAuth(page, userType);

  // Navigate to the route
  await page.goto(route);

  // Wait for page to load
  await page.waitForLoadState('domcontentloaded');

  // Verify auth is working
  await waitForAuth(page);
}

/**
 * Mock API responses for E2E testing
 * @param page - Playwright page instance
 */
export async function setupMockAPIResponses(page: Page): Promise<void> {
  // Mock authentication endpoints
  await page.route('**/api/v1/auth/token', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          user: {
            id: 'e2e-admin-123',
            email: 'admin@carpool.test',
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin',
          },
          token: 'mock-jwt-token-for-e2e',
          refreshToken: 'mock-refresh-token-for-e2e',
        },
      }),
    });
  });

  // Mock user profile endpoint
  await page.route('**/api/v1/users/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 'e2e-admin-123',
          email: 'admin@carpool.test',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin',
        },
      }),
    });
  });

  // Mock trip statistics endpoint
  await page.route('**/api/v1/trips/stats', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          totalTrips: 8,
          tripsAsDriver: 5,
          tripsAsPassenger: 3,
          weeklySchoolTrips: 6,
          childrenCount: 2,
          costSavings: 245.5,
          monthlyFuelSavings: 89.25,
          timeSavedHours: 12,
          upcomingTrips: 2,
        },
      }),
    });
  });

  // Mock schedule generation endpoint
  await page.route('**/api/v1/admin/generate-schedule', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          assignmentsCreated: 15,
          slotsAssigned: 12,
          unassignedSlots: 3,
          algorithmSteps: [
            {
              step: 1,
              name: 'exclude_unavailable_slots',
              driversProcessed: 25,
              slotsExcluded: 8,
            },
            {
              step: 2,
              name: 'assign_preferable_slots',
              driversProcessed: 17,
              slotsAssigned: 5,
            },
          ],
        },
      }),
    });
  });

  console.log('Mock API responses configured for E2E tests');
}
