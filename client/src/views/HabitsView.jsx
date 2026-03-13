// HabitsView.jsx
import { useState, useEffect } from 'react';
import { useHabits } from '../hooks/useHabits';
import { useCalendar } from '../hooks/useCalendar';
import { useOnboarding } from '../context/OnboardingContext';
import { getBestStreak, getHabitStatsForRange } from '../utils/streakUtils';
import HabitModal from '../components/HabitModal';
import AchievementCelebrationModal from '../components/AchievementCelebrationModal';
import { checkAndUpdateAchievements } from '../services/supabaseAchievements';
import { getUserInfo } from '../services/supabase';
import styles from './HabitsView.module.scss';

const HabitsView = () => {
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [modalMode, setModalMode] = useState('create');
  const [isMobileView, setIsMobileView] = useState(false);
  const [revealedHabitId, setRevealedHabitId] = useState(null);

  // State for achievement celebration
  const [celebrationAchievement, setCelebrationAchievement] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);

  // Onboarding hooks
  const { onHabitModalOpened, onHabitModalClosed, onHabitCreated } = useOnboarding();

  const {
    habits,
    loading: habitsLoading,
    error: habitsError,
    addHabit,
    editHabit,
    removeHabit,
  } = useHabits();

  const {
    streaks,
    weekStats,
    calendarEntries,
    loading: calendarLoading,
    error: calendarError,
  } = useCalendar(habits);

  // Check for achievements when habits are completed
  useEffect(() => {
    let cancelled = false;
    
    const checkAchievements = async () => {
      const userInfo = getUserInfo();
      if (!userInfo?.uid || !habits.length || !Object.keys(calendarEntries).length) {
        return;
      }

      try {
        const now = new Date();
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

        const { newCompletions } = await checkAndUpdateAchievements(userInfo.uid, statsData, {
          calendarEntries,
          habitCreationDates: {},
          statsVisits: 0
        });
        
        if (!cancelled && newCompletions.length > 0) {
          const firstNewAchievement = newCompletions[0];
          setCelebrationAchievement(firstNewAchievement);
          setShowCelebration(true);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error checking achievements in habits view:', error);
        }
      }
    };

    if (habits.length > 0 && Object.keys(calendarEntries).length > 0) {
      checkAchievements();
    }
    
    return () => {
      cancelled = true;
    };
  }, [habits, calendarEntries, streaks, weekStats]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const updateMobileState = () => setIsMobileView(mediaQuery.matches);

    updateMobileState();
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateMobileState);
    } else {
      mediaQuery.addListener(updateMobileState);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', updateMobileState);
      } else {
        mediaQuery.removeListener(updateMobileState);
      }
    };
  }, []);

  useEffect(() => {
    if (!isMobileView && revealedHabitId) {
      setRevealedHabitId(null);
    }
  }, [isMobileView, revealedHabitId]);

  const handleCreateHabit = () => {
    setModalMode('create');
    setEditingHabit(null);
    setIsHabitModalOpen(true);
    onHabitModalOpened();
  };

  const handleEditHabit = (habit) => {
    setModalMode('edit');
    setEditingHabit(habit);
    setIsHabitModalOpen(true);
  };

  const handleMobileEmojiTap = (event, habitId) => {
    if (!isMobileView) return;
    event.stopPropagation();
    setRevealedHabitId(prevHabitId => (prevHabitId === habitId ? null : habitId));
  };

  const handleOpenHabitSettings = (event, habit) => {
    event.stopPropagation();
    setRevealedHabitId(null);
    handleEditHabit(habit);
  };

  const handleSaveHabit = async (habitIdOrData, updates = null) => {
    if (modalMode === 'edit' && updates) {
      await editHabit(habitIdOrData, updates);
    } else {
      await addHabit(habitIdOrData);
      onHabitCreated();
    }
  };

  const handleDeleteHabit = async (habitId) => {
    if (confirm('Are you sure you want to delete this habit? This will also remove all related history.')) {
      await removeHabit(habitId);
    }
  };

  const handleHabitCardClick = (habitId) => {
    if (!isMobileView) return;
    setRevealedHabitId(prevHabitId => (prevHabitId === habitId ? null : habitId));
  };

  const loading = habitsLoading || calendarLoading;
  const error = habitsError || calendarError;

  if (loading) {
    return (
      <div className={styles.habitsView}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading your habits...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.habitsView}>
        <div className={styles.error}>
          <p>Error loading data: {error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.habitsView}>
      {habits.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateContent}>
            <h2>No habits yet</h2>
            <p>Create your first habit to start tracking.</p>
            <button 
              className={styles.primaryButton}
              onClick={handleCreateHabit}
            >
              Add Habit
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.habitsContainer}>
          <div className={styles.habitsHeader}>
            <h3>Your Completed Habits Today & Weekly Progress</h3>
            <div className={styles.headerActions}>
              <div className={styles.weeklyStats}>
                {Object.values(weekStats || {}).filter(stat => stat?.hasMetGoal).length} of {habits.length} goals met this week
              </div>
              <button 
                className={styles.addHabitButton}
                onClick={handleCreateHabit}
                data-onboarding="add-habit"
              >
                <span className={styles.addIcon}>+</span>
                <span className={styles.addText}>New Habit</span>
              </button>
            </div>
          </div>
          
          <div className={styles.habitsGrid}>
            {habits.map(habit => {
              const streak = streaks[habit.id] || 0;
              const weekStat = weekStats[habit.id];
              const percentage = weekStat?.percentage || 0;
              const isRevealedOnMobile = isMobileView && revealedHabitId === habit.id;
              
              const today = new Date().toISOString().split('T')[0];
              const isCompletedToday = calendarEntries[today]?.completedHabits?.includes(habit.id);
              
              return (
                <div 
                  key={habit.id} 
                  className={`${styles.habitCard} ${isCompletedToday ? styles.completed : ''} ${isRevealedOnMobile ? styles.mobileRevealed : ''}`}
                  style={{ '--habit-color': habit.color }}
                  onClick={() => handleHabitCardClick(habit.id)}
                >
                  <div className={styles.habitMainInfo}>
                    <div className={styles.habitBasics}>
                      <button
                        type="button"
                        className={styles.habitEmoji}
                        style={{ backgroundColor: `${habit.color}20` }}
                        onClick={(event) => handleMobileEmojiTap(event, habit.id)}
                        title={isMobileView ? 'Show habit actions' : undefined}
                        aria-label={isMobileView ? `Show actions for ${habit.name}` : `${habit.name} emoji`}
                      >
                        {habit.emoji}
                      </button>
                      <div className={styles.habitDetails}>
                        <div className={styles.habitName}>
                          <span className={styles.checkmark}>✓</span>
                          <span className={styles.habitNameText}>{habit.name}</span>
                          {isRevealedOnMobile && (
                            <button
                              type="button"
                              className={styles.quickSettingsButton}
                              onClick={(event) => handleOpenHabitSettings(event, habit)}
                              title={`Edit ${habit.name}`}
                              aria-label={`Edit ${habit.name}`}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3"/>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82L4.21 7.2a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0A1.65 1.65 0 0 0 10 3.24V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0A1.65 1.65 0 0 0 20.76 10H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                              </svg>
                            </button>
                          )}
                        </div>
                        <div className={styles.habitDescription}>{habit.description}</div>
                        <div className={styles.habitStats}>
                          🔥 {streak} day streak
                        </div>
                      </div>
                    </div>
                    <div className={styles.habitActions} onClick={(e) => e.stopPropagation()}>
                      <button
                        className={styles.editButton}
                        onClick={() => handleEditHabit(habit)}
                        title="Edit habit"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="m18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDeleteHabit(habit.id)}
                        title="Delete habit"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
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
                        {weekStat?.hasMetGoal && <span className={styles.goalMetBadge}>🎯 Goal Met!</span>}
                      </div>
                    </div>
                    <div className={styles.habitProgressBar}>
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
        onClose={() => {
          setIsHabitModalOpen(false);
          onHabitModalClosed();
        }}
        onSave={handleSaveHabit}
        habit={editingHabit}
        mode={modalMode}
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

export default HabitsView;
