// CalendarGridCupFill.jsx - Water-like emoji cup fill
// Emojis tumble and pile up like filling a glass

import { useMemo, useState, useEffect } from 'react';
import styles from './CalendarGridCupFill.module.scss';

const MAX_EMOJIS_PER_DAY = 24;
const EMOJIS_PER_HABIT = 8;

// Seeded random for consistent positions
const seededRandom = (seed, i) => {
  const x = Math.sin(seed + i * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

// Convert hex to RGB
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 59, g: 130, b: 246 }; // fallback blue
};

// Generate liquid blend style based on completed habit colors
const generateLiquidBlend = (completedDetails, completionRatio, seed) => {
  if (completedDetails.length === 0) return null;
  
  const colors = completedDetails
    .map(h => h.color || '#3b82f6')
    .filter((c, i, arr) => arr.indexOf(c) === i); // unique colors
  
  // Calculate fill height based on completion ratio (40% to 100%)
  const fillHeight = 40 + completionRatio * 60;
  
  // Calculate opacity based on number of completions (more = richer)
  const baseOpacity = 0.35 + Math.min(completedDetails.length * 0.12, 0.45);
  
  if (colors.length === 1) {
    // Single color - rich bottom-to-top gradient
    const rgb = hexToRgb(colors[0]);
    return {
      background: `linear-gradient(to top, 
        rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${baseOpacity}) 0%, 
        rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${baseOpacity * 0.8}) 30%,
        rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${baseOpacity * 0.5}) 60%, 
        rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${baseOpacity * 0.2}) 85%,
        rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0) 100%)`,
      fillHeight
    };
  }
  
  if (colors.length === 2) {
    // Two colors - diagonal blend like mixing liquids
    const rgb1 = hexToRgb(colors[0]);
    const rgb2 = hexToRgb(colors[1]);
    const angle = 135 + seededRandom(seed, 777) * 45; // 135-180 degrees
    return {
      background: `
        linear-gradient(to top, 
          transparent 0%,
          rgba(0, 0, 0, 0.1) 90%,
          rgba(0, 0, 0, 0.3) 100%),
        linear-gradient(${angle}deg, 
          rgba(${rgb1.r}, ${rgb1.g}, ${rgb1.b}, ${baseOpacity}) 0%, 
          rgba(${rgb1.r}, ${rgb1.g}, ${rgb1.b}, ${baseOpacity * 0.6}) 30%,
          rgba(${rgb2.r}, ${rgb2.g}, ${rgb2.b}, ${baseOpacity * 0.6}) 70%,
          rgba(${rgb2.r}, ${rgb2.g}, ${rgb2.b}, ${baseOpacity}) 100%)`,
      fillHeight
    };
  }
  
  // 3+ colors - radial "potion" blend with swirling colors
  const rgbs = colors.slice(0, 4).map(hexToRgb); // max 4 colors
  const stops = rgbs.map((rgb, i) => {
    const angle = (360 / rgbs.length) * i + seededRandom(seed, i * 100) * 30;
    const dist = 50 + seededRandom(seed, i * 200) * 40;
    return { rgb, angle, dist };
  });
  
  // Create multiple overlapping radial gradients for a swirling potion effect
  const gradients = stops.map((stop, i) => {
    const x = 50 + Math.cos(stop.angle * Math.PI / 180) * 30;
    const y = 60 + Math.sin(stop.angle * Math.PI / 180) * 25;
    return `radial-gradient(ellipse at ${x}% ${y}%, 
      rgba(${stop.rgb.r}, ${stop.rgb.g}, ${stop.rgb.b}, ${baseOpacity}) 0%, 
      rgba(${stop.rgb.r}, ${stop.rgb.g}, ${stop.rgb.b}, ${baseOpacity * 0.4}) 40%,
      transparent ${stop.dist}%)`;
  });
  
  // Add subtle top fade for depth
  gradients.unshift(`linear-gradient(to top, transparent 0%, rgba(0, 0, 0, 0.15) 85%, rgba(0, 0, 0, 0.3) 100%)`);
  
  return {
    background: gradients.join(', '),
    fillHeight
  };
};

