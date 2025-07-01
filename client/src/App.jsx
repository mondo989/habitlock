import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { initializeAuth, auth, onAuthChange, signOutUser, getUserInfo } from './services/firebase';
import analytics from './services/analytics';
import { ThemeProvider } from './context/ThemeContext';
import CalendarView from './views/CalendarView';
import StatsView from './views/StatsView';
import AchievementsView from './views/AchievementsView';
import ThemeToggle from './components/ThemeToggle';
import LandingPage from './components/LandingPage';
import OnboardingCarousel from './components/OnboardingCarousel';
import styles from './App.module.scss';

// Main App Layout component (for authenticated users)
function AppLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Get current view from URL
  const currentView = location.pathname.substring(1) || 'calendar';

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

  // Set up authentication state listener
  useEffect(() => {
    const unsubscribeAuth = onAuthChange((user) => {
      setCurrentUser(user);
      
      if (user) {
        console.log('User authenticated:', user.uid, user.email);
        
        // Track user authentication for analytics (optional)
        analytics.trackUserAction('user_authenticated', {
          userId: user.uid,
          email: user.email,
        });
        
        // Check if this is a first-time user
        const hasCompletedOnboarding = localStorage.getItem('habitlock_onboarding_completed');
        if (!hasCompletedOnboarding) {
          setShowOnboarding(true);
          analytics.trackEvent('onboarding_started');
        }
      } else {
        console.log('No user authenticated');
        setShowOnboarding(false);
        // Redirect to landing page if not authenticated
        navigate('/');
      }
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setShowProfileDropdown(false);
      navigate('/');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    analytics.trackEvent('onboarding_completed');
  };

  const userInfo = getUserInfo();

  return (
    <div className={styles.app}>
      {/* Navigation Header */}
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <div 
            className={styles.logo}
            onClick={() => navigate('/calendar')}
          >
            <img src="/habit-lock-logo.svg" alt="HabitLock Logo" className={styles.logoIcon} />
            <h1>HabitLock</h1>
          </div>
          
          <div className={styles.navTabs}>
            <button
              className={`${styles.navTab} ${currentView === 'calendar' ? styles.active : ''}`}
              onClick={() => navigate('/calendar')}
            >
              📅 Calendar
            </button>
            <button
              className={`${styles.navTab} ${currentView === 'stats' ? styles.active : ''}`}
              onClick={() => navigate('/stats')}
            >
              📊 Stats
            </button>
            <button
              className={`${styles.navTab} ${currentView === 'achievements' ? styles.active : ''}`}
              onClick={() => navigate('/achievements')}
            >
              🏆 Achievements
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
        {children}
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

      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingCarousel onComplete={handleOnboardingComplete} />
      )}
    </div>
  );
}

// Protected Route component
function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        setAuthError(null);
        await initializeAuth();
        
        // Initialize analytics after authentication is ready
        analytics.initializeClarity();
      } catch (error) {
        console.error('Authentication initialization failed:', error);
        setAuthError('Failed to initialize authentication. Please refresh the page.');
      }
    };

    // Set up authentication state listener
    const unsubscribeAuth = onAuthChange((user) => {
      setIsAuthenticated(!!user);
      setIsLoading(false);
    });

    // Initialize authentication
    initAuth();

    // Cleanup listener on unmount
    return () => unsubscribeAuth();
  }, []);

  if (isLoading) {
    return (
      <div className={styles.app}>
        <div className={styles.loadingScreen}>
          <div className={styles.logo}>
            <img src="/habit-lock-logo.svg" alt="HabitLock Logo" className={styles.logoIcon} />
            <h1>HabitLock</h1>
          </div>
          <div className={styles.spinner}></div>
          <p>Loading your habit tracker...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className={styles.app}>
        <div className={styles.errorScreen}>
          <div className={styles.logo}>
            <img src="/habit-lock-logo.svg" alt="HabitLock Logo" className={styles.logoIcon} />
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
    return <Navigate to="/" replace />;
  }

  return (
    <AppLayout>
      {children}
    </AppLayout>
  );
}

// Main App component
function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          {/* Landing page for unauthenticated users */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Protected routes for authenticated users */}
          <Route path="/calendar" element={
            <ProtectedRoute>
              <CalendarView />
            </ProtectedRoute>
          } />
          
          <Route path="/stats" element={
            <ProtectedRoute>
              <StatsView />
            </ProtectedRoute>
          } />
          
          <Route path="/achievements" element={
            <ProtectedRoute>
              <AchievementsView />
            </ProtectedRoute>
          } />
          
          {/* Redirect any unknown routes to calendar for authenticated users */}
          <Route path="*" element={<Navigate to="/calendar" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
