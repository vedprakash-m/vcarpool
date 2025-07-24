"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const container_1 = require("../../container");
const error_handler_1 = require("../../utils/error-handler");
async function tripsListHandler(request, context) {
    try {
        const tripService = container_1.container.resolve("TripService");
        const logger = container_1.container
            .resolve("ILogger")
            .child({ requestId: context.invocationId });
        logger.info("[trips-list] Received request to list trips.");
        // Parse query parameters
        const url = new URL(request.url);
        const statusParam = url.searchParams.get("status");
        const query = {
            page: parseInt(url.searchParams.get("page") || "1"),
            limit: parseInt(url.searchParams.get("limit") || "10"),
            status: statusParam &&
                ["planned", "active", "completed", "cancelled"].includes(statusParam)
                ? statusParam
                : undefined,
            driverId: url.searchParams.get("driverId") || undefined,
            date: url.searchParams.get("date") || undefined,
        };
        const { trips, total } = await tripService.getTrips(query);
        const response = {
            success: true,
            data: trips,
            pagination: {
                total,
                page: query.page,
                limit: query.limit,
                totalPages: Math.ceil(total / query.limit),
            },
        };
        return {
            status: 200,
            jsonBody: response,
        };
    }
    catch (error) {
        const logger = container_1.container
            .resolve("ILogger")
            .child({ requestId: context.invocationId });
        logger.error(`[trips-list] Error listing trips: ${error}`, { error });
        return (0, error_handler_1.handleError)(error, request);
    }
}
functions_1.app.http("trips-list", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "trips",
    handler: tripsListHandler,
});
