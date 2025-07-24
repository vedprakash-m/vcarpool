import * as appInsights from 'applicationinsights';
import { ServiceContainer } from '../container';

// Initialize Application Insights with our connection string
const APPINSIGHTS_CONNECTION_STRING = process.env.APPINSIGHTS_CONNECTION_STRING;

// List of sensitive headers that shouldn't be logged
const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie'];

export function initializeMonitoring(): void {
  if (!APPINSIGHTS_CONNECTION_STRING) {
    console.warn('Application Insights connection string not found. Telemetry is disabled.');
    return;
  }

  try {
    appInsights
      .setup(APPINSIGHTS_CONNECTION_STRING)
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
      .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C);

    // Start Application Insights
    if (appInsights.defaultClient) {
      appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] =
        'Carpool-Backend';
    }
    appInsights.start();

    console.info('Application Insights initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Application Insights', error);
  }
}

// Performance monitoring helpers
export const performance = {
  trackDependency: (
    name: string,
    dependencyTypeName: string,
    data: string,
    duration: number,
    success: boolean,
  ) => {
    if (appInsights.defaultClient) {
      appInsights.defaultClient.trackDependency({
        target: name,
        name: dependencyTypeName,
        data: data,
        duration: duration,
        resultCode: success ? '200' : '500',
        success: success,
        dependencyTypeName: dependencyTypeName,
      });
    }
  },

  trackEvent: (
    name: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number },
  ) => {
    if (appInsights.defaultClient) {
      appInsights.defaultClient.trackEvent({ name, properties, measurements });
    }
  },

  trackException: (error: Error, properties?: { [key: string]: string }) => {
    if (appInsights.defaultClient) {
      appInsights.defaultClient.trackException({ exception: error, properties });
    }
  },

  trackRequest: (
    name: string,
    url: string,
    duration: number,
    resultCode: string,
    success: boolean,
  ) => {
    if (appInsights.defaultClient) {
      appInsights.defaultClient.trackRequest({
        name,
        url,
        duration,
        resultCode,
        success,
      });
    }
  },

  trackMetric: (name: string, value: number, properties?: { [key: string]: string }) => {
    if (appInsights.defaultClient) {
      appInsights.defaultClient.trackMetric({ name, value, properties });
    }
  },
};

// Helper to track function execution time
export async function trackExecutionTime<T>(
  name: string,
  operation: () => Promise<T>,
  category: string = 'Function',
): Promise<T> {
  const startTime = Date.now();
  let success = true;

  try {
    const result = await operation();
    return result;
  } catch (error) {
    success = false;
    throw error;
  } finally {
    const duration = Date.now() - startTime;
    performance.trackMetric(`${category}.${name}.Duration`, duration, { category, name });
    performance.trackEvent(`${category}.${name}.Executed`, {
      category,
      name,
      success: success.toString(),
      durationMs: duration.toString(),
    });
  }
}
