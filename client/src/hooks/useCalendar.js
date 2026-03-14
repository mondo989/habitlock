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
  const RECENT_LOCAL_UPDATE_WINDOW_MS = 2500;
  const [currentYear, setCurrentYear] = useState(dayjs().year());
  const [currentMonth, setCurrentMonth] = useState(dayjs().month());
  const [calendarEntries, setCalendarEntries] = useState({});
  const [patternRevealByDate, setPatternRevealByDate] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use stable userId instead of auth.currentUser object reference
  const userId = authSync.currentUser?.uid ?? null;
  const prevUserIdRef = useRef(userId);
  const revealTimersRef = useRef({});
  const recentLocalUpdatesRef = useRef({});

  const markRecentLocalUpdate = (date, entry) => {
    if (!date) return;
    recentLocalUpdatesRef.current[date] = {
      entry,
      timestamp: Date.now(),
    };
  };

  const clearRecentLocalUpdate = (date) => {
    if (!date || !(date in recentLocalUpdatesRef.current)) return;
    delete recentLocalUpdatesRef.current[date];
  };

  const mergeWithRecentLocalUpdates = (entries) => {
    const mergedEntries = { ...entries };
    const now = Date.now();

    Object.entries(recentLocalUpdatesRef.current).forEach(([date, localUpdate]) => {
      if (!localUpdate) return;

      const isFresh = (now - localUpdate.timestamp) <= RECENT_LOCAL_UPDATE_WINDOW_MS;
      if (!isFresh) {
        delete recentLocalUpdatesRef.current[date];
        return;
      }

      mergedEntries[date] = localUpdate.entry;
    });

    return mergedEntries;
  };

  const triggerPatternReveal = (date) => {
    if (!date) return;

    setPatternRevealByDate((prev) => ({
      ...prev,
      [date]: (prev[date] || 0) + 1,
    }));

    if (revealTimersRef.current[date]) {
      clearTimeout(revealTimersRef.current[date]);
    }

    revealTimersRef.current[date] = setTimeout(() => {
      setPatternRevealByDate((prev) => {
        if (!(date in prev)) return prev;
        const next = { ...prev };
        delete next[date];
        return next;
      });
      delete revealTimersRef.current[date];
    }, 1100);
  };

  useEffect(() => {
    return () => {
      Object.values(revealTimersRef.current).forEach((timerId) => clearTimeout(timerId));
      revealTimersRef.current = {};
    };
  }, []);

  // Subscribe to calendar entries
  useEffect(() => {
    // Reset state when user changes (including logout)
    if (prevUserIdRef.current !== userId) {
      setCalendarEntries({});
      setPatternRevealByDate({});
      setLoading(true);
      setError(null);
      prevUserIdRef.current = userId;
      recentLocalUpdatesRef.current = {};

      Object.values(revealTimersRef.current).forEach((timerId) => clearTimeout(timerId));
      revealTimersRef.current = {};
    }

    if (!userId) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToCalendarEntries(userId, (entries) => {
      setCalendarEntries(mergeWithRecentLocalUpdates(entries));
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
    const optimisticEntry = {
      date,
      completedHabits: updatedHabits,
      habits: updatedHabitDetails,
    };
    setCalendarEntries(prev => ({
      ...prev,
      [date]: optimisticEntry,
    }));
    markRecentLocalUpdate(date, optimisticEntry);
    triggerPatternReveal(date);

    try {
      setError(null);
      await updateCalendarEntry(authSync.currentUser.uid, date, updatedHabits, updatedHabitDetails);
      return true;
    } catch (err) {
      // Rollback on error
      setCalendarEntries(previousEntries);
      clearRecentLocalUpdate(date);
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

    const entry = calendarEntries[date] || { date, completedHabits: [], habits: {} };
    const priorCompletedHabits = entry.completedHabits || [];

    // Filter out any invalid habit IDs
    const validHabitIds = habitIds.filter(habitId => habitId != null && habitId !== '');
    const hasDayChanged = validHabitIds.length !== priorCompletedHabits.length
      || validHabitIds.some((habitId) => !priorCompletedHabits.includes(habitId));
    
    // Preserve existing completion times and assign ordered timestamps to newly added habits.
    // This keeps pattern stacking stable with the most recently added habit on top.
    const habitDetails = {};
    const existingHabitDetails = entry.habits || {};
    const priorCompletedSet = new Set(priorCompletedHabits);
    const priorOrderById = new Map(priorCompletedHabits.map((habitId, index) => [habitId, index]));
    const addedHabitIds = validHabitIds.filter((habitId) => !priorCompletedSet.has(habitId));
    const addedOrderById = new Map(addedHabitIds.map((habitId, index) => [habitId, index]));
    const nowMs = Date.now();
    const existingFallbackBaseMs = nowMs - ((priorCompletedHabits.length + 1) * 10);

    validHabitIds.forEach((habitId) => {
      const existingDetail = existingHabitDetails[habitId];
      const existingCompletedAt = existingDetail?.completedAt;

      if (priorCompletedSet.has(habitId) && existingCompletedAt) {
        habitDetails[habitId] = {
          ...existingDetail,
          completedAt: existingCompletedAt,
          habitId,
        };
        return;
      }

      if (priorCompletedSet.has(habitId)) {
        const fallbackOrder = priorOrderById.get(habitId) ?? 0;
        habitDetails[habitId] = {
          completedAt: new Date(existingFallbackBaseMs + fallbackOrder).toISOString(),
          habitId,
        };
        return;
      }

      const addedOrder = addedOrderById.get(habitId) ?? 0;
      habitDetails[habitId] = {
        completedAt: new Date(nowMs + addedOrder).toISOString(),
        habitId,
      };
    });

    // Optimistic update: update UI immediately for instant feedback
    const previousEntries = { ...calendarEntries };
    const optimisticEntry = {
      date,
      completedHabits: validHabitIds,
      habits: habitDetails,
    };
    setCalendarEntries(prev => ({
      ...prev,
      [date]: optimisticEntry,
    }));
    markRecentLocalUpdate(date, optimisticEntry);
    if (hasDayChanged) {
      triggerPatternReveal(date);
    }

    try {
      setError(null);
      await updateCalendarEntry(authSync.currentUser.uid, date, validHabitIds, habitDetails);
      return true;
    } catch (err) {
      // Rollback on error
      setCalendarEntries(previousEntries);
      clearRecentLocalUpdate(date);
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
    const revealDates = [];
    
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
        revealDates.push(dateStr);
      } else if (!completed && completedHabits.includes(habitId)) {
        updatedHabits = completedHabits.filter(id => id !== habitId);
        delete updatedHabitDetails[habitId];
      } else {
        updatedHabits = completedHabits;
      }

      if (JSON.stringify(updatedHabits) !== JSON.stringify(completedHabits)) {
        const optimisticEntry = {
          date: dateStr,
          completedHabits: updatedHabits,
          habits: updatedHabitDetails,
        };
        optimisticUpdates[dateStr] = optimisticEntry;
        markRecentLocalUpdate(dateStr, optimisticEntry);
        serverUpdates.push({ dateStr, updatedHabits, updatedHabitDetails });
      }

      current = current.add(1, 'day');
    }

    // Optimistic update: apply all changes immediately
    if (Object.keys(optimisticUpdates).length > 0) {
      setCalendarEntries(prev => ({ ...prev, ...optimisticUpdates }));
      revealDates.forEach((date) => triggerPatternReveal(date));
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
      serverUpdates.forEach(({ dateStr }) => clearRecentLocalUpdate(dateStr));
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
    patternRevealByDate,
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
