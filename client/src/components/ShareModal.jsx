import { useState } from 'react';
import { getAvailableSharingOptions } from '../utils/shareUtils';
import SocialIcons from './SocialIcons';
import analytics from '../services/analytics';
import useScrollLock from '../hooks/useScrollLock';
import styles from './ShareModal.module.scss';

const ShareModal = ({ achievement, isOpen, onClose }) => {
  const [sharing, setSharing] = useState(null);

  // Lock body scroll when modal is open
  useScrollLock(isOpen);

  const sharingOptions = getAvailableSharingOptions();

  const handleShare = async (option) => {
    try {
      setSharing(option.id);
      
      // Track sharing attempt
      analytics.capture('achievement_share_attempted', {
        platform: option.id,
        achievement_id: achievement.badgeId,
        achievement_title: achievement.title,
        achievement_rarity: achievement.rarity
      });

      // Handle sharing actions
      const success = await option.action(achievement);
      
      analytics.capture('achievement_share_completed', {
        platform: option.id,
        achievement_id: achievement.badgeId,
        success: success !== false
      });
      
      // Close modal after successful share (except for native)
      if (success !== false && option.id !== 'native') {
        setTimeout(() => onClose(), 500);
      }
    } catch (error) {
      console.error('Sharing failed:', error);
      analytics.capture('achievement_share_failed', {
        platform: option.id,
        achievement_id: achievement.badgeId,
        error: error.message
      });
    } finally {
      setSharing(null);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !achievement) return null;

  return (
    <div className={`${styles.modalOverlay} ${isOpen ? styles.open : ''}`} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.achievementInfo}>
            <span className={styles.achievementEmoji}>{achievement.emoji}</span>
            <div className={styles.achievementDetails}>
              <h3 className={styles.achievementTitle}>{achievement.title}</h3>
              <p className={styles.achievementDescription}>{achievement.description}</p>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Share Options */}
        <div className={styles.shareOptions}>
          <h4 className={styles.shareTitle}>Share your achievement</h4>
          <div className={styles.optionsGrid}>
            {sharingOptions.map((option) => (
              <button
                key={option.id}
                className={`${styles.shareOption} ${sharing === option.id ? styles.loading : ''}`}
                onClick={() => handleShare(option)}
                disabled={sharing === option.id}
                style={{ '--option-color': option.color }}
              >
                <span className={styles.optionIcon}>
                  <SocialIcons icon={option.icon} className={styles.socialIcon} />
                </span>
                <span className={styles.optionName}>
                  {option.name}
                </span>
                {sharing === option.id && (
                  <div className={styles.loadingSpinner}></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className={styles.previewSection}>
          <h4 className={styles.previewTitle}>Preview</h4>
          <div className={styles.previewMessage}>
            <div className={styles.previewText}>
              🎉 Achievement Unlocked! {achievement.emoji}
              <br /><br />
              <strong>{achievement.title}</strong>
              {achievement.rarity && achievement.rarity !== 'common' && (
                <span className={styles.rarityBadge}>
                  {achievement.rarity === 'legendary' ? '🌟 LEGENDARY' : 
                   achievement.rarity === 'epic' ? '⭐ EPIC' : 
                   achievement.rarity === 'rare' ? '💎 RARE' : 
                   achievement.rarity === 'uncommon' ? '🔸 UNCOMMON' : ''}
                </span>
              )}
              <br />
              {achievement.description}
              <br /><br />
              💪 Building better habits with HabitLock!
              <br />
              Transform your habits, transform your life ✨
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal; 