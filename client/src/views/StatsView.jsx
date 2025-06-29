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

  // Generate insights and recommendations
  const generateInsights = (habit, currentStreak, bestStreak, thirtyDay, sevenDay) => {
    const insights = [];
    
    if (currentStreak === bestStreak && currentStreak > 0) {
      insights.push({ type: 'achievement', text: `🔥 New personal record: ${currentStreak} day streak!` });
    }
    
    if (thirtyDay.completionRate >= 90) {
      insights.push({ type: 'success', text: `💪 Excellent consistency: ${Math.round(thirtyDay.completionRate)}% completion rate` });
    } else if (thirtyDay.completionRate < 50) {
      insights.push({ type: 'warning', text: `📈 Room for improvement: ${Math.round(thirtyDay.completionRate)}% completion rate` });
    }
    
    if (sevenDay.completedDays >= (habit.weeklyGoal || 7)) {
      insights.push({ type: 'success', text: `🎯 Weekly goal achieved: ${sevenDay.completedDays}/${habit.weeklyGoal || 7} days` });
    }
    
    if (currentStreak >= 21) {
      insights.push({ type: 'milestone', text: `🏆 Habit mastery zone: ${currentStreak} consecutive days!` });
    } else if (currentStreak >= 7) {
      insights.push({ type: 'milestone', text: `⭐ One week streak achieved!` });
    }
    
    return insights;
  };

  // Calculate comprehensive stats and insights
  const statsData = useMemo(() => {
    if (!habits.length || !Object.keys(calendarEntries).length) return null;

    const now = new Date();
    const currentYear = now.getFullYear();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    return habits.map(habit => {
      const currentStreak = streaks[habit.id] || 0;
      const bestStreak = getBestStreak(habit.id, calendarEntries);
      const thirtyDayStats = getHabitStatsForRange(
        habit.id, 
        thirtyDaysAgo.toISOString().split('T')[0],
        now.toISOString().split('T')[0],
        calendarEntries
      );
      const sevenDayStats = getHabitStatsForRange(
        habit.id, 
        sevenDaysAgo.toISOString().split('T')[0],
        now.toISOString().split('T')[0],
        calendarEntries
      );
      const heatmapData = generateHeatmapData(habit.id, currentYear, calendarEntries);
      
      // Calculate weekly goal progress
      const currentWeekProgress = Math.min(sevenDayStats.completedDays, habit.weeklyGoal || 7);
      const weeklyGoalPercentage = ((currentWeekProgress / (habit.weeklyGoal || 7)) * 100);
      
      // Generate insights
      const insights = generateInsights(habit, currentStreak, bestStreak, thirtyDayStats, sevenDayStats);
      
      return {
        habit,
        currentStreak,
        bestStreak,
        thirtyDayStats,
        sevenDayStats,
        heatmapData,
        weeklyGoalPercentage,
        currentWeekProgress,
        insights,
      };
    });
  }, [habits, calendarEntries, streaks]);

  // Calculate overall insights
  const overallInsights = useMemo(() => {
    if (!statsData) return [];
    
    const insights = [];
    const totalHabits = statsData.length;
    const activeStreaks = statsData.filter(d => d.currentStreak > 0).length;
    const excellentHabits = statsData.filter(d => d.thirtyDayStats.completionRate >= 80).length;
    const avgCompletionRate = Math.round(
      statsData.reduce((sum, d) => sum + d.thirtyDayStats.completionRate, 0) / totalHabits
    );
    
    if (activeStreaks === totalHabits) {
      insights.push({ type: 'achievement', text: `🌟 All habits have active streaks!` });
    }
    
    if (excellentHabits >= totalHabits * 0.8) {
      insights.push({ type: 'success', text: `🚀 ${excellentHabits}/${totalHabits} habits performing excellently` });
    }
    
    if (avgCompletionRate >= 85) {
      insights.push({ type: 'success', text: `💯 Outstanding average: ${avgCompletionRate}% completion rate` });
    } else if (avgCompletionRate < 60) {
      insights.push({ type: 'tip', text: `💡 Focus on consistency: ${avgCompletionRate}% average completion` });
    }
    
    return insights;
  }, [statsData]);

  // Get achievement badges
  const achievements = useMemo(() => {
    if (!statsData) return [];
    
    const badges = [];
    const totalCompletions = statsData.reduce((sum, d) => sum + d.thirtyDayStats.completedDays, 0);
    const maxStreak = Math.max(...statsData.map(d => d.bestStreak));
    const perfectWeeks = statsData.filter(d => d.weeklyGoalPercentage >= 100).length;
    
    if (totalCompletions >= 100) badges.push({ emoji: '💯', title: 'Century Club', desc: '100+ completions' });
    if (maxStreak >= 30) badges.push({ emoji: '🔥', title: 'Streak Master', desc: '30+ day streak' });
    if (perfectWeeks >= 3) badges.push({ emoji: '🎯', title: 'Goal Crusher', desc: '3+ perfect weeks' });
    if (statsData.length >= 5) badges.push({ emoji: '🌟', title: 'Multi-Tracker', desc: '5+ habits tracked' });
    
    return badges;
  }, [statsData]);

  if (loading) {
    return (
      <div className={styles.statsView}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Analyzing your habit data...</p>
        </div>
      </div>
    );
  }

  if (!habits.length) {
    return (
      <div className={styles.statsView}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📊</div>
          <h2>No habits to analyze</h2>
          <p>Create some habits first to see detailed analytics and insights about your progress.</p>
          <div className={styles.emptyTips}>
            <h3>What you'll see here:</h3>
            <ul>
              <li>📈 Completion rates and trends</li>
              <li>🔥 Streak analytics and records</li>
              <li>🎯 Weekly goal progress</li>
              <li>🏆 Achievement badges</li>
              <li>💡 Personalized insights</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (!statsData) {
    return (
      <div className={styles.statsView}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>⏳</div>
          <h2>Building your analytics</h2>
          <p>Start tracking your habits to see meaningful statistics and insights.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.statsView}>
      <div className={styles.header}>
        <h1>Your Habit Analytics 📊</h1>
        <p>Comprehensive insights into your habit-building journey</p>
      </div>

      {/* Achievement Badges */}
      {achievements.length > 0 && (
        <div className={styles.achievementsSection}>
          <h2>🏆 Your Achievements</h2>
          <div className={styles.achievementsGrid}>
            {achievements.map((badge, index) => (
              <div key={index} className={styles.achievementBadge}>
                <div className={styles.badgeEmoji}>{badge.emoji}</div>
                <div className={styles.badgeInfo}>
                  <h4>{badge.title}</h4>
                  <p>{badge.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overall Insights */}
      {overallInsights.length > 0 && (
        <div className={styles.insightsSection}>
          <h2>📈 Key Insights</h2>
          <div className={styles.insightsGrid}>
            {overallInsights.map((insight, index) => (
              <div key={index} className={`${styles.insightCard} ${styles[insight.type]}`}>
                <p>{insight.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className={styles.quickStatsSection}>
        <h2>📊 Quick Stats</h2>
        <div className={styles.quickStatsGrid}>
          <div className={styles.quickStat}>
            <div className={styles.statValue}>
              {statsData.reduce((sum, { currentStreak }) => sum + currentStreak, 0)}
            </div>
            <div className={styles.statLabel}>Total Active Streaks</div>
          </div>
          <div className={styles.quickStat}>
            <div className={styles.statValue}>
              {Math.round(
                statsData.reduce((sum, { thirtyDayStats }) => sum + thirtyDayStats.completionRate, 0) / 
                statsData.length
              )}%
            </div>
            <div className={styles.statLabel}>Average Success Rate</div>
          </div>
          <div className={styles.quickStat}>
            <div className={styles.statValue}>
              {statsData.filter(d => d.weeklyGoalPercentage >= 100).length}
            </div>
            <div className={styles.statLabel}>Goals Achieved This Week</div>
          </div>
          <div className={styles.quickStat}>
            <div className={styles.statValue}>
              {Math.max(...statsData.map(({ bestStreak }) => bestStreak))}
            </div>
            <div className={styles.statLabel}>Best Streak Record</div>
          </div>
        </div>
      </div>

      {/* Detailed Habit Analytics */}
      <div className={styles.habitDetailsSection}>
        <h2>🎯 Habit Performance</h2>
        <div className={styles.habitDetailsGrid}>
          {statsData.map(({ habit, currentStreak, bestStreak, thirtyDayStats, sevenDayStats, weeklyGoalPercentage, currentWeekProgress, insights }) => (
            <div key={habit.id} className={styles.habitDetailCard}>
              <div className={styles.habitHeader}>
                <span 
                  className={styles.habitEmoji}
                  style={{ backgroundColor: `${habit.color}20` }}
                >
                  {habit.emoji}
                </span>
                <div className={styles.habitInfo}>
                  <h3>{habit.name}</h3>
                  <p>Goal: {habit.weeklyGoal || 7} times/week</p>
                </div>
                <div className={styles.habitStatus}>
                  {currentStreak > 0 ? (
                    <span className={styles.activeStreak}>🔥 {currentStreak}</span>
                  ) : (
                    <span className={styles.noStreak}>💤</span>
                  )}
                </div>
              </div>

              {/* Weekly Goal Progress */}
              <div className={styles.weeklyGoalSection}>
                <div className={styles.goalHeader}>
                  <span>This Week: {currentWeekProgress}/{habit.weeklyGoal || 7}</span>
                  <span className={styles.goalPercentage}>{Math.round(weeklyGoalPercentage)}%</span>
                </div>
                <div className={styles.goalProgressBar}>
                  <div 
                    className={styles.goalProgressFill}
                    style={{ 
                      width: `${Math.min(weeklyGoalPercentage, 100)}%`,
                      backgroundColor: weeklyGoalPercentage >= 100 ? '#10b981' : habit.color 
                    }}
                  ></div>
                </div>
              </div>
              
              <div className={styles.metricsGrid}>
                <div className={styles.metric}>
                  <div className={styles.metricValue}>{currentStreak}</div>
                  <div className={styles.metricLabel}>Current</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricValue}>{bestStreak}</div>
                  <div className={styles.metricLabel}>Best</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricValue}>{Math.round(thirtyDayStats.completionRate)}%</div>
                  <div className={styles.metricLabel}>30-Day</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricValue}>{sevenDayStats.completedDays}</div>
                  <div className={styles.metricLabel}>This Week</div>
                </div>
              </div>

              {/* Habit Insights */}
              {insights.length > 0 && (
                <div className={styles.habitInsights}>
                  {insights.map((insight, index) => (
                    <div key={index} className={`${styles.habitInsight} ${styles[insight.type]}`}>
                      {insight.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Yearly Heatmap */}
      <div className={styles.heatmapSection}>
        <h2>📅 Activity Overview</h2>
        {statsData.map(({ habit, heatmapData }) => {
          // Create 2D grid for GitHub-style layout (weeks x days of week)
          const weeks = [];
          const daysByWeek = {};
          
          // Group days by week number and day of week
          heatmapData.forEach(day => {
            if (!daysByWeek[day.week]) {
              daysByWeek[day.week] = {};
            }
            daysByWeek[day.week][day.dayOfWeek] = day;
          });
          
          // Convert to array format for rendering
          const sortedWeeks = Object.keys(daysByWeek).sort((a, b) => Number(a) - Number(b));
          sortedWeeks.forEach(weekNum => {
            const week = [];
            for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
              week[dayOfWeek] = daysByWeek[weekNum][dayOfWeek] || null;
            }
            weeks.push(week);
          });

          return (
            <div key={habit.id} className={styles.habitHeatmap}>
              <div className={styles.heatmapHeader}>
                <span className={styles.habitEmoji}>{habit.emoji}</span>
                <h3>{habit.name}</h3>
                <span className={styles.yearLabel}>{new Date().getFullYear()}</span>
              </div>
              
              {/* Day labels and heatmap grid */}
              <div className={styles.heatmapContainer}>
                <div className={styles.dayLabels}>
                  <div className={styles.dayLabel}>Sun</div>
                  <div className={styles.dayLabel}>Mon</div>
                  <div className={styles.dayLabel}>Tue</div>
                  <div className={styles.dayLabel}>Wed</div>
                  <div className={styles.dayLabel}>Thu</div>
                  <div className={styles.dayLabel}>Fri</div>
                  <div className={styles.dayLabel}>Sat</div>
                </div>
                    
                <div className={styles.heatmapGrid}>
                  {/* Create columns for each week */}
                  {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className={styles.heatmapWeekColumn}>
                      {/* Create rows for each day of the week (Sun-Sat) */}
                      {[0, 1, 2, 3, 4, 5, 6].map(dayOfWeek => {
                        const day = week[dayOfWeek];
                        if (!day) {
                          return <div key={dayOfWeek} className={styles.heatmapDayEmpty}></div>;
                        }
                        
                        const tooltipText = day.completed 
                          ? `${habit.emoji} ${habit.name}\n${day.formattedDate}, ${day.weekday}${day.completionTime ? `\nCompleted at ${new Date(day.completionTime).toLocaleTimeString()}` : ''}`
                          : day.isFuture 
                            ? `${day.formattedDate}, ${day.weekday}\nFuture date`
                            : `${day.formattedDate}, ${day.weekday}\nNo activity`;

                        return (
                          <div
                            key={day.date}
                            className={`${styles.heatmapDay} ${day.completed ? styles.completed : ''} ${day.isFuture ? styles.future : ''}`}
                            style={{
                              backgroundColor: day.completed 
                                ? habit.color 
                                : day.isFuture 
                                  ? '#f9fafb' 
                                  : '#e5e7eb',
                              opacity: day.completed ? 0.9 : day.isFuture ? 0.3 : 0.5,
                            }}
                            title={tooltipText}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatsView; 