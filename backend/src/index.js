"use strict";
/**
 * Minimal entry point for Azure Functions
 * This file is required by Azure Functions but doesn't need to do anything
 * since we're using individual function files
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
// Empty entry point - functions are loaded individually
console.log("Azure Functions worker started");
// Minimal entry point for Azure Functions
// This file must exist for the Azure Functions runtime to work properly
function default_1() {
    return "Azure Functions Entry Point";
}
