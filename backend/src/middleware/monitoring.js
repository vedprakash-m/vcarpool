/**
 * Enhanced Azure Application Insights Monitoring Middleware
 * Provides comprehensive monitoring, custom metrics, and error tracking
 */

const appInsights = require("applicationinsights");

// Initialize Application Insights if connection string is available
if (process.env.APPINSIGHTS_CONNECTION_STRING) {
  appInsights
    .setup()
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true, true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true, true)
    .setUseDiskRetryCaching(true)
    .setSendLiveMetrics(true)
    .start();

  console.log("✅ Application Insights monitoring enabled");
} else {
  console.log(
    "⚠️ Application Insights connection string not found - monitoring disabled"
  );
}

const client = appInsights.defaultClient;

/**
 * Custom metrics for Carpool business logic
 */
const customMetrics = {
  // Authentication metrics
  trackLogin: (success, role) => {
    if (client) {
      client.trackEvent({
        name: "UserLogin",
        properties: { success: success.toString(), role },
      });

      client.trackMetric({
        name: "LoginAttempts",
        value: 1,
        properties: { success: success.toString(), role },
      });
    }
  },

  // Trip management metrics
  trackTripCreation: (driverId, passengerCount) => {
    if (client) {
      client.trackEvent({
        name: "TripCreated",
        properties: { driverId, passengerCount: passengerCount.toString() },
      });

      client.trackMetric({
        name: "TripsCreated",
        value: 1,
      });
    }
  },

  trackScheduleGeneration: (totalSlots, assignedSlots, algorithm) => {
    if (client) {
      client.trackEvent({
        name: "ScheduleGenerated",
        properties: {
          totalSlots: totalSlots.toString(),
          assignedSlots: assignedSlots.toString(),
          algorithm,
          efficiency: ((assignedSlots / totalSlots) * 100).toFixed(2),
        },
      });

      client.trackMetric({
        name: "ScheduleEfficiency",
        value: (assignedSlots / totalSlots) * 100,
      });
    }
  },

  // Database performance metrics
  trackDatabaseOperation: (operation, duration, success) => {
    if (client) {
      client.trackDependency({
        target: "CosmosDB",
        name: operation,
        data: operation,
        duration: duration,
        resultCode: success ? "200" : "500",
        success: success,
      });

      client.trackMetric({
        name: "DatabaseOperationDuration",
        value: duration,
        properties: { operation, success: success.toString() },
      });
    }
  },

  // Security events
  trackSecurityEvent: (event, userId, details) => {
    if (client) {
      client.trackEvent({
        name: "SecurityEvent",
        properties: {
          event,
          userId: userId || "anonymous",
          ...details,
        },
      });
    }
  },

  // Performance metrics
  trackFunctionPerformance: (functionName, duration, success) => {
    if (client) {
      client.trackMetric({
        name: "FunctionDuration",
        value: duration,
        properties: { functionName, success: success.toString() },
      });

      if (duration > 5000) {
        // Alert for slow functions
        client.trackEvent({
          name: "SlowFunction",
          properties: { functionName, duration: duration.toString() },
        });
      }
    }
  },
};

/**
 * Monitoring middleware for Azure Functions
 */
const monitoringMiddleware = (handler) => {
  return async (context) => {
    const startTime = Date.now();
    const functionName = context.req.url.split("/").pop() || "unknown";
    const correlationId =
      context.req.headers["x-correlation-id"] ||
      context.req.headers["x-ms-client-request-id"] ||
      generateCorrelationId();

    // Set correlation ID for request tracking
    context.correlationId = correlationId;

    try {
      // Track request start
      if (client) {
        client.trackRequest({
          name: `${context.req.method} ${functionName}`,
          url: context.req.url,
          duration: 0, // Will be updated at the end
          resultCode: "200",
          success: true,
          properties: {
            correlationId,
            functionName,
            method: context.req.method,
          },
        });
      }

      // Execute the handler
      const result = await handler(context);
      const duration = Date.now() - startTime;

      // Track successful completion
      customMetrics.trackFunctionPerformance(functionName, duration, true);

      if (client) {
        client.trackRequest({
          name: `${context.req.method} ${functionName}`,
          url: context.req.url,
          duration: duration,
          resultCode: result.status || "200",
          success: true,
          properties: {
            correlationId,
            functionName,
            method: context.req.method,
            responseSize: JSON.stringify(result.body || {}).length,
          },
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Track error
      customMetrics.trackFunctionPerformance(functionName, duration, false);

      if (client) {
        client.trackException({
          exception: error,
          properties: {
            correlationId,
            functionName,
            method: context.req.method,
            url: context.req.url,
          },
        });

        client.trackRequest({
          name: `${context.req.method} ${functionName}`,
          url: context.req.url,
          duration: duration,
          resultCode: "500",
          success: false,
          properties: {
            correlationId,
            functionName,
            method: context.req.method,
            errorMessage: error.message,
          },
        });
      }

      // Re-throw the error to maintain normal error handling
      throw error;
    }
  };
};

/**
 * Generate correlation ID for request tracking
 */
function generateCorrelationId() {
  return (
    "vcpool-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).substr(2, 9)
  );
}

/**
 * Database monitoring wrapper
 */
const monitorDatabaseOperation = async (operation, operationFunction) => {
  const startTime = Date.now();

  try {
    const result = await operationFunction();
    const duration = Date.now() - startTime;

    customMetrics.trackDatabaseOperation(operation, duration, true);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    customMetrics.trackDatabaseOperation(operation, duration, false);
    throw error;
  }
};

/**
 * Health check metrics
 */
const trackHealthCheck = (endpoint, status, duration) => {
  if (client) {
    client.trackAvailability({
      name: `Health Check - ${endpoint}`,
      duration: duration,
      success: status === "healthy",
      message: `Health check for ${endpoint}`,
      properties: {
        endpoint,
        status,
      },
    });
  }
};

module.exports = {
  monitoringMiddleware,
  customMetrics,
  monitorDatabaseOperation,
  trackHealthCheck,
  correlationId: () => generateCorrelationId(),
};
