'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import {
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  PhoneIcon,
  EnvelopeIcon,
  PlusIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api-client';

interface SwapRequest {
  id: string;
  originalAssignmentId: string;
  requestingDriverId: string;
  requestingDriver: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  };
  receivingDriverId: string;
  receivingDriver: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  };
  requestedDate: string;
  requestMessage: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  responseMessage?: string;
  createdAt: string;
  updatedAt: string;
  respondedAt?: string;
  originalAssignment: {
    description: string;
    startTime: string;
    endTime: string;
    routeType: string;
  };
}

interface SwapRequestData {
  swapRequests: SwapRequest[];
  total: number;
  filters: {
    status?: string;
    userId?: string;
    adminView?: boolean;
  };
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  accepted: 'bg-green-100 text-green-800 border-green-200',
  declined: 'bg-red-100 text-red-800 border-red-200',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
};

const STATUS_ICONS = {
  pending: ExclamationTriangleIcon,
  accepted: CheckIcon,
  declined: XMarkIcon,
  cancelled: XMarkIcon,
};

export default function SwapRequestsPage() {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Authentication check
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user)) {
      router.push('/login');
      return;
    }

    if (!isLoading && user?.role !== 'parent' && user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
  }, [isAuthenticated, isLoading, user, router]);

  // Load swap requests
  useEffect(() => {
    if (user?.id) {
      loadSwapRequests();
    }
  }, [user?.id, selectedStatus]);

  const loadSwapRequests = async () => {
    if (!user?.id) return;

    setIsLoadingRequests(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        userId: user.id,
      });

      if (selectedStatus !== 'all') {
        params.append('status', selectedStatus);
      }

      const response = await apiClient.get<SwapRequestData>(
        `/v1/swap-requests?${params.toString()}`
      );

      if (response.success && response.data) {
        setSwapRequests(response.data.swapRequests);
      } else {
        setError('Failed to load swap requests');
      }
    } catch (err: any) {
      setError(
        `Failed to load swap requests: ${err.message || 'Unknown error'}`
      );
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleSwapAction = async (
    swapId: string,
    action: 'accept' | 'decline',
    responseMessage?: string
  ) => {
    try {
      const response = await apiClient.put(`/v1/swap-requests/${swapId}`, {
        action,
        responseMessage: responseMessage || '',
      });

      if (response.success) {
        // Refresh the list
        await loadSwapRequests();
      } else {
        setError(`Failed to ${action} swap request`);
      }
    } catch (err: any) {
      setError(
        `Failed to ${action} swap request: ${err.message || 'Unknown error'}`
      );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getRequestsByStatus = (status: string) => {
    if (status === 'all') return swapRequests;
    return swapRequests.filter(req => req.status === status);
  };

  const isUserRequestReceiver = (request: SwapRequest) => {
    return request.receivingDriverId === user?.id;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <div>Redirecting to login...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Swap Requests
              </h1>
              <p className="text-gray-600">
                Manage your carpool assignment swap requests and responses.
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Request Swap
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              {[
                {
                  key: 'all',
                  label: 'All Requests',
                  count: swapRequests.length,
                },
                {
                  key: 'pending',
                  label: 'Pending',
                  count: getRequestsByStatus('pending').length,
                },
                {
                  key: 'accepted',
                  label: 'Accepted',
                  count: getRequestsByStatus('accepted').length,
                },
                {
                  key: 'declined',
                  label: 'Declined',
                  count: getRequestsByStatus('declined').length,
                },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedStatus(tab.key)}
                  className={`py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                    selectedStatus === tab.key
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                        selectedStatus === tab.key
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Swap Requests List */}
        {isLoadingRequests ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading swap requests...</p>
          </div>
        ) : getRequestsByStatus(selectedStatus).length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {selectedStatus === 'all'
                ? 'No Swap Requests'
                : `No ${selectedStatus} Requests`}
            </h3>
            <p className="text-gray-600 mb-4">
              {selectedStatus === 'all'
                ? "You haven't created or received any swap requests yet."
                : `You don't have any ${selectedStatus} swap requests.`}
            </p>
            {selectedStatus === 'all' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Your First Swap Request
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {getRequestsByStatus(selectedStatus).map(request => {
              const StatusIcon = STATUS_ICONS[request.status];
              const isReceiver = isUserRequestReceiver(request);
              const otherDriver = isReceiver
                ? request.requestingDriver
                : request.receivingDriver;

              return (
                <div
                  key={request.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {request.originalAssignment.description}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            STATUS_COLORS[request.status]
                          }`}
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {request.status.charAt(0).toUpperCase() +
                            request.status.slice(1)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {formatDate(request.requestedDate)}
                        </div>
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-2" />
                          {request.originalAssignment.startTime} -{' '}
                          {request.originalAssignment.endTime}
                        </div>
                        <div className="flex items-center">
                          <UserGroupIcon className="h-4 w-4 mr-2" />
                          {isReceiver
                            ? 'Swap Request Received'
                            : 'Swap Request Sent'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Other Driver Info */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">
                      {isReceiver ? 'Requesting Driver' : 'Receiving Driver'}
                    </h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {otherDriver.firstName} {otherDriver.lastName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {otherDriver.email}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <a
                          href={`tel:${otherDriver.phoneNumber}`}
                          className="p-2 text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <PhoneIcon className="h-4 w-4" />
                        </a>
                        <a
                          href={`mailto:${otherDriver.email}`}
                          className="p-2 text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <EnvelopeIcon className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="space-y-3 mb-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <h5 className="font-medium text-blue-900 mb-1">
                        Request Message:
                      </h5>
                      <p className="text-sm text-blue-800">
                        {request.requestMessage || 'No message provided'}
                      </p>
                    </div>

                    {request.responseMessage && (
                      <div
                        className={`border rounded-lg p-3 ${
                          request.status === 'accepted'
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <h5
                          className={`font-medium mb-1 ${
                            request.status === 'accepted'
                              ? 'text-green-900'
                              : 'text-red-900'
                          }`}
                        >
                          Response Message:
                        </h5>
                        <p
                          className={`text-sm ${
                            request.status === 'accepted'
                              ? 'text-green-800'
                              : 'text-red-800'
                          }`}
                        >
                          {request.responseMessage}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                      {request.status === 'pending'
                        ? `Created ${formatDateTime(request.createdAt)}`
                        : `${
                            request.status.charAt(0).toUpperCase() +
                            request.status.slice(1)
                          } ${formatDateTime(
                            request.respondedAt || request.updatedAt
                          )}`}
                    </div>

                    {isReceiver && request.status === 'pending' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() =>
                            handleSwapAction(request.id, 'decline')
                          }
                          className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 transition-colors"
                        >
                          <XMarkIcon className="h-4 w-4 mr-2" />
                          Decline
                        </button>
                        <button
                          onClick={() => handleSwapAction(request.id, 'accept')}
                          className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                        >
                          <CheckIcon className="h-4 w-4 mr-2" />
                          Accept
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Help Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            How Swap Requests Work
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>
              • <strong>Create a request:</strong> Ask another parent to swap
              assignments with you
            </li>
            <li>
              • <strong>Respond to requests:</strong> Accept or decline swap
              requests from other parents
            </li>
            <li>
              • <strong>Contact directly:</strong> Use phone/email buttons to
              coordinate with other parents
            </li>
            <li>
              • <strong>Admin oversight:</strong> All approved swaps are tracked
              by school administration
            </li>
          </ul>
        </div>
      </div>

      {/* TODO: Create Swap Request Modal will be implemented next */}
    </div>
  );
}
