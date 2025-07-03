import { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import {
  createHabit,
  updateHabit,
  deleteHabit,
  subscribeToHabits,
} from '../services/db';
import analytics from '../services/analytics';

export const useHabits = () => {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubscribe = subscribeToHabits(auth.currentUser.uid, (habitsList) => {
      setHabits(habitsList);
      setLoading(false);
      
      // Track habits loaded event
      analytics.capture('habits_loaded', {
        habit_count: habitsList.length,
        user_id: auth.currentUser.uid
      });
    });

    return unsubscribe;
  }, [auth.currentUser]);

  const addHabit = async (habitData) => {
    if (!auth.currentUser) {
      setError('User not authenticated');
      return null;
    }

    try {
      setError(null);
      const newHabit = await createHabit(auth.currentUser.uid, habitData);
      
      // Track habit creation
      analytics.capture('habit_created', {
        habit_name: habitData.name,
        habit_category: habitData.category,
        frequency: habitData.frequency,
        user_id: auth.currentUser.uid
      });
      
      return newHabit;
    } catch (err) {
      setError('Failed to create habit');
      console.error('Error creating habit:', err);
      
      // Track error
      analytics.capture('habit_creation_failed', {
        error: err.message,
        user_id: auth.currentUser.uid
      });
      
      return null;
    }
  };

  const editHabit = async (habitId, updates) => {
    if (!auth.currentUser) {
      setError('User not authenticated');
      return false;
    }

    try {
      setError(null);
      await updateHabit(auth.currentUser.uid, habitId, updates);
      
      // Track habit update
      analytics.capture('habit_updated', {
        habit_id: habitId,
        updated_fields: Object.keys(updates),
        user_id: auth.currentUser.uid
      });
      
      return true;
    } catch (err) {
      setError('Failed to update habit');
      console.error('Error updating habit:', err);
      
      // Track error
      analytics.capture('habit_update_failed', {
        habit_id: habitId,
        error: err.message,
        user_id: auth.currentUser.uid
      });
      
      return false;
    }
  };

  const removeHabit = async (habitId) => {
    if (!auth.currentUser) {
      setError('User not authenticated');
      return false;
    }

    const habitToDelete = habits.find(h => h.id === habitId);

    try {
      setError(null);
      await deleteHabit(auth.currentUser.uid, habitId);
      
      // Track habit deletion
      analytics.capture('habit_deleted', {
        habit_id: habitId,
        habit_name: habitToDelete?.name,
        days_tracked: habitToDelete?.completions?.length || 0,
        user_id: auth.currentUser.uid
      });
      
      return true;
    } catch (err) {
      setError('Failed to delete habit');
      console.error('Error deleting habit:', err);
      
      // Track error
      analytics.capture('habit_deletion_failed', {
        habit_id: habitId,
        error: err.message,
        user_id: auth.currentUser.uid
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