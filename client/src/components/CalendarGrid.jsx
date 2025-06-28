import CalendarCell from './CalendarCell';
import styles from './CalendarGrid.module.scss';

const CalendarGrid = ({ 
  calendarMatrix, 
  habits, 
  getCompletedHabits, 
  onHabitToggle,
  onHabitDetailClick,
  onDayClick,
  hasHabitMetWeeklyGoal,
  currentDate 
}) => {
  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={styles.calendarGrid}>
      {/* Day headers */}
      <div className={styles.dayHeaders}>
        {dayHeaders.map(day => (
          <div key={day} className={styles.dayHeader}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar weeks */}
      <div className={styles.calendarWeeks}>
        {calendarMatrix.map((week, weekIndex) => (
          <div key={weekIndex} className={styles.calendarWeek}>
            {week.map((day) => {
              const completedHabits = getCompletedHabits(day.date);
              
              return (
                <CalendarCell
                  key={day.date}
                  day={day}
                  habits={habits}
                  completedHabits={completedHabits}
                  onHabitToggle={onHabitToggle}
                  onHabitDetailClick={onHabitDetailClick}
                  onDayClick={onDayClick}
                  hasHabitMetWeeklyGoal={hasHabitMetWeeklyGoal}
                  isCurrentMonth={day.isCurrentMonth}
                  isToday={day.isToday}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarGrid; 