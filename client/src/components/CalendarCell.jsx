import { useMemo, useState, useEffect, useRef } from 'react';
import Tooltip from './Tooltip';
import { calculateWeeklyCompletions } from '../utils/streakUtils';
import P5PatternBackground, { getPatternForHabit, getHabitSeedOffset } from './P5PatternBackground';
import styles from './CalendarCell.module.scss';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);
  
  return isMobile;
};

const seededRandom = (seed) => {
  // Better seeded random using mulberry32 algorithm
  let t = seed + 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  
  return prefersReducedMotion;
};

const BouncingEmoji = ({ habit, initialPosPercent, size, hasMetGoal, onHabitClick, tooltipContent, dateSeed, index, isHighlighted }) => {
  // Generate unique animation parameters based on seed
  const habitIdHash = habit.id.split('').reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1) * 7, 0);
  const seed = dateSeed * 1000 + index * 10000 + habitIdHash;
  
  // Random animation duration between 3-6 seconds
  const duration = 3 + seededRandom(seed) * 3;
  // Random delay so emojis don't all sync up
  const delay = seededRandom(seed + 1) * -duration;
  // Random starting position
  const startX = 10 + seededRandom(seed + 2) * 80;
  const startY = 10 + seededRandom(seed + 3) * 80;
  // Random movement range
  const moveX = 15 + seededRandom(seed + 4) * 25;
  const moveY = 15 + seededRandom(seed + 5) * 25;
  
  return (
    <Tooltip content={tooltipContent} position="top">
      <span
        className={`${styles.floatingEmoji} ${styles.bouncing} ${hasMetGoal ? styles.goalMet : ''} ${isHighlighted ? styles.highlighted : ''}`}
        style={{
          fontSize: `${size}rem`,
          position: 'absolute',
          left: `${startX}%`,
          top: `${startY}%`,
          '--move-x': `${moveX}%`,
          '--move-y': `${moveY}%`,
          '--duration': `${duration}s`,
          '--delay': `${delay}s`,
        }}
        onClick={(e) => onHabitClick(e, habit.id)}
      >
        {habit.emoji}
      </span>
    </Tooltip>
  );
};

