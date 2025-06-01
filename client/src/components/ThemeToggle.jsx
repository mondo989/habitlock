import { useTheme } from '../context/ThemeContext';
import styles from './ThemeToggle.module.scss';

const ThemeToggle = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      className={`${styles.themeToggle} ${isDarkMode ? styles.dark : styles.light}`}
      onClick={toggleTheme}
      title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
    >
      <div className={styles.toggleTrack}>
        <div className={styles.toggleThumb}>
          <span className={styles.toggleIcon}>
            {isDarkMode ? '🌙' : '☀️'}
          </span>
        </div>
      </div>
    </button>
  );
};

export default ThemeToggle; 