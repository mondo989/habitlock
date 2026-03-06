// AuthContext.jsx
import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { initializeAuth, onAuthChange, signOutUser, signInWithGoogle } from '../services/firebase';
import { saveUserProfile } from '../services/db';
import analytics from '../services/analytics';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize auth and set up listener
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setError(null);
        await initializeAuth();
        
        if (mounted) {
          setIsInitialized(true);
          analytics.initializeClarity();
          analytics.capture('app_initialized');
        }
      } catch (err) {
        console.error('Authentication initialization failed:', err);
        if (mounted) {
          setError('Failed to initialize authentication. Please refresh the page.');
          analytics.capture('app_initialization_failed', { error: err.message });
        }
      }
    };

    // Set up auth state listener
    const unsubscribe = onAuthChange(async (authUser) => {
      if (!mounted) return;
      
      setUser(authUser);
      setIsLoading(false);

      if (authUser) {
        // Save user profile to database for admin tracking
        try {
          await saveUserProfile(authUser.uid, {
            email: authUser.email,
            displayName: authUser.displayName,
            photoURL: authUser.photoURL,
          });
        } catch (err) {
          console.warn('Failed to save user profile:', err);
        }

        analytics.identify(authUser.uid, {
          email: authUser.email,
          name: authUser.displayName,
          avatar: authUser.photoURL
        });
        
        analytics.capture('user_authenticated', {
          user_id: authUser.uid,
          email: authUser.email,
          has_photo: !!authUser.photoURL,
          provider: authUser.providerData?.[0]?.providerId
        });
      } else {
        analytics.capture('user_signed_out');
      }
    });

    init();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async () => {
    try {
      setError(null);
      await signInWithGoogle();
    } catch (err) {
      setError('Sign in failed. Please try again.');
      analytics.capture('sign_in_failed', { error: err.message });
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      analytics.capture('sign_out_initiated', { user_id: user?.uid });
      await signOutUser();
    } catch (err) {
      console.error('Sign out failed:', err);
      analytics.capture('sign_out_failed', { error: err.message, user_id: user?.uid });
      throw err;
    }
  }, [user?.uid]);

  const value = useMemo(() => ({
    user,
    userId: user?.uid ?? null,
    isAuthenticated: !!user,
    isLoading,
    isInitialized,
    error,
    signIn,
    signOut,
    userInfo: user ? {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    } : null,
  }), [user, isLoading, isInitialized, error, signIn, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
