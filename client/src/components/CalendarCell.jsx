import { useMemo } from 'react';
import Tooltip from './Tooltip';
import styles from './CalendarCell.module.scss';

const CalendarCell = ({ 
  day, 
  habits, 
  completedHabits, 
  onHabitToggle,
  onHabitDetailClick,
  onDayClick,
  hasHabitMetWeeklyGoal,
  isCurrentMonth = true,
  isToday = false 
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

  // Generate background gradient for multiple habits
  const backgroundStyle = useMemo(() => {
    if (completedHabitDetails.length === 0) return {};

    if (completedHabitDetails.length === 1) {
      const habit = completedHabitDetails[0];
      const hasMetGoal = hasHabitMetWeeklyGoal(habit.id, date);
      return {
        backgroundColor: hasMetGoal ? habit.color : `${habit.color}40`,
      };
    }

    // Multiple habits - create animated gradient
    const colors = completedHabitDetails.map(habit => {
      const hasMetGoal = hasHabitMetWeeklyGoal(habit.id, date);
      return hasMetGoal ? habit.color : `${habit.color}60`;
    });

    // Create multiple dramatic gradient variations for animation
    const gradientVariations = [];
    
    // Variation 1: Original diagonal
    gradientVariations.push(`linear-gradient(135deg, ${colors.join(', ')})`);
    
    // Variation 2: Reverse order with different angle
    const reversedColors = [...colors].reverse();
    gradientVariations.push(`linear-gradient(45deg, ${reversedColors.join(', ')})`);
    
    // Variation 3: Radial gradient from center
    gradientVariations.push(`radial-gradient(circle at center, ${colors.join(', ')})`);
    
    // Variation 4: Complex multi-stop gradient
    if (colors.length >= 2) {
      gradientVariations.push(`linear-gradient(225deg, ${colors[0]} 0%, ${colors[colors.length-1]} 30%, ${colors[1] || colors[0]} 60%, ${colors[0]} 100%)`);
    } else {
      gradientVariations.push(`linear-gradient(225deg, ${colors.join(', ')})`);
    }
    
    // Variation 5: Conic gradient for dramatic effect
    gradientVariations.push(`conic-gradient(from 0deg at 50% 50%, ${colors.join(', ')}, ${colors[0]})`);

    // Generate a unique animation based on date
    const dateHash = date.split('-').reduce((a, b) => a + parseInt(b), 0);
    const animationDelay = (dateHash % 10) * 0.3; // 0-3s delay
    const animationDuration = 3 + (dateHash % 4); // 3-6s duration for faster animations
    
    // Choose animation type based on date hash
    const animationTypes = ['gradientAnimation', 'rotatingConic', 'pulsatingRadial', 'flowingLinear'];
    const animationType = animationTypes[dateHash % animationTypes.length];
    
    return {
      background: gradientVariations[0], // Default gradient
      animation: `${animationType} ${animationDuration}s ease-in-out infinite`,
      animationDelay: `${animationDelay}s`,
      '--gradient0': gradientVariations[0] || `linear-gradient(135deg, ${colors.join(', ')})`,
      '--gradient1': gradientVariations[1] || `linear-gradient(45deg, ${colors.join(', ')})`,
      '--gradient2': gradientVariations[2] || `radial-gradient(circle at center, ${colors.join(', ')})`,
      '--gradient3': gradientVariations[3] || `linear-gradient(225deg, ${colors.join(', ')})`,
      '--gradient4': gradientVariations[4] || `conic-gradient(from 0deg, ${colors.join(', ')})`,
    };
  }, [completedHabitDetails, hasHabitMetWeeklyGoal, date]);

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
        ${!isCurrentMonth ? styles.otherMonth : ''}
        ${isToday ? styles.today : ''}
        ${completedHabitDetails.length > 0 ? styles.hasCompletions : ''}
        ${completedHabitDetails.length > 1 ? styles.animatedGradient : ''}
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
        <div className={styles.habitEmojis}>
          {completedHabitDetails.map(habit => {
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
                    ${hasMetGoal ? styles.glowing : ''}
                  `}
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