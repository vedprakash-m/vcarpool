/**
 * Global Setup for E2E Tests
 * Initializes the test environment, sets up database, and ensures services are ready
 */

import { FullConfig } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
const { waitForServices } = require('./health-check.js');
const { resetDatabase } = require('./reset-database.js');
const { seedDatabase } = require('./seed-database.js');

const execAsync = promisify(exec);

export default async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Carpool E2E Global Setup...');

  try {
    // Step 1: Start services if not running in CI
    if (!process.env.CI) {
      console.log('📦 Starting Docker services...');
      try {
        await execAsync(
          'docker-compose -f docker-compose.e2e.yml up -d mongodb-test backend-test frontend-test',
          {
            cwd: process.cwd().replace('/e2e', ''),
          },
        );
        console.log('✅ Docker services started');
      } catch (error) {
        console.warn('⚠️ Docker services may already be running or not available locally');
      }
    }

    // Step 2: Wait for all services to be healthy
    console.log('⏳ Waiting for services to be ready...');
    await waitForServices(120000); // 2 minute timeout

    // Step 3: Reset and seed test database
    console.log('🗄️ Preparing test database...');
    await resetDatabase();
    await seedDatabase();

    console.log('✅ E2E environment setup completed successfully');
  } catch (error) {
    console.error('❌ E2E setup failed:', error);

    // Cleanup on failure
    if (!process.env.CI) {
      console.log('🧹 Cleaning up after failed setup...');
      try {
        await execAsync('docker-compose -f docker-compose.e2e.yml down', {
          cwd: process.cwd().replace('/e2e', ''),
        });
      } catch (cleanupError) {
        console.warn('⚠️ Cleanup after failure also failed:', cleanupError);
      }
    }

    throw error;
  }
}
