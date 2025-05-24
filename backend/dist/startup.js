"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeApp = initializeApp;
const database_1 = require("./config/database");
const container_1 = require("./container");
const monitoring_1 = require("./utils/monitoring");
/**
 * Initializes the application
 */
async function initializeApp() {
    try {
        // Initialize Application Insights monitoring
        (0, monitoring_1.initializeMonitoring)();
        // Initialize database
        await (0, database_1.initializeDatabase)();
        container_1.container.loggers.system.info('Application initialized successfully');
    }
    catch (error) {
        console.error('Failed to initialize application', error);
        throw error;
    }
}
// Execute initialization on module load
initializeApp().catch(error => {
    console.error('Application initialization failed', error);
});
//# sourceMappingURL=startup.js.map