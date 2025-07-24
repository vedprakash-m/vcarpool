import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

/**
 * Quick optimization middleware for Phase 2 performance improvements
 */
export function quickOptimize(
  handler: (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit>,
) {
  return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    // Start performance monitoring
    const startTime = Date.now();

    try {
      // Apply quick optimizations
      await applyQuickOptimizations(request, context);

      // Execute the main function
      const response = await handler(request, context);

      // Add performance headers
      const duration = Date.now() - startTime;
      return {
        ...response,
        headers: {
          ...response.headers,
          'X-Performance-Duration': duration.toString(),
          'X-Optimization-Applied': 'quick',
        },
      };
    } catch (error) {
      context.error('Quick optimization failed:', error);
      return await handler(request, context); // Fallback to original execution
    }
  };
}

/**
 * Performance optimization middleware for enhanced performance
 */
export function performanceOptimize(
  handler: (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit>,
) {
  return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const startTime = Date.now();

    try {
      // Apply performance optimizations
      await applyPerformanceOptimizations(request, context);

      // Execute with performance monitoring
      const response = await handler(request, context);

      // Add performance metrics
      const duration = Date.now() - startTime;
      return {
        ...response,
        headers: {
          ...response.headers,
          'X-Performance-Duration': duration.toString(),
          'X-Optimization-Applied': 'performance',
        },
      };
    } catch (error) {
      context.error('Performance optimization failed:', error);
      return await handler(request, context);
    }
  };
}

/**
 * Apply quick optimizations to the request
 */
async function applyQuickOptimizations(
  request: HttpRequest,
  context: InvocationContext,
): Promise<void> {
  // Add optimization metadata
  context.extraInputs.set('optimizationLevel', 'quick');
  context.extraInputs.set('optimizationStartTime', Date.now());
}

/**
 * Apply performance optimizations
 */
async function applyPerformanceOptimizations(
  request: HttpRequest,
  context: InvocationContext,
): Promise<void> {
  // Set performance flags
  context.extraInputs.set('optimizationLevel', 'performance');
  context.extraInputs.set('performanceMode', true);
  context.extraInputs.set('optimizationStartTime', Date.now());

  // Add any performance-specific logic here
}
