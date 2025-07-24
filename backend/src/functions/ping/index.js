"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
async function pingHandler(request, context) {
    return {
        status: 200,
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            message: "pong",
            timestamp: new Date().toISOString(),
            method: request.method,
            url: request.url,
        }),
    };
}
functions_1.app.http("ping", {
    methods: ["GET", "POST"],
    authLevel: "anonymous",
    route: "ping",
    handler: pingHandler,
});
