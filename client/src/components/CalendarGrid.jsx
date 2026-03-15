import { useRef, useEffect, useLayoutEffect, useState, useMemo } from 'react';
import dayjs from 'dayjs';
import CalendarCell from './CalendarCell';
import styles from './CalendarGrid.module.scss';

const hexToRgb = (hex) => {
  if (!hex || typeof hex !== 'string') return null;
  const normalized = hex.trim();
  const cleanHex = normalized.startsWith('#') ? normalized.slice(1) : normalized;
  if (!/^[a-fA-F0-9]{3}$|^[a-fA-F0-9]{6}$/.test(cleanHex)) return null;

  const fullHex = cleanHex.length === 3
    ? cleanHex.split('').map((char) => char + char).join('')
    : cleanHex;

  const value = parseInt(fullHex, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const averageColor = (colors) => {
  if (!colors.length) return null;
  const totals = colors.reduce((acc, color) => {
    const rgb = hexToRgb(color);
    if (!rgb) return acc;
    acc.r += rgb.r;
    acc.g += rgb.g;
    acc.b += rgb.b;
    acc.count += 1;
    return acc;
  }, { r: 0, g: 0, b: 0, count: 0 });

  if (!totals.count) return null;
  return {
    r: Math.round(totals.r / totals.count),
    g: Math.round(totals.g / totals.count),
    b: Math.round(totals.b / totals.count),
  };
};

const STREAK_MILESTONE_COLOR = '#f59e0b';

const getLineThickness = (streak) => {
  if (streak >= 30) return 8;
  if (streak < 7) return 2.25;

  const progressToThirty = (Math.min(streak, 30) - 7) / 23;
  return 3.5 + (progressToThirty * 2.5);
};

const getSegmentVisual = (streak, baseColor) => {
  const strokeWidth = getLineThickness(streak);
  const isMilestone = streak >= 30;

  return {
    stroke: isMilestone ? STREAK_MILESTONE_COLOR : baseColor,
    strokeWidth,
    backgroundWidth: strokeWidth + 1.75,
    glowWidth: strokeWidth + (isMilestone ? 5.5 : 4),
    glowOpacity: isMilestone ? 0.55 : 0.32,
    streak,
  };
};

const CalendarGrid = ({ 
  calendarMatrix, 
  habits, 
  getCompletedHabits, 
  onHabitDetailClick,
  onDayClick,
  onDayHabitsClick,
  hasHabitMetWeeklyGoal,
  calendarEntries,
  hoveredHabitId,
  dayPatternAnimation,
}) => {
  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const gridRef = useRef(null);
  const [streakLines, setStreakLines] = useState([]);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false));

  useEffect(() => {
    const updateIsMobile = () => setIsMobile(window.innerWidth <= 768);
    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);

  // Get the color and emoji of the hovered habit
  const hoveredHabit = useMemo(() => {
    if (!hoveredHabitId) return null;
    const habit = habits.find(h => h.id === hoveredHabitId);
    return habit ? { color: habit.color || '#fbbf24', emoji: habit.emoji, id: habit.id } : null;
  }, [hoveredHabitId, habits]);

  // Combined state for both streak lines and emoji positions
  const [allEmojiPositions, setAllEmojiPositions] = useState([]);
  const [hoverCacheVersion, setHoverCacheVersion] = useState(0);
  
  // Track leaving state for exit animation
  const [isLeaving, setIsLeaving] = useState(false);
  const [displayedPositions, setDisplayedPositions] = useState([]);
  const [displayedHabit, setDisplayedHabit] = useState(null);
  const leavingTimerRef = useRef(null);
  const hoverFrameRef = useRef(null);
  const hoverDecoratedElementsRef = useRef([]);
  const hoverMatchedCellsRef = useRef([]);
  const hoverCacheRef = useRef({
    cellsByDate: new Map(),
    datesByHabitId: new Map(),
  });
  
  // Update displayed positions when new positions are calculated
  useEffect(() => {
    if (hoveredHabitId && allEmojiPositions.length > 0 && hoveredHabit) {
      // Clear any pending leaving timer
      if (leavingTimerRef.current) {
        clearTimeout(leavingTimerRef.current);
        leavingTimerRef.current = null;
      }
      setDisplayedPositions(allEmojiPositions);
      setDisplayedHabit(hoveredHabit);
      setIsLeaving(false);
    }
  }, [hoveredHabitId, allEmojiPositions, hoveredHabit]);

  const completedHabitsByDate = useMemo(() => {
    const lookup = {};
    calendarMatrix.forEach((week) => {
      week.forEach((day) => {
        lookup[day.date] = getCompletedHabits(day.date);
      });
    });
    return lookup;
  }, [calendarMatrix, getCompletedHabits, calendarEntries]);

  const habitProgressByDate = useMemo(() => {
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

  const dateMetaByDate = useMemo(() => {
    const lookup = new Map();
    calendarMatrix.forEach((week, weekIndex) => {
      week.forEach((day, dayIndex) => {
        lookup.set(day.date, { weekIndex, dayIndex });
      });
    });
    return lookup;
  }, [calendarMatrix]);

  const terrainBlendBackground = useMemo(() => {
    if (!calendarMatrix.length || !habits.length) return '';

    const habitColorById = new Map(
      habits.map((habit) => [habit.id, habit.color || '#60a5fa'])
    );
    const rowCount = calendarMatrix.length;
    const blendLayers = [];

    calendarMatrix.forEach((week, weekIndex) => {
      week.forEach((day, dayIndex) => {
        if (!day.isCurrentMonth) return;
        const completedIds = completedHabitsByDate[day.date] || [];
        if (!completedIds.length) return;

        const colors = completedIds
          .map((habitId) => habitColorById.get(habitId))
          .filter(Boolean);
        const mixedColor = averageColor(colors);
        if (!mixedColor) return;

        const x = ((dayIndex + 0.5) / 7) * 100;
        const y = ((weekIndex + 0.5) / rowCount) * 100;
        blendLayers.push(
          `radial-gradient(circle at ${x}% ${y}%, rgba(${mixedColor.r}, ${mixedColor.g}, ${mixedColor.b}, 0.8) 0%, rgba(${mixedColor.r}, ${mixedColor.g}, ${mixedColor.b}, 0.35) 22%, transparent 58%)`
        );
      });
    });

    if (!blendLayers.length) return '';
    return blendLayers.join(', ');
  }, [calendarMatrix, completedHabitsByDate, habits]);
  
  // Handle exit animation when hover ends
  useEffect(() => {
    if (!hoveredHabitId && displayedPositions.length > 0 && !isLeaving) {
      // Hover just ended - trigger exit animation
      setIsLeaving(true);
      leavingTimerRef.current = setTimeout(() => {
        setIsLeaving(false);
        setDisplayedPositions([]);
        setDisplayedHabit(null);
        leavingTimerRef.current = null;
      }, 250); // Match exit animation duration (0.2s + buffer)
    }
    
    return () => {
      if (leavingTimerRef.current) {
        clearTimeout(leavingTimerRef.current);
      }
    };
  }, [hoveredHabitId, displayedPositions.length, isLeaving]);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return undefined;

    let rebuildFrame = null;

    const rebuildHoverCache = () => {
      rebuildFrame = null;

      const nextCellsByDate = new Map();
      const nextDatesByHabitId = new Map();
      const cellElements = Array.from(grid.querySelectorAll('[data-calendar-cell="true"]'));
      const gridRect = grid.getBoundingClientRect();

      cellElements.forEach((cell) => {
        const date = cell.getAttribute('data-date');
        if (!date) return;

        const cellRect = cell.getBoundingClientRect();
        const emojiElementsByHabitId = new Map();
        const emojiCentersByHabitId = new Map();
        const layerElementsByHabitId = new Map();

        cell.querySelectorAll('[data-habit-id]').forEach((emojiElement) => {
          const habitId = emojiElement.getAttribute('data-habit-id');
          if (!habitId || emojiElementsByHabitId.has(habitId)) return;

          const emojiRect = emojiElement.getBoundingClientRect();
          emojiElementsByHabitId.set(habitId, emojiElement);
          emojiCentersByHabitId.set(habitId, {
            x: emojiRect.left - gridRect.left + emojiRect.width / 2,
            y: emojiRect.top - gridRect.top + emojiRect.height / 2,
          });
        });

        cell.querySelectorAll('[data-layer-habit-id]').forEach((layerElement) => {
          const habitId = layerElement.getAttribute('data-layer-habit-id');
          if (!habitId || layerElementsByHabitId.has(habitId)) return;
          layerElementsByHabitId.set(habitId, layerElement);
        });

        nextCellsByDate.set(date, {
          cell,
          left: cellRect.left - gridRect.left,
          right: cellRect.right - gridRect.left,
          centerX: cellRect.left - gridRect.left + cellRect.width / 2,
          centerY: cellRect.top - gridRect.top + cellRect.height / 2,
          emojiElementsByHabitId,
          emojiCentersByHabitId,
          layerElementsByHabitId,
        });

        (completedHabitsByDate[date] || []).forEach((habitId) => {
          if (!nextDatesByHabitId.has(habitId)) {
            nextDatesByHabitId.set(habitId, []);
          }
          nextDatesByHabitId.get(habitId).push(date);
        });
      });

      nextDatesByHabitId.forEach((dates) => {
        dates.sort((left, right) => {
          const leftMeta = dateMetaByDate.get(left);
          const rightMeta = dateMetaByDate.get(right);

          if (!leftMeta || !rightMeta) {
            return left.localeCompare(right);
          }

          if (leftMeta.weekIndex !== rightMeta.weekIndex) {
            return leftMeta.weekIndex - rightMeta.weekIndex;
          }

          return leftMeta.dayIndex - rightMeta.dayIndex;
        });
      });

      hoverCacheRef.current = {
        cellsByDate: nextCellsByDate,
        datesByHabitId: nextDatesByHabitId,
      };
      setHoverCacheVersion((version) => version + 1);
    };

    const scheduleRebuild = () => {
      if (rebuildFrame) {
        cancelAnimationFrame(rebuildFrame);
      }
      rebuildFrame = requestAnimationFrame(rebuildHoverCache);
    };

    scheduleRebuild();

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        scheduleRebuild();
      });
      resizeObserver.observe(grid);
    }

    return () => {
      if (rebuildFrame) {
        cancelAnimationFrame(rebuildFrame);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [calendarMatrix, completedHabitsByDate, dateMetaByDate, habits, isMobile]);

  // Drive hover visuals through DOM attributes so cell hover does not force React rerenders.
  useEffect(() => {
    const clearHoverState = () => {
      hoverMatchedCellsRef.current.forEach((cell) => {
        delete cell.dataset.hoverMatch;
      });
      hoverMatchedCellsRef.current = [];

      hoverDecoratedElementsRef.current.forEach((element) => {
        delete element.dataset.hoverMatch;
      });
      hoverDecoratedElementsRef.current = [];
    };

    if (hoverFrameRef.current) {
      cancelAnimationFrame(hoverFrameRef.current);
      hoverFrameRef.current = null;
    }

    const hoverCache = hoverCacheRef.current;
    if (!hoveredHabitId) {
      clearHoverState();
      setStreakLines([]);
      setAllEmojiPositions([]);
      return () => {
        if (hoverFrameRef.current) {
          cancelAnimationFrame(hoverFrameRef.current);
          hoverFrameRef.current = null;
        }
      };
    }

    hoverFrameRef.current = requestAnimationFrame(() => {
      hoverFrameRef.current = null;
      clearHoverState();
      const matchingDates = hoverCache.datesByHabitId.get(hoveredHabitId) || [];

      if (matchingDates.length === 0) {
        setStreakLines([]);
        setAllEmojiPositions([]);
        return;
      }

      const allCompletedCells = [];
      const decoratedElements = [];
      const matchedCells = [];

      let currentStreak = 0;
      let previousMatchingDate = null;

      matchingDates.forEach((date) => {
        const cellData = hoverCache.cellsByDate.get(date);
        if (!cellData) return;

        const isConsecutive = previousMatchingDate
          ? dayjs(date).diff(dayjs(previousMatchingDate), 'day') === 1
          : false;

        currentStreak = isConsecutive ? currentStreak + 1 : 1;
        previousMatchingDate = date;

        const {
          cell,
          left,
          right,
          centerX,
          centerY,
          emojiElementsByHabitId,
          emojiCentersByHabitId,
          layerElementsByHabitId,
        } = cellData;
        const emojiElement = emojiElementsByHabitId.get(hoveredHabitId);
        const emojiCenter = emojiCentersByHabitId.get(hoveredHabitId);
        const layerElement = layerElementsByHabitId.get(hoveredHabitId);

        cell.dataset.hoverMatch = 'true';
        matchedCells.push(cell);

        if (emojiElement) {
          emojiElement.dataset.hoverMatch = 'true';
          decoratedElements.push(emojiElement);
        }

        if (layerElement) {
          layerElement.dataset.hoverMatch = 'true';
          decoratedElements.push(layerElement);
        }

        allCompletedCells.push({
          date,
          x: centerX,
          y: centerY,
          fromX: emojiCenter?.x ?? centerX,
          fromY: emojiCenter?.y ?? centerY,
          left,
          right,
          streak: currentStreak,
        });
      });

      hoverMatchedCellsRef.current = matchedCells;
      hoverDecoratedElementsRef.current = decoratedElements;
      setAllEmojiPositions(allCompletedCells);

      const weekGroups = {};
      allCompletedCells.forEach((point) => {
        const meta = dateMetaByDate.get(point.date);
        if (!meta) return;
        if (!weekGroups[meta.weekIndex]) {
          weekGroups[meta.weekIndex] = [];
        }
        weekGroups[meta.weekIndex].push(point);
      });

      const getDayIndexInWeek = (date) => dateMetaByDate.get(date)?.dayIndex ?? -1;
      const weeklyStreakLines = [];
      const weekIndices = Object.keys(weekGroups).map(Number).sort((a, b) => a - b);
      let animationCursor = 0;

      weekIndices.forEach((weekIdx) => {
        const weekCells = weekGroups[weekIdx];
        if (weekCells.length < 2) return;

        const adjustedPoints = [...weekCells]
          .sort((left, right) => getDayIndexInWeek(left.date) - getDayIndexInWeek(right.date))
          .map((point) => ({ ...point }));

        const lastPoint = adjustedPoints[adjustedPoints.length - 1];
        const lastDayIdx = getDayIndexInWeek(lastPoint.date);
        const nextWeekHasSunday = weekGroups[weekIdx + 1]?.some((point) => getDayIndexInWeek(point.date) === 0);

        if (lastDayIdx === 6 && nextWeekHasSunday) {
          lastPoint.x = lastPoint.right - 12;
        }

        const firstPoint = adjustedPoints[0];
        const firstDayIdx = getDayIndexInWeek(firstPoint.date);
        const prevWeekHasSaturday = weekGroups[weekIdx - 1]?.some((point) => getDayIndexInWeek(point.date) === 6);

        if (firstDayIdx === 0 && prevWeekHasSaturday) {
          firstPoint.x = firstPoint.left + 12;
        }

        weeklyStreakLines.push({
          segments: adjustedPoints.slice(0, -1).map((point, index) => {
            const nextPoint = adjustedPoints[index + 1];
            const dx = nextPoint.x - point.x;
            const dy = nextPoint.y - point.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const animDuration = Math.min(0.5, Math.max(0.16, length / 900));
            const segmentVisual = getSegmentVisual(nextPoint.streak, hoveredHabit.color);
            const segment = {
              start: point,
              end: nextPoint,
              points: `${point.x},${point.y} ${nextPoint.x},${nextPoint.y}`,
              length,
              animDuration,
              animDelay: animationCursor,
              ...segmentVisual,
            };

            animationCursor += animDuration;
            return segment;
          }),
          weekIndex: weekIdx,
        });
      });

      setStreakLines(weeklyStreakLines);
    });

    return () => {
      if (hoverFrameRef.current) {
        cancelAnimationFrame(hoverFrameRef.current);
        hoverFrameRef.current = null;
      }
      clearHoverState();
    };
  }, [hoveredHabitId, dateMetaByDate, hoverCacheVersion]);

  return (
    <div
      className={styles.calendarGrid}
      ref={gridRef}
      data-calendar-hover-active={hoveredHabitId ? 'true' : undefined}
    >
      {/* Streak lines SVG overlay - line connecting emojis */}
      {hoveredHabitId && hoveredHabit && (
        <svg className={styles.streakOverlay}>
          {/* Debug: visible indicator that SVG is rendering */}
          {process.env.NODE_ENV === 'development' && streakLines.length === 0 && allEmojiPositions.length > 0 && (
            <text x="50%" y="30" textAnchor="middle" fill={hoveredHabit.color} fontSize="12" opacity="0.7">
              {allEmojiPositions.length} completed days found (need 2+ for line)
            </text>
          )}
          <defs>
            <linearGradient id="streakGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={hoveredHabit.color} stopOpacity="0.8" />
              <stop offset="50%" stopColor={hoveredHabit.color} stopOpacity="1" />
              <stop offset="100%" stopColor={hoveredHabit.color} stopOpacity="0.8" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          {streakLines.map((path) => (
            <g key={`${hoveredHabitId}-${path.weekIndex}`}>
              {path.segments.map((segment, segmentIndex) => (
                <g key={`${hoveredHabitId}-${path.weekIndex}-${segmentIndex}`}>
                  <polyline
                    points={segment.points}
                    fill="none"
                    stroke="rgba(0,0,0,0.26)"
                    strokeWidth={segment.backgroundWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={styles.streakLineBg}
                    style={{
                      '--line-length': segment.length,
                      '--anim-duration': `${segment.animDuration}s`,
                      '--anim-delay': `${segment.animDelay}s`
                    }}
                  />
                  <polyline
                    points={segment.points}
                    fill="none"
                    stroke={segment.stroke}
                    strokeWidth={segment.glowWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={segment.glowOpacity}
                    filter="url(#glow)"
                    className={styles.streakLineGlow}
                    style={{
                      '--line-length': segment.length,
                      '--anim-duration': `${segment.animDuration}s`,
                      '--anim-delay': `${segment.animDelay}s`
                    }}
                  />
                  <polyline
                    points={segment.points}
                    fill="none"
                    stroke={segment.stroke}
                    strokeWidth={segment.strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={styles.streakLine}
                    style={{
                      '--line-length': segment.length,
                      '--anim-duration': `${segment.animDuration}s`,
                      '--anim-delay': `${segment.animDelay}s`
                    }}
                  />
                </g>
              ))}
            </g>
          ))}
        </svg>
      )}

      {/* Highlighted emojis overlay - rendered above streak line */}
      {(displayedPositions.length > 0 && displayedHabit) && (
        <div className={`${styles.emojiOverlay} ${isLeaving ? styles.leaving : ''}`}>
          {displayedPositions.map((pos, index) => (
            <span
              key={`emoji-${pos.date}-${index}`}
              className={`${styles.overlayEmoji} ${isLeaving ? styles.leaving : ''}`}
              style={{
                '--center-x': `${pos.x}px`,
                '--center-y': `${pos.y}px`,
                '--from-dx': `${(pos.fromX ?? pos.x) - pos.x}px`,
                '--from-dy': `${(pos.fromY ?? pos.y) - pos.y}px`,
                '--emoji-color': displayedHabit.color,
                '--anim-delay': `${index * 0.03}s`
              }}
            >
              {displayedHabit.emoji}
            </span>
          ))}
        </div>
      )}

      {/* Day headers */}
      <div className={styles.dayHeaders}>
        {dayHeaders.map(day => (
          <div key={day} className={styles.dayHeader}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar weeks */}
      <div
        className={styles.calendarWeeks}
        style={terrainBlendBackground ? { '--terrain-blend': terrainBlendBackground } : undefined}
      >
        {terrainBlendBackground && <div className={styles.terrainBlendOverlay} aria-hidden="true" />}
        {calendarMatrix.map((week, weekIndex) => (
          <div key={weekIndex} className={styles.calendarWeek} data-week={weekIndex}>
            {week.map((day, dayIndex) => {
              const completedHabits = completedHabitsByDate[day.date] || [];
              const animationIndex = weekIndex * 7 + dayIndex;
              
              return (
                <CalendarCell
                  key={day.date}
                  day={day}
                  gridRow={weekIndex}
                  gridCol={dayIndex}
                  habits={habits}
                  completedHabits={completedHabits}
                  onHabitDetailClick={onHabitDetailClick}
                  onDayClick={onDayClick}
                  onDayHabitsClick={onDayHabitsClick}
                  hasHabitMetWeeklyGoal={hasHabitMetWeeklyGoal}
                  isCurrentMonth={day.isCurrentMonth}
                  isToday={day.isToday}
                  animationIndex={animationIndex}
                  calendarEntries={calendarEntries}
                  habitProgressByDate={habitProgressByDate}
                  isMobile={isMobile}
                  dayPatternAnimation={dayPatternAnimation?.date === day.date ? dayPatternAnimation : null}
                  data-date={day.date}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarGrid; 
