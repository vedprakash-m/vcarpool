'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';

export interface TeslaStemOnboardingStep {
  id: string;
  title: string;
  description: string;
  component: string;
  isCompleted: boolean;
  isOptional: boolean;
  teslaStemSpecific: boolean;
  betaFeature?: boolean;
}

export interface TeslaStemOnboardingState {
  isOnboardingActive: boolean;
  currentStepIndex: number;
  steps: TeslaStemOnboardingStep[];
  userProgress: {
    teslaStemWelcomeCompleted: boolean;
    profileCompleted: boolean;
    groupDiscoveryCompleted: boolean;
    schedulingTutorialCompleted: boolean;
    betaExpectationsReviewed: boolean;
    notificationsEnabled: boolean;
  };
  showTooltips: boolean;
  canSkip: boolean;
  betaProgramActive: boolean;
  teslaStemBranding: boolean;
}

interface TeslaStemOnboardingContextType {
  onboardingState: TeslaStemOnboardingState;
  startTeslaStemOnboarding: () => void;
  completeStep: (stepId: string) => void;
  nextStep: () => void;
  previousStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  toggleTooltips: () => void;
  updateUserProgress: (
    progress: Partial<TeslaStemOnboardingState['userProgress']>
  ) => void;
  resetOnboarding: () => void;
  sendWelcomeNotification: (stepType: string) => void;
}

// Tesla STEM-specific onboarding steps
const teslaStemDefaultSteps: TeslaStemOnboardingStep[] = [
  {
    id: 'tesla_stem_welcome',
    title: 'Welcome to Tesla STEM Carpool',
    description: 'Discover Tesla STEM\'s innovative carpool beta program',
    component: 'TeslaStemWelcomeStep',
    isCompleted: false,
    isOptional: false,
    teslaStemSpecific: true,
    betaFeature: true,
  },
  {
    id: 'tesla_stem_profile_setup',
    title: 'Tesla STEM Profile Setup',
    description: 'Complete your Tesla STEM family profile',
    component: 'TeslaStemProfileStep',
    isCompleted: false,
    isOptional: false,
    teslaStemSpecific: true,
  },
  {
    id: 'tesla_stem_group_discovery',
    title: 'Tesla STEM Group Discovery',
    description: 'Find or create Tesla STEM carpool groups',
    component: 'TeslaStemGroupDiscoveryStep',
    isCompleted: false,
    isOptional: false,
    teslaStemSpecific: true,
  },
  {
    id: 'tesla_stem_scheduling_tutorial',
    title: 'Smart Scheduling Tutorial',
    description: 'Learn Tesla STEM\'s fair scheduling system',
    component: 'TeslaStemSchedulingStep',
    isCompleted: false,
    isOptional: true,
    teslaStemSpecific: true,
    betaFeature: true,
  },
  {
    id: 'tesla_stem_beta_expectations',
    title: 'Beta Program Expectations',
    description: 'Your 8-week Tesla STEM beta journey',
    component: 'TeslaStemBetaExpectationsStep',
    isCompleted: false,
    isOptional: false,
    teslaStemSpecific: true,
    betaFeature: true,
  },
  {
    id: 'tesla_stem_notification_setup',
    title: 'Tesla STEM Notifications',
    description: 'Configure Tesla STEM-branded notifications',
    component: 'TeslaStemNotificationStep',
    isCompleted: false,
    isOptional: true,
    teslaStemSpecific: true,
  },
];

const teslaStemDefaultState: TeslaStemOnboardingState = {
  isOnboardingActive: false,
  currentStepIndex: 0,
  steps: teslaStemDefaultSteps,
  userProgress: {
    teslaStemWelcomeCompleted: false,
    profileCompleted: false,
    groupDiscoveryCompleted: false,
    schedulingTutorialCompleted: false,
    betaExpectationsReviewed: false,
    notificationsEnabled: false,
  },
  showTooltips: true,
  canSkip: true,
  betaProgramActive: true,
  teslaStemBranding: true,
};

const TeslaStemOnboardingContext = createContext<TeslaStemOnboardingContextType | undefined>(
  undefined
);

