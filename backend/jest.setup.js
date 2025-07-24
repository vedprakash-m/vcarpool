try {
  require('reflect-metadata');
} catch (error) {
  // In CI/CD environments, reflect-metadata might not be available
  // This is OK for most tests as they don't require reflection
  console.warn('reflect-metadata not found, skipping...');
}
