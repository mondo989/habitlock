# HabitLock Setup Guide

## Firebase Configuration

1. **Create a Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Create a project" or select an existing one
   - Follow the setup wizard

2. **Enable Required Services**
   - **Authentication**: Go to Authentication > Sign-in method > Anonymous > Enable
   - **Realtime Database**: Go to Realtime Database > Create database > Start in test mode

3. **Get Configuration Values**
   - Go to Project Settings (gear icon) > General tab
   - Scroll down to "Your apps" section
   - Click "Add app" > Web app icon
   - Register your app with name "HabitLock"
   - Copy the configuration object

4. **Create Environment File**
   Create a file named `.env` in the `client` directory with:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com/
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_APP_ID=your_app_id_here
   VITE_OPEN_AI_KEY=your_openai_api_key_here
   ```

   **Note:** The OpenAI API key is optional and only needed for AI-generated habit insights feature.

## Running the Application

1. **Install Dependencies**
   ```bash
   cd client
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Open in Browser**
   - The app will be available at `http://localhost:5173`
   - Create your first habit and start tracking!

## Deployment

1. **Build for Production**
   ```bash
   npm run build
   ```

2. **Deploy to Firebase Hosting** (optional)
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init hosting
   firebase deploy
   ```

## Troubleshooting

- **Firebase errors**: Make sure all environment variables are correctly set
- **Database permissions**: Ensure Realtime Database rules allow anonymous access
- **Authentication issues**: Verify Anonymous authentication is enabled

## Features

- 📅 **Calendar View**: Track habits with emoji representations
- 🎯 **Weekly Goals**: Set and track weekly completion targets
- 🔥 **Streaks**: Build consecutive day habits
- ✨ **Goal Glow**: Habits glow when weekly goals are met
- 📊 **Statistics**: Detailed analytics and heatmaps
- 📱 **Responsive**: Works on desktop and mobile devices 