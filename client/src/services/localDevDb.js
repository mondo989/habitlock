// localDevDb.js
// Local storage database for dev mode testing (bypasses Supabase RLS)

const STORAGE_KEYS = {
  HABITS: 'habitlock_dev_habits',
  CALENDAR: 'habitlock_dev_calendar',
};

const LOCAL_EVENTS = {
  HABITS: 'habitlock:dev:habits',
  CALENDAR: 'habitlock:dev:calendar',
};

const generateId = () => crypto.randomUUID();

const getFromStorage = (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const saveToStorage = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

const notifyLocalSubscribers = (eventName) => {
  window.dispatchEvent(new CustomEvent(eventName));
};

// ============================================
// HABIT OPERATIONS
// ============================================

export const createHabit = async (userId, habitData) => {
  const habits = getFromStorage(STORAGE_KEYS.HABITS) || [];
  
  const newHabit = {
    id: generateId(),
    name: habitData.name,
    description: habitData.description || null,
    emoji: habitData.emoji || '✅',
    color: habitData.color || '#4CAF50',
    weeklyGoal: habitData.weeklyGoal || 7,
    category: habitData.category || null,
    frequency: habitData.frequency || null,
    createdAt: Date.now(),
    userId,
  };
  
  habits.push(newHabit);
  saveToStorage(STORAGE_KEYS.HABITS, habits);
  notifyLocalSubscribers(LOCAL_EVENTS.HABITS);
  
  console.log('🔧 Dev DB: Created habit', newHabit.name);
  return newHabit;
};

export const updateHabit = async (userId, habitId, updates) => {
  const habits = getFromStorage(STORAGE_KEYS.HABITS) || [];
  const index = habits.findIndex(h => h.id === habitId && h.userId === userId);
  
  if (index !== -1) {
    habits[index] = { ...habits[index], ...updates };
    saveToStorage(STORAGE_KEYS.HABITS, habits);
    notifyLocalSubscribers(LOCAL_EVENTS.HABITS);
    console.log('🔧 Dev DB: Updated habit', habitId);
  }
};

export const deleteHabit = async (userId, habitId) => {
  let habits = getFromStorage(STORAGE_KEYS.HABITS) || [];
  habits = habits.filter(h => !(h.id === habitId && h.userId === userId));
  saveToStorage(STORAGE_KEYS.HABITS, habits);

  const calendar = getFromStorage(STORAGE_KEYS.CALENDAR) || {};
  const userCalendar = { ...(calendar[userId] || {}) };

  Object.entries(userCalendar).forEach(([date, entry]) => {
    const completedHabits = (entry.completedHabits || []).filter((id) => id !== habitId);
    if (completedHabits.length === 0) {
      delete userCalendar[date];
      return;
    }

    const nextHabitDetails = { ...(entry.habits || {}) };
    delete nextHabitDetails[habitId];
    userCalendar[date] = {
      ...entry,
      completedHabits,
      habits: nextHabitDetails,
    };
  });

  calendar[userId] = userCalendar;
  saveToStorage(STORAGE_KEYS.CALENDAR, calendar);
  notifyLocalSubscribers(LOCAL_EVENTS.HABITS);
  notifyLocalSubscribers(LOCAL_EVENTS.CALENDAR);
  console.log('🔧 Dev DB: Deleted habit', habitId);
};

export const getHabits = async (userId) => {
  const habits = getFromStorage(STORAGE_KEYS.HABITS) || [];
  return habits.filter(h => h.userId === userId);
};

export const subscribeToHabits = (userId, callback) => {
  getHabits(userId).then(callback);
  
  const emitHabits = () => {
    getHabits(userId).then(callback);
  };

  const handleStorageChange = (e) => {
    if (e.key === STORAGE_KEYS.HABITS) {
      emitHabits();
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  window.addEventListener(LOCAL_EVENTS.HABITS, emitHabits);
  
  return () => {
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener(LOCAL_EVENTS.HABITS, emitHabits);
  };
};

// ============================================
// CALENDAR ENTRY OPERATIONS
// ============================================

export const updateCalendarEntry = async (userId, date, completedHabitIds, habitDetails = {}) => {
  const calendar = getFromStorage(STORAGE_KEYS.CALENDAR) || {};
  const userCalendar = calendar[userId] || {};
  
  if (completedHabitIds.length === 0) {
    delete userCalendar[date];
  } else {
    const habits = {};
    completedHabitIds.forEach(habitId => {
      habits[habitId] = {
        completedAt: habitDetails[habitId]?.completedAt || new Date().toISOString(),
        habitId,
      };
    });
    
    userCalendar[date] = {
      date,
      completedHabits: completedHabitIds,
      habits,
    };
  }
  
  calendar[userId] = userCalendar;
  saveToStorage(STORAGE_KEYS.CALENDAR, calendar);
  notifyLocalSubscribers(LOCAL_EVENTS.CALENDAR);
  console.log('🔧 Dev DB: Updated calendar entry', date);
};

export const getCalendarEntry = async (userId, date) => {
  const calendar = getFromStorage(STORAGE_KEYS.CALENDAR) || {};
  const userCalendar = calendar[userId] || {};
  return userCalendar[date] || null;
};

export const getAllCalendarEntries = async (userId) => {
  const calendar = getFromStorage(STORAGE_KEYS.CALENDAR) || {};
  return calendar[userId] || {};
};

export const subscribeToCalendarEntries = (userId, callback) => {
  getAllCalendarEntries(userId).then(callback);
  
  const emitCalendarEntries = () => {
    getAllCalendarEntries(userId).then(callback);
  };

  const handleStorageChange = (e) => {
    if (e.key === STORAGE_KEYS.CALENDAR) {
      emitCalendarEntries();
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  window.addEventListener(LOCAL_EVENTS.CALENDAR, emitCalendarEntries);
  
  return () => {
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener(LOCAL_EVENTS.CALENDAR, emitCalendarEntries);
  };
};

export const getCalendarEntriesForRange = async (userId, startDate, endDate) => {
  const allEntries = await getAllCalendarEntries(userId);
  const filtered = {};
  
  Object.entries(allEntries).forEach(([date, entry]) => {
    if (date >= startDate && date <= endDate) {
      filtered[date] = entry;
    }
  });
  
  return filtered;
};

// ============================================
// USER PROFILE (no-op for dev mode)
// ============================================

export const saveUserProfile = async () => {
  console.log('🔧 Dev DB: Skipping user profile save');
};

export const getUserProfiles = async () => {
  return {};
};
