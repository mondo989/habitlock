import { useMemo } from 'react';
import Tooltip from './Tooltip';
import styles from './CalendarCell.module.scss';

// Helper function to get day of year
const getDayOfYear = (date) => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
};

const CalendarCell = ({ 
  day, 
  habits, 
  completedHabits, 
  onHabitToggle,
  onHabitDetailClick,
  onDayClick,
  hasHabitMetWeeklyGoal,
  isCurrentMonth = true,
  isToday = false,
  animationIndex = 0
}) => {
  const { date } = day;

  // Get habit details for completed habits
  const completedHabitDetails = useMemo(() => {
    return habits.filter(habit => 
      habit && 
      habit.id && 
      completedHabits.includes(habit.id)
    );
  }, [habits, completedHabits]);

  // Calculate sequential loading animation delays
  const loadingAnimationStyle = useMemo(() => {
    const baseDelay = animationIndex * 0.05; // 50ms between each cell
    const backgroundDelay = baseDelay;
    const emojiDelay = baseDelay + 0.15; // Emoji appears 150ms after background
    
    return {
      '--loading-delay': `${baseDelay}s`,
      '--background-delay': `${backgroundDelay}s`,
      '--emoji-delay': `${emojiDelay}s`,
    };
  }, [animationIndex]);

  // Generate background gradient for multiple habits
  const backgroundStyle = useMemo(() => {
    if (completedHabitDetails.length === 0) return loadingAnimationStyle;

    if (completedHabitDetails.length === 1) {
      const habit = completedHabitDetails[0];
      const hasMetGoal = hasHabitMetWeeklyGoal(habit.id, date);
      // Ensure we have a valid color, fallback to a default if needed
      const validColor = habit.color && habit.color.startsWith('#') && habit.color.length >= 7 ? habit.color : '#3b82f6';
      
      // Even single habits should get animated gradients for consistency
      const seedHash = Math.abs((habit.id + date).split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0));
      const rng = {
        next: () => Math.sin(seedHash) * 10000 - Math.floor(Math.sin(seedHash) * 10000),
        range: (min, max) => min + (Math.sin(seedHash) * 10000 - Math.floor(Math.sin(seedHash) * 10000)) * (max - min),
        int: (min, max) => Math.floor(min + (Math.sin(seedHash) * 10000 - Math.floor(Math.sin(seedHash) * 10000)) * (max - min))
      };
      
      const color1 = hasMetGoal ? validColor : `${validColor}CC`;
      const color2 = hasMetGoal ? `${validColor}DD` : `${validColor}99`;
      
      // Create a subtle gradient even for single habits
      const angle = (seedHash % 360);
      const primaryGradient = `linear-gradient(${angle}deg, ${color1} 0%, ${color2} 50%, ${color1} 100%)`;
      
      const rotationDuration = 60; // 60 seconds for single habits
      const animationDelay = (seedHash % 3);
      
      return {
        ...loadingAnimationStyle,
        '--gradient-background': primaryGradient,
        '--rotation-duration': `${rotationDuration}s`,
        '--gradient-animation-delay': `calc(var(--background-delay, 0.1s) + ${animationDelay}s)`,
      };
    }

    // Multiple habits - create clean animated gradients using only habit colors
    const colors = completedHabitDetails.map(habit => {
      const hasMetGoal = hasHabitMetWeeklyGoal(habit.id, date);
      // Ensure we have a valid color, fallback to a default if needed
      const validColor = habit.color && habit.color.startsWith('#') && habit.color.length >= 7 ? habit.color : '#3b82f6';
      return hasMetGoal ? validColor : `${validColor}CC`; // Use high opacity instead of low
    }).filter(color => color && color !== '#000000'); // Remove any invalid or black colors

    // Create unique seed for consistent animations
    const habitSignature = completedHabitDetails
      .map(h => `${h.id}-${h.color}`)
      .sort()
      .join('|');
    
    const dateNumbers = date.split('-').map(n => parseInt(n));
    const dayOfYear = getDayOfYear(new Date(dateNumbers[0], dateNumbers[1] - 1, dateNumbers[2]));
    
    const createHash = (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash);
    };
    
    const seedHash = createHash(habitSignature + date);
    
    // Simple seeded random
    class SeededRandom {
      constructor(seed) {
        this.seed = seed % 2147483647;
        if (this.seed <= 0) this.seed += 2147483646;
      }
      
      next() {
        this.seed = (this.seed * 16807) % 2147483647;
        return (this.seed - 1) / 2147483646;
      }
      
      range(min, max) {
        return min + this.next() * (max - min);
      }
      
      int(min, max) {
        return Math.floor(this.range(min, max));
      }
    }
    
    const rng = new SeededRandom(seedHash);

    // Safety check - if no valid colors, use default
    if (colors.length === 0) {
      colors.push('#3b82f6');
    }

    // Create simple, beautiful gradients using only habit colors
    const gradientTypes = [
      // Clean linear gradient
      () => {
        const angle = rng.int(0, 360);
        const stops = colors.map((color, i) => {
          const position = i * (100 / (colors.length - 1));
          return `${color} ${position}%`;
        }).join(', ');
        return `linear-gradient(${angle}deg, ${stops})`;
      },
      
      // Radial gradient
      () => {
        const centerX = rng.int(30, 70);
        const centerY = rng.int(30, 70);
        const stops = colors.map((color, i) => {
          const position = i * (100 / (colors.length - 1));
          return `${color} ${position}%`;
        }).join(', ');
        return `radial-gradient(ellipse at ${centerX}% ${centerY}%, ${stops})`;
      },
      
      // Conic gradient
      () => {
        const rotation = rng.int(0, 360);
        const stops = colors.map((color, i) => {
          const position = i * (360 / colors.length);
          return `${color} ${position}deg`;
        }).join(', ');
        return `conic-gradient(from ${rotation}deg, ${stops})`;
      }
    ];
    
    const gradientType = gradientTypes[rng.int(0, gradientTypes.length)];
    const primaryGradient = gradientType();
    
    // Animation parameters for rotation
    const rotationDuration = 60; // 60 seconds for multiple habits
    const animationDelay = rng.range(0, 2);
    
    return {
      ...loadingAnimationStyle,
      '--gradient-background': primaryGradient,
      '--rotation-duration': `${rotationDuration.toFixed(1)}s`,
      '--gradient-animation-delay': `calc(var(--background-delay, 0.1s) + ${animationDelay.toFixed(1)}s)`,
    };
  }, [completedHabitDetails, hasHabitMetWeeklyGoal, date, habits.length]);

  // Generate tooltip content for day number
  const dayNumberTooltipContent = useMemo(() => {
    // For empty cells, show the manage habits message
    if (completedHabitDetails.length === 0) {
      return (
        <div>
          <div className={styles.tooltipDate}>{day.dayjs.format('MMM D, YYYY')}</div>
          <div>Click to manage habits</div>
        </div>
      );
    }
    
    // For cells with habits, just show the date
    return (
      <div>
        <div className={styles.tooltipDate}>{day.dayjs.format('MMM D, YYYY')}</div>
      </div>
    );
  }, [completedHabitDetails, day]);

  const handleCellClick = (e) => {
    e.preventDefault();
    if (onDayClick) {
      onDayClick(date, day);
    }
  };

  const handleHabitClick = (e, habitId) => {
    e.stopPropagation();
    onHabitDetailClick(habitId);
  };

  return (
    <div
      className={`
        ${styles.calendarCell}
        ${styles.loadingCell}
        ${!isCurrentMonth ? styles.otherMonth : ''}
        ${isToday ? styles.today : ''}
        ${completedHabitDetails.length > 0 ? styles.hasCompletions : ''}
        ${completedHabitDetails.length > 0 ? styles.animatedGradient : ''}
      `}
      style={backgroundStyle}
      onClick={handleCellClick}
    >
      <div className={styles.dayNumber}>
        <Tooltip content={dayNumberTooltipContent} position="top">
          <span>
            {day.dayjs.date()}
          </span>
        </Tooltip>
      </div>
      
      {completedHabitDetails.length > 0 && (
        <div className={`${styles.habitEmojis} ${styles.loadingEmojis}`}>
          {completedHabitDetails.map((habit, emojiIndex) => {
            const hasMetGoal = hasHabitMetWeeklyGoal(habit.id, date);
            
            // Individual tooltip content for each emoji
            const emojiTooltipContent = (
              <div>
                <div className={styles.tooltipDate}>{day.dayjs.format('MMM D, YYYY')}</div>
                <div className={styles.tooltipHabit}>
                  <span className={styles.tooltipEmoji}>{habit.emoji}</span>
                  <span className={styles.tooltipName}>{habit.name}</span>
                  {hasMetGoal && <span className={styles.goalMet}>🎯 Goal met!</span>}
                </div>
                <div style={{ marginTop: '4px', fontSize: '0.75rem', opacity: 0.8 }}>
                  Click to view stats
                </div>
              </div>
            );
            
            return (
              <Tooltip key={habit.id} content={emojiTooltipContent} position="top">
                <span
                  className={`
                    ${styles.habitEmoji}
                    ${styles.loadingEmoji}
                    ${hasMetGoal ? styles.glowing : ''}
                  `}
                  style={{
                    '--emoji-index-delay': `${(animationIndex * 0.05) + 0.15 + (emojiIndex * 0.1)}s`
                  }}
                  onClick={(e) => handleHabitClick(e, habit.id)}
                >
                  {habit.emoji}
                </span>
              </Tooltip>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CalendarCell; 