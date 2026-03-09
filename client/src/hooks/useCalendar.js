import { useState, useEffect, useMemo, useRef } from 'react';
import { authSync } from '../services/supabase';
import {
  updateCalendarEntry,
  subscribeToCalendarEntries,
} from '../services/supabaseDb';
import {
  generateCalendarMatrix,
  getMonthDisplayName,
  getCurrentDate,
} from '../utils/dateUtils';
import {
  calculateAllStreaks,
  hasMetWeeklyGoal,
  getCurrentWeekStats,
} from '../utils/streakUtils';
import dayjs from 'dayjs';

export const useCalendar = (habits = []) => {
  const [currentYear, setCurrentYear] = useState(dayjs().year());
  const [currentMonth, setCurrentMonth] = useState(dayjs().month());
  const [calendarEntries, setCalendarEntries] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use stable userId instead of auth.currentUser object reference
  const userId = authSync.currentUser?.uid ?? null;
  const prevUserIdRef = useRef(userId);

  // Subscribe to calendar entries
  useEffect(() => {
    // Reset state when user changes (including logout)
    if (prevUserIdRef.current !== userId) {
      setCalendarEntries({});
      setLoading(true);
      setError(null);
      prevUserIdRef.current = userId;
    }

    if (!userId) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToCalendarEntries(userId, (entries) => {
      setCalendarEntries(entries);
      setLoading(false);
    });

    return unsubscribe;
  }, [userId]);

  // Generate calendar matrix for current month
  const calendarMatrix = useMemo(() => {
    return generateCalendarMatrix(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  // Calculate streaks for all habits
  const streaks = useMemo(() => {
    return calculateAllStreaks(habits, calendarEntries);
  }, [habits, calendarEntries]);

  // Get current week stats
  const weekStats = useMemo(() => {
    return getCurrentWeekStats(habits, calendarEntries);
  }, [habits, calendarEntries]);

  // Navigation functions
  const goToNextMonth = () => {
    const next = dayjs().year(currentYear).month(currentMonth).add(1, 'month');
    setCurrentYear(next.year());
    setCurrentMonth(next.month());
  };

  const goToPrevMonth = () => {
    const prev = dayjs().year(currentYear).month(currentMonth).subtract(1, 'month');
    setCurrentYear(prev.year());
    setCurrentMonth(prev.month());
  };

  const goToToday = () => {
    const today = dayjs();
    setCurrentYear(today.year());
    setCurrentMonth(today.month());
  };

  const goToDate = (date) => {
    const day = dayjs(date);
    setCurrentYear(day.year());
    setCurrentMonth(day.month());
  };

  // Toggle habit completion for a specific date
  const toggleHabitCompletion = async (date, habitId) => {
    if (!authSync.currentUser) {
      setError('User not authenticated');
      return false;
    }

    const entry = calendarEntries[date] || { date, completedHabits: [], habits: {} };
    const { completedHabits, habits: habitDetails = {} } = entry;
    
    let updatedHabits;
    let updatedHabitDetails = { ...habitDetails };
    
    if (completedHabits.includes(habitId)) {
      updatedHabits = completedHabits.filter(id => id !== habitId);
      delete updatedHabitDetails[habitId];
    } else {
      updatedHabits = [...completedHabits, habitId];
      updatedHabitDetails[habitId] = {
        completedAt: new Date().toISOString(),
        habitId: habitId,
      };
    }

    // Optimistic update: update UI immediately for instant feedback
    const previousEntries = { ...calendarEntries };
    setCalendarEntries(prev => ({
      ...prev,
      [date]: {
        date,
        completedHabits: updatedHabits,
        habits: updatedHabitDetails,
      },
    }));

    try {
      setError(null);
      await updateCalendarEntry(authSync.currentUser.uid, date, updatedHabits, updatedHabitDetails);
      return true;
    } catch (err) {
      // Rollback on error
      setCalendarEntries(previousEntries);
      setError('Failed to update calendar entry');
      console.error('Error updating calendar entry:', err);
      return false;
    }
  };

  // Set all completed habits for a specific date in a single operation
  const setDayHabits = async (date, habitIds) => {
    if (!authSync.currentUser) {
      setError('User not authenticated');
      return false;
    }

    // Filter out any invalid habit IDs
    const validHabitIds = habitIds.filter(habitId => habitId != null && habitId !== '');
    
    // Create habit details for all completed habits
    const habitDetails = {};
    const timestamp = new Date().toISOString();
    
    validHabitIds.forEach(habitId => {
      habitDetails[habitId] = {
        completedAt: timestamp,
        habitId: habitId,
      };
    });

    // Optimistic update: update UI immediately for instant feedback
    const previousEntries = { ...calendarEntries };
    setCalendarEntries(prev => ({
      ...prev,
      [date]: {
        date,
        completedHabits: validHabitIds,
        habits: habitDetails,
      },
    }));

    try {
      setError(null);
      await updateCalendarEntry(authSync.currentUser.uid, date, validHabitIds, habitDetails);
      return true;
    } catch (err) {
      // Rollback on error
      setCalendarEntries(previousEntries);
      setError('Failed to update calendar entry');
      console.error('Error updating calendar entry:', err);
      return false;
    }
  };

  // Get completed habits for a specific date
  const getCompletedHabits = (date) => {
    const entry = calendarEntries[date];
    return entry ? entry.completedHabits || [] : [];
  };

  // Check if habit is completed on a specific date
  const isHabitCompleted = (date, habitId) => {
    const completedHabits = getCompletedHabits(date);
    return completedHabits.includes(habitId);
  };

  // Get habits that have met weekly goal for a specific date
  const getHabitsWithMetGoal = (date) => {
    return habits.filter(habit => hasMetWeeklyGoal(habit, date, calendarEntries));
  };

  // Check if habit has met weekly goal for a specific date
  const hasHabitMetWeeklyGoal = (habitId, date) => {
    const habit = habits.find(h => h.id === habitId);
    return habit ? hasMetWeeklyGoal(habit, date, calendarEntries) : false;
  };

  // Get day info with all habit-related data
  const getDayInfo = (date) => {
    const completedHabits = getCompletedHabits(date);
    const habitsWithMetGoal = getHabitsWithMetGoal(date);
    const habitDetails = habits.filter(habit => completedHabits.includes(habit.id));

    return {
      date,
      completedHabits,
      habitDetails,
      habitsWithMetGoal: habitsWithMetGoal.map(h => h.id),
      completionCount: completedHabits.length,
      hasCompletions: completedHabits.length > 0,
    };
  };

  // Bulk operations for selected date range
  const bulkToggleHabit = async (startDate, endDate, habitId, completed) => {
    if (!authSync.currentUser) {
      setError('User not authenticated');
      return false;
    }

    // Build optimistic updates for all dates in range
    const previousEntries = { ...calendarEntries };
    const optimisticUpdates = {};
    const serverUpdates = [];
    
    let current = dayjs(startDate);
    const end = dayjs(endDate);

    while (current.isBefore(end) || current.isSame(end, 'day')) {
      const dateStr = current.format('YYYY-MM-DD');
      const entry = calendarEntries[dateStr] || { date: dateStr, completedHabits: [], habits: {} };
      const { completedHabits, habits: habitDetails = {} } = entry;
      
      let updatedHabits;
      let updatedHabitDetails = { ...habitDetails };
      
      if (completed && !completedHabits.includes(habitId)) {
        updatedHabits = [...completedHabits, habitId];
        updatedHabitDetails[habitId] = {
          completedAt: new Date().toISOString(),
          habitId: habitId,
        };
      } else if (!completed && completedHabits.includes(habitId)) {
        updatedHabits = completedHabits.filter(id => id !== habitId);
        delete updatedHabitDetails[habitId];
      } else {
        updatedHabits = completedHabits;
      }

      if (JSON.stringify(updatedHabits) !== JSON.stringify(completedHabits)) {
        optimisticUpdates[dateStr] = {
          date: dateStr,
          completedHabits: updatedHabits,
          habits: updatedHabitDetails,
        };
        serverUpdates.push({ dateStr, updatedHabits, updatedHabitDetails });
      }

      current = current.add(1, 'day');
    }

    // Optimistic update: apply all changes immediately
    if (Object.keys(optimisticUpdates).length > 0) {
      setCalendarEntries(prev => ({ ...prev, ...optimisticUpdates }));
    }

    try {
      setError(null);
      
      // Send all server updates
      await Promise.all(
        serverUpdates.map(({ dateStr, updatedHabits, updatedHabitDetails }) =>
          updateCalendarEntry(authSync.currentUser.uid, dateStr, updatedHabits, updatedHabitDetails)
        )
      );
      
      return true;
    } catch (err) {
      // Rollback on error
      setCalendarEntries(previousEntries);
      setError('Failed to bulk update calendar entries');
      console.error('Error bulk updating calendar entries:', err);
      return false;
    }
  };

  return {
    // State
    currentYear,
    currentMonth,
    calendarEntries,
    calendarMatrix,
    streaks,
    weekStats,
    loading,
    error,
    
    // Computed values
    monthDisplayName: getMonthDisplayName(currentYear, currentMonth),
    currentDate: getCurrentDate(),
    
    // Navigation
    goToNextMonth,
    goToPrevMonth,
    goToToday,
    goToDate,
    
    // Habit completion operations
    toggleHabitCompletion,
    setDayHabits,
    bulkToggleHabit,
    
    // Data getters
    getCompletedHabits,
    isHabitCompleted,
    getHabitsWithMetGoal,
    hasHabitMetWeeklyGoal,
    getDayInfo,
  };
}; 