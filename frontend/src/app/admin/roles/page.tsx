'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import {
  UserPlusIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ShieldCheckIcon,
  UsersIcon,
  ExclamationTriangleIcon,
  ArrowUpOnSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { UserRole } from '@/types/shared';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActiveDriver?: boolean;
  homeAddress?: string;
  createdAt: string;
  updatedAt: string;
}

interface RoleChange {
  from: string;
  to: string;
  userId: string;
  timestamp: string;
}

export default function RoleManagementPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [eligibleParents, setEligibleParents] = useState<User[]>([]);
  const [currentAdmins, setCurrentAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Redirect if not super admin
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
      fetchEligibleParents();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('carpool_token');
      const response = await fetch('/api/admin/roles', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.data.users);
      } else {
        setMessage({
          type: 'error',
          text: 'Failed to fetch users',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Error fetching users',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEligibleParents = async () => {
    try {
      const token = localStorage.getItem('carpool_token');
      const response = await fetch(
        '/api/admin/roles?action=eligible-group-admins',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setEligibleParents(data.data.eligibleParents);
      }
    } catch (error) {
      console.error('Error fetching eligible parents:', error);
    }
  };

  const promoteUser = async (userId: string, newRole: string) => {
    setPromoting(userId);
    setMessage(null);

    try {
      const token = localStorage.getItem('carpool_token');
      const response = await fetch('/api/admin/roles?action=promote', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          newRole,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({
          type: 'success',
          text: data.data.message,
        });

        // Refresh users list
        await fetchUsers();
        await fetchEligibleParents();
      } else {
        const errorData = await response.json();
        setMessage({
          type: 'error',
          text: errorData.error.message,
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Error updating user role',
      });
    } finally {
      setPromoting(null);
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'group_admin':
        return 'bg-purple-100 text-purple-800';
      case 'parent':
        return 'bg-blue-100 text-blue-800';
      case 'child':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Super Admin';
      case 'group_admin':
        return 'Group Admin';
      case 'parent':
        return 'Parent';
      case 'child':
        return 'Child';
      default:
        return role;
    }
  };

  const canPromoteToGroupAdmin = (user: User) => {
    return user.role === 'parent' && user.isActiveDriver;
  };

  const canDemoteFromGroupAdmin = (user: User) => {
    return user.role === 'group_admin';
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You must be a Super Administrator to access role management.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <ShieldCheckIcon className="h-8 w-8 mr-3 text-blue-600" />
            Role Management
          </h1>
          <p className="text-gray-600 mt-2">
            Promote parents to Group Admin and manage user roles across the
            platform
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-md ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <p
              className={`text-sm ${
                message.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}
            >
              {message.text}
            </p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Eligible Parents for Group Admin */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <UserPlusIcon className="h-6 w-6 mr-2 text-purple-600" />
              Promote to Group Admin
            </h2>
            <p className="text-gray-600 mb-4">
              Parents eligible for Group Admin role (active drivers)
            </p>

            {eligibleParents.length === 0 ? (
              <p className="text-gray-500 italic">No eligible parents found</p>
            ) : (
              <div className="space-y-3">
                {eligibleParents.map(parent => (
                  <div
                    key={parent.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {parent.firstName} {parent.lastName}
                      </p>
                      <p className="text-sm text-gray-600">{parent.email}</p>
                      {parent.homeAddress && (
                        <p className="text-xs text-gray-500">
                          {parent.homeAddress}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => promoteUser(parent.id, 'group_admin')}
                      disabled={promoting === parent.id}
                      className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center"
                    >
                      {promoting === parent.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Promoting...
                        </>
                      ) : (
                        <>
                          <ArrowUpOnSquareIcon className="h-4 w-4 mr-1" />
                          Promote
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Current Group Admins */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <UsersIcon className="h-6 w-6 mr-2 text-purple-600" />
              Current Group Admins
            </h2>
            <p className="text-gray-600 mb-4">
              Users currently in Group Admin role
            </p>

            {users.filter(u => u.role === 'group_admin').length === 0 ? (
              <p className="text-gray-500 italic">No Group Admins found</p>
            ) : (
              <div className="space-y-3">
                {users
                  .filter(u => u.role === 'group_admin')
                  .map(groupAdmin => (
                    <div
                      key={groupAdmin.id}
                      className="flex items-center justify-between p-3 border border-purple-200 rounded-lg bg-purple-50"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {groupAdmin.firstName} {groupAdmin.lastName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {groupAdmin.email}
                        </p>
                        {groupAdmin.homeAddress && (
                          <p className="text-xs text-gray-500">
                            {groupAdmin.homeAddress}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => promoteUser(groupAdmin.id, 'parent')}
                        disabled={promoting === groupAdmin.id}
                        className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center"
                      >
                        {promoting === groupAdmin.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Demoting...
                          </>
                        ) : (
                          <>
                            <ChevronDownIcon className="h-4 w-4 mr-1" />
                            Demote
                          </>
                        )}
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* All Users Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">All Users</h2>
            <p className="text-gray-600 mt-1">
              Complete list of all users with their current roles
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Driver Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(
                          user.role
                        )}`}
                      >
                        {getRoleDisplayName(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.role === 'parent' || user.role === 'group_admin' ? (
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.isActiveDriver
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {user.isActiveDriver ? 'Active Driver' : 'Non-Driver'}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        {canPromoteToGroupAdmin(user) && (
                          <button
                            onClick={() => promoteUser(user.id, 'group_admin')}
                            disabled={promoting === user.id}
                            className="text-purple-600 hover:text-purple-900 text-sm font-medium disabled:opacity-50"
                          >
                            {promoting === user.id
                              ? 'Promoting...'
                              : '→ Group Admin'}
                          </button>
                        )}
                        {canDemoteFromGroupAdmin(user) && (
                          <button
                            onClick={() => promoteUser(user.id, 'parent')}
                            disabled={promoting === user.id}
                            className="text-gray-600 hover:text-gray-900 text-sm font-medium disabled:opacity-50"
                          >
                            {promoting === user.id ? 'Demoting...' : '→ Parent'}
                          </button>
                        )}
                        {user.role !== 'admin' &&
                          user.role !== 'group_admin' &&
                          user.role !== 'parent' && (
                            <span className="text-gray-400 text-sm">
                              No actions
                            </span>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
