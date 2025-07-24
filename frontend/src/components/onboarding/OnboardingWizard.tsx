'use client';

import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  CheckIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/24/solid';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
  canSkip?: boolean;
  validation?: () => boolean;
}

interface OnboardingWizardProps {
  userRole: 'parent' | 'group_admin' | 'student';
  onComplete: () => void;
  onSkip?: () => void;
}

/**
 * Progressive Onboarding Wizard Component
 * Implements PRD requirements for role-based interactive onboarding
 * Following UX spec: Step-by-step guidance with progress tracking
 */
export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  userRole,
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isVisible, setIsVisible] = useState(true);

  // Role-specific onboarding steps
  const getStepsForRole = (role: string): OnboardingStep[] => {
    switch (role) {
      case 'parent':
        return [
          {
            id: 'welcome',
            title: 'Welcome to Carpool!',
            description:
              "Let's get you started with safe, organized school transportation.",
            content: (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">
                    What you can do:
                  </h3>
                  <ul className="space-y-2 text-blue-800">
                    <li className="flex items-center">
                      <CheckIcon className="h-5 w-5 text-blue-600 mr-2" />
                      Find and join carpool groups in your area
                    </li>
                    <li className="flex items-center">
                      <CheckIcon className="h-5 w-5 text-blue-600 mr-2" />
                      Submit weekly driving preferences
                    </li>
                    <li className="flex items-center">
                      <CheckIcon className="h-5 w-5 text-blue-600 mr-2" />
                      Coordinate with other parents seamlessly
                    </li>
                    <li className="flex items-center">
                      <CheckIcon className="h-5 w-5 text-blue-600 mr-2" />
                      Track fairness in driving responsibilities
                    </li>
                  </ul>
                </div>
              </div>
            ),
          },
          {
            id: 'profile_setup',
            title: 'Complete Your Profile',
            description: 'Add your family information and verify your details.',
            content: (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <InformationCircleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                    <div>
                      <h3 className="font-semibold text-yellow-900 mb-2">
                        Profile Requirements:
                      </h3>
                      <ul className="space-y-1 text-yellow-800 text-sm">
                        <li>
                          • Verify your home address (required for group
                          matching)
                        </li>
                        <li>• Add emergency contact information</li>
                        <li>• Verify your phone number via SMS</li>
                        <li>• Add your children\'s information</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <button className="btn-primary w-full">
                  Complete Profile Setup
                </button>
              </div>
            ),
          },
          {
            id: 'find_groups',
            title: 'Find Your Carpool Group',
            description: 'Discover groups near you or create a new one.',
            content: (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      🔍 Join Existing Group
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Find groups in your school area with families like yours.
                    </p>
                    <button className="btn-outline w-full">
                      Browse Groups
                    </button>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4 hover:border-green-300 cursor-pointer">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      🚀 Create New Group
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Start your own group and invite neighbors to join.
                    </p>
                    <button className="btn-primary w-full">Create Group</button>
                  </div>
                </div>
              </div>
            ),
          },
          {
            id: 'scheduling',
            title: 'How Scheduling Works',
            description: 'Learn about our fair scheduling system.',
            content: (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-3">
                    Weekly Process:
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">
                        1
                      </div>
                      <div>
                        <p className="font-medium text-green-900">
                          Submit Preferences
                        </p>
                        <p className="text-sm text-green-700">
                          By Saturday 10 PM each week
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">
                        2
                      </div>
                      <div>
                        <p className="font-medium text-green-900">
                          Schedule Generated
                        </p>
                        <p className="text-sm text-green-700">
                          Fair algorithm creates weekly assignments
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">
                        3
                      </div>
                      <div>
                        <p className="font-medium text-green-900">
                          Execute & Coordinate
                        </p>
                        <p className="text-sm text-green-700">
                          Easy swaps and communication
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ),
          },
        ];

      case 'group_admin':
        return [
          {
            id: 'admin_welcome',
            title: 'Welcome, Group Admin!',
            description:
              'You have the tools to create and manage successful carpool groups.',
            content: (
              <div className="space-y-4">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-2">
                    Your Responsibilities:
                  </h3>
                  <ul className="space-y-2 text-purple-800">
                    <li className="flex items-center">
                      <CheckIcon className="h-5 w-5 text-purple-600 mr-2" />
                      Create and configure carpool groups
                    </li>
                    <li className="flex items-center">
                      <CheckIcon className="h-5 w-5 text-purple-600 mr-2" />
                      Review and approve member join requests
                    </li>
                    <li className="flex items-center">
                      <CheckIcon className="h-5 w-5 text-purple-600 mr-2" />
                      Generate weekly schedules with fairness tracking
                    </li>
                    <li className="flex items-center">
                      <CheckIcon className="h-5 w-5 text-purple-600 mr-2" />
                      Handle safety reports and group coordination
                    </li>
                  </ul>
                </div>
              </div>
            ),
          },
          {
            id: 'group_creation',
            title: 'Create Your First Group',
            description:
              'Set up a group with the right settings for your community.',
            content: (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">
                    Group Setup Checklist:
                  </h3>
                  <ul className="space-y-2 text-blue-800 text-sm">
                    <li>• Choose a descriptive group name</li>
                    <li>• Set your target school</li>
                    <li>• Define service area (distance radius)</li>
                    <li>• Configure schedule (days and times)</li>
                    <li>• Set maximum children limit</li>
                  </ul>
                </div>
                <button className="btn-primary w-full">
                  Start Group Creation
                </button>
              </div>
            ),
          },
          {
            id: 'member_management',
            title: 'Managing Group Members',
            description:
              'Learn how to review applications and maintain your group.',
            content: (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-900 mb-2">
                    Member Management:
                  </h3>
                  <div className="space-y-2 text-amber-800 text-sm">
                    <p>
                      • <strong>Join Requests:</strong> Review family profiles
                      and approve suitable matches
                    </p>
                    <p>
                      • <strong>Active Members:</strong> Monitor participation
                      and address issues
                    </p>
                    <p>
                      • <strong>Group Health:</strong> Keep groups active with
                      4-8 families
                    </p>
                    <p>
                      • <strong>Communication:</strong> Facilitate group
                      coordination and resolve conflicts
                    </p>
                  </div>
                </div>
              </div>
            ),
          },
          {
            id: 'safety_admin',
            title: 'Safety & Reporting',
            description: 'Handle safety reports and emergency coordination.',
            content: (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-900 mb-2">
                    Safety Responsibilities:
                  </h3>
                  <ul className="space-y-2 text-red-800 text-sm">
                    <li>
                      • Review and respond to safety reports within 24 hours
                    </li>
                    <li>• Coordinate emergency contact information</li>
                    <li>• Escalate serious issues to Super Admin</li>
                    <li>• Maintain group safety standards</li>
                  </ul>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-sm text-gray-700">
                    <strong>Remember:</strong> Critical safety reports are
                    automatically escalated to Super Admin for immediate review.
                  </p>
                </div>
              </div>
            ),
          },
        ];

      case 'student':
        return [
          {
            id: 'student_welcome',
            title: 'Welcome to Your Carpool!',
            description:
              'Learn how to stay safe and informed about your rides.',
            content: (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-2">
                    What you can do:
                  </h3>
                  <ul className="space-y-2 text-green-800">
                    <li className="flex items-center">
                      <CheckIcon className="h-5 w-5 text-green-600 mr-2" />
                      View your weekly carpool schedule
                    </li>
                    <li className="flex items-center">
                      <CheckIcon className="h-5 w-5 text-green-600 mr-2" />
                      Know who's picking you up and when
                    </li>
                    <li className="flex items-center">
                      <CheckIcon className="h-5 w-5 text-green-600 mr-2" />
                      Report any safety concerns
                    </li>
                    <li className="flex items-center">
                      <CheckIcon className="h-5 w-5 text-green-600 mr-2" />
                      Keep your profile updated
                    </li>
                  </ul>
                </div>
              </div>
            ),
          },
          {
            id: 'safety_info',
            title: 'Safety First',
            description: 'Important safety information for carpool riders.',
            content: (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-900 mb-2">
                    Safety Guidelines:
                  </h3>
                  <ul className="space-y-2 text-yellow-800 text-sm">
                    <li>
                      • Always verify the driver and vehicle before getting in
                    </li>
                    <li>• Wear your seatbelt at all times</li>
                    <li>• Let your parents know if anything feels unsafe</li>
                    <li>• Use the safety reporting feature if needed</li>
                    <li>• Keep emergency contact information updated</li>
                  </ul>
                </div>
                <button className="btn-primary w-full">
                  View Safety Reporting
                </button>
              </div>
            ),
          },
        ];

      default:
        return [];
    }
  };

  const steps = getStepsForRole(userRole);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps(prev => new Set([...prev, steps[currentStep].id]));
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setCompletedSteps(prev => new Set([...prev, steps[currentStep].id]));

    // Store completion in localStorage
    localStorage.setItem('carpool_onboarding_completed', 'true');
    localStorage.setItem('carpool_onboarding_role', userRole);
    localStorage.setItem('carpool_onboarding_date', new Date().toISOString());

    onComplete();
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      handleComplete();
    }
  };

  if (!isVisible || steps.length === 0) {
    return null;
  }

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {userRole === 'parent' && 'Parent Onboarding'}
                {userRole === 'group_admin' && 'Group Admin Setup'}
                {userRole === 'student' && 'Student Guide'}
              </h1>
              <p className="text-gray-600">
                Step {currentStep + 1} of {steps.length}
              </p>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {currentStepData.title}
            </h2>
            <p className="text-gray-600 mb-4">{currentStepData.description}</p>
          </div>

          <div className="mb-8">{currentStepData.content}</div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {currentStep > 0 && (
                <button
                  onClick={prevStep}
                  className="btn-outline flex items-center"
                >
                  <ChevronLeftIcon className="h-4 w-4 mr-1" />
                  Previous
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {currentStepData.canSkip !== false && (
                <button
                  onClick={handleSkip}
                  className="text-gray-500 hover:text-gray-700 px-4 py-2"
                >
                  Skip for now
                </button>
              )}

              <button
                onClick={nextStep}
                className="btn-primary flex items-center"
              >
                {currentStep === steps.length - 1 ? 'Get Started' : 'Continue'}
                {currentStep < steps.length - 1 && (
                  <ChevronRightIcon className="h-4 w-4 ml-1" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
