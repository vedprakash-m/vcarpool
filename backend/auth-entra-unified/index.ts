import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { validateEntraToken } from '../src/services/entra-auth.service';
import { VedUser } from '../../shared/src/types';

export async function authEntraUnified(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  context.log('Entra unified authentication started');

  try {
    const method = request.method;

    // Handle preflight OPTIONS request
    if (method === 'OPTIONS') {
      return {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      };
    }

    if (method === 'POST') {
      const body = (await request.json()) as any;

      // Handle Microsoft Entra ID authentication
      if (body.authProvider === 'entra' && body.accessToken) {
        try {
          // Validate Entra ID token using new service
          const authHeader = `Bearer ${body.accessToken}`;
          const vedUser: VedUser = await validateEntraToken(context, authHeader);

          // Return standardized VedUser response
          return {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
            body: JSON.stringify({
              success: true,
              user: vedUser,
              authType: 'entra',
              message: 'Microsoft Entra ID authentication successful',
              timestamp: new Date().toISOString(),
            }),
          };
        } catch (error) {
          context.log(
            'Entra authentication failed:',
            error instanceof Error ? error.message : String(error),
          );
          return {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
              success: false,
              error: 'Authentication failed',
              details: error instanceof Error ? error.message : 'Invalid or expired token',
              authType: 'entra',
              timestamp: new Date().toISOString(),
            }),
          };
        }
      }

      // Handle legacy authentication fallback
      if (body.authProvider === 'legacy' || (!body.authProvider && body.email && body.password)) {
        return {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            success: false,
            error: 'Use /api/auth-login-simple for email/password authentication',
            message: 'This endpoint is for Microsoft Entra ID authentication only',
            timestamp: new Date().toISOString(),
          }),
        };
      }

      // Invalid request format
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: 'Invalid authentication request',
          message: 'Expected authProvider: "entra" and accessToken',
          timestamp: new Date().toISOString(),
        }),
      };
    }

    // Token validation for protected routes
    if (method === 'GET') {
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            success: false,
            error: 'Missing or invalid authorization header',
            message: 'Expected "Bearer <token>" format',
            timestamp: new Date().toISOString(),
          }),
        };
      }

      try {
        // Validate the token (could be Entra ID or legacy)
        const vedUser: VedUser = await validateEntraToken(context, authHeader);

        return {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            success: true,
            user: vedUser,
            message: 'Token validation successful',
            timestamp: new Date().toISOString(),
          }),
        };
      } catch (error) {
        context.log(
          'Token validation failed:',
          error instanceof Error ? error.message : String(error),
        );
        return {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            success: false,
            error: 'Token validation failed',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          }),
        };
      }
    }

    // Method not allowed
    return {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        Allow: 'GET, POST, OPTIONS',
      },
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed',
        message: `${method} is not supported on this endpoint`,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    context.log('Authentication service error:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: 'Authentication service temporarily unavailable',
        timestamp: new Date().toISOString(),
      }),
    };
  }
}
