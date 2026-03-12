// AuthContext.jsx
import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  initializeAuth, 
  onAuthChange, 
  signOutUser, 
  signInWithGoogle,
  signInWithMagicLink 
} from '../services/supabase';
import { saveUserProfile } from '../services/supabaseDb';
import analytics from '../services/analytics';
import { DEV_USER, isDevUserEnabled, disableDevUser } from '../utils/devAuth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [isDevAuth, setIsDevAuth] = useState(false);

  // Initialize auth and set up listener
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setError(null);
        
        // Check for dev user first (only in development)
        if (isDevUserEnabled()) {
          console.log('🔧 Using dev user for authentication');
          const devUser = {
            uid: DEV_USER.uid,
            email: DEV_USER.email,
            displayName: DEV_USER.displayName,
            photoURL: DEV_USER.photoURL,
          };
          setUser(devUser);
          setIsDevAuth(true);
          setIsLoading(false);
          setIsInitialized(true);
          analytics.initializeClarity();
          analytics.capture('app_initialized', { dev_mode: true });
          return;
        }
        
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

    // Set up auth state listener (skip if using dev user)
    const unsubscribe = isDevUserEnabled() ? () => {} : onAuthChange(async (authUser) => {
      if (!mounted) return;
      
      // Transform Supabase user to our format
      const normalizedUser = authUser ? {
        uid: authUser.id,
        email: authUser.email,
        displayName: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0],
        photoURL: authUser.user_metadata?.avatar_url,
      } : null;
      
      setUser(normalizedUser);
      setIsLoading(false);

      if (normalizedUser) {
        // Save user profile to database for admin tracking
        try {
          await saveUserProfile(normalizedUser.uid, {
            email: normalizedUser.email,
            displayName: normalizedUser.displayName,
            photoURL: normalizedUser.photoURL,
          });
        } catch (err) {
          console.warn('Failed to save user profile:', err);
        }

        analytics.identify(normalizedUser.uid, {
          email: normalizedUser.email,
          name: normalizedUser.displayName,
          avatar: normalizedUser.photoURL
        });
        
        analytics.capture('user_authenticated', {
          user_id: normalizedUser.uid,
          email: normalizedUser.email,
          has_photo: !!normalizedUser.photoURL,
          provider: authUser.app_metadata?.provider || 'magic_link'
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

  // Magic Link sign in
  const signInWithEmail = useCallback(async (email) => {
    try {
      setError(null);
      setMagicLinkSent(false);
      await signInWithMagicLink(email);
      setMagicLinkSent(true);
      analytics.capture('magic_link_sent', { email });
      return true;
    } catch (err) {
      setError('Failed to send magic link. Please try again.');
      analytics.capture('magic_link_failed', { error: err.message });
      throw err;
    }
  }, []);

  // Google sign in (kept for backwards compatibility)
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
      analytics.capture('sign_out_initiated', { user_id: user?.uid, dev_mode: isDevAuth });
      
      // Handle dev user logout
      if (isDevAuth) {
        disableDevUser();
        setUser(null);
        setIsDevAuth(false);
        window.location.reload();
        return;
      }
      
      await signOutUser();
    } catch (err) {
      console.error('Sign out failed:', err);
      analytics.capture('sign_out_failed', { error: err.message, user_id: user?.uid });
      throw err;
    }
  }, [user?.uid, isDevAuth]);

  const value = useMemo(() => ({
    user,
    userId: user?.uid ?? null,
    isAuthenticated: !!user,
    isLoading,
    isInitialized,
    error,
    magicLinkSent,
    isDevAuth,
    signIn,
    signInWithEmail,
    signOut,
    userInfo: user ? {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    } : null,
  }), [user, isLoading, isInitialized, error, magicLinkSent, isDevAuth, signIn, signInWithEmail, signOut]);

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
