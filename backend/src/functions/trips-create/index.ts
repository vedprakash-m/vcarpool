import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import "reflect-metadata";
import { container } from "../../container";
import {
  compose,
  authenticate,
  validateBody,
  requestId,
  requestLogging,
} from "../../middleware";
import { createTripSchema, CreateTripRequest, Trip } from "@carpool/shared";
import { createFunctionHandler } from "../../middleware/function-handler";
import { quickOptimize } from "../../middleware/phase2-optimization.middleware";

app.http("trips-create", {
  methods: ["POST"],
  authLevel: "anonymous", // Handled by middleware
  route: "trips/create",
  handler: quickOptimize(
    compose(
      requestId,
      requestLogging,
      authenticate
    )(
      createFunctionHandler<CreateTripRequest, Trip>(
        "CreateTripUseCase",
        createTripSchema
      )
    )
  ),
});
