import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { userDomainService } from '../src/services/domains/user-domain.service';

export async function authLoginSimple(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  context.log('Legacy authentication started');

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

      // Handle password-based authentication
      if (body.email && body.password) {
        try {
          // Use unified domain service for authentication
          const authResult = await userDomainService.authenticateUser({
            email: body.email,
            password: body.password,
          });

          if (authResult.success) {
            return {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
              },
              body: JSON.stringify({
                success: true,
                user: authResult.user,
                token: authResult.token,
                authType: 'legacy',
                message: authResult.message,
                timestamp: new Date().toISOString(),
              }),
            };
          } else {
            return {
              status: 401,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
              body: JSON.stringify({
                success: false,
                error: 'Authentication failed',
                message: authResult.message,
                timestamp: new Date().toISOString(),
              }),
            };
          }
        } catch (error) {
          context.log(
            'Legacy authentication failed:',
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
              details: error instanceof Error ? error.message : 'Invalid credentials',
              authType: 'legacy',
              timestamp: new Date().toISOString(),
            }),
          };
        }
      }

      // Handle Entra ID authentication fallback
      if (body.authProvider === 'entra' && body.accessToken) {
        return {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            success: false,
            error: 'Use /api/auth-entra-unified for Microsoft Entra ID authentication',
            message: 'This endpoint is for email/password authentication only',
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
          message: 'Expected email and password',
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
        // Extract token from Bearer header
        const token = authHeader.substring(7);

        // Validate the token using unified service
        const verifyResult = await userDomainService.verifyToken(token);

        if (verifyResult.valid && verifyResult.user) {
          return {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
              success: true,
              user: {
                id: verifyResult.user.id,
                email: verifyResult.user.email,
                name: `${verifyResult.user.firstName} ${verifyResult.user.lastName}`,
                firstName: verifyResult.user.firstName,
                lastName: verifyResult.user.lastName,
                role: verifyResult.user.role,
              },
              message: 'Token validation successful',
              timestamp: new Date().toISOString(),
            }),
          };
        } else {
          return {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
              success: false,
              error: 'Token validation failed',
              message: verifyResult.message,
              timestamp: new Date().toISOString(),
            }),
          };
        }
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
