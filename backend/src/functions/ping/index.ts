import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

async function pingHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'pong',
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
    }),
  };
}

app.http('ping', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'ping',
  handler: pingHandler,
});
