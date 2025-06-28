import { useMemo } from 'react';
import dayjs from 'dayjs';
import styles from './HabitStatsModal.module.scss';

const HabitStatsModal = ({ 
  isOpen, 
  onClose, 
  onEditHabit,
  habit, 
  streaks, 
  weekStats, 
  getCompletedHabits, 
  calendarMatrix 
}) => {
  if (!isOpen || !habit) return null;

  // Calculate comprehensive stats
  const stats = useMemo(() => {
    if (!habit || !calendarMatrix) return null;

    const streak = streaks[habit.id] || 0;
    const weekStat = weekStats[habit.id] || { completions: 0, percentage: 0, hasMetGoal: false };
    
    // Calculate total completions for this month
    let monthlyCompletions = 0;
    let totalPossibleDays = 0;
    
    // Calculate all-time stats (from all weeks in the current calendar matrix)
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

    return {
      streak,
      weekStat,
      monthlyCompletions,
      totalPossibleDays,
      monthlyPercentage
    };
  }, [habit, streaks, weekStats, getCompletedHabits, calendarMatrix]);

  if (!stats) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.habitInfo}>
            <span 
              className={styles.habitEmoji}
              style={{ backgroundColor: `${habit.color}20` }}
            >
              {habit.emoji}
            </span>
            <div className={styles.habitDetails}>
              <h2 className={styles.habitName}>{habit.name}</h2>
              <p className={styles.habitDescription}>{habit.description}</p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button 
              className={styles.editButton}
              onClick={() => {
                onClose();
                onEditHabit && onEditHabit(habit);
              }}
              title="Edit habit"
            >
              ✏️
            </button>
            <button className={styles.closeButton} onClick={onClose}>×</button>
          </div>
        </div>

        <div className={styles.modalContent}>
          {/* Current Streak */}
          <div className={styles.statCard}>
            <div className={styles.statIcon}>🔥</div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{stats.streak}</div>
              <div className={styles.statLabel}>Day Streak</div>
            </div>
          </div>

          {/* Weekly Progress */}
          <div className={styles.statCard}>
            <div className={styles.statIcon}>📅</div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>
                {stats.weekStat.completions}/{habit.weeklyGoal}
              </div>
              <div className={styles.statLabel}>This Week</div>
              {stats.weekStat.hasMetGoal && (
                <div className={styles.goalBadge}>🎯 Goal Met!</div>
              )}
            </div>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill}
                style={{ 
                  width: `${Math.min(stats.weekStat.percentage, 100)}%`,
                  backgroundColor: habit.color 
                }}
              />
            </div>
          </div>

          {/* Monthly Progress */}
          <div className={styles.statCard}>
            <div className={styles.statIcon}>📊</div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>
                {stats.monthlyCompletions}/{stats.totalPossibleDays}
              </div>
              <div className={styles.statLabel}>This Month</div>
              <div className={styles.statSubtext}>
                {stats.monthlyPercentage.toFixed(1)}% completion rate
              </div>
            </div>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill}
                style={{ 
                  width: `${Math.min(stats.monthlyPercentage, 100)}%`,
                  backgroundColor: habit.color 
                }}
              />
            </div>
          </div>

          {/* Habit Settings */}
          <div className={styles.settingsCard}>
            <h3 className={styles.settingsTitle}>Habit Settings</h3>
            <div className={styles.settingRow}>
              <span className={styles.settingLabel}>Weekly Goal:</span>
              <span className={styles.settingValue}>{habit.weeklyGoal} times</span>
            </div>
            <div className={styles.settingRow}>
              <span className={styles.settingLabel}>Color:</span>
              <span 
                className={styles.colorSwatch}
                style={{ backgroundColor: habit.color }}
              ></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HabitStatsModal; 