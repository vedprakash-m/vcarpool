"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const container_1 = require("../../container");
const error_handler_1 = require("../../utils/error-handler");
async function tripsLeaveHandler(request, context) {
    try {
        const tripService = container_1.container.resolve("TripService");
        const logger = container_1.container
            .resolve("ILogger")
            .child({ requestId: context.invocationId });
        logger.info("[trips-leave] Received request to leave trip.");
        // Get tripId from URL path
        const url = new URL(request.url);
        const pathParts = url.pathname.split("/");
        const tripId = pathParts[pathParts.length - 2]; // Assuming pattern like /trips/{id}/leave
        if (!tripId) {
            return (0, error_handler_1.handleError)(error_handler_1.Errors.BadRequest("Trip ID is required."), request);
        }
        // TODO: Implement authentication middleware
        // For now, we'll use a mock user
        const mockUserId = "mock-user-id"; // This should come from authentication
        const updatedTrip = await tripService.leaveTrip(tripId, mockUserId);
        if (!updatedTrip) {
            return (0, error_handler_1.handleError)(error_handler_1.Errors.NotFound("Trip not found or user was not in trip."), request);
        }
        const response = {
            success: true,
            message: "Successfully left trip.",
            data: updatedTrip,
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
        logger.error(`[trips-leave] Error leaving trip: ${error}`, { error });
        return (0, error_handler_1.handleError)(error, request);
    }
}
functions_1.app.http("trips-leave", {
    methods: ["DELETE"],
    authLevel: "anonymous",
    route: "trips/{tripId}/leave",
    handler: tripsLeaveHandler,
});
