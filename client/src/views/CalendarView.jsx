import { useState } from 'react';
import CalendarGrid from '../components/CalendarGrid';
import HabitModal from '../components/HabitModal';
import HabitDayModal from '../components/HabitDayModal';
import HabitStatsModal from '../components/HabitStatsModal';
import { useHabits } from '../hooks/useHabits';
import { useCalendar } from '../hooks/useCalendar';
import { getWeekStatsForDate } from '../utils/streakUtils';
import styles from './CalendarView.module.scss';

const CalendarView = () => {
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [modalMode, setModalMode] = useState('create');
  
  // New state for day modal
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  // State for habit stats modal
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState(null);

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
    calendarEntries,
    loading: calendarLoading,
    error: calendarError,
    goToNextMonth,
    goToPrevMonth,
    goToToday,
    toggleHabitCompletion,
    getCompletedHabits,
    hasHabitMetWeeklyGoal,
  } = useCalendar(habits);

  // Calculate week stats for the selected date's week
  const selectedWeekStats = selectedDate 
    ? getWeekStatsForDate(habits, calendarEntries, new Date(selectedDate))
    : weekStats;

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

  // Handle day click to open modal
  const handleDayClick = (date, day) => {
    setSelectedDate(date);
    setSelectedDay(day);
    setIsDayModalOpen(true);
  };

  // Handle habit detail click to show stats
  const handleHabitDetailClick = (habitId) => {
    const habit = habits.find(h => h.id === habitId);
    if (habit) {
      setSelectedHabit(habit);
      setIsStatsModalOpen(true);
    }
  };

  // Handle saving habits for a specific day
  const handleSaveDayHabits = async (date, selectedHabits) => {
    try {
      // Filter out any undefined or falsy values
      const validSelectedHabits = selectedHabits.filter(habitId => habitId != null && habitId !== '');
      const currentCompleted = getCompletedHabits(date).filter(habitId => habitId != null && habitId !== '');
      
      // Calculate what habits need to be toggled
      const toAdd = validSelectedHabits.filter(habitId => !currentCompleted.includes(habitId));
      const toRemove = currentCompleted.filter(habitId => !validSelectedHabits.includes(habitId));
      
      // Toggle each habit that needs to change
      for (const habitId of [...toAdd, ...toRemove]) {
        if (habitId != null && habitId !== '') {
          await toggleHabitCompletion(date, habitId);
        }
      }
    } catch (error) {
      console.error('Error saving day habits:', error);
      // You could add user notification here
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
            onHabitDetailClick={handleHabitDetailClick}
            onDayClick={handleDayClick}
            hasHabitMetWeeklyGoal={hasHabitMetWeeklyGoal}
          />
        )}
      </div>

      {/* Habits sidebar - moved below calendar */}
      {habits.length > 0 && (
        <div className={styles.habitsContainer}>
          <div className={styles.habitsHeader}>
            <h3>Your Habits & Weekly Progress</h3>
            <div className={styles.weeklyStats}>
              {Object.values(weekStats || {}).filter(stat => stat?.hasMetGoal).length} of {habits.length} goals met this week
            </div>
          </div>
          
          <div className={styles.habitsGrid}>
            {habits.map(habit => {
              const streak = streaks[habit.id] || 0;
              const weekStat = weekStats[habit.id];
              const percentage = weekStat?.percentage || 0;
              
              return (
                <div key={habit.id} className={styles.habitCard}>
                  <div className={styles.habitMainInfo}>
                    <div className={styles.habitBasics}>
                      <span 
                        className={styles.habitEmoji}
                        style={{ backgroundColor: `${habit.color}20` }}
                      >
                        {habit.emoji}
                      </span>
                      <div className={styles.habitDetails}>
                        <div className={styles.habitName}>{habit.name}</div>
                        <div className={styles.habitDescription}>{habit.description}</div>
                        <div className={styles.habitStats}>
                          🔥 {streak} day streak
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
                  
                  <div className={styles.weeklyProgressSection}>
                    <div className={styles.progressHeader}>
                      <span className={styles.progressLabel}>This Week</span>
                      <div className={styles.progressStats}>
                        <span className={styles.progressText}>
                          {weekStat?.completions || 0} / {habit.weeklyGoal}
                        </span>
                        {weekStat?.hasMetGoal && <span className={styles.goalMet}>🎯 Goal Met!</span>}
                      </div>
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

      {/* Habit Day Modal */}
      <HabitDayModal
        isOpen={isDayModalOpen}
        onClose={() => setIsDayModalOpen(false)}
        onSave={handleSaveDayHabits}
        onEditHabit={handleEditHabit}
        date={selectedDate}
        day={selectedDay}
        habits={habits}
        completedHabits={selectedDate ? getCompletedHabits(selectedDate) : []}
        hasHabitMetWeeklyGoal={hasHabitMetWeeklyGoal}
        weekStats={selectedWeekStats}
      />

      {/* Habit Stats Modal */}
      <HabitStatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        onEditHabit={handleEditHabit}
        habit={selectedHabit}
        streaks={streaks}
        weekStats={weekStats}
        getCompletedHabits={getCompletedHabits}
        calendarMatrix={calendarMatrix}
      />
    </div>
  );
};

export default CalendarView; 