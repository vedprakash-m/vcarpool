import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { compose, requestId, requestLogging, authenticate } from '../../middleware';
import { Errors, handleError } from '../../utils/error-handler';
import { getGlobalOrchestrator } from '../../optimizations/phase2-orchestrator';
import { quickOptimize } from '../../middleware/phase2-optimization.middleware';

/**
 * Admin Phase-2 endpoint
 *  GET  /admin/phase2      -> returns orchestrator metrics
 *  DELETE /admin/phase2/cache -> clears in-memory Phase-2 cache
 */
async function adminPhase2Handler(
  request: HttpRequest,
  _context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const userRole = request.auth?.role;
    if (userRole !== 'super_admin') {
      throw Errors.Forbidden('Admin role required');
    }

    const orchestrator = getGlobalOrchestrator();

    if (request.method === 'GET') {
      const metrics = await Promise.resolve(orchestrator.getPerformanceMetrics());
      return {
        status: 200,
        jsonBody: { success: true, data: metrics },
      };
    }

    if (request.method === 'DELETE') {
      orchestrator.clearCache();
      return { status: 204 };
    }

    return { status: 405 };
  } catch (error) {
    return handleError(error, request);
  }
}

app.http('admin-phase2', {
  methods: ['GET', 'DELETE'],
  authLevel: 'anonymous', // auth handled via middleware
  route: 'admin/phase2{*extra}',
  handler: quickOptimize(compose(requestId, requestLogging, authenticate)(adminPhase2Handler)),
});
