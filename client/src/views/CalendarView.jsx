import { useState } from 'react';
import CalendarGrid from '../components/CalendarGrid';
import HabitModal from '../components/HabitModal';
import { useHabits } from '../hooks/useHabits';
import { useCalendar } from '../hooks/useCalendar';
import styles from './CalendarView.module.scss';

const CalendarView = () => {
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [modalMode, setModalMode] = useState('create');

  const {
    habits,
    loading: habitsLoading,
    error: habitsError,
    addHabit,
    editHabit,
    removeHabit,
  } = useHabits();

  const {
    calendarMatrix,
    monthDisplayName,
    streaks,
    weekStats,
    loading: calendarLoading,
    error: calendarError,
    goToNextMonth,
    goToPrevMonth,
    goToToday,
    toggleHabitCompletion,
    getCompletedHabits,
    hasHabitMetWeeklyGoal,
  } = useCalendar(habits);

  const handleCreateHabit = () => {
    setModalMode('create');
    setEditingHabit(null);
    setIsHabitModalOpen(true);
  };

  const handleEditHabit = (habit) => {
    setModalMode('edit');
    setEditingHabit(habit);
    setIsHabitModalOpen(true);
  };

  const handleSaveHabit = async (habitIdOrData, updates = null) => {
    if (modalMode === 'edit' && updates) {
      await editHabit(habitIdOrData, updates);
    } else {
      await addHabit(habitIdOrData);
    }
  };

  const handleDeleteHabit = async (habitId) => {
    if (confirm('Are you sure you want to delete this habit? This will also remove all related history.')) {
      await removeHabit(habitId);
    }
  };

  const loading = habitsLoading || calendarLoading;
  const error = habitsError || calendarError;

  if (loading) {
    return (
      <div className={styles.calendarView}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading your habits...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.calendarView}>
        <div className={styles.error}>
          <p>Error loading data: {error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.calendarView}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.monthControls}>
          <button 
            className={styles.navButton}
            onClick={goToPrevMonth}
            title="Previous month"
          >
            ←
          </button>
          <h1 className={styles.monthTitle}>{monthDisplayName}</h1>
          <button 
            className={styles.navButton}
            onClick={goToNextMonth}
            title="Next month"
          >
            →
          </button>
        </div>

        <div className={styles.headerActions}>
          <button 
            className={styles.todayButton}
            onClick={goToToday}
          >
            Today
          </button>
          <button 
            className={styles.addHabitButton}
            onClick={handleCreateHabit}
          >
            + Add Habit
          </button>
        </div>
      </div>

      {/* Habits sidebar */}
      {habits.length > 0 && (
        <div className={styles.habitsSidebar}>
          <h3>Your Habits</h3>
          <div className={styles.habitsList}>
            {habits.map(habit => {
              const streak = streaks[habit.id] || 0;
              const weekStat = weekStats[habit.id];
              
              return (
                <div key={habit.id} className={styles.habitCard}>
                  <div className={styles.habitInfo}>
                    <span 
                      className={styles.habitEmoji}
                      style={{ backgroundColor: `${habit.color}20` }}
                    >
                      {habit.emoji}
                    </span>
                    <div className={styles.habitDetails}>
                      <div className={styles.habitName}>{habit.name}</div>
                      <div className={styles.habitStats}>
                        🔥 {streak} days • 
                        🎯 {weekStat?.completions || 0}/{habit.weeklyGoal} this week
                        {weekStat?.hasMetGoal && ' ✨'}
                      </div>
                    </div>
                  </div>
                  <div className={styles.habitActions}>
                    <button
                      className={styles.editButton}
                      onClick={() => handleEditHabit(habit)}
                      title="Edit habit"
                    >
                      ✏️
                    </button>
                    <button
                      className={styles.deleteButton}
                      onClick={() => handleDeleteHabit(habit.id)}
                      title="Delete habit"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className={styles.calendarSection}>
        {habits.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateContent}>
              <h2>Welcome to HabitLock! 🎯</h2>
              <p>Start building positive habits by creating your first habit tracker.</p>
              <button 
                className={styles.primaryButton}
                onClick={handleCreateHabit}
              >
                Create Your First Habit
              </button>
            </div>
          </div>
        ) : (
          <CalendarGrid
            calendarMatrix={calendarMatrix}
            habits={habits}
            getCompletedHabits={getCompletedHabits}
            onHabitToggle={toggleHabitCompletion}
            hasHabitMetWeeklyGoal={hasHabitMetWeeklyGoal}
          />
        )}
      </div>

      {/* Weekly Progress Summary */}
      {habits.length > 0 && (
        <div className={styles.weeklyProgress}>
          <h4>This Week's Progress</h4>
          <div className={styles.progressGrid}>
            {habits.map(habit => {
              const weekStat = weekStats[habit.id];
              const percentage = weekStat?.percentage || 0;
              
              return (
                <div key={habit.id} className={styles.progressCard}>
                  <div className={styles.progressHeader}>
                    <span className={styles.progressEmoji}>{habit.emoji}</span>
                    <span className={styles.progressName}>{habit.name}</span>
                    {weekStat?.hasMetGoal && <span className={styles.goalMet}>🎯</span>}
                  </div>
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progressFill}
                      style={{ 
                        width: `${Math.min(percentage, 100)}%`,
                        backgroundColor: habit.color 
                      }}
                    />
                  </div>
                  <div className={styles.progressText}>
                    {weekStat?.completions || 0} / {habit.weeklyGoal}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Habit Modal */}
      <HabitModal
        isOpen={isHabitModalOpen}
        onClose={() => setIsHabitModalOpen(false)}
        onSave={handleSaveHabit}
        habit={editingHabit}
        mode={modalMode}
      />
    </div>
  );
};

export default CalendarView; 