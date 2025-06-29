import { ref, push, set, get, remove, onValue, off } from 'firebase/database';
import { database } from './firebase';

// Habit CRUD operations
export const createHabit = async (userId, habitData) => {
  const habitsRef = ref(database, `habits/${userId}`);
  const newHabitRef = push(habitsRef);
  const habit = {
    id: newHabitRef.key,
    ...habitData,
    createdAt: Date.now(),
  };
  await set(newHabitRef, habit);
  return habit;
};

export const updateHabit = async (userId, habitId, updates) => {
  const habitRef = ref(database, `habits/${userId}/${habitId}`);
  
  // Get the existing habit first
  const snapshot = await get(habitRef);
  if (!snapshot.exists()) {
    throw new Error('Habit not found');
  }
  
  const existingHabit = snapshot.val();
  
  // Merge updates with existing habit data to preserve id and createdAt
  const updatedHabit = {
    ...existingHabit,
    ...updates,
    id: habitId, // Ensure ID is preserved
  };
  
  await set(habitRef, updatedHabit);
};

export const deleteHabit = async (userId, habitId) => {
  const habitRef = ref(database, `habits/${userId}/${habitId}`);
  await remove(habitRef);
  
  // Also remove this habit from all calendar entries
  const entriesRef = ref(database, `calendarEntries/${userId}`);
  const snapshot = await get(entriesRef);
  if (snapshot.exists()) {
    const entries = snapshot.val();
    const updates = {};
    
    Object.keys(entries).forEach(date => {
      const entry = entries[date];
      if (entry.completedHabits && entry.completedHabits.includes(habitId)) {
        const filteredHabits = entry.completedHabits.filter(id => id !== habitId);
        const updatedHabitDetails = { ...(entry.habits || {}) };
        delete updatedHabitDetails[habitId]; // Remove habit details
        
        if (filteredHabits.length > 0) {
          updates[date] = { 
            ...entry, 
            completedHabits: filteredHabits,
            habits: updatedHabitDetails
          };
        } else {
          updates[date] = null; // Remove entry if no habits left
        }
      }
    });
    
    if (Object.keys(updates).length > 0) {
      const entriesRef = ref(database, `calendarEntries/${userId}`);
      await set(entriesRef, updates);
    }
  }
};

export const subscribeToHabits = (userId, callback) => {
  const habitsRef = ref(database, `habits/${userId}`);
  onValue(habitsRef, (snapshot) => {
    const habits = snapshot.exists() ? Object.values(snapshot.val()) : [];
    callback(habits);
  });
  
  return () => off(habitsRef);
};

// Calendar entry operations
export const updateCalendarEntry = async (userId, date, completedHabits, habitDetails = {}) => {
  const entryRef = ref(database, `calendarEntries/${userId}/${date}`);
  if (completedHabits.length === 0) {
    await remove(entryRef);
  } else {
    await set(entryRef, {
      date,
      completedHabits,
      habits: habitDetails, // Store detailed habit completion info with timestamps
    });
  }
};

export const getCalendarEntry = async (userId, date) => {
  const entryRef = ref(database, `calendarEntries/${userId}/${date}`);
  const snapshot = await get(entryRef);
  return snapshot.exists() ? snapshot.val() : null;
};

export const subscribeToCalendarEntries = (userId, callback) => {
  const entriesRef = ref(database, `calendarEntries/${userId}`);
  onValue(entriesRef, (snapshot) => {
    const entries = snapshot.exists() ? snapshot.val() : {};
    callback(entries);
  });
  
  return () => off(entriesRef);
};

// Batch operations for stats/analytics
export const getCalendarEntriesForRange = async (userId, startDate, endDate) => {
  const entriesRef = ref(database, `calendarEntries/${userId}`);
  const snapshot = await get(entriesRef);
  
  if (!snapshot.exists()) return {};
  
  const allEntries = snapshot.val();
  const filteredEntries = {};
  
  Object.keys(allEntries).forEach(date => {
    if (date >= startDate && date <= endDate) {
      filteredEntries[date] = allEntries[date];
    }
  });
  
  return filteredEntries;
}; 