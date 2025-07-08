import { useState, useRef, useEffect } from 'react';
import styles from './OnboardingCarousel.module.scss';

const OnboardingCarousel = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const slideRef = useRef(null);

  // Minimum swipe distance required
  const minSwipeDistance = 50;

  const slides = [
    {
      id: 'welcome',
      title: 'Welcome to HabitLock! 🎯',
      subtitle: 'Your journey to better habits starts here',
      content: (
        <div className={styles.welcomeContent}>
          <div className={styles.heroIcon}>🚀</div>
          <p>HabitLock helps you build lasting habits through smart tracking, beautiful analytics, and achievement systems that make habit-building actually enjoyable.</p>
          
          <div className={styles.modernFeatures}>
            <div className={styles.featureSection}>
              <h3>✨ What makes HabitLock special?</h3>
              <div className={styles.featureGrid}>
                <div className={styles.featureItem}>
                  <div className={styles.featureIconBadge}>📅</div>
                  <div className={styles.featureContent}>
                    <h4>Interactive Calendar Tracking</h4>
                    <p>Visual habit tracking with emoji rewards and streak highlights</p>
                  </div>
                </div>
                
                <div className={styles.featureItem}>
                  <div className={styles.featureIconBadge}>🔥</div>
                  <div className={styles.featureContent}>
                    <h4>Smart Goals & Streaks</h4>
                    <p>Weekly targets that adapt to your lifestyle, not rigid daily requirements</p>
                  </div>
                </div>
                
                <div className={styles.featureItem}>
                  <div className={styles.featureIconBadge}>📊</div>
                  <div className={styles.featureContent}>
                    <h4>Beautiful Analytics</h4>
                    <p>Activity heatmaps, completion rates, and time-based insights</p>
                  </div>
                </div>
                
                <div className={styles.featureItem}>
                  <div className={styles.featureIconBadge}>🏆</div>
                  <div className={styles.featureContent}>
                    <h4>Achievement System</h4>
                    <p>13+ unique badges including time-based challenges and milestones</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'create-habits',
      title: 'Create & Customize Your Habits 🎨',
      subtitle: 'Personalize your habit tracking experience',
      content: (
        <div className={styles.instructionContent}>
          <div className={styles.mockupContainer}>
            <div className={styles.mockHabitCard}>
              <div className={styles.mockEmoji} style={{ backgroundColor: '#3b82f6' }}>🏃‍♂️</div>
              <div className={styles.mockHabitInfo}>
                <h4>Morning Run</h4>
                <p>Goal: 3 times/week</p>
              </div>
            </div>
            <div className={styles.customizationPreview}>
              <div className={styles.emojiGrid}>
                <span>💪</span><span>📚</span><span>🧘‍♀️</span><span>💧</span>
              </div>
              <div className={styles.colorGrid}>
                <div style={{ backgroundColor: '#3b82f6' }}></div>
                <div style={{ backgroundColor: '#10b981' }}></div>
                <div style={{ backgroundColor: '#f59e0b' }}></div>
                <div style={{ backgroundColor: '#ef4444' }}></div>
              </div>
            </div>
          </div>
          <div className={styles.tips}>
            <h4>🎯 Customization Options:</h4>
            <ul>
              <li><strong>48 emojis:</strong> Choose from fitness, productivity, wellness & more</li>
              <li><strong>48 colors:</strong> Personalize with vibrant colors for easy identification</li>
              <li><strong>Weekly goals:</strong> Set realistic targets (default: 3 times/week)</li>
              <li><strong>Descriptions:</strong> Add context to remember why this habit matters</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'daily-tracking',
      title: 'Interactive Calendar Tracking 📅',
      subtitle: 'Visual progress with emoji rewards',
      content: (
        <div className={styles.instructionContent}>
          <div className={styles.trackingDemo}>
            <div className={styles.calendarPreview}>
              <div className={styles.calendarHeader}>
                <span>December 2024</span>
                <div className={styles.weeklyProgress}>
                  <span>3/3 goals met this week</span>
                </div>
              </div>
              <div className={styles.calendarGrid}>
                <div className={styles.calendarDay}>1</div>
                <div className={styles.calendarDay}>2</div>
                <div className={`${styles.calendarDay} ${styles.completed}`}>
                  <span className={styles.habitEmoji}>🏃‍♂️</span>
                </div>
                <div className={`${styles.calendarDay} ${styles.completed} ${styles.multiHabit}`}>
                  <span className={styles.habitEmoji}>💪</span>
                  <span className={styles.habitEmoji}>📚</span>
                </div>
                <div className={`${styles.calendarDay} ${styles.completed} ${styles.goalGlow}`}>
                  <span className={styles.habitEmoji}>🧘‍♀️</span>
                </div>
                <div className={`${styles.calendarDay} ${styles.today}`}>6</div>
                <div className={styles.calendarDay}>7</div>
              </div>
            </div>
          </div>
          <div className={styles.tips}>
            <h4>✨ Interactive Features:</h4>
            <ul>
              <li><strong>Emoji tracking:</strong> See your habits as emojis on completed days</li>
              <li><strong>Goal glow effect:</strong> Habits glow when weekly goals are achieved</li>
              <li><strong>Multi-habit days:</strong> Stack multiple habits on the same day</li>
              <li><strong>Click any day:</strong> Quickly mark habits complete or incomplete</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'streaks-goals',
      title: 'Weekly Goals & Streak Tracking 🔥',
      subtitle: 'Sustainable progress with smart psychology',
      content: (
        <div className={styles.instructionContent}>
          <div className={styles.streakDemo}>
            <div className={styles.habitCardPreview}>
              <div className={styles.habitCardHeader}>
                <span className={styles.streakEmoji} style={{ backgroundColor: '#3b82f620' }}>🏃‍♂️</span>
                <div className={styles.habitCardInfo}>
                  <h4>Morning Run</h4>
                  <p>🔥 12 day streak</p>
                </div>
                <div className={styles.goalBadge}>🎯 Goal Met!</div>
              </div>
              <div className={styles.weeklySection}>
                <div className={styles.weeklyHeader}>
                  <span>This Week</span>
                  <span>3/3</span>
                </div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: '100%', backgroundColor: '#10b981' }}></div>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.tips}>
            <h4>🎯 Smart Goal System:</h4>
            <ul>
              <li><strong>Weekly targets:</strong> More flexible than daily requirements</li>
              <li><strong>Visual feedback:</strong> Progress bars and goal achievement badges</li>
              <li><strong>Streak psychology:</strong> Build momentum with consecutive days</li>
              <li><strong>Forgiving system:</strong> Missing one day doesn't break progress</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'analytics',
      title: 'Detailed Analytics & Achievements 🏆',
      subtitle: 'Track progress and unlock badges',
      content: (
        <div className={styles.instructionContent}>
          <div className={styles.analyticsDemo}>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statNumber}>12</div>
                <div className={styles.statLabel}>Current Streak</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statNumber}>87%</div>
                <div className={styles.statLabel}>Completion Rate</div>
              </div>
            </div>
            <div className={styles.heatmapPreview}>
              <h5>📅 Year Activity Heatmap</h5>
              <div className={styles.miniHeatmap}>
                <div className={styles.heatmapRow}>
                  <div className={styles.daySquare}></div>
                  <div className={`${styles.daySquare} ${styles.light}`}></div>
                  <div className={`${styles.daySquare} ${styles.active}`}></div>
                  <div className={`${styles.daySquare} ${styles.active}`}></div>
                  <div className={styles.daySquare}></div>
                  <div className={`${styles.daySquare} ${styles.light}`}></div>
                  <div className={`${styles.daySquare} ${styles.active}`}></div>
                </div>
              </div>
            </div>
            <div className={styles.achievementPreview}>
              <span className={styles.badge}>🔥</span>
              <span className={styles.badge}>💯</span>
              <span className={styles.badge}>🎯</span>
            </div>
          </div>
          <div className={styles.tips}>
            <h4>📊 What You'll Get:</h4>
            <ul>
              <li><strong>Visual activity heatmaps:</strong> Year-long overview per habit</li>
              <li><strong>Detailed metrics:</strong> Streaks, completion rates, weekly progress</li>
              <li><strong>Achievement badges:</strong> Unlock 20+ badges for milestones</li>
              <li><strong>Habit insights:</strong> Individual performance analytics</li>
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

  // Touch event handlers for swipe gestures
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentSlide < slides.length - 1) {
      nextSlide();
    }
    if (isRightSwipe && currentSlide > 0) {
      prevSlide();
    }
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

        <div 
          className={styles.slideContainer}
          ref={slideRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
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
          <div className={styles.mobileSwipeHint}>
            👆 Swipe to navigate • {currentSlide + 1} of {slides.length}
          </div>
          
          <div className={styles.desktopNavigation}>
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
    </div>
  );
};

export default OnboardingCarousel; 