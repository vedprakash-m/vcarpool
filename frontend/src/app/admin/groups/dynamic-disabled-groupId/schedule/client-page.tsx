'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  CalendarIcon,
  UsersIcon,
  PlayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

export default function GroupSchedulePageClient() {
  const params = useParams();
  const groupId = params.groupId as string;

  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [schedule, setSchedule] = useState<any | null>(null);

  const generateSchedule = async () => {
    setGenerating(true);
    setMessage(null);

    try {
      // This will eventually call our backend API
      // const response = await fetch(`/api/admin/groups/${groupId}/schedule`, { method: 'POST' });
      // const data = await response.json();

      // Mocking the API call for now
      await new Promise(resolve => setTimeout(resolve, 2000));
      const mockData = {
        success: true,
        message: 'Schedule generated successfully!',
        schedule: {
          week: 'July 29 - August 2, 2024',
          assignments: [
            {
              date: 'Monday, July 29',
              morning: {
                driver: 'Sarah Johnson',
                passengers: ['Emma', 'Jake'],
              },
              afternoon: { driver: 'Mike Chen', passengers: ['Lily', 'Alex'] },
            },
            {
              date: 'Tuesday, July 30',
              morning: { driver: 'Lisa Davis', passengers: ['Sophie', 'Ryan'] },
              afternoon: { driver: 'Tom Wilson', passengers: ['Emma', 'Jake'] },
            },
            {
              date: 'Wednesday, July 31',
              morning: { driver: 'Mike Chen', passengers: ['Lily', 'Alex'] },
              afternoon: {
                driver: 'Sarah Johnson',
                passengers: ['Sophie', 'Ryan'],
              },
            },
            {
              date: 'Thursday, August 1',
              morning: { driver: 'Tom Wilson', passengers: ['Emma', 'Jake'] },
              afternoon: { driver: 'Lisa Davis', passengers: ['Lily', 'Alex'] },
            },
            {
              date: 'Friday, August 2',
              morning: {
                driver: 'Sarah Johnson',
                passengers: ['Sophie', 'Ryan'],
              },
              afternoon: { driver: 'Mike Chen', passengers: ['Emma', 'Jake'] },
            },
          ],
        },
      };

      setSchedule(mockData.schedule);
      setMessage({ type: 'success', text: mockData.message });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to generate schedule. Please try again.',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Weekly Schedule Generator
        </h1>
        <p className="text-gray-600">
          Generate and manage weekly carpool schedules for Group {groupId}
        </p>
      </div>

      {/* Schedule Generation Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center">
            <CalendarIcon className="h-6 w-6 mr-2 text-blue-500" />
            Generate New Schedule
          </h2>
          <button
            onClick={generateSchedule}
            disabled={generating}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center"
          >
            {generating ? (
              <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <PlayIcon className="h-5 w-5 mr-2" />
            )}
            {generating ? 'Generating...' : 'Generate Schedule'}
          </button>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg mb-4 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <div className="flex items-center">
              {message.type === 'success' ? (
                <CheckCircleIcon className="h-5 w-5 mr-2" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              )}
              {message.text}
            </div>
          </div>
        )}

        <div className="text-sm text-gray-600">
          <p>This will generate a new weekly schedule based on:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Parent preferences submitted by Saturday 10 PM</li>
            <li>Driving history and fairness balance</li>
            <li>Children&apos;s pickup/drop-off requirements</li>
            <li>Route optimization for efficiency</li>
          </ul>
        </div>
      </div>

      {/* Current Schedule Display */}
      {schedule && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <ChartBarIcon className="h-6 w-6 mr-2 text-green-500" />
            Generated Schedule: {schedule.week}
          </h2>

          <div className="space-y-4">
            {schedule.assignments.map((day: any, index: number) => (
              <div key={index} className="border rounded-lg p-4">
                <h3 className="font-medium text-lg mb-3">{day.date}</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-3 rounded">
                    <h4 className="font-medium text-blue-800 mb-2">
                      Morning (School Drop-off)
                    </h4>
                    <p className="text-sm">
                      <strong>Driver:</strong> {day.morning.driver}
                    </p>
                    <p className="text-sm">
                      <strong>Passengers:</strong>{' '}
                      {day.morning.passengers.join(', ')}
                    </p>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <h4 className="font-medium text-green-800 mb-2">
                      Afternoon (School Pickup)
                    </h4>
                    <p className="text-sm">
                      <strong>Driver:</strong> {day.afternoon.driver}
                    </p>
                    <p className="text-sm">
                      <strong>Passengers:</strong>{' '}
                      {day.afternoon.passengers.join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
