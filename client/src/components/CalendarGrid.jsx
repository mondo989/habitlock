import { useRef, useEffect, useState, useMemo } from 'react';
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

const CalendarGrid = ({ 
  calendarMatrix, 
  habits, 
  patternConfig,
  getCompletedHabits, 
  onHabitToggle,
  onHabitDetailClick,
  onDayClick,
  onDayHabitsClick,
  hasHabitMetWeeklyGoal,
  currentDate,
  calendarEntries,
  hoveredHabitId,
  patternType = 'bokeh'
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
  
  // Track leaving state for exit animation
  const [isLeaving, setIsLeaving] = useState(false);
  const [displayedPositions, setDisplayedPositions] = useState([]);
  const [displayedHabit, setDisplayedHabit] = useState(null);
  const leavingTimerRef = useRef(null);
  
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

  // Calculate streak path and emoji positions when hoveredHabitId changes
  useEffect(() => {
    if (!hoveredHabitId || !gridRef.current) {
      setStreakLines([]);
      setAllEmojiPositions([]);
      return;
    }

    // Small delay to ensure cells are rendered
    const timer = setTimeout(() => {
      const grid = gridRef.current;
      if (!grid) return;

      if (!habits.find(h => h.id === hoveredHabitId)) return;

      const cellsNodeList = grid.querySelectorAll('[data-date]');
      const cells = Array.from(cellsNodeList); // Convert to array for .find() method
      const allCompletedCells = [];

      // Collect ALL completed cells across the entire calendar
      cells.forEach(cell => {
        const date = cell.getAttribute('data-date');
        const completed = getCompletedHabits(date);
        
        if (completed.includes(hoveredHabitId)) {
          const rect = cell.getBoundingClientRect();
          const gridRect = grid.getBoundingClientRect();
          const emojiElement = cell.querySelector(`[data-habit-id="${hoveredHabitId}"]`);

          const centerX = rect.left - gridRect.left + rect.width / 2;
          const centerY = rect.top - gridRect.top + rect.height / 2;

          let emojiX = centerX;
          let emojiY = centerY;

          if (emojiElement) {
            const emojiRect = emojiElement.getBoundingClientRect();
            emojiX = emojiRect.left - gridRect.left + emojiRect.width / 2;
            emojiY = emojiRect.top - gridRect.top + emojiRect.height / 2;
          }
          
          allCompletedCells.push({
            date,
            // Keep streak lines horizontally centered within the day cell.
            x: centerX,
            y: centerY,
            // Preserve original emoji position for a center-seeking hover animation.
            fromX: emojiX,
            fromY: emojiY,
          });
        }
      });

      // Set emoji positions for mask and overlay
      setAllEmojiPositions(allCompletedCells);
      
      // Group completed cells by week (based on calendar matrix structure)
      const weekGroups = {};
      
      // Map each date to its week index using calendar matrix
      calendarMatrix.forEach((week, weekIndex) => {
        week.forEach(day => {
          const completedInThisDay = allCompletedCells.find(cell => cell.date === day.date);
          if (completedInThisDay) {
            if (!weekGroups[weekIndex]) {
              weekGroups[weekIndex] = [];
            }
            weekGroups[weekIndex].push(completedInThisDay);
          }
        });
      });

      // Helper to get day index within a week (0=Sun, 6=Sat)
      const getDayIndexInWeek = (date, weekIdx) => {
        return calendarMatrix[weekIdx]?.findIndex(day => day.date === date) ?? -1;
      };

      // Create separate line segments for each week with 2+ completions
      const weeklyStreakLines = [];
      const weekIndices = Object.keys(weekGroups).map(Number).sort((a, b) => a - b);
      
      weekIndices.forEach((weekIdx) => {
        const weekCells = weekGroups[weekIdx];
        if (weekCells.length >= 2) {
          // Sort cells within the week by day (left to right)
          weekCells.sort((a, b) => {
            const aDay = getDayIndexInWeek(a.date, weekIdx);
            const bDay = getDayIndexInWeek(b.date, weekIdx);
            return aDay - bDay;
          });
          
          // Clone points so we can modify them
          const adjustedPoints = weekCells.map(p => ({ ...p }));
          
          // Check if last point is Saturday (index 6)
          const lastPoint = adjustedPoints[adjustedPoints.length - 1];
          const lastDayIdx = getDayIndexInWeek(lastPoint.date, weekIdx);
          
          // Check if next week exists and starts with Sunday
          const nextWeekCells = weekGroups[weekIdx + 1];
          const nextWeekHasSunday = nextWeekCells?.some(cell => {
            return getDayIndexInWeek(cell.date, weekIdx + 1) === 0;
          });
          
          // If Saturday and next week has Sunday, extend to right edge
          if (lastDayIdx === 6 && nextWeekHasSunday) {
            try {
              const saturdayCell = cells.find(cell => cell.getAttribute('data-date') === lastPoint.date);
              if (saturdayCell) {
                const rect = saturdayCell.getBoundingClientRect();
                const gridRect = grid.getBoundingClientRect();
                lastPoint.x = rect.right - gridRect.left - 12; // Right edge with small padding
              }
            } catch (e) {
              console.warn('Could not extend Saturday line:', e);
            }
          }
          
          // Check if first point is Sunday (index 0)
          const firstPoint = adjustedPoints[0];
          const firstDayIdx = getDayIndexInWeek(firstPoint.date, weekIdx);
          
          // Check if previous week exists and ends with Saturday
          const prevWeekCells = weekGroups[weekIdx - 1];
          const prevWeekHasSaturday = prevWeekCells?.some(cell => {
            return getDayIndexInWeek(cell.date, weekIdx - 1) === 6;
          });
          
          // If Sunday and previous week has Saturday, start from left edge
          if (firstDayIdx === 0 && prevWeekHasSaturday) {
            try {
              const sundayCell = cells.find(cell => cell.getAttribute('data-date') === firstPoint.date);
              if (sundayCell) {
                const rect = sundayCell.getBoundingClientRect();
                const gridRect = grid.getBoundingClientRect();
                firstPoint.x = rect.left - gridRect.left + 12; // Left edge with small padding
              }
            } catch (e) {
              console.warn('Could not extend Sunday line:', e);
            }
          }
          
          // Calculate path length for this week
          let weekLength = 0;
          for (let i = 0; i < adjustedPoints.length - 1; i++) {
            const dx = adjustedPoints[i + 1].x - adjustedPoints[i].x;
            const dy = adjustedPoints[i + 1].y - adjustedPoints[i].y;
            weekLength += Math.sqrt(dx * dx + dy * dy);
          }
          
          weeklyStreakLines.push({
            points: adjustedPoints,
            length: weekLength,
            weekIndex: weekIdx
          });
        }
      });

      // Debug: Log weekly line segments
      if (weeklyStreakLines.length > 0) {
        console.log('Weekly streak lines:', weeklyStreakLines.map(line => ({
          week: line.weekIndex,
          points: line.points.length,
          dates: line.points.map(p => p.date)
        })));
      }
      
      setStreakLines(weeklyStreakLines);
    }, 50);

    return () => clearTimeout(timer);
  }, [hoveredHabitId, getCompletedHabits, calendarMatrix, habits]);

  return (
    <div className={styles.calendarGrid} ref={gridRef}>
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
          {streakLines.map((path, index) => {
            const pointsStr = path.points.map(p => `${p.x},${p.y}`).join(' ');
            // Scale animation duration based on path length (longer path = slightly longer animation)
            // Min 0.3s, max 0.8s for quicker feel since we're staggering
            const animDuration = Math.min(0.8, Math.max(0.3, path.length / 800));
            
            // Calculate stagger delay - each week starts after previous ones complete
            let staggerDelay = 0;
            for (let i = 0; i < index; i++) {
              const prevDuration = Math.min(0.8, Math.max(0.3, streakLines[i].length / 800));
              staggerDelay += prevDuration;
            }
            
            return (
              <g key={`${hoveredHabitId}-${path.weekIndex}`}>
                {/* Background line for contrast */}
                <polyline
                  points={pointsStr}
                  fill="none"
                  stroke="rgba(0,0,0,0.3)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={styles.streakLineBg}
                  style={{ 
                    '--line-length': path.length, 
                    '--anim-duration': `${animDuration}s`,
                    '--anim-delay': `${staggerDelay}s`
                  }}
                />
                {/* Outer glow effect */}
                <polyline
                  points={pointsStr}
                  fill="none"
                  stroke={hoveredHabit.color}
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.4"
                  filter="url(#glow)"
                  className={styles.streakLineGlow}
                  style={{ 
                    '--line-length': path.length, 
                    '--anim-duration': `${animDuration}s`,
                    '--anim-delay': `${staggerDelay}s`
                  }}
                />
                {/* Main line */}
                <polyline
                  points={pointsStr}
                  fill="none"
                  stroke={hoveredHabit.color}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={styles.streakLine}
                  style={{ 
                    '--line-length': path.length, 
                    '--anim-duration': `${animDuration}s`,
                    '--anim-delay': `${staggerDelay}s`
                  }}
                />
              </g>
            );
          })}
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
              const shouldAnimatePatterns = completedHabits.length > 0;
              
              return (
                <CalendarCell
                  key={day.date}
                  day={day}
                  gridRow={weekIndex}
                  gridCol={dayIndex}
                  habits={habits}
                  patternConfig={patternConfig}
                  completedHabits={completedHabits}
                  onHabitToggle={onHabitToggle}
                  onHabitDetailClick={onHabitDetailClick}
                  onDayClick={onDayClick}
                  onDayHabitsClick={onDayHabitsClick}
                  hasHabitMetWeeklyGoal={hasHabitMetWeeklyGoal}
                  isCurrentMonth={day.isCurrentMonth}
                  isToday={day.isToday}
                  animationIndex={animationIndex}
                  calendarEntries={calendarEntries}
                  hoveredHabitId={hoveredHabitId}
                  patternType={patternType}
                  isMobile={isMobile}
                  animatePatterns={shouldAnimatePatterns}
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
