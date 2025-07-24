import {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
  app,
} from "@azure/functions";
import { container } from "../../container";
import { TripService } from "../../services/trip.service";
import { ILogger } from "../../utils/logger";
import { ApiResponse } from "@carpool/shared";
import { handleError, Errors } from "../../utils/error-handler";

interface HttpRequestUser {
  userId: string;
  role: string;
  familyId?: string;
}

interface AuthenticatedHttpRequest extends Omit<HttpRequest, "user"> {
  user: HttpRequestUser | null;
}

async function tripsDeleteHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const tripService = container.resolve<TripService>("TripService");
    const logger = container
      .resolve<ILogger>("ILogger")
      .child({ requestId: context.invocationId });

    logger.info("[trips-delete] Received request to delete trip.");

    // Extract tripId from route parameters
    const tripId = request.params.tripId;
    if (!tripId) {
      return handleError(Errors.BadRequest("Trip ID is required."), request);
    }

    // For now, we'll skip authentication until middleware is properly set up
    // TODO: Add proper authentication middleware
    const trip = await tripService.getTripById(tripId);

    if (!trip) {
      return handleError(Errors.NotFound("Trip not found."), request);
    }

    await tripService.deleteTrip(tripId);

    const response: ApiResponse<void> = {
      success: true,
      message: "Trip deleted successfully.",
    };

    return {
      status: 200,
      jsonBody: response,
    };
  } catch (error) {
    return handleError(error, request);
  }
}

app.http("trips-delete", {
  methods: ["DELETE"],
  route: "trips/{tripId}",
  authLevel: "anonymous",
  handler: tripsDeleteHandler,
});
