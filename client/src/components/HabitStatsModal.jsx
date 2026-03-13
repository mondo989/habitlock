import { useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
import styles from './HabitStatsModal.module.scss';

// Helper function to analyze completion times
const analyzeCompletionTimes = (habitId, calendarEntries) => {
  if (!calendarEntries || !habitId) return null;

  const completions = [];
  const hourCounts = Array(24).fill(0);

  Object.values(calendarEntries).forEach(entry => {
    if (entry.habits && entry.habits[habitId] && entry.habits[habitId].completedAt) {
      try {
        const timestamp = entry.habits[habitId].completedAt;
        const date = new Date(timestamp);
        const hour = date.getHours();

        completions.push({
          date: entry.date,
          timestamp,
          hour,
          timeString: date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
        });

        hourCounts[hour]++;
      } catch {
        // Skip invalid timestamps
      }
    }
  });

  if (completions.length === 0) return null;

  const maxCount = Math.max(...hourCounts);
  const mostCommonHour = hourCounts.findIndex(count => count === maxCount);

  const earlyMorning = completions.filter(c => c.hour >= 5 && c.hour < 7).length;
  const morning = completions.filter(c => c.hour >= 7 && c.hour < 12).length;
  const afternoon = completions.filter(c => c.hour >= 12 && c.hour < 17).length;
  const evening = completions.filter(c => c.hour >= 17 && c.hour < 22).length;
  const lateNight = completions.filter(c => c.hour >= 22 || c.hour < 5).length;

  const timePeriods = [
    { name: 'Early Morning', count: earlyMorning, emoji: '🌅' },
    { name: 'Morning', count: morning, emoji: '☀️' },
    { name: 'Afternoon', count: afternoon, emoji: '🌤️' },
    { name: 'Evening', count: evening, emoji: '🌇' },
    { name: 'Late Night', count: lateNight, emoji: '🌙' }
  ];

  const preferredPeriod = timePeriods.reduce((prev, curr) => (curr.count > prev.count ? curr : prev));

  return {
    totalCompletions: completions.length,
    mostCommonHour,
    mostCommonHourCount: maxCount,
    preferredPeriod,
    recentCompletions: completions.slice(-5).reverse()
  };
};

const formatHour = (hour) => {
  if (hour === 0) return '12:00 AM';
  if (hour === 12) return '12:00 PM';
  if (hour > 12) return `${hour - 12}:00 PM`;
  return `${hour}:00 AM`;
};

const HabitStatsModal = ({
  isOpen,
  onClose,
  onEditHabit,
  habit,
  streaks,
  weekStats,
  getCompletedHabits,
  calendarMatrix,
  calendarEntries
}) => {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const stats = useMemo(() => {
    if (!habit || !calendarMatrix) return null;

    const streak = streaks[habit.id] || 0;
    const weekStat = weekStats[habit.id] || { completions: 0, percentage: 0, hasMetGoal: false };

    let monthlyCompletions = 0;
    let totalPossibleDays = 0;

    const allDates = calendarMatrix.flat().map(day => day.date);
    allDates.forEach(date => {
      if (dayjs(date).isBefore(dayjs(), 'day') || dayjs(date).isSame(dayjs(), 'day')) {
        totalPossibleDays++;
        const completedHabits = getCompletedHabits(date);
        if (completedHabits.includes(habit.id)) {
          monthlyCompletions++;
        }
      }
    });

    const monthlyPercentage = totalPossibleDays > 0 ? (monthlyCompletions / totalPossibleDays) * 100 : 0;
    const timeAnalysis = analyzeCompletionTimes(habit.id, calendarEntries);

    return {
      streak,
      weekStat,
      monthlyCompletions,
      totalPossibleDays,
      monthlyPercentage,
      timeAnalysis
    };
  }, [habit, streaks, weekStats, getCompletedHabits, calendarMatrix, calendarEntries]);

  if (!isOpen || !habit || !stats) return null;

  const lastCompletion = stats.timeAnalysis?.recentCompletions?.[0] || null;

  return (
    <div className={styles.popoverOverlay} onClick={onClose}>
      <div className={styles.popover} onClick={(e) => e.stopPropagation()}>
        <div className={styles.pointer} />

        <div className={styles.header}>
          <div className={styles.habitInfo}>
            <span className={styles.habitEmoji} style={{ backgroundColor: `${habit.color}20` }}>
              {habit.emoji}
            </span>
            <div className={styles.habitDetails}>
              <h2 className={styles.habitName}>{habit.name}</h2>
              <p className={styles.habitDescription}>{habit.description || 'Keep the streak alive.'}</p>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button
              className={styles.iconButton}
              onClick={() => {
                onClose();
                onEditHabit && onEditHabit(habit);
              }}
              title="Edit habit"
              aria-label={`Edit ${habit.name}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="m18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button className={styles.iconButton} onClick={onClose} aria-label="Close details">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>🔥 Streak</span>
            <span className={styles.metricValue}>{stats.streak} days</span>
          </div>

          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>📅 Week</span>
            <span className={styles.metricValue}>{stats.weekStat.completions}/{habit.weeklyGoal}</span>
          </div>

          <div className={`${styles.metricCard} ${styles.wideCard}`}>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>This Week Progress</span>
              {stats.weekStat.hasMetGoal && <span className={styles.goalMet}>Goal met</span>}
            </div>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${Math.min(stats.weekStat.percentage, 100)}%`, backgroundColor: habit.color }}
              />
            </div>
          </div>

          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>📈 Month</span>
            <span className={styles.metricValue}>{stats.monthlyCompletions}/{stats.totalPossibleDays}</span>
            <span className={styles.metricSubtext}>{stats.monthlyPercentage.toFixed(1)}%</span>
          </div>

          {stats.timeAnalysis && (
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>⏰ Best Time</span>
              <span className={styles.metricValue}>{stats.timeAnalysis.preferredPeriod.emoji} {stats.timeAnalysis.preferredPeriod.name}</span>
              <span className={styles.metricSubtext}>{stats.timeAnalysis.preferredPeriod.count} completions</span>
            </div>
          )}

          {stats.timeAnalysis && (
            <div className={`${styles.metricCard} ${styles.wideCard}`}>
              <div className={styles.metricRow}>
                <span className={styles.metricLabel}>Power Hour</span>
                <span className={styles.metricSubtext}>{stats.timeAnalysis.mostCommonHourCount} hits</span>
              </div>
              <span className={styles.metricValue}>{formatHour(stats.timeAnalysis.mostCommonHour)}</span>
            </div>
          )}

          {lastCompletion && (
            <div className={`${styles.metricCard} ${styles.wideCard}`}>
              <div className={styles.metricRow}>
                <span className={styles.metricLabel}>Last Completion</span>
                <span className={styles.metricSubtext}>{dayjs(lastCompletion.date).format('MMM D')}</span>
              </div>
              <span className={styles.metricValue}>{lastCompletion.timeString}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HabitStatsModal;
