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
      const bridgeLines = []; // For Saturday → Sunday connections
      
      Object.entries(weekGroups).forEach(([weekIndex, weekCells]) => {
        if (weekCells.length >= 2) {
          // Sort cells within the week by day (left to right)
          weekCells.sort((a, b) => {
            const aDay = calendarMatrix[parseInt(weekIndex)].findIndex(day => day.date === a.date);
            const bDay = calendarMatrix[parseInt(weekIndex)].findIndex(day => day.date === b.date);
            return aDay - bDay;
          });
          
          const weekIdx = parseInt(weekIndex);
          let adjustedPoints = [...weekCells];
          
          // Check for Saturday completion in this week
          const saturdayCompletion = weekCells.find(cell => {
            const dayIndex = calendarMatrix[weekIdx].findIndex(day => day.date === cell.date);
            return dayIndex === 6; // Saturday is index 6
          });
          
          // Check for Sunday completion in next week
          const nextWeekCells = weekGroups[weekIdx + 1];
          const sundayCompletion = nextWeekCells?.find(cell => {
            const dayIndex = calendarMatrix[weekIdx + 1]?.findIndex(day => day.date === cell.date);
            return dayIndex === 0; // Sunday is index 0
          });
          
          // If both Saturday and Sunday have completions, extend Saturday line to right edge
          if (saturdayCompletion && sundayCompletion) {
            const saturdayCell = cells.find(cell => cell.getAttribute('data-date') === saturdayCompletion.date);
            if (saturdayCell) {
              const rect = saturdayCell.getBoundingClientRect();
              const gridRect = grid.getBoundingClientRect();
              
              // Extend to right edge of Saturday cell
              const rightEdgeX = rect.right - gridRect.left - 8; // Account for canvas inset
              const rightEdgeY = saturdayCompletion.y;
              
              // Replace Saturday point with right edge point
              const saturdayIndex = adjustedPoints.findIndex(p => p.date === saturdayCompletion.date);
              if (saturdayIndex !== -1) {
                adjustedPoints[saturdayIndex] = {
                  ...saturdayCompletion,
                  x: rightEdgeX,
                  y: rightEdgeY
                };
              }
              
              // Create bridge line from Saturday right edge to Sunday left edge
              const sundayCell = cells.find(cell => cell.getAttribute('data-date') === sundayCompletion.date);
              if (sundayCell) {
                const sundayRect = sundayCell.getBoundingClientRect();
                const leftEdgeX = sundayRect.left - gridRect.left + 8; // Account for canvas inset
                const leftEdgeY = sundayCompletion.y;
                
                bridgeLines.push({
                  points: [
                    { x: rightEdgeX, y: rightEdgeY },
                    { x: leftEdgeX, y: leftEdgeY }
                  ],
                  length: Math.sqrt((leftEdgeX - rightEdgeX) ** 2 + (leftEdgeY - rightEdgeY) ** 2),
                  weekIndex: weekIdx,
                  type: 'bridge'
                });
              }
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
      
      // Handle Sunday lines that should start from left edge
      Object.entries(weekGroups).forEach(([weekIndex, weekCells]) => {
        if (weekCells.length >= 2) {
          const weekIdx = parseInt(weekIndex);
          
          // Check if this week starts with Sunday and previous week ended with Saturday
          const sundayCompletion = weekCells.find(cell => {
            const dayIndex = calendarMatrix[weekIdx].findIndex(day => day.date === cell.date);
            return dayIndex === 0; // Sunday is index 0
          });
          
          const prevWeekCells = weekGroups[weekIdx - 1];
          const prevSaturdayCompletion = prevWeekCells?.find(cell => {
            const dayIndex = calendarMatrix[weekIdx - 1]?.findIndex(day => day.date === cell.date);
            return dayIndex === 6; // Saturday is index 6
          });
          
          if (sundayCompletion && prevSaturdayCompletion) {
            // Find the line for this week and adjust Sunday point to left edge
            const weekLine = weeklyStreakLines.find(line => line.weekIndex === weekIdx);
            if (weekLine) {
              const sundayCell = cells.find(cell => cell.getAttribute('data-date') === sundayCompletion.date);
              if (sundayCell) {
                const rect = sundayCell.getBoundingClientRect();
                const gridRect = grid.getBoundingClientRect();
                
                const leftEdgeX = rect.left - gridRect.left + 8; // Account for canvas inset
                const leftEdgeY = sundayCompletion.y;
                
                // Replace Sunday point with left edge point
                const sundayIndex = weekLine.points.findIndex(p => p.date === sundayCompletion.date);
                if (sundayIndex !== -1) {
                  weekLine.points[sundayIndex] = {
                    ...sundayCompletion,
                    x: leftEdgeX,
                    y: leftEdgeY
                  };
                  
                  // Recalculate length
                  let newLength = 0;
                  for (let i = 0; i < weekLine.points.length - 1; i++) {
                    const dx = weekLine.points[i + 1].x - weekLine.points[i].x;
                    const dy = weekLine.points[i + 1].y - weekLine.points[i].y;
                    newLength += Math.sqrt(dx * dx + dy * dy);
                  }
                  weekLine.length = newLength;
                }
              }
            }
          }
        }
      });

      // Combine weekly lines and bridge lines
      const allStreakLines = [...weeklyStreakLines, ...bridgeLines];
      
      // Debug: Log weekly line segments
      if (allStreakLines.length > 0) {
        console.log('Streak lines:', allStreakLines.map(line => ({
          week: line.weekIndex,
          type: line.type || 'weekly',
          points: line.points.length,
          dates: line.points.map(p => p.date || 'bridge')
        })));
      }
      
      setStreakLines(allStreakLines);
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
            
            // Calculate stagger delay - each line starts after previous ones complete
            let staggerDelay = 0;
            for (let i = 0; i < index; i++) {
              const prevDuration = Math.min(0.8, Math.max(0.3, streakLines[i].length / 800));
              staggerDelay += prevDuration;
            }
            
            // For bridge lines, add slight additional delay for visual separation
            if (path.type === 'bridge') {
              staggerDelay += 0.1;
            }
            
            return (
              <g key={`${hoveredHabitId}-${path.type || 'week'}-${path.weekIndex}-${index}`}>
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