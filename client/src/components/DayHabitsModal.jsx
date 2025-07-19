import { useMemo, useEffect } from 'react';
import { calculateWeeklyCompletions } from '../utils/streakUtils';
import useScrollLock from '../hooks/useScrollLock';
import styles from './DayHabitsModal.module.scss';

const DayHabitsModal = ({ 
  isOpen, 
  onClose, 
  day,
  habits,
  completedHabits,
  hasHabitMetWeeklyGoal,
  onHabitDetailClick,
  calendarEntries 
}) => {
  // Lock body scroll when modal is open
  useScrollLock(isOpen);

  // Add keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isOpen]);

  // Get habit details for completed habits
  const completedHabitDetails = useMemo(() => {
    return habits.filter(habit => 
      habit && 
      habit.id && 
      completedHabits.includes(habit.id)
    );
  }, [habits, completedHabits]);

  // Format the date
  const formattedDate = useMemo(() => {
    if (!day) return '';
    const date = new Date(day.date);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [day]);

  const handleHabitClick = (habitId) => {
    onHabitDetailClick(habitId);
    onClose(); // Close day modal after opening habit stats modal
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !day) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContent}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerInfo}>
            <h2>Daily Progress</h2>
            <p className={styles.dateText}>{formattedDate}</p>
          </div>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Habits Grid */}
        <div className={styles.modalBody}>
          {completedHabitDetails.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📝</div>
              <p>No habits completed on this day</p>
              <small>Keep building your streaks!</small>
            </div>
          ) : (
            <div className={styles.habitsGrid}>
              {completedHabitDetails.map((habit) => {
                const hasMetGoal = hasHabitMetWeeklyGoal(habit.id, day.date);
                const weeklyCompletions = calculateWeeklyCompletions(habit.id, day.date, calendarEntries);
                const weeklyProgress = habit.weeklyGoal ? 
                  `${weeklyCompletions}/${habit.weeklyGoal}` : 
                  `${weeklyCompletions}`;

                return (
                  <div
                    key={habit.id}
                    className={`${styles.habitCard} ${hasMetGoal ? styles.goalMet : ''}`}
                    onClick={() => handleHabitClick(habit.id)}
                  >
                    <div className={styles.habitHeader}>
                      <div 
                        className={styles.habitEmoji}
                        style={{ 
                          backgroundColor: habit.color,
                          boxShadow: hasMetGoal ? 
                            `0 0 20px ${habit.color}40` : 
                            `0 2px 8px ${habit.color}30`
                        }}
                      >
                        {habit.emoji}
                      </div>
                      <div className={styles.habitInfo}>
                        <h3 className={styles.habitName}>{habit.name}</h3>
                        {habit.description && (
                          <p className={styles.habitDescription}>{habit.description}</p>
                        )}
                      </div>
                      {hasMetGoal && (
                        <div className={styles.goalBadge}>
                          🎯 Goal Met!
                        </div>
                      )}
                    </div>

                    <div className={styles.habitStats}>
                      <div className={styles.weeklyProgress}>
                        <span className={styles.progressLabel}>This week:</span>
                        <span className={styles.progressValue}>{weeklyProgress}</span>
                      </div>
                      <div className={styles.tapHint}>
                        Tap for detailed stats →
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <div className={styles.summary}>
            <span className={styles.completedCount}>
              {completedHabitDetails.length}
            </span>
            <span className={styles.summaryText}>
              habit{completedHabitDetails.length === 1 ? '' : 's'} completed
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayHabitsModal; 