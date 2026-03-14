import { memo, useMemo } from 'react';
import dayjs from 'dayjs';
import Tooltip from './Tooltip';
import { PatternBackgroundSvg } from './PatternBackground';
import { buildCalendarCellVisuals } from '../utils/calendarCellVisuals';
import styles from './HabitTimelineStrip.module.scss';

const buildTooltipContent = (day) => {
  if (!day) return null;

  return (
    <div className={styles.tooltipBody}>
      <div className={styles.tooltipDate}>{day.label}</div>
      {day.habits.length > 0 ? (
        <div className={styles.tooltipHabits}>
          {day.habits.map((habit) => (
            <div key={habit.id} className={styles.tooltipHabit}>
              <span className={styles.tooltipHabitEmoji}>{habit.emoji}</span>
              <span className={styles.tooltipHabitName}>{habit.name}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.tooltipEmpty}>No habits completed</div>
      )}
    </div>
  );
};

const HabitTimelineStrip = ({
  year,
  habits = [],
  getCompletedHabits,
  habitProgressByDate = {},
  size = 'default',
  className = '',
}) => {
  const habitById = useMemo(
    () => new Map(habits.filter((habit) => habit?.id).map((habit) => [habit.id, habit])),
    [habits],
  );

  const months = useMemo(() => Array.from({ length: 12 }, (_, monthIndex) => {
    const monthStart = dayjs().year(year).month(monthIndex).startOf('month');
    const daysInMonth = monthStart.daysInMonth();
    const rows = Array.from({ length: 5 }, () => Array(7).fill(null));
    let activeCount = 0;

    for (let dayOfMonth = 1; dayOfMonth <= daysInMonth; dayOfMonth += 1) {
      const row = Math.floor((dayOfMonth - 1) / 7);
      const col = (dayOfMonth - 1) % 7;
      const date = monthStart.date(dayOfMonth);
      const dateKey = date.format('YYYY-MM-DD');
      const completedHabitIds = (getCompletedHabits(dateKey) || []).filter((habitId) => habitById.has(habitId));
      const visuals = buildCalendarCellVisuals({
        date: dateKey,
        habits,
        habitById,
        completedHabitIds,
        habitProgressByDate,
        isPreview: true,
      });
      const completedHabits = completedHabitIds
        .map((habitId) => habitById.get(habitId))
        .filter(Boolean);

      if (completedHabitIds.length > 0) {
        activeCount += 1;
      }

      rows[row][col] = {
        id: dateKey,
        dateKey,
        label: date.format('MMM D, YYYY'),
        isToday: date.isSame(dayjs(), 'day'),
        isFuture: date.isAfter(dayjs(), 'day'),
        habits: completedHabits,
        completed: completedHabitIds.length > 0,
        allHabitsCompleted: habits.length > 0 && completedHabitIds.length === habits.length,
        visuals,
      };
    }

    return {
      id: `${year}-${monthIndex}`,
      activeCount,
      rows,
    };
  }), [year, habits, habitById, getCompletedHabits, habitProgressByDate]);

  const activeMonthCount = months.filter((month) => month.activeCount > 0).length;

  return (
    <div className={`${styles.timeline} ${styles[size] || ''} ${className}`.trim()}>
      <div className={styles.scrollFrame}>
        <div className={styles.monthTrack}>
          {months.map((month) => {
            const monthOpacity = month.activeCount > 0
              ? 1
              : activeMonthCount > 0
                ? 0.36
                : 0.58;

            return (
              <div
                key={month.id}
                className={styles.monthBlock}
                style={{ '--month-opacity': monthOpacity }}
              >
                <div className={styles.monthGrid}>
                  {month.rows.flat().map((day, index) => {
                    if (!day) {
                      return <div key={`${month.id}-empty-${index}`} className={`${styles.dayCell} ${styles.placeholder}`} />;
                    }

                    const tooltipContent = buildTooltipContent(day);

                    return (
                      <Tooltip
                        key={day.id}
                        content={tooltipContent}
                        position="top"
                        respectTopBoundary={false}
                        forcePreferredPlacement
                      >
                        <div
                          className={[
                            styles.dayCell,
                            day.completed ? styles.completed : '',
                            day.allHabitsCompleted ? styles.allComplete : '',
                            day.isToday ? styles.today : '',
                            day.isFuture ? styles.future : '',
                          ].filter(Boolean).join(' ')}
                          style={day.visuals.backgroundStyle}
                        >
                          <div className={styles.dayBackground} />
                          {day.visuals.patternLayers.length > 0 && (
                            <div className={styles.dayPattern}>
                              <PatternBackgroundSvg
                                patternLayers={day.visuals.patternLayers}
                                seed={day.visuals.patternSeed}
                              />
                            </div>
                          )}
                          {day.allHabitsCompleted && (
                            <div className={styles.allCompleteStar} aria-hidden="true">
                              <svg viewBox="0 0 24 24" fill="none">
                                <path
                                  d="M12 2.75L14.663 8.149L20.621 9.015L16.311 13.216L17.328 19.149L12 16.348L6.672 19.149L7.689 13.216L3.379 9.015L9.337 8.149L12 2.75Z"
                                  fill="white"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default memo(HabitTimelineStrip);
