'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { UserRole, RolePermissions } from '../types/shared';
import { useAuthStore } from '../store/auth.store';

interface RBACContextType {
  hasPermission: (permission: keyof RolePermissions[UserRole]) => boolean;
  hasRole: (role: UserRole) => boolean;
  userRole: UserRole | null;
  permissions: RolePermissions[UserRole] | null;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

// Default permissions for each role
const defaultPermissions: RolePermissions = {
  admin: {
    platform_management: true,
    group_admin_promotion: true,
    system_configuration: true,
  },
  group_admin: {
    group_management: true,
    member_management: true,
    trip_scheduling: true,
    emergency_coordination: true,
  },
  parent: {
    trip_participation: true,
    preference_submission: true,
    child_management: true,
  },
  child: {
    schedule_viewing: true,
    safety_reporting: true,
    profile_management: true,
  },
  student: {
    schedule_viewing: true,
    safety_reporting: true,
    profile_management: true,
    trip_participation: true,
  },
  trip_admin: {
    trip_scheduling: true,
    emergency_coordination: true,
    member_management: true,
  },
};

export function RBACProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();

  const value = useMemo(() => {
    const userRole = user?.role || null;
    const permissions = userRole ? defaultPermissions[userRole] : null;

    const hasPermission = (
      permission: keyof RolePermissions[UserRole]
    ): boolean => {
      if (!userRole || !permissions) return false;
      return permissions[permission] === true;
    };

    const hasRole = (role: UserRole): boolean => {
      return userRole === role;
    };

    return {
      hasPermission,
      hasRole,
      userRole,
      permissions,
    };
  }, [user]);

  return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
}

export function useRBAC() {
  const context = useContext(RBACContext);
  if (context === undefined) {
    throw new Error('useRBAC must be used within a RBACProvider');
  }
  return context;
}

// Higher-order component for role-based access control
export function withRole<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredRole: UserRole
) {
  return function WithRoleComponent(props: P) {
    const { hasRole } = useRBAC();

    if (!hasRole(requiredRole)) {
      return null; // Or a custom access denied component
    }

    return <WrappedComponent {...props} />;
  };
}

// Higher-order component for permission-based access control
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredPermission: keyof RolePermissions[UserRole]
) {
  return function WithPermissionComponent(props: P) {
    const { hasPermission } = useRBAC();

    if (!hasPermission(requiredPermission)) {
      return null; // Or a custom access denied component
    }

    return <WrappedComponent {...props} />;
  };
}
