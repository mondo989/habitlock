import { memo, useMemo } from 'react';
import Tooltip from './Tooltip';
import { getPatternOverrideForHabit } from '../hooks/usePatternConfig';
import { calculateWeeklyCompletions } from '../utils/streakUtils';
import P5PatternBackground, {
  getPatternIdentityForHabit,
  getCrowdedPatternVariant,
  getHabitSeedOffset,
  getPatternIntensityForDay,
} from './P5PatternBackground';
import styles from './CalendarCell.module.scss';

const seededRandom = (seed) => {
  // Better seeded random using mulberry32 algorithm
  let t = seed + 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

const hashString = (str) => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
};

const CalendarCell = ({ 
  day, 
  gridRow = 0,
  gridCol = 0,
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
  hoveredHabitId = null,
  patternType = 'bokeh',
  isPreview = false,
  previewOverrides = null,
  isMobile = false,
  patternOnly = false,
  animatePatterns = true,
}) => {
  const { date } = day;

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

  const dateSeed = useMemo(() => date.split('-').reduce((acc, num) => acc + parseInt(num), 0), [date]);
  const mixedPatternSeed = useMemo(() => {
    if (completedHabitDetails.length === 0) return 0;

    const habitSetKey = completedHabitDetails
      .map((habit) => habit.id)
      .sort()
      .join('|');

    return hashString(habitSetKey);
  }, [completedHabitDetails]);

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

  const mixedPatternLayers = useMemo(() => {
    const intensity = getPatternIntensityForDay(completedHabitDetails.length, habits.length);
    const entranceStepMs = completedHabitDetails.length >= 5 ? 120 : 160;
    const familyCounts = completedHabitDetails.reduce((counts, habit) => {
      const { family } = getPatternIdentityForHabit(habit.id);
      counts[family] = (counts[family] || 0) + 1;
      return counts;
    }, {});
    const familyIndexes = {};

    return completedHabitDetails.map((habit, idx) => {
      const override = previewOverrides?.[habit.id] || getPatternOverrideForHabit(habit, patternConfig);
      const identity = override || getPatternIdentityForHabit(habit.id);
      const collisionIndex = familyIndexes[identity.family] || 0;
      familyIndexes[identity.family] = collisionIndex + 1;
      const continuity = typeof identity.continuity === 'boolean'
        ? identity.continuity
        : identity.family === 'mosaic' && identity.variant === 'triangles';
      const continuitySeed = getHabitSeedOffset(`${habit.id}:${identity.family}:${identity.variant}`);
      const intensityValue = override?.intensity ?? intensity;
      const resolvedVariant = override
        ? identity.variant
        : getCrowdedPatternVariant(
            identity.family,
            identity.variant,
            collisionIndex,
            familyCounts[identity.family]
          );

      return {
        color: habit.color || habitColors[idx],
        habitId: habit.id,
        intensity: intensityValue,
        seed: continuity ? continuitySeed : mixedPatternSeed + getHabitSeedOffset(habit.id),
        patternType: identity.family,
        patternVariant: resolvedVariant,
        continuity,
        worldOffsetX: gridCol,
        worldOffsetY: gridRow,
        entranceDelayMs: idx * (override?.entranceStaggerMs ?? entranceStepMs),
        settings: override ? {
          density: override.density,
          scale: override.scale,
          opacity: override.opacity,
          accentOpacity: override.accentOpacity,
          strokeWeight: override.strokeWeight,
          driftAmount: override.driftAmount,
          animationMode: override.animationMode,
          tileSize: override.tileSize,
          shapeCount: override.shapeCount,
          ringCount: override.ringCount,
          amplitude: override.amplitude,
          lineCount: override.lineCount,
          orbCount: override.orbCount,
          rayCount: override.rayCount,
          pieceCount: override.pieceCount,
          translateX: override.translateX,
          translateY: override.translateY,
          translateZ: override.translateZ,
          rotationDeg: override.rotationDeg,
        } : null,
      };
    });
  }, [completedHabitDetails, habitColors, habits.length, mixedPatternSeed, gridCol, gridRow, patternConfig, previewOverrides]);

  const mixedPatternRenderLayers = useMemo(() => {
    if (mixedPatternLayers.length === 0) return [];

    const layers = mixedPatternLayers.map((layer) => ({ ...layer }));

    if (completedHabitDetails.length === habits.length && habits.length > 0) {
      layers.push({
        habitId: `${date}-celebration`,
        color: habitColors[0] || '#ffffff',
        intensity: 3,
        seed: mixedPatternSeed + 777,
        patternType: 'mosaic',
        patternVariant: 'shards',
        entranceDelayMs: mixedPatternLayers.length * 140,
      });
    }

    return layers;
  }, [mixedPatternLayers, completedHabitDetails.length, habits.length, date, habitColors, mixedPatternSeed]);

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
      onClick={patternOnly ? undefined : handleCellClick}
      data-date={date}
      data-calendar-cell={isPreview ? undefined : 'true'}
    >
      {!patternOnly && (
        <div className={styles.habitOverlay} />
      )}
      
      {/* P5.js generated geometric pattern background */}
      {completedHabitDetails.length > 0 && (
        patternType === 'mixed' ? (
          <P5PatternBackground
            key={`${date}-mixed`}
            patternLayers={mixedPatternRenderLayers}
            seed={mixedPatternSeed}
            className={`${styles.p5Background} ${completedHabitDetails.length === habits.length && habits.length > 0 ? styles.celebrationPattern : ''}`}
            animated={animatePatterns}
          />
        ) : (
          // Single pattern mode: all habits share one pattern
          <P5PatternBackground
            key={`${date}-${patternType}`}
            colors={habitColors}
            seed={dateSeed}
            patternType={patternType}
            className={styles.p5Background}
            animated={animatePatterns}
          />
        )
      )}
      
      {!patternOnly && (
        <Tooltip content={dayNumberTooltipContent} position="top">
          <div className={styles.dayNumber}>
            {day.dayjs.date()}
          </div>
        </Tooltip>
      )}
      
      {!patternOnly && completedHabitDetails.length > 0 && (
        <div className={styles.emojiCanvas}>
          {isMobile ? (
            <div className={styles.mobileLayout} onClick={handleStackedHabitsClick}>
              {completedHabitDetails.slice(0, 4).map((habit) => (
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
                      className={`${styles.floatingEmoji} ${hasMetGoal ? styles.goalMet : ''} ${hoveredHabitId === habit.id ? styles.highlighted : ''}`}
                      style={{ fontSize: `${data.size}rem` }}
                      onClick={(e) => handleHabitClick(e, habit.id)}
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

      {!patternOnly && habits.length > 0 && (
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

const areCompletedHabitsEqual = (prev, next) => {
  if (prev === next) return true;
  if (!prev || !next || prev.length !== next.length) return false;
  for (let index = 0; index < prev.length; index++) {
    if (prev[index] !== next[index]) return false;
  }
  return true;
};

const areEqual = (prevProps, nextProps) => (
  prevProps.day === nextProps.day &&
  prevProps.gridRow === nextProps.gridRow &&
  prevProps.gridCol === nextProps.gridCol &&
  prevProps.habits === nextProps.habits &&
  prevProps.patternConfig === nextProps.patternConfig &&
  areCompletedHabitsEqual(prevProps.completedHabits, nextProps.completedHabits) &&
  prevProps.hasHabitMetWeeklyGoal === nextProps.hasHabitMetWeeklyGoal &&
  prevProps.isCurrentMonth === nextProps.isCurrentMonth &&
  prevProps.isToday === nextProps.isToday &&
  prevProps.animationIndex === nextProps.animationIndex &&
  prevProps.calendarEntries === nextProps.calendarEntries &&
  prevProps.hoveredHabitId === nextProps.hoveredHabitId &&
  prevProps.patternType === nextProps.patternType &&
  prevProps.isPreview === nextProps.isPreview &&
  prevProps.previewOverrides === nextProps.previewOverrides &&
  prevProps.isMobile === nextProps.isMobile &&
  prevProps.patternOnly === nextProps.patternOnly &&
  prevProps.animatePatterns === nextProps.animatePatterns
);

export default memo(CalendarCell, areEqual); 
