import { useState, useEffect } from 'react';
import { initializeAuth, auth, onAuthChange, signOutUser, getUserInfo } from './services/firebase';
import { ThemeProvider } from './context/ThemeContext';
import CalendarView from './views/CalendarView';
import StatsView from './views/StatsView';
import ThemeToggle from './components/ThemeToggle';
import AuthModal from './components/AuthModal';
import styles from './App.module.scss';

function App() {
  const [currentView, setCurrentView] = useState('calendar');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileDropdown && !event.target.closest(`.${styles.navMeta}`)) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showProfileDropdown]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        setAuthError(null);
        await initializeAuth();
      } catch (error) {
        console.error('Authentication initialization failed:', error);
        setAuthError('Failed to initialize authentication. Please refresh the page.');
      }
    };

    // Set up authentication state listener
    const unsubscribeAuth = onAuthChange((user) => {
      setCurrentUser(user);
      setIsAuthenticated(!!user);
      setIsLoading(false);
      
      if (user) {
        console.log('User authenticated:', user.uid, user.email);
        setAuthError(null);
        setShowAuthModal(false);
      } else {
        console.log('No user authenticated');
        setShowAuthModal(true);
      }
    });

    // Initialize authentication
    initAuth();

    // Cleanup listener on unmount
    return () => unsubscribeAuth();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setShowProfileDropdown(false);
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  if (isLoading) {
    return (
      <ThemeProvider>
        <div className={styles.app}>
          <div className={styles.loadingScreen}>
            <div className={styles.logo}>
              <span className={styles.logoEmoji}>🎯</span>
              <h1>HabitLock</h1>
            </div>
            <div className={styles.spinner}></div>
            <p>Loading your habit tracker...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  if (authError) {
    return (
      <ThemeProvider>
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
      </ThemeProvider>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return (
      <ThemeProvider>
        <div className={styles.app}>
          <div className={styles.authScreen}>
            <div className={styles.logo}>
              <span className={styles.logoEmoji}>🎯</span>
              <h1>HabitLock</h1>
            </div>
            <p className={styles.authDescription}>
              Track your habits and build better routines with personalized insights and streak tracking.
            </p>
          </div>
          <AuthModal 
            isOpen={showAuthModal} 
            onClose={() => {}} // Prevent closing since auth is required
            user={currentUser}
          />
        </div>
      </ThemeProvider>
    );
  }

  const userInfo = getUserInfo();

  return (
    <ThemeProvider>
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

            <div className={styles.navActions}>
              <ThemeToggle />
              <div className={styles.navMeta}>
                <div 
                  className={styles.userProfile}
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                >
                  {userInfo?.photoURL && (
                    <img 
                      src={userInfo.photoURL} 
                      alt="Profile" 
                      className={styles.profileImage}
                    />
                  )}
                  <div className={styles.userDetails}>
                    <span className={styles.userName}>
                      {userInfo?.displayName || userInfo?.email || 'User'}
                    </span>
                    <div className={styles.userStatus}>
                      <span className={styles.statusDot}></span>
                      Connected
                    </div>
                  </div>
                  <span className={`${styles.dropdownArrow} ${showProfileDropdown ? styles.dropdownArrowOpen : ''}`}>▼</span>
                </div>
                
                {showProfileDropdown && (
                  <div className={styles.profileDropdown}>
                    <div className={styles.dropdownHeader}>
                      {userInfo?.photoURL && (
                        <img 
                          src={userInfo.photoURL} 
                          alt="Profile" 
                          className={styles.dropdownProfileImage}
                        />
                      )}
                      <div className={styles.dropdownUserInfo}>
                        <div className={styles.dropdownUserName}>
                          {userInfo?.displayName || 'User'}
                        </div>
                        <div className={styles.dropdownUserEmail}>
                          {userInfo?.email}
                        </div>
                      </div>
                    </div>
                    <div className={styles.dropdownDivider}></div>
                    <div className={styles.dropdownItem} onClick={handleSignOut}>
                      <span className={styles.dropdownIcon}>🚪</span>
                      Sign Out
                    </div>
                  </div>
                )}
              </div>
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
                {' '}MVP by HabitLock Team • Data synced to your Google account
              </span>
            </p>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
}

export default App;
