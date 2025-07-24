"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const container_1 = require("../../container");
const error_handler_1 = require("../../utils/error-handler");
async function tripsDeleteHandler(request, context) {
    try {
        const tripService = container_1.container.resolve("TripService");
        const logger = container_1.container
            .resolve("ILogger")
            .child({ requestId: context.invocationId });
        logger.info("[trips-delete] Received request to delete trip.");
        // Extract tripId from route parameters
        const tripId = request.params.tripId;
        if (!tripId) {
            return (0, error_handler_1.handleError)(error_handler_1.Errors.BadRequest("Trip ID is required."), request);
        }
        // For now, we'll skip authentication until middleware is properly set up
        // TODO: Add proper authentication middleware
        const trip = await tripService.getTripById(tripId);
        if (!trip) {
            return (0, error_handler_1.handleError)(error_handler_1.Errors.NotFound("Trip not found."), request);
        }
        await tripService.deleteTrip(tripId);
        const response = {
            success: true,
            message: "Trip deleted successfully.",
        };
        return {
            status: 200,
            jsonBody: response,
        };
    }
    catch (error) {
        return (0, error_handler_1.handleError)(error, request);
    }
}
functions_1.app.http("trips-delete", {
    methods: ["DELETE"],
    route: "trips/{tripId}",
    authLevel: "anonymous",
    handler: tripsDeleteHandler,
});
