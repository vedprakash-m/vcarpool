import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import "reflect-metadata";
import { container } from "../../container";
import { updateUserSchema, User } from "@carpool/shared";
import {
  compose,
  authenticate,
  validateBody,
  requestId,
  requestLogging,
} from "../../middleware";
import { handleError } from "../../utils/error-handler";
import { ILogger } from "../../utils/logger";
import { UserService } from "../../services/user.service";

async function usersUpdateHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const logger = container.resolve<ILogger>("ILogger");
  const userService = container.resolve<UserService>("UserService");

  try {
    const userId = request.auth?.userId;
    if (!userId) {
      throw new Error("User not authenticated.");
    }

    const updates = request.validated!.body;

    const updatedUser = await userService.updateUser(userId, updates);

    logger.info("User updated profile successfully", { userId });

    return {
      jsonBody: {
        success: true,
        message: "Profile updated successfully.",
        data: updatedUser,
      },
    };
  } catch (error) {
    return handleError(error, request);
  }
}

app.http("users-update", {
  methods: ["PATCH"],
  authLevel: "anonymous", // Handled by middleware
  route: "users/me",
  handler: compose(
    requestId,
    requestLogging,
    authenticate,
    validateBody(updateUserSchema)
  )(usersUpdateHandler),
});
