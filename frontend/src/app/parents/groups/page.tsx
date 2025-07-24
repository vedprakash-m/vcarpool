'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import {
  UserGroupIcon,
  AcademicCapIcon,
  MapPinIcon,
  CalendarIcon,
  UserIcon,
  CheckCircleIcon,
  ClockIcon,
  XMarkIcon,
  EnvelopeIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';

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
  members: GroupMember[];
  userRole?: 'member' | 'invited' | 'none';
  invitationId?: string;
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

export default function ParentGroupsPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();

  const [groups, setGroups] = useState<CarpoolGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<CarpoolGroup | null>(null);
  const [isLoading_groups, setIsLoading_groups] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDepartureModal, setShowDepartureModal] = useState(false);
  const [departureReason, setDepartureReason] = useState('');

  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Auth guard
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'parent')) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  // Load groups
  useEffect(() => {
    if (user?.role === 'parent') {
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
          members: [
            {
              id: 'member-1',
              userId: user?.id || '',
              name: `${user?.firstName} ${user?.lastName}`,
              email: user?.email || '',
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
          userRole: 'member',
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
          userRole: 'invited',
          invitationId: 'invite-123',
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

  const handleAcceptInvitation = async (
    groupId: string,
    invitationId: string
  ) => {
    setIsProcessing(true);
    try {
      // In production, this would call the API
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

      // Update the group status
      setGroups(prev =>
        prev.map(group =>
          group.id === groupId
            ? {
                ...group,
                userRole: 'member',
                currentMembers: group.currentMembers + 1,
                members: [
                  ...group.members,
                  {
                    id: `member-${Date.now()}`,
                    userId: user?.id || '',
                    name: `${user?.firstName} ${user?.lastName}`,
                    email: user?.email || '',
                    role: 'parent' as const,
                    joinedAt: new Date().toISOString(),
                  },
                ],
              }
            : group
        )
      );

      setMessage({
        type: 'success',
        text: '🎉 Successfully joined the carpool group!',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to accept invitation. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeclineInvitation = async (
    groupId: string,
    invitationId: string
  ) => {
    setIsProcessing(true);
    try {
      // In production, this would call the API
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call

      // Remove the group from the list
      setGroups(prev => prev.filter(group => group.id !== groupId));

      setMessage({
        type: 'info',
        text: 'Invitation declined.',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to decline invitation. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFamilyDeparture = async (group: CarpoolGroup, reason: string) => {
    setIsProcessing(true);
    try {
      // In a real app, this would be an API call
      const mockDeparture = {
        departedMembers: ['John Parent', 'Emma Parent', 'Second Parent'].map(
          name => ({ name })
        ),
      };
      // Simulate success
      setMessage({
        type: 'success',
        text: `Family departure completed. ${mockDeparture.departedMembers.length} family members removed from "${group.name}". Group Admin has been notified.`,
      });
      // Here you would also update the group state or refetch data
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Error processing family departure. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const initiateFamilyDeparture = (group: CarpoolGroup) => {
    setSelectedGroup(group);
    setShowDepartureModal(true);
  };

  const confirmFamilyDeparture = async () => {
    if (!selectedGroup) return;

    setIsProcessing(true);
    // In a real app, this would be an API call
    console.log(
      `Departing from group ${selectedGroup.id} for reason: ${departureReason}`
    );
    await new Promise(resolve => setTimeout(resolve, 1000));

    setGroups(groups.filter(g => g.id !== selectedGroup.id));
    setShowDepartureModal(false);
    setSelectedGroup(null);
    setIsProcessing(false);

    setMessage({
      type: 'success',
      text: 'You have successfully left the group.',
    });
  };

  const getStatusBadge = (userRole: string | undefined) => {
    switch (userRole) {
      case 'member':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="w-3 h-3 mr-1" />
            Member
          </span>
        );
      case 'invited':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <ClockIcon className="w-3 h-3 mr-1" />
            Invited
          </span>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user || user.role !== 'parent') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You must be a parent to access this page.
          </p>
        </div>
      </div>
    );
  }

  const memberGroups = groups.filter(group => group.userRole === 'member');
  const invitedGroups = groups.filter(group => group.userRole === 'invited');

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <UserGroupIcon className="w-8 h-8 text-blue-600 mr-3" />
            My Carpool Groups
          </h1>
          <p className="mt-2 text-gray-600">
            Manage your carpool group memberships and invitations
          </p>
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

        {/* Pending Invitations */}
        {invitedGroups.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <EnvelopeIcon className="w-5 h-5 text-yellow-600 mr-2" />
              Pending Invitations ({invitedGroups.length})
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {invitedGroups.map(group => (
                <div
                  key={group.id}
                  className="bg-white rounded-lg shadow-sm border border-yellow-200 hover:shadow-md transition-shadow"
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
                      {getStatusBadge(group.userRole)}
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
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
                        {group.schedule.days.join(', ')} at{' '}
                        {group.schedule.startTime} - {group.schedule.endTime}
                      </div>
                      <div className="flex items-center">
                        <UserIcon className="w-4 h-4 mr-2 text-gray-400" />
                        {group.currentMembers}/{group.maxMembers} members
                      </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-yellow-800">
                        <strong>
                          You've been invited to join this carpool group!
                        </strong>
                        <br />
                        Review the details above and decide whether to join.
                      </p>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={() =>
                          handleAcceptInvitation(group.id, group.invitationId!)
                        }
                        disabled={isProcessing}
                        className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <CheckCircleIcon className="w-4 h-4 mr-2" />
                        {isProcessing ? 'Joining...' : 'Accept & Join'}
                      </button>
                      <button
                        onClick={() =>
                          handleDeclineInvitation(group.id, group.invitationId!)
                        }
                        disabled={isProcessing}
                        className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <XMarkIcon className="w-4 h-4 mr-2" />
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Groups */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <UserGroupIcon className="w-5 h-5 text-blue-600 mr-2" />
            My Groups ({memberGroups.length})
          </h2>

          {isLoading_groups ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : memberGroups.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {memberGroups.map(group => (
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
                      {getStatusBadge(group.userRole)}
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
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-600">
                          ⚠️ <strong>Family Unit Policy:</strong> Leaving this
                          group will remove your entire family (parents and
                          children) from the carpool.
                        </p>
                        <div>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              initiateFamilyDeparture(group);
                            }}
                            className="btn-danger"
                            disabled={isProcessing}
                          >
                            <XMarkIcon className="h-5 w-5 mr-2" />
                            Leave Group
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <UserGroupIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No carpool groups yet
              </h3>
              <p className="text-gray-600">
                You haven't joined any carpool groups. Check for invitations
                above or contact your school admin.
              </p>
            </div>
          )}
        </div>

        {/* Group Details Modal */}
        {selectedGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                  <button
                    onClick={() => setSelectedGroup(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
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
                              {member.userId === user?.id && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 flex items-center">
                              <EnvelopeIcon className="w-3 h-3 mr-1" />
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
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            {member.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-6 border-t border-gray-200 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                      ⚠️ <strong>Family Unit Policy:</strong> Leaving this group
                      will remove your entire family (parents and children) from
                      the carpool.
                    </p>
                    <button
                      onClick={() => {
                        setShowDepartureModal(true);
                        setDepartureReason('');
                      }}
                      className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Leave Group
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Family Departure Confirmation Modal */}
        {showDepartureModal && selectedGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-2xl max-w-lg w-full">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">
                Confirm Family Departure
              </h2>
              <p className="text-red-700 bg-red-50 p-3 rounded-md border border-red-200">
                ⚠️ Important: You are about to leave "{selectedGroup.name}".
                This action will remove your entire family unit from the group.
              </p>
              <div className="mt-4">
                <p className="font-semibold">
                  The following family members will be removed:
                </p>
                <ul className="list-disc list-inside mt-2 text-gray-600">
                  {selectedGroup.members
                    .find(m => m.userId === user?.id)
                    ?.children?.map(c => <li key={c.id}>{c.name}</li>)}
                  <li>
                    {user?.firstName} {user?.lastName} (You)
                  </li>
                  {/* In a real app, you'd list the other parent too if applicable */}
                </ul>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                Departure will be effective in 48 hours to allow the Group Admin
                to adjust schedules.
              </p>
              <div className="mt-4">
                <label
                  htmlFor="departureReason"
                  className="block text-sm font-medium text-gray-700"
                >
                  Reason for leaving (optional)
                </label>
                <textarea
                  id="departureReason"
                  value={departureReason}
                  onChange={e => setDepartureReason(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  rows={3}
                  placeholder="e.g., Schedule changes - new job hours"
                ></textarea>
              </div>
              <div className="mt-6 flex justify-end space-x-4">
                <button
                  onClick={() => setShowDepartureModal(false)}
                  className="btn-secondary"
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmFamilyDeparture}
                  className="btn-danger"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Confirm Family Departure'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading_groups && groups.length === 0 && (
          <div className="text-center py-12">
            <UserGroupIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No carpool groups
            </h3>
            <p className="text-gray-600 mb-6">
              You haven't been added to any carpool groups yet. Contact your
              school administrator to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
