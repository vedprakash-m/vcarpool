// Simplified version without database dependencies for immediate functionality
const UnifiedResponseHandler = require("../src/utils/unified-response.service");

module.exports = async function (context, req) {
  context.log("Registration function called");

  // Handle CORS preflight
  const preflightResponse = UnifiedResponseHandler.handlePreflight(req);
  if (preflightResponse) {
    context.res = preflightResponse;
    return;
  }

  try {
    context.log("Processing registration request");

    // For now, just return a simple success response
    context.res = UnifiedResponseHandler.success({
      message: "Registration endpoint is working",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    context.log("Error in registration function:", error);
    context.res = UnifiedResponseHandler.internalError(
      "Internal server error",
      error.message
    );
  }
};
