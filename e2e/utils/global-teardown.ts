/**
 * Global Teardown for E2E Tests
 * Cleans up the test environment after all tests complete
 */

import { exec } from 'child_process';
import { promisify } from 'util';
const { resetDatabase } = require('./reset-database.js');

const execAsync = promisify(exec);

export default async function globalTeardown() {
  console.log('🧹 Starting Carpool E2E Global Teardown...');

  try {
    // Step 1: Clean up test data
    console.log('🗄️ Cleaning up test database...');
    await resetDatabase();

    // Step 2: Stop Docker services if not in CI
    if (!process.env.CI) {
      console.log('🛑 Stopping Docker services...');
      try {
        await execAsync('docker-compose -f docker-compose.e2e.yml down', {
          cwd: process.cwd().replace('/e2e', ''),
        });
        console.log('✅ Docker services stopped');
      } catch (error) {
        console.warn('⚠️ Failed to stop Docker services:', error.message);
      }

      // Optional: Clean up Docker volumes (uncomment if needed)
      // try {
      //   await execAsync('docker-compose -f docker-compose.e2e.yml down -v');
      //   console.log('✅ Docker volumes cleaned up');
      // } catch (error) {
      //   console.warn('⚠️ Failed to clean up Docker volumes:', error.message);
      // }
    }

    console.log('✅ E2E environment teardown completed successfully');
  } catch (error) {
    console.error('❌ E2E teardown failed:', error);
    // Don't throw here as teardown failures shouldn't fail the test run
  }
}
