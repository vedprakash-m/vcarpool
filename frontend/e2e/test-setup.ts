// Setup file for E2E tests
import fs from 'fs';
import path from 'path';

/**
 * Ensure test directories exist for storing artifacts
 */
export function setupTestDirectories() {
  const dirs = [
    path.join(__dirname, 'test-results'),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

// Auto-run setup when imported
setupTestDirectories();
