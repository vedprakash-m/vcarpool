"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const container_1 = require("../../container");
const error_handler_1 = require("../../utils/error-handler");
async function tripsJoinHandler(request, context) {
    try {
        const tripService = container_1.container.resolve("TripService");
        const logger = container_1.container
            .resolve("ILogger")
            .child({ requestId: context.invocationId });
        logger.info("[trips-join] Received request to join trip.");
        const req = request;
        // For now, skip authentication until middleware is properly set up
        // TODO: Add proper authentication middleware
        const tripId = request.params.tripId;
        if (!tripId) {
            return (0, error_handler_1.handleError)(error_handler_1.Errors.BadRequest("Trip ID is required."), request);
        }
        // Get pickup location from body
        const body = (await request.json());
        const pickupLocation = body?.pickupLocation;
        if (!pickupLocation) {
            return (0, error_handler_1.handleError)(error_handler_1.Errors.BadRequest("Pickup location is required."), request);
        }
        // Mock user ID for now until auth is set up
        const userId = "mock-user-id";
        const updatedTrip = await tripService.joinTrip(tripId, userId, pickupLocation);
        const response = {
            success: true,
            message: "Successfully joined trip.",
            data: updatedTrip || undefined,
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
functions_1.app.http("trips-join", {
    methods: ["POST"],
    route: "trips/{tripId}/join",
    authLevel: "anonymous",
    handler: tripsJoinHandler,
});
