# Authentication System Monitoring Configuration

## Application Insights Queries for Authentication Monitoring

### 1. Authentication Success Rate Dashboard

```kql
// Authentication Success Rate (Last 24 hours)
requests
| where timestamp > ago(24h)
| where name == "auth-unified"
| extend action = tostring(customDimensions.action)
| summarize
    Total = count(),
    Success = countif(resultCode < 400),
    Failed = countif(resultCode >= 400)
    by action
| extend SuccessRate = round((Success * 100.0) / Total, 2)
| project action, Total, Success, Failed, SuccessRate
```

### 2. Authentication Performance Monitoring

```kql
// Authentication Response Times (95th percentile)
requests
| where timestamp > ago(1h)
| where name == "auth-unified"
| extend action = tostring(customDimensions.action)
| summarize
    avg_duration = avg(duration),
    p95_duration = percentile(duration, 95),
    p99_duration = percentile(duration, 99)
    by action, bin(timestamp, 5m)
| order by timestamp desc
```

### 3. Failed Authentication Attempts Alert

```kql
// Alert: High failure rate (>10% in 5 minutes)
requests
| where timestamp > ago(5m)
| where name == "auth-unified"
| summarize
    Total = count(),
    Failed = countif(resultCode >= 400)
| extend FailureRate = (Failed * 100.0) / Total
| where FailureRate > 10
```

### 4. Security Monitoring - Suspicious Activity

```kql
// Potential brute force attacks
requests
| where timestamp > ago(15m)
| where name == "auth-unified"
| where resultCode >= 400
| extend email = tostring(customDimensions.email)
| summarize FailedAttempts = count() by email
| where FailedAttempts >= 5
| order by FailedAttempts desc
```

### 5. JWT Token Issues

```kql
// JWT validation failures
exceptions
| where timestamp > ago(1h)
| where outerMessage contains "JWT" or outerMessage contains "token"
| summarize count() by outerMessage, bin(timestamp, 5m)
| order by timestamp desc
```

## Azure Monitor Alert Rules

### Critical Alerts (Immediate Response)

1. **Authentication Endpoint Down**

   - Metric: Availability < 95%
   - Threshold: 2 consecutive failures
   - Action: Page on-call engineer

2. **High Authentication Failure Rate**

   - Metric: Failed requests > 10% in 5 minutes
   - Threshold: >10% failure rate
   - Action: Slack notification + email

3. **Slow Authentication Response**
   - Metric: P95 response time > 2 seconds
   - Threshold: Sustained for 5 minutes
   - Action: Performance team notification

### Warning Alerts (Monitor and Investigate)

1. **Increased Failed Login Attempts**

   - Metric: Failed login attempts > 100 in 15 minutes
   - Action: Security team notification

2. **JWT Token Expiration Issues**

   - Metric: Token refresh failures > 5% in 10 minutes
   - Action: Development team notification

3. **Database Connection Issues**
   - Metric: Database timeout errors > 0
   - Action: Infrastructure team notification

## Grafana Dashboard Configuration

### Authentication Overview Dashboard

```json
{
  "dashboard": {
    "title": "Carpool Authentication System",
    "panels": [
      {
        "title": "Authentication Success Rate",
        "type": "stat",
        "targets": [
          {
            "query": "requests | where name == 'auth-unified' | summarize SuccessRate = (countif(resultCode < 400) * 100.0) / count()"
          }
        ]
      },
      {
        "title": "Authentication Requests per Minute",
        "type": "graph",
        "targets": [
          {
            "query": "requests | where name == 'auth-unified' | summarize count() by bin(timestamp, 1m)"
          }
        ]
      },
      {
        "title": "Response Time Distribution",
        "type": "heatmap",
        "targets": [
          {
            "query": "requests | where name == 'auth-unified' | project timestamp, duration"
          }
        ]
      }
    ]
  }
}
```

## Health Check Endpoints

Create a health check endpoint for monitoring:

