import { useState, useEffect, useMemo } from 'react';
import BadgesModal from '../components/BadgesModal';
import { getUserAchievements, BADGE_DEFINITIONS } from '../services/achievements';
import { auth } from '../services/firebase';
import { useHabits } from '../hooks/useHabits';
import { useCalendar } from '../hooks/useCalendar';
import { 
  getBestStreak, 
  getHabitStatsForRange, 
  generateHeatmapData 
} from '../utils/streakUtils';
import { getWeekBoundaries } from '../utils/dateUtils';
import styles from './AchievementsView.module.scss';

const AchievementsView = () => {
  const { habits, loading: habitsLoading } = useHabits();
  const { calendarEntries, streaks, loading: calendarLoading } = useCalendar(habits);
  const [achievements, setAchievements] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const loading = habitsLoading || calendarLoading;

  // Calculate enriched stats data (same as StatsView)
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
      
      return {
        habit,
        currentStreak,
        bestStreak,
        currentMonthStats,
        currentWeekStats,
        heatmapData,
        weeklyGoalPercentage,
        currentWeekProgress,
      };
    });
  }, [habits, calendarEntries, streaks]);

  // Calculate badge data from enriched stats
  const badgeData = useMemo(() => {
    if (!statsData) return [];
    
    return BADGE_DEFINITIONS.map(badge => ({
      ...badge,
      earned: badge.requirement(statsData),
      progress: badge.requirement(statsData) ? 100 : 0
    }));
  }, [statsData]);

  useEffect(() => {
    const loadUserAchievements = async () => {
      if (auth.currentUser && !loading) {
        try {
          const userAchievements = await getUserAchievements(auth.currentUser.uid);
          setAchievements(userAchievements);
        } catch (error) {
          console.error('Failed to load achievements:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadUserAchievements();
  }, [loading]);

  if (loading || isLoading) {
    return (
      <div className={styles.achievementsView}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading achievements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.achievementsView}>
      <div className={styles.header}>
        <h1>🏆 Your Achievements</h1>
        <p>Celebrate your progress and milestones on your habit journey</p>
      </div>
      
      <div className={styles.content}>
        <BadgesModal 
          isOpen={true} 
          onClose={() => {}} // No close functionality needed for dedicated page
          badgeData={badgeData}
          achievements={achievements}
          isFullPage={true}
        />
      </div>
    </div>
  );
};

export default AchievementsView; 