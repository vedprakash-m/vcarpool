"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupTestDirectories = setupTestDirectories;
// Setup file for E2E tests
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Ensure test directories exist for storing artifacts
 */
function setupTestDirectories() {
    const dirs = [
        path_1.default.join(__dirname, 'test-results'),
    ];
    for (const dir of dirs) {
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
    }
}
// Auto-run setup when imported
setupTestDirectories();
