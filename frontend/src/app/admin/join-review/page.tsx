'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNotifications } from '@/contexts/NotificationContext';
import { clsx } from 'clsx';

interface JoinRequest {
  id: string;
  requester: {
    firstName: string;
    lastName: string;
    email: string;
  };
  message?: string;
  status: 'pending' | 'approved' | 'denied';
  distance?: number;
  matchScore?: number;
}

interface JoinRequestsResponse {
  data: JoinRequest[];
  success: boolean;
}

const JoinReviewPage: React.FC = () => {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { notifications } = useNotifications(); // example usage

  useEffect(() => {
    const load = async () => {
      try {
        const response = await axios.get<JoinRequestsResponse>(
          '/api/admin/join-requests'
        );
        setRequests(response.data?.data ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleDecision = async (id: string, approve: boolean) => {
    try {
      await axios.post(`/api/admin/join-requests`, { id, approve });
      setRequests(prev =>
        prev.map(r =>
          r.id === id ? { ...r, status: approve ? 'approved' : 'denied' } : r
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <p className="p-4">Loading…</p>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Join Requests</h1>
      {requests.length === 0 && <p>No pending requests</p>}
      <ul className="space-y-4">
        {requests.map(req => (
          <li key={req.id} className="border rounded-lg p-4 shadow-sm bg-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900">
                  {req.requester.firstName} {req.requester.lastName}
                </p>
                <p className="text-gray-600 text-sm">{req.requester.email}</p>
                {req.message && (
                  <p className="mt-2 text-gray-700">“{req.message}”</p>
                )}
                {req.matchScore !== undefined && (
                  <p className="mt-1 text-xs text-gray-500">
                    Match Score: {req.matchScore}%
                  </p>
                )}
              </div>
              <div className="flex space-x-2">
                {req.status === 'pending' ? (
                  <>
                    <button
                      className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
                      onClick={() => handleDecision(req.id, true)}
                    >
                      Approve
                    </button>
                    <button
                      className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
                      onClick={() => handleDecision(req.id, false)}
                    >
                      Deny
                    </button>
                  </>
                ) : (
                  <span
                    className={clsx(
                      'px-2 py-1 rounded text-xs font-medium',
                      req.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    )}
                  >
                    {req.status}
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default JoinReviewPage;
