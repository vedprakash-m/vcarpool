/**
 * Global Test Teardown
 * Cleans up test environment and resources after all tests complete
 */

export default async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');
  
  // Cleanup test database
  try {
    // Close any open connections and clean up test data
    if ((global as any).__TEST_CONNECTIONS__?.cosmos) {
      await (global as any).__TEST_CONNECTIONS__.cosmos.close();
    }
    
    // Reset any mocked functions or services
    if ((global as any).__TEST_MOCKS__) {
      delete (global as any).__TEST_MOCKS__;
    }
    
    console.log('✅ Test database cleanup completed');
  } catch (error) {
    console.error('❌ Failed to cleanup test database:', error);
  }
  
  // Log test execution time
  const testDuration = Date.now() - ((global as any).__TEST_START_TIME__ || Date.now());
  console.log(`⏱️  Total test execution time: ${testDuration}ms`);
  
  // Clean up environment variables set during testing
  delete process.env.TEST_MODE;
  
  console.log('✅ Global test teardown completed');
}
