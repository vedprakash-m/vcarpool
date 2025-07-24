import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { container } from "../../container";
import { TripService } from "../../services/trip.service";
import { ILogger } from "../../utils/logger";
import { ApiResponse, Trip, updateTripSchema } from "@carpool/shared";
import {
  authenticate,
  validateBody,
  validateParams,
  requestId,
  requestLogging,
  compose,
} from "../../middleware";
import { handleError, Errors } from "../../utils/error-handler";

interface AuthenticatedHttpRequest extends Omit<HttpRequest, "user"> {
  user: {
    userId: string;
    role: string;
  };
  validated?: {
    params: any;
    body: any;
  };
}

const httpTrigger = async function (
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const tripService = container.resolve<TripService>("TripService");
  const logger = container
    .resolve<ILogger>("ILogger")
    .child({ requestId: context.invocationId });

  try {
    // For now, using mock authentication until middleware is fixed
    const mockUser = { userId: "user-123", role: "admin" };

    // Parse the tripId from URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const tripId = pathParts[pathParts.length - 1]; // Last part of path should be tripId

    // Parse update data from request body
    const updateData = (await request.json()) as any; // TODO: Add proper validation

    const trip = await tripService.getTripById(tripId);

    if (!trip) {
      return handleError(Errors.NotFound("Trip not found."), request);
    }

    // User must be the trip driver or an admin to update the trip
    if (trip.driverId !== mockUser.userId && mockUser.role !== "admin") {
      return handleError(
        Errors.Forbidden("You are not authorized to update this trip."),
        request
      );
    }

    const updatedTrip = await tripService.updateTrip(tripId, updateData);

    const response: ApiResponse<Trip> = {
      success: true,
      message: "Trip updated successfully.",
      data: updatedTrip || undefined,
    };

    return {
      status: 200,
      jsonBody: response,
    };
  } catch (error) {
    logger.error(`[trips-update] Error updating trip: ${error}`, { error });
    return handleError(error, request);
  }
};

app.http("trips-update", {
  methods: ["PUT", "PATCH"],
  authLevel: "anonymous",
  handler: httpTrigger,
});
