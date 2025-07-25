'use client';

import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  CheckIcon,
  InformationCircleIcon,
  AcademicCapIcon,
  UserGroupIcon,
  ClockIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';
import { ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/24/solid';
import { useMobile } from '@/services/mobile.service';
import TeslaStemWelcomeStep from './steps/TeslaStemWelcomeStep';
import TeslaStemProfileStep from './steps/TeslaStemProfileStep';
import TeslaStemGroupDiscoveryStep from './steps/TeslaStemGroupDiscoveryStep';
import TeslaStemSchedulingTutorial from './steps/TeslaStemSchedulingTutorial';
import TeslaStemBetaExpectations from './steps/TeslaStemBetaExpectations';

interface TeslaStemOnboardingStep {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
  canSkip?: boolean;
  validation?: () => boolean;
  mobileOptimized?: boolean;
}

interface TeslaStemOnboardingWizardProps {
  userRole: 'parent' | 'group_admin' | 'student';
  onComplete: () => void;
  onSkip?: () => void;
  onSendWelcomeNotification?: (step: string) => void;
}

/**
 * Tesla STEM Enhanced Onboarding Wizard Component
 * Implements Tesla STEM beta-specific interactive onboarding with:
 * - Tesla STEM branding and school context
 * - Mobile-first design for smartphone users
 * - Integration with Enhanced Notification System
 * - Progressive feature disclosure aligned with beta timeline
 */
export const TeslaStemOnboardingWizard: React.FC<TeslaStemOnboardingWizardProps> = ({
  userRole,
  onComplete,
  onSkip,
  onSendWelcomeNotification,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isVisible, setIsVisible] = useState(true);
  const { isMobile, hapticFeedback } = useMobile();

  // Tesla STEM specific onboarding steps with mobile optimization
  const getTeslaStemStepsForRole = (role: string): TeslaStemOnboardingStep[] => {
    const handleNext = () => {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
        hapticFeedback?.('light');
      } else {
        onComplete();
      }
    };

    const handlePrevious = () => {
      if (currentStep > 0) {
        setCurrentStep(currentStep - 1);
        hapticFeedback?.('light');
      }
    };

    const handleSendNotification = (template: string) => {
      onSendWelcomeNotification?.(template);
    };

    switch (role) {
      case 'parent':
        return [
          {
            id: 'tesla_stem_welcome',
            title: 'Welcome to Tesla STEM Carpool!',
            description: 'Safe, organized transportation for our innovative learning community.',
            mobileOptimized: true,
            content: (
              <TeslaStemWelcomeStep
                onNext={handleNext}
                onSendNotification={handleSendNotification}
              />
            ),
          },
          {
            id: 'tesla_stem_profile_setup',
            title: 'Complete Your Tesla STEM Profile',
            description: 'Set up your family information for the Tesla STEM community.',
            mobileOptimized: true,
            content: (
              <TeslaStemProfileStep
                onNext={handleNext}
                onPrevious={handlePrevious}
                onSendNotification={handleSendNotification}
              />
            ),
          },
          {
            id: 'tesla_stem_group_discovery',
            title: 'Discover Tesla STEM Carpool Groups',
            description: 'Find or create groups with fellow Tesla STEM families.',
            mobileOptimized: true,
            content: (
              <TeslaStemGroupDiscoveryStep
                onNext={handleNext}
                onPrevious={handlePrevious}
                onSendNotification={handleSendNotification}
              />
            ),
          },
          {
            id: 'tesla_stem_scheduling_tutorial',
            title: 'Smart Scheduling for Tesla STEM',
            description: 'Learn our fair and efficient scheduling system.',
            mobileOptimized: true,
            content: (
              <TeslaStemSchedulingTutorial
                onNext={handleNext}
                onPrevious={handlePrevious}
                onSendNotification={handleSendNotification}
              />
            ),
          },
          {
            id: 'tesla_stem_beta_expectations',
            title: 'Tesla STEM Beta Program Expectations',
            description: 'What to expect during our 8-week beta journey.',
            mobileOptimized: true,
            content: (
              <TeslaStemBetaExpectations
                onNext={handleNext}
                onPrevious={handlePrevious}
                onSendNotification={handleSendNotification}
              />
            ),
          },
        ];
        
      case 'group_admin':
        return [
          {
            id: 'admin_tesla_stem_welcome',
            title: 'Tesla STEM Group Admin Welcome',
            description: 'Lead carpool coordination for the Tesla STEM community.',
            mobileOptimized: true,
            content: (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
                  <div className="flex items-center mb-4">
                    <div className="bg-indigo-100 p-3 rounded-full mr-4">
                      <UserGroupIcon className="h-8 w-8 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-indigo-900">Tesla STEM Group Admin</h3>
                      <p className="text-indigo-700 text-sm">Leading innovation in school transportation</p>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Your Admin Responsibilities:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center text-sm">
                        <CheckIcon className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
                        <span>Approve new Tesla STEM families</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <CheckIcon className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
                        <span>Review weekly schedules</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <CheckIcon className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
                        <span>Resolve scheduling conflicts</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <CheckIcon className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
                        <span>Maintain group harmony</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Tesla STEM Beta Admin Benefits</h4>
                    <p className="text-blue-800 text-sm">
                      As a Group Admin in our beta program, you'll get advanced features first and help shape 
                      the future of Tesla STEM's carpool management system.
                    </p>
                  </div>
                </div>
              </div>
            ),
          },
          // Additional admin-specific Tesla STEM steps would go here
        ];
        
      default:
        return getTeslaStemStepsForRole('parent');
    }
  };

  const steps = getTeslaStemStepsForRole(userRole);

  useEffect(() => {
    // Mobile haptic feedback on step completion
    if (isMobile && completedSteps.size > 0) {
      hapticFeedback('light');
    }
  }, [completedSteps.size, isMobile, hapticFeedback]);

  const handleNext = () => {
    const currentStepData = steps[currentStep];
    if (currentStepData) {
      setCompletedSteps(prev => new Set([...prev, currentStepData.id]));
      
      // Send notification for key steps
      if (onSendWelcomeNotification && 
          ['tesla_stem_welcome', 'tesla_stem_profile_setup', 'tesla_stem_beta_expectations'].includes(currentStepData.id)) {
        onSendWelcomeNotification(currentStepData.id);
      }
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
    
    // Mobile haptic feedback
    if (isMobile) {
      hapticFeedback('medium');
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  };

  if (!isVisible) return null;

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div className={`relative w-full bg-white rounded-2xl shadow-2xl transition-all ${
          isMobile ? 'max-w-sm' : 'max-w-4xl'
        }`}>
          {/* Close Button */}
          <button
            onClick={() => setIsVisible(false)}
            className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 h-2 rounded-t-2xl">
            <div 
              className="bg-gradient-to-r from-red-500 to-purple-600 h-2 rounded-tl-2xl transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Tesla STEM Carpool Setup</h2>
                <p className="text-sm text-gray-500">
                  Step {currentStep + 1} of {steps.length} • Beta Program
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-red-600">{Math.round(progress)}%</div>
                <div className="text-xs text-gray-500">Complete</div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-8">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {currentStepData.title}
              </h3>
              <p className="text-gray-600">
                {currentStepData.description}
              </p>
            </div>

            <div className="mb-8">
              {currentStepData.content}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4 mr-1" />
                Previous
              </button>

              <div className="flex items-center space-x-3">
                {currentStepData.canSkip !== false && (
                  <button
                    onClick={handleSkip}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Skip for now
                  </button>
                )}
                
                <button
                  onClick={handleNext}
                  className="flex items-center px-6 py-2 bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all"
                >
                  {currentStep === steps.length - 1 ? 'Complete Setup' : 'Continue'}
                  <ChevronRightIcon className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeslaStemOnboardingWizard;
