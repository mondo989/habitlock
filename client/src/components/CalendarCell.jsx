import { memo, useEffect, useMemo, useRef, useState } from 'react';
import Tooltip from './Tooltip';
import PatternBackground, {
  getAutoPatternPreset,
  getHabitSeedOffset,
} from './PatternBackground';
import { getPatternOverrideForHabit } from '../hooks/usePatternConfig';
import { calculateWeeklyCompletions } from '../utils/streakUtils';
import styles from './CalendarCell.module.scss';

const seededRandom = (seed) => {
  let t = seed + 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getHistoryProgress = (completionCount) => {
  if (!Number.isFinite(completionCount) || completionCount <= 0) return 0;
  const cap = 50;
  return clamp(Math.log10(completionCount + 1) / Math.log10(cap + 1), 0, 1);
};

const getStreakProgress = (streakCount) => {
  if (!Number.isFinite(streakCount) || streakCount <= 0) return 0;
  if (streakCount === 1) return 0.08;
  if (streakCount === 2) return 0.18;
  return clamp(streakCount, 1, 7) / 7;
};

const getHabitVisualStrength = ({ completions = 0, streak = 0 } = {}) => {
  const streakProgress = getStreakProgress(streak);
  if (streakProgress > 0) return streakProgress;
  return 0.08 + (getHistoryProgress(completions) * 0.2);
};

const lightenColor = (hex, amount) => {
  const normalized = (hex || '#60a5fa').replace('#', '');
  const value = parseInt(normalized, 16);
  const r = Math.min(255, ((value >> 16) & 0xff) + Math.round(255 * amount));
  const g = Math.min(255, ((value >> 8) & 0xff) + Math.round(255 * amount));
  const b = Math.min(255, (value & 0xff) + Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

const toHex = (opacity) => (
  Math.round(Math.min(1, Math.max(0, opacity)) * 255).toString(16).padStart(2, '0')
);

const toTimestamp = (value) => {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

const hashString = (value = '') => {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }
  return Math.abs(hash);
};
const DEFAULT_HABIT_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
const PATTERN_ENTER_DURATION_MS = 460;
const PATTERN_EXIT_DURATION_MS = 420;
const STREAK_ROTATION_MIN_DAYS = 7;

const createSpinSettings = (spinSeed) => {
  const durationSeconds = 22 + (seededRandom(spinSeed) * 20);
  const duration = `${durationSeconds.toFixed(2)}s`;
  const delay = `-${(seededRandom(spinSeed + 1) * durationSeconds).toFixed(2)}s`;
  const reverse = seededRandom(spinSeed + 2) > 0.5;

  return {
    duration,
    delay,
    reverse,
  };
};

const CalendarCell = ({
  day,
  habits,
  patternConfig,
  completedHabits,
  onHabitDetailClick,
  onDayClick,
  onDayHabitsClick,
  hasHabitMetWeeklyGoal,
  isCurrentMonth = true,
  isToday = false,
  animationIndex = 0,
  calendarEntries = {},
  habitProgressByDate = {},
  isPreview = false,
  previewScale = 'default',
  previewOverrides = null,
  isMobile = false,
  patternOnly = false,
  showEmojis = true,
  disableInteractions = false,
  disableAnimations = false,
  dayPatternAnimation = null,
}) => {
  const { date } = day;
  const [isPatternEntering, setIsPatternEntering] = useState(false);
  const [patternAnimationKey, setPatternAnimationKey] = useState(0);
  const [exitingHabitIds, setExitingHabitIds] = useState([]);
  const enterAnimationTimerRef = useRef(null);
  const enterAnimationFrameRef = useRef(null);
  const exitAnimationTimerRef = useRef(null);

  const completedHabitDetails = useMemo(
    () => habits.filter((habit) => habit && habit.id && completedHabits.includes(habit.id)),
    [habits, completedHabits],
  );
  const habitById = useMemo(
    () => new Map(habits.filter((habit) => habit && habit.id).map((habit) => [habit.id, habit])),
    [habits],
  );
  const exitingHabitDetails = useMemo(
    () => exitingHabitIds.map((habitId) => habitById.get(habitId)).filter((habit) => habit && habit.id),
    [exitingHabitIds, habitById],
  );

  useEffect(() => () => {
    if (enterAnimationTimerRef.current) {
      clearTimeout(enterAnimationTimerRef.current);
    }
    if (enterAnimationFrameRef.current) {
      cancelAnimationFrame(enterAnimationFrameRef.current);
    }
    if (exitAnimationTimerRef.current) {
      clearTimeout(exitAnimationTimerRef.current);
    }
  }, []);

  const allHabitsComplete = habits.length > 0 && completedHabitDetails.length === habits.length;

  const dateSeed = useMemo(
    () => date.split('-').reduce((acc, num) => acc + parseInt(num, 10), 0),
    [date],
  );

  const habitColors = useMemo(() => {
    return completedHabitDetails.map(
      (habit, index) => habit.color || DEFAULT_HABIT_COLORS[index % DEFAULT_HABIT_COLORS.length],
    );
  }, [completedHabitDetails]);
  const habitColorById = useMemo(() => {
    const lookup = new Map();
    completedHabitDetails.forEach((habit, index) => {
      lookup.set(habit.id, habit.color || DEFAULT_HABIT_COLORS[index % DEFAULT_HABIT_COLORS.length]);
    });
    return lookup;
  }, [completedHabitDetails]);
  const exitingHabitColors = useMemo(() => {
    return exitingHabitDetails.map(
      (habit, index) => habit.color || DEFAULT_HABIT_COLORS[index % DEFAULT_HABIT_COLORS.length],
    );
  }, [exitingHabitDetails]);

  const sortedPatternHabitDetails = useMemo(() => {
    if (completedHabitDetails.length <= 1) return completedHabitDetails;

    const entryHabits = calendarEntries?.[date]?.habits || {};
    const completedOrderById = new Map(
      completedHabits.map((habitId, index) => [habitId, index]),
    );
    const originalOrderById = new Map(
      completedHabitDetails.map((habit, index) => [habit.id, index]),
    );

    return [...completedHabitDetails].sort((a, b) => {
      const aTimestamp = toTimestamp(entryHabits?.[a.id]?.completedAt);
      const bTimestamp = toTimestamp(entryHabits?.[b.id]?.completedAt);

      if (aTimestamp != null && bTimestamp != null && aTimestamp !== bTimestamp) {
        return aTimestamp - bTimestamp;
      }

      if (aTimestamp != null && bTimestamp == null) return 1;
      if (aTimestamp == null && bTimestamp != null) return -1;

      const aCreatedAt = toTimestamp(a?.createdAt);
      const bCreatedAt = toTimestamp(b?.createdAt);
      if (aCreatedAt != null && bCreatedAt != null && aCreatedAt !== bCreatedAt) {
        return aCreatedAt - bCreatedAt;
      }

      if (aCreatedAt != null && bCreatedAt == null) return 1;
      if (aCreatedAt == null && bCreatedAt != null) return -1;

      const completedOrderDelta = (completedOrderById.get(a.id) ?? 0) - (completedOrderById.get(b.id) ?? 0);
      if (completedOrderDelta !== 0) {
        return completedOrderDelta;
      }

      return (originalOrderById.get(a.id) ?? 0) - (originalOrderById.get(b.id) ?? 0);
    });
  }, [calendarEntries, completedHabitDetails, completedHabits, date]);

  const patternSeed = useMemo(() => (
    completedHabitDetails.length > 0
      ? hashString(completedHabitDetails.map((habit) => habit.id).sort().join('|'))
      : 0
  ), [completedHabitDetails]);
  const exitingPatternSeed = useMemo(() => (
    exitingHabitDetails.length > 0
      ? hashString(exitingHabitDetails.map((habit) => habit.id).sort().join('|'))
      : 0
  ), [exitingHabitDetails]);

  const emojiData = useMemo(() => {
    if (completedHabitDetails.length === 0) return [];

    return completedHabitDetails.map((habit, index) => {
      const baseSeed = dateSeed + (index * 100) + habit.id.charCodeAt(0);
      const count = completedHabitDetails.length;

      let size;
      if (count === 1) size = 1.8;
      else if (count === 2) size = 1.4;
      else if (count === 3) size = 1.2;
      else if (count <= 6) size = 1.0 + (seededRandom(baseSeed + 2) * 0.3);
      else size = 0.8 + (seededRandom(baseSeed + 2) * 0.3);

      return { size };
    });
  }, [completedHabitDetails, dateSeed]);

  const dayVisualStrength = useMemo(() => {
    if (completedHabitDetails.length === 0) return 0;
    return completedHabitDetails.reduce((acc, habit) => {
      const progress = habitProgressByDate?.[date]?.[habit.id] || { completions: 1, streak: 1 };
      return acc + getHabitVisualStrength(progress);
    }, 0) / Math.max(1, completedHabitDetails.length);
  }, [completedHabitDetails, habitProgressByDate, date]);

  const patternLayers = useMemo(() => sortedPatternHabitDetails.map((habit, index) => {
    const override = previewOverrides?.[habit.id] || getPatternOverrideForHabit(habit, patternConfig);
    const preset = override || getAutoPatternPreset(habit.id);
    const progress = habitProgressByDate?.[date]?.[habit.id] || { completions: 1, streak: 1 };
    const visualStrength = getHabitVisualStrength(progress);
    const streakDays = Number.isFinite(progress?.streak) ? progress.streak : 0;

    return {
      color: habitColorById.get(habit.id) || habit.color || DEFAULT_HABIT_COLORS[index % DEFAULT_HABIT_COLORS.length],
      habitId: habit.id,
      preset,
      seed: patternSeed + getHabitSeedOffset(`${date}:${habit.id}:${index}`),
      opacityMultiplier: isPreview ? 1 : clamp(0.4 + (visualStrength * 0.65), 0.4, 1),
      scaleMultiplier: isPreview ? 1 : 0.94 + (visualStrength * 0.12),
      streakDays,
    };
  }), [date, habitColorById, habitProgressByDate, isPreview, patternConfig, patternSeed, previewOverrides, sortedPatternHabitDetails]);
  const exitingPatternLayers = useMemo(() => exitingHabitDetails.map((habit, index) => {
    const override = previewOverrides?.[habit.id] || getPatternOverrideForHabit(habit, patternConfig);
    const preset = override || getAutoPatternPreset(habit.id);
    const progress = habitProgressByDate?.[date]?.[habit.id] || { completions: 1, streak: 1 };
    const visualStrength = getHabitVisualStrength(progress);

    return {
      color: habit.color || exitingHabitColors[index],
      habitId: habit.id,
      preset,
      seed: exitingPatternSeed + getHabitSeedOffset(`${date}:${habit.id}:${index}`),
      opacityMultiplier: isPreview ? 1 : clamp(0.4 + (visualStrength * 0.65), 0.4, 1),
      scaleMultiplier: isPreview ? 1 : 0.94 + (visualStrength * 0.12),
    };
  }), [date, exitingHabitColors, exitingHabitDetails, exitingPatternSeed, habitProgressByDate, isPreview, patternConfig, previewOverrides]);
  const rotatingPatternSettings = useMemo(() => {
    if (
      disableAnimations
      || isPreview
      || patternOnly
      || patternLayers.length === 0
    ) {
      return [];
    }

    return patternLayers.map((patternLayer, index) => {
      if ((patternLayer.streakDays ?? 0) < STREAK_ROTATION_MIN_DAYS) {
        return null;
      }

      const spinSeed = (patternLayer.seed ?? (patternSeed + index + 1)) + dateSeed + (index * 37);
      return createSpinSettings(spinSeed);
    });
  }, [dateSeed, disableAnimations, isPreview, patternLayers, patternOnly, patternSeed]);
  const rotatingPatternLayerIndex = useMemo(() => {
    for (let index = rotatingPatternSettings.length - 1; index >= 0; index -= 1) {
      if (rotatingPatternSettings[index]) return index;
    }
    return -1;
  }, [rotatingPatternSettings]);
  const hasRotatingPatternLayer = rotatingPatternLayerIndex >= 0;
  const wholePatternSpin = useMemo(() => {
    if (
      !allHabitsComplete
      || disableAnimations
      || isPreview
      || patternOnly
      || patternLayers.length === 0
    ) {
      return null;
    }

    const spinSeed = patternSeed + dateSeed + (patternLayers.length * 41);
    return createSpinSettings(spinSeed);
  }, [allHabitsComplete, dateSeed, disableAnimations, isPreview, patternLayers.length, patternOnly, patternSeed]);
  const shouldSpinWholePattern = Boolean(wholePatternSpin);

  useEffect(() => {
    if (disableAnimations || isPreview || patternOnly) {
      return;
    }
    if (!dayPatternAnimation || dayPatternAnimation.date !== date) {
      return;
    }

    const {
      token,
      hasAddedHabits,
      hasRemovedHabits,
      previousHabitIds = [],
    } = dayPatternAnimation;

    if (!token) return;

    if (hasRemovedHabits && previousHabitIds.length > 0) {
      const validPreviousHabitIds = previousHabitIds.filter((habitId) => habitById.has(habitId));
      if (validPreviousHabitIds.length > 0) {
        setExitingHabitIds(validPreviousHabitIds);
        if (exitAnimationTimerRef.current) {
          clearTimeout(exitAnimationTimerRef.current);
        }
        exitAnimationTimerRef.current = setTimeout(() => {
          setExitingHabitIds([]);
          exitAnimationTimerRef.current = null;
        }, PATTERN_EXIT_DURATION_MS);
      }
    }

    if (hasAddedHabits && patternLayers.length > 0) {
      if (enterAnimationTimerRef.current) {
        clearTimeout(enterAnimationTimerRef.current);
      }
      if (enterAnimationFrameRef.current) {
        cancelAnimationFrame(enterAnimationFrameRef.current);
      }

      setPatternAnimationKey(token);
      setIsPatternEntering(false);
      enterAnimationFrameRef.current = requestAnimationFrame(() => {
        setIsPatternEntering(true);
        enterAnimationFrameRef.current = null;
        enterAnimationTimerRef.current = setTimeout(() => {
          setIsPatternEntering(false);
          enterAnimationTimerRef.current = null;
        }, PATTERN_ENTER_DURATION_MS);
      });
    }
  }, [date, dayPatternAnimation, disableAnimations, habitById, isPreview, patternLayers.length, patternOnly]);

  const backgroundStyle = useMemo(() => {
    const baseStyle = {
      '--animation-delay': `${animationIndex * 0.02}s`,
      '--completion-overlay-opacity': `${0.05 + (dayVisualStrength * 0.18)}`,
    };

    if (completedHabitDetails.length === 0 || habits.length === 0) {
      return baseStyle;
    }

    const colors = habitColors;
    const completionRatio = completedHabitDetails.length / habits.length;
    const allHabitsCompleted = completionRatio >= 1;
    const completionIntensity = allHabitsCompleted ? 1 : Math.max(dayVisualStrength, completionRatio);
    const computedOpacity = clamp(isPreview ? 0.2 + (completionIntensity * 0.5) : completionIntensity, 0.08, 1);
    const baseOpacity = allHabitsCompleted ? 1 : computedOpacity;
    const primaryColor = colors[0];
    const secondaryColor = colors[1] || colors[0];
    const angle1 = Math.floor(seededRandom(dateSeed) * 360);
    const angle2 = (angle1 + 120 + Math.floor(seededRandom(dateSeed + 1) * 60)) % 360;
    const centerGlowOpacity = baseOpacity * (0.1 + (completionRatio * 0.18));
    const orbOpacityMultiplier = 0.04 + (completionRatio * 0.13);
    const edgeGlowOpacity = baseOpacity * (0.04 + (completionRatio * 0.06));
    const auroraOpacity = baseOpacity * (0.04 + (completionRatio * 0.08));
    const singleAuroraStartOpacity = baseOpacity * (0.05 + (completionRatio * 0.08));
    const singleAuroraEndOpacity = baseOpacity * (0.03 + (completionRatio * 0.05));
    const baseFillStartOpacity = baseOpacity * (0.18 + (completionRatio * 0.42));
    const baseFillEndOpacity = baseOpacity * (0.34 + (completionRatio * 0.66));

    const centerGlow = `radial-gradient(ellipse at 50% 50%, ${lightenColor(primaryColor, 0.22)}${toHex(centerGlowOpacity)} 0%, transparent 72%)`;
    const orbs = colors.slice(0, Math.min(4, colors.length)).map((color, index) => {
      const orbSeed = dateSeed + (index * 17);
      const x = 15 + (seededRandom(orbSeed) * 70);
      const y = 15 + (seededRandom(orbSeed + 1) * 70);
      const size = 38 + (seededRandom(orbSeed + 2) * 32) + (completionRatio * 18);
      const orbOpacity = baseOpacity * orbOpacityMultiplier;
      return `radial-gradient(ellipse ${size}% ${size * 1.18}% at ${x}% ${y}%, ${color}${toHex(orbOpacity)} 0%, ${color}${toHex(orbOpacity * 0.32)} 38%, transparent 72%)`;
    });
    const edgeGlow = `radial-gradient(ellipse at 50% 100%, ${secondaryColor}${toHex(edgeGlowOpacity)} 0%, transparent 50%)`;
    const aurora = colors.length >= 2
      ? `linear-gradient(${angle1}deg, ${colors.map((color, index) => `${color}${toHex(auroraOpacity)} ${(index / colors.length) * 100}%`).join(', ')}, transparent 100%)`
      : `linear-gradient(${angle1}deg, ${primaryColor}${toHex(singleAuroraStartOpacity)} 0%, ${lightenColor(primaryColor, 0.16)}${toHex(singleAuroraEndOpacity)} 100%)`;
    const baseFill = `linear-gradient(${angle2}deg, ${primaryColor}${toHex(baseFillStartOpacity)} 0%, ${secondaryColor}${toHex(baseFillEndOpacity)} 100%)`;

    return {
      ...baseStyle,
      '--cell-background': [centerGlow, ...orbs, edgeGlow, aurora, baseFill].filter(Boolean).join(', '),
    };
  }, [animationIndex, completedHabitDetails.length, dateSeed, dayVisualStrength, habitColors, habits.length, isPreview]);

  const dayNumberTooltipContent = useMemo(() => {
    if (completedHabitDetails.length === 0) {
      return (
        <div>
          <div className={styles.tooltipDate}>{day.dayjs.format('MMM D, YYYY')}</div>
          <div className={styles.tooltipHint}>Click to track habits</div>
        </div>
      );
    }

    return (
      <div>
        <div className={styles.tooltipDate}>{day.dayjs.format('MMM D, YYYY')}</div>
        <div className={styles.tooltipSummary}>
          {completedHabitDetails.length} of {habits.length} completed
        </div>
      </div>
    );
  }, [completedHabitDetails, day, habits.length]);

  const handleCellClick = (event) => {
    event.preventDefault();
    if (onDayClick) onDayClick(date, day);
  };

  const handleHabitClick = (event, habitId) => {
    event.stopPropagation();
    if (onHabitDetailClick) onHabitDetailClick(habitId);
  };

  const handleStackedHabitsClick = (event) => {
    event.stopPropagation();
    if (onDayHabitsClick) onDayHabitsClick(day);
  };

  return (
    <div
      className={`
        ${styles.calendarCell}
        ${!isCurrentMonth ? styles.otherMonth : ''}
        ${isToday ? styles.today : ''}
        ${completedHabitDetails.length > 0 ? styles.hasCompletions : ''}
        ${allHabitsComplete ? styles.allComplete : ''}
        ${disableAnimations ? styles.staticPreview : ''}
        ${previewScale === 'month' ? styles.previewMonthCell : ''}
        ${previewScale === 'year' ? styles.previewYearCell : ''}
      `}
      style={backgroundStyle}
      onClick={patternOnly || disableInteractions ? undefined : handleCellClick}
      data-date={date}
      data-calendar-cell={isPreview ? undefined : 'true'}
    >
      <div className={styles.backgroundLayer} />

      {patternLayers.length > 0 && (
        <div
          key={patternAnimationKey}
          className={`${styles.patternLayer} ${isPatternEntering ? styles.patternEnter : ''}`}
        >
          {shouldSpinWholePattern ? (
            <div className={styles.patternLayerStack}>
              <div
                className={`${styles.patternLayerItem} ${styles.patternLayerSpin} ${wholePatternSpin?.reverse ? styles.patternLayerSpinReverse : ''}`}
                style={{
                  '--pattern-spin-duration': wholePatternSpin?.duration,
                  '--pattern-spin-delay': wholePatternSpin?.delay,
                }}
              >
                <PatternBackground
                  patternLayers={patternLayers}
                  seed={patternSeed}
                  className={styles.patternBackground}
                />
              </div>
            </div>
          ) : hasRotatingPatternLayer ? (
            <div className={styles.patternLayerStack}>
              {patternLayers.map((patternLayer, index) => {
                const spin = index === rotatingPatternLayerIndex ? rotatingPatternSettings[index] : null;
                const layerSeed = patternLayer.seed ?? (patternSeed + index + 1);
                const layerStyle = spin
                  ? {
                    zIndex: index + 1,
                    '--pattern-spin-duration': spin.duration,
                    '--pattern-spin-delay': spin.delay,
                  }
                  : { zIndex: index + 1 };

                return (
                  <div
                    key={`${patternLayer.habitId || `layer-${index}`}-${layerSeed}`}
                    className={`${styles.patternLayerItem} ${spin ? styles.patternLayerSpin : ''} ${spin?.reverse ? styles.patternLayerSpinReverse : ''}`}
                    style={layerStyle}
                  >
                    <PatternBackground
                      patternLayers={[patternLayer]}
                      seed={layerSeed}
                      className={styles.patternBackground}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <PatternBackground
              patternLayers={patternLayers}
              seed={patternSeed}
              className={styles.patternBackground}
            />
          )}
        </div>
      )}
      {exitingPatternLayers.length > 0 && (
        <div className={`${styles.patternLayer} ${styles.patternExit}`}>
          <PatternBackground
            patternLayers={exitingPatternLayers}
            seed={exitingPatternSeed}
            className={styles.patternBackground}
          />
        </div>
      )}

      {!patternOnly && <div className={styles.habitOverlay} />}

      {!patternOnly && (
        <div className={styles.dayNumberTooltipAnchor}>
          <Tooltip
            content={dayNumberTooltipContent}
            position="top"
            openOnClick={false}
            hoverCloseDelay={0}
          >
            <div className={styles.dayNumber}>{day.dayjs.date()}</div>
          </Tooltip>
        </div>
      )}

      {!patternOnly && showEmojis && completedHabitDetails.length > 0 && (
        <div className={styles.emojiCanvas}>
          {isMobile ? (
            <div className={styles.mobileLayout} onClick={handleStackedHabitsClick}>
              <span className={styles.mobileCount}>{completedHabitDetails.length}</span>
            </div>
          ) : (
            <div className={styles.emojiCluster}>
              {completedHabitDetails.map((habit, index) => {
                const data = emojiData[index];
                const hasMetGoal = hasHabitMetWeeklyGoal(habit.id, date);
                const weeklyCompletions = calculateWeeklyCompletions(habit.id, date, calendarEntries);
                const emojiTooltipContent = (
                  <div className={styles.emojiTooltip}>
                    <div className={styles.tooltipHeader}>
                      <span className={styles.tooltipEmoji}>{habit.emoji}</span>
                      <span className={styles.tooltipName}>{habit.name}</span>
                    </div>
                    {hasMetGoal && <div className={styles.goalBadge}>Weekly goal reached</div>}
                    {!hasMetGoal && weeklyCompletions > 0 && (
                      <div className={styles.progressText}>{weeklyCompletions}/{habit.weeklyGoal} this week</div>
                    )}
                  </div>
                );

                return (
                  <Tooltip key={habit.id} content={emojiTooltipContent} position="bottom">
                    <span
                      className={`${styles.floatingEmoji} ${hasMetGoal ? styles.goalMet : ''}`}
                      style={{ fontSize: `${data.size}rem` }}
                      onClick={(event) => handleHabitClick(event, habit.id)}
                      data-habit-id={habit.id}
                    >
                      {habit.emoji}
                    </span>
                  </Tooltip>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const areCompletedHabitsEqual = (prev, next) => {
  if (prev === next) return true;
  if (!prev || !next || prev.length !== next.length) return false;
  for (let index = 0; index < prev.length; index += 1) {
    if (prev[index] !== next[index]) return false;
  }
  return true;
};
const areDayPatternAnimationsEqual = (prev, next) => (
  (prev === next)
  || (
    prev
    && next
    && prev.date === next.date
    && prev.token === next.token
    && prev.hasAddedHabits === next.hasAddedHabits
    && prev.hasRemovedHabits === next.hasRemovedHabits
    && areCompletedHabitsEqual(prev.previousHabitIds || [], next.previousHabitIds || [])
  )
);

const areEqual = (prevProps, nextProps) => (
  prevProps.day === nextProps.day &&
  prevProps.habits === nextProps.habits &&
  prevProps.patternConfig === nextProps.patternConfig &&
  areCompletedHabitsEqual(prevProps.completedHabits, nextProps.completedHabits) &&
  prevProps.hasHabitMetWeeklyGoal === nextProps.hasHabitMetWeeklyGoal &&
  prevProps.isCurrentMonth === nextProps.isCurrentMonth &&
  prevProps.isToday === nextProps.isToday &&
  prevProps.animationIndex === nextProps.animationIndex &&
  prevProps.calendarEntries === nextProps.calendarEntries &&
  prevProps.habitProgressByDate === nextProps.habitProgressByDate &&
  prevProps.isPreview === nextProps.isPreview &&
  prevProps.previewScale === nextProps.previewScale &&
  prevProps.previewOverrides === nextProps.previewOverrides &&
  prevProps.isMobile === nextProps.isMobile &&
  prevProps.patternOnly === nextProps.patternOnly &&
  prevProps.showEmojis === nextProps.showEmojis &&
  prevProps.disableInteractions === nextProps.disableInteractions &&
  prevProps.disableAnimations === nextProps.disableAnimations &&
  areDayPatternAnimationsEqual(prevProps.dayPatternAnimation, nextProps.dayPatternAnimation)
);

export default memo(CalendarCell, areEqual);
