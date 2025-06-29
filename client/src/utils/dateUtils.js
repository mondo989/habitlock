import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

// Format date as YYYY-MM-DD for database storage
export const formatDateForDB = (date) => {
  return dayjs(date).format('YYYY-MM-DD');
};

// Get current date formatted for DB
export const getCurrentDate = () => {
  return formatDateForDB(new Date());
};

// Generate calendar matrix for a given month
export const generateCalendarMatrix = (year, month) => {
  const firstDay = dayjs().year(year).month(month).startOf('month');
  const lastDay = firstDay.endOf('month');
  const startDate = firstDay.startOf('week'); // Start from Sunday
  const endDate = lastDay.endOf('week'); // End on Saturday
  
  const matrix = [];
  let week = [];
  let current = startDate;
  
  while (current.isBefore(endDate) || current.isSame(endDate, 'day')) {
    week.push({
      date: current.format('YYYY-MM-DD'),
      dayjs: current,
      isCurrentMonth: current.month() === month,
      isToday: current.isSame(dayjs(), 'day'),
    });
    
    if (week.length === 7) {
      matrix.push(week);
      week = [];
    }
    
    current = current.add(1, 'day');
  }
  
  return matrix;
};

// Get week boundaries (Sunday to Saturday) for a given date
export const getWeekBoundaries = (date) => {
  const day = dayjs(date);
  const startOfWeek = day.startOf('week'); // Sunday
  const endOfWeek = day.endOf('week'); // Saturday
  
  return {
    start: startOfWeek.format('YYYY-MM-DD'),
    end: endOfWeek.format('YYYY-MM-DD'),
  };
};

// Get all dates in a week for a given date
export const getDatesInWeek = (date) => {
  const { start } = getWeekBoundaries(date);
  const dates = [];
  let current = dayjs(start);
  
  for (let i = 0; i < 7; i++) {
    dates.push(current.format('YYYY-MM-DD'));
    current = current.add(1, 'day');
  }
  
  return dates;
};

// Check if a date is in the current week
export const isDateInCurrentWeek = (date) => {
  const { start, end } = getWeekBoundaries(new Date());
  const checkDate = formatDateForDB(date);
  return checkDate >= start && checkDate <= end;
};

// Get month name and year for display
export const getMonthDisplayName = (year, month) => {
  return dayjs().year(year).month(month).format('MMMM YYYY');
};

// Check if date is in the past
export const isDateInPast = (date) => {
  return dayjs(date).isBefore(dayjs(), 'day');
};

// Check if date is in the future
export const isDateInFuture = (date) => {
  return dayjs(date).isAfter(dayjs(), 'day');
};

// Get relative date display (today, yesterday, etc.)
export const getRelativeDateDisplay = (date) => {
  const day = dayjs(date);
  const today = dayjs();
  
  if (day.isSame(today, 'day')) return 'Today';
  if (day.isSame(today.subtract(1, 'day'), 'day')) return 'Yesterday';
  if (day.isSame(today.add(1, 'day'), 'day')) return 'Tomorrow';
  
  // Within this week
  if (day.isSame(today, 'week')) {
    return day.format('dddd'); // Monday, Tuesday, etc.
  }
  
  // Within this year
  if (day.isSame(today, 'year')) {
    return day.format('MMM D'); // Jan 15
  }
  
  return day.format('MMM D, YYYY'); // Jan 15, 2024
}; 