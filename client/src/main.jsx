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
  loaded: (posthog) => {
    // Only enable debug in development
    if (import.meta.env.MODE === 'development') {
      posthog.debug();
    }
    
    // Add error handling for blocked requests
    posthog._capture_hooks = posthog._capture_hooks || [];
    posthog._capture_hooks.push((name, data) => {
      // This will help handle network errors gracefully
      return new Promise((resolve, reject) => {
        try {
          resolve({ name, data });
        } catch (error) {
          // Silently handle errors
          if (import.meta.env.MODE === 'development') {
            console.warn('PostHog capture failed:', error.message);
          }
          resolve({ name, data }); // Still resolve to prevent app crashes
        }
      });
    });
  },
  // Additional error handling options
  on_request_error: (error) => {
    // Silently handle network errors (like ad blocker blocks)
    if (import.meta.env.MODE === 'development') {
      console.warn('PostHog request error (likely blocked by ad blocker):', error.message);
    }
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