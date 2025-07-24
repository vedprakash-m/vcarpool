import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRBAC } from '../contexts/RBACContext';
import { useAuthStore } from '../store/auth.store';
import { UserRole, RolePermissions } from '../types/shared';

interface ProtectedRouteOptions {
  requiredRole?: UserRole;
  requiredPermission?: keyof RolePermissions[UserRole];
  redirectTo?: string;
}

export function useProtectedRoute({
  requiredRole,
  requiredPermission,
  redirectTo = '/unauthorized',
}: ProtectedRouteOptions = {}) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { hasRole, hasPermission } = useRBAC();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (requiredRole && !hasRole(requiredRole)) {
      router.push(redirectTo);
      return;
    }

    if (requiredPermission && !hasPermission(requiredPermission)) {
      router.push(redirectTo);
      return;
    }
  }, [
    isAuthenticated,
    requiredRole,
    requiredPermission,
    hasRole,
    hasPermission,
    router,
    redirectTo,
  ]);

  return {
    isAuthorized:
      isAuthenticated &&
      (!requiredRole || hasRole(requiredRole)) &&
      (!requiredPermission || hasPermission(requiredPermission)),
  };
}
