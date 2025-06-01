import { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import {
  createHabit,
  updateHabit,
  deleteHabit,
  subscribeToHabits,
} from '../services/db';

export const useHabits = () => {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubscribe = subscribeToHabits(auth.currentUser.uid, (habitsList) => {
      setHabits(habitsList);
      setLoading(false);
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
      return newHabit;
    } catch (err) {
      setError('Failed to create habit');
      console.error('Error creating habit:', err);
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
      return true;
    } catch (err) {
      setError('Failed to update habit');
      console.error('Error updating habit:', err);
      return false;
    }
  };

  const removeHabit = async (habitId) => {
    if (!auth.currentUser) {
      setError('User not authenticated');
      return false;
    }

    try {
      setError(null);
      await deleteHabit(auth.currentUser.uid, habitId);
      return true;
    } catch (err) {
      setError('Failed to delete habit');
      console.error('Error deleting habit:', err);
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