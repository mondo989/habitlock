import { useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
import styles from './HabitStatsModal.module.scss';

// Helper function to analyze completion times
const analyzeCompletionTimes = (habitId, calendarEntries) => {
  if (!calendarEntries || !habitId) return null;
  
  const completions = [];
  const hourCounts = Array(24).fill(0);
  
  // Collect all completion timestamps for this habit
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
      } catch (error) {
        // Skip invalid timestamps
      }
    }
  });
  
  if (completions.length === 0) return null;
  
  // Find most common hour
  const maxCount = Math.max(...hourCounts);
  const mostCommonHour = hourCounts.findIndex(count => count === maxCount);
  
  // Categorize completion times
  const earlyMorning = completions.filter(c => c.hour >= 5 && c.hour < 7).length;
  const morning = completions.filter(c => c.hour >= 7 && c.hour < 12).length;
  const afternoon = completions.filter(c => c.hour >= 12 && c.hour < 17).length;
  const evening = completions.filter(c => c.hour >= 17 && c.hour < 22).length;
  const lateNight = completions.filter(c => c.hour >= 22 || c.hour < 5).length;
  
  // Determine preferred time period
  const timePeriods = [
    { name: 'Early Morning', count: earlyMorning, emoji: '🌅' },
    { name: 'Morning', count: morning, emoji: '☀️' },
    { name: 'Afternoon', count: afternoon, emoji: '🌤️' },
    { name: 'Evening', count: evening, emoji: '🌇' },
    { name: 'Late Night', count: lateNight, emoji: '🌙' }
  ];
  
  const preferredPeriod = timePeriods.reduce((prev, curr) => 
    curr.count > prev.count ? curr : prev
  );
  
  return {
    totalCompletions: completions.length,
    mostCommonHour,
    mostCommonHourCount: maxCount,
    preferredPeriod,
    timePeriods,
    recentCompletions: completions.slice(-5).reverse() // Last 5 completions
  };
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
  if (!isOpen || !habit) return null;

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
    
    // Analyze completion times
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

          {/* Time Analysis */}
          {stats.timeAnalysis && (
            <div className={styles.timeAnalysisCard}>
              <h3 className={styles.settingsTitle}>⏰ Time Insights</h3>
              
              <div className={styles.timeInsights}>
                <div className={styles.timeInsight}>
                  <span className={styles.timeIcon}>{stats.timeAnalysis.preferredPeriod.emoji}</span>
                  <div className={styles.timeInfo}>
                    <div className={styles.timeLabel}>Preferred Time</div>
                    <div className={styles.timeValue}>{stats.timeAnalysis.preferredPeriod.name}</div>
                    <div className={styles.timeSubtext}>
                      {stats.timeAnalysis.preferredPeriod.count} completions
                    </div>
                  </div>
                </div>
                
                <div className={styles.timeInsight}>
                  <span className={styles.timeIcon}>🎯</span>
                  <div className={styles.timeInfo}>
                    <div className={styles.timeLabel}>Power Hour</div>
                    <div className={styles.timeValue}>
                      {stats.timeAnalysis.mostCommonHour === 0 ? '12:00 AM' : 
                       stats.timeAnalysis.mostCommonHour === 12 ? '12:00 PM' :
                       stats.timeAnalysis.mostCommonHour > 12 ? 
                         `${stats.timeAnalysis.mostCommonHour - 12}:00 PM` : 
                         `${stats.timeAnalysis.mostCommonHour}:00 AM`}
                    </div>
                    <div className={styles.timeSubtext}>
                      {stats.timeAnalysis.mostCommonHourCount} completions
                    </div>
                  </div>
                </div>
              </div>

              {/* Time Distribution */}
              <div className={styles.timeDistribution}>
                <h4 className={styles.distributionTitle}>Time Distribution</h4>
                <div className={styles.timePeriods}>
                  {stats.timeAnalysis.timePeriods.map(period => (
                    <div key={period.name} className={styles.timePeriod}>
                      <div className={styles.periodHeader}>
                        <span className={styles.periodEmoji}>{period.emoji}</span>
                        <span className={styles.periodName}>{period.name}</span>
                        <span className={styles.periodCount}>{period.count}</span>
                      </div>
                      <div className={styles.periodBar}>
                        <div 
                          className={styles.periodFill}
                          style={{ 
                            width: `${(period.count / stats.timeAnalysis.totalCompletions) * 100}%`,
                            backgroundColor: habit.color 
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Completions */}
              {stats.timeAnalysis.recentCompletions.length > 0 && (
                <div className={styles.recentCompletions}>
                  <h4 className={styles.distributionTitle}>Recent Completions</h4>
                  <div className={styles.completionsList}>
                    {stats.timeAnalysis.recentCompletions.map((completion, index) => (
                      <div key={index} className={styles.completionItem}>
                        <span className={styles.completionDate}>
                          {dayjs(completion.date).format('MMM D')}
                        </span>
                        <span className={styles.completionTime}>
                          {completion.timeString}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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