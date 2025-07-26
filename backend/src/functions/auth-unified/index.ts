import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { userDomainService } from '../../services/domains/user-domain.service';
import { CreateUserRequest } from '@carpool/shared';

// Use the domain service's AuthResult type for now
type AuthResult = import('../../services/domains/user-domain.service').AuthResult;

/**
 * UNIFIED AUTHENTICATION ENDPOINT
 *
 * Single endpoint handling all authentication operations:
 * - POST /api/auth?action=login - User login
 * - POST /api/auth?action=register - User registration
 * - POST /api/auth?action=refresh - Token refresh
 * - POST /api/auth?action=logout - User logout
 * - POST /api/auth?action=forgot-password - Password reset request
 * - POST /api/auth?action=reset-password - Password reset confirmation
 * - POST /api/auth?action=change-password - Password change
 * - POST /api/auth?action=entra-login - Microsoft Entra ID login
 *
 * This consolidates all authentication functionality into a single,
 * maintainable endpoint using our unified authentication architecture.
 */
export async function authUnified(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  context.log('Unified authentication endpoint called');
  context.log(`Method: ${request.method}`);
  context.log(`URL: ${request.url}`);

  try {
    const method = request.method;
    const origin = request.headers.get('origin');
    
    context.log(`Processing request - Method: ${method}, Origin: ${origin}`);
    
    // Define allowed origins
    const allowedOrigins = [
      'https://carpool.vedprakash.net',
      'https://lively-stone-016bfa20f.6.azurestaticapps.net',
      'http://localhost:3000'
    ];
    
    // Check if origin is allowed - handle null/undefined case
    const isAllowedOrigin = origin && allowedOrigins.includes(origin);
    
    // Create CORS headers
    const corsHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (isAllowedOrigin) {
      corsHeaders['Access-Control-Allow-Origin'] = origin;
      corsHeaders['Access-Control-Allow-Credentials'] = 'true';
    }
    
    // Handle preflight OPTIONS request
    if (method === 'OPTIONS') {
      context.log('Handling OPTIONS preflight request');
      context.log(`Origin: ${origin}, Allowed: ${isAllowedOrigin}`);
      
      if (isAllowedOrigin) {
        return {
          status: 200,
          headers: {
            ...corsHeaders,
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Max-Age': '86400',
          },
          body: '',
        };
      } else {
        return {
          status: 403,
          headers: corsHeaders,
          jsonBody: { error: 'Origin not allowed' },
        };
      }
    }

    context.log('Continuing with main function logic');

    if (method !== 'POST') {
      return {
        status: 405,
        jsonBody: {
          success: false,
          message: 'Method not allowed. Use POST.',
        },
        headers: corsHeaders,
      };
    }

    // Get action from query parameter
    const action = request.query.get('action');
    if (!action) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          message: 'Missing required query parameter: action',
          supportedActions: [
            'login',
            'register',
            'refresh',
            'logout',
            'forgot-password',
            'reset-password',
            'change-password',
            'entra-login',
          ],
        },
        headers: corsHeaders,
      };
    }

    const body = (await request.json()) as any;

    let result: AuthResult;

    switch (action) {
      case 'login':
        result = await handleLogin(body, context);
        break;

      case 'register':
        result = await handleRegister(body, context);
        break;

      case 'refresh':
        result = await handleRefresh(body, context);
        break;

      case 'logout':
        result = await handleLogout(body, context);
        break;

      case 'forgot-password':
        result = await handleForgotPassword(body, context);
        break;

      case 'reset-password':
        result = await handleResetPassword(body, context);
        break;

      case 'change-password':
        result = await handleChangePassword(body, request, context);
        break;

      case 'entra-login':
        result = await handleEntraLogin(body, context);
        break;

      default:
        return {
          status: 400,
          jsonBody: {
            success: false,
            message: `Unsupported action: ${action}`,
            supportedActions: [
              'login',
              'register',
              'refresh',
              'logout',
              'forgot-password',
              'reset-password',
              'change-password',
              'entra-login',
            ],
          },
          headers: corsHeaders,
        };
    }

    // Get CORS headers from context (set by middleware)
    context.log('CORS headers from context:', corsHeaders);

    return {
      status: result.success ? 200 : 400,
      jsonBody: result,
      headers: corsHeaders,
    };
  } catch (error) {
    context.error('Unified auth error:', error);
    
    // Create basic CORS headers for error response
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      'https://carpool.vedprakash.net',
      'https://lively-stone-016bfa20f.6.azurestaticapps.net',
      'http://localhost:3000'
    ];
    const isAllowedOrigin = origin && allowedOrigins.includes(origin);
    
    const errorCorsHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (isAllowedOrigin) {
      errorCorsHeaders['Access-Control-Allow-Origin'] = origin;
      errorCorsHeaders['Access-Control-Allow-Credentials'] = 'true';
    }
    
    return {
      status: 500,
      jsonBody: {
        success: false,
        message: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      headers: errorCorsHeaders,
    };
  }
}

