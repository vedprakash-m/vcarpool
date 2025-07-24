#!/usr/bin/env node

/**
 * E2E Test Coverage Analysis Script
 * Analyzes the test coverage improvements from the enhancement plan
 */

const fs = require('fs');
const path = require('path');

// Define the test coverage areas and their target counts
const coverageAreas = {
  'API Endpoints': {
    target: 35,
    description: 'Backend API endpoint coverage',
    files: ['api-endpoints.spec.ts'],
  },
  'Address Validation': {
    target: 8,
    description: 'Address validation workflows',
    files: ['address-validation.spec.ts'],
  },
  'Notification System': {
    target: 10,
    description: 'Push notifications and messaging',
    files: ['notification-system.spec.ts'],
  },
  'User Management': {
    target: 12,
    description: 'Profile management and settings',
    files: ['user-management.spec.ts'],
  },
  'Multi-User Scenarios': {
    target: 15,
    description: 'Parent-to-parent interactions',
    files: ['multi-user-scenarios.spec.ts'],
  },
  'Trip Management': {
    target: 18,
    description: 'Trip creation and management',
    files: ['trip-management.spec.ts'],
  },
  'Admin Advanced': {
    target: 20,
    description: 'Advanced admin functionality',
    files: ['admin-advanced.spec.ts'],
  },
  'Error Scenarios': {
    target: 16,
    description: 'Error handling and edge cases',
    files: ['error-scenarios.spec.ts'],
  },
  'Form Validation': {
    target: 12,
    description: 'Field validation and form handling',
    files: ['form-validation.spec.ts'],
  },
  'Security Workflows': {
    target: 10,
    description: 'Security and authentication testing',
    files: ['security-workflows.spec.ts'],
  },
  'Responsive Design': {
    target: 14,
    description: 'Mobile and responsive design testing',
    files: ['responsive-design.spec.ts'],
  },
  'Performance Workflows': {
    target: 8,
    description: 'Performance and load testing',
    files: ['performance-workflows.spec.ts'],
  },
  'End-to-End Journeys': {
    target: 12,
    description: 'Complete user journey testing',
    files: ['end-to-end-journeys.spec.ts'],
  },
  'Data Consistency': {
    target: 10,
    description: 'Data synchronization and consistency',
    files: ['data-consistency.spec.ts'],
  },
  'Existing Tests': {
    target: 47,
    description: 'Pre-existing test coverage',
    files: [
      'auth.spec.ts',
      'registration.spec.ts',
      'dashboard-navigation.spec.ts',
      'admin-functionality.spec.ts',
      'carpool-flows.spec.ts',
      'structure-validation.spec.ts',
    ],
  },
};

// Count tests in each file
function countTestsInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Count test() calls - more accurate than describe blocks
    const testMatches = content.match(/^\s*test\(/gm) || [];
    const testItMatches = content.match(/^\s*test\.(?:only|skip|fixme)\(/gm) || [];

    return testMatches.length + testItMatches.length;
  } catch (error) {
    console.warn(`Could not read file ${filePath}: ${error.message}`);
    return 0;
  }
}

