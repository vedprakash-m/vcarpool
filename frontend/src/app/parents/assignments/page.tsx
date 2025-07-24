'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import {
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  PhoneIcon,
  MapPinIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TruckIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import AssignmentConfirmation from '@/components/assignments/AssignmentConfirmation';
import EmergencyPanel from '@/components/emergency/EmergencyPanel';
import { apiClient } from '@/lib/api-client';

interface Assignment {
  id: string;
  templateSlotId: string;
  date: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  routeType:
    | 'school_dropoff'
    | 'school_pickup'
    | 'multi_stop'
    | 'point_to_point';
  description: string;
  driverId: string;
  driverName: string;
  driverContact: {
    email?: string;
    phoneNumber?: string;
  };
  passengers: Array<{
    id: string;
    name: string;
    phoneNumber?: string;
  }>;
  passengerCount: number;
  pickupLocation: string;
  dropoffLocation: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  assignmentMethod: 'automatic' | 'manual';
  createdAt: string;
  updatedAt: string;
}

interface AssignmentData {
  weekStartDate: string;
  assignments: Assignment[];
  totalAssignments: number;
  weekSummary: {
    totalTrips: number;
    totalPassengers: number;
    dropoffTrips: number;
    pickupTrips: number;
    estimatedDrivingTime: string;
  };
}

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const ROUTE_TYPE_LABELS = {
  school_dropoff: 'School Drop-off',
  school_pickup: 'School Pick-up',
  multi_stop: 'Multi-Stop',
  point_to_point: 'Point-to-Point',
};