const CalendarCell = ({ 
  day, 
  habits, 
  completedHabits, 
  onHabitToggle,
  onHabitDetailClick,
  onDayClick,
  onDayHabitsClick,
  hasHabitMetWeeklyGoal,
  isCurrentMonth = true,
  isToday = false,
  animationIndex = 0,
  calendarEntries = {},
  hoveredHabitId = null,
  patternType = 'bokeh'
}) => {
  const { date } = day;
  const isMobile = useIsMobile();

  const completedHabitDetails = useMemo(() => {
    return habits.filter(habit => 
      habit && 
      habit.id && 
      completedHabits.includes(habit.id)
    );
  }, [habits, completedHabits]);

  const completionPercentage = useMemo(() => {
    if (habits.length === 0) return 0;
    return (completedHabitDetails.length / habits.length) * 100;
  }, [habits.length, completedHabitDetails.length]);

  const canvasRef = useRef(null);
  const dateSeed = useMemo(() => date.split('-').reduce((acc, num) => acc + parseInt(num), 0), [date]);

  const habitColors = useMemo(() => {
    const defaultColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
    return completedHabitDetails.map((h, i) => h.color || defaultColors[i % defaultColors.length]);
  }, [completedHabitDetails]);
  
  const emojiData = useMemo(() => {
    if (completedHabitDetails.length === 0) return [];
    
    const count = completedHabitDetails.length;
    
    return completedHabitDetails.map((habit, index) => {
      const baseSeed = dateSeed + index * 100 + habit.id.charCodeAt(0);
      
      let size;
      if (count === 1) {
        size = 1.8;
      } else if (count === 2) {
        size = 1.4;
      } else if (count === 3) {
        size = 1.2;
      } else if (count <= 6) {
        size = 1.0 + seededRandom(baseSeed + 2) * 0.3;
      } else {
        size = 0.8 + seededRandom(baseSeed + 2) * 0.3;
      }
      
      return { size };
    });
  }, [completedHabitDetails, dateSeed]);

  const backgroundStyle = useMemo(() => {
    const baseStyle = {
      '--animation-delay': `${animationIndex * 0.02}s`,
      '--completion-percent': `${completionPercentage}%`,
    };

    if (completedHabitDetails.length === 0 || habits.length === 0) {
      return baseStyle;
    }

    const defaultColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
    const colors = completedHabitDetails.map((h, i) => h.color || defaultColors[i % defaultColors.length]);
    
    if (colors.length === 0) {
      return baseStyle;
    }
    
    const completionRatio = completedHabitDetails.length / habits.length;
    
    // Full opacity when any habit is completed
    const baseOpacity = 1;
    
    // Glow intensity increases with completion
    const glowIntensity = Math.pow(completionRatio, 1.5);
    const glowOpacity = 0.1 + glowIntensity * 0.4;
    
    const toHex = (opacity) => Math.round(Math.min(1, Math.max(0, opacity)) * 255).toString(16).padStart(2, '0');
    
    // Helper to lighten color for glow effects
    const lightenColor = (hex, amount) => {
      const num = parseInt(hex.replace('#', ''), 16);
      const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * amount));
      const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * amount));
      const b = Math.min(255, (num & 0xff) + Math.round(255 * amount));
      return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    };
    
    const seed = date.split('-').reduce((acc, num) => acc + parseInt(num), 0);
    const angle1 = Math.floor(seededRandom(seed) * 360);
    const angle2 = (angle1 + 120 + Math.floor(seededRandom(seed + 1) * 60)) % 360;
    const angle3 = (angle2 + 120 + Math.floor(seededRandom(seed + 2) * 60)) % 360;
    
    // Animation speeds up slightly with more completion (more "alive" feeling)
    const animDuration = 12 - (completionRatio * 4);
    const animDelay = Math.floor(seededRandom(seed + 3) * 3);
    
    // Determine completion tier for progressive effects
    const tier = completionRatio >= 1 ? 'complete' 
               : completionRatio >= 0.75 ? 'high' 
               : completionRatio >= 0.5 ? 'medium' 
               : completionRatio >= 0.25 ? 'low' 
               : 'minimal';
    
    // Primary color (most prominent or average)
    const primaryColor = colors[0];
    const secondaryColor = colors[1] || colors[0];
    const tertiaryColor = colors[2] || colors[1] || colors[0];
    
    // Create luminous center glow that intensifies with completion
    const centerGlow = `radial-gradient(ellipse at 50% 50%, ${lightenColor(primaryColor, 0.3)}${toHex(glowOpacity * 0.6)} 0%, transparent 70%)`;
    
    // Ambient color orbs positioned uniquely per date
    const orbs = colors.slice(0, Math.min(5, colors.length)).map((color, i) => {
      const orbSeed = seed + i * 17;
      const x = 15 + seededRandom(orbSeed) * 70;
      const y = 15 + seededRandom(orbSeed + 1) * 70;
      const size = 40 + seededRandom(orbSeed + 2) * 30 + (completionRatio * 20);
      const orbOpacity = baseOpacity * (0.5 + completionRatio * 0.5);
      return `radial-gradient(ellipse ${size}% ${size * 1.2}% at ${x}% ${y}%, ${color}${toHex(orbOpacity)} 0%, ${color}${toHex(orbOpacity * 0.3)} 40%, transparent 70%)`;
    });
    
    // Soft edge glow for depth
    const edgeGlow = `radial-gradient(ellipse at 50% 100%, ${secondaryColor}${toHex(baseOpacity * 0.4)} 0%, transparent 50%)`;
    
    // Aurora-like sweeping gradient (more visible at higher completion)
    const auroraOpacity = baseOpacity * (0.3 + completionRatio * 0.5);
    const aurora = colors.length >= 2 
      ? `linear-gradient(${angle1}deg, ${colors.map((c, i) => `${c}${toHex(auroraOpacity)} ${(i / (colors.length)) * 100}%`).join(', ')}, transparent 100%)`
      : `linear-gradient(${angle1}deg, ${primaryColor}${toHex(auroraOpacity)} 0%, ${lightenColor(primaryColor, 0.2)}${toHex(auroraOpacity * 0.5)} 100%)`;
    
    // Base fill that gives overall tone
    const baseFill = `linear-gradient(180deg, ${primaryColor}${toHex(baseOpacity * 0.3)} 0%, ${secondaryColor}${toHex(baseOpacity * 0.5)} 100%)`;
    
    // High completion adds extra luminosity layers
    const luminosityLayers = tier === 'complete' || tier === 'high' ? [
      `radial-gradient(ellipse at ${30 + seededRandom(seed + 20) * 40}% ${20 + seededRandom(seed + 21) * 30}%, ${lightenColor(primaryColor, 0.4)}${toHex(0.25)} 0%, transparent 40%)`,
      `radial-gradient(ellipse at ${50 + seededRandom(seed + 22) * 30}% ${60 + seededRandom(seed + 23) * 30}%, ${lightenColor(secondaryColor, 0.3)}${toHex(0.2)} 0%, transparent 45%)`,
    ] : [];
    
    // Complete state gets extra celebration glow
    const celebrationGlow = tier === 'complete' ? [
      `radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.15) 0%, transparent 50%)`,
      `radial-gradient(ellipse at 30% 30%, ${lightenColor(primaryColor, 0.5)}${toHex(0.3)} 0%, transparent 40%)`,
    ] : [];
    
    const allLayers = [
      ...celebrationGlow,
      ...luminosityLayers,
      centerGlow,
      ...orbs,
      edgeGlow,
      aurora,
      baseFill,
    ].filter(Boolean);

    return {
      ...baseStyle,
      '--gradient-angle': `${angle1}deg`,
      '--gradient-angle-2': `${angle2}deg`,
      '--gradient-angle-3': `${angle3}deg`,
      '--anim-duration': `${animDuration}s`,
      '--anim-delay': `${animDelay}s`,
      '--glow-intensity': glowIntensity,
      '--completion-tier': tier,
      '--primary-color': primaryColor,
      '--primary-color-light': lightenColor(primaryColor, 0.3),
      background: allLayers.join(', '),
    };
  }, [completedHabitDetails, habits.length, completionPercentage, animationIndex, date]);

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
  }, [completedHabitDetails, habits.length, day]);

  const handleCellClick = (e) => {
    e.preventDefault();
    if (onDayClick) {
      onDayClick(date, day);
    }
  };

  const handleHabitClick = (e, habitId) => {
    e.stopPropagation();
    onHabitDetailClick(habitId);
  };

  const handleStackedHabitsClick = (e) => {
    e.stopPropagation();
    if (onDayHabitsClick) {
      onDayHabitsClick(day);
    }
  };

  // Check if the hovered habit is completed on this day
  const hasHoveredHabit = hoveredHabitId && completedHabitDetails.some(h => h.id === hoveredHabitId);

  return (
    <div
      className={`
        ${styles.calendarCell}
        ${!isCurrentMonth ? styles.otherMonth : ''}
        ${isToday ? styles.today : ''}
        ${completedHabitDetails.length > 0 ? styles.hasCompletions : ''}
        ${completionPercentage === 100 ? styles.allComplete : ''}
        ${hoveredHabitId ? styles.habitHovered : ''}
        ${hasHoveredHabit ? styles.hasHoveredHabit : ''}
      `}
      style={backgroundStyle}
      onClick={handleCellClick}
      data-date={date}
    >
      {/* Overlay for habit hover effect */}
      <div className={styles.habitOverlay} />
      
      {/* P5.js generated geometric pattern background */}
      {completedHabitDetails.length > 0 && (
        patternType === 'mixed' ? (
          <>
            {/* Mixed mode: render each habit with its own pattern type and unique seed */}
            {completedHabitDetails.map((habit, idx) => (
              <P5PatternBackground
                key={`${date}-mixed-${habit.id}`}
                colors={[habit.color || habitColors[idx]]}
                seed={dateSeed + getHabitSeedOffset(habit.id)}
                patternType={getPatternForHabit(habit.id)}
                className={styles.p5Background}
              />
            ))}
            {/* Subtle mosaic celebration overlay when all habits complete */}
            {completedHabitDetails.length === habits.length && habits.length > 0 && (
              <P5PatternBackground
                key={`${date}-mixed-celebration`}
                colors={habitColors}
                seed={dateSeed + 777}
                patternType="mosaic"
                className={`${styles.p5Background} ${styles.celebrationPattern}`}
              />
            )}
          </>
        ) : (
          // Single pattern mode: all habits share one pattern
          <P5PatternBackground
            key={`${date}-${patternType}`}
            colors={habitColors}
            seed={dateSeed}
            patternType={patternType}
            className={styles.p5Background}
          />
        )
      )}
      
      <Tooltip content={dayNumberTooltipContent} position="top">
        <div className={styles.dayNumber}>
          {day.dayjs.date()}
        </div>
      </Tooltip>
      
      {completedHabitDetails.length > 0 && (
        <div className={styles.emojiCanvas} ref={canvasRef}>
          {isMobile ? (
            <div className={styles.mobileLayout} onClick={handleStackedHabitsClick}>
              {completedHabitDetails.slice(0, 4).map((habit, idx) => (
                <span 
                  key={habit.id} 
                  className={`${styles.mobileEmoji} ${hoveredHabitId === habit.id ? styles.highlighted : ''}`}
                  style={{ 
                    fontSize: completedHabitDetails.length > 3 ? '1rem' : '1.2rem'
                  }}
                >
                  {habit.emoji}
                </span>
              ))}
              {completedHabitDetails.length > 4 && (
                <span className={styles.moreCount}>+{completedHabitDetails.length - 4}</span>
              )}
            </div>
          ) : (
            completedHabitDetails.map((habit, index) => {
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
              
              // Create unique seed from habit ID (use multiple characters)
              const habitIdHash = habit.id.split('').reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1) * 7, 0);
              const initialSeed = dateSeed * 1000 + index * 10000 + habitIdHash;
              const initialPosPercent = {
                x: 10 + seededRandom(initialSeed) * 80,
                y: 10 + seededRandom(initialSeed + 99999) * 80
              };
              
              return (
                <BouncingEmoji
                  key={habit.id}
                  habit={habit}
                  initialPosPercent={initialPosPercent}
                  size={data.size}
                  hasMetGoal={hasMetGoal}
                  onHabitClick={handleHabitClick}
                  tooltipContent={emojiTooltipContent}
                  dateSeed={dateSeed}
                  index={index}
                  isHighlighted={hoveredHabitId === habit.id}
                />
              );
            })
          )}
        </div>
      )}

      {habits.length > 0 && (
        <div className={styles.progressMeter}>
          <div className={styles.meterTrack}>
            <div 
              className={styles.meterFill}
              style={{ 
                width: `${completionPercentage}%`,
                background: completedHabitDetails.length > 0 
                  ? completedHabitDetails.length === 1
                    ? completedHabitDetails[0].color
                    : `linear-gradient(90deg, ${completedHabitDetails.map((h, i) => 
                        `${h.color} ${(i / (completedHabitDetails.length - 1)) * 100}%`
                      ).join(', ')})`
                  : 'transparent'
              }}
            />
          </div>
          <span className={styles.taskCount}>
            {completedHabitDetails.length}/{habits.length}
          </span>
        </div>
      )}
    </div>
  );
};

export default CalendarCell; 