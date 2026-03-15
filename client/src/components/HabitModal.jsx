import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import useScrollLock from '../hooks/useScrollLock';
import CalendarCell from './CalendarCell';
import { PatternBackgroundSvg } from './PatternBackground';
import bundledPatternConfig from '../config/patternPresets.json';
import {
  createPatternConfigClone,
  getAutoPatternPreset,
  getHabitSeedOffset,
} from '../utils/patterns';
import styles from './HabitModal.module.scss';

const DEFAULT_PATTERN_CONFIG = createPatternConfigClone(bundledPatternConfig);
const AUTO_PATTERN_ID = 'auto';

const commonEmojis = [
  '💪', '🏃‍♂️', '🏋️‍♀️', '🧘‍♀️', '🚶‍♂️', '🏊‍♂️', '🚴‍♂️', '🧗‍♂️',
  '🤸‍♂️', '⚽', '🏈', '⛹️‍♂️', '🥊', '🎾', '🎯', '⛰️',
  '🧠', '❤️', '🍎', '🥤', '💊', '🛁', '😴', '🧋',
  '💼', '💻', '📊', '💹', '✉️', '📱', '⏰', '✅',
  '📚', '✍️', '🔬', '📖', '🎨', '🎵', '🎬', '📷',
  '💰', '💸', '📈', '🔥', '⭐', '🌟', '💎', '🚀',
  '🏠', '🌱', '🧹', '🍳', '🛠️', '💧', '🌺', '📝',
];

const predefinedColors = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#ff6b35', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#fab1a0', '#fd79a8', '#6c5ce7',
  '#2d3436', '#636e72', '#00b894', '#00cec9', '#e17055', '#d63031', '#a29bfe', '#fd79a8',
  '#e67e22', '#e74c3c', '#f39c12', '#f1c40f', '#27ae60', '#2ecc71', '#16a085', '#1abc9c',
  '#3498db', '#9b59b6', '#34495e', '#95a5a6', '#7f8c8d', '#bdc3c7', '#ecf0f1', '#2c3e50',
  '#ff7675', '#74b9ff', '#00b894', '#fdcb6e', '#6c5ce7', '#fd79a8', '#55a3ff', '#26de81',
];

const createInitialFormData = (habit = null) => ({
  name: habit?.name || '',
  description: habit?.description || '',
  emoji: habit?.emoji || '📝',
  color: habit?.color || '#3b82f6',
  patternPresetId: habit?.patternPresetId || null,
  weeklyGoal: habit?.weeklyGoal || 3,
});

const PATTERN_OPTIONS = [
  {
    id: AUTO_PATTERN_ID,
    name: 'Auto',
    description: 'Use the default pattern for this habit.',
    preset: null,
  },
  ...Object.values(DEFAULT_PATTERN_CONFIG.presets).map((preset) => ({
    id: preset.id,
    name: preset.name,
    description: `${preset.layers.length} ${preset.layers.length === 1 ? 'layer' : 'layers'}`,
    preset,
  })),
];

