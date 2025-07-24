"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const container_1 = require("../../container");
const error_handler_1 = require("../../utils/error-handler");
const httpTrigger = async function (request, context) {
    const tripService = container_1.container.resolve("TripService");
    const logger = container_1.container
        .resolve("ILogger")
        .child({ requestId: context.invocationId });
    try {
        // For now, using mock authentication until middleware is fixed
        const mockUser = { userId: "user-123", role: "parent" };
        // Parse query parameters manually since middleware isn't working
        const url = new URL(request.url);
        const timeRange = url.searchParams.get("timeRange") || "week";
        const stats = await tripService.getTripStats(mockUser.userId);
        const response = {
            success: true,
            data: stats,
        };
        return {
            status: 200,
            jsonBody: response,
        };
    }
    catch (error) {
        logger.error(`[trips-stats] Error getting trip stats: ${error}`, {
            error,
        });
        return (0, error_handler_1.handleError)(error, request);
    }
};
functions_1.app.http("trips-stats", {
    methods: ["GET"],
    authLevel: "anonymous",
    handler: httpTrigger,
});
