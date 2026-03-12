// supabaseDb.js
// Database operations using Supabase (replaces Firebase Realtime Database)
import { supabase } from './supabase';
import { isDevUserEnabled } from '../utils/devAuth';
import * as localDevDb from './localDevDb';

// ============================================
// DEV MODE ROUTING
// All exports route to localStorage in dev mode
// ============================================

export const createHabit = async (userId, habitData) => {
  if (isDevUserEnabled()) return localDevDb.createHabit(userId, habitData);
  return _createHabit(userId, habitData);
};

export const updateHabit = async (userId, habitId, updates) => {
  if (isDevUserEnabled()) return localDevDb.updateHabit(userId, habitId, updates);
  return _updateHabit(userId, habitId, updates);
};

export const deleteHabit = async (userId, habitId) => {
  if (isDevUserEnabled()) return localDevDb.deleteHabit(userId, habitId);
  return _deleteHabit(userId, habitId);
};

export const getHabits = async (userId) => {
  if (isDevUserEnabled()) return localDevDb.getHabits(userId);
  return _getHabits(userId);
};

export const subscribeToHabits = (userId, callback) => {
  if (isDevUserEnabled()) return localDevDb.subscribeToHabits(userId, callback);
  return _subscribeToHabits(userId, callback);
};

export const updateCalendarEntry = async (userId, date, completedHabitIds, habitDetails) => {
  if (isDevUserEnabled()) return localDevDb.updateCalendarEntry(userId, date, completedHabitIds, habitDetails);
  return _updateCalendarEntry(userId, date, completedHabitIds, habitDetails);
};

export const getCalendarEntry = async (userId, date) => {
  if (isDevUserEnabled()) return localDevDb.getCalendarEntry(userId, date);
  return _getCalendarEntry(userId, date);
};

export const getAllCalendarEntries = async (userId) => {
  if (isDevUserEnabled()) return localDevDb.getAllCalendarEntries(userId);
  return _getAllCalendarEntries(userId);
};

export const subscribeToCalendarEntries = (userId, callback) => {
  if (isDevUserEnabled()) return localDevDb.subscribeToCalendarEntries(userId, callback);
  return _subscribeToCalendarEntries(userId, callback);
};

export const getCalendarEntriesForRange = async (userId, startDate, endDate) => {
  if (isDevUserEnabled()) return localDevDb.getCalendarEntriesForRange(userId, startDate, endDate);
  return _getCalendarEntriesForRange(userId, startDate, endDate);
};

export const saveUserProfile = async (userId, profileData) => {
  if (isDevUserEnabled()) return localDevDb.saveUserProfile(userId, profileData);
  return _saveUserProfile(userId, profileData);
};

export const getUserProfiles = async () => {
  if (isDevUserEnabled()) return localDevDb.getUserProfiles();
  return _getUserProfiles();
};

// ============================================
// SUPABASE IMPLEMENTATIONS (prefixed with _)
// ============================================

// USER PROFILE OPERATIONS

const _saveUserProfile = async (userId, profileData) => {
  const { error } = await supabase
    .from('user_profiles')
    .upsert({
      id: userId,
      email: profileData.email || null,
      display_name: profileData.displayName || null,
      photo_url: profileData.photoURL || null,
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  
  if (error) throw error;
};

const _getUserProfiles = async () => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*');
  
  if (error) throw error;
  
  return data.reduce((acc, profile) => {
    acc[profile.id] = profile;
    return acc;
  }, {});
};

// HABIT CRUD OPERATIONS

const _createHabit = async (userId, habitData) => {
  const { data, error } = await supabase
    .from('habits')
    .insert({
      user_id: userId,
      name: habitData.name,
      description: habitData.description || null,
      emoji: habitData.emoji || '✅',
      color: habitData.color || '#4CAF50',
      weekly_goal: habitData.weeklyGoal || 7,
      category: habitData.category || null,
      frequency: habitData.frequency || null,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    emoji: data.emoji,
    color: data.color,
    weeklyGoal: data.weekly_goal,
    category: data.category,
    frequency: data.frequency,
    createdAt: new Date(data.created_at).getTime(),
  };
};

const _updateHabit = async (userId, habitId, updates) => {
  const dbUpdates = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.emoji !== undefined) dbUpdates.emoji = updates.emoji;
  if (updates.color !== undefined) dbUpdates.color = updates.color;
  if (updates.weeklyGoal !== undefined) dbUpdates.weekly_goal = updates.weeklyGoal;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.frequency !== undefined) dbUpdates.frequency = updates.frequency;
  
  const { error } = await supabase
    .from('habits')
    .update(dbUpdates)
    .eq('id', habitId)
    .eq('user_id', userId);
  
  if (error) throw error;
};

const _deleteHabit = async (userId, habitId) => {
  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', habitId)
    .eq('user_id', userId);
  
  if (error) throw error;
};

const _getHabits = async (userId) => {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  
  return data.map(habit => ({
    id: habit.id,
    name: habit.name,
    description: habit.description,
    emoji: habit.emoji,
    color: habit.color,
    weeklyGoal: habit.weekly_goal,
    category: habit.category,
    frequency: habit.frequency,
    createdAt: new Date(habit.created_at).getTime(),
  }));
};

