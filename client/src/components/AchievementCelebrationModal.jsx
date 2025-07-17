import { useState, useEffect } from 'react';
import ShareModal from './ShareModal';
import useScrollLock from '../hooks/useScrollLock';
import styles from './AchievementCelebrationModal.module.scss';

const AchievementCelebrationModal = ({ achievement, isOpen, onClose }) => {
  const [showContent, setShowContent] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Lock body scroll when modal is open
  useScrollLock(isOpen);

  // Motivational quotes mapped to achievement categories and specific badges
  const motivationalQuotes = {
    // Category-based quotes
    'Streaks': [
      "Consistency is the mother of mastery. You're building something incredible!",
      "Every streak starts with a single step. You're proof that small actions create big results.",
      "The fire within you burns brighter each day. Keep the momentum alive!",
      "You're not just building habits—you're building character."
    ],
    'Goals': [
      "Goals are dreams with deadlines, and you're making yours reality!",
      "Success isn't just about reaching the destination—it's about who you become along the way.",
      "You aimed high and hit your target. That's the mark of a true achiever!",
      "Every goal achieved is proof that you're capable of more than you imagined."
    ],
    'Mastery': [
      "Mastery is not perfection—it's the relentless pursuit of improvement. You're on the path!",
      "The expert was once a beginner who never gave up. You're becoming unstoppable!",
      "You're not just tracking habits—you're mastering life itself.",
      "Excellence is a habit, and you're proving it every single day."
    ],
    'Milestones': [
      "Every milestone marks a moment when you chose progress over comfort. Celebrate this victory!",
      "You've reached a significant milestone—proof that persistence pays off!",
      "This achievement represents countless small victories. You should be proud!",
      "You're writing your success story one milestone at a time."
    ],
    'Consistency': [
      "Consistency is the compound interest of success, and you're earning it daily!",
      "Small daily improvements lead to staggering long-term results. You're living proof!",
      "You're not perfect—you're persistent. That's what makes all the difference.",
      "Consistency beats perfection every time. You're mastering the art of showing up!"
    ],
    
    // Specific badge quotes for extra personalization
    'first_steps': "Every expert was once a beginner. You've taken your first step into a larger world of possibilities!",
    'habit_explorer': "The journey of a thousand habits begins with a single track. Welcome to your transformation!",
    'fire_starter': "You've lit the flame of consistency. Watch it grow into an unstoppable fire!",
    'flame_keeper': "Seven days of dedication—you're proving that commitment creates momentum!",
    'inferno_master': "21 days of pure dedication! You're not just on fire—you ARE the fire!",
    'century_club': "100 completions! You've proven that persistence turns the impossible into inevitable!",
    'perfect_week': "A perfect week is a masterpiece painted with daily discipline. Magnificent work!",
    'goal_getter': "First goal achieved! You've tasted victory—now let it fuel your hunger for more!",
    'multi_tasker': "Juggling multiple habits with grace—you're becoming a master of life balance!",
    'consistency_king': "90% consistency for 30 days! You've earned the crown of dedication!"
  };

  const getMotivationalQuote = () => {
    if (!achievement) return '';
    
    // Try specific badge quote first
    if (motivationalQuotes[achievement.badgeId]) {
      return motivationalQuotes[achievement.badgeId];
    }
    
    // Fall back to category quotes
    const categoryQuotes = motivationalQuotes[achievement.category] || motivationalQuotes['Milestones'];
    return categoryQuotes[Math.floor(Math.random() * categoryQuotes.length)];
  };

  useEffect(() => {
    if (isOpen && achievement) {
      // Trigger confetti immediately
      setShowConfetti(true);
      
      // Show content after a brief delay for dramatic effect
      const contentTimer = setTimeout(() => {
        setShowContent(true);
      }, 300);

      // Hide confetti after animation
      const confettiTimer = setTimeout(() => {
        setShowConfetti(false);
      }, 4000);

      return () => {
        clearTimeout(contentTimer);
        clearTimeout(confettiTimer);
      };
    } else {
      setShowContent(false);
      setShowConfetti(false);
    }
  }, [isOpen, achievement]);

  // Add keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleClose = () => {
    setShowContent(false);
    setShowConfetti(false);
    setTimeout(onClose, 300); // Allow exit animation to complete
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen || !achievement) return null;

  return (
    <div className={`${styles.modalOverlay} ${isOpen ? styles.open : ''}`} onClick={handleBackdropClick}>
      {/* Confetti Animation */}
      {showConfetti && (
        <div className={styles.confettiContainer}>
          {[...Array(50)].map((_, i) => (
            <div 
              key={i} 
              className={styles.confetti}
              style={{
                '--delay': `${Math.random() * 0.5}s`,
                '--duration': `${2 + Math.random() * 2}s`,
                '--x': `${Math.random() * 100}%`,
                '--color': ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'][Math.floor(Math.random() * 5)]
              }}
            />
          ))}
        </div>
      )}

      <div className={`${styles.modal} ${showContent ? styles.visible : ''}`}>
        {/* Celebration Header */}
        <div className={styles.celebrationHeader}>
          <h1 className={styles.congratulations}>
            Achievement Unlocked!
          </h1>
        </div>

        {/* Badge Display */}
        <div className={styles.badgeShowcase}>
          <div className={styles.badgeContainer}>
            <div className={styles.badgeGlow}></div>
            <div className={styles.badgeEmoji}>
              {achievement.emoji}
            </div>
            <div className={styles.badgePulse}></div>
          </div>
        </div>

        {/* Achievement Details */}
        <div className={styles.achievementDetails}>
          <h2 className={styles.achievementTitle}>{achievement.title}</h2>
          <p className={styles.achievementDescription}>{achievement.description}</p>
          
          {/* Rarity Badge */}
          <div className={`${styles.rarityBadge} ${styles[achievement.rarity]}`}>
            <span className={styles.rarityLabel}>{achievement.rarity.charAt(0).toUpperCase() + achievement.rarity.slice(1)}</span>
            <span className={styles.rarityStars}>
              {achievement.rarity === 'common' && '⭐'}
              {achievement.rarity === 'uncommon' && '⭐⭐'}
              {achievement.rarity === 'rare' && '⭐⭐⭐'}
              {achievement.rarity === 'epic' && '🌟⭐⭐⭐'}
              {achievement.rarity === 'legendary' && '🌟🌟⭐⭐⭐'}
            </span>
          </div>
        </div>

        {/* Motivational Quote */}
        <div className={styles.motivationSection}>
          <div className={styles.quoteIcon}>💭</div>
          <blockquote className={styles.motivationalQuote}>
            "{getMotivationalQuote()}"
          </blockquote>
        </div>

        {/* Action Buttons */}
        <div className={styles.actionButtons}>
          <button 
            className={styles.shareButton}
            onClick={() => setShowShareModal(true)}
          >
            <span>🎉</span>
            Share Achievement
          </button>
          <button 
            className={styles.continueButton}
            onClick={handleClose}
          >
            <span>🚀</span>
            Continue Tracking Habits
          </button>
        </div>

        {/* Close Button */}
        <button className={styles.closeButton} onClick={handleClose}>
          ×
        </button>
      </div>

      {/* Share Modal */}
      <ShareModal
        achievement={achievement}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  );
};

export default AchievementCelebrationModal; 