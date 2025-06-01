import { useState, useEffect } from 'react';
import styles from './HabitDayModal.module.scss';

const HabitDayModal = ({ 
  isOpen, 
  onClose, 
  onSave,
  date,
  day,
  habits,
  completedHabits,
  hasHabitMetWeeklyGoal
}) => {
  const [selectedHabits, setSelectedHabits] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedHabits([...completedHabits]);
    }
  }, [isOpen, completedHabits]);

  const handleHabitToggle = (habitId) => {
    setSelectedHabits(prev => {
      if (prev.includes(habitId)) {
        return prev.filter(id => id !== habitId);
      } else {
        return [...prev, habitId];
      }
    });
  };

  const handleSave = () => {
    onSave(date, selectedHabits);
    onClose();
  };

  const handleCancel = () => {
    setSelectedHabits([...completedHabits]);
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
            {habits.map(habit => {
              const isSelected = selectedHabits.includes(habit.id);
              const hasMetGoal = hasHabitMetWeeklyGoal(habit.id, date);
              
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
                      style={{ backgroundColor: `${habit.color}20` }}
                    >
                      {habit.emoji}
                    </span>
                    <div className={styles.habitDetails}>
                      <div className={styles.habitName}>{habit.name}</div>
                      {habit.description && (
                        <div className={styles.habitDescription}>{habit.description}</div>
                      )}
                      {hasMetGoal && (
                        <div className={styles.goalMetText}>🎯 Weekly goal achieved!</div>
                      )}
                    </div>
                  </div>
                  <div className={styles.checkbox}>
                    <div className={`${styles.checkmark} ${isSelected ? styles.checked : ''}`}>
                      {isSelected && '✓'}
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