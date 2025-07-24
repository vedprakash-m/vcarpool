'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  UserGroupIcon,
  PlusIcon,
  EnvelopeIcon,
  MapPinIcon,
  CalendarIcon,
  UserIcon,
  PhoneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  AcademicCapIcon,
  CogIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Dialog } from '@headlessui/react';
import { toast } from 'react-hot-toast';

interface CarpoolGroup {
  id: string;
  name: string;
  description: string;
  school: string;
  pickupLocation: string;
  dropoffLocation: string;
  maxMembers: number;
  currentMembers: number;
  status: 'active' | 'pending' | 'inactive';
  schedule: {
    days: string[];
    startTime: string;
    endTime: string;
  };
  createdAt: string;
  adminId: string;
  members: GroupMember[];
  invitations: GroupInvitation[];
}

interface GroupMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: 'parent' | 'student';
  joinedAt: string;
  children?: {
    id: string;
    name: string;
    grade: string;
  }[];
}

interface GroupInvitation {
  id: string;
  email: string;
  name: string;
  role: 'parent' | 'student';
  status: 'pending' | 'accepted' | 'declined';
  sentAt: string;
  expiresAt: string;
}

interface CreateGroupForm {
  name: string;
  description: string;
  school: string;
  pickupLocation: string;
  dropoffLocation: string;
  maxMembers: number;
  schedule: {
    days: string[];
    startTime: string;
    endTime: string;
  };
}

interface InviteForm {
  emails: string;
  message: string;
}