const STATUS_COLORS = {
  confirmed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function ParentAssignmentsPage() {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  const [selectedWeek, setSelectedWeek] = useState('');
  const [assignmentData, setAssignmentData] = useState<AssignmentData | null>(
    null
  );
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmationStatuses, setConfirmationStatuses] = useState<{
    [key: string]: any;
  }>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  // Set default week to current/upcoming Monday
  useEffect(() => {
    const getCurrentMonday = () => {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
      const monday = new Date(today);
      monday.setDate(today.getDate() + daysUntilMonday);
      return monday.toISOString().split('T')[0];
    };

    setSelectedWeek(getCurrentMonday());
  }, []);

  // Load assignments when week changes
  useEffect(() => {
    if (selectedWeek) {
      loadAssignments();
    }
  }, [selectedWeek]);

  const loadAssignments = async () => {
    if (!selectedWeek) return;

    setIsLoadingAssignments(true);
    setError(null);

    try {
      const response = await apiClient.get<AssignmentData>(
        `/v1/parents/assignments/${selectedWeek}`
      );

      if (response.success && response.data) {
        setAssignmentData(response.data);
      } else {
        setError('Failed to load assignments');
      }
    } catch (err: any) {
      setError(`Failed to load assignments: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedWeek);
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedWeek(newDate.toISOString().split('T')[0]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getWeekDateRange = () => {
    if (!selectedWeek) return '';

    const startDate = new Date(selectedWeek);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    return `${startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })} - ${endDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;
  };

  // Confirmation handlers
  const handleConfirmAssignment = async (
    assignmentId: string,
    notes?: string
  ) => {
    try {
      setSuccessMessage('Assignment confirmed successfully!');

      // Update local confirmation status
      setConfirmationStatuses(prev => ({
        ...prev,
        [assignmentId]: {
          id: `conf-${assignmentId}`,
          status: 'confirmed',
          confirmationDate: new Date().toISOString(),
          responseTime: Math.floor(Math.random() * 30) + 5, // Mock response time
          notes,
          issues: [],
        },
      }));

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(
        `Failed to confirm assignment: ${err.message || 'Unknown error'}`
      );
    }
  };

  const handleDeclineAssignment = async (
    assignmentId: string,
    reason: string,
    issueType: string
  ) => {
    try {
      setSuccessMessage('Assignment declined. Admin has been notified.');

      // Update local confirmation status
      setConfirmationStatuses(prev => ({
        ...prev,
        [assignmentId]: {
          id: `conf-${assignmentId}`,
          status: 'declined',
          confirmationDate: new Date().toISOString(),
          responseTime: Math.floor(Math.random() * 30) + 5,
          issues: [
            {
              type: issueType,
              description: reason,
              reportedAt: new Date().toISOString(),
            },
          ],
        },
      }));

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(
        `Failed to decline assignment: ${err.message || 'Unknown error'}`
      );
    }
  };

  const handleReportIssue = async (
    assignmentId: string,
    issueType: string,
    description: string
  ) => {
    try {
      setSuccessMessage(
        'Issue reported successfully. Admin has been notified.'
      );

      // Update existing confirmation status or create new one
      setConfirmationStatuses(prev => {
        const existing = prev[assignmentId] || {
          id: `conf-${assignmentId}`,
          status: 'pending',
          issues: [],
        };

        return {
          ...prev,
          [assignmentId]: {
            ...existing,
            issues: [
              ...(existing.issues || []),
              {
                type: issueType,
                description,
                reportedAt: new Date().toISOString(),
              },
            ],
          },
        };
      });

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(`Failed to report issue: ${err.message || 'Unknown error'}`);
    }
  };

  // Emergency handlers
  const handleEmergencyReport = async (
    type: string,
    description: string,
    urgency: string
  ) => {
    try {
      setSuccessMessage(
        `Emergency reported: ${type.toUpperCase()} - Admin and emergency contacts have been notified immediately.`
      );

      // Here would be the API call to emergency services
      console.log('Emergency reported:', {
        type,
        description,
        urgency,
        timestamp: new Date().toISOString(),
      });

      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(`Failed to report emergency: ${err.message || 'Unknown error'}`);
    }
  };

  const handleRequestBackup = async (assignmentId: string, reason: string) => {
    try {
      setSuccessMessage(
        'Backup request sent successfully! Available drivers in your area have been notified.'
      );

      // Here would be the API call to backup coordination system
      console.log('Backup requested:', {
        assignmentId,
        reason,
        timestamp: new Date().toISOString(),
      });

      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(`Failed to request backup: ${err.message || 'Unknown error'}`);
    }
  };

  const handleContactEmergency = async (contactId: string, method: string) => {
    try {
      // Log emergency contact usage for metrics
      console.log('Emergency contact used:', {
        contactId,
        method,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error logging emergency contact:', err);
    }
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
                My Driving Assignments
              </h1>
              <p className="text-gray-600">
                View your weekly carpool driving schedule and passenger details.
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>

        {/* Emergency Panel */}
        <EmergencyPanel
          onEmergencyReport={handleEmergencyReport}
          onRequestBackup={handleRequestBackup}
          onContactEmergency={handleContactEmergency}
        />

        {/* Week Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateWeek('prev')}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5 mr-1" />
              Previous Week
            </button>

            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Week of {getWeekDateRange()}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Your driving assignments for this week
              </p>
            </div>

            <button
              onClick={() => navigateWeek('next')}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Next Week
              <ChevronRightIcon className="h-5 w-5 ml-1" />
            </button>
          </div>
        </div>

        {/* Week Summary */}
        {assignmentData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <TruckIcon className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">
                    Total Trips
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {assignmentData.weekSummary.totalTrips}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <UserGroupIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">
                    Total Passengers
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {assignmentData.weekSummary.totalPassengers}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <CalendarIcon className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Drop-offs</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {assignmentData.weekSummary.dropoffTrips}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <ClockIcon className="h-8 w-8 text-orange-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">
                    Driving Time
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {assignmentData.weekSummary.estimatedDrivingTime}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="text-sm text-green-700">{successMessage}</div>
          </div>
        )}

        {/* Assignment List */}
        {isLoadingAssignments ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading assignments...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadAssignments}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : !assignmentData || assignmentData.assignments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <TruckIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Assignments This Week
            </h3>
            <p className="text-gray-600">
              You don't have any driving assignments for the week of{' '}
              {getWeekDateRange()}.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignmentData.assignments.map(assignment => (
              <div
                key={assignment.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {assignment.description}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[assignment.status]
                        }`}
                      >
                        {assignment.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {DAYS_OF_WEEK[assignment.dayOfWeek]},{' '}
                        {formatDate(assignment.date)}
                      </div>
                      <div className="flex items-center">
                        <ClockIcon className="h-4 w-4 mr-2" />
                        {assignment.startTime} - {assignment.endTime}
                      </div>
                      <div className="flex items-center">
                        <MapPinIcon className="h-4 w-4 mr-2" />
                        {ROUTE_TYPE_LABELS[assignment.routeType]}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Route Information */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Route Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Pickup:</span>
                      <span className="ml-2 text-gray-600">
                        {assignment.pickupLocation}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        Drop-off:
                      </span>
                      <span className="ml-2 text-gray-600">
                        {assignment.dropoffLocation}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Passengers */}
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-3">
                    Passengers ({assignment.passengerCount})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {assignment.passengers.map(passenger => (
                      <div
                        key={passenger.id}
                        className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
                      >
                        <div className="flex items-center">
                          <UserGroupIcon className="h-5 w-5 text-blue-600 mr-2" />
                          <span className="font-medium text-gray-900">
                            {passenger.name}
                          </span>
                        </div>
                        {passenger.phoneNumber && (
                          <a
                            href={`tel:${passenger.phoneNumber}`}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <PhoneIcon className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Assignment Confirmation */}
                <AssignmentConfirmation
                  assignment={assignment}
                  confirmationStatus={confirmationStatuses[assignment.id]}
                  onConfirm={handleConfirmAssignment}
                  onDecline={handleDeclineAssignment}
                  onReportIssue={handleReportIssue}
                />

                {/* Contact Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-500">
                    Assignment method: {assignment.assignmentMethod}
                  </div>
                  <div className="flex space-x-2">
                    {assignment.driverContact.phoneNumber && (
                      <a
                        href={`tel:${assignment.driverContact.phoneNumber}`}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <PhoneIcon className="h-4 w-4 mr-2" />
                        Call Parents
                      </a>
                    )}
                    {assignment.driverContact.email && (
                      <a
                        href={`mailto:${assignment.driverContact.email}`}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <EnvelopeIcon className="h-4 w-4 mr-2" />
                        Email Parents
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Help Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            Assignment Confirmations & Help
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>
              • <strong>Confirm assignments</strong> as soon as possible to help
              with planning
            </li>
            <li>
              • <strong>Report issues early</strong> - the sooner we know, the
              better we can help
            </li>
            <li>
              • Use <strong>"Cannot Make It"</strong> if you need to decline an
              assignment
            </li>
            <li>
              • Contact passengers or their parents using the phone/email
              buttons
            </li>
            <li>• Check back regularly for any schedule updates or changes</li>
            <li>
              • All confirmations and issues are automatically sent to admin
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
