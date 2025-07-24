'use client';

import React, { useState } from 'react';
import {
  CalendarIcon,
  TruckIcon as CarIcon,
  ChatBubbleLeftRightIcon,
  BellIcon,
  UserGroupIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';

interface WelcomeTourProps {
  onNext: () => void;
  onPrevious: () => void;
  onComplete: () => void;
}

const features = [
  {
    id: 'weekly_preferences',
    title: 'Weekly Preferences',
    description:
      'Submit your driving availability and time preferences each week',
    icon: CalendarIcon,
    color: 'bg-indigo-500',
    highlight:
      'The heart of our scheduling system - tell us when you can drive!',
  },
  {
    id: 'my_assignments',
    title: 'My Assignments',
    description:
      'View your driving assignments with passenger details and contact info',
    icon: CarIcon,
    color: 'bg-orange-500',
    highlight: 'See your carpool duties and easily contact other parents',
  },
  {
    id: 'swap_requests',
    title: 'Swap Requests',
    description: 'Exchange assignments with other parents when needed',
    icon: ChatBubbleLeftRightIcon,
    color: 'bg-purple-500',
    highlight: 'Life happens - easily coordinate changes with other families',
  },
  {
    id: 'notifications',
    title: 'Notification Settings',
    description: 'Control how you receive reminders and updates',
    icon: BellIcon,
    color: 'bg-yellow-500',
    highlight: 'Stay informed with 24h and 2h assignment reminders',
  },
];

export default function WelcomeTour({
  onNext,
  onPrevious,
  onComplete,
}: WelcomeTourProps) {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  const handleFeatureClick = (featureId: string) => {
    setSelectedFeature(selectedFeature === featureId ? null : featureId);
  };

  const selectedFeatureData = features.find(f => f.id === selectedFeature);

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <AcademicCapIcon className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to Carpool! 🚗
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Your school's smart carpool coordination system. Let's explore the key
          features that will help you coordinate pickups and drop-offs with
          other families.
        </p>
      </div>

      {/* Interactive Feature Tour */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">
          👆 Click on each feature to learn more
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {features.map(feature => {
            const Icon = feature.icon;
            const isSelected = selectedFeature === feature.id;

            return (
              <div
                key={feature.id}
                onClick={() => handleFeatureClick(feature.id)}
                className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'border-green-500 bg-green-50 shadow-lg scale-105'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${feature.color}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {feature.title}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {feature.description}
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <div className="mt-3 p-3 bg-green-100 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800 font-medium">
                      💡 {feature.highlight}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Feature Detail */}
        {selectedFeatureData && (
          <div className="bg-white rounded-lg p-6 border-2 border-green-200">
            <div className="flex items-center space-x-3 mb-3">
              <div className={`p-2 rounded-lg ${selectedFeatureData.color}`}>
                <selectedFeatureData.icon className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900">
                {selectedFeatureData.title}
              </h4>
            </div>
            <p className="text-gray-700 mb-3">
              {selectedFeatureData.description}
            </p>
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <p className="text-blue-800 text-sm">
                <span className="font-medium">Pro Tip:</span>{' '}
                {selectedFeatureData.highlight}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* How It Works Flow */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">
          📅 How Carpool Works
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 font-bold">
              1
            </div>
            <h4 className="font-medium text-gray-900 mb-1">
              Submit Preferences
            </h4>
            <p className="text-sm text-gray-600">
              Tell us when you can drive each week
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 font-bold">
              2
            </div>
            <h4 className="font-medium text-gray-900 mb-1">Get Assignments</h4>
            <p className="text-sm text-gray-600">
              Receive your weekly driving schedule
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 font-bold">
              3
            </div>
            <h4 className="font-medium text-gray-900 mb-1">Coordinate</h4>
            <p className="text-sm text-gray-600">
              Use swap requests when life happens
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-orange-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 font-bold">
              4
            </div>
            <h4 className="font-medium text-gray-900 mb-1">Stay Informed</h4>
            <p className="text-sm text-gray-600">
              Get reminders and updates via email
            </p>
          </div>
        </div>
      </div>

      {/* Community Benefits */}
      <div className="bg-green-50 rounded-xl p-6 border border-green-200">
        <div className="text-center">
          <UserGroupIcon className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Building Our School Community 🏫
          </h3>
          <p className="text-gray-700 mb-4">
            Carpool brings families together while reducing traffic, saving
            time, and helping the environment.
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">Less</div>
              <div className="text-sm text-gray-600">Traffic</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">More</div>
              <div className="text-sm text-gray-600">Community</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">Better</div>
              <div className="text-sm text-gray-600">Environment</div>
            </div>
          </div>
        </div>
      </div>

      {/* Ready to Start */}
      <div className="text-center">
        <p className="text-gray-600 mb-4">
          Ready to get started? Let's complete your profile and set up your
          preferences.
        </p>
        <button
          onClick={onComplete}
          className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          Let's Get Started! 🚀
        </button>
      </div>
    </div>
  );
}
