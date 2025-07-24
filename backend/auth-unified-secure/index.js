/**
 * Unified Secure Authentication Function
 * Handles login, registration, token verification, and password changes
 */

const { app } = require("@azure/functions");
const secureAuthService =
  require("../src/services/secure-auth.service").default;
const configService = require("../src/services/config.service").default;

// CORS configuration
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

// Response helper
function createResponse(statusCode, body, additionalHeaders = {}) {
  return {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...additionalHeaders,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  };
}

// Input validation
function validateLoginInput(body) {
  const errors = [];

  if (!body.email || typeof body.email !== "string") {
    errors.push("Email is required");
  }

  if (!body.password || typeof body.password !== "string") {
    errors.push("Password is required");
  }

  return errors;
}

function validateRegistrationInput(body) {
  const errors = [];

  if (!body.email || typeof body.email !== "string") {
    errors.push("Email is required");
  }

  if (!body.password || typeof body.password !== "string") {
    errors.push("Password is required");
  }

  if (!body.firstName || typeof body.firstName !== "string") {
    errors.push("First name is required");
  }

  if (!body.lastName || typeof body.lastName !== "string") {
    errors.push("Last name is required");
  }

  if (!body.role || !["parent", "student"].includes(body.role)) {
    errors.push('Role must be either "parent" or "student"');
  }

  return errors;
}

app.http("auth-unified-secure", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    context.log("Unified secure auth request:", request.method, request.url);

    try {
      // Handle preflight CORS request
      if (request.method === "OPTIONS") {
        return createResponse(200, "");
      }

      const url = new URL(request.url);
      const action = url.searchParams.get("action") || "status";

      // Handle GET requests (status, health check)
      if (request.method === "GET") {
        switch (action) {
          case "status":
            const status = await secureAuthService.getServiceStatus();
            return createResponse(200, {
              success: true,
              data: status,
              timestamp: new Date().toISOString(),
            });

          case "health":
            return createResponse(200, {
              success: true,
              message: "Authentication service is healthy",
              timestamp: new Date().toISOString(),
            });

          default:
            return createResponse(400, {
              success: false,
              message: "Invalid action for GET request",
            });
        }
      }

      // Handle POST requests (login, register, verify, change-password)
      if (request.method === "POST") {
        let body;
        try {
          const rawBody = await request.text();
          body = rawBody ? JSON.parse(rawBody) : {};
        } catch (error) {
          return createResponse(400, {
            success: false,
            message: "Invalid JSON in request body",
          });
        }

        switch (action) {
          case "login":
            const loginErrors = validateLoginInput(body);
            if (loginErrors.length > 0) {
              return createResponse(400, {
                success: false,
                message: "Validation failed",
                errors: loginErrors,
              });
            }

            const loginResult = await secureAuthService.authenticate({
              email: body.email,
              password: body.password,
            });

            return createResponse(loginResult.success ? 200 : 401, loginResult);

          case "register":
            const registerErrors = validateRegistrationInput(body);
            if (registerErrors.length > 0) {
              return createResponse(400, {
                success: false,
                message: "Validation failed",
                errors: registerErrors,
              });
            }

            const registerResult = await secureAuthService.register({
              email: body.email,
              password: body.password,
              firstName: body.firstName,
              lastName: body.lastName,
              role: body.role,
              phoneNumber: body.phoneNumber,
              address: body.address,
            });

            return createResponse(
              registerResult.success ? 201 : 400,
              registerResult
            );

          case "verify":
            const token =
              body.token ||
              request.headers.get("authorization")?.replace("Bearer ", "");
            if (!token) {
              return createResponse(400, {
                success: false,
                message: "Token is required",
              });
            }

            const verifyResult = await secureAuthService.verifyToken(token);
            return createResponse(verifyResult.valid ? 200 : 401, {
              success: verifyResult.valid,
              user: verifyResult.user,
              message: verifyResult.message,
            });

          case "change-password":
            const changePasswordToken =
              body.token ||
              request.headers.get("authorization")?.replace("Bearer ", "");
            if (!changePasswordToken) {
              return createResponse(401, {
                success: false,
                message: "Authentication token is required",
              });
            }

            if (!body.currentPassword || !body.newPassword) {
              return createResponse(400, {
                success: false,
                message: "Current password and new password are required",
              });
            }

            // Verify token first
            const tokenVerification = await secureAuthService.verifyToken(
              changePasswordToken
            );
            if (!tokenVerification.valid) {
              return createResponse(401, {
                success: false,
                message: tokenVerification.message || "Invalid token",
              });
            }

            const changeResult = await secureAuthService.changePassword(
              tokenVerification.user.email,
              body.currentPassword,
              body.newPassword
            );

            return createResponse(
              changeResult.success ? 200 : 400,
              changeResult
            );

          default:
            return createResponse(400, {
              success: false,
              message: "Invalid action for POST request",
            });
        }
      }

      // Method not allowed
      return createResponse(405, {
        success: false,
        message: "Method not allowed",
      });
    } catch (error) {
      context.log.error("Unified auth error:", error);
      return createResponse(500, {
        success: false,
        message: "Internal server error",
        ...(configService.isDevelopment() && { error: error.message }),
      });
    }
  },
});
