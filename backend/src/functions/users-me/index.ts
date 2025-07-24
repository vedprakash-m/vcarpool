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
  requestId,
  requestLogging,
} from "../../middleware";
import { handleError } from "../../utils/error-handler";
import { ILogger } from "../../utils/logger";
import { UserService } from "../../services/user.service";

async function usersMeHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const logger = container.resolve<ILogger>("ILogger");
  const userService = container.resolve<UserService>("UserService");

  try {
    const userId = request.auth?.userId;
    if (!userId) {
      // This should technically be caught by the authenticate middleware,
      // but it's good practice to check.
      throw new Error("User not authenticated.");
    }

    const user = await userService.getUserById(userId);

    if (!user) {
      throw new Error("Authenticated user not found.");
    }

    logger.info("Fetched current user profile successfully", { userId });

    return {
      jsonBody: {
        success: true,
        message: "User profile fetched successfully.",
        data: user,
      },
    };
  } catch (error) {
    return handleError(error, request);
  }
}

app.http("users-me", {
  methods: ["GET"],
  authLevel: "anonymous", // Handled by middleware
  route: "users/me",
  handler: compose(requestId, requestLogging, authenticate)(usersMeHandler),
});
