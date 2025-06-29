import { useState, useEffect, useMemo } from 'react';
import { auth } from '../services/firebase';
import {
  updateCalendarEntry,
  subscribeToCalendarEntries,
} from '../services/db';
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

  // Subscribe to calendar entries
  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubscribe = subscribeToCalendarEntries(auth.currentUser.uid, (entries) => {
      setCalendarEntries(entries);
      setLoading(false);
    });

    return unsubscribe;
  }, [auth.currentUser]);

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
    if (!auth.currentUser) {
      setError('User not authenticated');
      return false;
    }

    try {
      setError(null);
      const entry = calendarEntries[date] || { date, completedHabits: [], habits: {} };
      const { completedHabits, habits: habitDetails = {} } = entry;
      
      let updatedHabits;
      let updatedHabitDetails = { ...habitDetails };
      
      if (completedHabits.includes(habitId)) {
        // Remove habit from completed list
        updatedHabits = completedHabits.filter(id => id !== habitId);
        // Remove habit details
        delete updatedHabitDetails[habitId];
      } else {
        // Add habit to completed list
        updatedHabits = [...completedHabits, habitId];
        // Add habit completion details with timestamp
        updatedHabitDetails[habitId] = {
          completedAt: new Date().toISOString(),
          habitId: habitId,
        };
      }

      await updateCalendarEntry(auth.currentUser.uid, date, updatedHabits, updatedHabitDetails);
      return true;
    } catch (err) {
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
    if (!auth.currentUser) {
      setError('User not authenticated');
      return false;
    }

    try {
      setError(null);
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
          await updateCalendarEntry(auth.currentUser.uid, dateStr, updatedHabits, updatedHabitDetails);
        }

        current = current.add(1, 'day');
      }
      
      return true;
    } catch (err) {
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
    bulkToggleHabit,
    
    // Data getters
    getCompletedHabits,
    isHabitCompleted,
    getHabitsWithMetGoal,
    hasHabitMetWeeklyGoal,
    getDayInfo,
  };
}; 