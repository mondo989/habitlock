import { useState, useEffect } from 'react';
import styles from './AnimatedCalendar.module.scss';

const AnimatedCalendar = () => {
  const [animatingDay, setAnimatingDay] = useState(null);
  const [completedDays, setCompletedDays] = useState(new Set());
  const [todayCompleted, setTodayCompleted] = useState(false);
  
  // Get current date info
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  // Single habit being tracked (water intake)
  const habitEmoji = '💧';
  const habitName = 'Water';

  // Calculate completed days (simulate a good habit streak leading up to today)
  const getInitialCompletedDays = () => {
    const completed = new Set();
    
    // Simulate completed days with some realistic gaps
    for (let day = 1; day < currentDay; day++) {
      // 85% chance of completion for past days (realistic habit streak with some missed days)
      if (Math.random() > 0.15) {
        completed.add(day);
      }
    }
    
    return completed;
  };

  const [initialCompleted] = useState(() => getInitialCompletedDays());

  useEffect(() => {
    // Set initial completed days
    setCompletedDays(new Set(initialCompleted));

    const animateCompletion = () => {
      // Only animate if today hasn't been completed yet
      if (!todayCompleted) {
        setTimeout(() => {
          setAnimatingDay(currentDay);
          setTimeout(() => {
            setCompletedDays(prev => new Set([...prev, currentDay]));
            setTodayCompleted(true);
            setAnimatingDay(null);
          }, 1500);
        }, 3000);
      }
    };

    // Run animation once when component mounts
    animateCompletion();
  }, [currentDay, initialCompleted, todayCompleted]);

  const getDayClass = (day) => {
    if (animatingDay === day) return `${styles.day} ${styles.animating}`;
    if (day === currentDay) return `${styles.day} ${styles.today}`;
    if (completedDays.has(day)) return `${styles.day} ${styles.completed}`;
    return styles.day;
  };

  const renderDay = (day) => {
    const isCompleted = completedDays.has(day);
    const isAnimating = animatingDay === day;
    const isToday = day === currentDay;

    return (
      <div key={day} className={getDayClass(day)}>
        <svg viewBox="0 0 40 40" className={styles.daySvg}>
          {/* Background rectangle */}
          <rect
            x="2"
            y="2"
            width="36"
            height="36"
            rx="8"
            ry="8"
            className={styles.dayBackground}
          />
          
          {/* Progress border for completed days */}
          {(isCompleted || isAnimating) && (
            <rect
              x="2"
              y="2"
              width="36"
              height="36"
              rx="8"
              ry="8"
              className={styles.progressBorder}
              style={{
                animationDelay: isAnimating ? '0.3s' : '0s'
              }}
            />
          )}

          {/* Habit emoji - show for completed days OR today (even if not completed yet) */}
          {(isCompleted || isAnimating || (isToday && todayCompleted)) && (
            <text
              x="20"
              y="18"
              className={styles.habitEmoji}
              style={{
                animationDelay: isAnimating ? '0.8s' : '0s'
              }}
            >
              {habitEmoji}
            </text>
          )}

          {/* Particle burst animation */}
          {isAnimating && (
            <g className={styles.particles}>
              {[...Array(6)].map((_, i) => (
                <circle
                  key={i}
                  cx="20"
                  cy="20"
                  r="1.5"
                  className={styles.particle}
                  style={{
                    animationDelay: `${0.6 + i * 0.1}s`,
                    transform: `rotate(${i * 60}deg)`,
                    transformOrigin: '20px 20px'
                  }}
                />
              ))}
            </g>
          )}

          {/* Day number */}
          <text
            x="20"
            y="32"
            className={styles.dayNumber}
          >
            {day}
          </text>

          {/* Ripple effect for animation */}
          {isAnimating && (
            <rect
              x="2"
              y="2"
              width="36"
              height="36"
              rx="8"
              ry="8"
              className={styles.ripple}
            />
          )}
        </svg>
      </div>
    );
  };

  // Calculate current streak
  const getCurrentStreak = () => {
    let streak = 0;
    for (let day = currentDay - (todayCompleted ? 0 : 1); day >= 1; day--) {
      if (completedDays.has(day)) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const currentStreak = getCurrentStreak();

  return (
    <div className={styles.animatedCalendar}>
      <div className={styles.calendarHeader}>
        <h3>{currentMonth}</h3>
        <div className={styles.streakIndicator}>
          <svg viewBox="0 0 24 24" className={styles.streakIcon}>
            <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" />
          </svg>
          <span>{currentStreak} day streak!</span>
        </div>
      </div>
      
      <div className={styles.habitTitle}>
        <span className={styles.habitTitleEmoji}>{habitEmoji}</span>
        <span className={styles.habitTitleText}>Daily {habitName} Goal</span>
      </div>
      
      <div className={styles.calendarGrid}>
        {Array.from({ length: daysInMonth }, (_, i) => renderDay(i + 1))}
      </div>

      {/* Floating habit completion notification */}
      {animatingDay && (
        <div className={styles.notification}>
          <span className={styles.notificationEmoji}>{habitEmoji}</span>
          <span>{habitName} goal completed!</span>
        </div>
      )}
    </div>
  );
};

export default AnimatedCalendar; 