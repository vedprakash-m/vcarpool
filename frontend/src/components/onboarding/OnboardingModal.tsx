'use client';

import React from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import {
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { TruckIcon as CarIcon } from '@heroicons/react/24/solid';

// Import onboarding step components
import WelcomeTour from './steps/WelcomeTour';
import ProfileCompletion from './steps/ProfileCompletion';
import NotificationSetup from './steps/NotificationSetup';
import PreferenceTutorial from './steps/PreferenceTutorial';
import FirstWeekSimulation from './steps/FirstWeekSimulation';

const stepComponents: Record<string, React.ComponentType<any>> = {
  WelcomeTour,
  ProfileCompletion,
  NotificationSetup,
  PreferenceTutorial,
  FirstWeekSimulation,
};

export default function OnboardingModal() {
  const {
    onboardingState,
    nextStep,
    previousStep,
    skipOnboarding,
    completeOnboarding,
    completeStep,
  } = useOnboarding();

  if (!onboardingState.isOnboardingActive) {
    return null;
  }

  const currentStep = onboardingState.steps[onboardingState.currentStepIndex];
  const isFirstStep = onboardingState.currentStepIndex === 0;
  const isLastStep =
    onboardingState.currentStepIndex === onboardingState.steps.length - 1;
  const completedSteps = onboardingState.steps.filter(
    step => step.isCompleted
  ).length;
  const progressPercentage =
    (completedSteps / onboardingState.steps.length) * 100;

  const handleNext = () => {
    if (currentStep) {
      completeStep(currentStep.id);
    }

    if (isLastStep) {
      completeOnboarding();
    } else {
      nextStep();
    }
  };

  const handleSkip = () => {
    skipOnboarding();
  };

  const StepComponent = currentStep
    ? stepComponents[currentStep.component]
    : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                  <CarIcon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Carpool Setup
                  </h2>
                  <p className="text-sm text-gray-500">
                    Step {onboardingState.currentStepIndex + 1} of{' '}
                    {onboardingState.steps.length}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {onboardingState.canSkip && (
                  <button
                    onClick={handleSkip}
                    className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Skip setup
                  </button>
                )}
                <button
                  onClick={handleSkip}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>Setup Progress</span>
                <span>{Math.round(progressPercentage)}% Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Step Indicators */}
          <div className="border-b border-gray-100 px-6 py-3">
            <div className="flex items-center justify-between">
              {onboardingState.steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center space-x-2 ${
                    index <= onboardingState.currentStepIndex
                      ? 'text-green-600'
                      : 'text-gray-400'
                  }`}
                >
                  <div
                    className={`flex items-center justify-center w-6 h-6 rounded-full border-2 ${
                      step.isCompleted
                        ? 'bg-green-600 border-green-600'
                        : index === onboardingState.currentStepIndex
                          ? 'border-green-600 bg-white'
                          : 'border-gray-300 bg-white'
                    }`}
                  >
                    {step.isCompleted ? (
                      <CheckCircleIcon className="w-4 h-4 text-white" />
                    ) : (
                      <span
                        className={`text-xs font-medium ${
                          index === onboardingState.currentStepIndex
                            ? 'text-green-600'
                            : 'text-gray-400'
                        }`}
                      >
                        {index + 1}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">
                    {step.title}
                  </span>
                  {step.isOptional && (
                    <span className="text-xs text-gray-400 hidden md:block">
                      (Optional)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-8">
            {currentStep && (
              <div>
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {currentStep.title}
                  </h3>
                  <p className="text-gray-600">{currentStep.description}</p>
                </div>

                {StepComponent && (
                  <div className="mb-8">
                    <StepComponent
                      onNext={handleNext}
                      onPrevious={previousStep}
                      onComplete={() => completeStep(currentStep.id)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={previousStep}
                disabled={isFirstStep}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  isFirstStep
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                <ChevronLeftIcon className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="flex items-center space-x-3">
                {currentStep?.isOptional && (
                  <button
                    onClick={nextStep}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Skip this step
                  </button>
                )}

                <button
                  onClick={handleNext}
                  className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <span>{isLastStep ? 'Complete Setup' : 'Continue'}</span>
                  {!isLastStep && <ChevronRightIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
