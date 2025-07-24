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
        console.log("Starting application initialization...");
        // Initialize Application Insights monitoring (non-critical)
        try {
            (0, monitoring_1.initializeMonitoring)();
            console.log("Application Insights initialized");
        }
        catch (error) {
            console.warn("Failed to initialize Application Insights:", error);
            // Continue without monitoring
        }
        // Initialize database (non-critical for startup)
        try {
            await (0, database_1.initializeDatabase)();
            console.log("Database initialized successfully");
            container_1.container.loggers.system.info("Application initialized successfully");
        }
        catch (error) {
            console.warn("Failed to initialize database during startup (will retry on first use):", error);
            // Don't throw error, allow functions to attempt connection on first use
        }
        console.log("Application startup completed");
    }
    catch (error) {
        console.error("Failed to initialize application", error);
        // Don't rethrow - allow functions to start even if initialization fails
    }
}
// Execute initialization on module load but don't crash if it fails
initializeApp().catch((error) => {
    console.error("Application initialization failed, but continuing:", error);
});
