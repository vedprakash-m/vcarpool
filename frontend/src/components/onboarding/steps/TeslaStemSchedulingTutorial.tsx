/**
 * Tesla STEM Scheduling Tutorial Step
 * 
 * Interactive tutorial that teaches Tesla STEM families how to use
 * the smart scheduling system with fairness tracking and beta features.
 * 
 * Features:
 * - Tesla STEM-specific scheduling concepts
 * - Fairness tracking explanation
 * - Beta program scheduling benefits
 * - Interactive tutorial steps
 * - Mobile-optimized touch interactions
 */

import React, { useState, useCallback } from 'react';
import { 
  CalendarDaysIcon, 
  ClockIcon, 
  UserGroupIcon, 
  StarIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useMobile } from '@/services/mobile.service';
import { useTeslaStemOnboarding } from '@/contexts/TeslaStemOnboardingContext';

interface TeslaStemSchedulingTutorialProps {
  onNext: () => void;
  onPrevious: () => void;
  onSendNotification?: (template: string) => void;
}

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  content: React.ReactNode;
  interactive: boolean;
}

const TeslaStemSchedulingTutorial: React.FC<TeslaStemSchedulingTutorialProps> = ({
  onNext,
  onPrevious,
  onSendNotification,
}) => {
  const { hapticFeedback } = useMobile();
  const { updateUserProgress } = useTeslaStemOnboarding();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const tutorialSteps: TutorialStep[] = [
    {
      id: 'tesla-stem-scheduling',
      title: 'Tesla STEM Smart Scheduling',
      description: 'Learn how our intelligent system creates fair, efficient schedules',
      icon: CalendarDaysIcon,
      interactive: false,
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-red-50 to-purple-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <div className="bg-red-100 p-3 rounded-full mr-4">
                <CalendarDaysIcon className="h-8 w-8 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-red-900">Smart Scheduling System</h3>
                <p className="text-red-700 text-sm">Built specifically for Tesla STEM families</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start">
                <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Fairness Tracking</p>
                  <p className="text-gray-600 text-sm">Automatically ensures equal driving responsibilities</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Tesla STEM Schedule Alignment</p>
                  <p className="text-gray-600 text-sm">Syncs with school events and activities</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Beta Program Priority</p>
                  <p className="text-gray-600 text-sm">Early access to premium scheduling features</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'fairness-tracking',
      title: 'Fairness Tracking System',
      description: 'Understand how we ensure equal participation',
      icon: StarIcon,
      interactive: true,
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-bold text-blue-900 mb-4">How Fairness Tracking Works</h3>
            
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">Sarah Johnson</span>
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                    <span className="text-sm text-gray-600">3/4 turns</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">Next driver assignment: Monday</p>
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">Mike Chen</span>
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '50%' }}></div>
                    </div>
                    <span className="text-sm text-gray-600">2/4 turns</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">Available for assignment</p>
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">You</span>
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                      <div className="bg-red-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                    </div>
                    <span className="text-sm text-gray-600">1/4 turns</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">Priority for next assignment</p>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start">
                <InformationCircleIcon className="h-5 w-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <p className="text-green-800 text-sm font-medium">Fair Distribution Guaranteed</p>
                  <p className="text-green-700 text-xs">System automatically balances driving duties across all Tesla STEM families</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'beta-features',
      title: 'Beta Program Benefits',
      description: 'Discover exclusive scheduling features for beta participants',
      icon: StarIcon,
      interactive: false,
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <div className="bg-purple-100 p-3 rounded-full mr-4">
                <StarIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-purple-900">Beta Scheduling Features</h3>
                <p className="text-purple-700 text-sm">Exclusive to Tesla STEM Beta Program</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <ClockIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <h4 className="font-semibold text-gray-900">Advanced Scheduling</h4>
                </div>
                <p className="text-gray-600 text-sm">Schedule up to 4 weeks in advance with priority booking</p>
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <UserGroupIcon className="h-5 w-5 text-green-600 mr-2" />
                  <h4 className="font-semibold text-gray-900">Group Preferences</h4>
                </div>
                <p className="text-gray-600 text-sm">Set preferred carpool partners and driver preferences</p>
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <CalendarDaysIcon className="h-5 w-5 text-red-600 mr-2" />
                  <h4 className="font-semibold text-gray-900">Tesla STEM Events</h4>
                </div>
                <p className="text-gray-600 text-sm">Automatic scheduling for robotics meets and STEM competitions</p>
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <StarIcon className="h-5 w-5 text-yellow-600 mr-2" />
                  <h4 className="font-semibold text-gray-900">Priority Support</h4>
                </div>
                <p className="text-gray-600 text-sm">Direct line to Tesla STEM carpool coordinators</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'getting-started',
      title: 'Ready to Schedule',
      description: 'You\'re ready to start using Tesla STEM smart scheduling',
      icon: CheckCircleIcon,
      interactive: false,
      content: (
        <div className="text-center space-y-4">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-8">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-2">You're All Set!</h3>
            <p className="text-gray-600 mb-6">
              You now understand Tesla STEM's smart scheduling system and are ready to participate in fair, efficient carpools.
            </p>
            
            <div className="bg-white rounded-lg p-4 text-left">
              <h4 className="font-semibold text-gray-900 mb-3">What happens next:</h4>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  <span>Join your first Tesla STEM carpool group</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  <span>Receive your first scheduling assignment</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  <span>Start contributing to the Tesla STEM community</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const handleStepComplete = useCallback((stepId: string) => {
    hapticFeedback?.('light');
    setCompletedSteps(prev => new Set([...prev, stepId]));
    
    // Send tutorial progress notification
    if (onSendNotification) {
      onSendNotification('tesla_stem_tutorial_progress');
    }
  }, [hapticFeedback, onSendNotification]);

  const handleNextStep = useCallback(() => {
    const currentStepId = tutorialSteps[currentStep].id;
    handleStepComplete(currentStepId);
    
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Tutorial completed
      updateUserProgress({ schedulingTutorialCompleted: true });
      if (onSendNotification) {
        onSendNotification('tesla_stem_tutorial_complete');
      }
      onNext();
    }
  }, [currentStep, handleStepComplete, tutorialSteps.length, updateUserProgress, onSendNotification, onNext]);

  const handlePreviousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      onPrevious();
    }
  }, [currentStep, onPrevious]);

  const currentTutorialStep = tutorialSteps[currentStep];

  return (
    <div className="space-y-6">
      {/* Tutorial Header */}
      <div className="text-center">
        <div className="bg-gradient-to-r from-red-100 to-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <currentTutorialStep.icon className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Tesla STEM Scheduling Tutorial</h2>
        <p className="text-gray-600">Learn how to use our smart scheduling system</p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-2">
        {tutorialSteps.map((step, index) => (
          <div
            key={step.id}
            className={`w-3 h-3 rounded-full transition-colors ${
              index <= currentStep
                ? 'bg-red-500'
                : 'bg-gray-300'
            }`}
          />
        ))}
      </div>

      {/* Current Step Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-2">{currentTutorialStep.title}</h3>
          <p className="text-gray-600">{currentTutorialStep.description}</p>
        </div>
        
        {currentTutorialStep.content}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePreviousStep}
          className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          {currentStep === 0 ? 'Previous' : 'Back'}
        </button>

        <div className="text-center">
          <div className="text-sm text-gray-500">
            Step {currentStep + 1} of {tutorialSteps.length}
          </div>
        </div>

        <button
          onClick={handleNextStep}
          className="flex items-center px-6 py-2 bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all"
        >
          {currentStep === tutorialSteps.length - 1 ? 'Complete Tutorial' : 'Next Step'}
          <ArrowRightIcon className="h-4 w-4 ml-1" />
        </button>
      </div>
    </div>
  );
};

export default TeslaStemSchedulingTutorial;
