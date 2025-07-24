/**
 * API Documentation Generator
 * Utilities for generating and serving API documentation
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { openApiSpec } from './openapi-spec';

/**
 * Generate Swagger UI HTML for API documentation
 */
function generateSwaggerUI(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Carpool API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '/api/docs/spec',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        validatorUrl: null,
        tryItOutEnabled: true,
        supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
        onComplete: function() {
          console.log('Swagger UI loaded successfully');
        },
        onFailure: function(error) {
          console.error('Failed to load Swagger UI:', error);
        },
        docExpansion: 'list',
        apisSorter: 'alpha',
        operationsSorter: 'alpha',
        filter: true,
        requestSnippetsEnabled: true,
        requestSnippets: {
          generators: {
            curl_bash: {
              title: "cURL (bash)",
              syntax: "bash"
            },
            curl_powershell: {
              title: "cURL (PowerShell)",
              syntax: "powershell"
            },
            curl_cmd: {
              title: "cURL (CMD)",
              syntax: "bash"
            }
          },
          defaultExpanded: true,
          languages: null
        }
      });
      
      // Custom authentication handler
      ui.preauthorizeApiKey('bearerAuth', 'your-jwt-token-here');
    }
  </script>
</body>
</html>`;
}

/**
 * Generate ReDoc HTML for alternative documentation view
 */
function generateReDocUI(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Carpool API Documentation</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
  <style>
    body { margin: 0; padding: 0; }
  </style>
</head>
<body>
  <redoc spec-url='/api/docs/spec'></redoc>
  <script src="https://cdn.jsdelivr.net/npm/redoc@2.0.0/bundles/redoc.standalone.js"></script>
</body>
</html>`;
}

/**
 * Azure Function to serve OpenAPI specification
 */
export async function docsSpec(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
      jsonBody: openApiSpec,
    };
  } catch (error) {
    context.error('Failed to serve OpenAPI spec', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      jsonBody: {
        success: false,
        error: {
          message: 'Failed to load API specification',
          code: 'INTERNAL_ERROR',
        },
      },
    };
  }
}

/**
 * Azure Function to serve Swagger UI
 */
export async function docsSwagger(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    return {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
      body: generateSwaggerUI(),
    };
  } catch (error) {
    context.error('Failed to serve Swagger UI', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
      body: '<h1>Failed to load documentation</h1>',
    };
  }
}

/**
 * Azure Function to serve ReDoc UI
 */
export async function docsRedoc(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    return {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
      body: generateReDocUI(),
    };
  } catch (error) {
    context.error('Failed to serve ReDoc UI', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
      body: '<h1>Failed to load documentation</h1>',
    };
  }
}

/**
 * Azure Function to serve documentation index
 */
