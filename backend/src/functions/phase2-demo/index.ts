import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { performanceOptimize } from '../../middleware/phase2-optimization.middleware';
import { getGlobalOrchestrator } from '../../optimizations/phase2-orchestrator';

async function demoHandler(_req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  // For demo purposes, return current timestamp and orchestrator metrics
  const orchestrator = getGlobalOrchestrator();
  const metrics = await Promise.resolve(orchestrator.getPerformanceMetrics());

  return {
    status: 200,
    jsonBody: {
      success: true,
      message: 'Phase 2 optimization demo endpoint',
      data: {
        timestamp: new Date().toISOString(),
        metrics,
      },
    },
  };
}

app.http('phase2-demo', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'phase2-demo',
  handler: performanceOptimize(demoHandler),
});
