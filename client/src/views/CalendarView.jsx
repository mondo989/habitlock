import { useState, useEffect, useMemo, useRef } from 'react';
import { useHabits } from '../hooks/useHabits';
import { useCalendar } from '../hooks/useCalendar';
import usePatternConfig from '../hooks/usePatternConfig';
import { useOnboarding } from '../context/OnboardingContext';
import { getWeekStatsForDate, getBestStreak, getHabitStatsForRange } from '../utils/streakUtils';
import CalendarGrid from '../components/CalendarGrid';
import CalendarGridSavant from '../components/CalendarGridSavant';
import CalendarGridCupFill from '../components/CalendarGridCupFill';
import Tooltip from '../components/Tooltip';
import HabitModal from '../components/HabitModal';
import HabitDayModal from '../components/HabitDayModal';
import HabitStatsModal from '../components/HabitStatsModal';
import AchievementCelebrationModal from '../components/AchievementCelebrationModal';
import DayHabitsModal from '../components/DayHabitsModal';
import analytics from '../services/analytics';
import { checkAndUpdateAchievements } from '../services/supabaseAchievements';
import { getUserInfo } from '../services/supabase';
import { populateDebugData, clearMonthData, isDevMode } from '../utils/debugUtils';
import styles from './CalendarView.module.scss';

const CALENDAR_TYPES = {
  original: { id: 'original', name: 'Original', icon: '🔥' },
  savant: { id: 'savant', name: 'Savant', icon: '💫' },
  cupfill: { id: 'cupfill', name: 'Cup Fill', icon: '🫗' },
};