export async function docsIndex(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const indexHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Carpool API Documentation</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 40px;
      background: #f8f9fa;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #2c3e50;
      margin-bottom: 10px;
    }
    .subtitle {
      color: #7f8c8d;
      margin-bottom: 30px;
    }
    .docs-links {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }
    .docs-link {
      display: block;
      padding: 20px;
      background: #3498db;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      text-align: center;
      font-weight: 500;
      transition: background-color 0.2s;
    }
    .docs-link:hover {
      background: #2980b9;
    }
    .docs-link.redoc {
      background: #e74c3c;
    }
    .docs-link.redoc:hover {
      background: #c0392b;
    }
    .api-info {
      background: #ecf0f1;
      padding: 20px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .api-info h3 {
      margin: 0 0 10px 0;
      color: #2c3e50;
    }
    .api-info p {
      margin: 5px 0;
      color: #5d6d7e;
    }
    .features {
      margin: 30px 0;
    }
    .features ul {
      padding-left: 20px;
    }
    .features li {
      margin: 8px 0;
      color: #34495e;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Carpool API Documentation</h1>
    <p class="subtitle">Comprehensive carpool management system API</p>
    
    <div class="api-info">
      <h3>API Information</h3>
      <p><strong>Version:</strong> ${openApiSpec.info.version}</p>
      <p><strong>Base URL:</strong> ${
        openApiSpec.servers[0]?.url || 'https://carpool-functions.azurewebsites.net/api'
      }</p>
      <p><strong>Authentication:</strong> JWT Bearer Token</p>
    </div>

    <div class="features">
      <h3>Key Features</h3>
      <ul>
        <li>JWT-based authentication with role-based access control</li>
        <li>Real-time trip management and matching</li>
        <li>Performance optimized with caching and rate limiting</li>
        <li>Comprehensive input validation and sanitization</li>
        <li>RESTful API design with proper HTTP status codes</li>
        <li>Detailed error responses and validation feedback</li>
      </ul>
    </div>

    <div class="docs-links">
      <a href="/api/docs/swagger" class="docs-link">
        <strong>Swagger UI</strong><br>
        Interactive API Explorer
      </a>
      <a href="/api/docs/redoc" class="docs-link redoc">
        <strong>ReDoc</strong><br>
        Clean Documentation View
      </a>
    </div>

    <div class="api-info">
      <h3>Quick Start</h3>
      <p>1. Register for an account: <code>POST /api/auth (action: register)</code></p>
      <p>2. Login to get JWT token: <code>POST /api/auth (action: login)</code></p>
      <p>3. Include token in Authorization header: <code>Bearer &lt;token&gt;</code></p>
      <p>4. Start making API calls to manage trips and users</p>
    </div>

    <div class="api-info">
      <h3>Rate Limits</h3>
      <p><strong>Authentication:</strong> 10 requests per minute</p>
      <p><strong>Standard API:</strong> 60 requests per minute</p>
      <p><strong>Bulk Operations:</strong> 10 requests per minute</p>
    </div>

    <div class="api-info">
      <h3>Support</h3>
      <p>For support and questions, contact: <a href="mailto:support@carpool.com">support@carpool.com</a></p>
      <p>For technical issues, please include your request ID from error responses.</p>
    </div>
  </div>
</body>
</html>`;

  try {
    return {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=3600',
      },
      body: indexHTML,
    };
  } catch (error) {
    context.error('Failed to serve docs index', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
      body: '<h1>Failed to load documentation</h1>',
    };
  }
}

/**
 * Generate API client code examples
 */
export function generateClientExamples() {
  return {
    javascript: `
// JavaScript/Node.js Example
const axios = require('axios');

const API_BASE_URL = 'https://carpool-functions.azurewebsites.net/api';
let authToken = null;

// Login
async function login(email, password) {
  try {
    const response = await axios.post(\`\${API_BASE_URL}/api/auth\`, {
      action: 'login',
      email,
      password
    });
    
    authToken = response.data.data.accessToken;
    return response.data.data.user;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

// Get trips with authentication
async function getTrips(page = 1, limit = 20) {
  try {
    const response = await axios.get(\`\${API_BASE_URL}/trips\`, {
      headers: {
        'Authorization': \`Bearer \${authToken}\`
      },
      params: { page, limit }
    });
    
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch trips:', error.response?.data || error.message);
    throw error;
  }
}

// Create a new trip
async function createTrip(tripData) {
  try {
    const response = await axios.post(\`\${API_BASE_URL}/trips\`, tripData, {
      headers: {
        'Authorization': \`Bearer \${authToken}\`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data.data;
  } catch (error) {
    console.error('Failed to create trip:', error.response?.data || error.message);
    throw error;
  }
}

// Usage example
async function example() {
  try {
    // Login
    const user = await login('user@example.com', 'password123');
    console.log('Logged in as:', user.firstName);
    
    // Get trips
    const trips = await getTrips(1, 10);
    console.log('Found trips:', trips.trips.length);
    
    // Create a trip
    const newTrip = await createTrip({
      origin: 'School Campus',
      destination: 'Downtown',
      departureTime: '2024-01-15T15:30:00Z',
      maxPassengers: 3,
      costPerPerson: 5.00,
      description: 'Going to the mall after school'
    });
    
    console.log('Created trip:', newTrip.id);
  } catch (error) {
    console.error('Example failed:', error);
  }
}`,

    python: `
# Python Example
import requests
import json
from datetime import datetime

API_BASE_URL = 'https://carpool-functions.azurewebsites.net/api'
auth_token = None

def login(email, password):
    """Login and store auth token"""
    global auth_token
    
    response = requests.post(f'{API_BASE_URL}/api/auth', json={
        'action': 'login',
        'email': email,
        'password': password
    })
    
    if response.status_code == 200:
        data = response.json()
        auth_token = data['data']['accessToken']
        return data['data']['user']
    else:
        raise Exception(f"Login failed: {response.text}")

def get_headers():
    """Get headers with authentication"""
    if not auth_token:
        raise Exception("Not authenticated. Please login first.")
    
    return {
        'Authorization': f'Bearer {auth_token}',
        'Content-Type': 'application/json'
    }

def get_trips(page=1, limit=20, status=None):
    """Get trips with optional filtering"""
    params = {'page': page, 'limit': limit}
    if status:
        params['status'] = status
    
    response = requests.get(
        f'{API_BASE_URL}/trips',
        headers=get_headers(),
        params=params
    )
    
    if response.status_code == 200:
        return response.json()['data']
    else:
        raise Exception(f"Failed to fetch trips: {response.text}")

def create_trip(origin, destination, departure_time, max_passengers, cost_per_person, description=None):
    """Create a new carpool trip"""
    trip_data = {
        'origin': origin,
        'destination': destination,
        'departureTime': departure_time.isoformat(),
        'maxPassengers': max_passengers,
        'costPerPerson': cost_per_person
    }
    
    if description:
        trip_data['description'] = description
    
    response = requests.post(
        f'{API_BASE_URL}/trips',
        headers=get_headers(),
        json=trip_data
    )
    
    if response.status_code == 201:
        return response.json()['data']
    else:
        raise Exception(f"Failed to create trip: {response.text}")

def join_trip(trip_id, pickup_location):
    """Join an existing trip"""
    response = requests.post(
        f'{API_BASE_URL}/trips/{trip_id}/join',
        headers=get_headers(),
        json={'pickupLocation': pickup_location}
    )
    
    if response.status_code == 200:
        return response.json()['data']
    else:
        raise Exception(f"Failed to join trip: {response.text}")

# Usage example
if __name__ == "__main__":
    try:
        # Login
        user = login('user@example.com', 'password123')
        print(f"Logged in as: {user['firstName']} {user['lastName']}")
        
        # Get active trips
        trips_data = get_trips(status='ACTIVE')
        print(f"Found {len(trips_data['trips'])} active trips")
        
        # Create a new trip
        departure = datetime(2024, 1, 15, 15, 30)
        new_trip = create_trip(
            origin='School Campus',
            destination='Shopping Center',
            departure_time=departure,
            max_passengers=3,
            cost_per_person=7.50,
            description='After-school shopping trip'
        )
        
        print(f"Created trip with ID: {new_trip['id']}")
        
    except Exception as e:
        print(f"Error: {e}")`,

    curl: `
# cURL Examples

# 1. Login
curl -X POST https://carpool-functions.azurewebsites.net/api/auth \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "login",
    "email": "user@example.com",
    "password": "password123"
  }'

# Save the token from the response for use in subsequent requests
TOKEN="your-jwt-token-here"

# 2. Get trips with pagination
curl -X GET "https://carpool-functions.azurewebsites.net/api/trips?page=1&limit=10" \\
  -H "Authorization: Bearer $TOKEN"

# 3. Create a new trip
curl -X POST https://carpool-functions.azurewebsites.net/api/trips \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "origin": "School Campus",
    "destination": "Downtown",
    "departureTime": "2024-01-15T15:30:00Z",
    "maxPassengers": 3,
    "costPerPerson": 5.00,
    "description": "Going to the mall after school"
  }'

# 4. Get a specific trip
curl -X GET https://carpool-functions.azurewebsites.net/api/trips/TRIP_ID \\
  -H "Authorization: Bearer $TOKEN"

# 5. Join a trip
curl -X POST https://carpool-functions.azurewebsites.net/api/trips/TRIP_ID/join \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "pickupLocation": "Main Street Bus Stop"
  }'

# 6. Update user profile
curl -X PUT https://carpool-functions.azurewebsites.net/api/users/profile \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "emergencyContact": "Parent: +0987654321"
  }'

# 7. Health check (no authentication required)
curl -X GET https://carpool-functions.azurewebsites.net/api/health`,
  };
}
