import { useState, useEffect, useRef } from 'react';
import { authSync } from '../services/supabase';
import {
  createHabit,
  updateHabit,
  deleteHabit,
  subscribeToHabits,
} from '../services/supabaseDb';
import analytics from '../services/analytics';

export const useHabits = () => {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Use stable userId instead of auth.currentUser object reference
  const userId = authSync.currentUser?.uid ?? null;
  const prevUserIdRef = useRef(userId);

  useEffect(() => {
    // Reset state when user changes (including logout)
    if (prevUserIdRef.current !== userId) {
      setHabits([]);
      setLoading(true);
      setError(null);
      prevUserIdRef.current = userId;
    }

    if (!userId) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToHabits(userId, (habitsList) => {
      setHabits(habitsList);
      setLoading(false);
      
      // Track habits loaded event
      analytics.capture('habits_loaded', {
        habit_count: habitsList.length,
        user_id: userId
      });
    });

    return unsubscribe;
  }, [userId]);

  const addHabit = async (habitData) => {
    if (!authSync.currentUser) {
      setError('User not authenticated');
      return null;
    }

    // Create temporary ID for optimistic update
    const tempId = `temp_${Date.now()}`;
    const tempHabit = {
      id: tempId,
      ...habitData,
      emoji: habitData.emoji || '✅',
      color: habitData.color || '#4CAF50',
      weeklyGoal: habitData.weeklyGoal || 7,
      createdAt: Date.now(),
    };

    // Optimistic update: add to UI immediately
    const previousHabits = [...habits];
    setHabits(prevHabits => [...prevHabits, tempHabit]);

    try {
      setError(null);
      const newHabit = await createHabit(authSync.currentUser.uid, habitData);
      
      // Replace temp habit with real one from server
      setHabits(prevHabits => 
        prevHabits.map(h => h.id === tempId ? newHabit : h)
      );
      
      analytics.capture('habit_created', {
        habit_name: habitData.name,
        habit_category: habitData.category,
        frequency: habitData.frequency,
        user_id: authSync.currentUser.uid
      });
      
      return newHabit;
    } catch (err) {
      // Rollback on error
      setHabits(previousHabits);
      setError('Failed to create habit');
      console.error('Error creating habit:', err);
      
      analytics.capture('habit_creation_failed', {
        error: err.message,
        user_id: authSync.currentUser.uid
      });
      
      return null;
    }
  };

  const editHabit = async (habitId, updates) => {
    if (!authSync.currentUser) {
      setError('User not authenticated');
      return false;
    }

    // Optimistic update: apply changes immediately
    const previousHabits = [...habits];
    setHabits(prevHabits => 
      prevHabits.map(habit => 
        habit.id === habitId ? { ...habit, ...updates } : habit
      )
    );

    try {
      setError(null);
      await updateHabit(authSync.currentUser.uid, habitId, updates);
      
      analytics.capture('habit_updated', {
        habit_id: habitId,
        updated_fields: Object.keys(updates),
        user_id: authSync.currentUser.uid
      });
      
      return true;
    } catch (err) {
      // Rollback on error
      setHabits(previousHabits);
      setError('Failed to update habit');
      console.error('Error updating habit:', err);
      
      analytics.capture('habit_update_failed', {
        habit_id: habitId,
        error: err.message,
        user_id: authSync.currentUser.uid
      });
      
      return false;
    }
  };

  const removeHabit = async (habitId) => {
    if (!authSync.currentUser) {
      setError('User not authenticated');
      return false;
    }

    const habitToDelete = habits.find(h => h.id === habitId);

    // Optimistic update: remove from UI immediately
    const previousHabits = [...habits];
    setHabits(prevHabits => prevHabits.filter(habit => habit.id !== habitId));

    try {
      setError(null);
      await deleteHabit(authSync.currentUser.uid, habitId);
      
      analytics.capture('habit_deleted', {
        habit_id: habitId,
        habit_name: habitToDelete?.name,
        days_tracked: habitToDelete?.completions?.length || 0,
        user_id: authSync.currentUser.uid
      });
      
      return true;
    } catch (err) {
      // Rollback on error
      setHabits(previousHabits);
      setError('Failed to delete habit');
      console.error('Error deleting habit:', err);
      
      analytics.capture('habit_deletion_failed', {
        habit_id: habitId,
        error: err.message,
        user_id: authSync.currentUser.uid
      });
      
      return false;
    }
  };

  const getHabitById = (habitId) => {
    return habits.find(habit => habit.id === habitId);
  };

  const getHabitsByIds = (habitIds) => {
    return habits.filter(habit => habitIds.includes(habit.id));
  };

  return {
    habits,
    loading,
    error,
    addHabit,
    editHabit,
    removeHabit,
    getHabitById,
    getHabitsByIds,
  };
}; 