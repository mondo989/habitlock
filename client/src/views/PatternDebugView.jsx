import usePatternConfig from '../hooks/usePatternConfig';
import { useHabits } from '../hooks/useHabits';
import { useCalendar } from '../hooks/useCalendar';
import PatternDebugPanel from '../components/PatternDebugPanel';
import styles from './PatternDebugView.module.scss';

const PatternDebugView = () => {
  const { habits, loading: habitsLoading, error: habitsError } = useHabits();
  const {
    patternConfig,
    saveConfig: savePatternConfig,
    saving: savingPatternConfig,
    error: patternConfigError,
  } = usePatternConfig();
  const {
    calendarMatrix,
    calendarEntries,
    loading: calendarLoading,
    error: calendarError,
    getCompletedHabits,
    hasHabitMetWeeklyGoal,
  } = useCalendar(habits);

  const loading = habitsLoading || calendarLoading;
  const error = habitsError || calendarError;

  if (loading) {
    return (
      <div className={styles.patternDebugView}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading pattern debug…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.patternDebugView}>
        <div className={styles.error}>
          <p>Error loading debug data: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.patternDebugView}>
      <PatternDebugPanel
        habits={habits}
        patternConfig={patternConfig}
        saving={savingPatternConfig}
        error={patternConfigError}
        onSaveConfig={savePatternConfig}
        calendarMatrix={calendarMatrix}
        getCompletedHabits={getCompletedHabits}
        calendarEntries={calendarEntries}
        hasHabitMetWeeklyGoal={hasHabitMetWeeklyGoal}
        patternType="mixed"
      />
    </div>
  );
};

export default PatternDebugView;
