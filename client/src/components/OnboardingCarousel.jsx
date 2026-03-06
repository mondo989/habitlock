import { useState } from 'react';
import styles from './OnboardingCarousel.module.scss';

const OnboardingCarousel = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 'welcome',
      title: 'Welcome',
      subtitle: 'A simple habit tracker to help you stay consistent',
      content: (
        <div className={styles.welcomeContent}>
          <p className={styles.introText}>
            Track your daily habits, see your progress over time, and build streaks that keep you motivated.
          </p>
          
          <div className={styles.quickSteps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepContent}>
                <h4>Create a habit</h4>
                <p>Click "Add Habit" and pick an emoji, color, and weekly goal</p>
              </div>
            </div>
            
            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepContent}>
                <h4>Mark completions</h4>
                <p>Click any day on the calendar to log when you completed a habit</p>
              </div>
            </div>
            
            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepContent}>
                <h4>Watch your progress</h4>
                <p>Check Stats for streaks and patterns, unlock achievements as you go</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'tips',
      title: 'Quick tips',
      subtitle: 'A few things that help habits stick',
      content: (
        <div className={styles.tipsContent}>
          <div className={styles.tipsList}>
            <div className={styles.tipItem}>
              <div className={styles.tipIcon}>1</div>
              <div className={styles.tipText}>
                <strong>Start with one habit.</strong> It's easier to build consistency when you're not overwhelmed.
              </div>
            </div>
            
            <div className={styles.tipItem}>
              <div className={styles.tipIcon}>2</div>
              <div className={styles.tipText}>
                <strong>Set realistic weekly goals.</strong> 3-4 days per week is often more sustainable than daily.
              </div>
            </div>
            
            <div className={styles.tipItem}>
              <div className={styles.tipIcon}>3</div>
              <div className={styles.tipText}>
                <strong>Don't break the chain.</strong> Streaks are motivating, but if you miss a day, just start again.
              </div>
            </div>
          </div>
          
          <div className={styles.readyMessage}>
            <p>That's it. You're ready to start tracking.</p>
          </div>
        </div>
      )
    }
  ];

  const handleComplete = () => {
    localStorage.setItem('habitlock_onboarding_completed', 'true');
    onComplete();
  };

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleComplete();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <div className={styles.onboardingOverlay}>
      <div className={styles.onboardingModal}>
        <div className={styles.modalHeader}>
          <div className={styles.progressIndicator}>
            {slides.map((_, index) => (
              <div
                key={index}
                className={`${styles.progressDot} ${index <= currentSlide ? styles.active : ''}`}
              />
            ))}
          </div>
          <button
            className={styles.skipButton}
            onClick={handleComplete}
          >
            Skip
          </button>
        </div>

        <div className={styles.slideContainer}>
          <div className={styles.slideContent}>
            <div className={styles.slideHeader}>
              <h2>{slides[currentSlide].title}</h2>
              <p className={styles.slideSubtitle}>{slides[currentSlide].subtitle}</p>
            </div>
            <div className={styles.slideBody}>
              {slides[currentSlide].content}
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <div className={styles.navigation}>
            {currentSlide > 0 && (
              <button
                className={styles.prevButton}
                onClick={prevSlide}
              >
                Back
              </button>
            )}
            
            <button
              className={styles.nextButton}
              onClick={nextSlide}
            >
              {currentSlide === slides.length - 1 ? 'Start tracking' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingCarousel; 