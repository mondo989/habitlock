import { useState } from 'react';
import { signInWithGoogle, getUserInfo } from '../services/firebase';
import styles from './AuthModal.module.scss';

const AuthModal = ({ isOpen, onClose, user }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await signInWithGoogle();
      // Modal will close automatically when auth state changes
    } catch (error) {
      console.error('Google sign-in error:', error);
      let errorMessage = 'Failed to sign in with Google. Please try again.';
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled. Please try again.';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Google sign-in is not enabled. Please contact support.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalLogo}>
            <img src="/habit-lock-logo.svg" alt="HabitLock Logo" className={styles.logoIcon} />
            <h2>Welcome to HabitLock</h2>
          </div>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.modalContent}>
          <p className={styles.description}>
            Sign in with your Google account to track your habits and sync your data across all devices
          </p>
          
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}
          
          <div className={styles.providerButtons}>
            <button 
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className={`${styles.providerButton} ${styles.googleButton}`}
            >
              <span className={styles.providerIcon}>🔍</span>
              Continue with Google
            </button>
          </div>
          
          {isLoading && (
            <div className={styles.loadingOverlay}>
              <div className={styles.spinner}></div>
              <p>Signing you in with Google...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal; 