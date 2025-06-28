import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);

// Initialize authentication with persistence
export const initializeAuth = async () => {
  try {
    // Set authentication persistence to LOCAL (persists across browser sessions)
    await setPersistence(auth, browserLocalPersistence);
    
    return new Promise((resolve, reject) => {
      // Check if user is already authenticated
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        unsubscribe(); // Clean up listener after first callback
        
        if (user) {
          // User is already signed in
          console.log('Existing user found:', user.uid);
          resolve(user);
        } else {
          // No user, create new anonymous user
          try {
            console.log('Creating new anonymous user...');
            const userCredential = await signInAnonymously(auth);
            console.log('New anonymous user created:', userCredential.user.uid);
            resolve(userCredential.user);
          } catch (error) {
            console.error('Anonymous authentication failed:', error);
            reject(error);
          }
        }
      }, reject);
    });
  } catch (error) {
    console.error('Failed to set authentication persistence:', error);
    throw error;
  }
};

// Get current user ID (helper function)
export const getCurrentUserId = () => {
  return auth.currentUser?.uid;
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!auth.currentUser;
};

// Listen for authentication state changes
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
}; 