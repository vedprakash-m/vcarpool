import { initializeDatabase } from './config/database';
import { container } from './container';
import { initializeMonitoring } from './utils/monitoring';
import { initializeTelemetry } from './utils/telemetry';

/**
 * Initializes the application
 */
export async function initializeApp(): Promise<void> {
  try {
    console.log('Starting application initialization...');

    // Initialize Application Insights monitoring (non-critical)
    try {
      initializeMonitoring();
      initializeTelemetry();
      console.log('Application Insights initialized');
    } catch (error) {
      console.warn('Failed to initialize Application Insights:', error);
      // Continue without monitoring
    }

    // Initialize database (non-critical for startup)
    try {
      await initializeDatabase();
      console.log('Database initialized successfully');
      container.loggers.system.info('Application initialized successfully');
    } catch (error) {
      console.warn(
        'Failed to initialize database during startup (will retry on first use):',
        error,
      );
      // Don't throw error, allow functions to attempt connection on first use
    }

    console.log('Application startup completed');
  } catch (error) {
    console.error('Failed to initialize application', error);
    // Don't rethrow - allow functions to start even if initialization fails
  }
}

// Execute initialization on module load but don't crash if it fails
initializeApp().catch((error) => {
  console.error('Application initialization failed, but continuing:', error);
});
