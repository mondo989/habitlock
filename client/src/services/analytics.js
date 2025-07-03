// Analytics Service - Handles Microsoft Clarity and PostHog with error handling
const CLARITY_PROJECT_ID = 's6st2gelvh';

class AnalyticsService {
  constructor() {
    this.initialized = false;
    this.posthogAvailable = false;
    this.clarityAvailable = false;
    this.isProduction = import.meta.env.PROD;
    this.posthog = null;
  }

  // Initialize Microsoft Clarity
  initializeClarity() {
    // Only load in production environment
    if (!this.isProduction || this.clarityAvailable) {
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

      this.clarityAvailable = true;
      console.log('Analytics: Microsoft Clarity initialized successfully');
    } catch (error) {
      console.error('Analytics: Failed to initialize Clarity:', error);
    }
  }

  // Set PostHog instance (called from components)
  setPostHog(posthogInstance) {
    this.posthog = posthogInstance;
    this.posthogAvailable = !!posthogInstance;
    this.initialized = true;
  }

  // Safe PostHog wrapper - prevents errors when blocked
  capture(eventName, properties = {}) {
    if (!this.posthogAvailable || !this.posthog) {
      // Silently fail - don't spam console in development
      if (import.meta.env.MODE === 'development') {
        console.log(`Analytics: Would track "${eventName}"`, properties);
      }
      return;
    }

    try {
      this.posthog.capture(eventName, properties);
    } catch (error) {
      // Silently handle PostHog errors (likely blocked by ad blocker)
      if (import.meta.env.MODE === 'development') {
        console.warn('Analytics: PostHog capture failed (likely blocked):', error.message);
      }
      // Mark as unavailable to prevent future attempts
      this.posthogAvailable = false;
    }
  }

  // Safe PostHog identify wrapper
  identify(userId, properties = {}) {
    if (!this.posthogAvailable || !this.posthog) return;

    try {
      this.posthog.identify(userId, properties);
    } catch (error) {
      if (import.meta.env.MODE === 'development') {
        console.warn('Analytics: PostHog identify failed (likely blocked):', error.message);
      }
      this.posthogAvailable = false;
    }
  }

  // Safe PostHog alias wrapper
  alias(alias) {
    if (!this.posthogAvailable || !this.posthog) return;

    try {
      this.posthog.alias(alias);
    } catch (error) {
      if (import.meta.env.MODE === 'development') {
        console.warn('Analytics: PostHog alias failed (likely blocked):', error.message);
      }
      this.posthogAvailable = false;
    }
  }

  // Safe PostHog reset wrapper
  reset() {
    if (!this.posthogAvailable || !this.posthog) return;

    try {
      this.posthog.reset();
    } catch (error) {
      if (import.meta.env.MODE === 'development') {
        console.warn('Analytics: PostHog reset failed (likely blocked):', error.message);
      }
      this.posthogAvailable = false;
    }
  }

  // Track custom events with Clarity (fallback when PostHog is blocked)
  trackEvent(eventName, properties = {}) {
    // Try PostHog first
    this.capture(eventName, properties);

    // Fallback to Clarity if available
    if (!this.isProduction || !this.clarityAvailable) return;

    try {
      if (window.clarity) {
        window.clarity('event', eventName, properties);
      }
    } catch (error) {
      if (import.meta.env.MODE === 'development') {
        console.warn('Analytics: Clarity event failed:', error.message);
      }
    }
  }

  // Track user actions with Clarity
  trackUserAction(action, details = {}) {
    if (!this.isProduction || !this.clarityAvailable) return;

    try {
      if (window.clarity) {
        window.clarity('set', action, details);
      }
    } catch (error) {
      if (import.meta.env.MODE === 'development') {
        console.warn('Analytics: Clarity action failed:', error.message);
      }
    }
  }

  // Get analytics status
  getStatus() {
    return {
      initialized: this.initialized,
      environment: this.isProduction ? 'production' : 'development',
      posthogAvailable: this.posthogAvailable,
      clarityAvailable: this.clarityAvailable && typeof window !== 'undefined' && !!window.clarity,
    };
  }

  // Check if analytics are blocked (useful for debugging)
  isBlocked() {
    return !this.posthogAvailable && !this.clarityAvailable;
  }
}

// Create and export a singleton instance
const analytics = new AnalyticsService();

export default analytics;