const _subscribeToHabits = (userId, callback) => {
  _getHabits(userId).then(callback).catch(console.error);
  
  const channel = supabase
    .channel(`habits:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'habits',
        filter: `user_id=eq.${userId}`,
      },
      async () => {
        const habits = await _getHabits(userId);
        callback(habits);
      }
    )
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
};

// CALENDAR ENTRY OPERATIONS

const _updateCalendarEntry = async (userId, date, completedHabitIds, habitDetails = {}) => {
  if (completedHabitIds.length === 0) {
    const { data: existingEntry } = await supabase
      .from('calendar_entries')
      .select('id')
      .eq('user_id', userId)
      .eq('date', date)
      .single();
    
    if (existingEntry) {
      await supabase
        .from('calendar_entries')
        .delete()
        .eq('id', existingEntry.id);
    }
    return;
  }
  
  const { data: entry, error: entryError } = await supabase
    .from('calendar_entries')
    .upsert(
      { user_id: userId, date },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single();
  
  if (entryError) throw entryError;
  
  const { data: existingCompletions } = await supabase
    .from('habit_completions')
    .select('habit_id')
    .eq('calendar_entry_id', entry.id);
  
  const existingHabitIds = existingCompletions?.map(c => c.habit_id) || [];
  
  const toAdd = completedHabitIds.filter(id => !existingHabitIds.includes(id));
  const toRemove = existingHabitIds.filter(id => !completedHabitIds.includes(id));
  
  if (toRemove.length > 0) {
    await supabase
      .from('habit_completions')
      .delete()
      .eq('calendar_entry_id', entry.id)
      .in('habit_id', toRemove);
  }
  
  if (toAdd.length > 0) {
    const completions = toAdd.map(habitId => ({
      calendar_entry_id: entry.id,
      habit_id: habitId,
      completed_at: habitDetails[habitId]?.completedAt || new Date().toISOString(),
    }));
    
    const { error: insertError } = await supabase
      .from('habit_completions')
      .insert(completions);
    
    if (insertError) throw insertError;
  }
};

const _getCalendarEntry = async (userId, date) => {
  const { data, error } = await supabase
    .from('calendar_entries')
    .select(`
      id,
      date,
      habit_completions (
        habit_id,
        completed_at
      )
    `)
    .eq('user_id', userId)
    .eq('date', date)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;
  
  const completedHabits = data.habit_completions.map(c => c.habit_id);
  const habits = {};
  data.habit_completions.forEach(c => {
    habits[c.habit_id] = {
      completedAt: c.completed_at,
      habitId: c.habit_id,
    };
  });
  
  return {
    date: data.date,
    completedHabits,
    habits,
  };
};

const _getAllCalendarEntries = async (userId) => {
  const { data, error } = await supabase
    .from('calendar_entries')
    .select(`
      id,
      date,
      habit_completions (
        habit_id,
        completed_at
      )
    `)
    .eq('user_id', userId);
  
  if (error) throw error;
  
  const entries = {};
  data.forEach(entry => {
    const completedHabits = entry.habit_completions.map(c => c.habit_id);
    const habits = {};
    entry.habit_completions.forEach(c => {
      habits[c.habit_id] = {
        completedAt: c.completed_at,
        habitId: c.habit_id,
      };
    });
    
    entries[entry.date] = {
      date: entry.date,
      completedHabits,
      habits,
    };
  });
  
  return entries;
};

const _subscribeToCalendarEntries = (userId, callback) => {
  _getAllCalendarEntries(userId).then(callback).catch(console.error);
  
  const entriesChannel = supabase
    .channel(`calendar_entries:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'calendar_entries',
        filter: `user_id=eq.${userId}`,
      },
      async () => {
        const entries = await _getAllCalendarEntries(userId);
        callback(entries);
      }
    )
    .subscribe();
  
  const completionsChannel = supabase
    .channel(`habit_completions:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'habit_completions',
      },
      async () => {
        const entries = await _getAllCalendarEntries(userId);
        callback(entries);
      }
    )
    .subscribe();
  
  return () => {
    supabase.removeChannel(entriesChannel);
    supabase.removeChannel(completionsChannel);
  };
};

const _getCalendarEntriesForRange = async (userId, startDate, endDate) => {
  const { data, error } = await supabase
    .from('calendar_entries')
    .select(`
      id,
      date,
      habit_completions (
        habit_id,
        completed_at
      )
    `)
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate);
  
  if (error) throw error;
  
  const entries = {};
  data.forEach(entry => {
    const completedHabits = entry.habit_completions.map(c => c.habit_id);
    const habits = {};
    entry.habit_completions.forEach(c => {
      habits[c.habit_id] = {
        completedAt: c.completed_at,
        habitId: c.habit_id,
      };
    });
    
    entries[entry.date] = {
      date: entry.date,
      completedHabits,
      habits,
    };
  });
  
  return entries;
};
