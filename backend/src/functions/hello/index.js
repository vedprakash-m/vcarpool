const UnifiedResponseHandler = require("../../utils/unified-response.service");

module.exports = function (context, req) {
  context.log("Health check function triggered");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    context.res = UnifiedResponseHandler.preflight();
    return;
  }

  context.res = UnifiedResponseHandler.success(
    {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      environment: "production",
    },
    "Health check successful"
  );

  context.done();
};
