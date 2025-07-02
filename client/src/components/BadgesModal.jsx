import { useMemo, useState, useEffect } from 'react';
import { usePostHog } from 'posthog-js/react';
import { mergeAchievementsWithBadgeData, getUserAchievements } from '../services/achievements';
import { getUserInfo } from '../services/firebase';
import styles from './BadgesModal.module.scss';

// Animated Counter Component
const AnimatedCounter = ({ value, duration = 1500, className = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime = null;
    let animationFrame = null;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(easeOutQuart * value);
      
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    // Start animation
    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [value, duration]);

  return <span className={className}>{displayValue}</span>;
};

const BadgesModal = ({ isOpen, onClose, statsData, badgeData, isFullPage = false, achievements = {} }) => {
  const [hoveredBadge, setHoveredBadge] = useState(null);
  const [firebaseAchievements, setFirebaseAchievements] = useState({});
  const posthog = usePostHog();

  // Comprehensive badge definitions with requirements
  const badgeDefinitions = [
    // Streak Badges
    { 
      id: 'fire_starter', 
      emoji: '🔥', 
      title: 'Fire Starter', 
      description: 'Complete a 3-day streak',
      category: 'Streaks',
      rarity: 'common',
      requirement: (data) => Math.max(...data.map(d => d.currentStreak)) >= 3
    },
    { 
      id: 'flame_keeper', 
      emoji: '🔥', 
      title: 'Flame Keeper', 
      description: 'Maintain a 7-day streak',
      category: 'Streaks',
      rarity: 'common',
      requirement: (data) => Math.max(...data.map(d => d.currentStreak)) >= 7
    },
    { 
      id: 'inferno_master', 
      emoji: '🔥', 
      title: 'Inferno Master', 
      description: 'Achieve a 21-day streak',
      category: 'Streaks',
      rarity: 'uncommon',
      requirement: (data) => Math.max(...data.map(d => d.bestStreak)) >= 21
    },
    { 
      id: 'phoenix_rising', 
      emoji: '🔥', 
      title: 'Phoenix Rising', 
      description: 'Reach a legendary 50-day streak',
      category: 'Streaks',
      rarity: 'rare',
      requirement: (data) => Math.max(...data.map(d => d.bestStreak)) >= 50
    },
    { 
      id: 'eternal_flame', 
      emoji: '🔥', 
      title: 'Eternal Flame', 
      description: 'Master a 100-day streak',
      category: 'Streaks',
      rarity: 'epic',
      requirement: (data) => Math.max(...data.map(d => d.bestStreak)) >= 100
    },

    // Goal Achievement Badges
    { 
      id: 'goal_getter', 
      emoji: '🎯', 
      title: 'Goal Getter', 
      description: 'Achieve your first weekly goal',
      category: 'Goals',
      rarity: 'common',
      requirement: (data) => data.some(d => d.weeklyGoalPercentage >= 100)
    },
    { 
      id: 'target_hunter', 
      emoji: '🎯', 
      title: 'Target Hunter', 
      description: 'Hit 5 weekly goals',
      category: 'Goals',
      rarity: 'uncommon',
      requirement: (data) => data.filter(d => d.weeklyGoalPercentage >= 100).length >= 5
    },
    { 
      id: 'bullseye_champion', 
      emoji: '🎯', 
      title: 'Bullseye Champion', 
      description: 'Perfect aim with 10+ weekly goals',
      category: 'Goals',
      rarity: 'rare',
      requirement: (data) => data.filter(d => d.weeklyGoalPercentage >= 100).length >= 10
    },

    // Consistency Badges
    { 
      id: 'perfect_week', 
      emoji: '⭐', 
      title: 'Perfect Week', 
      description: '100% completion for 7 days straight',
      category: 'Consistency',
      rarity: 'uncommon',
      requirement: (data) => data.some(d => d.weeklyGoalPercentage >= 100)
    },
    { 
      id: 'consistency_king', 
      emoji: '👑', 
      title: 'Consistency Royalty', 
      description: '90%+ completion rate for 30 days',
      category: 'Consistency',
      rarity: 'rare',
      requirement: (data) => data.some(d => d.thirtyDayStats.completionRate >= 90)
    },

    // Milestone Badges
    { 
      id: 'first_steps', 
      emoji: '👶', 
      title: 'First Steps', 
      description: 'Complete your very first habit',
      category: 'Milestones',
      rarity: 'common',
      requirement: (data) => data.some(d => d.thirtyDayStats.completedDays > 0)
    },
    { 
      id: 'century_club', 
      emoji: '💯', 
      title: 'Century Club', 
      description: '100 total habit completions',
      category: 'Milestones',
      rarity: 'uncommon',
      requirement: (data) => data.reduce((sum, d) => sum + d.thirtyDayStats.completedDays, 0) >= 100
    },
    { 
      id: 'millennium', 
      emoji: '🏆', 
      title: 'Millennium', 
      description: '1000 total completions',
      category: 'Milestones',
      rarity: 'legendary',
      requirement: (data) => data.reduce((sum, d) => sum + d.thirtyDayStats.completedDays, 0) >= 1000
    },

    // Habit Mastery Badges
    { 
      id: 'habit_explorer', 
      emoji: '🧭', 
      title: 'Habit Explorer', 
      description: 'Create your first habit',
      category: 'Mastery',
      rarity: 'common',
      requirement: (data) => data.length > 0
    },
    { 
      id: 'multi_tasker', 
      emoji: '🤹', 
      title: 'Multi-Tasker', 
      description: 'Track 3 habits simultaneously',
      category: 'Mastery',
      rarity: 'common',
      requirement: (data) => data.length >= 3
    },
    { 
      id: 'habit_collector', 
      emoji: '🗂️', 
      title: 'Habit Collector', 
      description: 'Track 5+ habits simultaneously',
      category: 'Mastery',
      rarity: 'uncommon',
      requirement: (data) => data.length >= 5
    },
    { 
      id: 'lifestyle_designer', 
      emoji: '🏗️', 
      title: 'Lifestyle Designer', 
      description: 'Track 10+ habits simultaneously',
      category: 'Mastery',
      rarity: 'rare',
      requirement: (data) => data.length >= 10
    },

    // Special Badges
    { 
      id: 'comeback_kid', 
      emoji: '🦋', 
      title: 'Comeback Kid', 
      description: 'Return strong after a break',
      category: 'Special',
      rarity: 'rare',
      requirement: (data) => data.some(d => d.currentStreak >= 7) // Simplified for demo
    },
    { 
      id: 'perfectionist', 
      emoji: '💎', 
      title: 'Perfectionist', 
      description: '30 days with 100% completion',
      category: 'Special',
      rarity: 'epic',
      requirement: (data) => data.some(d => d.thirtyDayStats.completionRate === 100)
    },
  ];

  // Load Firebase achievements
  useEffect(() => {
    const loadAchievements = async () => {
      if (!isOpen && !isFullPage) return;
      
      // Track modal opened
      if (posthog) {
        posthog.capture('badges_modal_opened', {
          is_full_page: isFullPage,
          user_id: getUserInfo()?.uid
        });
      }
      
      // If achievements are passed as props (for full page), use them directly
      if (isFullPage && achievements) {
        setFirebaseAchievements(achievements);
        return;
      }
      
      const userInfo = getUserInfo();
      if (userInfo?.uid) {
        try {
          const userAchievements = await getUserAchievements(userInfo.uid);
          setFirebaseAchievements(userAchievements);
        } catch (error) {
          console.error('Error loading achievements in modal:', error);
        }
      }
    };

    loadAchievements();
  }, [isOpen, isFullPage, achievements, posthog]);

  // Calculate earned badges
  const badges = useMemo(() => {
    // If badgeData is provided, use it directly
    if (badgeData && badgeData.length > 0) {
      return mergeAchievementsWithBadgeData(badgeData, firebaseAchievements);
    }
    
    // Fallback to old calculation method
    if (!statsData) return [];
    
    const calculatedBadges = badgeDefinitions.map(badge => ({
      ...badge,
      earned: badge.requirement(statsData),
      progress: badge.earned ? 100 : 0 // Could add more sophisticated progress calculation
    }));

    return mergeAchievementsWithBadgeData(calculatedBadges, firebaseAchievements);
  }, [statsData, badgeData, firebaseAchievements]);

  // Group badges by category
  const badgesByCategory = useMemo(() => {
    const grouped = {};
    badges.forEach(badge => {
      if (!grouped[badge.category]) {
        grouped[badge.category] = [];
      }
      grouped[badge.category].push(badge);
    });
    return grouped;
  }, [badges]);

  // Stats for display
  const earnedCount = badges.filter(b => b.earned).length;
  const totalCount = badges.length;

  // Track achievement stats
  useEffect(() => {
    if (badges.length > 0 && posthog) {
      posthog.capture('achievement_stats', {
        earned_count: earnedCount,
        total_count: totalCount,
        completion_rate: Math.round((earnedCount / totalCount) * 100),
        user_id: getUserInfo()?.uid
      });
    }
  }, [badges, earnedCount, totalCount, posthog]);

  // Track badge hover events
  const handleBadgeHover = (badge) => {
    setHoveredBadge(badge);
    if (posthog) {
      posthog.capture('badge_hovered', {
        badge_id: badge.id,
        badge_name: badge.title,
        badge_earned: badge.earned,
        badge_rarity: badge.rarity,
        user_id: getUserInfo()?.uid
      });
    }
  };

  const handleBadgeLeave = () => {
    setHoveredBadge(null);
  };

  // Track modal close
  const handleClose = () => {
    if (posthog) {
      posthog.capture('badges_modal_closed', {
        time_spent: Date.now(), // You could track actual time spent
        user_id: getUserInfo()?.uid
      });
    }
    onClose();
  };

  // Add keyboard shortcuts
  useEffect(() => {
    if (!isOpen && !isFullPage) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isFullPage) {
        e.preventDefault();
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullPage]);

  if (!isOpen && !isFullPage) return null;

  const content = (
    <div className={`${styles.modalContent} ${isFullPage ? styles.fullPage : ''}`} onClick={isFullPage ? undefined : e => e.stopPropagation()}>
      <div className={styles.modalHeader}>
        <div className={styles.headerContent}>
          <h2>🏆 Achievement Badges</h2>
          <p>Your journey to habit mastery</p>
        </div>
        <div className={styles.progressSummary}>
          <div className={styles.progressCircle}>
            <div className={styles.progressRing}>
              <svg className={styles.progressSvg} viewBox="0 0 120 120">
                <circle
                  className={styles.progressTrack}
                  cx="60"
                  cy="60"  
                  r="54"
                  fill="none"
                  strokeWidth="8"
                />
                <circle
                  className={styles.progressBar}
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 54}`}
                  strokeDashoffset={`${2 * Math.PI * 54 * (1 - earnedCount / totalCount)}`}
                />
              </svg>
              <div className={styles.progressText}>
                <AnimatedCounter 
                  value={earnedCount} 
                  duration={2000}
                  className={styles.earned}
                />
                <span className={styles.separator}>/</span>
                <span className={styles.total}>{totalCount}</span>
              </div>
            </div>
          </div>
          <div className={styles.progressLabel}>
            Achievements Unlocked
          </div>
        </div>
        {!isFullPage && (
          <button className={styles.closeButton} onClick={handleClose}>
            ✕
          </button>
        )}
      </div>

      <div className={styles.modalBody}>
        {Object.entries(badgesByCategory).map(([category, categoryBadges]) => (
          <div key={category} className={styles.badgeCategory}>
            <h3 className={styles.categoryTitle}>{category}</h3>
            <div className={styles.badgesGrid}>
              {categoryBadges.map(badge => (
                <div
                  key={badge.id}
                  className={`${styles.badgeCard} ${badge.earned ? styles.earned : styles.locked} ${styles[badge.rarity || 'common']}`}
                  onMouseEnter={() => handleBadgeHover(badge)}
                  onMouseLeave={handleBadgeLeave}
                >
                  <div className={styles.badgeIconContainer}>
                    <div className={`${styles.badgeIcon} ${badge.earned ? styles.unlocked : ''}`}>
                      {badge.earned ? badge.emoji : '🔒'}
                    </div>
                    {badge.earned && (
                      <div className={styles.badgeGlow}></div>
                    )}
                    {!badge.earned && (
                      <div className={`${styles.rarityIndicator} ${styles[badge.rarity || 'common']}`}></div>
                    )}
                  </div>
                  
                  <div className={styles.badgeInfo}>
                    <h4 className={styles.badgeTitle}>
                      {badge.title}
                      {badge.completionCount > 1 && (
                        <span className={styles.completionCount}>×{badge.completionCount}</span>
                      )}
                    </h4>
                    <p className={styles.badgeDescription}>{badge.description}</p>
                    {!badge.earned && (
                      <div className={styles.badgeProgress}>
                        <div className={styles.progressLabel}>Locked</div>
                      </div>
                    )}
                    {badge.earned && badge.displayText && (
                      <div className={styles.completionInfo}>
                        <div className={styles.completionText}>{badge.displayText}</div>
                      </div>
                    )}
                  </div>

                  {badge.earned && (
                    <div className={styles.earnedIndicator}>
                      <div className={styles.checkmark}>✓</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Hover Tooltip */}
      {hoveredBadge && (
        <div className={styles.hoverTooltip}>
          <div className={styles.tooltipHeader}>
            <span className={styles.tooltipEmoji}>{hoveredBadge.earned ? hoveredBadge.emoji : '🔒'}</span>
            <div>
              <h4>{hoveredBadge.title}</h4>
              <span className={`${styles.rarityTag} ${styles[hoveredBadge.rarity || 'common']}`}>
                {hoveredBadge.rarity ? hoveredBadge.rarity.charAt(0).toUpperCase() + hoveredBadge.rarity.slice(1) : 'Common'}
              </span>
            </div>
          </div>
          <p className={styles.tooltipDescription}>{hoveredBadge.description}</p>
          {hoveredBadge.earned ? (
            <div className={styles.tooltipStatus}>
              <span className={styles.statusEarned}>✨ Achieved!</span>
              {hoveredBadge.displayText && (
                <div className={styles.completionDetails}>{hoveredBadge.displayText}</div>
              )}
            </div>
          ) : (
            <div className={styles.tooltipStatus}>
              <span className={styles.statusLocked}>🔒 Not yet unlocked</span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (isFullPage) {
    return content;
  }

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      {content}
    </div>
  );
};

export default BadgesModal; 