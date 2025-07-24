# Unified Authentication Endpoint - API Documentation

## Overview

The unified authentication endpoint consolidates all authentication operations into a single, maintainable endpoint: `/api/auth`. This replaces the fragmented authentication endpoints (`auth-login-simple`, `auth-register-working`, etc.) with a unified interface.

## Endpoint

**Base URL:** `/api/auth`  
**Method:** `POST`  
**Content-Type:** `application/json`

## Authentication Actions

All authentication operations use the same endpoint with different `action` query parameters:

### 1. User Login

**URL:** `POST /api/auth?action=login`

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**

```json
{
  "success": true,
  "user": {
    "id": "user123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "parent"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2025-07-13T10:00:00.000Z"
}
```

### 2. User Registration

**URL:** `POST /api/auth?action=register`

**Request Body:**

```json
{
  "email": "newuser@example.com",
  "password": "securePassword123",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "parent"
}
```

**Response:**

```json
{
  "success": true,
  "user": {
    "id": "user456",
    "email": "newuser@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "parent"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2025-07-13T10:00:00.000Z"
}
```

### 3. Token Refresh

**URL:** `POST /api/auth?action=refresh`

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2025-07-13T11:00:00.000Z"
}
```

### 4. User Logout

**URL:** `POST /api/auth?action=logout`

**Request Body:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**

```json
{
  "success": true,
  "message": "Logout successful"
}
```

### 5. Forgot Password

**URL:** `POST /api/auth?action=forgot-password`

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

### 6. Reset Password

**URL:** `POST /api/auth?action=reset-password`

**Request Body:**

```json
{
  "token": "password_reset_token_here",
  "newPassword": "newSecurePassword123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Password reset successful"
}
```

### 7. Change Password

**URL:** `POST /api/auth?action=change-password`

**Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body:**

```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description here"
}
```

**Common HTTP Status Codes:**

- `200` - Success
- `400` - Bad Request (missing fields, validation errors)
- `401` - Unauthorized (invalid credentials, expired token)
- `403` - Forbidden (insufficient permissions)
- `405` - Method Not Allowed
- `500` - Internal Server Error

## Migration from Legacy Endpoints

### Legacy → Unified Mapping

| Legacy Endpoint                   | Unified Equivalent                      |
| --------------------------------- | --------------------------------------- |
| `POST /api/auth-login-simple`     | `POST /api/auth?action=login`           |
| `POST /api/auth-register-working` | `POST /api/auth?action=register`        |
| `POST /api/auth-refresh-token`    | `POST /api/auth?action=refresh`         |
| `POST /api/auth-forgot-password`  | `POST /api/auth?action=forgot-password` |
| `POST /api/auth-reset-password`   | `POST /api/auth?action=reset-password`  |

### Migration Steps

1. **Update Frontend Calls:**

   ```javascript
   // OLD
   fetch('/api/auth-login-simple', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ email, password }),
   });

   // NEW
   fetch('/api/auth?action=login', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ email, password }),
   });
   ```

2. **Update API Documentation**
3. **Update E2E Tests** (see test migration guide)
4. **Test All Authentication Flows**
5. **Deploy and Monitor**

## Authentication Middleware

New authentication middleware is available at `src/middleware/auth.middleware.ts`:

```typescript
import {
  authenticateRequest,
  hasRole,
  isAdmin,
  AuthResponses,
} from '../middleware/auth.middleware';

export async function protectedFunction(request: HttpRequest, context: InvocationContext) {
  // Authenticate the request
  const authResult = await authenticateRequest(request);

  if (!authResult.success) {
    return AuthResponses.unauthorized();
  }

  // Check permissions
  if (!isAdmin(authResult.user)) {
    return AuthResponses.forbidden('Admin access required');
  }

  // Continue with protected logic...
}
```

## Benefits

1. **Single Source of Truth:** All authentication logic in one place
2. **Consistent Interface:** Same request/response format for all auth operations
3. **Better Error Handling:** Standardized error responses
4. **Easier Testing:** One endpoint to test all auth flows
5. **Simpler Maintenance:** Unified codebase reduces complexity
6. **Type Safety:** Full TypeScript support with unified types

## Security Features

- JWT token-based authentication
- Secure password hashing with bcrypt
- Token expiration and refresh
- Input validation and sanitization
- Rate limiting (can be added at API gateway level)
- CORS support with configurable origins
