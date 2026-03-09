// supabaseAchievements.js
// Achievements operations using Supabase (replaces Firebase Firestore)
import { supabase } from './supabase';

// Import badge definitions from original achievements file
// These are just data definitions, no Firebase dependency
export { BADGE_DEFINITIONS } from './achievements';

// Re-export helper functions that don't need Firebase
export { 
  formatCompletionDate, 
  getAchievementDisplayText,
  mergeAchievementsWithBadgeData 
} from './achievements';

// ============================================
// SUPABASE ACHIEVEMENT OPERATIONS
// ============================================

/**
 * Get user's achievement data from Supabase
 */
export const getUserAchievements = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    
    // Return as object keyed by badge_id (Firebase format compatibility)
    const achievements = {};
    data.forEach(achievement => {
      achievements[achievement.badge_id] = {
        badgeId: achievement.badge_id,
        title: achievement.title,
        description: achievement.description,
        category: achievement.category,
        rarity: achievement.rarity,
        emoji: achievement.emoji,
        type: achievement.type,
        firstCompletedAt: achievement.first_completed_at,
        lastCompletedAt: achievement.last_completed_at,
        completionCount: achievement.completion_count,
        isCurrentlyEarned: achievement.is_currently_earned,
        isBackfilled: achievement.is_backfilled,
        timezone: achievement.timezone,
      };
    });
    
    return achievements;
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    return {};
  }
};

/**
 * Create or update an achievement
 */
const upsertAchievement = async (userId, achievementData) => {
  const { error } = await supabase
    .from('achievements')
    .upsert({
      user_id: userId,
      badge_id: achievementData.badgeId,
      title: achievementData.title,
      description: achievementData.description,
      category: achievementData.category,
      rarity: achievementData.rarity,
      emoji: achievementData.emoji,
      type: achievementData.type,
      first_completed_at: achievementData.firstCompletedAt,
      last_completed_at: achievementData.lastCompletedAt,
      completion_count: achievementData.completionCount,
      is_currently_earned: achievementData.isCurrentlyEarned,
      is_backfilled: achievementData.isBackfilled || false,
      timezone: achievementData.timezone,
    }, { onConflict: 'user_id,badge_id' });
  
  if (error) throw error;
};

/**
 * Update achievement fields
 */
const updateAchievementFields = async (userId, badgeId, updates) => {
  const dbUpdates = {};
  if (updates.lastCompletedAt !== undefined) dbUpdates.last_completed_at = updates.lastCompletedAt;
  if (updates.completionCount !== undefined) dbUpdates.completion_count = updates.completionCount;
  if (updates.isCurrentlyEarned !== undefined) dbUpdates.is_currently_earned = updates.isCurrentlyEarned;
  if (updates.timezone !== undefined) dbUpdates.timezone = updates.timezone;
  
  const { error } = await supabase
    .from('achievements')
    .update(dbUpdates)
    .eq('user_id', userId)
    .eq('badge_id', badgeId);
  
  if (error) throw error;
};

/**
 * Check and update achievements based on current stats
 */
export const checkAndUpdateAchievements = async (userId, statsData, extraData = {}) => {
  // Import BADGE_DEFINITIONS dynamically to avoid circular dependencies
  const { BADGE_DEFINITIONS } = await import('./achievements');
  
  try {
    const currentAchievements = await getUserAchievements(userId);
    const newCompletions = [];
    const now = new Date().toISOString();
    
    const { 
      calendarEntries = {}, 
      habitCreationDates = {}, 
      statsVisits = 0 
    } = extraData;
    
    const earnedBadgeCount = Object.values(currentAchievements)
      .filter(achievement => achievement.isCurrentlyEarned).length;
    
    for (const badge of BADGE_DEFINITIONS) {
      const isCurrentlyEarned = badge.requirement(
        statsData, 
        calendarEntries, 
        habitCreationDates, 
        earnedBadgeCount, 
        statsVisits
      );
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
          
          await upsertAchievement(userId, achievementData);
          newCompletions.push(achievementData);
          
        } else if (badge.type === 'dynamic') {
          if (!existingAchievement.isCurrentlyEarned) {
            // Re-earned a dynamic badge
            const updatedData = {
              lastCompletedAt: now,
              completionCount: (existingAchievement.completionCount || 1) + 1,
              isCurrentlyEarned: true,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            };
            
            await updateAchievementFields(userId, badge.id, updatedData);
            newCompletions.push({ ...existingAchievement, ...updatedData });
          }
        }
      } else if (existingAchievement && badge.type === 'dynamic') {
        // Lost a dynamic badge
        if (existingAchievement.isCurrentlyEarned) {
          await updateAchievementFields(userId, badge.id, { isCurrentlyEarned: false });
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
export const backfillUserAchievements = async (userId, statsData, extraData = {}) => {
  const { BADGE_DEFINITIONS } = await import('./achievements');
  
  try {
    console.log('Backfilling achievements for user:', userId);
    const currentAchievements = await getUserAchievements(userId);
    
    // Only backfill if user has no achievements yet
    if (Object.keys(currentAchievements).length > 0) {
      return currentAchievements;
    }
    
    const backfilledAchievements = {};
    const now = new Date().toISOString();
    
    const { 
      calendarEntries = {}, 
      habitCreationDates = {}, 
      statsVisits = 0 
    } = extraData;
    
    const earnedBadgeCount = 0;
    
    for (const badge of BADGE_DEFINITIONS) {
      const isEarned = badge.requirement(
        statsData, 
        calendarEntries, 
        habitCreationDates, 
        earnedBadgeCount, 
        statsVisits
      );
      
      if (isEarned) {
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
          isBackfilled: true,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
        
        await upsertAchievement(userId, achievementData);
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
