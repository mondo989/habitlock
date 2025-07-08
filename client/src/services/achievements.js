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
    requirement: (data) => data.some(d => d.currentMonthStats.completedDays > 0)
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
    requirement: (data) => data.reduce((sum, d) => sum + d.currentMonthStats.completedDays, 0) >= 100
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
    description: '90%+ completion rate this month',
    category: 'Consistency',
    rarity: 'rare',
    type: 'dynamic',
    requirement: (data) => data.some(d => d.currentMonthStats.completionRate >= 90)
  },
  
  // New Advanced Achievements
  {
    id: 'month_master',
    emoji: '📅',
    title: 'Month Master',
    description: 'Complete a habit every day for 30 days',
    category: 'Consistency',
    rarity: 'uncommon',
    type: 'permanent',
    requirement: (data) => Math.max(...data.map(d => d.bestStreak)) >= 30
  },
  {
    id: 'streak_titan',
    emoji: '⚡',
    title: 'Streak Titan',
    description: 'Achieve a 50-day streak',
    category: 'Streaks',
    rarity: 'rare',
    type: 'permanent',
    requirement: (data) => Math.max(...data.map(d => d.bestStreak)) >= 50
  },
  {
    id: 'habit_machine',
    emoji: '🤖',
    title: 'Habit Machine',
    description: '500 total habit completions',
    category: 'Milestones',
    rarity: 'rare',
    type: 'permanent',
    requirement: (data) => data.reduce((sum, d) => sum + d.currentMonthStats.completedDays, 0) >= 500
  },
  {
    id: 'multi_streak_master',
    emoji: '🌟',
    title: 'Multi-Streak Master',
    description: 'Maintain 3+ habits with 7-day streaks',
    category: 'Streaks',
    rarity: 'uncommon',
    type: 'dynamic',
    requirement: (data) => data.filter(d => d.currentStreak >= 7).length >= 3
  },
  {
    id: 'perfect_month',
    emoji: '💎',
    title: 'Perfect Month',
    description: '100% completion rate this month',
    category: 'Consistency',
    rarity: 'rare',
    type: 'dynamic',
    requirement: (data) => data.some(d => d.currentMonthStats.completionRate >= 100)
  },
  {
    id: 'dedication_legend',
    emoji: '🏆',
    title: 'Dedication Legend',
    description: '1000 total habit completions',
    category: 'Milestones',
    rarity: 'legendary',
    type: 'permanent',
    requirement: (data) => data.reduce((sum, d) => sum + d.currentMonthStats.completedDays, 0) >= 1000
  },

  // New Achievement Badges
  {
    id: 'comeback_kid',
    emoji: '🏅',
    title: 'Comeback Kid',
    description: 'Bounce back after 7 days of inactivity and complete a habit',
    category: 'Resilience',
    rarity: 'uncommon',
    type: 'permanent',
    requirement: (data, calendarEntries) => {
      if (!calendarEntries) return false;
      // Complex logic - needs calendar entries to detect gaps and returns
      return checkComebackPattern(data, calendarEntries);
    }
  },
  {
    id: 'streak_saver',
    emoji: '🧯',
    title: 'Streak Saver',
    description: 'Miss a day, then return the next day and log your habit',
    category: 'Resilience',
    rarity: 'common',
    type: 'permanent',
    requirement: (data, calendarEntries) => {
      if (!calendarEntries) return false;
      // Complex logic - needs calendar entries to detect miss+recovery pattern
      return checkStreakSaverPattern(data, calendarEntries);
    }
  },
  {
    id: 'seasoned_tracker',
    emoji: '🍂',
    title: 'Seasoned Tracker',
    description: 'Log a habit during all four seasons',
    category: 'Consistency',
    rarity: 'rare',
    type: 'permanent',
    requirement: (data, calendarEntries) => {
      if (!calendarEntries) return false;
      return checkSeasonalPattern(data, calendarEntries);
    }
  },
  {
    id: 'custom_coder',
    emoji: '🎨',
    title: 'Custom Coder',
    description: 'Create and complete a custom habit for 7 days straight',
    category: 'Creativity',
    rarity: 'uncommon',
    type: 'permanent',
    requirement: (data) => {
      // For now, any habit with 7+ day streak counts as "custom"
      return data.some(d => d.currentStreak >= 7);
    }
  },
  {
    id: 'milestone_remix',
    emoji: '🔄',
    title: 'Milestone Remix',
    description: 'Re-complete your first habit after 100 days',
    category: 'Nostalgia',
    rarity: 'rare',
    type: 'permanent',
    requirement: (data, calendarEntries, habitCreationDates) => {
      if (!calendarEntries || !habitCreationDates) return false;
      return checkMilestoneRemixPattern(data, calendarEntries, habitCreationDates);
    }
  },

  // Meta Badges
  {
    id: 'meta_mastery',
    emoji: '🎖️',
    title: 'Meta Mastery',
    description: 'Unlock 10 unique badges',
    category: 'Meta',
    rarity: 'rare',
    type: 'dynamic',
    requirement: (data, calendarEntries, habitCreationDates, earnedBadgeCount) => {
      return (earnedBadgeCount || 0) >= 10;
    }
  },
  {
    id: 'time_traveler',
    emoji: '⌛',
    title: 'Time Traveler',
    description: 'Habit tracked at least once in 3 different months',
    category: 'Meta',
    rarity: 'uncommon',
    type: 'permanent',
    requirement: (data, calendarEntries) => {
      if (!calendarEntries) return false;
      return checkTimeTravelerPattern(calendarEntries);
    }
  },
  {
    id: 'stats_lover',
    emoji: '📈',
    title: 'Stats Lover',
    description: 'Visit the Stats tab 10 times',
    category: 'Meta',
    rarity: 'common',
    type: 'permanent',
    requirement: (data, calendarEntries, habitCreationDates, earnedBadgeCount, statsVisits) => {
      return (statsVisits || 0) >= 10;
    }
  },
  {
    id: 'beta_supporter',
    emoji: '🧪',
    title: 'Beta Supporter',
    description: 'Active user during pre-launch phase',
    category: 'Meta',
    rarity: 'legendary',
    type: 'permanent',
    requirement: (data, calendarEntries, habitCreationDates) => {
      // All current users get this badge as early adopters
      return data.length > 0;
    }
  },

  // Time-based Achievements
  {
    id: 'power_hour',
    emoji: '⚡',
    title: 'Power Hour',
    description: 'Complete 5+ habits during your most productive hour',
    category: 'Timing',
    rarity: 'uncommon',
    type: 'permanent',
    requirement: (data, calendarEntries) => {
      if (!calendarEntries) return false;
      return checkPowerHourPattern(calendarEntries);
    }
  },
  {
    id: 'night_owl',
    emoji: '🌙',
    title: 'Night Owl',
    description: 'Complete habits after 10 PM on 5 different days',
    category: 'Timing',
    rarity: 'uncommon',
    type: 'permanent',
    requirement: (data, calendarEntries) => {
      if (!calendarEntries) return false;
      return checkNightOwlPattern(calendarEntries);
    }
  },
  {
    id: 'early_bird',
    emoji: '☀️',
    title: 'Early Bird',
    description: 'Complete habits before 7 AM on 5 different days',
    category: 'Timing',
    rarity: 'uncommon',
    type: 'permanent',
    requirement: (data, calendarEntries) => {
      if (!calendarEntries) return false;
      return checkEarlyBirdPattern(calendarEntries);
    }
  }
];

