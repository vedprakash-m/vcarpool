"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const shared_1 = require("@carpool/shared");
const container_1 = require("../../container");
const middleware_1 = require("../../middleware");
const monitoring_1 = require("../../utils/monitoring");
async function getTripHandler(request, context) {
    const logger = container_1.container.loggers.trip;
    // Set context for the logger
    if ("setContext" in logger) {
        logger.setContext(context);
    }
    const userId = request.auth?.userId;
    const tripId = request.validated?.params?.tripId;
    logger.info("Processing get trip request", { userId, tripId });
    try {
        // Get trip with performance tracking
        const trip = await (0, monitoring_1.trackExecutionTime)("getTripById", () => container_1.container.tripService.getTripById(tripId || ""), "TripService");
        if (!trip) {
            logger.warn("Trip not found", { tripId });
            return {
                status: 404,
                jsonBody: {
                    success: false,
                    error: "Trip not found",
                },
            };
        }
        // Note: No access control here - users can view any trip
        // This allows passengers to see trip details and potential passengers to view available trips
        logger.info("Trip retrieved successfully", { tripId, userId });
        return {
            status: 200,
            jsonBody: {
                success: true,
                data: trip,
                message: "Trip retrieved successfully",
            },
        };
    }
    catch (error) {
        logger.error("Error getting trip", {
            error: error.message,
            tripId,
            userId,
        });
        return {
            status: 500,
            jsonBody: {
                success: false,
                error: "An error occurred while retrieving the trip",
            },
        };
    }
}
// Custom middleware to extract tripId from URL path
function extractTripId() {
    return async (request, context) => {
        try {
            // Extract tripId from URL path - assuming URL is like /trips/{tripId}
            const url = new URL(request.url);
            const pathSegments = url.pathname.split("/");
            const tripIdIndex = pathSegments.findIndex((segment) => segment === "trips") + 1;
            if (tripIdIndex >= pathSegments.length) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        error: "Trip ID is required",
                    },
                };
            }
            const tripId = pathSegments[tripIdIndex];
            // Validate using the schema
            const result = shared_1.tripIdParamSchema.safeParse({ tripId });
            if (!result.success) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        error: "Invalid trip ID format",
                    },
                };
            }
            // Add validated params to request
            request.validated = { ...request.validated, params: result.data };
        }
        catch (error) {
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: "Invalid request URL",
                },
            };
        }
    };
}
functions_1.app.http("trips-get", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "trips/{tripId}",
    handler: (0, middleware_1.compose)(middleware_1.authenticate, extractTripId())(getTripHandler),
});
