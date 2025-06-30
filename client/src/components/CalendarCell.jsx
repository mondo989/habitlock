import { useMemo } from 'react';
import Tooltip from './Tooltip';
import styles from './CalendarCell.module.scss';

const CalendarCell = ({ 
  day, 
  habits, 
  completedHabits, 
  onHabitToggle,
  onHabitDetailClick,
  onDayClick,
  hasHabitMetWeeklyGoal,
  isCurrentMonth = true,
  isToday = false 
}) => {
  const { date } = day;

  // Get habit details for completed habits
  const completedHabitDetails = useMemo(() => {
    return habits.filter(habit => 
      habit && 
      habit.id && 
      completedHabits.includes(habit.id)
    );
  }, [habits, completedHabits]);

  // Generate background gradient for multiple habits
  const backgroundStyle = useMemo(() => {
    if (completedHabitDetails.length === 0) return {};

    if (completedHabitDetails.length === 1) {
      const habit = completedHabitDetails[0];
      const hasMetGoal = hasHabitMetWeeklyGoal(habit.id, date);
      return {
        backgroundColor: hasMetGoal ? habit.color : `${habit.color}40`,
      };
    }

    // Multiple habits - create smooth animated gradients with dynamic opacity
    // Calculate completion percentage for opacity scaling
    const totalHabits = habits.length;
    const completedCount = completedHabitDetails.length;
    const completionPercentage = totalHabits > 0 ? completedCount / totalHabits : 0;
    
    // Base opacity starts lower and scales with completion
    // 30% base opacity, scaling up to 100% when all habits complete
    const baseOpacity = 0.3 + (completionPercentage * 0.7); // 0.3 to 1.0
    
    const colors = completedHabitDetails.map(habit => {
      const hasMetGoal = hasHabitMetWeeklyGoal(habit.id, date);
      // Use the calculated opacity for non-goal habits, full color for goal-met habits
      const opacity = hasMetGoal ? 1.0 : baseOpacity;
      const hexOpacity = Math.floor(opacity * 255).toString(16).padStart(2, '0');
      return hasMetGoal ? habit.color : `${habit.color}${hexOpacity}`;
    });

    // Create a unique hash based on habit combination + date for deterministic randomness
    const habitHash = completedHabitDetails
      .map(h => h.id + h.emoji + h.color)
      .join('')
      .split('')
      .reduce((a, b) => a + b.charCodeAt(0), 0);
    
    const dateHash = date.split('-').reduce((a, b) => a + parseInt(b), 0);
    const combinedHash = habitHash + dateHash;

    // Generate random but deterministic values for this specific combination
    const seed = combinedHash;
    const random = (min, max, offset = 0) => {
      const val = Math.sin(seed + offset) * 10000;
      return min + ((val - Math.floor(val)) * (max - min));
    };

    // Create ultra-smooth gradient blends with seamless color transitions
    const gradientVariations = [];
    
    // Helper function to create perfectly smooth color transitions with no hard lines
    const createSmoothGradient = (colors, type = 'linear') => {
      if (colors.length === 2) {
        // Two colors: create perfect blend
        const [color1, color2] = colors;
        if (type === 'radial') {
          return `radial-gradient(circle at center, ${color1} 0%, ${color2} 100%)`;
        } else if (type === 'conic') {
          return `conic-gradient(from 0deg at center, ${color1} 0%, ${color2} 50%, ${color1} 100%)`;
        }
        return `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
      }
      
      // Multiple colors: create seamless transitions with natural spacing
      const step = 100 / (colors.length - 1);
      const smoothStops = colors.map((color, i) => {
        const position = i * step;
        return `${color} ${position}%`;
      }).join(', ');
      
      if (type === 'radial') {
        const centerX = Math.floor(random(40, 60, 20));
        const centerY = Math.floor(random(40, 60, 21));
        return `radial-gradient(ellipse 150% 120% at ${centerX}% ${centerY}%, ${smoothStops})`;
      } else if (type === 'conic') {
        // For conic, add the first color at the end to create seamless loop
        const conicStops = [...colors, colors[0]];
        const conicStep = 100 / (conicStops.length - 1);
        const conicSmoothStops = conicStops.map((color, i) => {
          const position = i * conicStep;
          return `${color} ${position}%`;
        }).join(', ');
        return `conic-gradient(from ${Math.floor(random(0, 360, 30))}deg at center, ${conicSmoothStops})`;
      }
      
      const angle = Math.floor(random(45, 135, 1));
      return `linear-gradient(${angle}deg, ${smoothStops})`;
    };
    
    // Pattern 1: Smooth linear gradient with natural angle
    gradientVariations.push(createSmoothGradient(colors, 'linear'));
    
    // Pattern 2: Soft radial gradient with natural positioning
    gradientVariations.push(createSmoothGradient(colors, 'radial'));
    
    // Pattern 3: Gentle conic gradient with seamless color loop
    gradientVariations.push(createSmoothGradient(colors, 'conic'));
    
    // Pattern 4: Layered gradient with transparency blend
    const layeredAngle = Math.floor(random(90, 270, 40));
    const layeredColors = colors.map((color, i) => {
      const position = (i / (colors.length - 1)) * 100;
      const opacity = baseOpacity * (0.6 + (0.4 * (i / colors.length)));
      const hexOpacity = Math.floor(opacity * 255).toString(16).padStart(2, '0');
      const transparentColor = color.includes('#') ? `${color}${hexOpacity}` : color;
      return `${transparentColor} ${position}%`;
    }).join(', ');
    gradientVariations.push(`linear-gradient(${layeredAngle}deg, ${layeredColors})`);
    
    // Pattern 5: Soft multi-point radial with natural blending
    const multiRadialX = Math.floor(random(25, 75, 50));
    const multiRadialY = Math.floor(random(25, 75, 51));
    const multiRadialColors = colors.map((color, i) => {
      const position = (i / (colors.length - 1)) * 80; // Use 80% to ensure smooth falloff
      return `${color} ${position}%`;
    }).join(', ');
    gradientVariations.push(`radial-gradient(circle at ${multiRadialX}% ${multiRadialY}%, ${multiRadialColors})`);

    // Choose a single primary gradient pattern that's most pleasing
    const primaryPattern = Math.floor(random(0, 3, 90)); // Focus on first 3 patterns
    const selectedGradient = gradientVariations[primaryPattern];
    
    // Create subtle animation parameters
    const animationDuration = 4 + random(2, 6, 80); // 4-10s for gentle movement
    const animationDelay = random(0, 3, 81); // 0-3s stagger
    
    // Use only the smoothest animation types
    const smoothAnimations = ['smoothFlow', 'gentlePulse'];
    const animationType = smoothAnimations[Math.floor(random(0, smoothAnimations.length, 90))];
    
    // Very subtle animation properties to avoid jarring transitions
    const scaleVariation = 0.98 + random(0, 0.04, 100); // 0.98-1.02 scale
    
    return {
      background: selectedGradient,
      animation: `${animationType} ${animationDuration.toFixed(1)}s ease-in-out infinite alternate`,
      animationDelay: `${animationDelay.toFixed(1)}s`,
      opacity: Math.min(baseOpacity + 0.3, 1.0), // Boost visibility but cap at 100%
      willChange: 'background, transform',
      '--gradient0': gradientVariations[0],
      '--gradient1': gradientVariations[1],
      '--gradient2': gradientVariations[2],
      '--gradient3': gradientVariations[3],
      '--gradient4': gradientVariations[4],
      '--scale-variation': scaleVariation,
      '--animation-seed': (combinedHash % 1000) / 1000,
    };
  }, [completedHabitDetails, hasHabitMetWeeklyGoal, date]);

  // Generate tooltip content for day number
  const dayNumberTooltipContent = useMemo(() => {
    // For empty cells, show the manage habits message
    if (completedHabitDetails.length === 0) {
      return (
        <div>
          <div className={styles.tooltipDate}>{day.dayjs.format('MMM D, YYYY')}</div>
          <div>Click to manage habits</div>
        </div>
      );
    }
    
    // For cells with habits, just show the date
    return (
      <div>
        <div className={styles.tooltipDate}>{day.dayjs.format('MMM D, YYYY')}</div>
      </div>
    );
  }, [completedHabitDetails, day]);

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

  return (
    <div
      className={`
        ${styles.calendarCell}
        ${!isCurrentMonth ? styles.otherMonth : ''}
        ${isToday ? styles.today : ''}
        ${completedHabitDetails.length > 0 ? styles.hasCompletions : ''}
        ${completedHabitDetails.length > 1 ? styles.animatedGradient : ''}
      `}
      style={backgroundStyle}
      onClick={handleCellClick}
    >
      <div className={styles.dayNumber}>
        <Tooltip content={dayNumberTooltipContent} position="top">
          <span>
            {day.dayjs.date()}
          </span>
        </Tooltip>
      </div>
      
      {completedHabitDetails.length > 0 && (
        <div className={styles.habitEmojis}>
          {completedHabitDetails.map(habit => {
            const hasMetGoal = hasHabitMetWeeklyGoal(habit.id, date);
            
            // Individual tooltip content for each emoji
            const emojiTooltipContent = (
              <div>
                <div className={styles.tooltipDate}>{day.dayjs.format('MMM D, YYYY')}</div>
                <div className={styles.tooltipHabit}>
                  <span className={styles.tooltipEmoji}>{habit.emoji}</span>
                  <span className={styles.tooltipName}>{habit.name}</span>
                  {hasMetGoal && <span className={styles.goalMet}>🎯 Goal met!</span>}
                </div>
                <div style={{ marginTop: '4px', fontSize: '0.75rem', opacity: 0.8 }}>
                  Click to view stats
                </div>
              </div>
            );
            
            return (
              <Tooltip key={habit.id} content={emojiTooltipContent} position="top">
                <span
                  className={`
                    ${styles.habitEmoji}
                    ${hasMetGoal ? styles.glowing : ''}
                  `}
                  onClick={(e) => handleHabitClick(e, habit.id)}
                >
                  {habit.emoji}
                </span>
              </Tooltip>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CalendarCell; 