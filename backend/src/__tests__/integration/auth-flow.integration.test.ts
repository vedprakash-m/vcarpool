import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';

// API Response interfaces
interface AuthResponse {
  success: boolean;
  user: {
    email: string;
    id: string;
  };
  token: string;
}

interface UserResponse {
  user: {
    email: string;
    id: string;
  };
}

interface ErrorResponse {
  error: string;
  success: boolean;
}

// Temporarily disable these integration tests that require a running server
describe.skip('Authentication Flow Integration', () => {
  const baseUrl = process.env.TEST_API_URL || 'http://localhost:7071/api';
  let authToken: string;

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: `test-${Date.now()}@example.com`,
        password: 'StrongPassword123!',
        firstName: 'Integration',
        lastName: 'Test',
        homeAddress: {
          street: '123 Test St',
          city: 'Redmond',
          state: 'WA',
          zipCode: '98052',
        },
        children: [
          {
            firstName: 'Child',
            lastName: 'Test',
            grade: '3rd Grade',
            school: 'Test Elementary',
          },
        ],
      };

      const response = await axios.post<AuthResponse>(`${baseUrl}/auth-register`, userData);

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.user.email).toBe(userData.email);
      expect(response.data.token).toBeDefined();

      authToken = response.data.token;
    });

    it('should validate address during registration', async () => {
      const userData = {
        email: `test-addr-${Date.now()}@example.com`,
        password: 'StrongPassword123!',
        firstName: 'Address',
        lastName: 'Test',
        homeAddress: {
          street: '999 Nonexistent St',
          city: 'Nowhere',
          state: 'XX',
          zipCode: '00000',
        },
      };

      try {
        await axios.post(`${baseUrl}/auth-register`, userData);
        fail('Should have thrown an error for invalid address');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        const errorData = error.response.data as ErrorResponse;
        expect(errorData.error).toContain('address');
      }
    });
  });

  describe('User Authentication', () => {
    it('should authenticate with valid credentials', async () => {
      // This test assumes the user from the registration test exists
      const loginData = {
        email: 'test@example.com', // Use existing test user
        password: 'StrongPassword123!',
      };

      const response = await axios.post<AuthResponse>(`${baseUrl}/auth-login`, loginData);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.token).toBeDefined();
    });

    it('should protect endpoints with authentication', async () => {
      // Try to access protected endpoint without token
      try {
        await axios.get(`${baseUrl}/users-me`);
        fail('Should have thrown 401 error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }

      // Try with valid token
      const response = await axios.get<UserResponse>(`${baseUrl}/users-me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data.user).toBeDefined();
    });
  });
});
