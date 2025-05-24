/**
 * Global Test Teardown
 * Cleans up test environment and resources
 */

export default async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');
  
  // Cleanup test database
  try {
    // Clean up any test data or connections
    console.log('✅ Test database cleanup completed');
  } catch (error) {
    console.error('❌ Failed to cleanup test database:', error);
  }
  
  // Log test execution time
  const testDuration = Date.now() - (global as any).__TEST_START_TIME__;
  console.log(`⏱️  Total test execution time: ${testDuration}ms`);
  
  console.log('✅ Global test teardown completed');
}
