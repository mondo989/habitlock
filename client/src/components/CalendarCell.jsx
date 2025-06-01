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

  // Generate tooltip content
  const tooltipContent = useMemo(() => {
    if (completedHabitDetails.length === 0) {
      return (
        <div>
          <div className={styles.tooltipDate}>{day.dayjs.format('MMM D, YYYY')}</div>
          <div>Click to manage habits</div>
        </div>
      );
    }

    return (
      <div>
        <div className={styles.tooltipDate}>{day.dayjs.format('MMM D, YYYY')}</div>
        {completedHabitDetails.map(habit => {
          const hasMetGoal = hasHabitMetWeeklyGoal(habit.id, date);
          return (
            <div key={habit.id} className={styles.tooltipHabit}>
              <span className={styles.tooltipEmoji}>{habit.emoji}</span>
              <span className={styles.tooltipName}>{habit.name}</span>
              {hasMetGoal && <span className={styles.goalMet}>🎯</span>}
            </div>
          );
        })}
        <div style={{ marginTop: '4px', fontSize: '0.75rem', opacity: 0.8 }}>
          Click to manage habits
        </div>
      </div>
    );
  }, [completedHabitDetails, hasHabitMetWeeklyGoal, day, date]);

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

  return (
    <Tooltip content={tooltipContent} position="top">
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
              return (
                <span
                  key={habit.id}
                  className={`
                    ${styles.habitEmoji}
                    ${hasMetGoal ? styles.glowing : ''}
                  `}
                  onClick={(e) => handleHabitClick(e, habit.id)}
                  title={`${habit.name}${hasMetGoal ? ' (Goal met!)' : ''}`}
                >
                  {habit.emoji}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </Tooltip>
  );
};

export default CalendarCell; 