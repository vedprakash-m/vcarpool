/**
 * Test Results Processor
 * Processes and formats test results for reporting
 */

module.exports = (testResult) => {
  // Calculate test statistics
  const stats = {
    totalTests: testResult.numTotalTests,
    passedTests: testResult.numPassedTests,
    failedTests: testResult.numFailedTests,
    skippedTests: testResult.numPendingTests,
    totalTime: testResult.testResults.reduce((acc, result) => acc + result.perfStats.end - result.perfStats.start, 0)
  };
  
  // Log summary
  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Passed: ${stats.passedTests}`);
  console.log(`❌ Failed: ${stats.failedTests}`);
  console.log(`⏭️  Skipped: ${stats.skippedTests}`);
  console.log(`⏱️  Total Time: ${stats.totalTime}ms`);
  
  // Log slowest tests
  const slowTests = testResult.testResults
    .map(result => ({
      file: result.testFilePath,
      time: result.perfStats.end - result.perfStats.start
    }))
    .sort((a, b) => b.time - a.time)
    .slice(0, 5);
  
  if (slowTests.length > 0) {
    console.log('\n🐌 Slowest Tests:');
    slowTests.forEach((test, index) => {
      console.log(`${index + 1}. ${test.file.split('/').pop()} (${test.time}ms)`);
    });
  }
  
  return testResult;
};
