"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const shared_1 = require("@vcarpool/shared");
const trip_service_1 = require("../../services/trip.service");
const middleware_1 = require("../../middleware");
async function updateTripHandler(request, context) {
    const userId = request.user.userId;
    // Extract tripId from URL path
    const urlParts = request.url.split('/');
    const tripId = urlParts[urlParts.length - 1];
    // Parse request body
    const bodyText = await request.text();
    const updates = JSON.parse(bodyText);
    // Check if trip exists and user is the driver
    const existingTrip = await trip_service_1.TripService.getTripById(tripId);
    if (!existingTrip) {
        return {
            status: 404,
            jsonBody: {
                success: false,
                error: 'Trip not found'
            }
        };
    }
    if (existingTrip.driverId !== userId) {
        return {
            status: 403,
            jsonBody: {
                success: false,
                error: 'Only the trip driver can update the trip'
            }
        };
    }
    // Validate time constraints if both times are being updated
    if (updates.departureTime && updates.arrivalTime) {
        const [depHour, depMin] = updates.departureTime.split(':').map(Number);
        const [arrHour, arrMin] = updates.arrivalTime.split(':').map(Number);
        const depTimeMinutes = depHour * 60 + depMin;
        const arrTimeMinutes = arrHour * 60 + arrMin;
        if (depTimeMinutes >= arrTimeMinutes) {
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: 'Departure time must be before arrival time'
                }
            };
        }
    }
    // Don't allow updates to completed or cancelled trips
    if (existingTrip.status === 'completed' || existingTrip.status === 'cancelled') {
        return {
            status: 400,
            jsonBody: {
                success: false,
                error: 'Cannot update completed or cancelled trips'
            }
        };
    }
    const updatedTrip = await trip_service_1.TripService.updateTrip(tripId, updates);
    return {
        status: 200,
        jsonBody: {
            success: true,
            data: updatedTrip,
            message: 'Trip updated successfully'
        }
    };
}
functions_1.app.http('trips-update', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'trips/{tripId}',
    handler: (0, middleware_1.compose)(middleware_1.cors, middleware_1.errorHandler, middleware_1.authenticate, (0, middleware_1.validateBody)(shared_1.updateTripSchema))(updateTripHandler)
});
//# sourceMappingURL=index.js.map