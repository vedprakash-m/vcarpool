import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { container } from "../../container";
import { TripService } from "../../services/trip.service";
import { ILogger } from "../../utils/logger";
import { ApiResponse, TripStats, tripStatsQuerySchema } from "@carpool/shared";
import {
  authenticate,
  validateQuery,
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
    query: any;
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
    const mockUser = { userId: "user-123", role: "parent" };

    // Parse query parameters manually since middleware isn't working
    const url = new URL(request.url);
    const timeRange = url.searchParams.get("timeRange") || "week";

    const stats = await tripService.getTripStats(mockUser.userId);

    const response: ApiResponse<TripStats> = {
      success: true,
      data: stats,
    };

    return {
      status: 200,
      jsonBody: response,
    };
  } catch (error) {
    logger.error(`[trips-stats] Error getting trip stats: ${error}`, {
      error,
    });
    return handleError(error, request);
  }
};

app.http("trips-stats", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: httpTrigger,
});
