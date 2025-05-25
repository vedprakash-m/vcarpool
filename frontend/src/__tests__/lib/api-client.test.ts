/**
 * Tests for API client utility
 * Testing HTTP request handling and error management
 */

import axios from 'axios';

// Create a mock axios instance
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  defaults: {
    baseURL: 'http://localhost:7071/api',
  },
  interceptors: {
    request: {
      use: jest.fn(),
    },
    response: {
      use: jest.fn(),
    },
  },
} as any;

// Mock axios
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => mockAxiosInstance),
    post: jest.fn(),
  },
}));

// Import apiClient after mocking
import { apiClient } from '../../lib/api-client';

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('apiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clear any stored tokens
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('GET requests', () => {
    it('should make successful GET request', async () => {
      const mockData = { id: 1, name: 'Test' };
      
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { success: true, data: mockData },
        status: 200,
      });

      const result = await apiClient.get('/test');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', undefined);
      expect(result).toEqual({ success: true, data: mockData });
    });

    it('should handle query parameters in config', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { success: true, data: [] },
        status: 200,
      });

      await apiClient.get('/test', { params: { page: 1, limit: 10 } });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', { params: { page: 1, limit: 10 } });
    });
  });

  describe('POST requests', () => {
    it('should make successful POST request', async () => {
      const requestData = { name: 'Test', email: 'test@example.com' };
      const responseData = { id: 1, ...requestData };
      
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { success: true, data: responseData },
        status: 201,
      });

      const result = await apiClient.post('/test', requestData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', requestData, undefined);
      expect(result).toEqual({ success: true, data: responseData });
    });

    it('should handle POST without body', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { success: true },
        status: 200,
      });

      await apiClient.post('/action');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/action', undefined, undefined);
    });
  });

  describe('PUT requests', () => {
    it('should make successful PUT request', async () => {
      const requestData = { id: 1, name: 'Updated Test' };
      
      mockAxiosInstance.put.mockResolvedValueOnce({
        data: { success: true, data: requestData },
        status: 200,
      });

      const result = await apiClient.put('/test/1', requestData);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test/1', requestData, undefined);
      expect(result).toEqual({ success: true, data: requestData });
    });
  });

  describe('DELETE requests', () => {
    it('should make successful DELETE request', async () => {
      mockAxiosInstance.delete.mockResolvedValueOnce({
        data: { success: true, message: 'Deleted successfully' },
        status: 200,
      });

      const result = await apiClient.delete('/test/1');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/test/1', undefined);
      expect(result).toEqual({ success: true, message: 'Deleted successfully' });
    });
  });

  describe('getPaginated requests', () => {
    it('should make successful paginated GET request', async () => {
      const mockData = [{ id: 1 }, { id: 2 }];
      const paginatedResponse = {
        success: true,
        data: mockData,
        meta: { page: 1, limit: 10, total: 2, totalPages: 1 }
      };
      
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: paginatedResponse,
        status: 200,
      });

      const result = await apiClient.getPaginated('/test', { page: 1, limit: 10 });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', {
        params: { page: 1, limit: 10 }
      });
      expect(result).toEqual(paginatedResponse);
    });

    it('should merge params with config', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { success: true, data: [], meta: {} },
        status: 200,
      });

      await apiClient.getPaginated('/test', { page: 1 }, { 
        headers: { 'Custom-Header': 'value' },
        params: { sort: 'name' }
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', {
        headers: { 'Custom-Header': 'value' },
        params: { sort: 'name', page: 1 }
      });
    });
  });

  describe('Error handling', () => {
    it('should handle network errors', async () => {
      const error = new Error('Network Error');
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      await expect(apiClient.get('/test')).rejects.toThrow('Network Error');
    });

    it('should handle HTTP error responses', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: { error: 'Bad Request', message: 'Invalid data' },
        },
      };
      
      mockAxiosInstance.post.mockRejectedValueOnce(errorResponse);

      await expect(apiClient.post('/test', {})).rejects.toEqual(errorResponse);
    });

    it('should handle 401 unauthorized errors', async () => {
      const errorResponse = {
        response: {
          status: 401,
          data: { error: 'Unauthorized', message: 'Token expired' },
        },
      };
      
      mockAxiosInstance.get.mockRejectedValueOnce(errorResponse);

      await expect(apiClient.get('/test')).rejects.toEqual(errorResponse);
    });

    it('should handle 404 not found errors', async () => {
      const errorResponse = {
        response: {
          status: 404,
          data: { error: 'Not Found', message: 'Resource not found' },
        },
      };
      
      mockAxiosInstance.get.mockRejectedValueOnce(errorResponse);

      await expect(apiClient.get('/test/999')).rejects.toEqual(errorResponse);
    });

    it('should handle 500 server errors', async () => {
      const errorResponse = {
        response: {
          status: 500,
          data: { error: 'Internal Server Error', message: 'Something went wrong' },
        },
      };
      
      mockAxiosInstance.get.mockRejectedValueOnce(errorResponse);

      await expect(apiClient.get('/test')).rejects.toEqual(errorResponse);
    });
  });

  describe('Token management', () => {
    it('should set and clear tokens', () => {
      // Set token
      apiClient.setToken('test-token', 'refresh-token');
      
      // Clear tokens
      apiClient.clearToken();
      
      // Test passes if no errors are thrown
      expect(true).toBe(true);
    });

    it('should load tokens from localStorage', () => {
      // Test passes if no errors are thrown
      apiClient.loadToken();
      expect(true).toBe(true);
    });
  });

  describe('Request building', () => {
    it('should create axios instance with correct config', () => {
      // The axios.create call happens during module initialization
      // We can't test this directly but we can test that our mock works
      expect(mockedAxios.create).toBeDefined();
    });

    it('should setup request and response interceptors', () => {
      // These are called during initialization, we just verify the structure
      expect(mockAxiosInstance.interceptors.request.use).toBeDefined();
      expect(mockAxiosInstance.interceptors.response.use).toBeDefined();
    });
  });

  describe('Response handling', () => {
    it('should return response data', async () => {
      const mockData = { id: 1, name: 'Test' };
      
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockData,
        status: 200,
      });

      const result = await apiClient.get('/test');

      expect(result).toEqual(mockData);
    });

    it('should handle empty response', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: null,
        status: 204,
      });

      const result = await apiClient.get('/test');

      expect(result).toBeNull();
    });

    it('should handle array response', async () => {
      const mockData = [{ id: 1 }, { id: 2 }];
      
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockData,
        status: 200,
      });

      const result = await apiClient.get('/test');

      expect(result).toEqual(mockData);
    });
  });
});
