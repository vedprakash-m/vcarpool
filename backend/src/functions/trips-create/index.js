"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
require("reflect-metadata");
const container_1 = require("../../container");
const middleware_1 = require("../../middleware");
const shared_1 = require("@carpool/shared");
const error_handler_1 = require("../../utils/error-handler");
async function tripsCreateHandler(request, context) {
    const logger = container_1.container.resolve("ILogger");
    const tripService = container_1.container.resolve("TripService");
    try {
        const userId = request.auth?.userId;
        if (!userId) {
            throw new Error("User not authenticated.");
        }
        const tripData = request.validated.body;
        const createdTrip = await tripService.createTrip(userId, tripData);
        logger.info("Trip created successfully", {
            userId,
            tripId: createdTrip.id,
        });
        return {
            status: 201,
            jsonBody: {
                success: true,
                message: "Trip created successfully.",
                data: createdTrip,
            },
        };
    }
    catch (error) {
        return (0, error_handler_1.handleError)(error, request);
    }
}
functions_1.app.http("trips-create", {
    methods: ["POST"],
    authLevel: "anonymous", // Handled by middleware
    route: "trips/create",
    handler: (0, middleware_1.compose)(middleware_1.requestId, middleware_1.requestLogging, middleware_1.authenticate, (0, middleware_1.validateBody)(shared_1.createTripSchema))(tripsCreateHandler),
});
