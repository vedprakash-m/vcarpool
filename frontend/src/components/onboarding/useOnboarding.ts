'use client';

import { useState, useEffect } from 'react';

interface OnboardingState {
  isCompleted: boolean;
  userRole: string | null;
  completionDate: string | null;
  shouldShow: boolean;
}

/**
 * Custom hook for managing onboarding state
 * Implements localStorage persistence and role-based onboarding
 */
export const useOnboarding = (currentUserRole?: string) => {
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({
    isCompleted: false,
    userRole: null,
    completionDate: null,
    shouldShow: false,
  });

  useEffect(() => {
    // Check if onboarding was previously completed
    const completed =
      localStorage.getItem('carpool_onboarding_completed') === 'true';
    const storedRole = localStorage.getItem('carpool_onboarding_role');
    const completionDate = localStorage.getItem('carpool_onboarding_date');

    // Determine if onboarding should be shown
    const shouldShow =
      !completed || (currentUserRole && storedRole !== currentUserRole);

    setOnboardingState({
      isCompleted: completed,
      userRole: storedRole,
      completionDate,
      shouldShow: Boolean(shouldShow && currentUserRole),
    });
  }, [currentUserRole]);

  const markCompleted = (role: string) => {
    localStorage.setItem('carpool_onboarding_completed', 'true');
    localStorage.setItem('carpool_onboarding_role', role);
    localStorage.setItem('carpool_onboarding_date', new Date().toISOString());

    setOnboardingState({
      isCompleted: true,
      userRole: role,
      completionDate: new Date().toISOString(),
      shouldShow: false,
    });
  };

  const skipOnboarding = () => {
    if (currentUserRole) {
      markCompleted(currentUserRole);
    }
  };

  const resetOnboarding = () => {
    localStorage.removeItem('carpool_onboarding_completed');
    localStorage.removeItem('carpool_onboarding_role');
    localStorage.removeItem('carpool_onboarding_date');

    setOnboardingState({
      isCompleted: false,
      userRole: null,
      completionDate: null,
      shouldShow: !!currentUserRole,
    });
  };

  return {
    ...onboardingState,
    markCompleted,
    skipOnboarding,
    resetOnboarding,
  };
};

export default useOnboarding;
