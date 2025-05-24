import { initializeDatabase } from './config/database';
import { container } from './container';
import { initializeMonitoring } from './utils/monitoring';

/**
 * Initializes the application
 */
export async function initializeApp(): Promise<void> {
  try {
    // Initialize Application Insights monitoring
    initializeMonitoring();
    
    // Initialize database
    await initializeDatabase();
    
    container.loggers.system.info('Application initialized successfully');
  } catch (error) {
    console.error('Failed to initialize application', error);
    throw error;
  }
}

// Execute initialization on module load
initializeApp().catch(error => {
  console.error('Application initialization failed', error);
});
