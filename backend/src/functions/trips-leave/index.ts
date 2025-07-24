import {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
  app,
} from "@azure/functions";
import { container } from "../../container";
import { tripIdParamSchema, Trip } from "@carpool/shared";
import {
  compose,
  requestId,
  requestLogging,
  authenticate,
  validateParams,
} from "../../middleware";
import { handleError, Errors } from "../../utils/error-handler";
import { TripPassengerUseCase } from "../../core/trips/usecases/TripPassengerUseCase";
import { quickOptimize } from "../../middleware/phase2-optimization.middleware";

function createLeaveTripHandler() {
  return async (
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit> => {
    const passengerUseCase =
      container.resolve<TripPassengerUseCase>("TripPassengerUseCase");

    const tripId = request.validated!.params.tripId as string;
    const userId = request.auth!.userId;

    const updatedTrip: Trip | null = await passengerUseCase.leaveTrip(
      tripId,
      userId
    );

    if (!updatedTrip) {
      return handleError(Errors.NotFound("Trip not found."), request);
    }

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: "Successfully left trip.",
        data: updatedTrip,
      },
    };
  };
}

app.http("trips-leave", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "trips/{tripId}/leave",
  handler: quickOptimize(
    compose(
      requestId,
      requestLogging,
      authenticate,
      validateParams(tripIdParamSchema)
    )(createLeaveTripHandler())
  ),
});
