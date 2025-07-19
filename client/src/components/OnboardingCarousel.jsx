import { useState, useRef } from 'react';
import styles from './OnboardingCarousel.module.scss';

const OnboardingCarousel = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideRef = useRef(null);

  const slides = [
    {
      id: 'welcome',
      title: 'Welcome to HabitLock! 🎯',
      subtitle: 'Transform your life through smart habit tracking',
      content: (
        <div className={styles.welcomeContent}>
          <div className={styles.heroIcon}>🚀</div>
          <p>HabitLock is your complete habit-building companion with intelligent tracking, beautiful analytics, and a comprehensive achievement system that makes building lasting habits genuinely enjoyable.</p>
          
          <div className={styles.modernFeatures}>
            <div className={styles.featureSection}>
              <h3>✨ What makes HabitLock special?</h3>
              <div className={styles.featureGrid}>
                <div className={styles.featureItem}>
                  <div className={styles.featureIconBadge}>📅</div>
                  <div className={styles.featureContent}>
                    <h4>Interactive Calendar Interface</h4>
                    <p>Visual habit tracking with emoji rewards, streak highlights, and goal glow effects</p>
                  </div>
                </div>
                
                <div className={styles.featureItem}>
                  <div className={styles.featureIconBadge}>🔥</div>
                  <div className={styles.featureContent}>
                    <h4>Smart Goals & Streak System</h4>
                    <p>Flexible weekly targets with intelligent streak tracking and multipliers</p>
                  </div>
                </div>
                
                <div className={styles.featureItem}>
                  <div className={styles.featureIconBadge}>📊</div>
                  <div className={styles.featureContent}>
                    <h4>Comprehensive Analytics</h4>
                    <p>Year-long heatmaps, completion rates, streak analysis, and progress insights</p>
                  </div>
                </div>
                
                <div className={styles.featureItem}>
                  <div className={styles.featureIconBadge}>🏆</div>
                  <div className={styles.featureContent}>
                    <h4>Rich Achievement System</h4>
                    <p>50+ unique badges, level progression, challenges, and celebration animations</p>
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
                <p>🔥 12 day streak</p>
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
            <h4>🎯 Full Customization Options:</h4>
            <ul>
              <li><strong>48+ emojis:</strong> Fitness, productivity, wellness, learning, and creativity</li>
              <li><strong>48+ colors:</strong> Vibrant color palette for easy visual identification</li>
              <li><strong>Weekly goals:</strong> Flexible targets that adapt to your lifestyle</li>
              <li><strong>Rich descriptions:</strong> Add context and motivation reminders</li>
              <li><strong>Real-time sync:</strong> Your habits are securely stored and synced</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'daily-tracking',
      title: 'Interactive Calendar Tracking 📅',
      subtitle: 'Visual progress with smart feedback',
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
            <h4>✨ Smart Calendar Features:</h4>
            <ul>
              <li><strong>Emoji visualization:</strong> See your completed habits as emojis on calendar days</li>
              <li><strong>Goal glow effect:</strong> Habits glow when weekly goals are achieved</li>
              <li><strong>Multi-habit support:</strong> Stack multiple habits on the same day</li>
              <li><strong>Month navigation:</strong> Browse through past and future months easily</li>
              <li><strong>One-click completion:</strong> Toggle habits complete/incomplete instantly</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'analytics-insights',
      title: 'Powerful Analytics & Insights 📊',
      subtitle: 'Track progress with beautiful visualizations',
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
                <div className={styles.statLabel}>30-Day Rate</div>
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
          </div>
          <div className={styles.tips}>
            <h4>📈 Comprehensive Analytics:</h4>
            <ul>
              <li><strong>Year-long heatmaps:</strong> GitHub-style activity visualization per habit</li>
              <li><strong>Detailed streak metrics:</strong> Current, best, and historical streak data</li>
              <li><strong>Completion analytics:</strong> 30-day rates, weekly progress, and trends</li>
              <li><strong>Individual habit insights:</strong> Per-habit performance breakdown</li>
              <li><strong>Progress summaries:</strong> Total completions and milestone tracking</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'achievements-gamification',
      title: 'Achievement System & Gamification 🏆',
      subtitle: 'Unlock badges and level up your habits',
      content: (
        <div className={styles.instructionContent}>
          <div className={styles.achievementDemo}>
            <div className={styles.badgeShowcase}>
              <div className={styles.badgeCategory}>
                <h5>🔥 Streak Badges</h5>
                <div className={styles.badgeRow}>
                  <span className={styles.badge}>🔥</span>
                  <span className={styles.badge}>🏆</span>
                  <span className={styles.badge}>💎</span>
                </div>
              </div>
              <div className={styles.badgeCategory}>
                <h5>🎯 Goal Badges</h5>
                <div className={styles.badgeRow}>
                  <span className={styles.badge}>🎯</span>
                  <span className={styles.badge}>💯</span>
                  <span className={styles.badge}>⭐</span>
                </div>
              </div>
            </div>
            <div className={styles.levelProgress}>
              <div className={styles.levelCard}>
                <span>Level 3: Practitioner</span>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: '65%', backgroundColor: '#10b981' }}></div>
                </div>
                <span>325/500 points to Expert</span>
              </div>
            </div>
          </div>
          <div className={styles.tips}>
            <h4>🎮 Gamification Features:</h4>
            <ul>
              <li><strong>50+ unique badges:</strong> Streak, consistency, goal, and special achievement badges</li>
              <li><strong>Level progression:</strong> Advance from Novice to Legend through consistent habits</li>
              <li><strong>Point system:</strong> Earn points with streak multipliers and bonus achievements</li>
              <li><strong>Celebrations:</strong> Confetti animations and fanfare for badge unlocks</li>
              <li><strong>Challenge system:</strong> 7-day, 30-day, and seasonal challenges to keep you motivated</li>
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
              <p>Link new habits to existing routines for better consistency</p>
            </div>
            <div className={styles.strategyCard}>
              <span className={styles.strategyIcon}>🏆</span>
              <h4>Celebrate Progress</h4>
              <p>HabitLock's achievement system celebrates every win</p>
            </div>
            <div className={styles.strategyCard}>
              <span className={styles.strategyIcon}>🔄</span>
              <h4>Track & Adjust</h4>
              <p>Use analytics to understand your patterns and optimize</p>
            </div>
          </div>
          <div className={styles.finalMessage}>
            <h4>🚀 You're Ready to Transform Your Life!</h4>
            <p>With HabitLock's comprehensive tracking, analytics, and motivation system, you have everything you need to build lasting habits. Start today and watch your life transform one habit at a time.</p>
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

        <div className={styles.slideContainer} ref={slideRef}>
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