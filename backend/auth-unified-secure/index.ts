import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { userDomainService } from '../src/services/domains/user-domain.service';

export async function authUnifiedSecure(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  context.log('Unified secure authentication started');

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

      // Handle login request
      if (body.action === 'login' && body.email && body.password) {
        try {
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
                refreshToken: authResult.refreshToken,
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
            'Authentication failed:',
            error instanceof Error ? error.message : String(error),
          );
          return {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
              success: false,
              error: 'Authentication failed',
              details: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString(),
            }),
          };
        }
      }

      // Handle registration request
      if (body.action === 'register') {
        try {
          const registerResult = await userDomainService.registerUser({
            email: body.email,
            firstName: body.firstName,
            lastName: body.lastName,
            role: body.role,
            password: body.password,
            phoneNumber: body.phoneNumber,
            address: body.address,
            authProvider: 'legacy',
          });

          if (registerResult.success) {
            return {
              status: 201,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
              },
              body: JSON.stringify({
                success: true,
                user: registerResult.user,
                token: registerResult.token,
                refreshToken: registerResult.refreshToken,
                message: registerResult.message,
                timestamp: new Date().toISOString(),
              }),
            };
          } else {
            return {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
              body: JSON.stringify({
                success: false,
                error: 'Registration failed',
                message: registerResult.message,
                timestamp: new Date().toISOString(),
              }),
            };
          }
        } catch (error) {
          context.log(
            'Registration failed:',
            error instanceof Error ? error.message : String(error),
          );
          return {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
              success: false,
              error: 'Registration failed',
              details: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString(),
            }),
          };
        }
      }

      // Handle token refresh request
      if (body.action === 'refresh' && body.refreshToken) {
        try {
          const refreshResult = await userDomainService.refreshToken(body.refreshToken);

          if (refreshResult.success) {
            return {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
              },
              body: JSON.stringify({
                success: true,
                user: refreshResult.user,
                token: refreshResult.token,
                refreshToken: refreshResult.refreshToken,
                message: refreshResult.message,
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
                error: 'Token refresh failed',
                message: refreshResult.message,
                timestamp: new Date().toISOString(),
              }),
            };
          }
        } catch (error) {
          context.log(
            'Token refresh failed:',
            error instanceof Error ? error.message : String(error),
          );
          return {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
              success: false,
              error: 'Token refresh failed',
              details: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString(),
            }),
          };
        }
      }

      // Invalid action
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: 'Invalid action',
          message: 'Supported actions: login, register, refresh',
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
        const token = authHeader.substring(7);
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
