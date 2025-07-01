import { db } from './firebase';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

// Badge definitions with completion tracking type
export const BADGE_DEFINITIONS = [
  // Permanent Badges (once earned, always earned)
  {
    id: 'first_steps',
    emoji: '👶',
    title: 'First Steps',
    description: 'Complete your very first habit',
    category: 'Milestones',
    rarity: 'common',
    type: 'permanent',
    requirement: (data) => data.some(d => d.thirtyDayStats.completedDays > 0)
  },
  {
    id: 'habit_explorer',
    emoji: '🧭',
    title: 'Habit Explorer',
    description: 'Create your first habit',
    category: 'Mastery',
    rarity: 'common',
    type: 'permanent',
    requirement: (data) => data.length > 0
  },
  {
    id: 'century_club',
    emoji: '💯',
    title: 'Century Club',
    description: '100 total habit completions',
    category: 'Milestones',
    rarity: 'uncommon',
    type: 'permanent',
    requirement: (data) => data.reduce((sum, d) => sum + d.thirtyDayStats.completedDays, 0) >= 100
  },

  // Dynamic Badges (can be lost and re-earned)
  {
    id: 'fire_starter',
    emoji: '🔥',
    title: 'Fire Starter',
    description: 'Complete a 3-day streak',
    category: 'Streaks',
    rarity: 'common',
    type: 'dynamic',
    requirement: (data) => Math.max(...data.map(d => d.currentStreak)) >= 3
  },
  {
    id: 'flame_keeper',
    emoji: '🔥',
    title: 'Flame Keeper',
    description: 'Maintain a 7-day streak',
    category: 'Streaks',
    rarity: 'common',
    type: 'dynamic',
    requirement: (data) => Math.max(...data.map(d => d.currentStreak)) >= 7
  },
  {
    id: 'inferno_master',
    emoji: '🔥',
    title: 'Inferno Master',
    description: 'Achieve a 21-day streak',
    category: 'Streaks',
    rarity: 'uncommon',
    type: 'dynamic',
    requirement: (data) => Math.max(...data.map(d => d.bestStreak)) >= 21
  },
  {
    id: 'multi_tasker',
    emoji: '🤹',
    title: 'Multi-Tasker',
    description: 'Track 3 habits simultaneously',
    category: 'Mastery',
    rarity: 'common',
    type: 'dynamic',
    requirement: (data) => data.length >= 3
  },
  {
    id: 'habit_collector',
    emoji: '🗂️',
    title: 'Habit Collector',
    description: 'Track 5+ habits simultaneously',
    category: 'Mastery',
    rarity: 'uncommon',
    type: 'dynamic',
    requirement: (data) => data.length >= 5
  },
  {
    id: 'lifestyle_designer',
    emoji: '🏗️',
    title: 'Lifestyle Designer',
    description: 'Track 10+ habits simultaneously',
    category: 'Mastery',
    rarity: 'rare',
    type: 'dynamic',
    requirement: (data) => data.length >= 10
  },
  {
    id: 'goal_getter',
    emoji: '🎯',
    title: 'Goal Getter',
    description: 'Achieve your first weekly goal',
    category: 'Goals',
    rarity: 'common',
    type: 'dynamic',
    requirement: (data) => data.some(d => d.weeklyGoalPercentage >= 100)
  },
  {
    id: 'goal_crusher',
    emoji: '🎯',
    title: 'Goal Crusher',
    description: '3+ perfect weeks',
    category: 'Goals',
    rarity: 'uncommon',
    type: 'dynamic',
    requirement: (data) => data.filter(d => d.weeklyGoalPercentage >= 100).length >= 3
  },
  {
    id: 'target_hunter',
    emoji: '🎯',
    title: 'Target Hunter',
    description: 'Hit 5 weekly goals',
    category: 'Goals',
    rarity: 'rare',
    type: 'dynamic',
    requirement: (data) => data.filter(d => d.weeklyGoalPercentage >= 100).length >= 5
  },
  {
    id: 'perfect_week',
    emoji: '⭐',
    title: 'Perfect Week',
    description: '100% completion for 7 days straight',
    category: 'Consistency',
    rarity: 'uncommon',
    type: 'dynamic',
    requirement: (data) => data.some(d => d.weeklyGoalPercentage >= 100)
  },
  {
    id: 'consistency_king',
    emoji: '👑',
    title: 'Consistency Royalty',
    description: '90%+ completion rate for 30 days',
    category: 'Consistency',
    rarity: 'rare',
    type: 'dynamic',
    requirement: (data) => data.some(d => d.thirtyDayStats.completionRate >= 90)
  }
];

/**
 * Get user's achievement data from Firebase
 */
export const getUserAchievements = async (userId) => {
  try {
    const achievementsRef = collection(db, 'users', userId, 'achievements');
    const snapshot = await getDocs(achievementsRef);
    
    const achievements = {};
    snapshot.forEach(doc => {
      achievements[doc.id] = doc.data();
    });
    
    return achievements;
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    return {};
  }
};

/**
 * Check and update achievements based on current stats
 */
