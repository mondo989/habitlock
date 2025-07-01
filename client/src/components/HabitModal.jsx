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

  // Common emojis for habits - expanded to 48 emojis (6 rows × 8 columns)
  const commonEmojis = [
    // Row 1 - Basic habits & activities
    '📝', '💪', '🏃‍♂️', '📚', '🧘‍♀️', '💧', '🥗', '😴',
    // Row 2 - Goals & productivity  
    '🎯', '💼', '🎨', '🎵', '📱', '🌱', '☕', '🧹',
    // Row 3 - Achievement & motivation
    '🔥', '⭐', '✨', '🎉', '🌟', '💎', '🚀', '📈',
    // Row 4 - Health & wellness
    '🏋️‍♀️', '🚶‍♂️', '🧠', '❤️', '🍎', '🥤', '💊', '🛁',
    // Row 5 - Learning & creativity
    '✍️', '🔬', '💻', '📖', '🎭', '🎪', '🎬', '📷',
    // Row 6 - Lifestyle & hobbies
    '🏠', '🌺', '🎸', '🍳', '🧧', '🎲', '⚽', '🎮'
  ];

  // Predefined colors - 48 diverse, vibrant colors (6 rows × 8 columns)
  const predefinedColors = [
    // Row 1 - Vibrant Primary & Secondary Colors
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
    // Row 2 - Bright & Bold Colors
    '#ff6b35', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#fab1a0', '#fd79a8', '#6c5ce7',
    // Row 3 - Rich & Deep Colors
    '#2d3436', '#636e72', '#00b894', '#00cec9', '#e17055', '#d63031', '#a29bfe', '#fd79a8',
    // Row 4 - Warm & Earthy Tones
    '#e67e22', '#e74c3c', '#f39c12', '#f1c40f', '#27ae60', '#2ecc71', '#16a085', '#1abc9c',
    // Row 5 - Cool & Professional
    '#3498db', '#9b59b6', '#34495e', '#95a5a6', '#7f8c8d', '#bdc3c7', '#ecf0f1', '#2c3e50',
    // Row 6 - Unique & Special Colors
    '#ff7675', '#74b9ff', '#00b894', '#fdcb6e', '#6c5ce7', '#fd79a8', '#55a3ff', '#26de81'
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