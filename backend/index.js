"use strict";
/**
 * Main entry point for Azure Functions v4
 * This file imports all function modules to ensure they are registered
 */
Object.defineProperty(exports, "__esModule", { value: true });
// Import all functions to register them with the Azure Functions runtime
require("./functions/health");
require("./functions/auth-login");
require("./functions/auth-register");
require("./functions/auth-refresh-token");
require("./functions/trips-stats");
require("./functions/trips-list");
require("./functions/trips-create");
require("./functions/users-me");
// Initialize the application
require("./startup");
//# sourceMappingURL=index.js.map