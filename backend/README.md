# Carpool Backend

Azure Functions backend for the Carpool application.

## Health Endpoint

The health endpoint is implemented using Azure Functions v4 programming model at `/api/health`.

- **URL**: `https://your-function-app.azurewebsites.net/api/health`
- **Method**: GET
- **Auth**: Anonymous (no authentication required)
- **Response**: JSON with health status, timestamp, environment info, and platform details

### Health Endpoint Implementation

The health check is implemented in `src/functions/health.ts` using the new Azure Functions v4 model. This replaces any legacy health implementations to avoid conflicts.

```typescript
import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

export async function healthCheck(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  // ... implementation
}

app.http("healthCheck", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "health",
  handler: healthCheck,
});
```

### CI/CD Health Checks

The CI/CD pipeline includes health checks after deployment with the following features:

- Extended wait times for Azure Functions cold starts (90-120 seconds)
- Multiple retry attempts (3-5 retries)
- Improved error diagnostics and logging
- Non-blocking health checks (deployment continues even if health check fails initially)

## Development

### Prerequisites

- Node.js 22+
- Azure Functions Core Tools v4
- Azure CLI

### Build and Deploy

```bash
npm install
npm run build      # Compile TypeScript and setup functions
npm run start      # Start local development server
npm run deploy     # Deploy to Azure (requires Azure CLI login)
```

### Testing

```bash
npm test           # Run unit tests
npm run test:integration  # Run integration tests
```
