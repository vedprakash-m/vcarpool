'use client';

import React, { useState } from 'react';
import {
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface PreferenceTutorialProps {
  onNext: () => void;
  onPrevious: () => void;
  onComplete: () => void;
}

export default function PreferenceTutorial({
  onNext,
  onPrevious,
  onComplete,
}: PreferenceTutorialProps) {
  const [currentDemo, setCurrentDemo] = useState(0);

  const demoSteps = [
    {
      title: 'Weekly Schedule Overview',
      description:
        "You'll see a weekly calendar with morning and afternoon time slots",
      content: (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-5 gap-2 text-xs">
            <div className="font-semibold text-center">Mon</div>
            <div className="font-semibold text-center">Tue</div>
            <div className="font-semibold text-center">Wed</div>
            <div className="font-semibold text-center">Thu</div>
            <div className="font-semibold text-center">Fri</div>
            <div className="bg-blue-100 p-2 rounded text-center">7:30 AM</div>
            <div className="bg-blue-100 p-2 rounded text-center">7:30 AM</div>
            <div className="bg-blue-100 p-2 rounded text-center">7:30 AM</div>
            <div className="bg-blue-100 p-2 rounded text-center">7:30 AM</div>
            <div className="bg-blue-100 p-2 rounded text-center">7:30 AM</div>
            <div className="bg-orange-100 p-2 rounded text-center">3:00 PM</div>
            <div className="bg-orange-100 p-2 rounded text-center">3:00 PM</div>
            <div className="bg-orange-100 p-2 rounded text-center">3:00 PM</div>
            <div className="bg-orange-100 p-2 rounded text-center">3:00 PM</div>
            <div className="bg-orange-100 p-2 rounded text-center">3:00 PM</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Set Your Preferences',
      description:
        "Click on time slots to set: Can't Drive, Prefer Not, Available, or Prefer",
      content: (
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm">Can't Drive - You're not available</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-sm">
              Prefer Not - Available but would rather not
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm">
              Available - Happy to drive if needed
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm">
              Prefer - Your preferred driving times
            </span>
          </div>
        </div>
      ),
    },
    {
      title: 'Pro Tips for Better Scheduling',
      description:
        'Follow these tips to help create fair and efficient schedules',
      content: (
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">
                Be realistic about availability
              </p>
              <p className="text-sm text-gray-600">
                Only mark times you can reliably commit to
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">
                Submit by Saturday deadline
              </p>
              <p className="text-sm text-gray-600">
                Late submissions may result in less preferred assignments
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">
                Use "Prefer" strategically
              </p>
              <p className="text-sm text-gray-600">
                Choose 2-3 times that work best for your schedule
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const handleNext = () => {
    if (currentDemo < demoSteps.length - 1) {
      setCurrentDemo(currentDemo + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentDemo > 0) {
      setCurrentDemo(currentDemo - 1);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <CalendarIcon className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Weekly Preferences Guide
        </h3>
        <p className="text-gray-600">
          Learn how to submit your driving preferences for the best carpool
          experience.
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex justify-center space-x-2 mb-6">
        {demoSteps.map((_, index) => (
          <div
            key={index}
            className={`w-3 h-3 rounded-full ${
              index === currentDemo
                ? 'bg-indigo-600'
                : index < currentDemo
                  ? 'bg-green-600'
                  : 'bg-gray-300'
            }`}
          />
        ))}
      </div>

      {/* Current Step */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="mb-4">
          <h4 className="text-lg font-semibold text-gray-900 mb-2">
            {demoSteps[currentDemo].title}
          </h4>
          <p className="text-gray-600">{demoSteps[currentDemo].description}</p>
        </div>

        {demoSteps[currentDemo].content}
      </div>

      {/* Important Notes */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-900 mb-1">
              Important Deadlines
            </h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>
                • Submit preferences by <strong>Saturday 11:59 PM</strong> each
                week
              </li>
              <li>
                • Assignments are generated and sent out on{' '}
                <strong>Sunday morning</strong>
              </li>
              <li>
                • Use swap requests if your schedule changes after submission
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={handlePrevious}
          disabled={currentDemo === 0}
          className={`px-4 py-2 rounded-lg transition-colors ${
            currentDemo === 0
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
          }`}
        >
          Previous
        </button>

        <span className="text-sm text-gray-500">
          {currentDemo + 1} of {demoSteps.length}
        </span>

        <button
          onClick={handleNext}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          {currentDemo === demoSteps.length - 1 ? 'Got It!' : 'Next'}
        </button>
      </div>

      {/* Ready to Try */}
      {currentDemo === demoSteps.length - 1 && (
        <div className="text-center bg-indigo-50 rounded-lg p-4 border border-indigo-200">
          <ClockIcon className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
          <h4 className="font-medium text-indigo-900 mb-1">
            Ready to submit your first preferences?
          </h4>
          <p className="text-sm text-indigo-800">
            You'll find the "Weekly Preferences" section on your dashboard.
          </p>
        </div>
      )}
    </div>
  );
}
