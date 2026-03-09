// supabaseDb.js
// Database operations using Supabase (replaces Firebase Realtime Database)
import { supabase } from './supabase';

// ============================================
// USER PROFILE OPERATIONS
// ============================================

export const saveUserProfile = async (userId, profileData) => {
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

export const getUserProfiles = async () => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*');
  
  if (error) throw error;
  
  // Return as object keyed by user ID (Firebase format compatibility)
  return data.reduce((acc, profile) => {
    acc[profile.id] = profile;
    return acc;
  }, {});
};

// ============================================
// HABIT CRUD OPERATIONS
// ============================================

export const createHabit = async (userId, habitData) => {
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
  
  // Return in Firebase-compatible format
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

export const updateHabit = async (userId, habitId, updates) => {
  // Map camelCase to snake_case
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
    .eq('user_id', userId); // Ensure user owns the habit
  
  if (error) throw error;
};

export const deleteHabit = async (userId, habitId) => {
  // Delete habit (cascade will handle habit_completions)
  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', habitId)
    .eq('user_id', userId);
  
  if (error) throw error;
};

export const getHabits = async (userId) => {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  
  // Transform to Firebase-compatible format
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

export const subscribeToHabits = (userId, callback) => {
  // Initial fetch
  getHabits(userId).then(callback).catch(console.error);
  
  // Subscribe to changes
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
        // Refetch all habits on any change
        const habits = await getHabits(userId);
        callback(habits);
      }
    )
    .subscribe();
  
  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
};

// ============================================
// CALENDAR ENTRY OPERATIONS
// ============================================

export const updateCalendarEntry = async (userId, date, completedHabitIds, habitDetails = {}) => {
  if (completedHabitIds.length === 0) {
    // Delete the entry if no habits completed
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
  
  // Upsert calendar entry
  const { data: entry, error: entryError } = await supabase
    .from('calendar_entries')
    .upsert(
      { user_id: userId, date },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single();
  
  if (entryError) throw entryError;
  
  // Get existing completions
  const { data: existingCompletions } = await supabase
    .from('habit_completions')
    .select('habit_id')
    .eq('calendar_entry_id', entry.id);
  
  const existingHabitIds = existingCompletions?.map(c => c.habit_id) || [];
  
  // Determine what to add/remove
  const toAdd = completedHabitIds.filter(id => !existingHabitIds.includes(id));
  const toRemove = existingHabitIds.filter(id => !completedHabitIds.includes(id));
  
  // Remove completions
  if (toRemove.length > 0) {
    await supabase
      .from('habit_completions')
      .delete()
      .eq('calendar_entry_id', entry.id)
      .in('habit_id', toRemove);
  }
  
  // Add completions
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

export const getCalendarEntry = async (userId, date) => {
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
  
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  if (!data) return null;
  
  // Transform to Firebase-compatible format
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

export const getAllCalendarEntries = async (userId) => {
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
  
  // Transform to Firebase-compatible format (object keyed by date)
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

export const subscribeToCalendarEntries = (userId, callback) => {
  // Initial fetch
  getAllCalendarEntries(userId).then(callback).catch(console.error);
  
  // Subscribe to calendar_entries changes
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
        const entries = await getAllCalendarEntries(userId);
        callback(entries);
      }
    )
    .subscribe();
  
  // Subscribe to habit_completions changes
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
        const entries = await getAllCalendarEntries(userId);
        callback(entries);
      }
    )
    .subscribe();
  
  // Return unsubscribe function
  return () => {
    supabase.removeChannel(entriesChannel);
    supabase.removeChannel(completionsChannel);
  };
};

export const getCalendarEntriesForRange = async (userId, startDate, endDate) => {
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
  
  // Transform to Firebase-compatible format
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