export function TeslaStemOnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuthStore();
  const [onboardingState, setOnboardingState] =
    useState<TeslaStemOnboardingState>(teslaStemDefaultState);

  // Check if user needs Tesla STEM onboarding on mount
  useEffect(() => {
    if (user && shouldShowTeslaStemOnboarding(user)) {
      const savedState = loadTeslaStemOnboardingState(user.id);
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
      saveTeslaStemOnboardingState(user.id, onboardingState);
    }
  }, [user?.id, onboardingState]);

  const startTeslaStemOnboarding = () => {
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

    // Update specific progress markers
    switch (stepId) {
      case 'tesla_stem_welcome':
        updateUserProgress({ teslaStemWelcomeCompleted: true });
        break;
      case 'tesla_stem_profile_setup':
        updateUserProgress({ profileCompleted: true });
        break;
      case 'tesla_stem_group_discovery':
        updateUserProgress({ groupDiscoveryCompleted: true });
        break;
      case 'tesla_stem_scheduling_tutorial':
        updateUserProgress({ schedulingTutorialCompleted: true });
        break;
      case 'tesla_stem_beta_expectations':
        updateUserProgress({ betaExpectationsReviewed: true });
        break;
      case 'tesla_stem_notification_setup':
        updateUserProgress({ notificationsEnabled: true });
        break;
    }
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
      markTeslaStemOnboardingCompleted(user.id);
    }
  };

  const completeOnboarding = () => {
    setOnboardingState(prev => ({
      ...prev,
      isOnboardingActive: false,
      steps: prev.steps.map(step => ({ ...step, isCompleted: true })),
    }));
    if (user?.id) {
      markTeslaStemOnboardingCompleted(user.id);
    }
  };

  const toggleTooltips = () => {
    setOnboardingState(prev => ({
      ...prev,
      showTooltips: !prev.showTooltips,
    }));
  };

  const updateUserProgress = (
    progress: Partial<TeslaStemOnboardingState['userProgress']>
  ) => {
    setOnboardingState(prev => ({
      ...prev,
      userProgress: { ...prev.userProgress, ...progress },
    }));
  };

  const resetOnboarding = () => {
    setOnboardingState(teslaStemDefaultState);
    if (user?.id) {
      clearTeslaStemOnboardingState(user.id);
    }
  };

  const sendWelcomeNotification = async (stepType: string) => {
    try {
      // Integration with Enhanced Notification System
      const notificationData = {
        userId: user?.id,
        template: getTeslaStemNotificationTemplate(stepType),
        channel: ['email', 'sms'],
        teslaStemBeta: true,
        timestamp: new Date().toISOString(),
      };

      // This would integrate with the backend notification service
      console.log('Sending Tesla STEM notification:', notificationData);
      
      // For now, just log the notification
      // In production, this would call the Enhanced Notification System API
      
    } catch (error) {
      console.error('Failed to send Tesla STEM notification:', error);
    }
  };

  return (
    <TeslaStemOnboardingContext.Provider
      value={{
        onboardingState,
        startTeslaStemOnboarding,
        completeStep,
        nextStep,
        previousStep,
        skipOnboarding,
        completeOnboarding,
        toggleTooltips,
        updateUserProgress,
        resetOnboarding,
        sendWelcomeNotification,
      }}
    >
      {children}
    </TeslaStemOnboardingContext.Provider>
  );
}

export function useTeslaStemOnboarding() {
  const context = useContext(TeslaStemOnboardingContext);
  if (context === undefined) {
    throw new Error('useTeslaStemOnboarding must be used within a TeslaStemOnboardingProvider');
  }
  return context;
}

// Helper functions
function shouldShowTeslaStemOnboarding(user: any): boolean {
  // Show Tesla STEM onboarding for new users in beta program
  if (!user || user.role !== 'parent') return false;

  const completed = localStorage.getItem(`tesla_stem_onboarding_completed_${user.id}`);
  const isTeslaStemUser = user.school === 'Tesla STEM High School' || user.betaProgram === true;
  
  return !completed && isTeslaStemUser;
}

function loadTeslaStemOnboardingState(userId: string): TeslaStemOnboardingState | null {
  try {
    const saved = localStorage.getItem(`tesla_stem_onboarding_state_${userId}`);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function saveTeslaStemOnboardingState(userId: string, state: TeslaStemOnboardingState) {
  try {
    localStorage.setItem(`tesla_stem_onboarding_state_${userId}`, JSON.stringify(state));
  } catch {
    // Handle storage errors silently
  }
}

function markTeslaStemOnboardingCompleted(userId: string) {
  try {
    localStorage.setItem(`tesla_stem_onboarding_completed_${userId}`, 'true');
    localStorage.removeItem(`tesla_stem_onboarding_state_${userId}`);
  } catch {
    // Handle storage errors silently
  }
}

function clearTeslaStemOnboardingState(userId: string) {
  try {
    localStorage.removeItem(`tesla_stem_onboarding_completed_${userId}`);
    localStorage.removeItem(`tesla_stem_onboarding_state_${userId}`);
  } catch {
    // Handle storage errors silently
  }
}

function getTeslaStemNotificationTemplate(stepType: string): string {
  const templates = {
    'tesla_stem_welcome': 'tesla_stem_beta_welcome',
    'profile_setup': 'tesla_stem_profile_guidance',
    'group_discovery': 'tesla_stem_group_discovery_help',
    'scheduling_tutorial': 'tesla_stem_scheduling_guide',
    'beta_expectations': 'tesla_stem_beta_timeline',
    'notification_setup': 'tesla_stem_notification_preferences',
  };

  return templates[stepType as keyof typeof templates] || 'tesla_stem_general_help';
}

export default TeslaStemOnboardingContext;
