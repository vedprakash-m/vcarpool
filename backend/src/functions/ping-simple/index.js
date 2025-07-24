"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
async function default_1(context, req) {
    context.log("HTTP trigger function processed a request.");
    const responseMessage = {
        message: "Hello from Azure Functions!",
        timestamp: new Date().toISOString(),
        method: req.method || "unknown",
        query: req.query || {},
    };
    context.res = {
        status: 200,
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(responseMessage),
    };
}
