import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { PostHogProvider } from 'posthog-js/react'

const options = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  person_profiles: 'identified_only',
  capture_pageview: false, // We handle this manually
  disable_session_recording: import.meta.env.MODE === 'development',
  disable_persistence: import.meta.env.MODE === 'development',
  disable_feature_flags: false, // Keep feature flags but handle errors gracefully
  request_timeout_ms: 5000, // Faster timeout to detect blocking
  retry: false, // Disable automatic retries to prevent spam
  loaded: (posthog) => {
    // Only enable debug in development and reduce verbosity
    if (import.meta.env.MODE === 'development') {
      // Don't enable full debug mode as it's too verbose
      // posthog.debug();
    }
    
    // Override console methods to reduce PostHog noise
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    // Intercept PostHog errors and warnings
    console.error = function(...args) {
      const message = args.join(' ');
      if (message.includes('PostHog') && 
          (message.includes('Failed to fetch') || 
           message.includes('ERR_BLOCKED_BY_CLIENT') ||
           message.includes('net::ERR_BLOCKED_BY_CLIENT'))) {
        // Silently ignore blocked PostHog requests
        if (import.meta.env.MODE === 'development') {
          console.warn('Analytics: PostHog blocked by ad blocker (this is normal)');
        }
        return;
      }
      originalConsoleError.apply(console, args);
    };
    
    console.warn = function(...args) {
      const message = args.join(' ');
      if (message.includes('PostHog') && 
          (message.includes('Enqueued failed request') ||
           message.includes('retry'))) {
        // Silently ignore PostHog retry warnings
        return;
      }
      originalConsoleWarn.apply(console, args);
    };
  },
  // Completely silent error handling
  on_request_error: () => {
    // Do nothing - errors are handled by our analytics service
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PostHogProvider
      apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
      options={options}
    >
      <App />
    </PostHogProvider>
  </StrictMode>,
)