'use client';

import React from 'react';
import { AdminRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRBAC } from '@/contexts/RBACContext';
import { RolePermissions } from '@/types/shared';

type AdminPermissions = RolePermissions['admin'];

export default function AdminDashboard() {
  const { permissions } = useRBAC();
  const adminPermissions = permissions as AdminPermissions | null;

  return (
    <AdminRoute>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminPermissions?.platform_management && (
            <Card>
              <CardHeader>
                <CardTitle>Platform Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Manage platform settings, user roles, and system
                  configuration.
                </p>
                {/* Add platform management controls here */}
              </CardContent>
            </Card>
          )}

          {adminPermissions?.group_admin_promotion && (
            <Card>
              <CardHeader>
                <CardTitle>Group Admin Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Promote users to group admin roles and manage group
                  permissions.
                </p>
                {/* Add group admin management controls here */}
              </CardContent>
            </Card>
          )}

          {adminPermissions?.system_configuration && (
            <Card>
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Configure system-wide settings, notifications, and
                  integrations.
                </p>
                {/* Add system configuration controls here */}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminRoute>
  );
}
