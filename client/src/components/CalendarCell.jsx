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

    // Create smoother gradient patterns with overlapping stops
    const gradientVariations = [];
    
    // Helper function to create smooth color transitions
    const createSmoothStops = (colors, method = 'even') => {
      if (method === 'overlapping') {
        return colors.map((color, i) => {
          const basePos = (i / (colors.length - 1)) * 100;
          const spread = 15; // Overlap amount
          const start = Math.max(0, basePos - spread);
          const end = Math.min(100, basePos + spread);
          return `${color} ${start}% ${end}%`;
        }).join(', ');
      } else {
        return colors.join(', ');
      }
    };
    
    // Pattern 1: Smooth diagonal with overlapping stops
    const angle1 = Math.floor(random(45, 315, 1));
    gradientVariations.push(`linear-gradient(${angle1}deg, ${createSmoothStops(colors, 'overlapping')})`);
    
    // Pattern 2: Radial with natural positioning
    const radialX = Math.floor(random(30, 70, 20));
    const radialY = Math.floor(random(30, 70, 21));
    gradientVariations.push(`radial-gradient(ellipse at ${radialX}% ${radialY}%, ${colors.join(', ')})`);
    
    // Pattern 3: Conic with smooth transitions
    const conicAngle = Math.floor(random(0, 360, 30));
    const conicX = Math.floor(random(40, 60, 31));
    const conicY = Math.floor(random(40, 60, 32));
    const smoothConicColors = [...colors, colors[0]]; // Complete the circle smoothly
    gradientVariations.push(`conic-gradient(from ${conicAngle}deg at ${conicX}% ${conicY}%, ${smoothConicColors.join(', ')})`);
    
    // Pattern 4: Layered gradients with transparency based on completion
    const angle2 = Math.floor(random(0, 180, 40));
    const layeredColors = colors.map((color, i) => {
      // Layer opacity scales with base completion, but adds variety between layers
      const layerOpacity = baseOpacity * (0.7 + (0.3 * (i / colors.length)));
      const layerHex = Math.floor(layerOpacity * 255).toString(16).padStart(2, '0');
      return color.includes('#') ? `${color}${layerHex}` : color;
    });
    gradientVariations.push(`linear-gradient(${angle2}deg, ${layeredColors.join(', ')})`);
    
    // Pattern 5: Smooth radial burst with completion-based intensity
    const burstIntensity = baseOpacity * random(0.4, 0.8, 50);
    const burstColors = colors.flatMap(color => [
      color, 
      color.includes('#') ? `${color}${Math.floor(burstIntensity * 255).toString(16).padStart(2, '0')}` : color, 
      color
    ]);
    gradientVariations.push(`radial-gradient(circle at center, ${burstColors.join(', ')})`);
    
    // Pattern 6: Flowing wave pattern
    const waveAngle = Math.floor(random(60, 120, 60));
    const waveColors = colors.map((color, i) => {
      const pos1 = (i / colors.length) * 60;
      const pos2 = pos1 + 40;
      return `${color} ${pos1}% ${pos2}%`;
    });
    gradientVariations.push(`linear-gradient(${waveAngle}deg, ${waveColors.join(', ')})`);

    // Animation parameters - simpler for better performance
    const animationDuration = 3 + random(2, 4, 80); // 3-7s
    const animationDelay = random(0, 2, 81); // 0-2s delay
    const animationDirection = random(0, 1, 82) > 0.5 ? 'alternate' : 'alternate-reverse';
    
    // Simpler animation types that work reliably
    const animationTypes = ['smoothFlow', 'gentlePulse', 'softRotate', 'waveMotion'];
    const animationType = animationTypes[Math.floor(random(0, animationTypes.length, 90))];
    
    // Subtle animation properties
    const scaleVariation = 0.97 + random(0, 0.06, 100); // 0.97-1.03 scale
    const rotationSpeed = 0.8 + random(0, 0.4, 101); // 0.8-1.2 rotation multiplier
    
    return {
      background: gradientVariations[0],
      animation: `${animationType} ${animationDuration.toFixed(1)}s ease-in-out infinite ${animationDirection}`,
      animationDelay: `${animationDelay.toFixed(1)}s`,
      opacity: baseOpacity + 0.2, // Add slight base boost for visibility
      '--gradient0': gradientVariations[0],
      '--gradient1': gradientVariations[1],
      '--gradient2': gradientVariations[2],
      '--gradient3': gradientVariations[3],
      '--gradient4': gradientVariations[4],
      '--gradient5': gradientVariations[5],
      '--scale-variation': scaleVariation,
      '--rotation-speed': rotationSpeed,
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