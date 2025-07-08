/**
 * Share utilities for achievements and app content
 */

// App information
const APP_INFO = {
  name: 'HabitLock',
  tagline: 'Transform your habits, transform your life',
  description: 'The gamified habit tracker that helps you build lasting positive habits',
  url: 'https://habitlock.app', // Update with actual URL
  hashtags: ['HabitLock', 'HabitTracker', 'Productivity', 'SelfImprovement', 'Goals']
};

/**
 * Generate sharing message for achievements
 */
export const generateAchievementMessage = (achievement) => {
  const { emoji, title, description, category, rarity } = achievement;
  
  // Create rarity indicator
  const rarityText = rarity === 'legendary' ? '🌟 LEGENDARY' : 
                    rarity === 'epic' ? '⭐ EPIC' : 
                    rarity === 'rare' ? '💎 RARE' : 
                    rarity === 'uncommon' ? '🔸 UNCOMMON' : '';
  
  // Create the achievement message
  const achievementText = `🎉 Achievement Unlocked! ${emoji}\n\n` +
    `${title}${rarityText ? ` (${rarityText})` : ''}\n` +
    `${description}\n\n` +
    `💪 Building better habits with ${APP_INFO.name}!\n` +
    `${APP_INFO.tagline} ✨`;
  
  return achievementText;
};

/**
 * Generate app promotion message
 */
export const generateAppPromoMessage = () => {
  return `🚀 Transforming my habits with ${APP_INFO.name}!\n\n` +
    `${APP_INFO.description} 🏆\n\n` +
    `Join me in building lasting positive habits! ${APP_INFO.url}`;
};

/**
 * Check if Web Share API is supported
 */
export const isWebShareSupported = () => {
  return typeof navigator !== 'undefined' && 'share' in navigator;
};

/**
 * Share using Web Share API (mobile devices)
 */
export const shareWithWebAPI = async (achievement) => {
  if (!isWebShareSupported()) {
    throw new Error('Web Share API not supported');
  }
  
  const message = generateAchievementMessage(achievement);
  
  try {
    await navigator.share({
      title: `${achievement.emoji} ${achievement.title} - ${APP_INFO.name}`,
      text: message,
      url: APP_INFO.url
    });
    return true;
  } catch (error) {
    if (error.name === 'AbortError') {
      // User cancelled the share
      return false;
    }
    throw error;
  }
};

/**
 * Share to Facebook
 */
export const shareToFacebook = (achievement) => {
  const message = generateAchievementMessage(achievement);
  const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(APP_INFO.url)}&quote=${encodeURIComponent(message)}`;
  
  window.open(url, 'facebook-share', 'width=600,height=500,resizable=yes,scrollbars=yes');
};

/**
 * Share to Twitter/X
 */
export const shareToTwitter = (achievement) => {
  const message = generateAchievementMessage(achievement);
  const hashtags = APP_INFO.hashtags.join(',');
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&hashtags=${hashtags}&url=${encodeURIComponent(APP_INFO.url)}`;
  
  window.open(url, 'twitter-share', 'width=600,height=400,resizable=yes,scrollbars=yes');
};

/**
 * Share to LinkedIn
 */
export const shareToLinkedIn = (achievement) => {
  const message = generateAchievementMessage(achievement);
  const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(APP_INFO.url)}&summary=${encodeURIComponent(message)}`;
  
  window.open(url, 'linkedin-share', 'width=600,height=500,resizable=yes,scrollbars=yes');
};

/**
 * Share to WhatsApp
 */
export const shareToWhatsApp = (achievement) => {
  const message = generateAchievementMessage(achievement);
  const fullMessage = `${message}\n\n${APP_INFO.url}`;
  const url = `https://wa.me/?text=${encodeURIComponent(fullMessage)}`;
  
  window.open(url, 'whatsapp-share');
};

/**
 * Share to Telegram
 */
export const shareToTelegram = (achievement) => {
  const message = generateAchievementMessage(achievement);
  const url = `https://t.me/share/url?url=${encodeURIComponent(APP_INFO.url)}&text=${encodeURIComponent(message)}`;
  
  window.open(url, 'telegram-share', 'width=600,height=500,resizable=yes,scrollbars=yes');
};





/**
 * Get all available sharing options
 */
export const getAvailableSharingOptions = () => {
  const options = [
    {
      id: 'facebook',
      name: 'Facebook',
      icon: 'facebook-logo',
      action: shareToFacebook,
      color: '#1877f2'
    },
    {
      id: 'twitter',
      name: 'Twitter',
      icon: 'twitter-logo',
      action: shareToTwitter,
      color: '#1da1f2'
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: 'linkedin-logo',
      action: shareToLinkedIn,
      color: '#0077b5'
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: 'whatsapp-logo',
      action: shareToWhatsApp,
      color: '#25d366'
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: 'telegram-logo',
      action: shareToTelegram,
      color: '#0088cc'
    }
  ];
  
  // Add native share option if supported
  if (isWebShareSupported()) {
    options.unshift({
      id: 'native',
      name: 'Share...',
      icon: 'share-logo',
      action: shareWithWebAPI,
      color: '#3b82f6'
    });
  }
  
  return options;
};

/**
 * Main sharing function with fallback handling
 */
export const shareAchievement = async (achievement, platform = 'auto') => {
  try {
    // Auto-detect best sharing method
    if (platform === 'auto') {
      if (isWebShareSupported()) {
        return await shareWithWebAPI(achievement);
      } else {
        // Default to Twitter on desktop
        shareToTwitter(achievement);
        return true;
      }
    }
    
    // Use specific platform
    const options = getAvailableSharingOptions();
    const option = options.find(opt => opt.id === platform);
    
    if (!option) {
      throw new Error(`Unsupported sharing platform: ${platform}`);
    }
    
    return await option.action(achievement);
  } catch (error) {
    console.error('Sharing failed:', error);
    throw error;
  }
};

export default {
  shareAchievement,
  getAvailableSharingOptions,
  generateAchievementMessage,
  shareToFacebook,
  shareToTwitter,
  shareToLinkedIn,
  shareToWhatsApp,
  shareToTelegram,
  isWebShareSupported
}; 