```typescript
// backend/src/functions/health-check/index.ts
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function healthCheck(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    // Test database connectivity
    const dbStatus = await testDatabaseConnection();

    // Test JWT service
    const jwtStatus = await testJWTService();

    // Overall health status
    const isHealthy = dbStatus && jwtStatus;

    return {
      status: isHealthy ? 200 : 503,
      jsonBody: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: {
          database: dbStatus ? 'healthy' : 'unhealthy',
          jwt: jwtStatus ? 'healthy' : 'unhealthy',
        },
      },
    };
  } catch (error) {
    return {
      status: 503,
      jsonBody: {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

app.http('health-check', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: healthCheck,
});
```

## Synthetic Monitoring

### Uptime Monitoring Script

```javascript
// Synthetic test for authentication flow
const axios = require('axios');

async function testAuthenticationFlow() {
  const baseUrl = 'https://carpool-functions.azurewebsites.net/api';

  try {
    // Test login
    const loginResponse = await axios.post(`${baseUrl}/auth`, {
      action: 'login',
      email: 'monitor@carpool.com',
      password: 'MonitorPassword123!',
    });

    if (loginResponse.status !== 200) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const token = loginResponse.data.data.accessToken;

    // Test token validation
    const profileResponse = await axios.get(`${baseUrl}/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (profileResponse.status !== 200) {
      throw new Error(`Profile fetch failed: ${profileResponse.status}`);
    }

    console.log('✅ Authentication flow test passed');
    return true;
  } catch (error) {
    console.error('❌ Authentication flow test failed:', error.message);
    return false;
  }
}

// Run every 5 minutes
setInterval(testAuthenticationFlow, 5 * 60 * 1000);
```

## Performance Baselines

### Expected Performance Metrics

```yaml
Authentication Endpoint Baselines:
  Response Time:
    P50: < 200ms
    P95: < 500ms
    P99: < 1000ms

  Throughput:
    Concurrent Users: 1000+
    Requests/Second: 500+

  Availability:
    Target: 99.9%
    Monthly Downtime: < 43 minutes

  Error Rates:
    Authentication Failures: < 1%
    System Errors: < 0.1%

Database Performance:
  Connection Time: < 50ms
  Query Response: < 100ms
  Connection Pool: 80% utilization max

JWT Operations:
  Token Generation: < 10ms
  Token Validation: < 5ms
  Token Refresh: < 50ms
```

## Monitoring Automation

### PowerShell Monitoring Script

```powershell
# Production monitoring automation script
param(
    [string]$SubscriptionId,
    [string]$ResourceGroupName = "carpool-rg",
    [string]$FunctionAppName = "carpool-functions"
)

# Connect to Azure
Connect-AzAccount
Set-AzContext -SubscriptionId $SubscriptionId

# Get Application Insights data
$insights = Get-AzApplicationInsights -ResourceGroupName $ResourceGroupName

# Run health checks
$healthEndpoint = "https://$FunctionAppName.azurewebsites.net/api/health"
$healthCheck = Invoke-RestMethod -Uri $healthEndpoint -Method GET

if ($healthCheck.status -eq "healthy") {
    Write-Host "✅ Health check passed" -ForegroundColor Green
} else {
    Write-Host "❌ Health check failed" -ForegroundColor Red
    # Send alert
}

# Check authentication metrics
$authQuery = @"
requests
| where timestamp > ago(5m)
| where name == "auth-unified"
| summarize
    Total = count(),
    Failed = countif(resultCode >= 400)
| extend FailureRate = (Failed * 100.0) / Total
"@

$results = Invoke-AzOperationalInsightsQuery -WorkspaceId $insights.WorkspaceId -Query $authQuery

foreach ($result in $results.Results) {
    $failureRate = [double]$result.FailureRate
    if ($failureRate -gt 5) {
        Write-Host "⚠️ High failure rate detected: $failureRate%" -ForegroundColor Yellow
        # Send alert
    }
}
```