// Analyze coverage
function analyzeCoverage() {
  const specsDir = path.join(__dirname, 'specs');
  let totalTests = 0;
  let totalTarget = 0;
  const results = {};

  console.log('\n🎯 E2E Test Coverage Analysis\n');
  console.log('='.repeat(80));

  for (const [area, config] of Object.entries(coverageAreas)) {
    let actualTests = 0;

    for (const fileName of config.files) {
      const filePath = path.join(specsDir, fileName);
      if (fs.existsSync(filePath)) {
        actualTests += countTestsInFile(filePath);
      }
    }

    const coverage = config.target > 0 ? (actualTests / config.target) * 100 : 0;
    totalTests += actualTests;
    totalTarget += config.target;

    results[area] = {
      actual: actualTests,
      target: config.target,
      coverage: coverage,
      status: coverage >= 100 ? '✅' : coverage >= 80 ? '⚠️' : '❌',
    };

    console.log(`${results[area].status} ${area}`);
    console.log(`   📝 ${config.description}`);
    console.log(`   🎯 Target: ${config.target} tests`);
    console.log(`   ✅ Actual: ${actualTests} tests`);
    console.log(`   📊 Coverage: ${coverage.toFixed(1)}%\n`);
  }

  console.log('='.repeat(80));
  console.log('\n📈 OVERALL COVERAGE SUMMARY\n');

  const overallCoverage = totalTarget > 0 ? (totalTests / totalTarget) * 100 : 0;
  const targetAchieved = overallCoverage >= 80;

  console.log(`🎯 Total Target Tests: ${totalTarget}`);
  console.log(`✅ Total Actual Tests: ${totalTests}`);
  console.log(`📊 Overall Coverage: ${overallCoverage.toFixed(1)}%`);
  console.log(
    `🏆 Target Achievement: ${targetAchieved ? '✅ ACHIEVED' : '❌ IN PROGRESS'} (80% target)`,
  );

  // Calculate improvement from original plan
  const originalTestCount = results['Existing Tests'].actual;
  const newTestCount = totalTests - originalTestCount;
  const improvementRatio = originalTestCount > 0 ? (newTestCount / originalTestCount) * 100 : 0;

  console.log(`\n📈 ENHANCEMENT IMPACT\n`);
  console.log(`🔄 Original Test Count: ${originalTestCount}`);
  console.log(`🆕 New Tests Added: ${newTestCount}`);
  console.log(`📊 Test Suite Growth: ${improvementRatio.toFixed(1)}%`);

  // Show areas needing attention
  const needingAttention = Object.entries(results)
    .filter(([area, data]) => data.coverage < 80)
    .map(([area, data]) => area);

  if (needingAttention.length > 0) {
    console.log(`\n⚠️  AREAS NEEDING ATTENTION\n`);
    needingAttention.forEach((area) => {
      console.log(`   • ${area} (${results[area].coverage.toFixed(1)}% coverage)`);
    });
  }

  // Show success areas
  const successAreas = Object.entries(results)
    .filter(([area, data]) => data.coverage >= 100)
    .map(([area, data]) => area);

  if (successAreas.length > 0) {
    console.log(`\n🎉 COMPLETED AREAS\n`);
    successAreas.forEach((area) => {
      console.log(`   ✅ ${area} (${results[area].coverage.toFixed(1)}% coverage)`);
    });
  }

  console.log('\n' + '='.repeat(80));

  return {
    overallCoverage,
    targetAchieved,
    totalTests,
    totalTarget,
    results,
  };
}

// Generate detailed report
function generateDetailedReport() {
  const analysis = analyzeCoverage();

  const reportData = {
    timestamp: new Date().toISOString(),
    analysis,
    recommendation: analysis.targetAchieved
      ? 'Coverage target achieved! Consider Phase 3 implementation for error handling and edge cases.'
      : 'Continue implementing remaining test scenarios to reach 80% coverage target.',
    nextSteps: analysis.targetAchieved
      ? [
          'Implement Phase 3: Error Handling & Edge Cases',
          'Add Phase 4: User Experience & Performance tests',
          'Set up continuous coverage monitoring',
        ]
      : [
          'Complete remaining Phase 1 and Phase 2 tests',
          'Focus on areas with <80% coverage',
          'Validate test scenarios with real backend endpoints',
        ],
  };

  // Save report to file
  const reportPath = path.join(__dirname, 'test-results', 'coverage-analysis.json');
  try {
    const testResultsDir = path.dirname(reportPath);
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
    }
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}\n`);
  } catch (error) {
    console.warn(`Could not save report: ${error.message}`);
  }

  return reportData;
}

// Main execution
if (require.main === module) {
  generateDetailedReport();
}

module.exports = { analyzeCoverage, generateDetailedReport };
