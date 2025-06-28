import { useMemo } from 'react';
import Tooltip from './Tooltip';
import styles from './CalendarCell.module.scss';

const CalendarCell = ({ 
  day, 
  habits, 
  completedHabits, 
  onHabitToggle,
  onDayClick,
  hasHabitMetWeeklyGoal,
  isCurrentMonth = true,
  isToday = false 
}) => {
  const { date } = day;

  // Get habit details for completed habits
  const completedHabitDetails = useMemo(() => {
    return habits.filter(habit => completedHabits.includes(habit.id));
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

    // Multiple habits - create gradient
    const colors = completedHabitDetails.map(habit => {
      const hasMetGoal = hasHabitMetWeeklyGoal(habit.id, date);
      return hasMetGoal ? habit.color : `${habit.color}60`;
    });

    return {
      background: `linear-gradient(135deg, ${colors.join(', ')})`,
    };
  }, [completedHabitDetails, hasHabitMetWeeklyGoal, date]);

  // Generate cell-level tooltip content for empty days
  const cellTooltipContent = useMemo(() => {
    if (completedHabitDetails.length > 0) return null;
    
    return (
      <div>
        <div className={styles.tooltipDate}>{day.dayjs.format('MMM D, YYYY')}</div>
        <div>Click to manage habits</div>
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
    onHabitToggle(date, habitId);
  };

  const cellContent = (
    <div
      className={`
        ${styles.calendarCell}
        ${!isCurrentMonth ? styles.otherMonth : ''}
        ${isToday ? styles.today : ''}
        ${completedHabitDetails.length > 0 ? styles.hasCompletions : ''}
      `}
      style={backgroundStyle}
      onClick={handleCellClick}
    >
      <div className={styles.dayNumber}>
        {day.dayjs.date()}
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
                  Click to toggle
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

  // Only wrap with tooltip if there are no completed habits (empty cell)
  return completedHabitDetails.length === 0 ? (
    <Tooltip content={cellTooltipContent} position="top">
      {cellContent}
    </Tooltip>
  ) : (
    cellContent
  );
};

export default CalendarCell; 