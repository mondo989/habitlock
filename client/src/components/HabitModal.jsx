import { useState, useEffect } from 'react';
import styles from './HabitModal.module.scss';

const HabitModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  habit = null, 
  mode = 'create' // 'create' or 'edit'
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    emoji: '📝',
    color: '#3b82f6',
    weeklyGoal: 3,
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Common emojis for habits
  const commonEmojis = [
    '📝', '💪', '🏃‍♂️', '📚', '🧘‍♀️', '💧', '🥗', '😴', 
    '🎯', '💼', '🎨', '🎵', '📱', '🌱', '☕', '🧹',
    '🔥', '⭐', '✨', '🎉', '🌟', '💎', '🚀', '📈'
  ];

  // Predefined colors - 24 beautiful, distinct colors
  const predefinedColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
    '#8b5cf6', '#06b6d4', '#f97316', '#84cc16',
    '#ec4899', '#6366f1', '#14b8a6', '#f43f5e',
    '#0ea5e9', '#dc2626', '#059669', '#d97706',
    '#7c3aed', '#0891b2', '#ea580c', '#65a30d',
    '#db2777', '#4f46e5', '#0d9488', '#be123c'
  ];

  useEffect(() => {
    if (habit && mode === 'edit') {
      setFormData({
        name: habit.name || '',
        description: habit.description || '',
        emoji: habit.emoji || '📝',
        color: habit.color || '#3b82f6',
        weeklyGoal: habit.weeklyGoal || 3,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        emoji: '📝',
        color: '#3b82f6',
        weeklyGoal: 3,
      });
    }
    setErrors({});
  }, [habit, mode, isOpen]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Habit name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Habit name must be at least 2 characters';
    }
    
    if (formData.weeklyGoal < 1 || formData.weeklyGoal > 7) {
      newErrors.weeklyGoal = 'Weekly goal must be between 1 and 7';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const habitData = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim(),
      };
      
      if (mode === 'edit' && habit) {
        await onSave(habit.id, habitData);
      } else {
        await onSave(habitData);
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving habit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter' && !isSubmitting) {
        // Only handle Enter if not focused on a textarea
        if (e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          handleSubmit(e);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, formData]); // Include formData to ensure latest form state

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{mode === 'edit' ? 'Edit Habit' : 'Create New Habit'}</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Habit Name */}
          <div className={styles.field}>
            <label htmlFor="name">Habit Name *</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., Morning workout"
              className={errors.name ? styles.error : ''}
            />
            {errors.name && <span className={styles.errorText}>{errors.name}</span>}
          </div>

          {/* Description */}
          <div className={styles.field}>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Optional description..."
              rows={3}
            />
          </div>

          {/* Emoji Selection */}
          <div className={styles.field}>
            <label>Emoji</label>
            <div className={styles.emojiContainer}>
              <div className={styles.selectedEmoji}>
                {formData.emoji}
              </div>
              <div className={styles.emojiGrid}>
                {commonEmojis.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    className={`${styles.emojiOption} ${
                      formData.emoji === emoji ? styles.selected : ''
                    }`}
                    onClick={() => handleInputChange('emoji', emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Color Selection */}
          <div className={styles.field}>
            <label>Color</label>
            <div className={styles.colorContainer}>
              <div 
                className={styles.selectedColor}
                style={{ backgroundColor: formData.color }}
              />
              <div className={styles.colorGrid}>
                {predefinedColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={styles.colorOption}
                    style={{ backgroundColor: color }}
                    onClick={() => handleInputChange('color', color)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Weekly Goal */}
          <div className={styles.field}>
            <label htmlFor="weeklyGoal">Weekly Goal *</label>
            <select
              id="weeklyGoal"
              value={formData.weeklyGoal}
              onChange={(e) => handleInputChange('weeklyGoal', parseInt(e.target.value))}
              className={errors.weeklyGoal ? styles.error : ''}
            >
              {[1, 2, 3, 4, 5, 6, 7].map(num => (
                <option key={num} value={num}>
                  {num} {num === 1 ? 'time' : 'times'} per week
                </option>
              ))}
            </select>
            {errors.weeklyGoal && <span className={styles.errorText}>{errors.weeklyGoal}</span>}
          </div>

          {/* Preview */}
          <div className={styles.preview}>
            <h4>Preview:</h4>
            <div 
              className={styles.previewCard}
              style={{ backgroundColor: `${formData.color}20`, borderColor: formData.color }}
            >
              <span className={styles.previewEmoji}>{formData.emoji}</span>
              <div className={styles.previewText}>
                <div className={styles.previewName}>
                  {formData.name || 'Habit name'}
                </div>
                <div className={styles.previewGoal}>
                  Goal: {formData.weeklyGoal} times/week
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={styles.actions}>
            <div className={styles.keyboardHints}>
              <span className={styles.keyHint}>
                <span className={styles.key}>↵</span> Save
              </span>
              <span className={styles.keyHint}>
                <span className={styles.key}>Esc</span> Cancel
              </span>
            </div>
            <div className={styles.buttons}>
              <button
                type="button"
                onClick={onClose}
                className={styles.cancelButton}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.saveButton}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : (mode === 'edit' ? 'Update Habit' : 'Create Habit')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HabitModal; 