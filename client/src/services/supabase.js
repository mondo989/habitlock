// supabase.js
import { createClient } from '@supabase/supabase-js';
import { DEV_USER, isDevUserEnabled } from '../utils/devAuth';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// AUTH FUNCTIONS
// ============================================

// Initialize authentication (called on app start)
export const initializeAuth = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    console.log('Auth initialized, session:', session ? 'exists' : 'none');
    return session;
  } catch (error) {
    console.error('Failed to initialize auth:', error);
    throw error;
  }
};

// Magic Link Sign In
export const signInWithMagicLink = async (email) => {
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    
    if (error) throw error;
    console.log('Magic link sent to:', email);
    return data;
  } catch (error) {
    console.error('Magic link sign-in error:', error);
    throw error;
  }
};

// Google Sign In (keeping for backwards compatibility)
export const signInWithGoogle = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    
    if (error) throw error;
    console.log('Google sign-in initiated');
    return data;
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
};

// Sign Out
export const signOutUser = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    console.log('User signed out successfully');
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

// Get current user ID
export const getCurrentUserId = () => {
  const session = supabase.auth.getSession();
  return session?.data?.session?.user?.id || null;
};

// Get current user info (sync version using cached session)
export const getUserInfo = () => {
  // This returns cached user from the client
  const user = supabase.auth.getUser();
  return user ? {
    uid: user.data?.user?.id,
    email: user.data?.user?.email,
    displayName: user.data?.user?.user_metadata?.full_name || user.data?.user?.user_metadata?.name,
    photoURL: user.data?.user?.user_metadata?.avatar_url,
    emailVerified: user.data?.user?.email_confirmed_at != null,
  } : null;
};

// Async version for when you need fresh data
export const getUserInfoAsync = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  
  return {
    uid: user.id,
    email: user.email,
    displayName: user.user_metadata?.full_name || user.user_metadata?.name,
    photoURL: user.user_metadata?.avatar_url,
    emailVerified: user.email_confirmed_at != null,
  };
};

// Check if user is authenticated
export const isAuthenticated = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
};

// Listen for authentication state changes
export const onAuthChange = (callback) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });
  
  // Return unsubscribe function
  return () => subscription.unsubscribe();
};

// Get the current session
export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};

// ============================================
// AUTH OBJECT (Firebase compatibility layer)
// ============================================
// This provides a Firebase-like auth object for easier migration
export const auth = {
  get currentUser() {
    // Synchronously return cached user data
    // Note: This is a compatibility shim; prefer async methods
    return supabase.auth.getUser().then(({ data }) => data?.user ? {
      uid: data.user.id,
      email: data.user.email,
      displayName: data.user.user_metadata?.full_name,
      photoURL: data.user.user_metadata?.avatar_url,
    } : null);
  },
};

// Better approach: Create a reactive auth state
let cachedUser = null;

// Initialize and cache user on module load
supabase.auth.getSession().then(({ data: { session } }) => {
  cachedUser = session?.user || null;
});

// Keep cached user updated
supabase.auth.onAuthStateChange((event, session) => {
  cachedUser = session?.user || null;
});

// Synchronous auth object using cached state
export const authSync = {
  get currentUser() {
    // Return dev user if dev mode is enabled
    if (isDevUserEnabled()) {
      return {
        uid: DEV_USER.uid,
        email: DEV_USER.email,
        displayName: DEV_USER.displayName,
        photoURL: DEV_USER.photoURL,
      };
    }
    
    return cachedUser ? {
      uid: cachedUser.id,
      email: cachedUser.email,
      displayName: cachedUser.user_metadata?.full_name || cachedUser.user_metadata?.name,
      photoURL: cachedUser.user_metadata?.avatar_url,
    } : null;
  },
};
