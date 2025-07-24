'use client';

import React from 'react';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { UserRole, RolePermissions } from '@/types/shared';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredPermission?: keyof RolePermissions[UserRole];
  fallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
  fallback,
}: ProtectedRouteProps) {
  const { isAuthorized } = useProtectedRoute({
    requiredRole,
    requiredPermission,
  });

  if (!isAuthorized) {
    return fallback || null;
  }

  return <>{children}</>;
}

// Convenience components for common role-based routes
export function AdminRoute({
  children,
  fallback,
}: Omit<ProtectedRouteProps, 'requiredRole'>) {
  return (
    <ProtectedRoute requiredRole="admin" fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

export function GroupAdminRoute({
  children,
  fallback,
}: Omit<ProtectedRouteProps, 'requiredRole'>) {
  return (
    <ProtectedRoute requiredRole="group_admin" fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

export function ParentRoute({
  children,
  fallback,
}: Omit<ProtectedRouteProps, 'requiredRole'>) {
  return (
    <ProtectedRoute requiredRole="parent" fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

export function ChildRoute({
  children,
  fallback,
}: Omit<ProtectedRouteProps, 'requiredRole'>) {
  return (
    <ProtectedRoute requiredRole="child" fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}
