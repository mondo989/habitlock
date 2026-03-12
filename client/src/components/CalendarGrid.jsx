import { useRef, useEffect, useState, useMemo } from 'react';
import CalendarCell from './CalendarCell';
import styles from './CalendarGrid.module.scss';

// Seeded random function (same as CalendarCell)
const seededRandom = (seed) => {
  let t = seed + 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

const CalendarGrid = ({ 
  calendarMatrix, 
  habits, 
  getCompletedHabits, 
  onHabitToggle,
  onHabitDetailClick,
  onDayClick,
  onDayHabitsClick,
  hasHabitMetWeeklyGoal,
  currentDate,
  calendarEntries,
  hoveredHabitId
}) => {
  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const gridRef = useRef(null);
  const [streakLines, setStreakLines] = useState([]);

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

      const habit = habits.find(h => h.id === hoveredHabitId);
      if (!habit) return;

      const cells = grid.querySelectorAll('[data-date]');
      const allCompletedCells = [];

      // Collect ALL completed cells across the entire calendar
      cells.forEach(cell => {
        const date = cell.getAttribute('data-date');
        const completed = getCompletedHabits(date);
        
        if (completed.includes(hoveredHabitId)) {
          const rect = cell.getBoundingClientRect();
          const gridRect = grid.getBoundingClientRect();
          
          // The emojiCanvas has inset: 28px 8px 24px (top, horizontal, bottom)
          const canvasTop = 28;
          const canvasLeft = 8;
          const canvasRight = 8;
          const canvasBottom = 24;
          const canvasWidth = rect.width - canvasLeft - canvasRight;
          const canvasHeight = rect.height - canvasTop - canvasBottom;
          
          // Calculate center position (target)
          const centerX = rect.left - gridRect.left + canvasLeft + (canvasWidth * 0.5);
          const centerY = rect.top - gridRect.top + canvasTop + (canvasHeight * 0.5);
          
          // Calculate original position using same seed logic as CalendarCell
          const dateSeed = date.split('-').reduce((acc, num) => acc + parseInt(num), 0);
          const completedHabits = completed;
          const habitIndex = completedHabits.indexOf(hoveredHabitId);
          const habitIdHash = habit.id.split('').reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1) * 7, 0);
          const seed = dateSeed * 1000 + habitIndex * 10000 + habitIdHash;
          
          // Original position as percentage of canvas (same as BouncingEmoji)
          const startXPercent = 10 + seededRandom(seed + 2) * 80;
          const startYPercent = 10 + seededRandom(seed + 3) * 80;
          
          // Convert to absolute position relative to grid
          const originalX = rect.left - gridRect.left + canvasLeft + (canvasWidth * startXPercent / 100);
          const originalY = rect.top - gridRect.top + canvasTop + (canvasHeight * startYPercent / 100);
          
          allCompletedCells.push({
            date,
            x: centerX,
            y: centerY,
            originalX,
            originalY,
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

      // Create separate line segments for each week with 2+ completions
      const weeklyStreakLines = [];
      Object.entries(weekGroups).forEach(([weekIndex, weekCells]) => {
        if (weekCells.length >= 2) {
          // Sort cells within the week by day (left to right)
          weekCells.sort((a, b) => {
            const aDay = calendarMatrix[parseInt(weekIndex)].findIndex(day => day.date === a.date);
            const bDay = calendarMatrix[parseInt(weekIndex)].findIndex(day => day.date === b.date);
            return aDay - bDay;
          });
          
          // Calculate path length for this week
          let weekLength = 0;
          for (let i = 0; i < weekCells.length - 1; i++) {
            const dx = weekCells[i + 1].x - weekCells[i].x;
            const dy = weekCells[i + 1].y - weekCells[i].y;
            weekLength += Math.sqrt(dx * dx + dy * dy);
          }
          
          weeklyStreakLines.push({
            points: weekCells,
            length: weekLength,
            weekIndex: parseInt(weekIndex)
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
                '--original-x': `${pos.originalX}px`,
                '--original-y': `${pos.originalY}px`,
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
      <div className={styles.calendarWeeks}>
        {calendarMatrix.map((week, weekIndex) => (
          <div key={weekIndex} className={styles.calendarWeek} data-week={weekIndex}>
            {week.map((day, dayIndex) => {
              const completedHabits = getCompletedHabits(day.date);
              const animationIndex = weekIndex * 7 + dayIndex;
              
              return (
                <CalendarCell
                  key={day.date}
                  day={day}
                  habits={habits}
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