export const checkAndUpdateAchievements = async (userId, statsData) => {
  try {
    const currentAchievements = await getUserAchievements(userId);
    const newCompletions = [];
    const now = new Date();
    
    for (const badge of BADGE_DEFINITIONS) {
      const isCurrentlyEarned = badge.requirement(statsData);
      const existingAchievement = currentAchievements[badge.id];
      
      if (isCurrentlyEarned) {
        if (!existingAchievement) {
          // First time earning this badge
          const achievementData = {
            badgeId: badge.id,
            title: badge.title,
            description: badge.description,
            category: badge.category,
            rarity: badge.rarity,
            emoji: badge.emoji,
            type: badge.type,
            firstCompletedAt: now,
            lastCompletedAt: now,
            completionCount: 1,
            isCurrentlyEarned: true,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          };
          
          await setDoc(doc(db, 'users', userId, 'achievements', badge.id), achievementData);
          newCompletions.push(achievementData);
          
        } else if (badge.type === 'dynamic') {
          // For dynamic badges, check if we need to update
          if (!existingAchievement.isCurrentlyEarned) {
            // Re-earned a dynamic badge
            const updatedData = {
              lastCompletedAt: now,
              completionCount: (existingAchievement.completionCount || 1) + 1,
              isCurrentlyEarned: true,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            };
            
            await updateDoc(doc(db, 'users', userId, 'achievements', badge.id), updatedData);
            newCompletions.push({ ...existingAchievement, ...updatedData });
          }
        }
      } else if (existingAchievement && badge.type === 'dynamic') {
        // Lost a dynamic badge
        if (existingAchievement.isCurrentlyEarned) {
          await updateDoc(doc(db, 'users', userId, 'achievements', badge.id), {
            isCurrentlyEarned: false
          });
        }
      }
    }
    
    return {
      newCompletions,
      allAchievements: await getUserAchievements(userId)
    };
  } catch (error) {
    console.error('Error checking achievements:', error);
    return { newCompletions: [], allAchievements: {} };
  }
};

/**
 * Backfill achievements for existing users
 */
export const backfillUserAchievements = async (userId, statsData) => {
  try {
    console.log('Backfilling achievements for user:', userId);
    const currentAchievements = await getUserAchievements(userId);
    
    // Only backfill if user has no achievements yet
    if (Object.keys(currentAchievements).length > 0) {
      return currentAchievements;
    }
    
    const backfilledAchievements = {};
    const now = new Date();
    
    for (const badge of BADGE_DEFINITIONS) {
      const isEarned = badge.requirement(statsData);
      
      if (isEarned) {
        const achievementData = {
          badgeId: badge.id,
          title: badge.title,
          description: badge.description,
          category: badge.category,
          rarity: badge.rarity,
          emoji: badge.emoji,
          type: badge.type,
          firstCompletedAt: now, // Backfilled date
          lastCompletedAt: now,
          completionCount: 1,
          isCurrentlyEarned: true,
          isBackfilled: true, // Mark as backfilled
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
        
        await setDoc(doc(db, 'users', userId, 'achievements', badge.id), achievementData);
        backfilledAchievements[badge.id] = achievementData;
      }
    }
    
    console.log('Backfilled achievements:', Object.keys(backfilledAchievements).length);
    return backfilledAchievements;
  } catch (error) {
    console.error('Error backfilling achievements:', error);
    return {};
  }
};

/**
 * Format completion timestamp for display
 */
export const formatCompletionDate = (timestamp, timezone) => {
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Unknown date';
  }
};

/**
 * Get display text for achievement completion
 */
export const getAchievementDisplayText = (achievement) => {
  if (!achievement) return '';
  
  const formattedDate = formatCompletionDate(achievement.lastCompletedAt, achievement.timezone);
  
  if (achievement.type === 'permanent') {
    return `Earned on ${formattedDate}`;
  } else {
    // Dynamic badges show count if > 1
    if (achievement.completionCount > 1) {
      return `${achievement.title} ×${achievement.completionCount}\nLast earned: ${formattedDate}`;
    } else {
      return `Earned on ${formattedDate}`;
    }
  }
};

/**
 * Merge Firebase achievements with calculated badge data
 */
export const mergeAchievementsWithBadgeData = (badgeData, firebaseAchievements) => {
  return badgeData.map(badge => {
    const achievement = firebaseAchievements[badge.id];
    
    return {
      ...badge,
      achievement,
      hasCompletionData: !!achievement,
      displayText: achievement ? getAchievementDisplayText(achievement) : '',
      completionCount: achievement?.completionCount || 0,
      firstCompletedAt: achievement?.firstCompletedAt,
      lastCompletedAt: achievement?.lastCompletedAt
    };
  });
};

/**
 * Manual test function for debugging achievements
 * Call from browser console: window.testAchievements()
 */
export const testAchievements = async () => {
  const { getUserInfo } = await import('./firebase');
  
  console.log('🧪 TESTING ACHIEVEMENTS SYSTEM');
  
  const userInfo = getUserInfo();
  if (!userInfo?.uid) {
    console.error('❌ No user logged in');
    return;
  }
  
  console.log('👤 Current user:', userInfo.uid);
  
  // Test with minimal data to trigger "Habit Explorer"
  const testStatsData = [
    {
      habit: { id: 'test1', name: 'Test Habit' },
      thirtyDayStats: { completedDays: 0 },
      currentStreak: 0,
      bestStreak: 0,
      weeklyGoalPercentage: 0
    }
  ];
  
  console.log('📊 Test stats data:', testStatsData);
  
  try {
    const result = await checkAndUpdateAchievements(userInfo.uid, testStatsData);
    console.log('🎯 Test result:', result);
    return result;
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Make it available globally for testing
if (typeof window !== 'undefined') {
  window.testAchievements = testAchievements;
} 