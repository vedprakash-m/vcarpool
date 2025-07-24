'use client';

import React, { useState } from 'react';
import {
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

interface Assignment {
  id: string;
  date: string;
  dayOfWeek: string;
  time: string;
  currentDriverId: string;
  currentDriverName: string;
  canReassign: boolean;
}

interface DrivingParent {
  id: string;
  name: string;
  email: string;
  canDrive: boolean;
  availability: string[];
  assignedTrips: Assignment[];
}

interface FamilyData {
  familyId: string;
  children: Array<{ name: string; grade: string }>;
  parents: DrivingParent[];
  totalTripsAssigned: number;
  fairShareTrips: number;
}

interface DualDrivingParentDashboardProps {
  familyData?: FamilyData;
  onReassignTrip?: (
    assignmentId: string,
    fromParentId: string,
    toParentId: string,
    reason?: string
  ) => void;
}

export default function DualDrivingParentDashboard({
  familyData,
  onReassignTrip,
}: DualDrivingParentDashboardProps) {
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);
  const [reassignmentReason, setReassignmentReason] = useState('');
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Mock data
  const mockFamily: FamilyData = {
    familyId: 'family-johnson',
    children: [
      { name: 'Emma Johnson', grade: '2nd Grade' },
      { name: 'Jake Johnson', grade: '5th Grade' },
    ],
    parents: [
      {
        id: 'parent-sarah',
        name: 'Sarah Johnson',
        email: 'sarah.j@example.com',
        canDrive: true,
        availability: ['monday', 'wednesday', 'friday'],
        assignedTrips: [
          {
            id: 'assignment-1',
            date: '2025-01-15',
            dayOfWeek: 'Monday',
            time: '7:45 AM',
            currentDriverId: 'parent-sarah',
            currentDriverName: 'Sarah Johnson',
            canReassign: true,
          },
        ],
      },
      {
        id: 'parent-mike',
        name: 'Mike Johnson',
        email: 'mike.j@example.com',
        canDrive: true,
        availability: ['tuesday', 'thursday'],
        assignedTrips: [
          {
            id: 'assignment-2',
            date: '2025-01-18',
            dayOfWeek: 'Thursday',
            time: '7:45 AM',
            currentDriverId: 'parent-mike',
            currentDriverName: 'Mike Johnson',
            canReassign: true,
          },
        ],
      },
    ],
    totalTripsAssigned: 2,
    fairShareTrips: 2,
  };

  const family = familyData || mockFamily;
  const drivingParents = family.parents.filter(p => p.canDrive);

  const handleReassignClick = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setReassignmentReason('');
    setShowReassignModal(true);
  };

  const handleReassignConfirm = async (toParentId: string) => {
    if (!selectedAssignment) return;

    setProcessing(true);
    try {
      if (onReassignTrip) {
        await onReassignTrip(
          selectedAssignment.id,
          selectedAssignment.currentDriverId,
          toParentId,
          reassignmentReason
        );
      }
      setShowReassignModal(false);
      setSelectedAssignment(null);
    } catch (error) {
      console.error('Reassignment failed:', error);
    } finally {
      setProcessing(false);
    }
  };

  const getOtherParent = (currentParentId: string) => {
    return drivingParents.find(p => p.id !== currentParentId);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Family Driving Coordination
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Manage driving assignments between{' '}
          {family.parents
            .filter(p => p.canDrive)
            .map(p => p.name.split(' ')[0])
            .join(' and ')}
        </p>
      </div>

      {/* Family Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Children</h3>
          {family.children.map((child, index) => (
            <p key={index} className="text-sm text-blue-800">
              {child.name} ({child.grade})
            </p>
          ))}
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <h3 className="font-medium text-green-900 mb-2">Fair Share</h3>
          <p className="text-2xl font-bold text-green-800">
            {family.fairShareTrips} trips/week
          </p>
          <p className="text-sm text-green-700">
            Based on {family.children.length} child
            {family.children.length !== 1 ? 'ren' : ''}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">Current Load</h3>
          <p className="text-2xl font-bold text-gray-800">
            {family.totalTripsAssigned} trips
          </p>
          <p className="text-sm text-gray-600">
            {family.totalTripsAssigned === family.fairShareTrips
              ? '✅ Meeting fair share'
              : family.totalTripsAssigned > family.fairShareTrips
                ? '⚠️ Above fair share'
                : '📉 Below fair share'}
          </p>
        </div>
      </div>

      {/* Driving Parents Status */}
      <div className="space-y-6">
        {drivingParents.map(parent => (
          <div
            key={parent.id}
            className="border border-gray-200 rounded-lg p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium text-gray-900">{parent.name}</h3>
                <p className="text-sm text-gray-600">
                  Available:{' '}
                  {parent.availability
                    .map(day => day.charAt(0).toUpperCase() + day.slice(1))
                    .join(', ')}
                </p>
              </div>
              <div className="text-right">
                <span className="text-lg font-semibold text-gray-900">
                  {parent.assignedTrips.length} trip
                  {parent.assignedTrips.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {parent.assignedTrips.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  No trips assigned
                </p>
              ) : (
                parent.assignedTrips.map(assignment => {
                  const otherParent = getOtherParent(parent.id);
                  return (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <CalendarIcon className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {assignment.dayOfWeek},{' '}
                            {new Date(assignment.date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600 flex items-center">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            {assignment.time}
                          </p>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        {assignment.canReassign && otherParent && (
                          <button
                            onClick={() => handleReassignClick(assignment)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center"
                          >
                            <ArrowPathIcon className="h-4 w-4 mr-1" />
                            Reassign to {otherParent.name.split(' ')[0]}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Reassignment Modal */}
      {showReassignModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reassign Trip
            </h3>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Current assignment:</strong>
              </p>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium text-gray-900">
                  {selectedAssignment.dayOfWeek},{' '}
                  {new Date(selectedAssignment.date).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600">
                  {selectedAssignment.time} • Currently:{' '}
                  {selectedAssignment.currentDriverName}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for reassignment (optional)
              </label>
              <textarea
                value={reassignmentReason}
                onChange={e => setReassignmentReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="e.g., Schedule conflict, better availability..."
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Family Reassignment</p>
                  <p>
                    This change will notify the entire group automatically. No
                    approval needed since it's within your family.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowReassignModal(false)}
                disabled={processing}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              {drivingParents
                .filter(p => p.id !== selectedAssignment.currentDriverId)
                .map(otherParent => (
                  <button
                    key={otherParent.id}
                    onClick={() => handleReassignConfirm(otherParent.id)}
                    disabled={processing}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                  >
                    {processing ? (
                      <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckIcon className="h-4 w-4 mr-2" />
                    )}
                    Assign to {otherParent.name.split(' ')[0]}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Info Panel */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">
          💡 Dual Driving Parent Benefits
        </h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>
            • Trip load distributed fairly based on number of children (not
            parents)
          </li>
          <li>• Either parent can drive your family's assigned trips</li>
          <li>• Reassignments between spouses notify group automatically</li>
          <li>• External swaps with other families still require approval</li>
        </ul>
      </div>
    </div>
  );
}
