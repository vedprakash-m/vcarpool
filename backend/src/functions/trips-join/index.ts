import {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
  app,
} from "@azure/functions";
import { container } from "../../container";
import {
  tripIdParamSchema,
  joinTripParamSchema,
  JoinTripRequest,
} from "@carpool/shared";
import {
  compose,
  requestId,
  requestLogging,
  authenticate,
  validateBody,
  validateParams,
} from "../../middleware";
import { quickOptimize } from "../../middleware/phase2-optimization.middleware";

function createJoinTripHandler() {
  return async (
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit> => {
    const passengerUseCase = container.resolve("TripPassengerUseCase") as any;

    const tripId = request.validated!.params.tripId as string;
    const { pickupLocation } = request.validated!.body as JoinTripRequest;
    const userId = request.auth!.userId;

    const updatedTrip = await passengerUseCase.joinTrip(
      tripId,
      userId,
      pickupLocation
    );

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: "Successfully joined trip.",
        data: updatedTrip,
      },
    };
  };
}

app.http("trips-join", {
  methods: ["POST"],
  route: "trips/{tripId}/join",
  authLevel: "anonymous",
  handler: quickOptimize(
    compose(
      requestId,
      requestLogging,
      authenticate,
      validateParams(tripIdParamSchema),
      validateBody(joinTripParamSchema)
    )(createJoinTripHandler())
  ),
});
