import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

async function testHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    return {
      status: 200,
      jsonBody: {
        success: true,
        message: 'Test function working',
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

app.http('test-minimal', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'test/minimal',
  handler: testHandler,
});
