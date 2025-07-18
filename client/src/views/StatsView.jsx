import { useMemo, useState, useEffect } from 'react';
import { useHabits } from '../hooks/useHabits';
import { useCalendar } from '../hooks/useCalendar';
import { 
  getBestStreak, 
  getHabitStatsForRange, 
  generateHeatmapData,
  generateAggregatedHeatmapData 
} from '../utils/streakUtils';
import { getWeekBoundaries } from '../utils/dateUtils';
import BadgesModal from '../components/BadgesModal';
import AchievementCelebrationModal from '../components/AchievementCelebrationModal';
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
  const [celebrationAchievement, setCelebrationAchievement] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);

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
  const generateInsights = (habit, currentStreak, bestStreak, currentMonth, sevenDay) => {
    const insights = [];
    
    if (currentStreak === bestStreak && currentStreak > 0) {
      insights.push({ type: 'achievement', text: `🔥 New personal record: ${currentStreak} day streak!` });
    }
    
    if (currentMonth.completionRate >= 90) {
      insights.push({ type: 'success', text: `💪 Excellent consistency: ${Math.round(currentMonth.completionRate)}% completion rate` });
    } else if (currentMonth.completionRate < 50) {
      insights.push({ type: 'warning', text: `📈 Room for improvement: ${Math.round(currentMonth.completionRate)}% completion rate` });
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
    
    // Use current month instead of rolling 30 days for more accurate success rate
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get proper Sunday-Saturday week boundaries for current week
    const currentWeekBoundaries = getWeekBoundaries(now);
    
    return habits.map(habit => {
      const currentStreak = streaks[habit.id] || 0;
      const bestStreak = getBestStreak(habit.id, calendarEntries);
      const currentMonthStats = getHabitStatsForRange(
        habit.id, 
        currentMonthStart.toISOString().split('T')[0],
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
      const insights = generateInsights(habit, currentStreak, bestStreak, currentMonthStats, currentWeekStats);
      
      return {
        habit,
        currentStreak,
        bestStreak,
        currentMonthStats,
        currentWeekStats,
        heatmapData,
        weeklyGoalPercentage,
        currentWeekProgress,
        insights,
      };
    });
  }, [habits, calendarEntries, streaks]);

  // Generate aggregated heatmap data (GitHub-style)
  const aggregatedHeatmapData = useMemo(() => {
    if (!habits.length || !Object.keys(calendarEntries).length) return null;
    
    return generateAggregatedHeatmapData(habits, calendarEntries);
  }, [habits, calendarEntries]);

  // Calculate overall insights
  const overallInsights = useMemo(() => {
    if (!statsData) return [];
    
    const insights = [];
    const totalHabits = statsData.length;
    const activeStreaks = statsData.filter(d => d.currentStreak > 0).length;
    const excellentHabits = statsData.filter(d => d.currentMonthStats.completionRate >= 80).length;
    const avgCompletionRate = Math.round(
      statsData.reduce((sum, d) => sum + d.currentMonthStats.completionRate, 0) / totalHabits
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
    
    const totalCompletions = statsData.reduce((sum, d) => sum + d.currentMonthStats.completedDays, 0);
    const maxStreak = Math.max(...statsData.map(d => d.bestStreak));
    const currentMaxStreak = Math.max(...statsData.map(d => d.currentStreak));
    const perfectWeeks = statsData.filter(d => d.weeklyGoalPercentage >= 100).length;
    const avgCompletionRate = Math.round(
      statsData.reduce((sum, d) => sum + d.currentMonthStats.completionRate, 0) / statsData.length
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
          achievements = await backfillUserAchievements(userInfo.uid, statsData, {
            calendarEntries,
            habitCreationDates: {}, // TODO: Add habit creation dates tracking
            statsVisits: 0 // No stats visits for backfill
          });
        }
        
        // Check for new achievements based on current stats
        const { newCompletions, allAchievements } = await checkAndUpdateAchievements(userInfo.uid, statsData, {
          calendarEntries,
          habitCreationDates: {}, // TODO: Add habit creation dates tracking
          statsVisits: 1 // Increment visit count for Stats Lover badge
        });
        
        if (newCompletions.length > 0) {
          console.log('New achievements earned:', newCompletions.map(a => a.title));
          
          // Show celebration modal for the first new achievement
          const firstNewAchievement = newCompletions[0];
          setCelebrationAchievement(firstNewAchievement);
          setShowCelebration(true);
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
        <h1>
          <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.statsIcon}>
            <rect width="50" height="50"/>
            <g id="Frame 1">
              <rect width="50" height="50"/>
              <rect id="Rectangle 3" x="2" y="2" width="46" height="46" rx="6" fill="url(#paint0_linear_stats)"/>
              <g id="Group 1">
                <rect id="bar-1" x="11" y="26.25" width="7" height="14" rx="1" fill="white"/>
                <rect id="bar-2" x="21.5" y="9" width="7" height="31.5" rx="1" fill="white"/>
                <rect id="bar-3" x="32" y="18.3333" width="7" height="22.1667" rx="1" fill="white"/>
              </g>
            </g>
            <defs>
              <linearGradient id="paint0_linear_stats" x1="25" y1="2" x2="25" y2="48" gradientUnits="userSpaceOnUse">
                <stop stopColor="#CF4BA5"/>
                <stop offset="1" stopColor="#6C65EF"/>
              </linearGradient>
            </defs>
          </svg>
          Your Habit Stats
        </h1>
        <p>Comprehensive insights into your habit-building journey</p>
      </div>

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
              {statsData.reduce((sum, { currentMonthStats }) => sum + currentMonthStats.completedDays, 0)}
            </div>
            <div className={styles.statLabel}>Habits Tracked This Month</div>
          </div>
          <div className={styles.quickStat}>
            <div className={styles.statValue}>
              {Math.round(
                statsData.reduce((sum, { currentMonthStats }) => sum + currentMonthStats.completionRate, 0) / 
                statsData.length
              )}%
            </div>
            <div className={styles.statLabel}>Monthly Success Rate</div>
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
          {statsData.map(({ habit, currentStreak, bestStreak, currentMonthStats, currentWeekStats, weeklyGoalPercentage, currentWeekProgress, insights }) => (
            <div 
              key={habit.id} 
              className={styles.habitDetailCard}
              style={{ '--habit-color': habit.color }}
            >
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
                  <div className={styles.metricLabel}>Current Streak</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricValue}>{bestStreak}</div>
                  <div className={styles.metricLabel}>Best Streak</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricValue}>{currentMonthStats.completedDays}</div>
                  <div className={styles.metricLabel}>This Month</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricValue}>{Math.round(currentMonthStats.completionRate)}%</div>
                  <div className={styles.metricLabel}>Success Rate</div>
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

      {/* Yearly Aggregated Heatmap */}
      {aggregatedHeatmapData && (
        <div className={styles.heatmapSection}>
          <h2>📅 Activity Overview</h2>
          <div className={styles.habitHeatmap}>
            <div className={styles.heatmapHeader}>
              <span className={styles.habitEmoji}>📊</span>
              <h3>All Habits Combined</h3>
              <span className={styles.yearLabel}>{new Date().getFullYear()}</span>
            </div>
            
            {/* Month labels, day labels and heatmap grid */}
            <div className={styles.heatmapContainer}>
              {/* Month labels */}
              <div className={styles.monthLabels}>
                {(() => {
                  const monthLabels = [];
                  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  
                  // Group days by week
                  const daysByWeek = {};
                  aggregatedHeatmapData.forEach(day => {
                    if (!daysByWeek[day.week]) {
                      daysByWeek[day.week] = {};
                    }
                    daysByWeek[day.week][day.dayOfWeek] = day;
                  });
                  
                  const sortedWeeks = Object.keys(daysByWeek).sort((a, b) => Number(a) - Number(b));
                  const totalWeeks = sortedWeeks.length;
                  
                  // Find the first Sunday of each month for label positioning
                  const monthPositions = [];
                  let lastMonth = null;
                  
                  sortedWeeks.forEach((weekNum, weekIndex) => {
                    const week = daysByWeek[weekNum];
                    
                    // Check the first day (Sunday) of this week
                    const sunday = week[0];
                    if (sunday) {
                      const date = new Date(sunday.date);
                      const month = date.getMonth();
                      
                      // If this is a new month, record its position
                      if (month !== lastMonth) {
                        monthPositions.push({
                          month: month,
                          weekIndex: weekIndex,
                          date: date
                        });
                        lastMonth = month;
                      }
                    }
                  });
                  
                  // Create month labels
                  monthPositions.forEach((monthPos, index) => {
                    // Calculate the width for this month
                    const nextMonthPos = monthPositions[index + 1];
                    const endWeek = nextMonthPos ? nextMonthPos.weekIndex : totalWeeks;
                    const weekSpan = endWeek - monthPos.weekIndex;
                    
                    // Only show months that span at least 2 weeks
                    if (weekSpan >= 2) {
                      const leftPercent = (monthPos.weekIndex / totalWeeks) * 100;
                      const widthPercent = (weekSpan / totalWeeks) * 100;
                      
                      monthLabels.push(
                        <div 
                          key={monthPos.month} 
                          className={styles.monthLabel}
                          style={{ 
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`
                          }}
                        >
                          {months[monthPos.month]}
                        </div>
                      );
                    }
                  });
                  
                  return monthLabels;
                })()}
              </div>


                  
              <div className={styles.heatmapGrid}>
                {(() => {
                  // Create 2D grid for GitHub-style layout (weeks x days of week)
                  const weeks = [];
                  const daysByWeek = {};
                  
                  // Group days by week number and day of week
                  aggregatedHeatmapData.forEach(day => {
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

                  return weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className={styles.heatmapWeekColumn}>
                      {/* Create rows for each day of the week (Sun-Sat) */}
                      {[0, 1, 2, 3, 4, 5, 6].map(dayOfWeek => {
                        const day = week[dayOfWeek];
                        if (!day) {
                          return <div key={dayOfWeek} className={styles.heatmapDayEmpty}></div>;
                        }
                        
                        const tooltipId = `aggregated-${day.date}`;
                        const isTooltipActive = activeTooltip?.id === tooltipId;

                        const handleDayClick = (e) => {
                          e.stopPropagation();
                          if (isTooltipActive) {
                            setActiveTooltip(null);
                          } else {
                            const rect = e.target.getBoundingClientRect();
                            const tooltipHeight = 140;
                            const tooltipWidth = 280;
                            
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
                              className={`${styles.heatmapDay} ${styles[`intensity${day.intensity}`]} ${day.isFuture ? styles.future : ''}`}
                              onClick={handleDayClick}
                              title={day.intensity > 0 
                                ? `${day.formattedDate}, ${day.weekday} - ${day.completedCount}/${day.totalHabits} habits completed (${Math.round(day.completionRate * 100)}%)`
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
                                  <div className={styles.tooltipHeader}>
                                    <span className={styles.tooltipEmoji}>📊</span>
                                    <span className={styles.tooltipHabitName}>Daily Progress</span>
                                  </div>
                                  <div className={styles.tooltipDate}>{day.formattedDate}, {day.weekday}</div>
                                  {day.intensity > 0 ? (
                                    <div className={styles.tooltipStats}>
                                      <div className={styles.completionStat}>
                                        {day.completedCount}/{day.totalHabits} habits completed
                                      </div>
                                      <div className={styles.completionRate}>
                                        {Math.round(day.completionRate * 100)}% completion rate
                                      </div>
                                    </div>
                                  ) : (
                                    <div className={styles.tooltipStatus}>
                                      {day.isFuture ? 'Future date' : 'No habits completed'}
                                    </div>
                                  )}
                                </div>
                                <div className={styles.tooltipArrow}></div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Intensity Legend */}
            <div className={styles.heatmapLegend}>
              <span className={styles.legendText}>Less</span>
              <div className={styles.legendSquares}>
                <div className={`${styles.legendSquare} ${styles.intensity0}`}></div>
                <div className={`${styles.legendSquare} ${styles.intensity1}`}></div>
                <div className={`${styles.legendSquare} ${styles.intensity2}`}></div>
                <div className={`${styles.legendSquare} ${styles.intensity3}`}></div>
                <div className={`${styles.legendSquare} ${styles.intensity4}`}></div>
              </div>
              <span className={styles.legendText}>More</span>
            </div>
          </div>
        </div>
      )}

      {/* Achievement Badges */}
      {badgeSystem.featured.length > 0 && (
        <div className={styles.achievementsSection}>
          <div className={styles.achievementsHeader}>
            <div className={styles.headerText}>
              <h2>
                <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.achievementIcon}>
                  <rect width="50" height="50" fill="white"/>
                  <rect x="2" y="2" width="46" height="46" rx="6" fill="url(#paint0_linear_achievements_stats)"/>
                  <path d="M32.541 41.1309H17.46V37.8848H32.541V41.1309ZM35.8203 9.86914C35.8394 10.5002 35.8428 11.1583 35.832 11.832C37.0938 11.3621 38.434 11.1995 39.5947 11.4531C41.3114 11.8262 42.477 12.9917 42.877 14.7324C43.3991 17.0053 42.2501 19.612 39.6416 22.0723C37.5863 24.0099 34.8285 25.6217 31.917 26.6172C30.711 28.2979 29.1666 29.6523 27.207 30.4756C27.4928 31.5067 28.4955 34.4935 30.9189 36.3213H19.082C21.5052 34.4933 22.5084 31.5067 22.7939 30.4756C20.8344 29.6524 19.2894 28.2986 18.083 26.6182C15.1712 25.6226 12.4145 24.0099 10.3594 22.0723C7.75119 19.6125 6.60131 17.0062 7.12305 14.7334C7.52264 12.9924 8.68855 11.8263 10.4053 11.4531C11.5663 11.1994 12.907 11.362 14.1689 11.832C14.1577 11.1583 14.1606 10.5002 14.1797 9.86914H35.8203ZM14.3086 14.6445C13.2398 13.9913 11.942 13.661 10.9473 13.8779C10.1936 14.0423 9.75781 14.4888 9.57617 15.2832C9.267 16.6292 10.2085 18.4945 12.0947 20.2744C13.2435 21.358 14.6526 22.3213 16.1865 23.1094C15.1206 20.4694 14.5514 17.4936 14.3086 14.6445ZM39.0527 13.8789C38.0578 13.6625 36.7601 13.9916 35.6914 14.6445C35.4489 17.4937 34.8798 20.4693 33.8135 23.1094C35.3475 22.321 36.7565 21.3576 37.9053 20.2744C39.7915 18.4948 40.7329 16.6294 40.4238 15.2832C40.2422 14.4888 39.8064 14.0433 39.0527 13.8789Z" fill="white"/>
                  <path id="achievement-star-stats" d="M22.3425 24C22.4538 24 22.5659 23.9719 22.6693 23.9154L24.824 22.7323C24.9341 22.6718 25.0659 22.6718 25.176 22.7323L27.3307 23.9149C27.5689 24.0451 27.8516 24.0241 28.0687 23.8592C28.2863 23.6943 28.393 23.4203 28.3476 23.1441L27.936 20.6391C27.915 20.511 27.9557 20.3804 28.0448 20.2896L29.7879 18.5159C29.9802 18.3199 30.0483 18.0327 29.9651 17.7661C29.882 17.4996 29.6652 17.3088 29.3993 17.2685L26.9901 16.9028C26.8671 16.8839 26.7604 16.8032 26.7053 16.6871L25.6284 14.4078C25.5095 14.1565 25.2688 14 25 14C24.7312 14 24.4905 14.1561 24.3717 14.4078L23.2942 16.6871C23.2392 16.8037 23.1325 16.8844 23.0095 16.9028L20.6002 17.2685C20.3344 17.3088 20.1176 17.4996 20.0349 17.7661C19.9517 18.0327 20.0198 18.3204 20.2121 18.5159L21.9557 20.2901C22.0447 20.3808 22.0855 20.5115 22.0645 20.6395L21.6528 23.1445C21.6075 23.4208 21.7142 23.6953 21.9317 23.8597C22.054 23.9526 22.198 24 22.3425 24H22.3425Z" fill="url(#paint1_radial_achievements_stats)"/>
                  <defs>
                    <linearGradient id="paint0_linear_achievements_stats" x1="25" y1="2" x2="25" y2="48" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#CF4BA5"/>
                      <stop offset="1" stopColor="#6C65EF"/>
                    </linearGradient>
                    <radialGradient id="paint1_radial_achievements_stats" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(25 19) rotate(90) scale(5)">
                      <stop stopColor="#CC4CA7" stopOpacity="0.8"/>
                      <stop offset="1" stopColor="#6F65ED" stopOpacity="0.5"/>
                    </radialGradient>
                  </defs>
                </svg>
                Your Achievements
              </h2>
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

      {/* Badges Modal */}
      <BadgesModal
        isOpen={isBadgesModalOpen}
        onClose={() => setIsBadgesModalOpen(false)}
        statsData={statsData}
        badgeData={badgeSystem.all}
      />

      {/* Achievement Celebration Modal */}
      <AchievementCelebrationModal
        achievement={celebrationAchievement}
        isOpen={showCelebration}
        onClose={() => {
          setShowCelebration(false);
          setCelebrationAchievement(null);
        }}
      />
    </div>
  );
};

export default StatsView; 