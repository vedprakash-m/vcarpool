"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
async function testHandler(request, context) {
    try {
        return {
            status: 200,
            jsonBody: {
                success: true,
                message: "Test function working",
                timestamp: new Date().toISOString(),
            },
        };
    }
    catch (error) {
        return {
            status: 500,
            jsonBody: {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
        };
    }
}
functions_1.app.http("test-minimal", {
    methods: ["GET", "POST"],
    authLevel: "anonymous",
    route: "test/minimal",
    handler: testHandler,
});
