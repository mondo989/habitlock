import { getDatesInWeek, formatDateForDB } from './dateUtils';
import dayjs from 'dayjs';
import dayOfYear from 'dayjs/plugin/dayOfYear';
import weekOfYear from 'dayjs/plugin/weekOfYear';

// Extend dayjs with plugins
dayjs.extend(dayOfYear);
dayjs.extend(weekOfYear);

// Calculate current streak for a habit
export const calculateStreak = (habitId, calendarEntries) => {
  const today = formatDateForDB(new Date());
  let current = dayjs(today);
  let streak = 0;
  
  // Check backwards from today until we find a day without the habit
  while (true) {
    const dateStr = current.format('YYYY-MM-DD');
    const entry = calendarEntries[dateStr];
    
    if (entry && entry.completedHabits && entry.completedHabits.includes(habitId)) {
      streak++;
      current = current.subtract(1, 'day');
    } else {
      break;
    }
  }
  
  return streak;
};

// Calculate weekly completion count for a habit in a given week
export const calculateWeeklyCompletions = (habitId, date, calendarEntries) => {
  const datesInWeek = getDatesInWeek(date);
  let completions = 0;
  
  datesInWeek.forEach(dateStr => {
    const entry = calendarEntries[dateStr];
    if (entry && entry.completedHabits && entry.completedHabits.includes(habitId)) {
      completions++;
    }
  });
  
  return completions;
};

// Check if habit has met weekly goal for a given week
export const hasMetWeeklyGoal = (habit, date, calendarEntries) => {
  const completions = calculateWeeklyCompletions(habit.id, date, calendarEntries);
  return completions >= habit.weeklyGoal;
};

// Get completion percentage for a habit in a given week
export const getWeeklyCompletionPercentage = (habit, date, calendarEntries) => {
  const completions = calculateWeeklyCompletions(habit.id, date, calendarEntries);
  return Math.min((completions / habit.weeklyGoal) * 100, 100);
};

// Calculate streak for all habits
export const calculateAllStreaks = (habits, calendarEntries) => {
  const streaks = {};
  habits.forEach(habit => {
    streaks[habit.id] = calculateStreak(habit.id, calendarEntries);
  });
  return streaks;
};

// Get best streak ever for a habit (maximum consecutive days)
export const getBestStreak = (habitId, calendarEntries) => {
  const sortedDates = Object.keys(calendarEntries)
    .filter(date => {
      const entry = calendarEntries[date];
      return entry && entry.completedHabits && entry.completedHabits.includes(habitId);
    })
    .sort();
  
  if (sortedDates.length === 0) return 0;
  
  let bestStreak = 1;
  let currentStreak = 1;
  
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = dayjs(sortedDates[i - 1]);
    const currentDate = dayjs(sortedDates[i]);
    
    // Check if dates are consecutive
    if (currentDate.diff(prevDate, 'day') === 1) {
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }
  
  return bestStreak;
};

// Get completion stats for a habit over a date range
export const getHabitStatsForRange = (habitId, startDate, endDate, calendarEntries) => {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const totalDays = end.diff(start, 'day') + 1;
  
  let completedDays = 0;
  let current = start;
  
  while (current.isBefore(end) || current.isSame(end, 'day')) {
    const dateStr = current.format('YYYY-MM-DD');
    const entry = calendarEntries[dateStr];
    
    if (entry && entry.completedHabits && entry.completedHabits.includes(habitId)) {
      completedDays++;
    }
    
    current = current.add(1, 'day');
  }
  
  return {
    totalDays,
    completedDays,
    completionRate: totalDays > 0 ? (completedDays / totalDays) * 100 : 0,
  };
};

// Get weekly stats for all habits in current week
export const getCurrentWeekStats = (habits, calendarEntries) => {
  const today = new Date();
  return getWeekStatsForDate(habits, calendarEntries, today);
};

// Get weekly stats for all habits for a specific date's week
export const getWeekStatsForDate = (habits, calendarEntries, date) => {
  const stats = {};
  
  habits.forEach(habit => {
    const completions = calculateWeeklyCompletions(habit.id, date, calendarEntries);
    const hasMetGoal = hasMetWeeklyGoal(habit, date, calendarEntries);
    const percentage = getWeeklyCompletionPercentage(habit, date, calendarEntries);
    
    stats[habit.id] = {
      completions,
      goal: habit.weeklyGoal,
      hasMetGoal,
      percentage,
    };
  });
  
  return stats;
};

// Generate heatmap data for a habit for entire year (GitHub style)
export const generateHeatmapData = (habitId, year, calendarEntries) => {
  const now = dayjs();
  const currentYear = now.year();
  
  // Always use current year, show entire year
  const startDate = dayjs().year(currentYear).startOf('year');
  const endDate = dayjs().year(currentYear).endOf('year');
  const data = [];
  
  let current = startDate;
  while (current.isBefore(endDate) || current.isSame(endDate, 'day')) {
    const dateStr = current.format('YYYY-MM-DD');
    const entry = calendarEntries[dateStr];
    const completed = entry && entry.completedHabits && entry.completedHabits.includes(habitId);
    const isFuture = current.isAfter(now, 'day');
    
    // Get completion time if available
    let completionTime = null;
    if (completed && entry.habits && entry.habits[habitId]) {
      completionTime = entry.habits[habitId].completedAt;
    }
    
    data.push({
      date: dateStr,
      completed: completed && !isFuture, // Don't show future dates as completed
      isFuture,
      dayOfYear: current.dayOfYear(),
      week: current.week(),
      dayOfWeek: current.day(), // 0 = Sunday, 1 = Monday, etc.
      formattedDate: current.format('MMM D, YYYY'),
      weekday: current.format('dddd'),
      completionTime
    });
    
    current = current.add(1, 'day');
  }
  
  return data;
}; 