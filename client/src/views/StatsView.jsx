import { useMemo } from 'react';
import { useHabits } from '../hooks/useHabits';
import { useCalendar } from '../hooks/useCalendar';
import { 
  getBestStreak, 
  getHabitStatsForRange, 
  generateHeatmapData 
} from '../utils/streakUtils';
import styles from './StatsView.module.scss';

const StatsView = () => {
  const { habits, loading: habitsLoading } = useHabits();
  const { calendarEntries, streaks, loading: calendarLoading } = useCalendar(habits);

  const loading = habitsLoading || calendarLoading;

  // Calculate comprehensive stats
  const statsData = useMemo(() => {
    if (!habits.length || !Object.keys(calendarEntries).length) return null;

    const now = new Date();
    const currentYear = now.getFullYear();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return habits.map(habit => {
      const currentStreak = streaks[habit.id] || 0;
      const bestStreak = getBestStreak(habit.id, calendarEntries);
      const thirtyDayStats = getHabitStatsForRange(
        habit.id, 
        thirtyDaysAgo.toISOString().split('T')[0],
        now.toISOString().split('T')[0],
        calendarEntries
      );
      const heatmapData = generateHeatmapData(habit.id, currentYear, calendarEntries);
      
      return {
        habit,
        currentStreak,
        bestStreak,
        thirtyDayStats,
        heatmapData,
      };
    });
  }, [habits, calendarEntries, streaks]);

  if (loading) {
    return (
      <div className={styles.statsView}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (!habits.length) {
    return (
      <div className={styles.statsView}>
        <div className={styles.emptyState}>
          <h2>No habits to analyze</h2>
          <p>Create some habits first to see your statistics and progress.</p>
        </div>
      </div>
    );
  }

  if (!statsData) {
    return (
      <div className={styles.statsView}>
        <div className={styles.emptyState}>
          <h2>No data yet</h2>
          <p>Start tracking your habits to see meaningful statistics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.statsView}>
      <div className={styles.header}>
        <h1>Your Habit Statistics 📊</h1>
        <p>Track your progress and celebrate your achievements</p>
      </div>

      {/* Overview Cards */}
      <div className={styles.overviewGrid}>
        {statsData.map(({ habit, currentStreak, bestStreak, thirtyDayStats }) => (
          <div key={habit.id} className={styles.overviewCard}>
            <div className={styles.cardHeader}>
              <span 
                className={styles.habitEmoji}
                style={{ backgroundColor: `${habit.color}20` }}
              >
                {habit.emoji}
              </span>
              <div className={styles.habitInfo}>
                <h3>{habit.name}</h3>
                <p>Goal: {habit.weeklyGoal} times/week</p>
              </div>
            </div>
            
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <div className={styles.statValue}>{currentStreak}</div>
                <div className={styles.statLabel}>Current Streak</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statValue}>{bestStreak}</div>
                <div className={styles.statLabel}>Best Streak</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statValue}>
                  {Math.round(thirtyDayStats.completionRate)}%
                </div>
                <div className={styles.statLabel}>30-Day Rate</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statValue}>
                  {thirtyDayStats.completedDays}
                </div>
                <div className={styles.statLabel}>Days Completed</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Analytics */}
      <div className={styles.analyticsSection}>
        <h2>Detailed Analytics</h2>
        
        {statsData.map(({ habit, heatmapData }) => (
          <div key={habit.id} className={styles.habitAnalytics}>
            <div className={styles.analyticsHeader}>
              <span className={styles.habitEmoji}>{habit.emoji}</span>
              <h3>{habit.name}</h3>
            </div>
            
            {/* Year Heatmap */}
            <div className={styles.heatmapSection}>
              <h4>2024 Activity</h4>
              <div className={styles.heatmap}>
                {heatmapData.map((day, index) => (
                  <div
                    key={day.date}
                    className={`${styles.heatmapDay} ${
                      day.completed ? styles.completed : ''
                    }`}
                    style={{
                      backgroundColor: day.completed ? habit.color : '#f3f4f6',
                      opacity: day.completed ? 0.8 : 0.3,
                    }}
                    title={`${day.date}: ${day.completed ? 'Completed' : 'Not completed'}`}
                  />
                ))}
              </div>
              <div className={styles.heatmapLegend}>
                <span>Less</span>
                <div className={styles.legendScale}>
                  <div className={styles.legendDay} style={{ opacity: 0.3 }}></div>
                  <div className={styles.legendDay} style={{ opacity: 0.5 }}></div>
                  <div className={styles.legendDay} style={{ opacity: 0.7 }}></div>
                  <div className={styles.legendDay} style={{ opacity: 0.9 }}></div>
                </div>
                <span>More</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Statistics */}
      <div className={styles.summarySection}>
        <h2>Summary</h2>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue}>
              {statsData.reduce((sum, { currentStreak }) => sum + currentStreak, 0)}
            </div>
            <div className={styles.summaryLabel}>Total Active Streaks</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue}>
              {Math.max(...statsData.map(({ bestStreak }) => bestStreak))}
            </div>
            <div className={styles.summaryLabel}>Longest Streak</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue}>
              {Math.round(
                statsData.reduce((sum, { thirtyDayStats }) => sum + thirtyDayStats.completionRate, 0) / 
                statsData.length
              )}%
            </div>
            <div className={styles.summaryLabel}>Average 30-Day Rate</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue}>
              {statsData.reduce((sum, { thirtyDayStats }) => sum + thirtyDayStats.completedDays, 0)}
            </div>
            <div className={styles.summaryLabel}>Total Completions (30d)</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsView; 