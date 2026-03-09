import { useState } from 'react';
import { signInWithMagicLink } from '../services/supabase';
import useScrollLock from '../hooks/useScrollLock';
import styles from './AuthModal.module.scss';

const AuthModal = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  useScrollLock(isOpen);

  const handleMagicLinkSignIn = async (e) => {
    e?.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await signInWithMagicLink(email);
      setMagicLinkSent(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Magic link error:', error);
      setError('Failed to send magic link. Please try again.');
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setError(null);
    setMagicLinkSent(false);
    setIsLoading(false);
    onClose();
  };

  const handleUseAnother = () => {
    setEmail('');
    setError(null);
    setMagicLinkSent(false);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalLogo}>
            <img src="/habit-lock-logo.svg" alt="HabitLock Logo" className={styles.logoIcon} />
            <h2>Welcome to HabitLock</h2>
          </div>
          <button className={styles.closeButton} onClick={handleClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        
        <div className={styles.modalContent}>
          {magicLinkSent ? (
            <div className={styles.magicLinkSent}>
              <span className={styles.mailIcon}>✉️</span>
              <h3>Check your email!</h3>
              <p>We sent a magic link to <strong>{email}</strong></p>
              <p className={styles.subtext}>Click the link in your email to sign in</p>
              <button 
                className={styles.secondaryButton} 
                onClick={handleUseAnother}
              >
                Use different email
              </button>
            </div>
          ) : (
            <>
              <p className={styles.description}>
                Enter your email to receive a magic link — no password needed!
              </p>
              
              {error && (
                <div className={styles.errorMessage}>
                  {error}
                </div>
              )}
              
              <form onSubmit={handleMagicLinkSignIn} className={styles.emailForm}>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.emailInput}
                  disabled={isLoading}
                  autoFocus
                />
                <button 
                  type="submit" 
                  className={styles.submitButton}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className={styles.loadingText}>
                      <span className={styles.spinner} />
                      Sending...
                    </span>
                  ) : (
                    'Get Magic Link →'
                  )}
                </button>
              </form>
              
              <div className={styles.benefits}>
                <span>✓ 5 habits tracked for free</span>
                <span>✓ No password needed</span>
                <span>✓ Instant access</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal; 