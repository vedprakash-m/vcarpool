'use client';

import React, { useState } from 'react';
import {
  TruckIcon as CarIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  StarIcon,
} from '@heroicons/react/24/outline';

interface FirstWeekSimulationProps {
  onNext: () => void;
  onPrevious: () => void;
  onComplete: () => void;
}

export default function FirstWeekSimulation({
  onNext,
  onPrevious,
  onComplete,
}: FirstWeekSimulationProps) {
  const [currentTab, setCurrentTab] = useState<'assignments' | 'swaps'>(
    'assignments'
  );

  const sampleAssignment = {
    date: 'Monday, Jan 8th',
    time: '7:30 AM',
    type: 'Drop-off',
    route: 'Route A',
    passengers: [
      {
        name: 'Emma Johnson',
        grade: '3rd',
        parent: 'Sarah Johnson',
        phone: '(555) 123-4567',
      },
      {
        name: 'Alex Chen',
        grade: '3rd',
        parent: 'Lisa Chen',
        phone: '(555) 234-5678',
      },
    ],
  };

  const sampleSwapRequest = {
    from: 'Lisa Chen',
    originalDate: 'Wednesday, Jan 10th - 3:00 PM',
    requestedDate: 'Monday, Jan 8th - 7:30 AM',
    reason: 'Doctor appointment came up',
    status: 'pending',
  };

  const handleComplete = () => {
    onComplete();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <StarIcon className="w-8 h-8 text-purple-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          How It All Works Together
        </h3>
        <p className="text-gray-600">
          Let's see examples of assignments and coordination in action.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setCurrentTab('assignments')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            currentTab === 'assignments'
              ? 'bg-white text-purple-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📋 Assignment Example
        </button>
        <button
          onClick={() => setCurrentTab('swaps')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            currentTab === 'swaps'
              ? 'bg-white text-purple-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🔄 Swap Request Example
        </button>
      </div>

      {/* Assignment Example */}
      {currentTab === 'assignments' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <CarIcon className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">
                    Your Assignment
                  </h4>
                  <p className="text-sm text-gray-600">
                    {sampleAssignment.date} at {sampleAssignment.time}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full">
                {sampleAssignment.type}
              </span>
            </div>

            <div className="bg-orange-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-orange-900">
                  Route: {sampleAssignment.route}
                </span>
                <span className="text-sm text-orange-700">
                  {sampleAssignment.passengers.length} passengers
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="font-medium text-gray-900">
                Passengers & Contacts:
              </h5>
              {sampleAssignment.passengers.map((passenger, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {passenger.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {passenger.grade} Grade • Parent: {passenger.parent}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                      📞 Call
                    </button>
                    <button className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">
                      ✉️ Email
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">
              💡 What happens next?
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>
                • You'll receive a 24-hour reminder email before your assignment
              </li>
              <li>• A 2-hour reminder will be sent on the day of driving</li>
              <li>• Contact information is provided for easy coordination</li>
              <li>
                • If plans change, you can create a swap request with other
                parents
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Swap Request Example */}
      {currentTab === 'swaps' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <ChatBubbleLeftRightIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">
                    Swap Request from {sampleSwapRequest.from}
                  </h4>
                  <p className="text-sm text-gray-600">Received 2 hours ago</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                Pending
              </span>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-2">
                  Swap Details:
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">
                      They want to give you:
                    </span>
                    <p className="font-medium text-gray-900">
                      {sampleSwapRequest.originalDate}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">In exchange for your:</span>
                    <p className="font-medium text-gray-900">
                      {sampleSwapRequest.requestedDate}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Reason:</span> "
                  {sampleSwapRequest.reason}"
                </p>
              </div>

              <div className="flex space-x-3">
                <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  ✅ Accept Swap
                </button>
                <button className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                  ❌ Decline
                </button>
                <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                  💬 Message
                </button>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">
              🤝 How swaps help everyone:
            </h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Handle schedule conflicts without admin involvement</li>
              <li>• Build connections with other families</li>
              <li>• Keep the carpool system running smoothly</li>
              <li>
                • Everyone gets automatic notifications about swap decisions
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Community & Support */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
        <div className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircleIcon className="w-6 h-6 text-green-600" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">
            You're All Set! 🎉
          </h4>
          <p className="text-gray-700 mb-4">
            You now understand how Carpool works. Remember, this is about
            building a community where families help each other while making
            school transportation easier for everyone.
          </p>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">Fair</div>
              <div className="text-sm text-gray-600">Scheduling</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600">Easy</div>
              <div className="text-sm text-gray-600">Coordination</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-purple-600">Strong</div>
              <div className="text-sm text-gray-600">Community</div>
            </div>
          </div>
        </div>
      </div>

      {/* Final Action */}
      <div className="text-center">
        <button
          onClick={handleComplete}
          className="px-8 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white font-medium rounded-lg hover:from-green-700 hover:to-blue-700 transition-all transform hover:scale-105"
        >
          Complete Setup & Go to Dashboard! 🚀
        </button>
        <p className="mt-3 text-sm text-gray-500">
          Your preferences submission for this week is due by Saturday at 11:59
          PM
        </p>
      </div>
    </div>
  );
}
