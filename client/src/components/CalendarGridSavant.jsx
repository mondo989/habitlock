// CalendarGridSavant.jsx - Rule-breaking design by a young savant
// Brutalist-playful, asymmetric, Gen-Z chaos, paradigm-shifting

import { useMemo } from 'react';
import styles from './CalendarGridSavant.module.scss';

const CalendarGridSavant = ({ 
  calendarMatrix, 
  habits, 
  getCompletedHabits, 
  onDayClick,
  hasHabitMetWeeklyGoal,
  calendarEntries 
}) => {
  const dayHeaders = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const getVibeLevel = (completions, total) => {
    if (total === 0) return 0;
    const ratio = completions / total;
    if (ratio >= 1) return 4; // LEGENDARY
    if (ratio >= 0.75) return 3; // FIRE
    if (ratio >= 0.5) return 2; // VIBING
    if (ratio > 0) return 1; // STARTING
    return 0;
  };

  const getRandomRotation = (date) => {
    const hash = date.split('-').reduce((a, b) => a + parseInt(b), 0);
    return ((hash % 7) - 3) * 0.8;
  };

  const getRandomOffset = (date, axis) => {
    const hash = date.split('-').reduce((a, b, i) => a + parseInt(b) * (i + 1), 0);
    return axis === 'x' ? ((hash % 5) - 2) : ((hash % 5) - 2);
  };

  return (
    <div className={styles.savantCalendar}>
      <div className={styles.chaosHeader}>
        <div className={styles.glitchTitle}>
          <span className={styles.titleMain}>habits</span>
          <span className={styles.titleAccent}>.exe</span>
        </div>
        <div className={styles.statusTag}>
          <span className={styles.blink}>●</span> RUNNING
        </div>
      </div>

      <div className={styles.dayHeaders}>
        {dayHeaders.map((day, idx) => (
          <div 
            key={idx} 
            className={styles.dayHeader}
            style={{ '--header-index': idx }}
          >
            {day}
          </div>
        ))}
      </div>

      <div className={styles.calendarMesh}>
        {calendarMatrix.map((week, weekIndex) => (
          <div key={weekIndex} className={styles.weekRow}>
            {week.map((day, dayIndex) => {
              const completedHabits = getCompletedHabits(day.date);
              const completedDetails = habits.filter(h => completedHabits.includes(h.id));
              const hasCompletions = completedDetails.length > 0;
              const vibeLevel = getVibeLevel(completedDetails.length, habits.length);
              const rotation = getRandomRotation(day.date);
              const offsetX = getRandomOffset(day.date, 'x');
              const offsetY = getRandomOffset(day.date, 'y');

              const primaryColor = completedDetails[0]?.color || '#FF3366';

              return (
                <div
                  key={day.date}
                  className={`
                    ${styles.dayBlock}
                    ${!day.isCurrentMonth ? styles.ghost : ''}
                    ${day.isToday ? styles.NOW : ''}
                    ${hasCompletions ? styles[`vibe${vibeLevel}`] : ''}
                  `}
                  style={{
                    '--rotation': `${rotation}deg`,
                    '--offset-x': `${offsetX}px`,
                    '--offset-y': `${offsetY}px`,
                    '--vibe-color': primaryColor,
                    '--cell-index': weekIndex * 7 + dayIndex,
                  }}
                  onClick={() => onDayClick(day.date, day)}
                >
                  <div className={styles.blockInner}>
                    <div className={styles.dayLabel}>
                      <span className={styles.dayNum}>{day.dayjs.date()}</span>
                      {day.isToday && <span className={styles.nowBadge}>NOW</span>}
                    </div>
                    
                    {hasCompletions && (
                      <div className={styles.vibeZone}>
                        <div className={styles.emojiChaos}>
                          {completedDetails.map((habit, i) => (
                            <span 
                              key={habit.id}
                              className={styles.floatingEmoji}
                              style={{
                                '--emoji-index': i,
                                '--emoji-color': habit.color,
                                '--random-x': `${(i * 23) % 40 - 20}px`,
                                '--random-y': `${(i * 17) % 30 - 15}px`,
                                '--random-rotate': `${(i * 31) % 30 - 15}deg`,
                              }}
                            >
                              {habit.emoji}
                            </span>
                          ))}
                        </div>
                        
                        {vibeLevel >= 3 && (
                          <div className={styles.fireIndicator}>
                            {vibeLevel === 4 ? '💎' : '🔥'}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {hasCompletions && (
                      <div className={styles.progressStrip}>
                        <div 
                          className={styles.progressFill}
                          style={{ 
                            width: `${(completedDetails.length / Math.max(habits.length, 1)) * 100}%`,
                            background: primaryColor
                          }}
                        />
                      </div>
                    )}
                  </div>
                  
                  {vibeLevel === 4 && <div className={styles.legendaryGlow} />}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className={styles.controlPanel}>
        <div className={styles.panelSection}>
          <span className={styles.panelLabel}>HABITS//</span>
          <span className={styles.panelValue}>{habits.length}</span>
        </div>
        <div className={styles.panelDivider}>|</div>
        <div className={styles.panelSection}>
          <span className={styles.panelLabel}>STREAK//</span>
          <span className={styles.panelValue}>
            {Object.keys(calendarEntries).length}d
          </span>
        </div>
        <div className={styles.panelDivider}>|</div>
        <div className={styles.panelSection}>
          <span className={styles.panelLabel}>VIBE//</span>
          <span className={styles.panelValue}>✨MAX</span>
        </div>
      </div>

      <div className={styles.cornerDecor}>
        <span>*</span>
        <span>*</span>
        <span>*</span>
      </div>
    </div>
  );
};

export default CalendarGridSavant;