const HabitModal = ({
  isOpen,
  onClose,
  onSave,
  habit = null,
  mode = 'create',
}) => {
  const [formData, setFormData] = useState(() => createInitialFormData(habit));
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    setFormData(createInitialFormData(mode === 'edit' ? habit : null));
    setErrors({});
    setStep(1);
    setIsSubmitting(false);
  }, [habit, isOpen, mode]);

  const previewDay = useMemo(() => {
    const currentDay = dayjs();
    return {
      date: currentDay.format('YYYY-MM-DD'),
      dayjs: currentDay,
      isCurrentMonth: true,
      isToday: true,
    };
  }, []);

  const previewHabit = useMemo(() => ({
    id: habit?.id || 'habit-preview',
    name: formData.name.trim() || 'Habit name',
    description: formData.description.trim(),
    emoji: formData.emoji,
    color: formData.color,
    patternPresetId: formData.patternPresetId,
    weeklyGoal: formData.weeklyGoal,
  }), [formData, habit?.id]);

  const activePatternOptionId = formData.patternPresetId || AUTO_PATTERN_ID;

  const validateStepOne = useCallback(() => {
    const nextErrors = {};

    if (!formData.name.trim()) {
      nextErrors.name = 'Habit name is required';
    } else if (formData.name.trim().length < 2) {
      nextErrors.name = 'Habit name must be at least 2 characters';
    }

    if (formData.weeklyGoal < 1 || formData.weeklyGoal > 7) {
      nextErrors.weeklyGoal = 'Weekly goal must be between 1 and 7';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [formData.name, formData.weeklyGoal]);

  const handleNextStep = useCallback(() => {
    if (!validateStepOne()) return;
    setStep(2);
  }, [validateStepOne]);

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();

    if (step === 1) {
      handleNextStep();
      return;
    }

    if (!validateStepOne()) {
      setStep(1);
      return;
    }

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
  }, [formData, habit, mode, onClose, onSave, step, validateStepOne, handleNextStep]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === 'Enter' && !isSubmitting && event.target.tagName !== 'TEXTAREA') {
        event.preventDefault();
        if (step === 1) {
          handleNextStep();
        } else {
          handleSubmit(event);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleNextStep, handleSubmit, isOpen, isSubmitting, onClose, step]);

  const handleInputChange = useCallback((field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: '' }));
    }
  }, [errors]);

  const handlePatternChange = useCallback((patternId) => {
    handleInputChange('patternPresetId', patternId === AUTO_PATTERN_ID ? null : patternId);
  }, [handleInputChange]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(event) => event.stopPropagation()} data-onboarding="habit-modal">
        <div className={styles.modalHeader}>
          <div className={styles.headerCopy}>
            <h2>{mode === 'edit' ? 'Edit Habit' : 'Create New Habit'}</h2>
            <p>
              {step === 1
                ? 'Start with the habit details people care about first.'
                : 'Now choose the visual style and preview the day cell.'}
            </p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.progressSteps} aria-label="Habit setup progress">
          <div className={`${styles.progressStep} ${styles.activeStep}`}>
            <span className={styles.progressIndex}>1</span>
            <div>
              <strong>Basics</strong>
              <span>Name, description, weekly goal</span>
            </div>
          </div>
          <div className={`${styles.progressConnector} ${step === 2 ? styles.progressConnectorActive : ''}`} />
          <div className={`${styles.progressStep} ${step === 2 ? styles.activeStep : ''}`}>
            <span className={styles.progressIndex}>2</span>
            <div>
              <strong>Style</strong>
              <span>Emoji, color, pattern, preview</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {step === 1 ? (
            <div className={styles.stepPanel}>
              <div className={styles.field}>
                <label htmlFor="name">Habit Name *</label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(event) => handleInputChange('name', event.target.value)}
                  placeholder="e.g., Morning workout"
                  className={errors.name ? styles.error : ''}
                />
                {errors.name && <span className={styles.errorText}>{errors.name}</span>}
              </div>

              <div className={styles.field}>
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(event) => handleInputChange('description', event.target.value)}
                  placeholder="Optional context or motivation..."
                  rows={4}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="weeklyGoal">Weekly Goal *</label>
                <select
                  id="weeklyGoal"
                  value={formData.weeklyGoal}
                  onChange={(event) => handleInputChange('weeklyGoal', parseInt(event.target.value, 10))}
                  className={errors.weeklyGoal ? styles.error : ''}
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((count) => (
                    <option key={count} value={count}>
                      {count} {count === 1 ? 'time' : 'times'} per week
                    </option>
                  ))}
                </select>
                {errors.weeklyGoal && <span className={styles.errorText}>{errors.weeklyGoal}</span>}
              </div>

              <div className={styles.summaryPanel}>
                <span className={styles.summaryEyebrow}>Step 1 summary</span>
                <div className={styles.summaryCard} style={{ '--habit-color': formData.color }}>
                  <span className={styles.summaryEmoji}>{formData.emoji}</span>
                  <div>
                    <div className={styles.summaryName}>{formData.name.trim() || 'Habit name'}</div>
                    <div className={styles.summaryMeta}>{formData.weeklyGoal} times each week</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.stepTwoLayout}>
              <div className={styles.stylePanel}>
                <div className={styles.field}>
                  <label>Emoji</label>
                  <div className={styles.emojiContainer}>
                    <div className={styles.selectedEmoji}>
                      {formData.emoji}
                    </div>
                    <div className={styles.emojiGrid}>
                      {commonEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className={`${styles.emojiOption} ${formData.emoji === emoji ? styles.selected : ''}`}
                          onClick={() => handleInputChange('emoji', emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={styles.field}>
                  <label>Color</label>
                  <div className={styles.colorContainer}>
                    <div
                      className={styles.selectedColor}
                      style={{ backgroundColor: formData.color }}
                    />
                    <div className={styles.colorGrid}>
                      {predefinedColors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`${styles.colorOption} ${formData.color === color ? styles.selected : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => handleInputChange('color', color)}
                          aria-label={`Select color ${color}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className={styles.field}>
                  <label>Pattern</label>
                  <div className={styles.patternGrid}>
                    {PATTERN_OPTIONS.map((option) => {
                      const preset = option.preset || getAutoPatternPreset(`${formData.emoji}-${formData.name || 'habit'}`);
                      const patternLayers = [{
                        color: formData.color,
                        habitId: `pattern-swatch-${option.id}`,
                        preset,
                        seed: getHabitSeedOffset(`pattern-swatch-${option.id}`),
                        opacityMultiplier: 1,
                        scaleMultiplier: 1,
                      }];

                      return (
                        <button
                          key={option.id}
                          type="button"
                          className={`${styles.patternOption} ${activePatternOptionId === option.id ? styles.selected : ''}`}
                          onClick={() => handlePatternChange(option.id)}
                        >
                          <div className={styles.patternPreview} style={{ '--habit-color': formData.color }}>
                            <PatternBackgroundSvg
                              patternLayers={patternLayers}
                              seed={getHabitSeedOffset(`pattern-svg-${option.id}`)}
                            />
                            <span className={styles.patternPreviewEmoji}>{formData.emoji}</span>
                          </div>
                          <div className={styles.patternOptionText}>
                            <strong>{option.name}</strong>
                            <span>{option.description}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className={styles.previewPanel}>
                <div className={styles.previewHeader}>
                  <span className={styles.summaryEyebrow}>Live preview</span>
                  <h3>Today on your calendar</h3>
                  <p>{previewDay.dayjs.format('dddd, MMMM D')}</p>
                </div>

                <div className={styles.calendarPreviewFrame}>
                  <div className={styles.calendarPreviewCell}>
                    <CalendarCell
                      day={previewDay}
                      habits={[previewHabit]}
                      patternConfig={DEFAULT_PATTERN_CONFIG}
                      completedHabits={[previewHabit.id]}
                      onHabitDetailClick={() => {}}
                      onDayClick={() => {}}
                      onDayHabitsClick={() => {}}
                      hasHabitMetWeeklyGoal={() => false}
                      isCurrentMonth={true}
                      isToday={true}
                      animationIndex={0}
                      calendarEntries={{}}
                      habitProgressByDate={{}}
                      isPreview={true}
                      previewScale="month"
                      disableInteractions={true}
                      disableAnimations={true}
                    />
                  </div>
                  <div className={styles.previewDetails}>
                    <div className={styles.summaryCard} style={{ '--habit-color': formData.color }}>
                      <span className={styles.summaryEmoji}>{formData.emoji}</span>
                      <div>
                        <div className={styles.summaryName}>{formData.name.trim() || 'Habit name'}</div>
                        <div className={styles.summaryMeta}>{formData.weeklyGoal} times each week</div>
                      </div>
                    </div>
                    {formData.description.trim() && (
                      <p className={styles.previewDescription}>{formData.description.trim()}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={styles.actions}>
            <div className={styles.keyboardHints}>
              <span className={styles.keyHint}>
                <span className={styles.key}>↵</span> {step === 1 ? 'Next' : 'Save'}
              </span>
              <span className={styles.keyHint}>
                <span className={styles.key}>Esc</span> Cancel
              </span>
            </div>
            <div className={styles.buttons}>
              <button
                type="button"
                onClick={step === 1 ? onClose : () => setStep(1)}
                className={styles.cancelButton}
                disabled={isSubmitting}
              >
                {step === 1 ? 'Cancel' : 'Back'}
              </button>
              <button
                type="submit"
                className={styles.saveButton}
                disabled={isSubmitting}
              >
                {step === 1
                  ? 'Next'
                  : isSubmitting
                    ? 'Saving...'
                    : mode === 'edit'
                      ? 'Update Habit'
                      : 'Create Habit'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HabitModal;
