import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { usePostHog } from 'posthog-js/react';
import { initializeAuth, auth, onAuthChange, signOutUser, getUserInfo } from './services/firebase';
import analytics from './services/analytics';
import { ThemeProvider } from './context/ThemeContext';
import CalendarView from './views/CalendarView';
import StatsView from './views/StatsView';
import AchievementsView from './views/AchievementsView';
import ThemeToggle from './components/ThemeToggle';
import LandingPage from './components/LandingPage';
import OnboardingCarousel from './components/OnboardingCarousel';
import { CalendarIcon, StatsIcon, AchievementsIcon } from './components/Icons';
import styles from './App.module.scss';

// Main App Layout component (for authenticated users)
function AppLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const posthog = usePostHog();
  const [currentUser, setCurrentUser] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Initialize analytics with PostHog instance
  useEffect(() => {
    if (posthog) {
      const initAnalytics = async () => {
        await analytics.setPostHog(posthog);
        analytics.capture('app_layout_mounted', {
          timestamp: new Date().toISOString()
        });
      };
      initAnalytics();
    }
  }, [posthog]);

  // Get current view from URL
  const currentView = location.pathname.substring(1) || 'calendar';

  // Track navigation changes
  useEffect(() => {
    analytics.capture('page_viewed', {
      page: currentView,
      path: location.pathname,
      user_id: getUserInfo()?.uid
    });
  }, [location.pathname, currentView]);

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
        
        // Track user authentication for analytics
        analytics.identify(user.uid, {
          email: user.email,
          name: user.displayName,
          avatar: user.photoURL
        });
        
        analytics.capture('user_authenticated', {
          user_id: user.uid,
          email: user.email,
          has_photo: !!user.photoURL,
          provider: user.providerData?.[0]?.providerId
        });
        
        // Track user authentication for analytics (optional)
        analytics.trackUserAction('user_authenticated', {
          userId: user.uid,
          email: user.email,
        });
        
        // Check if this is a first-time user
        const hasCompletedOnboarding = localStorage.getItem('habitlock_onboarding_completed');
        if (!hasCompletedOnboarding) {
          setShowOnboarding(true);
          analytics.capture('onboarding_started', {
            user_id: user.uid
          });
        }
      } else {
        console.log('No user authenticated');
        setShowOnboarding(false);
        analytics.capture('user_signed_out');
        // Redirect to landing page if not authenticated
        navigate('/');
      }
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  const handleNavigation = (path, viewName) => {
    navigate(path);
    analytics.capture('navigation_clicked', {
      from_view: currentView,
      to_view: viewName,
      user_id: getUserInfo()?.uid
    });
  };

  const handleSignOut = async () => {
    try {
      analytics.capture('sign_out_initiated', {
        user_id: getUserInfo()?.uid
      });
      await signOutUser();
      setShowProfileDropdown(false);
      navigate('/');
    } catch (error) {
      console.error('Sign out failed:', error);
      analytics.capture('sign_out_failed', {
        error: error.message,
        user_id: getUserInfo()?.uid
      });
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    analytics.capture('onboarding_completed', {
      user_id: getUserInfo()?.uid
    });
  };

  const userInfo = getUserInfo();

  return (
    <div className={styles.app}>
      {/* Navigation Header */}
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <div 
            className={styles.logo}
            onClick={() => handleNavigation('/calendar', 'calendar')}
          >
            <img src="/habit-lock-logo.svg" alt="HabitLock Logo" className={styles.logoIcon} />
            <h1>HabitLock</h1>
          </div>
          
          {/* Desktop Navigation Tabs */}
          <div className={styles.navTabs}>
            <button
              className={`${styles.navTab} ${currentView === 'calendar' ? styles.active : ''}`}
              onClick={() => handleNavigation('/calendar', 'calendar')}
            >
              <CalendarIcon className={styles.navIcon} />
              Calendar
            </button>
            <button
              className={`${styles.navTab} ${currentView === 'stats' ? styles.active : ''}`}
              onClick={() => handleNavigation('/stats', 'stats')}
            >
              <StatsIcon className={styles.navIcon} />
              Stats
            </button>
            <button
              className={`${styles.navTab} ${currentView === 'achievements' ? styles.active : ''}`}
              onClick={() => handleNavigation('/achievements', 'achievements')}
            >
              <AchievementsIcon className={styles.navIcon} />
              Achievements
            </button>
          </div>

          <div className={styles.navActions}>
            <ThemeToggle />
            <div className={styles.navMeta}>
              <div 
                className={styles.userProfile}
                onClick={() => {
                  setShowProfileDropdown(!showProfileDropdown);
                  analytics.capture('profile_dropdown_toggled', {
                    opened: !showProfileDropdown,
                    user_id: getUserInfo()?.uid
                  });
                }}
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

      {/* Mobile Navigation Tabs */}
      <nav className={styles.mobileNavTabs}>
        <button
          className={`${styles.mobileNavTab} ${currentView === 'calendar' ? styles.active : ''}`}
          onClick={() => handleNavigation('/calendar', 'calendar')}
        >
          <span className={styles.mobileTabIcon}>
            <CalendarIcon className={styles.mobileNavIcon} />
          </span>
          <span className={styles.mobileTabText}>Calendar</span>
        </button>
        <button
          className={`${styles.mobileNavTab} ${currentView === 'stats' ? styles.active : ''}`}
          onClick={() => handleNavigation('/stats', 'stats')}
        >
          <span className={styles.mobileTabIcon}>
            <StatsIcon className={styles.mobileNavIcon} />
          </span>
          <span className={styles.mobileTabText}>Stats</span>
        </button>
        <button
          className={`${styles.mobileNavTab} ${currentView === 'achievements' ? styles.active : ''}`}
          onClick={() => handleNavigation('/achievements', 'achievements')}
        >
          <span className={styles.mobileTabIcon}>
            <AchievementsIcon className={styles.mobileNavIcon} />
          </span>
          <span className={styles.mobileTabText}>Achievements</span>
        </button>
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
          <div className={styles.footerSocial}>
            <a 
              href="https://www.facebook.com/habitlock" 
              target="_blank" 
              rel="noopener noreferrer"
              aria-label="Follow us on Facebook"
            >
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
            <a 
              href="https://x.com/habitlock_" 
              target="_blank" 
              rel="noopener noreferrer"
              aria-label="Follow us on X (Twitter)"
            >
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
          </div>
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
        
        // Track app initialization
        analytics.capture('app_initialized');
      } catch (error) {
        console.error('Authentication initialization failed:', error);
        setAuthError('Failed to initialize authentication. Please refresh the page.');
        
        // Track initialization error
        analytics.capture('app_initialization_failed', {
          error: error.message
        });
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
              onClick={() => {
                analytics.capture('error_retry_clicked', {
                  error_type: 'auth_initialization'
                });
                window.location.reload();
              }}
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
