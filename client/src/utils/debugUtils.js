// debugUtils.js
// Utility functions for populating debug/demo data in local development

import dayjs from 'dayjs';
import { updateCalendarEntry } from '../services/db';

/**
 * Generate random habit completions for a given month
 * Creates realistic-looking data where:
 * - Some habits have high completion rates (80%+)
 * - Some habits have medium completion rates (40-70%)
 * - Weekends might have different patterns
 * - More recent days tend to have higher completion
 */
export const generateMonthDebugData = (year, month, habits, userId) => {
  const entries = {};
  
  const firstDay = dayjs().year(year).month(month).startOf('month');
  const lastDay = dayjs().year(year).month(month).endOf('month');
  const today = dayjs();
  
  let current = firstDay;
  
  while (current.isBefore(lastDay) || current.isSame(lastDay, 'day')) {
    // Don't generate data for future dates
    if (current.isAfter(today, 'day')) {
      current = current.add(1, 'day');
      continue;
    }
    
    const dateStr = current.format('YYYY-MM-DD');
    const dayOfWeek = current.day();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Days closer to today have higher completion probability
    const daysFromToday = today.diff(current, 'day');
    const recencyBoost = Math.max(0, 1 - (daysFromToday / 30) * 0.3);
    
    const completedHabits = [];
    const habitDetails = {};
    
    habits.forEach((habit, index) => {
      // Each habit has a base completion rate based on its position
      // First habits tend to be more important and completed more often
      const baseRate = 0.85 - (index * 0.1);
      
      // Weekend adjustment - some habits less likely on weekends
      const weekendFactor = isWeekend ? 0.7 : 1;
      
      // Random variation
      const randomFactor = 0.7 + Math.random() * 0.3;
      
      const completionProbability = baseRate * weekendFactor * randomFactor * recencyBoost;
      
      if (Math.random() < completionProbability) {
        completedHabits.push(habit.id);
        habitDetails[habit.id] = {
          completedAt: current.hour(Math.floor(8 + Math.random() * 12))
            .minute(Math.floor(Math.random() * 60))
            .toISOString(),
          habitId: habit.id,
        };
      }
    });
    
    if (completedHabits.length > 0) {
      entries[dateStr] = {
        date: dateStr,
        completedHabits,
        habits: habitDetails,
      };
    }
    
    current = current.add(1, 'day');
  }
  
  return entries;
};

/**
 * Populate calendar with debug data for the current month
 */
export const populateDebugData = async (year, month, habits, userId) => {
  if (!userId || habits.length === 0) {
    console.warn('Cannot populate debug data: missing userId or habits');
    return { success: false, message: 'Missing userId or habits' };
  }
  
  const entries = generateMonthDebugData(year, month, habits, userId);
  const dates = Object.keys(entries);
  
  console.log(`📅 Populating ${dates.length} days with debug data...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const date of dates) {
    const entry = entries[date];
    try {
      await updateCalendarEntry(
        userId,
        date,
        entry.completedHabits,
        entry.habits
      );
      successCount++;
    } catch (error) {
      console.error(`Error populating ${date}:`, error);
      errorCount++;
    }
  }
  
  console.log(`✅ Debug data populated: ${successCount} days success, ${errorCount} errors`);
  
  return {
    success: errorCount === 0,
    message: `Populated ${successCount} days with habit data`,
    stats: { successCount, errorCount, totalDays: dates.length }
  };
};

/**
 * Clear all calendar entries for a given month (for resetting debug data)
 */
export const clearMonthData = async (year, month, userId) => {
  if (!userId) {
    console.warn('Cannot clear data: missing userId');
    return { success: false, message: 'Missing userId' };
  }
  
  const firstDay = dayjs().year(year).month(month).startOf('month');
  const lastDay = dayjs().year(year).month(month).endOf('month');
  const today = dayjs();
  
  let current = firstDay;
  let clearedCount = 0;
  
  while (current.isBefore(lastDay) || current.isSame(lastDay, 'day')) {
    if (current.isAfter(today, 'day')) {
      current = current.add(1, 'day');
      continue;
    }
    
    const dateStr = current.format('YYYY-MM-DD');
    try {
      await updateCalendarEntry(userId, dateStr, [], {});
      clearedCount++;
    } catch (error) {
      console.error(`Error clearing ${dateStr}:`, error);
    }
    current = current.add(1, 'day');
  }
  
  console.log(`🗑️ Cleared ${clearedCount} days of data`);
  return { success: true, message: `Cleared ${clearedCount} days`, clearedCount };
};

/**
 * Check if app is running in development mode
 */
export const isDevMode = () => {
  return import.meta.env.DEV || import.meta.env.MODE === 'development';
};
