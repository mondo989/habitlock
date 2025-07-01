import { useMemo, useState, useEffect } from 'react';
import { useHabits } from '../hooks/useHabits';
import { useCalendar } from '../hooks/useCalendar';
import { 
  getBestStreak, 
  getHabitStatsForRange, 
  generateHeatmapData 
} from '../utils/streakUtils';
import { getWeekBoundaries } from '../utils/dateUtils';
import BadgesModal from '../components/BadgesModal';
import { 
  checkAndUpdateAchievements, 
  getUserAchievements, 
  backfillUserAchievements,
  mergeAchievementsWithBadgeData 
} from '../services/achievements';
import { getUserInfo } from '../services/firebase';
import styles from './StatsView.module.scss';

const StatsView = () => {
  const { habits, loading: habitsLoading } = useHabits();
  const { calendarEntries, streaks, loading: calendarLoading } = useCalendar(habits);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [isBadgesModalOpen, setIsBadgesModalOpen] = useState(false);
  const [firebaseAchievements, setFirebaseAchievements] = useState({});
  const [achievementsLoading, setAchievementsLoading] = useState(true);

  const loading = habitsLoading || calendarLoading;

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveTooltip(null);
    };

    if (activeTooltip) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeTooltip]);

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
    
    // Get proper Sunday-Saturday week boundaries for current week
    const currentWeekBoundaries = getWeekBoundaries(now);
    
    return habits.map(habit => {
      const currentStreak = streaks[habit.id] || 0;
      const bestStreak = getBestStreak(habit.id, calendarEntries);
      const thirtyDayStats = getHabitStatsForRange(
        habit.id, 
        thirtyDaysAgo.toISOString().split('T')[0],
        now.toISOString().split('T')[0],
        calendarEntries
      );
      // Use proper Sunday-Saturday week boundaries for this week's stats
      const currentWeekStats = getHabitStatsForRange(
        habit.id, 
        currentWeekBoundaries.start,
        currentWeekBoundaries.end,
        calendarEntries
      );
      const heatmapData = generateHeatmapData(habit.id, currentYear, calendarEntries);
      
      // Calculate weekly goal progress using proper week boundaries
      const currentWeekProgress = Math.min(currentWeekStats.completedDays, habit.weeklyGoal || 7);
      const weeklyGoalPercentage = ((currentWeekProgress / (habit.weeklyGoal || 7)) * 100);
      
      // Generate insights
      const insights = generateInsights(habit, currentStreak, bestStreak, thirtyDayStats, currentWeekStats);
      
      return {
        habit,
        currentStreak,
        bestStreak,
        thirtyDayStats,
        currentWeekStats,
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

  // Get comprehensive badge system for preview
  const badgeSystem = useMemo(() => {
    if (!statsData) return { featured: [], all: [] };
    
    const totalCompletions = statsData.reduce((sum, d) => sum + d.thirtyDayStats.completedDays, 0);
    const maxStreak = Math.max(...statsData.map(d => d.bestStreak));
    const currentMaxStreak = Math.max(...statsData.map(d => d.currentStreak));
    const perfectWeeks = statsData.filter(d => d.weeklyGoalPercentage >= 100).length;
    const avgCompletionRate = Math.round(
      statsData.reduce((sum, d) => sum + d.thirtyDayStats.completionRate, 0) / statsData.length
    );

    // Define all possible badges with progress calculation
    const allBadges = [
      // Basic achievement badges
      {
        id: 'first_steps',
        emoji: '👶',
        title: 'First Steps',
        desc: 'Complete your first habit',
        category: 'Milestones',
        rarity: 'common',
        earned: totalCompletions > 0,
        progress: totalCompletions > 0 ? 100 : 0,
        priority: 1000 // High priority for beginners
      },
      {
        id: 'habit_explorer',
        emoji: '🧭',
        title: 'Habit Explorer',
        desc: 'Create your first habit',
        category: 'Mastery',
        rarity: 'common',
        earned: statsData.length > 0,
        progress: statsData.length > 0 ? 100 : 0,
        priority: 999
      },
      {
        id: 'multi_tasker',
        emoji: '🤹',
        title: 'Multi-Tasker',
        desc: 'Track 3 habits simultaneously',
        category: 'Mastery',
        rarity: 'common',
        earned: statsData.length >= 3,
        progress: Math.min((statsData.length / 3) * 100, 100),
        priority: statsData.length >= 2 ? 900 : 400 // Higher priority when close
      },
      {
        id: 'multi_tracker',
        emoji: '🌟',
        title: 'Multi-Tracker',
        desc: '5+ habits tracked',
        category: 'Mastery',
        rarity: 'uncommon',
        earned: statsData.length >= 5,
        progress: Math.min((statsData.length / 5) * 100, 100),
        priority: statsData.length >= 3 ? 850 : 300
      },
      {
        id: 'lifestyle_designer',
        emoji: '🏗️',
        title: 'Lifestyle Designer',
        desc: 'Track 10+ habits simultaneously',
        category: 'Mastery',
        rarity: 'rare',
        earned: statsData.length >= 10,
        progress: Math.min((statsData.length / 10) * 100, 100),
        priority: statsData.length >= 7 ? 700 : 200
      },
      
      // Streak badges
      {
        id: 'fire_starter',
        emoji: '🔥',
        title: 'Fire Starter',
        desc: 'Complete a 3-day streak',
        category: 'Streaks',
        rarity: 'common',
        earned: currentMaxStreak >= 3,
        progress: Math.min((currentMaxStreak / 3) * 100, 100),
        priority: currentMaxStreak >= 3 ? 1000 : (currentMaxStreak >= 2 ? 970 : (currentMaxStreak >= 1 ? 750 : 600))
      },
      {
        id: 'flame_keeper',
        emoji: '🔥',
        title: 'Flame Keeper',
        desc: 'Maintain a 7-day streak',
        category: 'Streaks',
        rarity: 'common',
        earned: currentMaxStreak >= 7,
        progress: Math.min((currentMaxStreak / 7) * 100, 100),
        priority: currentMaxStreak >= 7 ? 990 : (currentMaxStreak >= 5 ? 940 : (currentMaxStreak >= 4 ? 700 : 500))
      },
      {
        id: 'inferno_master',
        emoji: '🔥',
        title: 'Inferno Master',
        desc: 'Achieve a 21-day streak',
        category: 'Streaks',
        rarity: 'uncommon',
        earned: maxStreak >= 21,
        progress: Math.min((maxStreak / 21) * 100, 100),
        priority: maxStreak >= 21 ? 970 : (maxStreak >= 18 ? 820 : (maxStreak >= 14 ? 650 : 300))
      },
      {
        id: 'streak_master',
        emoji: '🔥',
        title: 'Streak Master',
        desc: '30+ day streak',
        category: 'Streaks',
        rarity: 'rare',
        earned: maxStreak >= 30,
        progress: Math.min((maxStreak / 30) * 100, 100),
        priority: maxStreak >= 30 ? 950 : (maxStreak >= 25 ? 780 : (maxStreak >= 21 ? 580 : 250))
      },

      // Goal achievement badges
      {
        id: 'goal_getter',
        emoji: '🎯',
        title: 'Goal Getter',
        desc: 'Achieve your first weekly goal',
        category: 'Goals',
        rarity: 'common',
        earned: perfectWeeks >= 1,
        progress: perfectWeeks >= 1 ? 100 : (avgCompletionRate >= 70 ? 85 : avgCompletionRate >= 50 ? 60 : 30),
        priority: perfectWeeks >= 1 ? 1000 : (avgCompletionRate >= 80 ? 920 : (avgCompletionRate >= 60 ? 800 : 550))
      },
      {
        id: 'goal_crusher',
        emoji: '🎯',
        title: 'Goal Crusher',
        desc: '3+ perfect weeks',
        category: 'Goals',
        rarity: 'uncommon',
        earned: perfectWeeks >= 3,
        progress: Math.min((perfectWeeks / 3) * 100, 100),
        priority: perfectWeeks >= 3 ? 980 : (perfectWeeks >= 2 ? 890 : (perfectWeeks >= 1 ? 720 : 450))
      },
      {
        id: 'target_hunter',
        emoji: '🎯',
        title: 'Target Hunter',
        desc: 'Hit 5 weekly goals',
        category: 'Goals',
        rarity: 'rare',
        earned: perfectWeeks >= 5,
        progress: Math.min((perfectWeeks / 5) * 100, 100),
        priority: perfectWeeks >= 5 ? 960 : (perfectWeeks >= 4 ? 840 : (perfectWeeks >= 3 ? 680 : 350))
      },

      // Milestone badges
      {
        id: 'century_club',
        emoji: '💯',
        title: 'Century Club',
        desc: '100+ completions',
        category: 'Milestones',
        rarity: 'uncommon',
        earned: totalCompletions >= 100,
        progress: Math.min((totalCompletions / 100) * 100, 100),
        priority: totalCompletions >= 100 ? 980 : (totalCompletions >= 80 ? 860 : (totalCompletions >= 60 ? 700 : 400))
      },
      {
        id: 'consistency_king',
        emoji: '👑',
        title: 'Consistency Royalty',
        desc: '90%+ completion rate for 30 days',
        category: 'Consistency',
        rarity: 'rare',
        earned: avgCompletionRate >= 90,
        progress: Math.min((avgCompletionRate / 90) * 100, 100),
        priority: avgCompletionRate >= 90 ? 970 : (avgCompletionRate >= 85 ? 870 : (avgCompletionRate >= 80 ? 750 : 350))
      },
      {
        id: 'perfect_week',
        emoji: '⭐',
        title: 'Perfect Week',
        desc: '100% completion for 7 days straight',
        category: 'Consistency',
        rarity: 'uncommon',
        earned: perfectWeeks >= 1,
        progress: perfectWeeks >= 1 ? 100 : (avgCompletionRate >= 70 ? 80 : avgCompletionRate >= 50 ? 60 : 30),
        priority: perfectWeeks >= 1 ? 990 : (avgCompletionRate >= 80 ? 910 : (avgCompletionRate >= 60 ? 780 : 500))
      }
    ];

    // Sort badges by priority (earned first, then by proximity to achievement)
    const sortedBadges = allBadges.sort((a, b) => {
      // Earned badges get highest priority
      if (a.earned && !b.earned) return -1;
      if (!a.earned && b.earned) return 1;
      
      // Among earned or unearned, sort by priority score
      return b.priority - a.priority;
    });

    // Take top 8 for desktop, 9 for mobile (responsive handled via CSS)
    const featured = sortedBadges.slice(0, 9);

    // Merge with Firebase achievement data
    const featuredWithAchievements = mergeAchievementsWithBadgeData(featured, firebaseAchievements);
    const allWithAchievements = mergeAchievementsWithBadgeData(allBadges, firebaseAchievements);

    return { 
      featured: featuredWithAchievements, 
      all: allWithAchievements 
    };
  }, [statsData, firebaseAchievements]);

  // Load and update achievements when stats data changes
  useEffect(() => {
    const loadAchievements = async () => {
      const userInfo = getUserInfo();
      if (!userInfo?.uid || !statsData || statsData.length === 0) {
        setAchievementsLoading(false);
        return;
      }

      try {
        setAchievementsLoading(true);
        
        // Check for existing achievements
        let achievements = await getUserAchievements(userInfo.uid);
        
        // Backfill if no achievements exist
        if (Object.keys(achievements).length === 0) {
          console.log('No achievements found, backfilling...');
          achievements = await backfillUserAchievements(userInfo.uid, statsData);
        }
        
        // Check for new achievements based on current stats
        const { newCompletions, allAchievements } = await checkAndUpdateAchievements(userInfo.uid, statsData);
        
        if (newCompletions.length > 0) {
          console.log('New achievements earned:', newCompletions.map(a => a.title));
          // Could show a celebration notification here
        }
        
        setFirebaseAchievements(allAchievements);
      } catch (error) {
        console.error('Error loading achievements:', error);
      } finally {
        setAchievementsLoading(false);
      }
    };

    loadAchievements();
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
      {badgeSystem.featured.length > 0 && (
        <div className={styles.achievementsSection}>
          <div className={styles.achievementsHeader}>
            <div className={styles.headerText}>
              <h2>🏆 Your Achievements</h2>
              <p>Click on locked badges to discover all achievements</p>
            </div>
            <button 
              className={styles.viewAllBadgesButton}
              onClick={() => setIsBadgesModalOpen(true)}
            >
              View All Badges
            </button>
          </div>
          <div className={styles.achievementsGrid}>
            {badgeSystem.featured.map((badge, index) => (
              <div 
                key={badge.id} 
                className={`${styles.achievementBadge} ${badge.earned ? styles.earned : styles.inProgress} ${!badge.earned ? styles.clickable : ''}`}
                onClick={!badge.earned ? () => setIsBadgesModalOpen(true) : undefined}
                title={badge.displayText || (!badge.earned ? 'Click to view all badges and see how to unlock this achievement' : '')}
              >
                <div className={styles.badgeEmoji}>
                  {badge.earned ? badge.emoji : '🔒'}
                </div>
                <div className={styles.badgeInfo}>
                  <h4>{badge.title}</h4>
                  <p>{badge.desc}</p>
                  {badge.earned && badge.achievement && (
                    <div className={styles.completionDate}>
                      {badge.achievement.completionCount > 1 
                        ? `${badge.title} ×${badge.achievement.completionCount}` 
                        : `Earned on ${new Intl.DateTimeFormat('en-US', {
                            month: 'long',
                            day: 'numeric', 
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          }).format(badge.achievement.lastCompletedAt.toDate ? badge.achievement.lastCompletedAt.toDate() : new Date(badge.achievement.lastCompletedAt))}`
                      }
                    </div>
                  )}
                  {!badge.earned && badge.progress > 0 && (
                    <div className={styles.progressInfo}>
                      <div className={styles.progressBar}>
                        <div 
                          className={styles.progressFill}
                          style={{ width: `${badge.progress}%` }}
                        ></div>
                      </div>
                      <span className={styles.progressText}>{Math.round(badge.progress)}%</span>
                    </div>
                  )}
                  {!badge.earned && (
                    <div className={styles.clickHint}>
                      <span className={styles.clickText}>Click to explore all badges</span>
                    </div>
                  )}
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
          {statsData.map(({ habit, currentStreak, bestStreak, thirtyDayStats, currentWeekStats, weeklyGoalPercentage, currentWeekProgress, insights }) => (
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
                  <div className={styles.metricValue}>{currentWeekStats.completedDays}</div>
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
                        
                        const tooltipId = `${habit.id}-${day.date}`;
                        const isTooltipActive = activeTooltip?.id === tooltipId;

                        const handleDayClick = (e) => {
                          e.stopPropagation();
                          if (isTooltipActive) {
                            setActiveTooltip(null);
                          } else {
                            const rect = e.target.getBoundingClientRect();
                            const tooltipHeight = 140;
                            const tooltipWidth = 260;
                            
                            // Calculate initial position centered above the square
                            let x = rect.left + rect.width / 2;
                            let y = rect.top - tooltipHeight - 12;
                            
                            // Adjust if too close to top - show below instead
                            if (y < 20) {
                              y = rect.bottom + 12;
                            }
                            
                            // Adjust if too close to right edge
                            if (x + tooltipWidth / 2 > window.innerWidth - 20) {
                              x = window.innerWidth - tooltipWidth / 2 - 20;
                            }
                            
                            // Adjust if too close to left edge
                            if (x - tooltipWidth / 2 < 20) {
                              x = tooltipWidth / 2 + 20;
                            }
                            
                            // Ensure tooltip doesn't go below viewport
                            if (y + tooltipHeight > window.innerHeight - 20) {
                              y = rect.top - tooltipHeight - 12;
                            }
                            
                            setActiveTooltip({ 
                              id: tooltipId, 
                              x: Math.round(x), 
                              y: Math.round(y),
                              rect: rect 
                            });
                          }
                        };

                        return (
                          <div key={day.date} className={styles.heatmapDayWrapper}>
                            <div
                              className={`${styles.heatmapDay} ${day.completed ? styles.completed : ''} ${day.isFuture ? styles.future : ''}`}
                              style={{
                                '--habit-color': habit.color,
                              }}
                              onClick={handleDayClick}
                              title={day.completed 
                                ? `${habit.emoji} ${habit.name} - ${day.formattedDate}, ${day.weekday}`
                                : `${day.formattedDate}, ${day.weekday} - ${day.isFuture ? 'Future date' : 'No activity'}`
                              }
                            />
                            
                            {isTooltipActive && (
                              <div 
                                className={styles.heatmapTooltip}
                                style={{
                                  position: 'fixed',
                                  left: `${activeTooltip.x}px`,
                                  top: `${activeTooltip.y}px`,
                                  transform: 'translateX(-50%)',
                                  zIndex: 10000
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className={styles.habitTooltipContent}>
                                  {day.completed ? (
                                    <>
                                      <div className={styles.tooltipHeader}>
                                        <span className={styles.tooltipEmoji}>{habit.emoji}</span>
                                        <span className={styles.tooltipHabitName}>{habit.name}</span>
                                      </div>
                                      <div className={styles.tooltipDate}>{day.formattedDate}, {day.weekday}</div>
                                      <div className={styles.tooltipTime}>
                                        {day.completionTime 
                                          ? `Completed: ${new Date(day.completionTime).toLocaleString()}`
                                          : 'Completed (time not recorded)'
                                        }
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className={styles.tooltipDate}>{day.formattedDate}, {day.weekday}</div>
                                      <div className={styles.tooltipStatus}>
                                        {day.isFuture ? 'Future date' : 'No activity'}
                                      </div>
                                    </>
                                  )}
                                </div>
                                <div className={styles.tooltipArrow}></div>
                              </div>
                            )}
                          </div>
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

      {/* Badges Modal */}
      <BadgesModal
        isOpen={isBadgesModalOpen}
        onClose={() => setIsBadgesModalOpen(false)}
        statsData={statsData}
        badgeData={badgeSystem.all}
      />
    </div>
  );
};

export default StatsView; 