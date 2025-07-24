import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { UserRole } from '@carpool/shared';
import { Middleware } from './index';

export const hasRole = (allowedRoles: UserRole[]): Middleware => {
  return (
    request: HttpRequest,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: InvocationContext,
  ): Promise<HttpResponseInit | void> => {
    const user = request.auth;

    if (!user || !user.role) {
      return Promise.resolve({
        status: 401,
        jsonBody: { success: false, error: 'Unauthorized' },
      });
    }

    if (!allowedRoles.includes(user.role)) {
      return Promise.resolve({
        status: 403,
        jsonBody: { success: false, error: 'Forbidden' },
      });
    }

    // If the user has the required role, continue to the next middleware
    return Promise.resolve();
  };
};