const MOBILE_CAROUSEL_CENTER = -100 / 3;
const MOBILE_CAROUSEL_PREV = 0;
const MOBILE_CAROUSEL_NEXT = -(200 / 3);

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

  // Onboarding hooks
  const { onHabitModalOpened, onHabitModalClosed, onHabitCreated, onHabitTracked } = useOnboarding();

  // State for day habits modal (mobile stacked view)
  const [isDayHabitsModalOpen, setIsDayHabitsModalOpen] = useState(false);
  const [selectedDayForHabits, setSelectedDayForHabits] = useState(null);

  // Debug mode state
  const [isPopulatingDebug, setIsPopulatingDebug] = useState(false);
  const [debugMessage, setDebugMessage] = useState(null);

  // Calendar type toggle state
  const [calendarType, setCalendarType] = useState('original');

  // Hovered habit for calendar highlight
  const [hoveredHabitId, setHoveredHabitId] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  const [mobileLegendPage, setMobileLegendPage] = useState(0);
  const [mobileLegendTrackX, setMobileLegendTrackX] = useState(MOBILE_CAROUSEL_CENTER);
  const [isLegendDragging, setIsLegendDragging] = useState(false);
  const [isLegendAnimating, setIsLegendAnimating] = useState(false);
  const [legendDragDelta, setLegendDragDelta] = useState(0);
  const legendDragStartXRef = useRef(0);
  const legendAnimationTimerRef = useRef(null);

  const {
    habits,
    loading: habitsLoading,
    error: habitsError,
    addHabit,
    editHabit,
    removeHabit,
  } = useHabits();
  const {
    patternConfig,
  } = usePatternConfig();

  const {
    calendarMatrix,
    monthDisplayName,
    currentYear,
    currentMonth,
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

  // Calculate week stats for the selected date's week
  const selectedWeekStats = selectedDate 
    ? getWeekStatsForDate(habits, calendarEntries, new Date(selectedDate))
    : weekStats;

  const isMobileLegend = viewportWidth <= 768;
  const mobileHabitsPerPage = viewportWidth <= 420 ? 4 : 5;
  const mobileLegendTotalPages = Math.max(1, Math.ceil(habits.length / mobileHabitsPerPage));
  const mobileLegendStart = mobileLegendPage * mobileHabitsPerPage;
  const visibleHabits = isMobileLegend
    ? habits.slice(mobileLegendStart, mobileLegendStart + mobileHabitsPerPage)
    : habits;

  const getLoopedPageIndex = (pageIndex) => {
    if (mobileLegendTotalPages <= 0) return 0;
    return (pageIndex % mobileLegendTotalPages + mobileLegendTotalPages) % mobileLegendTotalPages;
  };

  const habitPages = useMemo(() => {
    const pages = [];
    for (let i = 0; i < habits.length; i += mobileHabitsPerPage) {
      pages.push(habits.slice(i, i + mobileHabitsPerPage));
    }
    return pages.length > 0 ? pages : [[]];
  }, [habits, mobileHabitsPerPage]);

  const prevPageHabits = habitPages[getLoopedPageIndex(mobileLegendPage - 1)] || [];
  const currentPageHabits = habitPages[getLoopedPageIndex(mobileLegendPage)] || [];
  const nextPageHabits = habitPages[getLoopedPageIndex(mobileLegendPage + 1)] || [];

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setMobileLegendPage((currentPage) => {
      const lastPage = Math.max(0, mobileLegendTotalPages - 1);
      return Math.min(currentPage, lastPage);
    });
  }, [mobileLegendTotalPages]);

  useEffect(() => {
    if (!isMobileLegend) {
      setMobileLegendPage(0);
    }
  }, [isMobileLegend]);

  useEffect(() => {
    return () => {
      if (legendAnimationTimerRef.current) {
        clearTimeout(legendAnimationTimerRef.current);
      }
    };
  }, []);

  const completeLegendSlide = (direction) => {
    if (legendAnimationTimerRef.current) {
      clearTimeout(legendAnimationTimerRef.current);
    }
    legendAnimationTimerRef.current = setTimeout(() => {
      setMobileLegendPage((page) => {
        if (direction === 'next') return getLoopedPageIndex(page + 1);
        return getLoopedPageIndex(page - 1);
      });
      setIsLegendAnimating(false);
      setMobileLegendTrackX(MOBILE_CAROUSEL_CENTER);
      setLegendDragDelta(0);
    }, 280);
  };

  const triggerLegendSlide = (direction) => {
    if (mobileLegendTotalPages <= 1 || isLegendAnimating) return;
    setIsLegendAnimating(true);
    setIsLegendDragging(false);
    setLegendDragDelta(0);
    setMobileLegendTrackX(direction === 'next' ? MOBILE_CAROUSEL_NEXT : MOBILE_CAROUSEL_PREV);
    completeLegendSlide(direction);
  };

  const handleLegendPrevPage = () => {
    triggerLegendSlide('prev');
  };

  const handleLegendNextPage = () => {
    triggerLegendSlide('next');
  };

  const handleLegendPointerDown = (event) => {
    if (!isMobileLegend || mobileLegendTotalPages <= 1 || isLegendAnimating) return;
    setIsLegendDragging(true);
    setLegendDragDelta(0);
    legendDragStartXRef.current = event.clientX;
  };

  const handleLegendPointerMove = (event) => {
    if (!isLegendDragging) return;
    setLegendDragDelta(event.clientX - legendDragStartXRef.current);
  };

  const handleLegendPointerEnd = () => {
    if (!isLegendDragging) return;
    const threshold = 50;
    if (legendDragDelta <= -threshold) {
      triggerLegendSlide('next');
      return;
    }
    if (legendDragDelta >= threshold) {
      triggerLegendSlide('prev');
      return;
    }
    setIsLegendDragging(false);
    setLegendDragDelta(0);
    setMobileLegendTrackX(MOBILE_CAROUSEL_CENTER);
  };

  const renderLegendHabitItem = (habit, animationPattern, keyPrefix = '') => {
    const weekStat = weekStats[habit.id];
    const completions = weekStat?.completions || 0;
    const goal = habit.weeklyGoal || 7;
    const percentage = Math.min((completions / goal) * 100, 100);
    const fillRatio = percentage / 100;
    const isGoalMet = weekStat?.hasMetGoal || false;
    const legendTooltipContent = (
      <div className={styles.habitTooltip}>
        <div className={styles.tooltipHeader}>
          <span className={styles.tooltipEmoji}>{habit.emoji}</span>
          <span className={styles.tooltipName}>{habit.name}</span>
        </div>
        <div className={styles.tooltipStats}>
          <span className={styles.tooltipProgress}>
            {completions} / {goal} this week
          </span>
          {isGoalMet && <span className={styles.tooltipBadge}>Goal Met!</span>}
        </div>
        {habit.description && (
          <p className={styles.tooltipDesc}>{habit.description}</p>
        )}
      </div>
    );

    return (
      <Tooltip key={`${keyPrefix}${habit.id}`} content={legendTooltipContent} position="bottom">
        <div className={`${styles.habitCircleSlot} ${isGoalMet ? styles.goalMetSlot : ''}`}>
          <div
            className={`${styles.habitCircle} ${isGoalMet ? styles.goalMet : ''}`}
            onClick={() => handleHabitDetailClick(habit.id)}
            onMouseEnter={() => setHoveredHabitId(habit.id)}
            onMouseLeave={() => setHoveredHabitId(null)}
            style={{
              '--habit-color': habit.color,
              '--fill-level': `${percentage}%`,
              '--fill-ratio': fillRatio.toFixed(2),
            }}
            data-pattern={animationPattern}
          >
            <svg className={styles.progressRing} viewBox="0 0 52 52">
              <circle
                className={styles.progressBg}
                cx="26"
                cy="26"
                r="23"
              />
              <circle
                className={styles.progressBar}
                cx="26"
                cy="26"
                r="23"
                strokeDasharray={`${(percentage / 100) * 144.51} 144.51`}
              />
            </svg>
            <span className={styles.legendEmoji}>
              <span className={styles.legendFill} />
              <span className={styles.legendEmojiGlyph}>
                {habit.emoji}
              </span>
            </span>
            {isGoalMet && (
              <div className={`${styles.starSparkles} ${styles[`pattern${animationPattern}`]}`}>
                <span className={styles.starSparkle}>✨</span>
                <span className={styles.starSparkle}>⭐</span>
                <span className={styles.starSparkle}>✨</span>
                <span className={styles.starSparkle}>💫</span>
              </div>
            )}
          </div>
        </div>
      </Tooltip>
    );
  };

  // Check for achievements when habits are completed
  useEffect(() => {
    let cancelled = false;
    
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
        
        if (!cancelled && newCompletions.length > 0) {
          // Show celebration modal for the first new achievement
          const firstNewAchievement = newCompletions[0];
          setCelebrationAchievement(firstNewAchievement);
          setShowCelebration(true);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error checking achievements in calendar:', error);
        }
      }
    };

    // Only check achievements when we have habits and calendar data
    if (habits.length > 0 && Object.keys(calendarEntries).length > 0) {
      checkAchievements();
    }
    
    return () => {
      cancelled = true;
    };
  }, [habits, calendarEntries, streaks, weekStats]); // Trigger when completion data changes

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

  const handleSaveHabit = async (habitIdOrData, updates = null) => {
    if (modalMode === 'edit' && updates) {
      await editHabit(habitIdOrData, updates);
    } else {
      await addHabit(habitIdOrData);
      // Notify onboarding that a habit was created
      onHabitCreated();
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

  // Handle day habits click to show mobile stacked view modal
  const handleDayHabitsClick = (day) => {
    setSelectedDayForHabits(day);
    setIsDayHabitsModalOpen(true);
  };

  // Handle saving habits for a specific day
  const handleSaveDayHabits = async (date, selectedHabits) => {
    try {
      // Filter out any undefined or falsy values and set all habits for the day at once
      const validSelectedHabits = selectedHabits.filter(habitId => habitId != null && habitId !== '');
      await setDayHabits(date, validSelectedHabits);
      // Notify onboarding that a habit was tracked
      if (validSelectedHabits.length > 0) {
        onHabitTracked();
      }
    } catch (error) {
      console.error('Error saving day habits:', error);
      // You could add user notification here
    }
  };

  // Debug handlers
  const handlePopulateDebugData = async () => {
    const userInfo = getUserInfo();
    if (!userInfo?.uid || habits.length === 0) {
      setDebugMessage('Need habits to populate debug data');
      setTimeout(() => setDebugMessage(null), 3000);
      return;
    }

    setIsPopulatingDebug(true);
    setDebugMessage('Populating debug data...');
    
    try {
      const result = await populateDebugData(currentYear, currentMonth, habits, userInfo.uid);
      setDebugMessage(result.message);
    } catch (error) {
      console.error('Error populating debug data:', error);
      setDebugMessage('Error populating debug data');
    } finally {
      setIsPopulatingDebug(false);
      setTimeout(() => setDebugMessage(null), 3000);
    }
  };

  const handleClearMonthData = async () => {
    const userInfo = getUserInfo();
    if (!userInfo?.uid) {
      setDebugMessage('Not authenticated');
      setTimeout(() => setDebugMessage(null), 3000);
      return;
    }

    if (!confirm('Clear all habit data for this month? This cannot be undone.')) {
      return;
    }

    setIsPopulatingDebug(true);
    setDebugMessage('Clearing month data...');
    
    try {
      const result = await clearMonthData(currentYear, currentMonth, userInfo.uid);
      setDebugMessage(result.message);
    } catch (error) {
      console.error('Error clearing month data:', error);
      setDebugMessage('Error clearing data');
    } finally {
      setIsPopulatingDebug(false);
      setTimeout(() => setDebugMessage(null), 3000);
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
      {/* Header - Calendar Type Toggle Only (TEMPORARILY HIDDEN) */}
      {/* TODO: Re-enable calendar type toggle when ready
      <div className={styles.header}>
        <div className={styles.headerActions}>
          <div className={styles.calendarTypeToggle}>
            {Object.values(CALENDAR_TYPES).map((type) => (
              <button
                key={type.id}
                className={`${styles.typeButton} ${calendarType === type.id ? styles.active : ''}`}
                onClick={() => setCalendarType(type.id)}
                title={type.name}
              >
                <span className={styles.typeIcon}>{type.icon}</span>
                <span className={styles.typeName}>{type.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      */}

      {/* Debug Controls - Dev Mode Only (TEMPORARILY HIDDEN) */}
      {/* TODO: Re-enable debug controls when needed
      {isDevMode() && (
        <div className={styles.debugControls}>
          <div className={styles.debugLabel}>🛠️ Debug Mode</div>
          <button
            className={styles.debugButton}
            onClick={handlePopulateDebugData}
            disabled={isPopulatingDebug || habits.length === 0}
            title="Populate this month with random habit completions"
          >
            📅 Populate Month
          </button>
          <button
            className={styles.debugButton}
            onClick={handleClearMonthData}
            disabled={isPopulatingDebug}
            title="Clear all habit data for this month"
          >
            🗑️ Clear Month
          </button>
          <button
            className={styles.debugButton}
            onClick={() => window.__showOnboarding?.()}
            title="Show the first-time user onboarding flow"
          >
            👋 Show Onboarding
          </button>
          {debugMessage && (
            <span className={styles.debugMessage}>{debugMessage}</span>
          )}
        </div>
      )}
      */}

      <section className={styles.calendarCluster}>
        {/* Habits Legend - Integrated above Calendar */}
        <div className={styles.habitsLegend}>
          <div className={styles.legendTopRow}>
            <div className={styles.legendHeading}>
              <h2 className={styles.legendTitle}>My Habits</h2>
              <p className={styles.legendSubtitle}>
                Pick a habit to trace your streak through the month.
              </p>
            </div>

            <button 
              className={styles.legendAddButton}
              onClick={handleCreateHabit}
              data-onboarding="add-habit"
            >
              <span className={styles.legendAddIcon}>+</span>
              <span className={styles.legendAddText}>New Habit</span>
            </button>
          </div>

          <div className={styles.legendMainRow}>
            {isMobileLegend && mobileLegendTotalPages > 1 && (
              <button
                className={styles.legendPagerButton}
                onClick={handleLegendPrevPage}
                aria-label="Previous habits"
                title="Previous habits"
              >
                ‹
              </button>
            )}

            {isMobileLegend ? (
              <div
                className={styles.legendCarouselViewport}
                onPointerDown={handleLegendPointerDown}
                onPointerMove={handleLegendPointerMove}
                onPointerUp={handleLegendPointerEnd}
                onPointerCancel={handleLegendPointerEnd}
                onPointerLeave={handleLegendPointerEnd}
              >
                <div
                  className={`${styles.legendCarouselTrack} ${isLegendDragging ? styles.dragging : ''}`}
                  style={{
                    transform: `translateX(calc(${mobileLegendTrackX}% + ${legendDragDelta}px))`,
                    transition: isLegendDragging || !isLegendAnimating ? 'none' : 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                >
                  <div className={`${styles.legendItems} ${styles.legendCarouselPage}`}>
                    {prevPageHabits.map((habit, index) =>
                      renderLegendHabitItem(habit, (mobileLegendStart - mobileHabitsPerPage + index + habits.length * 8) % 4, 'prev-')
                    )}
                  </div>
                  <div className={`${styles.legendItems} ${styles.legendCarouselPage}`}>
                    {currentPageHabits.map((habit, index) =>
                      renderLegendHabitItem(habit, (mobileLegendStart + index) % 4, 'current-')
                    )}
                  </div>
                  <div className={`${styles.legendItems} ${styles.legendCarouselPage}`}>
                    {nextPageHabits.map((habit, index) =>
                      renderLegendHabitItem(habit, (mobileLegendStart + mobileHabitsPerPage + index) % 4, 'next-')
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.legendItems}>
                {visibleHabits.map((habit, index) =>
                  renderLegendHabitItem(habit, (mobileLegendStart + index) % 4)
                )}
              </div>
            )}

            {isMobileLegend && mobileLegendTotalPages > 1 && (
              <button
                className={styles.legendPagerButton}
                onClick={handleLegendNextPage}
                aria-label="Next habits"
                title="Next habits"
              >
                ›
              </button>
            )}

          </div>
        </div>

        {/* Calendar Grid */}
        <div className={styles.calendarSection} data-onboarding="calendar">
          {/* Subtle Month Navigation - Inside Calendar */}
          <div className={styles.subtleMonthNav}>
            <button 
              className={styles.subtleNavButton}
              onClick={goToPrevMonth}
              title="Previous month"
            >
              ‹
            </button>
            <button 
              className={styles.subtleMonthLabel}
              onClick={goToToday}
              title="Jump to today"
            >
              {monthDisplayName}
            </button>
            <button 
              className={styles.subtleNavButton}
              onClick={goToNextMonth}
              title="Next month"
            >
              ›
            </button>
          </div>
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
            <>
              {calendarType === 'original' && (
                  <CalendarGrid
                  calendarMatrix={calendarMatrix}
                  habits={habits}
                  patternConfig={patternConfig}
                  getCompletedHabits={getCompletedHabits}
                  onHabitToggle={toggleHabitCompletion}
                  onHabitDetailClick={handleHabitDetailClick}
                  onDayClick={handleDayClick}
                  onDayHabitsClick={handleDayHabitsClick}
                  hasHabitMetWeeklyGoal={hasHabitMetWeeklyGoal}
                  calendarEntries={calendarEntries}
                  hoveredHabitId={hoveredHabitId}
                  patternType="mixed"
                />
              )}
              {calendarType === 'savant' && (
                <CalendarGridSavant
                  calendarMatrix={calendarMatrix}
                  habits={habits}
                  getCompletedHabits={getCompletedHabits}
                  onDayClick={handleDayClick}
                  hasHabitMetWeeklyGoal={hasHabitMetWeeklyGoal}
                  calendarEntries={calendarEntries}
                />
              )}
              {calendarType === 'cupfill' && (
                <CalendarGridCupFill
                  calendarMatrix={calendarMatrix}
                  habits={habits}
                  getCompletedHabits={getCompletedHabits}
                  onDayClick={handleDayClick}
                  hasHabitMetWeeklyGoal={hasHabitMetWeeklyGoal}
                  calendarEntries={calendarEntries}
                />
              )}
            </>
          )}
        </div>
      </section>

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
