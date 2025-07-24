'use client';

import {
  CalendarIcon,
  UsersIcon,
  PlayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ArrowPathIcon,
  ClockIcon,
  UserGroupIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline';
import { FC } from 'react';

// Mock data structures
interface TodayAssignment {
  childName: string;
  groupName: string;
  isDriving: boolean;
  pickupTime: string;
  details: string;
}

interface FamilyStats {
  daysDriven: number;
  daysPassenger: number;
  reliability: number;
  communityScore: number;
}

interface UpcomingDeadline {
  id: string;
  text: string;
  dueDate: string;
}

// Mock Data
const todayAssignments: TodayAssignment[] = [
  {
    childName: 'Emma (2nd)',
    groupName: 'Lincoln Elementary Morning Riders',
    isDriving: true,
    pickupTime: '7:45 AM',
    details: 'in 35 min | 3 kids total',
  },
  {
    childName: 'Tommy (5th)',
    groupName: 'Lincoln Afternoon Club',
    isDriving: false,
    pickupTime: '4:00 PM',
    details: 'Mike is driving',
  },
];

const familyStats: FamilyStats = {
  daysDriven: 15,
  daysPassenger: 12,
  reliability: 98,
  communityScore: 4.8,
};

const upcomingDeadlines: UpcomingDeadline[] = [
  {
    id: '1',
    text: "Submit Emma's preferences",
    dueDate: 'Due Sat 10 PM',
  },
  {
    id: '2',
    text: "Tommy's group swap response needed",
    dueDate: 'Due Sun 5 PM',
  },
];

const UnifiedFamilyDashboard: FC = () => {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Johnson Family Dashboard
        </h1>
        <p className="text-gray-600">
          Good morning, Sarah! Here's your family's carpool status:
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content: Assignments and Deadlines */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Assignments */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              📅 Today (Monday, January 15)
            </h2>
            <div className="space-y-4">
              {todayAssignments.map((assignment, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg shadow-sm border-l-4 ${
                    assignment.isDriving
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-green-500 bg-green-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-900">
                        {assignment.isDriving ? '🚗' : '👥'}{' '}
                        {assignment.childName} -{' '}
                        {assignment.isDriving
                          ? "You're driving"
                          : "You're a passenger"}
                      </p>
                      <p className="text-sm text-gray-600">
                        {assignment.groupName}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Pickup: {assignment.pickupTime} ({assignment.details})
                      </p>
                    </div>
                    {assignment.isDriving ? (
                      <div className="flex space-x-2">
                        <button className="btn-secondary-sm">View Route</button>
                        <button className="btn-secondary-sm">
                          Contact Group
                        </button>
                      </div>
                    ) : (
                      <button className="btn-secondary-sm">
                        Contact Driver
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              ⚡ Upcoming Deadlines
            </h2>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <ul className="divide-y divide-gray-200">
                {upcomingDeadlines.map(deadline => (
                  <li
                    key={deadline.id}
                    className="py-3 flex justify-between items-center"
                  >
                    <p className="text-gray-700">{deadline.text}</p>
                    <span className="text-sm font-medium text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
                      {deadline.dueDate}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Sidebar: Quick Actions and Stats */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              🎯 Quick Family Actions
            </h2>
            <div className="grid grid-cols-3 gap-2">
              <button className="btn-secondary text-center p-2">
                Preferences
              </button>
              <button className="btn-secondary text-center p-2">
                Emergency
              </button>
              <button className="btn-secondary text-center p-2">
                Calendar
              </button>
            </div>
          </div>

          {/* Family Stats */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              📊 Family Carpool Stats
            </h2>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {familyStats.daysDriven}
                  </p>
                  <p className="text-sm text-gray-600">Days Driven</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {familyStats.daysPassenger}
                  </p>
                  <p className="text-sm text-gray-600">Days Passenger</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {familyStats.reliability}%
                  </p>
                  <p className="text-sm text-gray-600">Reliability</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {familyStats.communityScore}/5
                  </p>
                  <p className="text-sm text-gray-600">Community Score</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedFamilyDashboard;
