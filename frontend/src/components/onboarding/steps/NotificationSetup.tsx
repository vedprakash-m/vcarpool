'use client';

import React, { useState } from 'react';
import {
  BellIcon,
  EnvelopeIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface NotificationSetupProps {
  onNext: () => void;
  onPrevious: () => void;
  onComplete: () => void;
}

export default function NotificationSetup({
  onNext,
  onPrevious,
  onComplete,
}: NotificationSetupProps) {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    swapRequestNotifications: true,
    assignmentReminders: true,
    weeklyUpdates: false,
  });

  const handleToggle = (setting: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [setting]: !prev[setting] }));
  };

  const handleContinue = () => {
    // Save settings and continue
    onComplete();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <BellIcon className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Notification Preferences
        </h3>
        <p className="text-gray-600">
          Choose how you'd like to stay informed about carpool activities.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center">
              <EnvelopeIcon className="w-5 h-5 text-blue-600 mr-3" />
              <div>
                <h4 className="font-medium text-gray-900">
                  Email Notifications
                </h4>
                <p className="text-sm text-gray-600">
                  Master switch for all email alerts
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('emailNotifications')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.emailNotifications ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.emailNotifications
                    ? 'translate-x-6'
                    : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="space-y-3 ml-4">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-gray-800">
                  Swap Request Notifications
                </h5>
                <p className="text-sm text-gray-600">
                  When someone requests to swap with you
                </p>
              </div>
              <button
                onClick={() => handleToggle('swapRequestNotifications')}
                disabled={!settings.emailNotifications}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.swapRequestNotifications &&
                  settings.emailNotifications
                    ? 'bg-green-600'
                    : 'bg-gray-200'
                } ${!settings.emailNotifications ? 'opacity-50' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.swapRequestNotifications &&
                    settings.emailNotifications
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-gray-800">
                  Assignment Reminders
                </h5>
                <p className="text-sm text-gray-600">
                  24h and 2h reminders before your assignments
                </p>
              </div>
              <button
                onClick={() => handleToggle('assignmentReminders')}
                disabled={!settings.emailNotifications}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.assignmentReminders && settings.emailNotifications
                    ? 'bg-green-600'
                    : 'bg-gray-200'
                } ${!settings.emailNotifications ? 'opacity-50' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.assignmentReminders && settings.emailNotifications
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
        <div className="flex items-center">
          <CheckCircleIcon className="w-5 h-5 text-green-600 mr-3" />
          <div>
            <h4 className="font-medium text-green-900">Recommended Settings</h4>
            <p className="text-sm text-green-800">
              We recommend keeping notifications enabled to stay coordinated
              with other families.
            </p>
          </div>
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={handleContinue}
          className="px-6 py-3 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 transition-colors"
        >
          Save & Continue
        </button>
        <p className="mt-2 text-sm text-gray-500">
          You can change these settings anytime from your dashboard
        </p>
      </div>
    </div>
  );
}
