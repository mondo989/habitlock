import { useState, useEffect } from 'react';
import { useHabits } from '../hooks/useHabits';
import { useCalendar } from '../hooks/useCalendar';
import { getWeekStatsForDate, getBestStreak, getHabitStatsForRange } from '../utils/streakUtils';
import CalendarGrid from '../components/CalendarGrid';
import HabitModal from '../components/HabitModal';
import HabitDayModal from '../components/HabitDayModal';
import HabitStatsModal from '../components/HabitStatsModal';
import AchievementCelebrationModal from '../components/AchievementCelebrationModal';
import DayHabitsModal from '../components/DayHabitsModal';
import analytics from '../services/analytics';
import { checkAndUpdateAchievements } from '../services/achievements';
import { getUserInfo } from '../services/firebase';
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

  // State for achievement celebration
  const [celebrationAchievement, setCelebrationAchievement] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);

  // State for onboarding prompt
  const [showOnboarding, setShowOnboarding] = useState(false);

  // State for day habits modal (mobile stacked view)
  const [isDayHabitsModalOpen, setIsDayHabitsModalOpen] = useState(false);
  const [selectedDayForHabits, setSelectedDayForHabits] = useState(null);

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
    setDayHabits,
    getCompletedHabits,
    hasHabitMetWeeklyGoal,
  } = useCalendar(habits);

  // Check if user should see onboarding prompt
  useEffect(() => {
    const hasSeenCalendarOnboarding = localStorage.getItem('hasSeenCalendarOnboarding');
    const totalCompletions = Object.keys(calendarEntries).length;
    
    // Show onboarding if:
    // 1. User has habits
    // 2. Hasn't seen the onboarding before
    // 3. Has fewer than 3 total completions (new user)
    if (habits.length > 0 && !hasSeenCalendarOnboarding && totalCompletions < 3) {
      setShowOnboarding(true);
    }
  }, [habits, calendarEntries]);

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem('hasSeenCalendarOnboarding', 'true');
  };

  // Calculate week stats for the selected date's week
  const selectedWeekStats = selectedDate 
    ? getWeekStatsForDate(habits, calendarEntries, new Date(selectedDate))
    : weekStats;

  // Check for achievements when habits are completed
  useEffect(() => {
    const checkAchievements = async () => {
      const userInfo = getUserInfo();
      if (!userInfo?.uid || !habits.length || !Object.keys(calendarEntries).length) {
        return;
      }

      try {
        // Generate stats data similar to StatsView for achievement checking
        const now = new Date();
        
        // Use current month instead of rolling 30 days for more accurate success rate
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const statsData = habits.map(habit => {
          const currentStreak = streaks[habit.id] || 0;
          const bestStreak = getBestStreak(habit.id, calendarEntries);
          const currentMonthStats = getHabitStatsForRange(
            habit.id, 
            currentMonthStart.toISOString().split('T')[0],
            now.toISOString().split('T')[0],
            calendarEntries
          );
          const weekStat = weekStats[habit.id];
          const weeklyGoalPercentage = weekStat?.percentage || 0;
          
          return {
            habit,
            currentStreak,
            bestStreak,
            currentMonthStats,
            weeklyGoalPercentage
          };
        });

        // Check for new achievements
        const { newCompletions } = await checkAndUpdateAchievements(userInfo.uid, statsData, {
          calendarEntries,
          habitCreationDates: {}, // TODO: Add habit creation dates tracking
          statsVisits: 0 // Calendar view doesn't track stats visits
        });
        
        if (newCompletions.length > 0) {
          console.log('New achievements earned in calendar:', newCompletions.map(a => a.title));
          
          // Show celebration modal for the first new achievement
          const firstNewAchievement = newCompletions[0];
          setCelebrationAchievement(firstNewAchievement);
          setShowCelebration(true);
        }
      } catch (error) {
        console.error('Error checking achievements in calendar:', error);
      }
    };

    // Only check achievements when we have habits and calendar data
    if (habits.length > 0 && Object.keys(calendarEntries).length > 0) {
      checkAchievements();
    }
  }, [habits, calendarEntries, streaks, weekStats]); // Trigger when completion data changes

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
    
    // Dismiss onboarding when user interacts with calendar
    if (showOnboarding) {
      dismissOnboarding();
    }
  };

  // Handle habit detail click to show stats
  const handleHabitDetailClick = (habitId) => {
    const habit = habits.find(h => h.id === habitId);
    if (habit) {
      setSelectedHabit(habit);
      setIsStatsModalOpen(true);
    }
  };

  // Handle day habits click to show mobile stacked view modal
  const handleDayHabitsClick = (day) => {
    setSelectedDayForHabits(day);
    setIsDayHabitsModalOpen(true);
    
    // Dismiss onboarding when user interacts with calendar
    if (showOnboarding) {
      dismissOnboarding();
    }
  };

  // Handle saving habits for a specific day
  const handleSaveDayHabits = async (date, selectedHabits) => {
    try {
      // Filter out any undefined or falsy values and set all habits for the day at once
      const validSelectedHabits = selectedHabits.filter(habitId => habitId != null && habitId !== '');
      await setDayHabits(date, validSelectedHabits);
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
          {/* Subtle Today Button */}
          <button 
            className={styles.subtleTodayButton}
            onClick={goToToday}
            title="Jump to today"
          >
            Today
          </button>
          
          <div className={styles.monthNavigation}>
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
        </div>

        <div className={styles.headerActions}>
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
        {/* Onboarding Prompt */}
        {showOnboarding && (
          <div className={styles.onboardingPrompt}>
            <div className={styles.onboardingContent}>
              <div className={styles.onboardingIcon}>👆</div>
              <div className={styles.onboardingText}>
                <h3>Ready to track your habits?</h3>
                <p><strong>Click on any calendar day</strong> to mark your habit completions!</p>
              </div>
              <button 
                className={styles.onboardingDismiss}
                onClick={dismissOnboarding}
                title="Got it!"
              >
                ✕
              </button>
            </div>
          </div>
        )}

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
            onDayHabitsClick={handleDayHabitsClick}
            hasHabitMetWeeklyGoal={hasHabitMetWeeklyGoal}
            calendarEntries={calendarEntries}
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
        calendarEntry={selectedDate ? calendarEntries[selectedDate] : null}
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
        calendarEntries={calendarEntries}
      />

      {/* Day Habits Modal (Mobile Stacked View) */}
      <DayHabitsModal
        isOpen={isDayHabitsModalOpen}
        onClose={() => setIsDayHabitsModalOpen(false)}
        day={selectedDayForHabits}
        habits={habits}
        completedHabits={selectedDayForHabits ? getCompletedHabits(selectedDayForHabits.date) : []}
        hasHabitMetWeeklyGoal={hasHabitMetWeeklyGoal}
        onHabitDetailClick={handleHabitDetailClick}
        calendarEntries={calendarEntries}
      />

      {/* Achievement Celebration Modal */}
      <AchievementCelebrationModal
        achievement={celebrationAchievement}
        isOpen={showCelebration}
        onClose={() => {
          setShowCelebration(false);
          setCelebrationAchievement(null);
        }}
      />
    </div>
  );
};

export default CalendarView; 