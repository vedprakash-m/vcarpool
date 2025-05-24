import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ApiResponse, Trip, UpdateTripRequest, updateTripSchema } from '@vcarpool/shared';
import { TripService } from '../../services/trip.service';
import { compose, cors, errorHandler, authenticate, validateBody, AuthenticatedRequest } from '../../middleware';

async function updateTripHandler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const userId = request.user!.userId;
  
  // Extract tripId from URL path
  const urlParts = request.url.split('/');
  const tripId = urlParts[urlParts.length - 1];
  
  // Parse request body
  const bodyText = await request.text();
  const updates = JSON.parse(bodyText) as UpdateTripRequest;

  // Check if trip exists and user is the driver
  const existingTrip = await TripService.getTripById(tripId);
  if (!existingTrip) {
    return {
      status: 404,
      jsonBody: {
        success: false,
        error: 'Trip not found'
      } as ApiResponse
    };
  }

  if (existingTrip.driverId !== userId) {
    return {
      status: 403,
      jsonBody: {
        success: false,
        error: 'Only the trip driver can update the trip'
      } as ApiResponse
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
        } as ApiResponse
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
      } as ApiResponse
    };
  }

  const updatedTrip = await TripService.updateTrip(tripId, updates);

  return {
    status: 200,
    jsonBody: {
      success: true,
      data: updatedTrip,
      message: 'Trip updated successfully'
    } as ApiResponse<Trip>
  };
}

app.http('trips-update', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'trips/{tripId}',
  handler: compose(
    cors,
    errorHandler,
    authenticate,
    validateBody(updateTripSchema)
  )(updateTripHandler)
});
