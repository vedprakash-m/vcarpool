import { HttpRequest } from '@azure/functions';
import { userDomainService } from '../services/domains/user-domain.service';

/**
 * UNIFIED AUTHENTICATION MIDDLEWARE
 *
 * Provides consistent authentication and authorization across all endpoints.
 * Extracts and validates JWT tokens, returning user information.
 */

export interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
  token: string;
}

export interface AuthMiddlewareResult {
  success: boolean;
  user?: AuthenticatedRequest['user'];
  message?: string;
}

/**
 * Extract and validate authentication token from request
 */
export async function authenticateRequest(request: HttpRequest): Promise<AuthMiddlewareResult> {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return {
        success: false,
        message: 'Authorization header is required',
      };
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return {
        success: false,
        message: 'Bearer token is required',
      };
    }

    // Validate the token using our unified authentication service
    const validationResult = await userDomainService.verifyToken(token);

    if (!validationResult.success || !validationResult.user) {
      return {
        success: false,
        message: validationResult.message || 'Invalid token',
      };
    }

    return {
      success: true,
      user: {
        id: validationResult.user.id,
        email: validationResult.user.email,
        role: validationResult.user.role,
        permissions: [], // TODO: Extract from user role
      },
    };
  } catch (error) {
    return {
      success: false,
      message: 'Authentication error',
    };
  }
}

/**
 * Check if user has required role(s)
 */
export function hasRole(
  user: AuthenticatedRequest['user'],
  requiredRole: string | string[],
): boolean {
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(user.role);
  }
  return user.role === requiredRole;
}

/**
 * Check if user has required permission(s)
 */
export function hasPermission(
  user: AuthenticatedRequest['user'],
  requiredPermission: string | string[],
): boolean {
  if (Array.isArray(requiredPermission)) {
    return requiredPermission.some((permission) => user.permissions.includes(permission));
  }
  return user.permissions.includes(requiredPermission);
}

/**
 * Check if user is admin (group_admin or super_admin)
 */
export function isAdmin(user: AuthenticatedRequest['user']): boolean {
  return hasRole(user, ['group_admin', 'super_admin']);
}

/**
 * Create standard authentication response helpers
 */
export const AuthResponses = {
  unauthorized: () => ({
    status: 401,
    jsonBody: {
      success: false,
      message: 'Authentication required',
    },
  }),

  forbidden: (message?: string) => ({
    status: 403,
    jsonBody: {
      success: false,
      message: message || 'Insufficient permissions',
    },
  }),

  invalidToken: () => ({
    status: 401,
    jsonBody: {
      success: false,
      message: 'Invalid or expired token',
    },
  }),
};
