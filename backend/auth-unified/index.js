module.exports = function (context, req) {
  context.log('Unified authentication endpoint called');

  try {
    context.log('Processing request method:', req.method);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      context.res = {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
        },
      };
      context.done();
      return;
    }

    if (req.method !== 'POST') {
      context.res = {
        status: 405,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          message: 'Method not allowed. Use POST.',
        }),
      };
      context.done();
      return;
    }

    // Get action from query parameters
    const action = req.query.action;
    context.log('Processing action:', action);

    if (!action) {
      context.res = {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          message: 'Action parameter is required. Use ?action=login, ?action=register, etc.',
          supportedActions: [
            'login',
            'register',
            'refresh',
            'logout',
            'forgot-password',
            'reset-password',
            'change-password',
          ],
        }),
      };
      context.done();
      return;
    }

    // Parse request body
    let requestData = {};
    if (req.body) {
      try {
        requestData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      } catch (parseError) {
        context.log.error('JSON parse error:', parseError);
        context.res = {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            message: 'Invalid JSON in request body',
          }),
        };
        context.done();
        return;
      }
    }

    // Handle different authentication actions
    switch (action.toLowerCase()) {
      case 'login':
        handleLogin(context, requestData);
        break;

      case 'register':
        handleRegister(context, requestData);
        break;

      case 'refresh':
        handleRefresh(context, requestData);
        break;

      case 'logout':
        handleLogout(context, requestData);
        break;

      case 'forgot-password':
        handleForgotPassword(context, requestData);
        break;

      case 'reset-password':
        handleResetPassword(context, requestData);
        break;

      case 'change-password':
        handleChangePassword(context, requestData);
        break;

      case 'entra-login':
        handleEntraLogin(context, requestData);
        break;

      default:
        context.res = {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            message: `Unknown action: ${action}`,
            supportedActions: [
              'login',
              'register',
              'refresh',
              'logout',
              'forgot-password',
              'reset-password',
              'change-password',
            ],
          }),
        };
        context.done();
        break;
    }
  } catch (error) {
    context.log.error('Error in auth endpoint:', error);

    context.res = {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: error.message,
      }),
    };
    context.done();
  }
};

// Authentication action handlers (basic implementations for now)
function handleLogin(context, requestData) {
  context.log('Processing login request');

  const { email, password } = requestData;

  if (!email || !password) {
    context.res = {
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        message: 'Email and password are required',
      }),
    };
    context.done();
    return;
  }

  // Basic implementation - TODO: integrate with actual authentication service
  context.res = {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      success: true,
      message: 'Login endpoint working - authentication logic to be implemented',
      action: 'login',
      data: {
        email: email,
        // TODO: Generate actual JWT token
        token: 'demo_jwt_token',
        refreshToken: 'demo_refresh_token',
        user: {
          id: 'demo_user_id',
          email: email,
          name: 'Demo User',
        },
      },
    }),
  };
  context.done();
}

function handleRegister(context, requestData) {
  context.log('Processing register request');

  const { email, password, name } = requestData;

  if (!email || !password || !name) {
    context.res = {
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        message: 'Email, password, and name are required',
      }),
    };
    context.done();
    return;
  }

  // Basic implementation - TODO: integrate with actual authentication service
  context.res = {
    status: 201,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      success: true,
      message: 'Register endpoint working - user creation logic to be implemented',
      action: 'register',
      data: {
        email: email,
        name: name,
        // TODO: Generate actual JWT token
        token: 'demo_jwt_token',
        refreshToken: 'demo_refresh_token',
        user: {
          id: 'demo_user_id',
          email: email,
          name: name,
        },
      },
    }),
  };
  context.done();
}

function handleRefresh(context, requestData) {
  context.log('Processing refresh request');

  const { refreshToken } = requestData;

  if (!refreshToken) {
    context.res = {
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        message: 'Refresh token is required',
      }),
    };
    context.done();
    return;
  }

  // Basic implementation - TODO: validate refresh token and generate new access token
  context.res = {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      success: true,
      message: 'Refresh endpoint working - token validation logic to be implemented',
      action: 'refresh',
      data: {
        token: 'new_demo_jwt_token',
        refreshToken: 'new_demo_refresh_token',
      },
    }),
  };
  context.done();
}

function handleLogout(context, requestData) {
  context.log('Processing logout request');

  // Basic implementation - TODO: invalidate tokens
  context.res = {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      success: true,
      message: 'Logout endpoint working - token invalidation logic to be implemented',
      action: 'logout',
    }),
  };
  context.done();
}

function handleForgotPassword(context, requestData) {
  context.log('Processing forgot password request');

  const { email } = requestData;

  if (!email) {
    context.res = {
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        message: 'Email is required',
      }),
    };
    context.done();
    return;
  }

  // Basic implementation - TODO: send password reset email
  context.res = {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      success: true,
      message: 'Forgot password endpoint working - email sending logic to be implemented',
      action: 'forgot-password',
      data: {
        email: email,
      },
    }),
  };
  context.done();
}

function handleResetPassword(context, requestData) {
  context.log('Processing reset password request');

  const { token, newPassword } = requestData;

  if (!token || !newPassword) {
    context.res = {
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        message: 'Reset token and new password are required',
      }),
    };
    context.done();
    return;
  }

  // Basic implementation - TODO: validate reset token and update password
  context.res = {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      success: true,
      message: 'Reset password endpoint working - password update logic to be implemented',
      action: 'reset-password',
    }),
  };
  context.done();
}

function handleChangePassword(context, requestData) {
  context.log('Processing change password request');

  const { currentPassword, newPassword } = requestData;

  if (!currentPassword || !newPassword) {
    context.res = {
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        message: 'Current password and new password are required',
      }),
    };
    context.done();
    return;
  }

  // Basic implementation - TODO: validate current password and update
  context.res = {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      success: true,
      message: 'Change password endpoint working - password validation logic to be implemented',
      action: 'change-password',
    }),
  };
  context.done();
}

function handleEntraLogin(context, requestData) {
  context.log('Processing Entra ID login request');

  const { authProvider, accessToken } = requestData;

  if (!accessToken) {
    context.res = {
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        message: 'Access token is required for Entra authentication',
      }),
    };
    context.done();
    return;
  }

  // TODO: Validate the Microsoft access token and create user session
  // For now, return a mock successful response
  const mockUser = {
    id: 'entra-user-123',
    email: 'user@vedprakashmoutlook.onmicrosoft.com',
    name: 'Entra User',
    role: 'parent',
    status: 'active',
  };

  context.res = {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      success: true,
      message: 'Entra authentication successful',
      data: {
        user: mockUser,
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
      },
      action: 'entra-login',
    }),
  };
  context.done();
}
