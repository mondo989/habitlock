import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { usePostHog } from 'posthog-js/react';
import analytics from './services/analytics';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OnboardingProvider, useOnboarding } from './context/OnboardingContext';
import CalendarView from './views/CalendarView';
import HabitsView from './views/HabitsView';
import StatsView from './views/StatsView';
import ThemeToggle from './components/ThemeToggle';
import LandingPageConversion from './components/LandingPageConversion';
import BlogPage from './components/BlogPage';
import OnboardingGuide from './components/OnboardingGuide';
import AuthCallback from './components/AuthCallback';
import { CalendarIcon, HabitsIcon, StatsIcon } from './components/Icons'
import styles from './App.module.scss';

// DEV-ONLY: Lazy load AdminView only in development
// This ensures the admin code is never bundled in production
const AdminView = import.meta.env.DEV 
  ? lazy(() => import('./views/AdminView'))
  : null;

const PatternDebugView = import.meta.env.DEV
  ? lazy(() => import('./views/PatternDebugView'))
  : null;

const isLocalhost = () => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
};

const isLocalDevOnlyEnabled = () => import.meta.env.DEV && isLocalhost();

// Main App Layout component (for authenticated users)
function AppLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const posthog = usePostHog();
  const { userInfo, userId, signOut, isAuthenticated } = useAuth();
  const [showProfileDropdown, setShowProfileDropdown] = React.useState(false);
  const { startOnboarding } = useOnboarding();

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
      user_id: userId
    });
  }, [location.pathname, currentView, userId]);

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

  // Redirect to landing if user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleNavigation = (path, viewName) => {
    navigate(path);
    analytics.capture('navigation_clicked', {
      from_view: currentView,
      to_view: viewName,
      user_id: userId
    });
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowProfileDropdown(false);
      navigate('/');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const handleShowOnboarding = () => {
    startOnboarding();
    setShowProfileDropdown(false);
    analytics.capture('onboarding_reopened', {
      user_id: userId
    });
  };

  // Expose function globally for debug mode
  useEffect(() => {
    window.__showOnboarding = handleShowOnboarding;
    return () => {
      delete window.__showOnboarding;
    };
  }, [startOnboarding]);

  return (
    <div className={styles.app}>
      {/* Navigation Header */}
      <nav className={styles.nav} data-tooltip-top-boundary>
        <div className={styles.navContent}>
          <div 
            className={styles.logo}
            onClick={() => handleNavigation('/', 'homepage')}
          >
            <img src="/habit-lock-logo.svg" alt="HabitLock Logo" className={styles.logoIcon} />
            <span className={styles.logoText}>HabitLock</span>
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
              className={`${styles.navTab} ${currentView === 'habits' ? styles.active : ''}`}
              onClick={() => handleNavigation('/habits', 'habits')}
            >
              <HabitsIcon className={styles.navIcon} />
              Habits
            </button>
            <button
              className={`${styles.navTab} ${currentView === 'stats' ? styles.active : ''}`}
              onClick={() => handleNavigation('/stats', 'stats')}
            >
              <StatsIcon className={styles.navIcon} />
              Stats
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
                    user_id: userId
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
                  <div className={styles.dropdownItem} onClick={handleShowOnboarding}>
                    <span className={styles.dropdownIcon}>?</span>
                    Show welcome guide
                  </div>
                  <div className={styles.dropdownItem} onClick={handleSignOut}>
                    <span className={styles.dropdownIcon}>→</span>
                    Sign out
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
          className={`${styles.mobileNavTab} ${currentView === 'habits' ? styles.active : ''}`}
          onClick={() => handleNavigation('/habits', 'habits')}
        >
          <span className={styles.mobileTabIcon}>
            <HabitsIcon className={styles.mobileNavIcon} />
          </span>
          <span className={styles.mobileTabText}>Habits</span>
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
          <div className={styles.footerRight}>
            <a 
              href="/blog"
              className={styles.footerBlogLink}
            >
              Blog
            </a>
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
        </div>
      </footer>

      {/* Onboarding Guide */}
      <OnboardingGuide />
    </div>
  );
}

// Protected Route component
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, error } = useAuth();

  if (isLoading) {
    return (
      <div className={styles.app}>
        <div className={styles.loadingScreen}>
          <div className={styles.logo}>
            <img src="/habit-lock-logo.svg" alt="HabitLock Logo" className={styles.logoIcon} />
            <span className={styles.logoText}>HabitLock</span>
          </div>
          <div className={styles.spinner}></div>
          <p>Loading your habit tracker...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.app}>
        <div className={styles.errorScreen}>
          <div className={styles.logo}>
            <img src="/habit-lock-logo.svg" alt="HabitLock Logo" className={styles.logoIcon} />
            <span className={styles.logoText}>HabitLock</span>
          </div>
          <div className={styles.errorContent}>
            <h1>Oops! Something went wrong</h1>
            <p>{error}</p>
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
      <AuthProvider>
        <OnboardingProvider>
          <Router>
            <Routes>
              {/* Landing page for unauthenticated users */}
              <Route path="/" element={<LandingPageConversion />} />
              
              {/* Blog page */}
              <Route path="/blog" element={<BlogPage />} />

              {/* Auth callback for magic link and OAuth */}
              <Route path="/auth/callback" element={<AuthCallback />} />
              
              {/* Protected routes for authenticated users */}
              <Route path="/calendar" element={
                <ProtectedRoute>
                  <CalendarView />
                </ProtectedRoute>
              } />
              
              <Route path="/habits" element={
                <ProtectedRoute>
                  <HabitsView />
                </ProtectedRoute>
              } />
              
              <Route path="/stats" element={
                <ProtectedRoute>
                  <StatsView />
                </ProtectedRoute>
              } />
              
              {/* DEV-ONLY: Admin dashboard for viewing production data locally */}
              {import.meta.env.DEV && AdminView && (
                <Route path="/admin" element={
                  <ProtectedRoute>
                    <Suspense fallback={
                      <div className={styles.loadingScreen}>
                        <div className={styles.spinner}></div>
                        <p>Loading admin...</p>
                      </div>
                    }>
                      <AdminView />
                    </Suspense>
                  </ProtectedRoute>
                } />
              )}
              
              {/* LOCAL-ONLY: Pattern debug page */}
              {isLocalDevOnlyEnabled() && PatternDebugView && (
                <Route path="/dev/pattern-debug" element={
                  <ProtectedRoute>
                    <Suspense fallback={
                      <div className={styles.loadingScreen}>
                        <div className={styles.spinner}></div>
                        <p>Loading pattern debug...</p>
                      </div>
                    }>
                      <PatternDebugView />
                    </Suspense>
                  </ProtectedRoute>
                } />
              )}
              
              {/* Redirect any unknown routes to calendar for authenticated users */}
              <Route path="*" element={<Navigate to="/calendar" replace />} />
            </Routes>
          </Router>
        </OnboardingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
