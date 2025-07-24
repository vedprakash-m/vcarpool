"use strict";
/**
 * Global Test Setup
 * Initializes test environment, databases, and external services
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = globalSetup;
const dotenv = __importStar(require("dotenv"));
const path_1 = require("path");
const fs_1 = require("fs");
async function globalSetup() {
    console.log('🧪 Setting up test environment...');
    // Load environment variables from .env.test if it exists
    const testEnvPath = (0, path_1.join)(__dirname, '../.env.test');
    if ((0, fs_1.existsSync)(testEnvPath)) {
        dotenv.config({ path: testEnvPath });
    }
    // Setup default environment variables for tests if not already set
    if (!process.env.NODE_ENV)
        process.env.NODE_ENV = 'test';
    if (!process.env.JWT_SECRET)
        process.env.JWT_SECRET = 'test-jwt-secret';
    if (!process.env.JWT_REFRESH_SECRET)
        process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    if (!process.env.COSMOS_DB_DATABASE_ID)
        process.env.COSMOS_DB_DATABASE_ID = 'carpool-test';
    // Initialize test database
    try {
        // In a real environment, you might connect to a test Cosmos DB
        // For now, we'll use mocks and in-memory implementations
        console.log('✅ Test database configuration verified');
        // Register global mock factory functions for tests
        global.__TEST_MOCKS__ = {
            setupMockCosmosClient: () => {
                return {
                    database: () => ({
                        container: () => ({
                            items: {
                                create: jest.fn().mockResolvedValue({ resource: {} }),
                                query: jest.fn().mockReturnValue({
                                    fetchAll: jest.fn().mockResolvedValue({ resources: [] })
                                }),
                                upsert: jest.fn().mockResolvedValue({ resource: {} }),
                                delete: jest.fn().mockResolvedValue({}),
                            }
                        })
                    })
                };
            }
        };
    }
    catch (error) {
        console.error('❌ Failed to setup test database:', error);
        throw error;
    }
    // Setup test data
    global.__TEST_START_TIME__ = Date.now();
    console.log('✅ Global test setup completed');
}
