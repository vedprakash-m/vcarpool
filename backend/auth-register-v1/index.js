const { userDomainService } = require('../src/services/domains/user-domain.service');

module.exports = async function authRegisterV1(context, req) {
  context.log('v1/auth/register endpoint called');

  try {
    const method = req.method;

    // Handle preflight OPTIONS request
    if (method === 'OPTIONS') {
      context.res = {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      };
      return;
    }

    if (method === 'POST') {
      const body = req.body;
      context.log('Registration request body:', {
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        passwordLength: body.password?.length,
      });

      // Validate required fields
      if (!body.email || !body.password || !body.firstName || !body.lastName) {
        context.res = {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            success: false,
            message: 'Email, password, first name, and last name are required',
          }),
        };
        return;
      }

      try {
        // Use the existing unified domain service for user registration
        const registrationResult = await userDomainService.registerUser({
          email: body.email,
          password: body.password,
          firstName: body.firstName,
          lastName: body.lastName,
          phoneNumber: body.phoneNumber,
          role: body.role || 'PARENT', // Default to PARENT role
        });

        if (registrationResult.success) {
          context.log('Registration successful for:', body.email);

          context.res = {
            status: 201,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
              success: true,
              user: registrationResult.user,
              token: registrationResult.token,
              refreshToken: registrationResult.refreshToken,
              message: registrationResult.message || 'Registration successful',
            }),
          };
        } else {
          context.log(
            'Registration failed for:',
            body.email,
            'Reason:',
            registrationResult.message,
          );

          context.res = {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
              success: false,
              message: registrationResult.message || 'Registration failed',
            }),
          };
        }
      } catch (registrationError) {
        context.log('Registration error:', registrationError);

        context.res = {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            success: false,
            message: 'Registration service error',
          }),
        };
      }
    } else {
      // Method not allowed
      context.res = {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          message: 'Method not allowed',
        }),
      };
    }
  } catch (error) {
    context.log('Unexpected error in auth-register-v1:', error);

    context.res = {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        message: 'Internal server error',
      }),
    };
  }
};
