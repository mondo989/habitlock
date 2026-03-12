// devAuth.js
// Dev-only authentication utilities for local testing

const DEV_USER_STORAGE_KEY = 'habitlock_dev_user_enabled';

// Valid UUID format for Supabase compatibility
const DEV_USER_UUID = '00000000-0000-0000-0000-000000000001';

export const DEV_USER = {
  id: DEV_USER_UUID,
  uid: DEV_USER_UUID,
  email: 'dev@habitlock.local',
  displayName: 'Dev User',
  photoURL: null,
  user_metadata: {
    full_name: 'Dev User',
    name: 'Dev User',
    avatar_url: null,
  },
  app_metadata: {
    provider: 'dev_mode',
  },
  email_confirmed_at: new Date().toISOString(),
};

export const isDevMode = () => {
  return import.meta.env.DEV || import.meta.env.MODE === 'development';
};

export const isDevUserEnabled = () => {
  if (!isDevMode()) return false;
  return localStorage.getItem(DEV_USER_STORAGE_KEY) === 'true';
};

export const enableDevUser = () => {
  if (!isDevMode()) {
    console.warn('Dev user can only be enabled in development mode');
    return false;
  }
  localStorage.setItem(DEV_USER_STORAGE_KEY, 'true');
  console.log('🔧 Dev user enabled - refresh to apply');
  return true;
};

export const disableDevUser = () => {
  localStorage.removeItem(DEV_USER_STORAGE_KEY);
  console.log('🔧 Dev user disabled - refresh to apply');
  return true;
};

export const toggleDevUser = () => {
  if (isDevUserEnabled()) {
    disableDevUser();
    return false;
  } else {
    enableDevUser();
    return true;
  }
};

// Expose to window for easy console access in dev mode
if (isDevMode()) {
  window.__devAuth = {
    enable: enableDevUser,
    disable: disableDevUser,
    toggle: toggleDevUser,
    isEnabled: isDevUserEnabled,
    user: DEV_USER,
  };
  
  if (isDevUserEnabled()) {
    console.log('🔧 Dev user is ENABLED. Use window.__devAuth.disable() to turn off.');
  } else {
    console.log('🔧 Dev mode detected. Use window.__devAuth.enable() to login as dev user.');
  }
}
