'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: string;
  isCompleted: boolean;
  isOptional: boolean;
}

export interface OnboardingState {
  isOnboardingActive: boolean;
  currentStepIndex: number;
  steps: OnboardingStep[];
  userProgress: {
    profileCompleted: boolean;
    notificationsSetup: boolean;
    preferencesTourCompleted: boolean;
    firstWeekSimulated: boolean;
  };
  showTooltips: boolean;
  canSkip: boolean;
}

interface OnboardingContextType {
  onboardingState: OnboardingState;
  startOnboarding: () => void;
  completeStep: (stepId: string) => void;
  nextStep: () => void;
  previousStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  toggleTooltips: () => void;
  updateUserProgress: (
    progress: Partial<OnboardingState['userProgress']>
  ) => void;
  resetOnboarding: () => void;
}

const defaultSteps: OnboardingStep[] = [
  {
    id: 'welcome_tour',
    title: 'Welcome to Carpool',
    description: "Let's take a quick tour of your dashboard and key features",
    component: 'WelcomeTour',
    isCompleted: false,
    isOptional: false,
  },
  {
    id: 'profile_completion',
    title: 'Complete Your Profile',
    description: 'Add contact information and emergency details',
    component: 'ProfileCompletion',
    isCompleted: false,
    isOptional: false,
  },
  {
    id: 'notification_setup',
    title: 'Notification Preferences',
    description: "Choose how you'd like to receive carpool updates",
    component: 'NotificationSetup',
    isCompleted: false,
    isOptional: true,
  },
  {
    id: 'preference_tutorial',
    title: 'Weekly Preferences Guide',
    description: 'Learn how to submit your driving preferences',
    component: 'PreferenceTutorial',
    isCompleted: false,
    isOptional: false,
  },
  {
    id: 'first_week_simulation',
    title: 'How It All Works',
    description: 'See an example of assignments and swap requests',
    component: 'FirstWeekSimulation',
    isCompleted: false,
    isOptional: true,
  },
];

const defaultState: OnboardingState = {
  isOnboardingActive: false,
  currentStepIndex: 0,
  steps: defaultSteps,
  userProgress: {
    profileCompleted: false,
    notificationsSetup: false,
    preferencesTourCompleted: false,
    firstWeekSimulated: false,
  },
  showTooltips: true,
  canSkip: true,
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined
);

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuthStore();
  const [onboardingState, setOnboardingState] =
    useState<OnboardingState>(defaultState);

  // Check if user needs onboarding on mount
  useEffect(() => {
    if (user && shouldShowOnboarding(user)) {
      const savedState = loadOnboardingState(user.id);
      if (savedState) {
        setOnboardingState(savedState);
      } else {
        setOnboardingState(prev => ({ ...prev, isOnboardingActive: true }));
      }
    }
  }, [user]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (user?.id) {
      saveOnboardingState(user.id, onboardingState);
    }
  }, [user?.id, onboardingState]);

  const startOnboarding = () => {
    setOnboardingState(prev => ({
      ...prev,
      isOnboardingActive: true,
      currentStepIndex: 0,
    }));
  };

  const completeStep = (stepId: string) => {
    setOnboardingState(prev => ({
      ...prev,
      steps: prev.steps.map(step =>
        step.id === stepId ? { ...step, isCompleted: true } : step
      ),
    }));
  };

  const nextStep = () => {
    setOnboardingState(prev => {
      const nextIndex = prev.currentStepIndex + 1;
      if (nextIndex >= prev.steps.length) {
        return { ...prev, isOnboardingActive: false };
      }
      return { ...prev, currentStepIndex: nextIndex };
    });
  };

  const previousStep = () => {
    setOnboardingState(prev => ({
      ...prev,
      currentStepIndex: Math.max(0, prev.currentStepIndex - 1),
    }));
  };

  const skipOnboarding = () => {
    setOnboardingState(prev => ({ ...prev, isOnboardingActive: false }));
    if (user?.id) {
      markOnboardingCompleted(user.id);
    }
  };

  const completeOnboarding = () => {
    setOnboardingState(prev => ({
      ...prev,
      isOnboardingActive: false,
      steps: prev.steps.map(step => ({ ...step, isCompleted: true })),
    }));
    if (user?.id) {
      markOnboardingCompleted(user.id);
    }
  };

  const toggleTooltips = () => {
    setOnboardingState(prev => ({
      ...prev,
      showTooltips: !prev.showTooltips,
    }));
  };

  const updateUserProgress = (
    progress: Partial<OnboardingState['userProgress']>
  ) => {
    setOnboardingState(prev => ({
      ...prev,
      userProgress: { ...prev.userProgress, ...progress },
    }));
  };

  const resetOnboarding = () => {
    setOnboardingState(defaultState);
    if (user?.id) {
      clearOnboardingState(user.id);
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        onboardingState,
        startOnboarding,
        completeStep,
        nextStep,
        previousStep,
        skipOnboarding,
        completeOnboarding,
        toggleTooltips,
        updateUserProgress,
        resetOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}

// Helper functions
function shouldShowOnboarding(user: any): boolean {
  // Show onboarding for new parent users who haven't completed it
  if (user.role !== 'parent') return false;

  const completed = localStorage.getItem(`onboarding_completed_${user.id}`);
  return !completed;
}

function loadOnboardingState(userId: string): OnboardingState | null {
  try {
    const saved = localStorage.getItem(`onboarding_state_${userId}`);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function saveOnboardingState(userId: string, state: OnboardingState) {
  try {
    localStorage.setItem(`onboarding_state_${userId}`, JSON.stringify(state));
  } catch {
    // Handle storage errors silently
  }
}

function markOnboardingCompleted(userId: string) {
  try {
    localStorage.setItem(`onboarding_completed_${userId}`, 'true');
    localStorage.removeItem(`onboarding_state_${userId}`);
  } catch {
    // Handle storage errors silently
  }
}

function clearOnboardingState(userId: string) {
  try {
    localStorage.removeItem(`onboarding_completed_${userId}`);
    localStorage.removeItem(`onboarding_state_${userId}`);
  } catch {
    // Handle storage errors silently
  }
}