// Generate emojis for completed habits - SHUFFLED for natural mix
// 1-2 emojis per habit are marked as "large" for visual hierarchy
const generateCupEmojis = (completedDetails, seed) => {
  if (completedDetails.length === 0) return [];
  
  const emojis = [];
  
  completedDetails.forEach((habit, habitIdx) => {
    // Decide how many large emojis for this habit (1 or 2)
    const largeCount = seededRandom(seed, habitIdx * 777) > 0.65 ? 2 : 1;
    
    for (let i = 0; i < EMOJIS_PER_HABIT; i++) {
      emojis.push({ 
        emoji: habit.emoji,
        isLarge: i < largeCount // First 1-2 emojis of each habit are large
      });
    }
  });
  
  // Shuffle emojis so different types are mixed together
  const shuffled = emojis.slice(0, MAX_EMOJIS_PER_DAY);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed, i + 999) * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
};

// Generate positions - most emojis pile on the ground, few float higher
const generateWaterPositions = (count, seed, completionRatio = 0) => {
  const positions = [];
  
  // Max height scales with completion ratio (25% base, up to 55% at full completion)
  const maxHeight = 25 + completionRatio * 30;
  
  for (let i = 0; i < count; i++) {
    // Random X across full width
    const x = 6 + seededRandom(seed, i) * 88; // 6% to 94%
    
    // Most emojis (85%) pile at the very bottom (0-12%)
    // Some (15%) can float higher based on completion ratio
    const rand = seededRandom(seed, i + 50);
    let bottom;
    
    if (rand < 0.85) {
      // Ground pile - tight cluster at bottom
      bottom = 2 + seededRandom(seed, i + 100) * 10; // 2% to 12%
    } else {
      // Floaters - can go higher based on completion
      bottom = 10 + seededRandom(seed, i + 150) * (maxHeight - 10);
    }
    
    // Random rotation for tumbled look
    const rotation = (seededRandom(seed, i + 200) - 0.5) * 55;
    
    // Tumbling spin during fall (reduced range for performance)
    const spinAmount = 180 + seededRandom(seed, i + 300) * 360;
    const spinDirection = seededRandom(seed, i + 400) > 0.5 ? 1 : -1;
    
    // Drop in order - earlier indices fall first
    const delay = i * 0.02 + seededRandom(seed, i + 500) * 0.015;
    
    positions.push({ 
      x, 
      bottom, 
      rotation, 
      delay,
      spin: spinAmount * spinDirection,
    });
  }
  
  return positions;
};

