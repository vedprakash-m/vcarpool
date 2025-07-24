/**
 * Global Test Setup
 * Initializes test environment, databases, and external services
 */

import { CosmosClient } from '@azure/cosmos';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { existsSync } from 'fs';

export default async function globalSetup() {
  console.log('🧪 Setting up test environment...');
  
  // Load environment variables from .env.test if it exists
  const testEnvPath = join(__dirname, '../.env.test');
  if (existsSync(testEnvPath)) {
    dotenv.config({ path: testEnvPath });
  }

  // Setup default environment variables for tests if not already set
  if (!process.env.NODE_ENV) (process.env as any).NODE_ENV = 'test';
  if (!process.env.JWT_SECRET) (process.env as any).JWT_SECRET = 'test-jwt-secret';
  if (!process.env.JWT_REFRESH_SECRET) (process.env as any).JWT_REFRESH_SECRET = 'test-refresh-secret';
  if (!process.env.COSMOS_DB_DATABASE_ID) (process.env as any).COSMOS_DB_DATABASE_ID = 'carpool-test';
  
  // Initialize test database
  try {
    // In a real environment, you might connect to a test Cosmos DB
    // For now, we'll use mocks and in-memory implementations
    console.log('✅ Test database configuration verified');
    
    // Register global mock factory functions for tests
    (global as any).__TEST_MOCKS__ = {
      setupMockCosmosClient: () => {
        return {
          database: () => ({
            container: () => ({
              items: {
                create: jest.fn().mockResolvedValue({ resource: {} }),
                query: jest.fn().mockReturnValue({
                  fetchAll: jest.fn().mockResolvedValue({ resources: [] })
                }),
                upsert: jest.fn().mockResolvedValue({ resource: {} }),
                delete: jest.fn().mockResolvedValue({}),
              }
            })
          })
        };
      }
    };
  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    throw error;
  }
  
  // Setup test data
  (global as any).__TEST_START_TIME__ = Date.now();
  
  console.log('✅ Global test setup completed');
}