export default function AdminGroupsPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();

  // State management
  const [groups, setGroups] = useState<CarpoolGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<CarpoolGroup | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [isLoading_groups, setIsLoading_groups] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [groupToLeave, setGroupToLeave] = useState<CarpoolGroup | null>(null);

  // Form data
  const [createForm, setCreateForm] = useState<CreateGroupForm>({
    name: '',
    description: '',
    school: '',
    pickupLocation: '',
    dropoffLocation: '',
    maxMembers: 8,
    schedule: {
      days: [],
      startTime: '07:30',
      endTime: '08:30',
    },
  });

  const [inviteForm, setInviteForm] = useState<InviteForm>({
    emails: '',
    message: '',
  });

  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Auth guard
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  // Load groups
  useEffect(() => {
    if (user?.role === 'admin') {
      loadGroups();
    }
  }, [user]);

  const loadGroups = async () => {
    try {
      setIsLoading_groups(true);
      // For now, use mock data - in production this would call the API
      const mockGroups: CarpoolGroup[] = [
        {
          id: 'group-1',
          name: 'Lincoln Elementary Morning Carpool',
          description:
            'Daily morning drop-off carpool for Lincoln Elementary School',
          school: 'Lincoln Elementary School',
          pickupLocation: 'Maple Street Neighborhood',
          dropoffLocation: 'Lincoln Elementary School',
          maxMembers: 8,
          currentMembers: 5,
          status: 'active',
          schedule: {
            days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            startTime: '07:30',
            endTime: '08:30',
          },
          createdAt: '2025-01-01T00:00:00Z',
          adminId: user?.id || '',
          members: [
            {
              id: 'member-1',
              userId: 'parent-1',
              name: 'Sarah Johnson',
              email: 'sarah.j@example.com',
              role: 'parent',
              joinedAt: '2025-01-01T00:00:00Z',
              children: [
                { id: 'child-1', name: 'Emma Johnson', grade: '3rd' },
                { id: 'child-2', name: 'Jake Johnson', grade: '1st' },
              ],
            },
            {
              id: 'member-2',
              userId: 'parent-2',
              name: 'Michael Chen',
              email: 'm.chen@example.com',
              role: 'parent',
              joinedAt: '2025-01-02T00:00:00Z',
              children: [{ id: 'child-3', name: 'Lucas Chen', grade: '2nd' }],
            },
          ],
          invitations: [
            {
              id: 'invite-1',
              email: 'new.parent@example.com',
              name: 'Jennifer Davis',
              role: 'parent',
              status: 'pending',
              sentAt: '2025-01-05T00:00:00Z',
              expiresAt: '2025-01-12T00:00:00Z',
            },
          ],
        },
        {
          id: 'group-2',
          name: 'Lincoln Elementary Afternoon Pickup',
          description:
            'Daily afternoon pickup carpool for Lincoln Elementary School',
          school: 'Lincoln Elementary School',
          pickupLocation: 'Lincoln Elementary School',
          dropoffLocation: 'Oak Avenue Neighborhood',
          maxMembers: 6,
          currentMembers: 3,
          status: 'active',
          schedule: {
            days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            startTime: '15:00',
            endTime: '16:00',
          },
          createdAt: '2025-01-02T00:00:00Z',
          adminId: user?.id || '',
          members: [
            {
              id: 'member-3',
              userId: 'parent-3',
              name: 'Jennifer Davis',
              email: 'j.davis@example.com',
              role: 'parent',
              joinedAt: '2025-01-02T00:00:00Z',
              children: [{ id: 'child-4', name: 'Sophie Davis', grade: '4th' }],
            },
          ],
          invitations: [],
        },
      ];
      setGroups(mockGroups);
    } catch (error) {
      console.error('Error loading groups:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load carpool groups',
      });
    } finally {
      setIsLoading_groups(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      // Validate form
      if (
        !createForm.name ||
        !createForm.school ||
        !createForm.pickupLocation
      ) {
        throw new Error('Please fill in all required fields');
      }

      if (createForm.schedule.days.length === 0) {
        throw new Error('Please select at least one day');
      }

      // In production, this would call the API
      const newGroup: CarpoolGroup = {
        id: `group-${Date.now()}`,
        name: createForm.name,
        description: createForm.description,
        school: createForm.school,
        pickupLocation: createForm.pickupLocation,
        dropoffLocation: createForm.dropoffLocation,
        maxMembers: createForm.maxMembers,
        currentMembers: 0,
        status: 'active',
        schedule: createForm.schedule,
        createdAt: new Date().toISOString(),
        adminId: user?.id || '',
        members: [],
        invitations: [],
      };

      setGroups(prev => [newGroup, ...prev]);
      setShowCreateForm(false);
      setCreateForm({
        name: '',
        description: '',
        school: '',
        pickupLocation: '',
        dropoffLocation: '',
        maxMembers: 8,
        schedule: {
          days: [],
          startTime: '07:30',
          endTime: '08:30',
        },
      });

      setMessage({
        type: 'success',
        text: `🎉 Carpool group "${newGroup.name}" created successfully!`,
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to create group',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleInviteUsers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;

    setIsInviting(true);

    try {
      const emails = inviteForm.emails
        .split('\n')
        .map(email => email.trim())
        .filter(email => email.length > 0);

      if (emails.length === 0) {
        throw new Error('Please enter at least one email address');
      }

      // Validate emails
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = emails.filter(email => !emailRegex.test(email));
      if (invalidEmails.length > 0) {
        throw new Error(`Invalid email addresses: ${invalidEmails.join(', ')}`);
      }

      // In production, this would call the API
      const newInvitations: GroupInvitation[] = emails.map(email => ({
        id: `invite-${Date.now()}-${Math.random()}`,
        email,
        name: email.split('@')[0].replace(/[._]/g, ' '),
        role: 'parent' as const,
        status: 'pending' as const,
        sentAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }));

      // Update the selected group
      setGroups(prev =>
        prev.map(group =>
          group.id === selectedGroup.id
            ? {
                ...group,
                invitations: [...group.invitations, ...newInvitations],
              }
            : group
        )
      );

      // Update selected group
      setSelectedGroup(prev =>
        prev
          ? {
              ...prev,
              invitations: [...prev.invitations, ...newInvitations],
            }
          : null
      );

      setShowInviteForm(false);
      setInviteForm({ emails: '', message: '' });

      setMessage({
        type: 'success',
        text: `📧 Sent ${emails.length} invitation(s) to join "${selectedGroup.name}"`,
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error ? error.message : 'Failed to send invitations',
      });
    } finally {
      setIsInviting(false);
    }
  };

  const toggleDay = (day: string) => {
    setCreateForm(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        days: prev.schedule.days.includes(day)
          ? prev.schedule.days.filter(d => d !== day)
          : [...prev.schedule.days, day],
      },
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="w-3 h-3 mr-1" />
            Active
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <ClockIcon className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <XCircleIcon className="w-3 h-3 mr-1" />
            Inactive
          </span>
        );
      default:
        return null;
    }
  };

  const getInviteStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Pending
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Accepted
          </span>
        );
      case 'declined':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Declined
          </span>
        );
      default:
        return null;
    }
  };

  const handleLeaveGroup = (group: CarpoolGroup) => {
    setGroupToLeave(group);
    setShowLeaveConfirm(true);
  };

  const confirmLeaveGroup = async () => {
    if (!groupToLeave) return;

    toast.loading(`Leaving ${groupToLeave.name}...`);
    // Mock API call
    await new Promise(res => setTimeout(res, 1500));
    toast.dismiss();
    toast.success(`Your family has left the group: ${groupToLeave.name}`);

    setShowLeaveConfirm(false);
    setGroupToLeave(null);
    // Here you would also refetch the groups list
  };

  if (isLoading) {
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
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You must be an administrator to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <UserGroupIcon className="w-8 h-8 text-blue-600 mr-3" />
                Carpool Groups
              </h1>
              <p className="mt-2 text-gray-600">
                Create and manage carpool groups for your school community
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Create Group
            </button>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : message.type === 'error'
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : 'bg-blue-50 border border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span>{message.text}</span>
              <button
                onClick={() => setMessage(null)}
                className="ml-4 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Groups List */}
        {isLoading_groups ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {groups.map(group => (
              <div
                key={group.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedGroup(group)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {group.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {group.description}
                      </p>
                    </div>
                    {getStatusBadge(group.status)}
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <AcademicCapIcon className="w-4 h-4 mr-2 text-gray-400" />
                      {group.school}
                    </div>
                    <div className="flex items-center">
                      <MapPinIcon className="w-4 h-4 mr-2 text-gray-400" />
                      {group.pickupLocation} → {group.dropoffLocation}
                    </div>
                    <div className="flex items-center">
                      <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                      {group.schedule.days.join(', ')}
                    </div>
                    <div className="flex items-center">
                      <UserIcon className="w-4 h-4 mr-2 text-gray-400" />
                      {group.currentMembers}/{group.maxMembers} members
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex space-x-2">
                      <Link
                        href={`/admin/groups/${group.id}/schedule`}
                        className="p-2 text-gray-500 hover:text-blue-600"
                        title="Manage Schedule"
                      >
                        <CogIcon className="w-5 h-5" />
                      </Link>
                      <Link
                        href={`/admin/groups/${group.id}/requests`}
                        className="p-2 text-gray-500 hover:text-yellow-600"
                        title="Join Requests"
                      >
                        <ClipboardDocumentCheckIcon className="w-5 h-5" />
                      </Link>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedGroup(group);
                          setShowInviteForm(true);
                        }}
                        className="p-2 text-gray-500 hover:text-green-600"
                        title="Invite Members"
                      >
                        <EnvelopeIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-start">
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => handleLeaveGroup(group)}
                        className="text-sm font-medium text-red-600 hover:text-red-800"
                      >
                        Leave Group
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Group Details Modal */}
        {selectedGroup && !showInviteForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedGroup.name}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {selectedGroup.description}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowInviteForm(true)}
                      className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                    >
                      <EnvelopeIcon className="w-4 h-4 mr-2" />
                      Invite
                    </button>
                    <button
                      onClick={() => setSelectedGroup(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XCircleIcon className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Group Info */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Group Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <AcademicCapIcon className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <span className="text-sm text-gray-500">School:</span>
                          <div className="text-gray-900">
                            {selectedGroup.school}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <MapPinIcon className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <span className="text-sm text-gray-500">Route:</span>
                          <div className="text-gray-900">
                            {selectedGroup.pickupLocation} →{' '}
                            {selectedGroup.dropoffLocation}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <CalendarIcon className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <span className="text-sm text-gray-500">
                            Schedule:
                          </span>
                          <div className="text-gray-900">
                            {selectedGroup.schedule.days.join(', ')} at{' '}
                            {selectedGroup.schedule.startTime} -{' '}
                            {selectedGroup.schedule.endTime}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <UserIcon className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <span className="text-sm text-gray-500">
                            Capacity:
                          </span>
                          <div className="text-gray-900">
                            {selectedGroup.currentMembers}/
                            {selectedGroup.maxMembers} members
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Members */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Members ({selectedGroup.members.length})
                    </h3>
                    <div className="space-y-3">
                      {selectedGroup.members.map(member => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <div className="font-medium text-gray-900">
                              {member.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {member.email}
                            </div>
                            {member.children && member.children.length > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                Children:{' '}
                                {member.children
                                  .map(c => `${c.name} (${c.grade})`)
                                  .join(', ')}
                              </div>
                            )}
                          </div>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {member.role}
                          </span>
                        </div>
                      ))}
                      {selectedGroup.members.length === 0 && (
                        <p className="text-gray-500 text-center py-4">
                          No members yet. Send invitations to get started!
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Invitations */}
                {selectedGroup.invitations.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Pending Invitations ({selectedGroup.invitations.length})
                    </h3>
                    <div className="space-y-2">
                      {selectedGroup.invitations.map(invitation => (
                        <div
                          key={invitation.id}
                          className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                        >
                          <div>
                            <div className="font-medium text-gray-900">
                              {invitation.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {invitation.email}
                            </div>
                            <div className="text-xs text-gray-500">
                              Sent{' '}
                              {new Date(invitation.sentAt).toLocaleDateString()}
                            </div>
                          </div>
                          {getInviteStatusBadge(invitation.status)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Create Group Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Create Carpool Group
                  </h2>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircleIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleCreateGroup} className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Group Name *
                    </label>
                    <input
                      type="text"
                      value={createForm.name}
                      onChange={e =>
                        setCreateForm(prev => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Lincoln Elementary Morning Carpool"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      School *
                    </label>
                    <input
                      type="text"
                      value={createForm.school}
                      onChange={e =>
                        setCreateForm(prev => ({
                          ...prev,
                          school: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Lincoln Elementary School"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={createForm.description}
                    onChange={e =>
                      setCreateForm(prev => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe the purpose and details of this carpool group..."
                  />
                </div>

                {/* Locations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pickup Location *
                    </label>
                    <input
                      type="text"
                      value={createForm.pickupLocation}
                      onChange={e =>
                        setCreateForm(prev => ({
                          ...prev,
                          pickupLocation: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Maple Street Neighborhood"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Drop-off Location *
                    </label>
                    <input
                      type="text"
                      value={createForm.dropoffLocation}
                      onChange={e =>
                        setCreateForm(prev => ({
                          ...prev,
                          dropoffLocation: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Lincoln Elementary School"
                      required
                    />
                  </div>
                </div>

                {/* Schedule */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule *
                  </label>
                  <div className="space-y-4">
                    <div>
                      <span className="text-sm text-gray-600 mb-2 block">
                        Days:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          'Monday',
                          'Tuesday',
                          'Wednesday',
                          'Thursday',
                          'Friday',
                        ].map(day => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDay(day)}
                            className={`px-3 py-1 text-sm rounded-lg border ${
                              createForm.schedule.days.includes(day)
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={createForm.schedule.startTime}
                          onChange={e =>
                            setCreateForm(prev => ({
                              ...prev,
                              schedule: {
                                ...prev.schedule,
                                startTime: e.target.value,
                              },
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={createForm.schedule.endTime}
                          onChange={e =>
                            setCreateForm(prev => ({
                              ...prev,
                              schedule: {
                                ...prev.schedule,
                                endTime: e.target.value,
                              },
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Max Members */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Members
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="20"
                    value={createForm.maxMembers}
                    onChange={e =>
                      setCreateForm(prev => ({
                        ...prev,
                        maxMembers: parseInt(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? 'Creating...' : 'Create Group'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Invite Users Modal */}
        {showInviteForm && selectedGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Invite to "{selectedGroup.name}"
                  </h2>
                  <button
                    onClick={() => setShowInviteForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircleIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleInviteUsers} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Addresses *
                  </label>
                  <textarea
                    value={inviteForm.emails}
                    onChange={e =>
                      setInviteForm(prev => ({
                        ...prev,
                        emails: e.target.value,
                      }))
                    }
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter email addresses, one per line:&#10;parent1@example.com&#10;parent2@example.com&#10;parent3@example.com"
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Enter one email address per line. Parents will receive an
                    invitation to join this carpool group.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Personal Message (Optional)
                  </label>
                  <textarea
                    value={inviteForm.message}
                    onChange={e =>
                      setInviteForm(prev => ({
                        ...prev,
                        message: e.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add a personal message to the invitation..."
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Invitation Preview
                  </h4>
                  <div className="text-sm text-blue-800">
                    <p className="mb-2">
                      <strong>Subject:</strong> Invitation to join "
                      {selectedGroup.name}"
                    </p>
                    <p className="mb-2">
                      You've been invited to join the "{selectedGroup.name}"
                      carpool group at {selectedGroup.school}.
                    </p>
                    <p className="mb-2">
                      <strong>Schedule:</strong>{' '}
                      {selectedGroup.schedule.days.join(', ')} from{' '}
                      {selectedGroup.schedule.startTime} to{' '}
                      {selectedGroup.schedule.endTime}
                    </p>
                    <p className="mb-2">
                      <strong>Route:</strong> {selectedGroup.pickupLocation} →{' '}
                      {selectedGroup.dropoffLocation}
                    </p>
                    {inviteForm.message && (
                      <p className="mb-2">
                        <strong>Personal Message:</strong> {inviteForm.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowInviteForm(false)}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isInviting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isInviting ? 'Sending...' : 'Send Invitations'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading_groups && groups.length === 0 && (
          <div className="text-center py-12">
            <UserGroupIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No carpool groups yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first carpool group to start organizing families
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Create Your First Group
            </button>
          </div>
        )}

        {showLeaveConfirm && groupToLeave && (
          <Dialog
            as="div"
            className="relative z-10"
            onClose={() => setShowLeaveConfirm(false)}
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 flex items-center"
                  >
                    <ExclamationTriangleIcon className="w-6 h-6 mr-2 text-red-600" />
                    Confirm Family Departure
                  </Dialog.Title>
                  <div className="mt-4">
                    <p className="text-sm text-gray-600">
                      You are about to leave the group:{' '}
                      <strong>{groupToLeave.name}</strong>.
                    </p>
                    <p className="mt-2 text-sm text-gray-600">
                      The following family members will be removed along with
                      you:
                    </p>
                    <ul className="mt-2 list-disc list-inside text-sm text-gray-800 bg-gray-50 p-3 rounded-md">
                      {/* This is mock data, would come from auth store / user context */}
                      <li>Sarah Johnson (You - Driving Parent)</li>
                      <li>Mike Johnson (Spouse)</li>
                      <li>Emma Johnson (Child)</li>
                    </ul>
                    <p className="mt-4 text-sm text-gray-500">
                      Are you sure you want to proceed? This action cannot be
                      undone.
                    </p>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowLeaveConfirm(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={confirmLeaveGroup}
                    >
                      Yes, Leave Group
                    </button>
                  </div>
                </Dialog.Panel>
              </div>
            </div>
          </Dialog>
        )}
      </div>
    </div>
  );
}
