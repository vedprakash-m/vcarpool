/**
 * Health Check Script for E2E Test Environment
 * Validates that all services are running and accessible before running tests
 */

const axios = require('axios');
const { MongoClient } = require('mongodb');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:7072';
const MONGODB_URL =
  process.env.MONGODB_URL ||
  'mongodb://testuser:testpass@localhost:27018/carpool_test?authSource=admin';

async function healthCheck() {
  console.log('🏥 Starting health check...');

  const checks = [checkFrontend, checkBackend, checkDatabase, checkBackendAPI];

  const results = [];

  for (const check of checks) {
    try {
      const result = await check();
      results.push(result);
      console.log(`  ✅ ${result.name}: ${result.status}`);
    } catch (error) {
      const result = {
        name: check.name || 'Unknown',
        status: 'FAILED',
        error: error.message,
      };
      results.push(result);
      console.log(`  ❌ ${result.name}: ${result.status} - ${result.error}`);
    }
  }

  const failedChecks = results.filter((r) => r.status === 'FAILED');

  if (failedChecks.length > 0) {
    console.log('\n💥 Health check failed:');
    failedChecks.forEach((check) => {
      console.log(`  - ${check.name}: ${check.error}`);
    });

    console.log('\n🔧 Troubleshooting tips:');
    console.log(
      '  1. Ensure Docker services are running: docker-compose -f docker-compose.e2e.yml up -d',
    );
    console.log('  2. Check service logs: docker-compose -f docker-compose.e2e.yml logs');
    console.log('  3. Verify port availability: netstat -an | grep -E "3001|7072|27018"');
    console.log(
      '  4. Restart services if needed: docker-compose -f docker-compose.e2e.yml restart',
    );

    throw new Error(`${failedChecks.length} health checks failed`);
  }

  console.log('\n✅ All health checks passed! Environment is ready for E2E tests.');
  return results;
}

async function checkFrontend() {
  const response = await axios.get(FRONTEND_URL, {
    timeout: 10000,
    validateStatus: () => true, // Accept any status code
  });

  if (response.status === 200) {
    return {
      name: 'Frontend Service',
      status: 'HEALTHY',
      url: FRONTEND_URL,
      responseTime: response.headers['x-response-time'] || 'N/A',
    };
  } else {
    throw new Error(`Frontend returned status ${response.status}`);
  }
}

async function checkBackend() {
  const healthUrl = `${BACKEND_URL}/api/health`;

  try {
    const response = await axios.get(healthUrl, {
      timeout: 10000,
    });

    return {
      name: 'Backend Service',
      status: 'HEALTHY',
      url: healthUrl,
      version: response.data.version || 'N/A',
      uptime: response.data.uptime || 'N/A',
    };
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Backend service is not running or not accessible');
    } else if (error.response?.status === 404) {
      // Try alternative health endpoint
      const response = await axios.get(BACKEND_URL, { timeout: 5000 });
      return {
        name: 'Backend Service',
        status: 'HEALTHY (no health endpoint)',
        url: BACKEND_URL,
      };
    } else {
      throw error;
    }
  }
}

async function checkDatabase() {
  const client = new MongoClient(MONGODB_URL);

  try {
    await client.connect();

    // Perform a simple operation
    const db = client.db('carpool_test');
    await db.admin().ping();

    const collections = await db.listCollections().toArray();

    return {
      name: 'MongoDB Database',
      status: 'HEALTHY',
      url: MONGODB_URL.replace(/\/\/.*@/, '//***:***@'), // Hide credentials
      collections: collections.length,
    };
  } finally {
    await client.close();
  }
}

async function checkBackendAPI() {
  const apiUrls = ['/api/auth/health', '/api/users/health', '/api/trips/health'];

  const apiResults = [];

  for (const endpoint of apiUrls) {
    try {
      const response = await axios.get(`${BACKEND_URL}${endpoint}`, {
        timeout: 5000,
        validateStatus: (status) => status < 500, // Accept 4xx as valid (may require auth)
      });

      apiResults.push({
        endpoint,
        status: response.status,
        working: true,
      });
    } catch (error) {
      apiResults.push({
        endpoint,
        status: error.response?.status || 'ERROR',
        working: false,
        error: error.message,
      });
    }
  }

  const workingApis = apiResults.filter((r) => r.working);

  return {
    name: 'Backend API Endpoints',
    status: workingApis.length > 0 ? 'HEALTHY' : 'PARTIAL',
    workingEndpoints: workingApis.length,
    totalEndpoints: apiResults.length,
    details: apiResults,
  };
}

async function waitForServices(timeout = 60000) {
  console.log(`⏳ Waiting for services to be ready (timeout: ${timeout}ms)...`);

  const startTime = Date.now();
  let lastError = null;

  while (Date.now() - startTime < timeout) {
    try {
      await healthCheck();
      console.log('✅ All services are ready!');
      return true;
    } catch (error) {
      lastError = error;
      console.log('⏳ Services not ready yet, retrying in 5 seconds...');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  throw new Error(
    `Services did not become ready within ${timeout}ms. Last error: ${lastError?.message}`,
  );
}

// Run health check if called directly
if (require.main === module) {
  healthCheck()
    .then(() => {
      console.log('🎉 Health check completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Health check failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  healthCheck,
  waitForServices,
  checkFrontend,
  checkBackend,
  checkDatabase,
  checkBackendAPI,
};
