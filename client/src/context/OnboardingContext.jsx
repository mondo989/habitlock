import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const OnboardingContext = createContext(null);

export const ONBOARDING_STEPS = {
  WELCOME: 'welcome',
  CREATE_HABIT: 'create_habit',
  FILLING_HABIT: 'filling_habit',
  TRACK_HABIT: 'track_habit',
  COMPLETE: 'complete',
};

export function OnboardingProvider({ children }) {
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(ONBOARDING_STEPS.WELCOME);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(() => {
    return localStorage.getItem('habitlock_onboarding_completed') === 'true';
  });

  // Start onboarding for new users
  useEffect(() => {
    if (!hasCompletedOnboarding) {
      setIsOnboarding(true);
      setCurrentStep(ONBOARDING_STEPS.WELCOME);
    }
  }, [hasCompletedOnboarding]);

  const startOnboarding = useCallback(() => {
    setIsOnboarding(true);
    setCurrentStep(ONBOARDING_STEPS.WELCOME);
  }, []);

  const advanceStep = useCallback(() => {
    setCurrentStep((prev) => {
      switch (prev) {
        case ONBOARDING_STEPS.WELCOME:
          return ONBOARDING_STEPS.CREATE_HABIT;
        case ONBOARDING_STEPS.CREATE_HABIT:
          return ONBOARDING_STEPS.FILLING_HABIT;
        case ONBOARDING_STEPS.FILLING_HABIT:
          return ONBOARDING_STEPS.TRACK_HABIT;
        case ONBOARDING_STEPS.TRACK_HABIT:
          return ONBOARDING_STEPS.COMPLETE;
        default:
          return prev;
      }
    });
  }, []);

  const completeOnboarding = useCallback(() => {
    setIsOnboarding(false);
    setCurrentStep(ONBOARDING_STEPS.COMPLETE);
    setHasCompletedOnboarding(true);
    localStorage.setItem('habitlock_onboarding_completed', 'true');
  }, []);

  const skipOnboarding = useCallback(() => {
    completeOnboarding();
  }, [completeOnboarding]);

  // Called when habit modal opens
  const onHabitModalOpened = useCallback(() => {
    if (isOnboarding && currentStep === ONBOARDING_STEPS.CREATE_HABIT) {
      advanceStep();
    }
  }, [isOnboarding, currentStep, advanceStep]);

  // Called when habit modal closes without saving
  const onHabitModalClosed = useCallback(() => {
    if (isOnboarding && currentStep === ONBOARDING_STEPS.FILLING_HABIT) {
      setCurrentStep(ONBOARDING_STEPS.CREATE_HABIT);
    }
  }, [isOnboarding, currentStep]);

  // Called when user creates their first habit
  const onHabitCreated = useCallback(() => {
    if (isOnboarding && currentStep === ONBOARDING_STEPS.FILLING_HABIT) {
      advanceStep();
    }
  }, [isOnboarding, currentStep, advanceStep]);

  // Called when user tracks a habit on the calendar
  const onHabitTracked = useCallback(() => {
    if (isOnboarding && currentStep === ONBOARDING_STEPS.TRACK_HABIT) {
      advanceStep();
    }
  }, [isOnboarding, currentStep, advanceStep]);

  const value = useMemo(() => ({
    isOnboarding,
    currentStep,
    hasCompletedOnboarding,
    startOnboarding,
    advanceStep,
    completeOnboarding,
    skipOnboarding,
    onHabitModalOpened,
    onHabitModalClosed,
    onHabitCreated,
    onHabitTracked,
  }), [
    isOnboarding,
    currentStep,
    hasCompletedOnboarding,
    startOnboarding,
    advanceStep,
    completeOnboarding,
    skipOnboarding,
    onHabitModalOpened,
    onHabitModalClosed,
    onHabitCreated,
    onHabitTracked,
  ]);

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
