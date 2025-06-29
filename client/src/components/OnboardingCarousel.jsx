import { useState } from 'react';
import styles from './OnboardingCarousel.module.scss';

const OnboardingCarousel = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 'welcome',
      title: 'Welcome to HabitLock! 🎯',
      subtitle: 'Your journey to better habits starts here',
      content: (
        <div className={styles.welcomeContent}>
          <div className={styles.heroIcon}>🚀</div>
          <p>HabitLock helps you build lasting habits through smart tracking, beautiful analytics, and proven habit-building strategies.</p>
          <div className={styles.featureList}>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>📈</span>
              <span>Visual progress tracking</span>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>🔥</span>
              <span>Streak motivation</span>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>📊</span>
              <span>Detailed analytics</span>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>🎯</span>
              <span>Goal setting & tracking</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'create-habits',
      title: 'Creating Your First Habit 📝',
      subtitle: 'Start small, think big',
      content: (
        <div className={styles.instructionContent}>
          <div className={styles.mockupContainer}>
            <div className={styles.mockHabitCard}>
              <div className={styles.mockEmoji}>🏃‍♂️</div>
              <div className={styles.mockHabitInfo}>
                <h4>Morning Run</h4>
                <p>Goal: 5 times/week</p>
              </div>
            </div>
          </div>
          <div className={styles.tips}>
            <h4>💡 Pro Tips for Success:</h4>
            <ul>
              <li><strong>Start small:</strong> 10-minute walk → 30-minute run</li>
              <li><strong>Be specific:</strong> "Exercise" → "20-minute morning jog"</li>
              <li><strong>Set realistic goals:</strong> 3-4 times per week is often better than daily</li>
              <li><strong>Choose meaningful emojis:</strong> They make tracking more fun!</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'daily-tracking',
      title: 'Daily Tracking Made Simple ✅',
      subtitle: 'One click to build momentum',
      content: (
        <div className={styles.instructionContent}>
          <div className={styles.trackingDemo}>
            <div className={styles.calendarPreview}>
              <div className={styles.calendarHeader}>
                <span>December 2024</span>
              </div>
              <div className={styles.calendarGrid}>
                <div className={styles.calendarDay}>1</div>
                <div className={styles.calendarDay}>2</div>
                <div className={styles.calendarDay}>3</div>
                <div className={`${styles.calendarDay} ${styles.completed}`}>4</div>
                <div className={`${styles.calendarDay} ${styles.completed}`}>5</div>
                <div className={`${styles.calendarDay} ${styles.today}`}>6</div>
                <div className={styles.calendarDay}>7</div>
              </div>
            </div>
          </div>
          <div className={styles.tips}>
            <h4>🎯 Tracking Best Practices:</h4>
            <ul>
              <li><strong>Track immediately:</strong> Mark complete right after doing the habit</li>
              <li><strong>Be honest:</strong> Only mark complete when you actually do it</li>
              <li><strong>Don't break the chain:</strong> Consistency beats perfection</li>
              <li><strong>Review regularly:</strong> Check your progress weekly</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'streaks-goals',
      title: 'Understanding Streaks & Goals 🔥',
      subtitle: 'The psychology of momentum',
      content: (
        <div className={styles.instructionContent}>
          <div className={styles.streakDemo}>
            <div className={styles.streakCard}>
              <div className={styles.streakHeader}>
                <span className={styles.streakEmoji}>🏃‍♂️</span>
                <div>
                  <h4>Morning Run</h4>
                  <p>Goal: 5 times/week</p>
                </div>
                <div className={styles.streakBadge}>🔥 12</div>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: '80%' }}></div>
              </div>
              <p>This week: 4/5 complete</p>
            </div>
          </div>
          <div className={styles.tips}>
            <h4>🧠 The Science Behind Streaks:</h4>
            <ul>
              <li><strong>Momentum matters:</strong> Each day makes the next easier</li>
              <li><strong>Visual progress:</strong> Seeing your streak motivates continuation</li>
              <li><strong>Weekly goals:</strong> More sustainable than daily requirements</li>
              <li><strong>Recovery mindset:</strong> One missed day doesn't ruin progress</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'analytics',
      title: 'Powerful Analytics & Insights 📊',
      subtitle: 'Data-driven habit building',
      content: (
        <div className={styles.instructionContent}>
          <div className={styles.analyticsDemo}>
            <div className={styles.heatmapPreview}>
              <h5>🗓️ Activity Overview</h5>
              <div className={styles.miniHeatmap}>
                <div className={styles.heatmapRow}>
                  <div className={styles.daySquare}></div>
                  <div className={styles.daySquare}></div>
                  <div className={`${styles.daySquare} ${styles.active}`}></div>
                  <div className={`${styles.daySquare} ${styles.active}`}></div>
                  <div className={styles.daySquare}></div>
                  <div className={`${styles.daySquare} ${styles.active}`}></div>
                  <div className={styles.daySquare}></div>
                </div>
              </div>
            </div>
            <div className={styles.insightCard}>
              <span>💪</span>
              <p>Excellent consistency: 85% completion rate</p>
            </div>
          </div>
          <div className={styles.tips}>
            <h4>📈 Use Analytics To:</h4>
            <ul>
              <li><strong>Identify patterns:</strong> When are you most successful?</li>
              <li><strong>Celebrate progress:</strong> See how far you've come</li>
              <li><strong>Optimize goals:</strong> Adjust based on real performance</li>
              <li><strong>Stay motivated:</strong> Visual progress builds momentum</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'success-tips',
      title: 'Your Path to Success 🌟',
      subtitle: 'Evidence-based strategies that work',
      content: (
        <div className={styles.successContent}>
          <div className={styles.strategyGrid}>
            <div className={styles.strategyCard}>
              <span className={styles.strategyIcon}>🎯</span>
              <h4>Start Small</h4>
              <p>2-minute rule: make it so easy you can't say no</p>
            </div>
            <div className={styles.strategyCard}>
              <span className={styles.strategyIcon}>⏰</span>
              <h4>Stack Habits</h4>
              <p>Link new habits to existing routines</p>
            </div>
            <div className={styles.strategyCard}>
              <span className={styles.strategyIcon}>🏆</span>
              <h4>Celebrate Wins</h4>
              <p>Acknowledge every completion, no matter how small</p>
            </div>
            <div className={styles.strategyCard}>
              <span className={styles.strategyIcon}>🔄</span>
              <h4>Be Consistent</h4>
              <p>80% consistency beats 100% perfection</p>
            </div>
          </div>
          <div className={styles.finalMessage}>
            <h4>🚀 You're Ready to Build Amazing Habits!</h4>
            <p>Remember: Every expert was once a beginner. Start today, stay consistent, and watch your life transform one habit at a time.</p>
          </div>
        </div>
      )
    }
  ];

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

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const handleComplete = () => {
    // Store completion in localStorage
    localStorage.setItem('habitlock_onboarding_completed', 'true');
    onComplete();
  };

  const handleSkip = () => {
    handleComplete();
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
                onClick={() => goToSlide(index)}
              />
            ))}
          </div>
          <button
            className={styles.skipButton}
            onClick={handleSkip}
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
          <button
            className={styles.prevButton}
            onClick={prevSlide}
            disabled={currentSlide === 0}
          >
            Previous
          </button>
          
          <div className={styles.slideCounter}>
            {currentSlide + 1} of {slides.length}
          </div>
          
          <button
            className={styles.nextButton}
            onClick={nextSlide}
          >
            {currentSlide === slides.length - 1 ? 'Get Started!' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingCarousel; 