/**
 * Handle user login
 */
async function handleLogin(body: any, context: InvocationContext): Promise<AuthResult> {
  context.log('Processing login request');

  if (!body.email || !body.password) {
    return {
      success: false,
      message: 'Email and password are required',
    };
  }

  return await userDomainService.authenticateUser({
    email: body.email,
    password: body.password,
  });
}

/**
 * Handle user registration
 */
async function handleRegister(body: any, context: InvocationContext): Promise<AuthResult> {
  context.log('Processing registration request');

  const requiredFields = ['email', 'firstName', 'lastName', 'role', 'password'];
  for (const field of requiredFields) {
    if (!body[field]) {
      return {
        success: false,
        message: `Missing required field: ${field}`,
      };
    }
  }

  const createUserRequest: CreateUserRequest = {
    email: body.email,
    firstName: body.firstName,
    lastName: body.lastName,
    role: body.role,
    password: body.password,
  };

  return await userDomainService.registerUser(createUserRequest);
}

/**
 * Handle token refresh
 */
async function handleRefresh(body: any, context: InvocationContext): Promise<AuthResult> {
  context.log('Processing token refresh request');

  if (!body.refreshToken) {
    return {
      success: false,
      message: 'Refresh token is required',
    };
  }

  return await userDomainService.refreshToken(body.refreshToken);
}

/**
 * Handle user logout
 */
async function handleLogout(body: any, context: InvocationContext): Promise<AuthResult> {
  context.log('Processing logout request');

  if (!body.token) {
    return {
      success: false,
      message: 'Token is required for logout',
    };
  }

  // For now, return success as we don't have token blacklisting implemented
  // In the future, this could invalidate the token on the server side
  return {
    success: true,
    message: 'Logout successful',
  };
}

/**
 * Handle forgot password request
 */
async function handleForgotPassword(body: any, context: InvocationContext): Promise<AuthResult> {
  context.log('Processing forgot password request');

  if (!body.email) {
    return {
      success: false,
      message: 'Email is required',
    };
  }

  return await userDomainService.requestPasswordReset(body.email);
}

/**
 * Handle password reset confirmation
 */
async function handleResetPassword(body: any, context: InvocationContext): Promise<AuthResult> {
  context.log('Processing password reset request');

  if (!body.token || !body.newPassword) {
    return {
      success: false,
      message: 'Reset token and new password are required',
    };
  }

  return await userDomainService.resetPassword(body.token, body.newPassword);
}

/**
 * Handle password change
 */
async function handleChangePassword(
  body: any,
  request: HttpRequest,
  context: InvocationContext,
): Promise<AuthResult> {
  context.log('Processing password change request');

  if (!body.currentPassword || !body.newPassword) {
    return {
      success: false,
      message: 'Current password and new password are required',
    };
  }

  // Extract user ID from Authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return {
      success: false,
      message: 'Authorization header is required',
    };
  }

  // For now, we'll need to decode the token to get the user ID
  // This could be improved with proper middleware
  try {
    const token = authHeader.replace('Bearer ', '');
    return await userDomainService.changePassword(token, body.currentPassword, body.newPassword);
  } catch (error) {
    return {
      success: false,
      message: 'Invalid authorization token',
    };
  }
}

/**
 * Handle Microsoft Entra ID login
 */
async function handleEntraLogin(body: any, context: InvocationContext): Promise<AuthResult> {
  context.log('Processing Entra ID login request');

  if (!body.accessToken) {
    return {
      success: false,
      message: 'Access token is required for Entra ID authentication',
    };
  }

  try {
    // Use the userDomainService to authenticate with the Entra token
    return await userDomainService.authenticateUser(body.accessToken);
  } catch (error) {
    context.error('Entra ID authentication failed:', error);
    return {
      success: false,
      message: 'Microsoft Entra ID authentication failed',
    };
  }
}
