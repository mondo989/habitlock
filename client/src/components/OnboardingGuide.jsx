import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useOnboarding, ONBOARDING_STEPS } from '../context/OnboardingContext';
import styles from './OnboardingGuide.module.scss';

// Popover component that anchors to a target element
const AnchoredPopover = ({ targetSelector, children, position = 'bottom', offset = 12 }) => {
  const [coords, setCoords] = useState(null);

  const updatePosition = useCallback(() => {
    const target = document.querySelector(targetSelector);
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    if (position === 'bottom') {
      setCoords({
        top: rect.bottom + scrollY + offset,
        left: rect.left + scrollX + rect.width / 2,
      });
    } else if (position === 'top') {
      setCoords({
        bottom: window.innerHeight - rect.top - scrollY + offset,
        left: rect.left + scrollX + rect.width / 2,
      });
    } else if (position === 'right') {
      setCoords({
        top: rect.top + scrollY + rect.height / 2,
        left: rect.right + scrollX + offset,
        transformX: '0',
        transformY: '-50%',
      });
    } else if (position === 'left') {
      setCoords({
        top: rect.top + scrollY + rect.height / 2,
        right: window.innerWidth - rect.left - scrollX + offset,
        transformX: '0',
        transformY: '-50%',
      });
    }
  }, [targetSelector, position, offset]);

  useEffect(() => {
    updatePosition();
    
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    
    const interval = setInterval(updatePosition, 300);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
      clearInterval(interval);
    };
  }, [updatePosition]);

  if (!coords) return null;

  const style = {
    position: 'absolute',
    ...(coords.top !== undefined && { top: coords.top }),
    ...(coords.bottom !== undefined && { bottom: coords.bottom }),
    ...(coords.left !== undefined && { left: coords.left }),
    ...(coords.right !== undefined && { right: coords.right }),
    transform: `translate(${coords.transformX || '-50%'}, ${coords.transformY || '0'})`,
    zIndex: 10001,
  };

  return createPortal(
    <div style={style}>
      {children}
    </div>,
    document.body
  );
};

const OnboardingGuide = () => {
  const { 
    isOnboarding, 
    currentStep, 
    advanceStep,
    completeOnboarding, 
    skipOnboarding 
  } = useOnboarding();
  
  const [showComplete, setShowComplete] = useState(false);

  // Auto-complete after showing success message
  useEffect(() => {
    if (currentStep === ONBOARDING_STEPS.COMPLETE) {
      setShowComplete(true);
      const timer = setTimeout(() => {
        completeOnboarding();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [currentStep, completeOnboarding]);

  if (!isOnboarding) return null;

  // Welcome modal - minimal, inviting
  if (currentStep === ONBOARDING_STEPS.WELCOME) {
    return (
      <div className={styles.overlay}>
        <div className={styles.welcomeModal}>
          <div className={styles.welcomeIcon}>👋</div>
          <h2>Welcome to HabitLock</h2>
          <p>Build better habits with visual tracking. Let's create your first one.</p>
          
          <div className={styles.actions}>
            <button className={styles.skipBtn} onClick={skipOnboarding}>
              I'll explore on my own
            </button>
            <button className={styles.primaryBtn} onClick={advanceStep}>
              Get started
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Prompt to click Add Habit button
  if (currentStep === ONBOARDING_STEPS.CREATE_HABIT) {
    return (
      <AnchoredPopover targetSelector="[data-onboarding='add-habit']" position="bottom">
        <div className={styles.popover}>
          <div className={styles.popoverArrow} data-position="top" />
          <div className={styles.popoverContent}>
            <div className={styles.popoverStep}>1 of 2</div>
            <div className={styles.popoverTitle}>Create a habit</div>
            <div className={styles.popoverText}>Click here to get started</div>
            <button className={styles.popoverSkip} onClick={skipOnboarding}>
              Skip
            </button>
          </div>
        </div>
      </AnchoredPopover>
    );
  }

  // Step 1b: Inside the modal - guide the form
  if (currentStep === ONBOARDING_STEPS.FILLING_HABIT) {
    return (
      <AnchoredPopover targetSelector="[data-onboarding='habit-modal']" position="right" offset={16}>
        <div className={styles.popover} data-modal-guide>
          <div className={styles.popoverArrow} data-position="left" />
          <div className={styles.popoverContent}>
            <div className={styles.popoverStep}>1 of 2</div>
            <div className={styles.popoverTitle}>Name your habit</div>
            <div className={styles.popoverText}>Pick an emoji and color, then save</div>
            <button className={styles.popoverSkip} onClick={skipOnboarding}>
              Skip
            </button>
          </div>
        </div>
      </AnchoredPopover>
    );
  }

  // Step 2: Track on calendar
  if (currentStep === ONBOARDING_STEPS.TRACK_HABIT) {
    return (
      <AnchoredPopover targetSelector="[data-onboarding='calendar']" position="top">
        <div className={styles.popover}>
          <div className={styles.popoverArrow} data-position="bottom" />
          <div className={styles.popoverContent}>
            <div className={styles.popoverStep}>2 of 2</div>
            <div className={styles.popoverTitle}>Track your progress</div>
            <div className={styles.popoverText}>Tap any day to log your habit</div>
            <button className={styles.popoverSkip} onClick={skipOnboarding}>
              Skip
            </button>
          </div>
        </div>
      </AnchoredPopover>
    );
  }

  // Complete state
  if (currentStep === ONBOARDING_STEPS.COMPLETE && showComplete) {
    return (
      <div className={styles.completeBanner}>
        <span className={styles.checkmark}>✓</span>
        <span>You're all set!</span>
      </div>
    );
  }

  return null;
};

export default OnboardingGuide;
