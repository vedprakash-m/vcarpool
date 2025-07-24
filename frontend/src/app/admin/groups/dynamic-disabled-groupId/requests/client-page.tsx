'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  UserGroupIcon,
  CheckIcon,
  XMarkIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

// Mock Data
const mockRequests = [
  {
    familyId: 'family-123',
    familyName: 'The Johnson Family',
    drivingParent: {
      name: 'Sarah Johnson',
      email: 'sarah.j@example.com',
    },
    children: [
      { name: 'Emma Johnson', grade: '3rd' },
      { name: 'Jake Johnson', grade: '1st' },
    ],
    message:
      "We're excited to join! I can drive Tuesday and Thursday mornings regularly.",
    impact: {
      newCapacity: '7/8 members',
      driverChange: '+1 reliable driver',
    },
  },
  {
    familyId: 'family-456',
    familyName: 'The Chen Family',
    drivingParent: {
      name: 'Mike Chen',
      email: 'mike.c@example.com',
    },
    children: [{ name: 'Liam Chen', grade: '2nd' }],
    message: 'Looking for a reliable carpool for my son Liam.',
    impact: {
      newCapacity: '5/8 members',
      driverChange: '+1 driver',
    },
  },
];

export default function JoinRequestsPageClient() {
  const params = useParams();
  const groupId = params.groupId as string;
  const [requests, setRequests] = useState(mockRequests);

  const handleDecision = (
    familyId: string,
    decision: 'approve' | 'decline'
  ) => {
    // In a real app, this would be an API call
    console.log(`Group ${groupId}: Family ${familyId} request ${decision}d.`);
    setRequests(requests.filter(req => req.familyId !== familyId));
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">
        Pending Join Requests for Group {groupId}
      </h1>

      {requests.length === 0 ? (
        <p className="text-gray-500">No pending join requests.</p>
      ) : (
        <div className="space-y-6">
          {requests.map(req => (
            <div
              key={req.familyId}
              className="bg-white p-6 rounded-lg shadow-md border"
            >
              <h2 className="text-xl font-semibold mb-4">{req.familyName}</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-700">Family Overview</h3>
                  <p>
                    <strong>Driving Parent:</strong> {req.drivingParent.name} (
                    {req.drivingParent.email})
                  </p>
                  <p>
                    <strong>Children:</strong>{' '}
                    {req.children.map(c => `${c.name} (${c.grade})`).join(', ')}
                  </p>
                  <p className="mt-2 italic">"{req.message}"</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700">Impact on Group</h3>
                  <p>
                    <strong>New Capacity:</strong> {req.impact.newCapacity}
                  </p>
                  <p>
                    <strong>Driving Capability:</strong>{' '}
                    {req.impact.driverChange}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t flex justify-end space-x-4">
                <button
                  onClick={() => handleDecision(req.familyId, 'decline')}
                  className="btn-secondary"
                >
                  <XMarkIcon className="h-5 w-5 mr-2" />
                  Decline
                </button>
                <button
                  onClick={() => handleDecision(req.familyId, 'approve')}
                  className="btn-primary"
                >
                  <CheckIcon className="h-5 w-5 mr-2" />
                  Approve Family
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