// Helper functions for complex achievement patterns
const checkComebackPattern = (data, calendarEntries) => {
  try {
    const sortedDates = Object.keys(calendarEntries).sort();
    if (sortedDates.length < 8) return false; // Need enough data to detect 7-day gap
    
    // Look for a 7+ day gap followed by a completion
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1]);
      const currentDate = new Date(sortedDates[i]);
      const daysBetween = Math.floor((currentDate - prevDate) / (1000 * 60 * 60 * 24));
      
      if (daysBetween >= 7 && calendarEntries[sortedDates[i]].completedHabits?.length > 0) {
        return true; // Found comeback pattern
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking comeback pattern:', error);
    return false;
  }
};

const checkStreakSaverPattern = (data, calendarEntries) => {
  try {
    const sortedDates = Object.keys(calendarEntries).sort();
    if (sortedDates.length < 3) return false; // Need at least 3 days of data
    
    // Look for miss-day followed by immediate return (next day completion)
    for (let i = 1; i < sortedDates.length - 1; i++) {
      const prevDate = new Date(sortedDates[i - 1]);
      const missDate = new Date(sortedDates[i]);
      const returnDate = new Date(sortedDates[i + 1]);
      
      const gap1 = Math.floor((missDate - prevDate) / (1000 * 60 * 60 * 24));
      const gap2 = Math.floor((returnDate - missDate) / (1000 * 60 * 60 * 24));
      
      // Check if we have: completion -> 1 day gap (miss) -> 1 day gap (return)
      if (gap1 === 1 && gap2 === 1 && 
          calendarEntries[sortedDates[i - 1]].completedHabits?.length > 0 &&
          calendarEntries[sortedDates[i]].completedHabits?.length === 0 &&
          calendarEntries[sortedDates[i + 1]].completedHabits?.length > 0) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking streak saver pattern:', error);
    return false;
  }
};

const checkSeasonalPattern = (data, calendarEntries) => {
  try {
    const completionDates = Object.keys(calendarEntries).filter(date => 
      calendarEntries[date].completedHabits?.length > 0
    );
    
    if (completionDates.length === 0) return false;
    
    const seasons = new Set();
    completionDates.forEach(dateStr => {
      const date = new Date(dateStr);
      const month = date.getMonth(); // 0-11
      
      // Determine season based on month
      if (month >= 2 && month <= 4) seasons.add('spring'); // Mar-May
      else if (month >= 5 && month <= 7) seasons.add('summer'); // Jun-Aug
      else if (month >= 8 && month <= 10) seasons.add('fall'); // Sep-Nov
      else seasons.add('winter'); // Dec-Feb
    });
    
    return seasons.size >= 4; // All four seasons
  } catch (error) {
    console.error('Error checking seasonal pattern:', error);
    return false;
  }
};

const checkMilestoneRemixPattern = (data, calendarEntries, habitCreationDates) => {
  try {
    if (!habitCreationDates || Object.keys(habitCreationDates).length === 0) return false;
    
    // Find the first habit created
    const firstHabitId = Object.keys(habitCreationDates).reduce((earliest, habitId) => {
      return !earliest || habitCreationDates[habitId] < habitCreationDates[earliest] 
        ? habitId : earliest;
    });
    
    const creationDate = new Date(habitCreationDates[firstHabitId]);
    const hundredDaysLater = new Date(creationDate.getTime() + 100 * 24 * 60 * 60 * 1000);
    
    // Check if first habit was completed after 100 days from creation
    const laterCompletions = Object.keys(calendarEntries).filter(dateStr => {
      const date = new Date(dateStr);
      const entry = calendarEntries[dateStr];
      return date >= hundredDaysLater && 
             entry.completedHabits?.includes(firstHabitId);
    });
    
    return laterCompletions.length > 0;
  } catch (error) {
    console.error('Error checking milestone remix pattern:', error);
    return false;
  }
};

const checkTimeTravelerPattern = (calendarEntries) => {
  try {
    const completionDates = Object.keys(calendarEntries).filter(date => 
      calendarEntries[date].completedHabits?.length > 0
    );
    
    if (completionDates.length === 0) return false;
    
    const months = new Set();
    completionDates.forEach(dateStr => {
      const date = new Date(dateStr);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      months.add(monthKey);
    });
    
    return months.size >= 3; // At least 3 different months
  } catch (error) {
    console.error('Error checking time traveler pattern:', error);
    return false;
  }
};

// Time-based achievement helpers
const checkPowerHourPattern = (calendarEntries) => {
  try {
    const hourCompletions = {}; // hour -> count of completions
    
    // Analyze all completion timestamps
    Object.values(calendarEntries).forEach(entry => {
      if (entry.habits) {
        Object.values(entry.habits).forEach(habitData => {
          if (habitData.completedAt) {
            try {
              const completionDate = new Date(habitData.completedAt);
              const hour = completionDate.getHours(); // 0-23
              hourCompletions[hour] = (hourCompletions[hour] || 0) + 1;
            } catch (timeError) {
              // Skip invalid timestamps
            }
          }
        });
      }
    });
    
    // Find the hour with most completions
    const maxCompletions = Math.max(...Object.values(hourCompletions));
    return maxCompletions >= 5; // Power hour = 5+ completions in the same hour
  } catch (error) {
    console.error('Error checking power hour pattern:', error);
    return false;
  }
};

const checkNightOwlPattern = (calendarEntries) => {
  try {
    const nightOwlDays = new Set();
    
    // Check each day for late night completions (after 22:00/10 PM)
    Object.entries(calendarEntries).forEach(([date, entry]) => {
      if (entry.habits) {
        const hasLateNightCompletion = Object.values(entry.habits).some(habitData => {
          if (habitData.completedAt) {
            try {
              const completionDate = new Date(habitData.completedAt);
              const hour = completionDate.getHours();
              return hour >= 22 || hour < 5; // After 10 PM or before 5 AM
            } catch (timeError) {
              return false;
            }
          }
          return false;
        });
        
        if (hasLateNightCompletion) {
          nightOwlDays.add(date);
        }
      }
    });
    
    return nightOwlDays.size >= 5; // Night owl = 5+ different days with late completions
  } catch (error) {
    console.error('Error checking night owl pattern:', error);
    return false;
  }
};

const checkEarlyBirdPattern = (calendarEntries) => {
  try {
    const earlyBirdDays = new Set();
    
    // Check each day for early morning completions (before 7:00 AM)
    Object.entries(calendarEntries).forEach(([date, entry]) => {
      if (entry.habits) {
        const hasEarlyMorningCompletion = Object.values(entry.habits).some(habitData => {
          if (habitData.completedAt) {
            try {
              const completionDate = new Date(habitData.completedAt);
              const hour = completionDate.getHours();
              return hour >= 5 && hour < 7; // Between 5 AM and 7 AM
            } catch (timeError) {
              return false;
            }
          }
          return false;
        });
        
        if (hasEarlyMorningCompletion) {
          earlyBirdDays.add(date);
        }
      }
    });
    
    return earlyBirdDays.size >= 5; // Early bird = 5+ different days with early completions
  } catch (error) {
    console.error('Error checking early bird pattern:', error);
    return false;
  }
};

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
export const checkAndUpdateAchievements = async (userId, statsData, extraData = {}) => {
  try {
    const currentAchievements = await getUserAchievements(userId);
    const newCompletions = [];
    const now = new Date();
    
    // Extract extra data for complex achievements
    const { 
      calendarEntries = {}, 
      habitCreationDates = {}, 
      statsVisits = 0 
    } = extraData;
    
    // Calculate earned badge count for meta achievements
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
export const backfillUserAchievements = async (userId, statsData, extraData = {}) => {
  try {
    console.log('Backfilling achievements for user:', userId);
    const currentAchievements = await getUserAchievements(userId);
    
    // Only backfill if user has no achievements yet
    if (Object.keys(currentAchievements).length > 0) {
      return currentAchievements;
    }
    
    const backfilledAchievements = {};
    const now = new Date();
    
    // Extract extra data for complex achievements
    const { 
      calendarEntries = {}, 
      habitCreationDates = {}, 
      statsVisits = 0 
    } = extraData;
    
    const earnedBadgeCount = 0; // No badges earned yet during backfill
    
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
      currentMonthStats: { completedDays: 0 },
      currentStreak: 0,
      bestStreak: 0,
      weeklyGoalPercentage: 0
    }
  ];
  
  console.log('📊 Test stats data:', testStatsData);
  
  try {
    const result = await checkAndUpdateAchievements(userInfo.uid, testStatsData, {
      calendarEntries: {},
      habitCreationDates: {},
      statsVisits: 0
    });
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