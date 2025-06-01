import { useState, useEffect } from 'react';
import { initializeAuth, auth } from './services/firebase';
import CalendarView from './views/CalendarView';
import StatsView from './views/StatsView';
import styles from './App.module.scss';

function App() {
  const [currentView, setCurrentView] = useState('calendar');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        setAuthError(null);
        await initializeAuth();
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Authentication failed:', error);
        setAuthError('Failed to initialize authentication. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };

    // Check if user is already authenticated
    if (auth.currentUser) {
      setIsAuthenticated(true);
      setIsLoading(false);
    } else {
      initAuth();
    }
  }, []);

  if (isLoading) {
    return (
      <div className={styles.app}>
        <div className={styles.loadingScreen}>
          <div className={styles.logo}>
            <span className={styles.logoEmoji}>🎯</span>
            <h1>HabitLock</h1>
          </div>
          <div className={styles.spinner}></div>
          <p>Setting up your habit tracker...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className={styles.app}>
        <div className={styles.errorScreen}>
          <div className={styles.logo}>
            <span className={styles.logoEmoji}>🎯</span>
            <h1>HabitLock</h1>
          </div>
          <div className={styles.errorContent}>
            <h2>Oops! Something went wrong</h2>
            <p>{authError}</p>
            <button 
              className={styles.retryButton}
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.app}>
        <div className={styles.authScreen}>
          <div className={styles.logo}>
            <span className={styles.logoEmoji}>🎯</span>
            <h1>HabitLock</h1>
          </div>
          <p>Initializing your anonymous session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      {/* Navigation Header */}
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <div className={styles.logo}>
            <span className={styles.logoEmoji}>🎯</span>
            <h1>HabitLock</h1>
          </div>
          
          <div className={styles.navTabs}>
            <button
              className={`${styles.navTab} ${currentView === 'calendar' ? styles.active : ''}`}
              onClick={() => setCurrentView('calendar')}
            >
              📅 Calendar
            </button>
            <button
              className={`${styles.navTab} ${currentView === 'stats' ? styles.active : ''}`}
              onClick={() => setCurrentView('stats')}
            >
              📊 Stats
            </button>
          </div>

          <div className={styles.navMeta}>
            <span className={styles.userId}>
              {auth.currentUser?.uid ? `User: ${auth.currentUser.uid.slice(-6)}` : ''}
            </span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className={styles.main}>
        {currentView === 'calendar' ? <CalendarView /> : <StatsView />}
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p>
            Built with ❤️ for building better habits • 
            <span className={styles.footerMeta}>
              {' '}MVP by HabitLock Team
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
