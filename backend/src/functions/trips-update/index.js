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
        const mockUser = { userId: "user-123", role: "admin" };
        // Parse the tripId from URL path
        const url = new URL(request.url);
        const pathParts = url.pathname.split("/");
        const tripId = pathParts[pathParts.length - 1]; // Last part of path should be tripId
        // Parse update data from request body
        const updateData = (await request.json()); // TODO: Add proper validation
        const trip = await tripService.getTripById(tripId);
        if (!trip) {
            return (0, error_handler_1.handleError)(error_handler_1.Errors.NotFound("Trip not found."), request);
        }
        // User must be the trip driver or an admin to update the trip
        if (trip.driverId !== mockUser.userId && mockUser.role !== "admin") {
            return (0, error_handler_1.handleError)(error_handler_1.Errors.Forbidden("You are not authorized to update this trip."), request);
        }
        const updatedTrip = await tripService.updateTrip(tripId, updateData);
        const response = {
            success: true,
            message: "Trip updated successfully.",
            data: updatedTrip || undefined,
        };
        return {
            status: 200,
            jsonBody: response,
        };
    }
    catch (error) {
        logger.error(`[trips-update] Error updating trip: ${error}`, { error });
        return (0, error_handler_1.handleError)(error, request);
    }
};
functions_1.app.http("trips-update", {
    methods: ["PUT", "PATCH"],
    authLevel: "anonymous",
    handler: httpTrigger,
});