const CalendarGridCupFill = ({ 
  calendarMatrix, 
  habits, 
  getCompletedHabits, 
  onDayClick,
  calendarEntries 
}) => {
  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const [visibleDays, setVisibleDays] = useState(new Set());
  const [currentMonth, setCurrentMonth] = useState(null);
  const [animationKeys, setAnimationKeys] = useState({}); // Track re-animation triggers

  // Track current month to detect month changes
  const monthKey = calendarMatrix[0]?.[0]?.date?.slice(0, 7);

  // Reset only when month changes
  useEffect(() => {
    if (monthKey && monthKey !== currentMonth) {
      setCurrentMonth(monthKey);
      setVisibleDays(new Set());
      setAnimationKeys({});
    }
  }, [monthKey, currentMonth]);

  // Track completion counts to detect changes
  const completionCounts = useMemo(() => {
    const counts = {};
    calendarMatrix.forEach((week) => {
      week.forEach((day) => {
        const completed = getCompletedHabits(day.date);
        counts[day.date] = completed.length;
      });
    });
    return counts;
  }, [calendarMatrix, getCompletedHabits]);

  const habitMap = useMemo(() => {
    return new Map(habits.map((habit) => [habit.id, habit]));
  }, [habits]);

  const dayRenderData = useMemo(() => {
    return calendarMatrix.map((week) =>
      week.map((day) => {
        const completedHabits = calendarEntries[day.date]?.completedHabits || [];
        const completedDetails = completedHabits
          .map((habitId) => habitMap.get(habitId))
          .filter(Boolean);
        const hasCompletions = completedDetails.length > 0;
        const completionRatio = habits.length > 0 ? completedDetails.length / habits.length : 0;
        const dateSeed = day.date.split('-').reduce((a, b) => a + parseInt(b, 10), 0);
        const uniqueColorCount = new Set(completedDetails.map((habit) => habit.color || '#3b82f6')).size;

        const displayEmojis = hasCompletions ? generateCupEmojis(completedDetails, dateSeed) : [];
        const positions = hasCompletions ? generateWaterPositions(displayEmojis.length, dateSeed, completionRatio) : [];
        const liquidBlend = hasCompletions ? generateLiquidBlend(completedDetails, completionRatio, dateSeed) : null;

        return {
          day,
          completedDetails,
          hasCompletions,
          completionRatio,
          dateSeed,
          uniqueColorCount,
          displayEmojis,
          positions,
          liquidBlend,
          isPerfectDay: habits.length > 0 && completionRatio >= 1,
        };
      })
    );
  }, [calendarMatrix, calendarEntries, habitMap, habits.length]);

  // Animate only NEW days or days with changed completions
  useEffect(() => {
    const timeoutIds = [];
    
    const daysWithCompletions = [];
    calendarMatrix.forEach((week) => {
      week.forEach((day) => {
        if (getCompletedHabits(day.date).length > 0) {
          daysWithCompletions.push(day.date);
        }
      });
    });

    // Find days that need to be revealed (not already visible)
    const newDays = daysWithCompletions.filter(date => !visibleDays.has(date));
    
    // Reveal only new days - instantly if it's a single update, sequentially on initial load
    if (newDays.length === 1) {
      // Single day update - show immediately
      setVisibleDays(prev => new Set([...prev, newDays[0]]));
    } else if (newDays.length > 1) {
      // Multiple new days (initial load) - reveal sequentially
      newDays.forEach((date, idx) => {
        const id = setTimeout(() => {
          setVisibleDays(prev => new Set([...prev, date]));
        }, idx * 100);
        timeoutIds.push(id);
      });
    }

    // Update animation keys for days that changed completion count
    setAnimationKeys(prev => {
      const next = { ...prev };
      Object.entries(completionCounts).forEach(([date, count]) => {
        const prevCount = prev[date]?.count;
        if (prevCount !== undefined && prevCount !== count) {
          // Completion count changed - trigger re-animation
          next[date] = { count, key: (prev[date]?.key || 0) + 1 };
        } else if (prevCount === undefined) {
          next[date] = { count, key: 0 };
        }
      });
      return next;
    });

    // Cleanup: clear all pending timeouts on unmount or re-run
    return () => {
      timeoutIds.forEach(clearTimeout);
    };
  }, [calendarMatrix, getCompletedHabits, calendarEntries, completionCounts]);

  const totalCompletions = useMemo(() => {
    return Object.values(calendarEntries).reduce((acc, entry) => {
      return acc + (entry?.completedHabits?.length || 0);
    }, 0);
  }, [calendarEntries]);

  return (
    <div className={styles.cupFillCalendar}>
      <div className={styles.dayHeaders}>
        {dayHeaders.map((day, idx) => (
          <div key={idx} className={styles.dayHeader}>
            {day}
          </div>
        ))}
      </div>

      <div className={styles.calendarBody}>
        {dayRenderData.map((week, weekIndex) => (
          <div key={weekIndex} className={styles.week}>
            {week.map(({ day, hasCompletions, completionRatio, dateSeed, displayEmojis, positions, liquidBlend, uniqueColorCount, isPerfectDay }) => {
              const isVisible = visibleDays.has(day.date);
              const animKey = animationKeys[day.date]?.key || 0;

              return (
                <div
                  key={day.date}
                  className={`
                    ${styles.dayCell}
                    ${!day.isCurrentMonth ? styles.otherMonth : ''}
                    ${day.isToday ? styles.today : ''}
                    ${hasCompletions ? styles.hasActivity : ''}
                    ${uniqueColorCount >= 3 ? styles.potionBrew : ''}
                    ${isPerfectDay ? styles.perfectDay : ''}
                  `}
                  onClick={() => onDayClick(day.date, day)}
                >
                  <div className={styles.dayInner}>
                    {/* Liquid blend background layer */}
                    {hasCompletions && isVisible && liquidBlend && (
                      <div 
                        key={`liquid-${day.date}-${animKey}`}
                        className={`${styles.liquidBlend} ${uniqueColorCount >= 2 ? styles.multiColor : ''}`}
                        style={{ 
                          background: liquidBlend.background,
                          '--fill-height': `${liquidBlend.fillHeight}%`,
                          '--color-count': uniqueColorCount
                        }}
                      />
                    )}
                    
                    <span className={`${styles.dayNumber} ${day.isToday ? styles.todayNumber : ''} ${isPerfectDay ? styles.perfectDayNumber : ''}`}>
                      {isPerfectDay && <span className={styles.crownEmoji}>👑</span>}
                      {day.dayjs.date()}
                    </span>
                    
                    {hasCompletions && isVisible && (
                      <div key={`cup-${day.date}-${animKey}`} className={styles.cupContainer}>
                        {displayEmojis.map((item, idx) => {
                          const pos = positions[idx];
                          // Randomize animation duration for organic feel
                          const animDuration = 1.2 + seededRandom(dateSeed, idx + 800) * 0.8; // 1.2-2s
                          
                          return (
                            <span
                              key={idx}
                              className={`${styles.emoji} ${item.isLarge ? styles.emojiLarge : ''}`}
                              style={{
                                '--x': `${pos.x}%`,
                                '--bottom': `${pos.bottom}%`,
                                '--rotation': `${pos.rotation}deg`,
                                '--delay': `${pos.delay}s`,
                                '--z': item.isLarge ? 50 + idx : displayEmojis.length - idx,
                                '--spin': `${pos.spin}deg`,
                                '--anim-duration': `${animDuration}s`,
                              }}
                            >
                              {item.emoji}
                            </span>
                          );
                        })}
                        
                        {isPerfectDay && (
                          <div className={styles.fullGlow} />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <div className={styles.summaryIcon} style={{ background: 'linear-gradient(135deg, #FF6B6B, #FF8E8E)' }}>
            <span>🫗</span>
          </div>
          <div className={styles.summaryText}>
            <span className={styles.summaryValue}>{habits.length}</span>
            <span className={styles.summaryLabel}>Habits</span>
          </div>
        </div>
        
        <div className={styles.summaryItem}>
          <div className={styles.summaryIcon} style={{ background: 'linear-gradient(135deg, #4ECDC4, #6EE7DE)' }}>
            <span>✨</span>
          </div>
          <div className={styles.summaryText}>
            <span className={styles.summaryValue}>{totalCompletions}</span>
            <span className={styles.summaryLabel}>Drops</span>
          </div>
        </div>
        
        <div className={styles.summaryItem}>
          <div className={styles.summaryIcon} style={{ background: 'linear-gradient(135deg, #A78BFA, #C4B5FD)' }}>
            <span>🏆</span>
          </div>
          <div className={styles.summaryText}>
            <span className={styles.summaryValue}>{Object.keys(calendarEntries).length}</span>
            <span className={styles.summaryLabel}>Days Filled</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarGridCupFill;
