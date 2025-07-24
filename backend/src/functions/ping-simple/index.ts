export default async function (context: any, req: any) {
  context.log('HTTP trigger function processed a request.');

  const responseMessage = {
    message: 'Hello from Azure Functions!',
    timestamp: new Date().toISOString(),
    method: req.method || 'unknown',
    query: req.query || {},
  };

  context.res = {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(responseMessage),
  };
}
