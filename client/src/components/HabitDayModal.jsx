import { useState, useEffect } from 'react';
import styles from './HabitDayModal.module.scss';

const HabitDayModal = ({ 
  isOpen, 
  onClose, 
  onSave,
  onEditHabit,
  date,
  day,
  habits,
  completedHabits,
  hasHabitMetWeeklyGoal,
  weekStats
}) => {
  const [selectedHabits, setSelectedHabits] = useState([]);

  useEffect(() => {
    if (isOpen) {
      // Filter out any undefined or invalid habit IDs from completedHabits
      const validCompletedHabits = (completedHabits || []).filter(habitId => habitId != null && habitId !== '');
      setSelectedHabits([...validCompletedHabits]);
    }
  }, [isOpen, completedHabits]);

  const handleHabitToggle = (habitId) => {
    if (!habitId || habitId === '') {
      console.warn('Invalid habit ID provided to handleHabitToggle:', habitId);
      return;
    }
    
    setSelectedHabits(prev => {
      if (prev.includes(habitId)) {
        return prev.filter(id => id !== habitId);
      } else {
        return [...prev, habitId];
      }
    });
  };

  const handleSave = () => {
    const validSelectedHabits = selectedHabits.filter(habitId => habitId != null && habitId !== '');
    onSave(date, validSelectedHabits);
    onClose();
  };

  const handleCancel = () => {
    setSelectedHabits([...completedHabits]);
    onClose();
  };

  const handleEditHabit = (e, habit) => {
    e.stopPropagation();
    onEditHabit(habit);
    onClose();
  };

  if (!isOpen || !day) return null;

  const hasChanges = JSON.stringify(selectedHabits.sort()) !== JSON.stringify(completedHabits.sort());

  return (
    <div className={styles.modalOverlay} onClick={handleCancel}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h2>{day.dayjs.format('MMMM D, YYYY')}</h2>
            <p className={styles.dayLabel}>
              {day.dayjs.format('dddd')}
              {day.isToday && <span className={styles.todayBadge}>Today</span>}
            </p>
          </div>
          <button 
            className={styles.closeButton}
            onClick={handleCancel}
          >
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          <h3>Select habits for this day:</h3>
          
          <div className={styles.habitsList}>
            {habits.filter(habit => habit && habit.id).map(habit => {
              const isSelected = selectedHabits.includes(habit.id);
              const hasMetGoal = hasHabitMetWeeklyGoal(habit.id, date);
              const weekStat = weekStats?.[habit.id] || { completions: 0, goal: habit.weeklyGoal, percentage: 0 };
              
              return (
                <div 
                  key={habit.id} 
                  className={`
                    ${styles.habitItem}
                    ${isSelected ? styles.selected : ''}
                    ${hasMetGoal ? styles.goalMet : ''}
                  `}
                  onClick={() => handleHabitToggle(habit.id)}
                >
                  <div className={styles.habitInfo}>
                    <span 
                      className={styles.habitEmoji}
                      style={{ backgroundColor: habit.color }}
                    >
                      {habit.emoji}
                    </span>
                    
                    <div className={styles.habitDetails}>
                      <div className={styles.habitName}>{habit.name}</div>
                      {habit.description && (
                        <div className={styles.habitDescription}>{habit.description}</div>
                      )}
                      
                      <div className={styles.habitStats}>
                        <div className={styles.weeklyProgress}>
                          <span className={styles.progressText}>
                            {weekStat.completions}/{weekStat.goal} this week
                          </span>
                          <div className={styles.progressBar}>
                            <div 
                              className={styles.progressFill}
                              style={{ 
                                width: `${Math.min(weekStat.percentage, 100)}%`,
                                backgroundColor: habit.color 
                              }}
                            />
                          </div>
                        </div>
                        {hasMetGoal && (
                          <div className={styles.goalMetBadge}>🎯 Goal achieved!</div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className={styles.habitActions}>
                    <button 
                      className={styles.editButton}
                      onClick={(e) => handleEditHabit(e, habit)}
                      title="Edit habit"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="m18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    
                    <div className={styles.checkbox}>
                      <div className={`${styles.checkmark} ${isSelected ? styles.checked : ''}`}>
                        {isSelected && '✓'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {habits.length === 0 && (
            <div className={styles.emptyState}>
              <p>No habits created yet. Create your first habit to get started!</p>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <div className={styles.summary}>
            {selectedHabits.length} of {habits.length} habits selected
          </div>
          <div className={styles.actions}>
            <button 
              className={styles.cancelButton}
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button 
              className={`${styles.saveButton} ${hasChanges ? styles.hasChanges : ''}`}
              onClick={handleSave}
              disabled={!hasChanges}
            >
              {hasChanges ? 'Save Changes' : 'No Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HabitDayModal; 