import { useState, useEffect, useMemo, useRef } from 'react';
import dayjs from 'dayjs';
import { useHabits } from '../hooks/useHabits';
import { useCalendar } from '../hooks/useCalendar';
import { useOnboarding } from '../context/OnboardingContext';
import { getWeekStatsForDate, getBestStreak, getHabitStatsForRange } from '../utils/streakUtils';
import CalendarGrid from '../components/CalendarGrid';
import CalendarGridSavant from '../components/CalendarGridSavant';
import CalendarGridCupFill from '../components/CalendarGridCupFill';
import CalendarCell from '../components/CalendarCell';
import HabitTimelineStrip from '../components/HabitTimelineStrip';
import Tooltip from '../components/Tooltip';
import HabitModal from '../components/HabitModal';
import HabitDayModal from '../components/HabitDayModal';
import AchievementCelebrationModal from '../components/AchievementCelebrationModal';
import DayHabitsModal from '../components/DayHabitsModal';
import analytics from '../services/analytics';
import { checkAndUpdateAchievements } from '../services/supabaseAchievements';
import { getUserInfo } from '../services/supabase';
import { populateDebugData, clearMonthData, isDevMode } from '../utils/debugUtils';
import { downloadHabitMapPoster, createHabitMapPosterBlob } from '../utils/habitMapExport';
import { generateCalendarMatrix } from '../utils/dateUtils';
import styles from './CalendarView.module.scss';

const CALENDAR_TYPES = {
  original: { id: 'original', name: 'Original', icon: '🔥' },
  savant: { id: 'savant', name: 'Savant', icon: '💫' },
  cupfill: { id: 'cupfill', name: 'Cup Fill', icon: '🫗' },
};

const MOBILE_CAROUSEL_CENTER = -100 / 3;
const MOBILE_CAROUSEL_PREV = 0;
const MOBILE_CAROUSEL_NEXT = -(200 / 3);
const EXPORT_WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EXPORT_VIEWS = {
  month: 'month',
  year: 'year',
};
const DAY_PATTERN_ANIMATION_DELAY_MS = 220;
const PATTERN_REVEAL_DURATION_MS = 460;
const LEGEND_FILL_ATTENTION_DELAY_MS = DAY_PATTERN_ANIMATION_DELAY_MS + PATTERN_REVEAL_DURATION_MS;
const LEGEND_FILL_ATTENTION_DURATION_MS = 1500;
const SAVE_TOAST_DURATION_MS = 2400;

const buildPreviewStats = (days, habitById) => {
  const activeDays = days.filter((day) => day.completedHabitIds.length > 0).length;
  let currentStreak = 0;
  let longestStreak = 0;
  const habitCounts = {};

  days.forEach((day) => {
    if (day.completedHabitIds.length > 0) {
      currentStreak += 1;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }

    day.completedHabitIds.forEach((habitId) => {
      habitCounts[habitId] = (habitCounts[habitId] || 0) + 1;
    });
  });

  const topHabits = Object.entries(habitCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([habitId, total]) => {
      const habit = habitById.get(habitId);
      if (!habit) return null;
      return {
        ...habit,
        total,
      };
    })
    .filter(Boolean);
  const topHabit = topHabits[0] || null;

  return {
    activeDays,
    longestStreak,
    topHabit,
    topHabits,
  };
};

