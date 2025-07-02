// Microsoft Clarity Analytics Integration
const CLARITY_PROJECT_ID = 's6st2gelvh';

class AnalyticsService {
  constructor() {
    this.initialized = false;
    this.isProduction = import.meta.env.PROD;
  }

  // Initialize Microsoft Clarity
  initializeClarity() {
    // Only load in production environment
    if (!this.isProduction || this.initialized) {
      console.log('Analytics: Skipping Clarity (development mode or already initialized)');
      return;
    }

    try {
      // Microsoft Clarity initialization script
      (function(c,l,a,r,i,t,y){
        c[a] = c[a] || function(){(c[a].q = c[a].q || []).push(arguments)};
        t = l.createElement(r);
        t.async = 1;
        t.src = "https://www.clarity.ms/tag/" + i;
        y = l.getElementsByTagName(r)[0];
        y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", CLARITY_PROJECT_ID);

      this.initialized = true;
      console.log('Analytics: Microsoft Clarity initialized successfully');
    } catch (error) {
      console.error('Analytics: Failed to initialize Clarity:', error);
    }
  }

  // Track custom events (optional - for future use)
  trackEvent(eventName, properties = {}) {
    if (!this.isProduction || !this.initialized) return;

    try {
      if (window.clarity) {
        window.clarity('event', eventName, properties);
      }
    } catch (error) {
      console.error('Analytics: Failed to track event:', error);
    }
  }

  // Track user actions (optional - for future use)
  trackUserAction(action, details = {}) {
    if (!this.isProduction || !this.initialized) return;

    try {
      if (window.clarity) {
        window.clarity('set', action, details);
      }
    } catch (error) {
      console.error('Analytics: Failed to track user action:', error);
    }
  }

  // Get analytics status
  getStatus() {
    return {
      initialized: this.initialized,
      environment: this.isProduction ? 'production' : 'development',
      clarityAvailable: typeof window !== 'undefined' && !!window.clarity,
    };
  }
}

// Create and export a singleton instance
const analytics = new AnalyticsService();

export default analytics;
