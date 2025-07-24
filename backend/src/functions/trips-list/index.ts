import {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
  app,
} from "@azure/functions";
import { container } from "../../container";
import { TripService } from "../../services/trip.service";
import { ILogger } from "../../utils/logger";
import {
  ApiResponse,
  PaginatedResponse,
  Trip,
  TripStatus,
} from "@carpool/shared";
import { handleError } from "../../utils/error-handler";
import { quickOptimize } from "../../middleware/phase2-optimization.middleware";

async function tripsListHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const tripService = container.resolve<TripService>("TripService");
    const logger = container
      .resolve<ILogger>("ILogger")
      .child({ requestId: context.invocationId });

    logger.info("[trips-list] Received request to list trips.");

    // Parse query parameters
    const url = new URL(request.url);
    const statusParam = url.searchParams.get("status");

    const query = {
      page: parseInt(url.searchParams.get("page") || "1"),
      limit: parseInt(url.searchParams.get("limit") || "10"),
      status:
        statusParam &&
        ["planned", "active", "completed", "cancelled"].includes(statusParam)
          ? (statusParam as TripStatus)
          : undefined,
      driverId: url.searchParams.get("driverId") || undefined,
      date: url.searchParams.get("date") || undefined,
    };

    const { trips, total } = await tripService.getTrips(query);

    const response: PaginatedResponse<Trip> = {
      success: true,
      data: trips,
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };

    return {
      status: 200,
      jsonBody: response,
    };
  } catch (error) {
    const logger = container
      .resolve<ILogger>("ILogger")
      .child({ requestId: context.invocationId });
    logger.error(`[trips-list] Error listing trips: ${error}`, { error });
    return handleError(error, request);
  }
}

app.http("trips-list", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "trips",
  handler: quickOptimize(tripsListHandler),
});