const CalendarView = () => {
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [modalMode, setModalMode] = useState('create');
  
  // New state for day modal
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayPatternAnimation, setDayPatternAnimation] = useState(null);
  const dayPatternAnimationTimerRef = useRef(null);
  const dayPatternAnimationTokenRef = useRef(0);
  const [legendAttentionHabitIds, setLegendAttentionHabitIds] = useState([]);
  const legendAttentionTimersRef = useRef({});
  const [saveToast, setSaveToast] = useState(null);
  const saveToastTimerRef = useRef(null);

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
  const [isExportingPoster, setIsExportingPoster] = useState(false);
  const [isSharingPoster, setIsSharingPoster] = useState(false);
  const [exportShareError, setExportShareError] = useState('');
  const [isExportPreviewOpen, setIsExportPreviewOpen] = useState(false);
  const [exportView, setExportView] = useState(EXPORT_VIEWS.year);

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
  const habitById = useMemo(
    () => new Map(habits.map((habit) => [habit.id, habit])),
    [habits]
  );
  const buildPreviewCellData = (date) => {
    const completedHabitIds = (getCompletedHabits(date) || [])
      .filter((habitId) => habitById.has(habitId));

    return {
      completedHabitIds,
      habitNames: completedHabitIds
        .map((habitId) => habitById.get(habitId)?.name)
        .filter(Boolean),
    };
  };

  const exportMonthPreviewWeeks = useMemo(
    () => calendarMatrix.map((week) => week.map((day) => {
      const preview = buildPreviewCellData(day.date);
      return {
        ...day,
        ...preview,
      };
    })),
    [calendarMatrix, getCompletedHabits, habitById]
  );
  const exportMonthPreviewDays = useMemo(
    () => exportMonthPreviewWeeks.flat().filter((day) => day.isCurrentMonth),
    [exportMonthPreviewWeeks]
  );
  const exportYearPreviewMonths = useMemo(
    () => Array.from({ length: 12 }, (_, monthIndex) => {
      const matrix = generateCalendarMatrix(currentYear, monthIndex);
      const habitCounts = {};
      let activeDays = 0;
      let dayCount = 0;
      return {
        id: `${currentYear}-${monthIndex}`,
        monthIndex,
        label: dayjs().year(currentYear).month(monthIndex).format('MMM').toUpperCase(),
        weeks: matrix.map((week) => week.map((day) => {
          const preview = buildPreviewCellData(day.date);
          if (day.isCurrentMonth) {
            dayCount += 1;
            if (preview.completedHabitIds.length > 0) {
              activeDays += 1;
            }
            preview.completedHabitIds.forEach((habitId) => {
              habitCounts[habitId] = (habitCounts[habitId] || 0) + 1;
            });
          }
          return {
            ...day,
            ...preview,
          };
        })),
        accentColor: (() => {
          const topHabitId = Object.entries(habitCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0];
          return topHabitId ? habitById.get(topHabitId)?.color : null;
        })(),
        activityRate: dayCount > 0 ? activeDays / dayCount : 0,
      };
    }),
    [currentYear, getCompletedHabits, habitById]
  );
  const exportYearPreviewDays = useMemo(
    () => exportYearPreviewMonths.flatMap((monthData) => monthData.weeks.flat().filter((day) => day.isCurrentMonth)),
    [exportYearPreviewMonths]
  );
  const exportMonthStats = useMemo(
    () => buildPreviewStats(exportMonthPreviewDays, habitById),
    [exportMonthPreviewDays, habitById]
  );
  const exportYearStats = useMemo(
    () => buildPreviewStats(exportYearPreviewDays, habitById),
    [exportYearPreviewDays, habitById]
  );
  const exportStats = exportView === EXPORT_VIEWS.year ? exportYearStats : exportMonthStats;
  const exportPreviewAccent = exportStats.topHabit?.color || '#7dd3fc';
  const exportFilename = exportView === EXPORT_VIEWS.year
    ? `habit-map-${currentYear}.png`
    : `habit-map-${currentYear}-${String(currentMonth + 1).padStart(2, '0')}.png`;

  const exportHabitProgressByDate = useMemo(() => {
    const cumulativeByHabit = {};
    const streakByHabit = {};
    const progressByDate = {};
    const sortedDates = Object.keys(calendarEntries || {}).sort();
    let previousDate = null;

    sortedDates.forEach((date) => {
      const completed = calendarEntries?.[date]?.completedHabits;
      if (!Array.isArray(completed) || completed.length === 0) return;

      if (previousDate) {
        const gapDays = dayjs(date).diff(dayjs(previousDate), 'day');
        if (gapDays > 1) {
          Object.keys(streakByHabit).forEach((habitId) => {
            streakByHabit[habitId] = 0;
          });
        }
      }

      const completedSet = new Set(completed);
      Object.keys(streakByHabit).forEach((habitId) => {
        if (!completedSet.has(habitId)) {
          streakByHabit[habitId] = 0;
        }
      });

      progressByDate[date] = {};
      completed.forEach((habitId) => {
        cumulativeByHabit[habitId] = (cumulativeByHabit[habitId] || 0) + 1;
        streakByHabit[habitId] = (streakByHabit[habitId] || 0) + 1;
        progressByDate[date][habitId] = {
          completions: cumulativeByHabit[habitId],
          streak: streakByHabit[habitId],
        };
      });

      previousDate = date;
    });

    return progressByDate;
  }, [calendarEntries]);

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
      if (dayPatternAnimationTimerRef.current) {
        clearTimeout(dayPatternAnimationTimerRef.current);
      }
      Object.values(legendAttentionTimersRef.current).forEach((timerGroup) => {
        if (timerGroup?.start) clearTimeout(timerGroup.start);
        if (timerGroup?.end) clearTimeout(timerGroup.end);
      });
      legendAttentionTimersRef.current = {};
      if (saveToastTimerRef.current) {
        clearTimeout(saveToastTimerRef.current);
      }
    };
  }, []);

  const showSaveToast = (message, type = 'success') => {
    if (saveToastTimerRef.current) {
      clearTimeout(saveToastTimerRef.current);
    }
    setSaveToast({ message, type });
    saveToastTimerRef.current = setTimeout(() => {
      setSaveToast(null);
      saveToastTimerRef.current = null;
    }, SAVE_TOAST_DURATION_MS);
  };

  const scheduleDayPatternAnimation = (animationPayload) => {
    if (!animationPayload) return;

    if (dayPatternAnimationTimerRef.current) {
      clearTimeout(dayPatternAnimationTimerRef.current);
    }

    dayPatternAnimationTimerRef.current = setTimeout(() => {
      dayPatternAnimationTokenRef.current += 1;
      setDayPatternAnimation({
        ...animationPayload,
        token: dayPatternAnimationTokenRef.current,
      });
      dayPatternAnimationTimerRef.current = null;
    }, DAY_PATTERN_ANIMATION_DELAY_MS);
  };

  const scheduleLegendFillAttention = (habitIds) => {
    if (!Array.isArray(habitIds) || habitIds.length === 0) return;

    const uniqueHabitIds = [...new Set(habitIds.filter(Boolean))];
    uniqueHabitIds.forEach((habitId) => {
      const existingTimers = legendAttentionTimersRef.current[habitId];
      if (existingTimers?.start) clearTimeout(existingTimers.start);
      if (existingTimers?.end) clearTimeout(existingTimers.end);

      const timerGroup = {};
      timerGroup.start = setTimeout(() => {
        setLegendAttentionHabitIds((prev) => (
          prev.includes(habitId) ? prev : [...prev, habitId]
        ));
        timerGroup.start = null;
      }, LEGEND_FILL_ATTENTION_DELAY_MS);

      timerGroup.end = setTimeout(() => {
        setLegendAttentionHabitIds((prev) => prev.filter((id) => id !== habitId));
        if (legendAttentionTimersRef.current[habitId]) {
          delete legendAttentionTimersRef.current[habitId];
        }
      }, LEGEND_FILL_ATTENTION_DELAY_MS + LEGEND_FILL_ATTENTION_DURATION_MS);

      legendAttentionTimersRef.current[habitId] = timerGroup;
    });
  };

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

  const renderLegendHabitItem = (habit, keyPrefix = '') => {
    const weekStat = weekStats[habit.id];
    const completions = weekStat?.completions || 0;
    const goal = habit.weeklyGoal || 7;
    const percentage = Math.min((completions / goal) * 100, 100);
    const fillRatio = percentage / 100;
    const isGoalMet = weekStat?.hasMetGoal || false;
    const isLegendAttentionActive = legendAttentionHabitIds.includes(habit.id);
    const streak = streaks[habit.id] || 0;
    const today = dayjs().format('YYYY-MM-DD');
    const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');
    const monthStats = getHabitStatsForRange(habit.id, monthStart, today, calendarEntries);
    const monthRate = Number.isFinite(monthStats.completionRate) ? monthStats.completionRate : 0;

    const legendTooltipContent = ({ closeTooltip }) => (
      <div className={styles.habitTooltip}>
        <div className={styles.tooltipHeader}>
          <div className={styles.tooltipTitle}>
            <span className={styles.tooltipEmoji}>{habit.emoji}</span>
            <span className={styles.tooltipName}>{habit.name}</span>
          </div>
          <div className={styles.tooltipActions}>
            <button
              type="button"
              className={styles.tooltipEditButton}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                closeTooltip();
                handleEditHabit(habit);
              }}
              title={`Edit ${habit.name}`}
              aria-label={`Edit ${habit.name}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82L4.21 7.2a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0A1.65 1.65 0 0 0 10 3.24V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0A1.65 1.65 0 0 0 20.76 10H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>
        <div className={styles.tooltipStats}>
          <span className={styles.tooltipProgress}>
            {completions} / {goal} this week
          </span>
          {isGoalMet && <span className={styles.tooltipBadge}>Goal Met!</span>}
        </div>
        <div className={styles.tooltipProgressTrack}>
          <div
            className={styles.tooltipProgressFill}
            style={{
              width: `${percentage}%`,
              backgroundColor: habit.color
            }}
          />
        </div>
        <div className={styles.tooltipMetrics}>
          <div className={styles.tooltipMetric}>
            <span className={styles.tooltipMetricLabel}>Streak</span>
            <span className={styles.tooltipMetricValue}>{streak}d</span>
          </div>
          <div className={styles.tooltipMetric}>
            <span className={styles.tooltipMetricLabel}>Month</span>
            <span className={styles.tooltipMetricValue}>
              {monthStats.completedDays}/{monthStats.totalDays} ({monthRate.toFixed(0)}%)
            </span>
          </div>
        </div>
        {habit.description && (
          <p className={styles.tooltipDesc}>{habit.description}</p>
        )}
      </div>
    );

    return (
      <Tooltip
        key={`${keyPrefix}${habit.id}`}
        content={legendTooltipContent}
        position="top"
        respectTopBoundary={false}
        forcePreferredPlacement
      >
        <div className={`${styles.habitCircleSlot} ${isGoalMet ? styles.goalMetSlot : ''}`}>
          <div
            className={`
              ${styles.habitCircle}
              ${isGoalMet ? styles.goalMet : ''}
              ${isLegendAttentionActive ? styles.liquidAttention : ''}
            `}
            onClick={() => handleHabitDetailClick(habit.id)}
            onMouseEnter={() => setHoveredHabitId(habit.id)}
            onMouseLeave={() => setHoveredHabitId(null)}
            style={{
              '--habit-color': habit.color,
              '--fill-level': `${percentage}%`,
              '--fill-ratio': fillRatio.toFixed(2),
            }}
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

  const handleDayModalClose = () => {
    setIsDayModalOpen(false);
  };

  // Keep this as a no-op: details are shown in the compact tooltip, not a modal.
  const handleHabitDetailClick = (habitId) => {
    void habitId;
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
      const previousHabitIds = (getCompletedHabits(date) || []).filter(
        (habitId) => habitId != null && habitId !== '',
      );
      const previousHabitSet = new Set(previousHabitIds);
      const nextHabitSet = new Set(validSelectedHabits);
      const addedHabitIds = validSelectedHabits.filter((habitId) => !previousHabitSet.has(habitId));
      const hasAddedHabits = validSelectedHabits.some((habitId) => !previousHabitSet.has(habitId));
      const hasRemovedHabits = previousHabitIds.some((habitId) => !nextHabitSet.has(habitId));

      const success = await setDayHabits(date, validSelectedHabits);
      if (!success) {
        showSaveToast('Could not save day updates. Please try again.', 'error');
        return false;
      }

      if (hasAddedHabits || hasRemovedHabits) {
        scheduleDayPatternAnimation({
          date,
          hasAddedHabits,
          hasRemovedHabits,
          previousHabitIds,
        });
      }
      if (addedHabitIds.length > 0) {
        scheduleLegendFillAttention(addedHabitIds);
      }

      const dateLabel = dayjs(date).format('MMM D');
      if (hasAddedHabits && hasRemovedHabits) {
        showSaveToast(`Habits updated for ${dateLabel}.`);
      } else if (hasAddedHabits) {
        showSaveToast(`Habit tracked for ${dateLabel}.`);
      } else if (hasRemovedHabits) {
        showSaveToast(`Habit removed for ${dateLabel}.`);
      } else {
        showSaveToast(`Saved ${dateLabel}.`);
      }

      // Notify onboarding that a habit was tracked
      if (validSelectedHabits.length > 0) {
        onHabitTracked();
      }
      return true;
    } catch (error) {
      console.error('Error saving day habits:', error);
      // You could add user notification here
      showSaveToast('Could not save day updates. Please try again.', 'error');
      return false;
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

  const executeHabitMapExport = async () => {
    if (isExportingPoster || isSharingPoster || habits.length === 0) return;

    try {
      setExportShareError('');
      setIsExportingPoster(true);
      analytics.capture('habit_map_export_started', {
        view: exportView,
        month: monthDisplayName,
        year: currentYear,
        habits_count: habits.length,
      });

      await downloadHabitMapPoster({
        view: exportView,
        calendarMatrix,
        habits,
        getCompletedHabits,
        habitProgressByDate: exportHabitProgressByDate,
        monthDisplayName,
        year: currentYear,
        month: currentMonth,
        filename: exportFilename,
      });

      analytics.capture('habit_map_export_completed', {
        view: exportView,
        month: monthDisplayName,
        year: currentYear,
        habits_count: habits.length,
      });
      setIsExportPreviewOpen(false);
    } catch (error) {
      console.error('Habit map export failed:', error);
      analytics.capture('habit_map_export_failed', {
        view: exportView,
        month: monthDisplayName,
        year: currentYear,
        error: error?.message || 'unknown_error',
      });
    } finally {
      setIsExportingPoster(false);
    }
  };

  const handleShareHabitMap = async () => {
    if (isExportingPoster || isSharingPoster || habits.length === 0) return;

    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
      setExportShareError('Native sharing is unavailable here. Use Download PNG instead.');
      return;
    }

    try {
      setExportShareError('');
      setIsSharingPoster(true);

      analytics.capture('habit_map_share_started', {
        view: exportView,
        month: monthDisplayName,
        year: currentYear,
        habits_count: habits.length,
      });

      const blob = await createHabitMapPosterBlob({
        view: exportView,
        calendarMatrix,
        habits,
        getCompletedHabits,
        habitProgressByDate: exportHabitProgressByDate,
        monthDisplayName,
        year: currentYear,
        month: currentMonth,
      });
      const file = new File([blob], exportFilename, { type: 'image/png' });

      if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: [file] })) {
        setExportShareError('Sharing this image file is not supported on this device.');
        return;
      }

      await navigator.share({
        title: exportView === EXPORT_VIEWS.year
          ? `Habit Map • ${currentYear}`
          : `Habit Map • ${monthDisplayName}`,
        text: 'Poster generated with HabitLock',
        files: [file],
      });

      analytics.capture('habit_map_share_completed', {
        view: exportView,
        month: monthDisplayName,
        year: currentYear,
        habits_count: habits.length,
      });
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error('Habit map share failed:', error);
        setExportShareError('Share failed. Try Download PNG.');
        analytics.capture('habit_map_share_failed', {
          view: exportView,
          month: monthDisplayName,
          year: currentYear,
          error: error?.message || 'unknown_error',
        });
      }
    } finally {
      setIsSharingPoster(false);
    }
  };

  const handleExportHabitMap = () => {
    if (isExportingPoster || isSharingPoster || habits.length === 0) return;
    setExportShareError('');
    setExportView(EXPORT_VIEWS.year);
    setIsExportPreviewOpen(true);
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
                    {prevPageHabits.map((habit) =>
                      renderLegendHabitItem(habit, 'prev-')
                    )}
                  </div>
                  <div className={`${styles.legendItems} ${styles.legendCarouselPage}`}>
                    {currentPageHabits.map((habit) =>
                      renderLegendHabitItem(habit, 'current-')
                    )}
                  </div>
                  <div className={`${styles.legendItems} ${styles.legendCarouselPage}`}>
                    {nextPageHabits.map((habit) =>
                      renderLegendHabitItem(habit, 'next-')
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.legendItems}>
                {visibleHabits.map((habit) => renderLegendHabitItem(habit))}
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
                  getCompletedHabits={getCompletedHabits}
                  onHabitDetailClick={handleHabitDetailClick}
                  onDayClick={handleDayClick}
                  onDayHabitsClick={handleDayHabitsClick}
                  hasHabitMetWeeklyGoal={hasHabitMetWeeklyGoal}
                  calendarEntries={calendarEntries}
                  hoveredHabitId={hoveredHabitId}
                  dayPatternAnimation={dayPatternAnimation}
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
          {habits.length > 0 && (
            <div className={styles.inlineTimelineStrip}>
              <HabitTimelineStrip
                year={currentYear}
                habits={habits}
                getCompletedHabits={getCompletedHabits}
                habitProgressByDate={exportHabitProgressByDate}
                size={viewportWidth <= 768 ? 'compact' : 'default'}
                quarterPaging
                overlayAction={(
                  <button
                    className={styles.mapExportButton}
                    onClick={handleExportHabitMap}
                    disabled={isExportingPoster || isSharingPoster || habits.length === 0}
                  >
                    Export Habit Map (1080×1080)
                  </button>
                )}
              />
            </div>
          )}
        </div>
      </section>

      {isExportPreviewOpen && (
        <div
          className={styles.exportModalOverlay}
          onClick={() => {
            if (!isExportingPoster && !isSharingPoster) setIsExportPreviewOpen(false);
          }}
        >
          <div
            className={styles.exportModal}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Export habit map"
          >
            <div className={styles.exportModalHeader}>
              <h3>Export Habit Map</h3>
              <button
                type="button"
                className={styles.exportModalClose}
                onClick={() => setIsExportPreviewOpen(false)}
                disabled={isExportingPoster || isSharingPoster}
                aria-label="Close export preview"
              >
                ×
              </button>
            </div>
            <p className={styles.exportModalSubtitle}>
              Month stays practical. Year turns the selected calendar year into a shareable discipline poster.
            </p>
            <div className={styles.exportViewTabs}>
              <button
                type="button"
                className={`${styles.exportViewTab} ${exportView === EXPORT_VIEWS.month ? styles.activeExportViewTab : ''}`}
                onClick={() => setExportView(EXPORT_VIEWS.month)}
                disabled={isExportingPoster || isSharingPoster}
              >
                Month View
              </button>
              <button
                type="button"
                className={`${styles.exportViewTab} ${exportView === EXPORT_VIEWS.year ? styles.activeExportViewTab : ''}`}
                onClick={() => setExportView(EXPORT_VIEWS.year)}
                disabled={isExportingPoster || isSharingPoster}
              >
                Year View
                <span className={styles.exportViewHeroTag}>Hero</span>
              </button>
            </div>
            <div
              className={styles.exportPosterFrame}
              style={{
                '--export-accent': exportPreviewAccent,
                '--export-accent-soft': `${exportPreviewAccent}33`,
              }}
            >
              <div className={styles.exportPosterHeader}>
                <span className={styles.exportPosterEyebrow}>My Discipline Map</span>
                <span className={styles.exportPosterPeriod}>
                  {exportView === EXPORT_VIEWS.year ? currentYear : monthDisplayName}
                </span>
              </div>
              {exportView === EXPORT_VIEWS.month ? (
                <div className={styles.exportMonthPreview}>
                  <div className={styles.exportMonthWeekdays}>
                    {EXPORT_WEEKDAY_LABELS.map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                  <div className={styles.exportMonthGrid}>
                    {exportMonthPreviewWeeks.flat().map((day, index) => (
                      <div
                        key={day.date}
                        className={styles.exportDayCellFrame}
                        title={day.habitNames.length > 0 ? `${day.date}: ${day.habitNames.join(', ')}` : day.date}
                      >
                        <CalendarCell
                          day={day}
                          gridRow={Math.floor(index / 7)}
                          gridCol={index % 7}
                          habits={habits}
                          completedHabits={day.completedHabitIds}
                          onHabitDetailClick={handleHabitDetailClick}
                          onDayClick={handleDayClick}
                          onDayHabitsClick={handleDayHabitsClick}
                          hasHabitMetWeeklyGoal={hasHabitMetWeeklyGoal}
                          isCurrentMonth={day.isCurrentMonth}
                          isToday={day.isToday}
                          animationIndex={0}
                          calendarEntries={calendarEntries}
                          habitProgressByDate={exportHabitProgressByDate}
                          isPreview
                          previewScale="month"
                          showEmojis={false}
                          disableInteractions
                          disableAnimations
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={styles.exportYearGrid}>
                  {exportYearPreviewMonths.map((monthData) => (
                    <section
                      key={monthData.id}
                      className={styles.exportYearMonthPanel}
                      style={{
                        '--month-accent': monthData.accentColor || exportPreviewAccent,
                        '--month-activity': monthData.activityRate.toFixed(2),
                      }}
                    >
                      <span className={styles.exportYearMonthLabel}>{monthData.label}</span>
                      <div className={styles.exportYearMonthGrid}>
                        {monthData.weeks.flat().map((day, index) => (
                          <div
                            key={day.date}
                            className={styles.exportDayCellFrame}
                            title={day.habitNames.length > 0 ? `${day.date}: ${day.habitNames.join(', ')}` : day.date}
                          >
                            <CalendarCell
                              day={day}
                              gridRow={Math.floor(index / 7)}
                              gridCol={index % 7}
                              habits={habits}
                              completedHabits={day.completedHabitIds}
                              onHabitDetailClick={handleHabitDetailClick}
                              onDayClick={handleDayClick}
                              onDayHabitsClick={handleDayHabitsClick}
                              hasHabitMetWeeklyGoal={hasHabitMetWeeklyGoal}
                              isCurrentMonth={day.isCurrentMonth}
                              isToday={day.isToday}
                              animationIndex={0}
                              calendarEntries={calendarEntries}
                              habitProgressByDate={exportHabitProgressByDate}
                              isPreview
                              previewScale="year"
                              showEmojis={false}
                              disableInteractions
                              disableAnimations
                            />
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
              <div className={styles.exportPosterNotes}>
                <span>{exportView === EXPORT_VIEWS.year ? 'Twelve months, one behavior landscape' : 'A close read of the month you are in'}</span>
                <span>Habit tint leads the palette</span>
              </div>
              <div className={styles.exportTimelineSection}>
                <HabitTimelineStrip
                  year={currentYear}
                  habits={habits}
                  getCompletedHabits={getCompletedHabits}
                  habitProgressByDate={exportHabitProgressByDate}
                  size={viewportWidth <= 560 ? 'compact' : 'default'}
                />
              </div>
              <div className={styles.exportPosterBrand}>
                <div className={styles.exportPosterBrandLockup}>
                  <img src="/habit-lock-logo.svg" alt="" />
                  <span>Generated with HabitLock</span>
                </div>
                <span className={styles.exportPosterBrandSite}>habitlock.org</span>
              </div>
            </div>
            <div className={styles.exportStatsRow}>
              <div className={styles.exportStatCard}>
                <strong>{exportStats.activeDays}</strong>
                <span>Active Days</span>
              </div>
              <div className={styles.exportStatCard}>
                <strong>{exportStats.longestStreak}</strong>
                <span>Longest Streak</span>
              </div>
              <div className={styles.exportStatCard}>
                <strong style={{ color: exportStats.topHabit?.color || undefined }}>
                  {exportStats.topHabit?.name || 'No data yet'}
                </strong>
                <span>Top Habit</span>
              </div>
            </div>
            {exportStats.topHabits?.length > 0 && (
              <div className={styles.exportLegend}>
                <div className={styles.exportLegendHeader}>
                  <div>
                    <h4 className={styles.exportLegendTitle}>
                      {exportView === EXPORT_VIEWS.year ? 'Top habits this year' : 'Top habits this month'}
                    </h4>
                    <p className={styles.exportLegendSubtitle}>Preview only. The PNG stays clean.</p>
                  </div>
                </div>
                <div className={styles.exportLegendList}>
                  {exportStats.topHabits.map((habit) => (
                    <div key={habit.id} className={styles.exportLegendItem}>
                      <span
                        className={styles.exportLegendDot}
                        style={{ backgroundColor: habit.color || exportPreviewAccent }}
                      />
                      <span className={styles.exportLegendEmoji}>{habit.emoji}</span>
                      <span className={styles.exportLegendName}>{habit.name}</span>
                      <span className={styles.exportLegendValue}>{habit.total} days</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {exportShareError && (
              <p className={styles.exportShareError}>{exportShareError}</p>
            )}
            <div className={styles.exportModalActions}>
              <button
                type="button"
                className={styles.exportModalCancel}
                onClick={() => setIsExportPreviewOpen(false)}
                disabled={isExportingPoster || isSharingPoster}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.exportModalShare}
                onClick={handleShareHabitMap}
                disabled={isExportingPoster || isSharingPoster}
              >
                {isSharingPoster ? 'Preparing Share...' : 'Share'}
              </button>
              <button
                type="button"
                className={styles.exportModalConfirm}
                onClick={executeHabitMapExport}
                disabled={isExportingPoster || isSharingPoster}
              >
                {isExportingPoster ? 'Downloading...' : 'Download PNG'}
              </button>
            </div>
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

      {/* Habit Day Modal */}
      <HabitDayModal
        isOpen={isDayModalOpen}
        onClose={handleDayModalClose}
        onSave={handleSaveDayHabits}
        onEditHabit={handleEditHabit}
        date={selectedDate}
        day={selectedDay}
        habits={habits}
        completedHabits={selectedDate ? getCompletedHabits(selectedDate) : []}
        weekStats={selectedWeekStats}
        calendarEntry={selectedDate ? calendarEntries[selectedDate] : null}
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

      {saveToast && (
        <div
          className={`${styles.saveToast} ${saveToast.type === 'error' ? styles.errorSaveToast : ''}`}
          role="status"
          aria-live="polite"
        >
          {saveToast.message}
        </div>
      )}
    </div>
  );
};

export default CalendarView; 
