'use client';

import React, { useState } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChatBubbleLeftEllipsisIcon,
} from '@heroicons/react/24/outline';

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

interface ConfirmationStatus {
  id: string;
  status: 'pending' | 'confirmed' | 'declined' | 'no_response';
  confirmationDate?: string;
  responseTime?: number;
  issues?: Array<{
    type: 'late' | 'absent' | 'route_change' | 'emergency' | 'other';
    description: string;
    reportedAt: string;
  }>;
  notes?: string;
}

interface AssignmentConfirmationProps {
  assignment: Assignment;
  confirmationStatus?: ConfirmationStatus;
  onConfirm: (assignmentId: string, notes?: string) => void;
  onDecline: (assignmentId: string, reason: string, issueType: string) => void;
  onReportIssue: (
    assignmentId: string,
    issueType: string,
    description: string
  ) => void;
  disabled?: boolean;
}

const ISSUE_TYPES = [
  {
    value: 'late',
    label: 'Running Late',
    icon: '⏰',
    color: 'text-yellow-600',
  },
  {
    value: 'absent',
    label: 'Cannot Make It',
    icon: '❌',
    color: 'text-red-600',
  },
  {
    value: 'route_change',
    label: 'Route Change Needed',
    icon: '🗺️',
    color: 'text-blue-600',
  },
  {
    value: 'emergency',
    label: 'Emergency Situation',
    icon: '🚨',
    color: 'text-red-600',
  },
  { value: 'other', label: 'Other Issue', icon: '❓', color: 'text-gray-600' },
];

export default function AssignmentConfirmation({
  assignment,
  confirmationStatus,
  onConfirm,
  onDecline,
  onReportIssue,
  disabled = false,
}: AssignmentConfirmationProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [confirmationNotes, setConfirmationNotes] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [selectedIssueType, setSelectedIssueType] = useState('');
  const [issueDescription, setIssueDescription] = useState('');

  const currentStatus = confirmationStatus?.status || 'pending';
  const isAssignmentPending = currentStatus === 'pending';
  const isAssignmentConfirmed = currentStatus === 'confirmed';
  const isAssignmentDeclined = currentStatus === 'declined';

  const handleConfirm = () => {
    onConfirm(assignment.id, confirmationNotes);
    setShowConfirmDialog(false);
    setConfirmationNotes('');
  };

  const handleDecline = () => {
    if (declineReason.trim() && selectedIssueType) {
      onDecline(assignment.id, declineReason, selectedIssueType);
      setShowDeclineDialog(false);
      setDeclineReason('');
      setSelectedIssueType('');
    }
  };

  const handleReportIssue = () => {
    if (issueDescription.trim() && selectedIssueType) {
      onReportIssue(assignment.id, selectedIssueType, issueDescription);
      setShowIssueDialog(false);
      setIssueDescription('');
      setSelectedIssueType('');
    }
  };

  const getStatusDisplay = () => {
    switch (currentStatus) {
      case 'confirmed':
        return {
          text: 'Confirmed',
          color: 'text-green-600 bg-green-50 border-green-200',
          icon: <CheckCircleIcon className="w-4 h-4" />,
        };
      case 'declined':
        return {
          text: 'Declined',
          color: 'text-red-600 bg-red-50 border-red-200',
          icon: <XCircleIcon className="w-4 h-4" />,
        };
      case 'no_response':
        return {
          text: 'No Response',
          color: 'text-gray-600 bg-gray-50 border-gray-200',
          icon: <ClockIcon className="w-4 h-4" />,
        };
      default:
        return {
          text: 'Pending Confirmation',
          color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
          icon: <ClockIcon className="w-4 h-4" />,
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="border-t border-gray-200 pt-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h4 className="text-sm font-medium text-gray-900">
            Confirmation Status
          </h4>
          <div
            className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full border text-xs font-medium ${statusDisplay.color}`}
          >
            {statusDisplay.icon}
            <span>{statusDisplay.text}</span>
          </div>
        </div>

        {confirmationStatus?.responseTime && (
          <div className="text-xs text-gray-500">
            Responded in {confirmationStatus.responseTime} minutes
          </div>
        )}
      </div>

      {/* Existing Issues */}
      {confirmationStatus?.issues && confirmationStatus.issues.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <h5 className="text-sm font-medium text-amber-800 mb-2">
            Reported Issues
          </h5>
          <div className="space-y-2">
            {confirmationStatus.issues.map((issue, index) => {
              const issueType = ISSUE_TYPES.find(t => t.value === issue.type);
              return (
                <div key={index} className="flex items-start space-x-2 text-sm">
                  <span className="text-base">{issueType?.icon}</span>
                  <div>
                    <span className="font-medium text-amber-800">
                      {issueType?.label}:
                    </span>
                    <span className="ml-2 text-amber-700">
                      {issue.description}
                    </span>
                    <div className="text-xs text-amber-600 mt-1">
                      Reported: {new Date(issue.reportedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!disabled && (
        <div className="flex flex-wrap gap-2">
          {isAssignmentPending && (
            <>
              <button
                onClick={() => setShowConfirmDialog(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
              >
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                Confirm Assignment
              </button>

              <button
                onClick={() => setShowDeclineDialog(true)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <XCircleIcon className="w-4 h-4 mr-2" />
                Cannot Make It
              </button>
            </>
          )}

          <button
            onClick={() => setShowIssueDialog(true)}
            className="inline-flex items-center px-3 py-2 border border-yellow-300 text-sm font-medium rounded-md text-yellow-700 bg-yellow-50 hover:bg-yellow-100 transition-colors"
          >
            <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
            Report Issue
          </button>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Confirm Assignment
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you ready to drive for "{assignment.description}" on{' '}
              {assignment.date} at {assignment.startTime}?
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={confirmationNotes}
                onChange={e => setConfirmationNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                rows={3}
                placeholder="Any additional information..."
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Dialog */}
      {showDeclineDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Cannot Make Assignment
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for declining *
              </label>
              <select
                value={selectedIssueType}
                onChange={e => setSelectedIssueType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Select a reason...</option>
                {ISSUE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Details *
              </label>
              <textarea
                value={declineReason}
                onChange={e => setDeclineReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                rows={3}
                placeholder="Please provide details about why you cannot make this assignment..."
                required
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleDecline}
                disabled={!declineReason.trim() || !selectedIssueType}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Submit Decline
              </button>
              <button
                onClick={() => setShowDeclineDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Report Dialog */}
      {showIssueDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Report Issue
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issue Type *
              </label>
              <select
                value={selectedIssueType}
                onChange={e => setSelectedIssueType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              >
                <option value="">Select issue type...</option>
                {ISSUE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={issueDescription}
                onChange={e => setIssueDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                rows={3}
                placeholder="Please describe the issue in detail..."
                required
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleReportIssue}
                disabled={!issueDescription.trim() || !selectedIssueType}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Report Issue
              </button>
              <button
                onClick={() => setShowIssueDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
