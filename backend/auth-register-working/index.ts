import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { userDomainService } from '../src/services/domains/user-domain.service';

export async function authRegisterUnified(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  context.log('Unified registration started');

  try {
    const method = request.method;

    // Handle preflight OPTIONS request
    if (method === 'OPTIONS') {
      return {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      };
    }

    if (method === 'POST') {
      const body = (await request.json()) as any;

      // Validate required fields
      if (!body.email || !body.firstName || !body.lastName || !body.role) {
        return {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            success: false,
            error: 'Missing required fields',
            message: 'Email, first name, last name, and role are required',
            timestamp: new Date().toISOString(),
          }),
        };
      }

      try {
        // Use unified domain service for registration
        const registerResult = await userDomainService.registerUser({
          email: body.email,
          firstName: body.firstName,
          lastName: body.lastName,
          role: body.role,
          password: body.password, // Optional for Entra users
          phoneNumber: body.phoneNumber,
          address: body.address,
          authProvider: body.authProvider || 'legacy',
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
        context.log('Registration failed:', error instanceof Error ? error.message : String(error));
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

    // Method not allowed
    return {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        Allow: 'POST, OPTIONS',
      },
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed',
        message: `${method} is not supported on this endpoint`,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    context.log('Registration service error:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: 'Registration service temporarily unavailable',
        timestamp: new Date().toISOString(),
      }),
    };
  }
}
