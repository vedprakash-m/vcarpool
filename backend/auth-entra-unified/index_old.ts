import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { validateEntraToken } from '../src/services/entra-auth.service';
import { AuthService } from '../src/services/auth.service';
import { VedUser } from '../../shared/src/types';

export async function authEntraUnified(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  context.log('Entra unified authentication started');

  try {
    const method = request.method;

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
          context.log.error('Entra authentication failed:', error.message);
          return {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
              success: false,
              error: 'Authentication failed',
              details: error.message,
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
        context.log.error('Token validation failed:', error.message);
        return {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            success: false,
            error: 'Token validation failed',
            details: error.message,
            timestamp: new Date().toISOString(),
          }),
        };
      }
    }
      }

      const token = authHeader.substring(7);

      // Try Entra External ID validation first
      try {
        const entraUser = await entraAuthService.validateEntraToken(token);
        if (entraUser) {
          const user = await entraAuthService.syncUserWithDatabase(entraUser);

          return {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: true,
              user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                authProvider: 'entra',
              },
            }),
          };
        }
      } catch (error) {
        context.log('Entra token validation failed, trying legacy:', error.message);
      }

      // For legacy token validation, we'll need to use existing middleware
      // This endpoint focuses on Entra authentication
      return {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          error: 'Invalid token - use existing auth endpoints for legacy tokens',
        }),
      };
    }

    return {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed',
      }),
    };
  } catch (error) {
    context.error('Authentication service error:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: 'Authentication service error',
      }),
    };
  }
}
