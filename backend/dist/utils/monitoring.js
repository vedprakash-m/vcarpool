"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.performance = void 0;
exports.initializeMonitoring = initializeMonitoring;
exports.trackExecutionTime = trackExecutionTime;
const appInsights = __importStar(require("applicationinsights"));
// Initialize Application Insights with our connection string
const APPINSIGHTS_CONNECTION_STRING = process.env.APPINSIGHTS_CONNECTION_STRING;
// List of sensitive headers that shouldn't be logged
const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie'];
function initializeMonitoring() {
    if (!APPINSIGHTS_CONNECTION_STRING) {
        console.warn('Application Insights connection string not found. Telemetry is disabled.');
        return;
    }
    try {
        appInsights.setup(APPINSIGHTS_CONNECTION_STRING)
            // Optional configurations
            .setAutoDependencyCorrelation(true)
            .setAutoCollectRequests(true)
            .setAutoCollectPerformance(true, true) // collect performance metrics, including SQL queries
            .setAutoCollectExceptions(true)
            .setAutoCollectDependencies(true)
            .setAutoCollectConsole(true)
            .setAutoCollectHeartbeat(true)
            .setUseDiskRetryCaching(true)
            .setSendLiveMetrics(true)
            .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C)
            // Configure custom context tags
            .addTelemetryProcessor((envelope, context) => {
            // Sanitize any sensitive data in telemetry
            if (envelope.data && envelope.data.baseData) {
                const baseData = envelope.data.baseData;
                // For HTTP requests, sanitize headers
                if (baseData.url && baseData.headers) {
                    sensitiveHeaders.forEach(header => {
                        if (baseData.headers[header]) {
                            baseData.headers[header] = '[REDACTED]';
                        }
                    });
                }
            }
            return true; // Always send the telemetry
        });
        // Start Application Insights
        appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = "vCarpool-Backend";
        appInsights.start();
        console.info('Application Insights initialized successfully');
    }
    catch (error) {
        console.error('Failed to initialize Application Insights', error);
    }
}
// Performance monitoring helpers
exports.performance = {
    trackDependency: (name, dependencyTypeName, data, duration, success) => {
        if (appInsights.defaultClient) {
            appInsights.defaultClient.trackDependency({
                target: name,
                name: dependencyTypeName,
                data: data,
                duration: duration,
                resultCode: success ? '200' : '500',
                success: success,
                dependencyTypeName: dependencyTypeName
            });
        }
    },
    trackEvent: (name, properties, measurements) => {
        if (appInsights.defaultClient) {
            appInsights.defaultClient.trackEvent({ name, properties, measurements });
        }
    },
    trackException: (error, properties) => {
        if (appInsights.defaultClient) {
            appInsights.defaultClient.trackException({ exception: error, properties });
        }
    },
    trackRequest: (name, url, duration, resultCode, success) => {
        if (appInsights.defaultClient) {
            appInsights.defaultClient.trackRequest({
                name,
                url,
                duration,
                resultCode,
                success
            });
        }
    },
    trackMetric: (name, value, properties) => {
        if (appInsights.defaultClient) {
            appInsights.defaultClient.trackMetric({ name, value, properties });
        }
    }
};
// Helper to track function execution time
async function trackExecutionTime(name, operation, category = 'Function') {
    const startTime = Date.now();
    let success = true;
    try {
        const result = await operation();
        return result;
    }
    catch (error) {
        success = false;
        throw error;
    }
    finally {
        const duration = Date.now() - startTime;
        exports.performance.trackMetric(`${category}.${name}.Duration`, duration, { category, name });
        exports.performance.trackEvent(`${category}.${name}.Executed`, {
            category,
            name,
            success: success.toString(),
            durationMs: duration.toString()
        });
    }
}
//# sourceMappingURL=monitoring.js.map