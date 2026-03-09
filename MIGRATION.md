# Firebase to Supabase + Cloudflare Migration Guide

This guide walks through migrating HabitLock from Firebase to Supabase (auth + database) and Cloudflare Pages (hosting).

## Overview

| Before | After |
|--------|-------|
| Firebase Auth | Supabase Auth (Magic Link + Google) |
| Firebase Realtime DB | Supabase PostgreSQL |
| Firebase Firestore | Supabase PostgreSQL |
| Firebase Hosting | Cloudflare Pages |

## Step 1: Set Up Supabase

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **anon/public key** from Settings > API
3. Keep the **service_role key** handy for migration (don't expose this in frontend code)

### 1.2 Run Database Schema

1. Go to SQL Editor in Supabase Dashboard
2. Copy contents of `supabase/schema.sql` and execute
3. This creates:
   - `user_profiles` table
   - `habits` table
   - `calendar_entries` table
   - `habit_completions` table
   - `achievements` table
   - Row Level Security policies
   - Auto-profile creation trigger

### 1.3 Configure Authentication

1. Go to Authentication > Providers
2. Enable **Email** (for magic link)
   - Set "Enable email confirmations" to your preference
   - Customize email templates under "Email Templates"
3. (Optional) Enable **Google** OAuth:
   - Add your Google OAuth credentials
   - Set redirect URL to `https://your-domain.com/auth/callback`

### 1.4 Set Site URL

1. Go to Authentication > URL Configuration
2. Set **Site URL** to your production domain (e.g., `https://habitlock.com`)
3. Add `http://localhost:5173` to **Redirect URLs** for local development

## Step 2: Update Environment Variables

Create `.env` in `client/` folder:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Keep your existing keys
VITE_POSTHOG_KEY=your-posthog-key
VITE_OPENAI_API_KEY=your-openai-key
```

## Step 3: Install Dependencies

```bash
cd client
npm install
```

This will install `@supabase/supabase-js` which was added to `package.json`.

## Step 4: Migrate Existing Data (Optional)

If you have existing users and data in Firebase:

### 4.1 Export Firebase Data

1. Go to Firebase Console > Realtime Database
2. Click the three dots menu > Export JSON
3. Save as `firebase-export.json`

### 4.2 Run Migration Script

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-role-key"

node scripts/migrate-firebase-to-supabase.js --data ./firebase-export.json
```

This creates:
- `supabase-migration-mapping.json` - Maps Firebase UIDs to user data
- `supabase-migration-data.sql` - SQL to import after users sign up

### 4.3 User Data Migration

When users sign in with the same email:
1. Look up their email in the migration mapping
2. Insert their habits and calendar entries with their new Supabase user ID
3. This happens automatically if you implement the migration check in your auth flow

## Step 5: Deploy to Cloudflare Pages

### 5.1 Connect Repository

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) > Pages
2. Click "Create a project" > "Connect to Git"
3. Select your GitHub repository

### 5.2 Configure Build Settings

| Setting | Value |
|---------|-------|
| Framework preset | None |
| Build command | `cd client && npm install && npm run build` |
| Build output directory | `client/dist` |
| Root directory | `/` |

### 5.3 Set Environment Variables

In Cloudflare Pages > Settings > Environment Variables:

```
VITE_SUPABASE_URL = https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY = your-anon-key
VITE_POSTHOG_KEY = your-posthog-key
VITE_OPENAI_API_KEY = your-openai-key
```

### 5.4 Deploy

1. Push to your main branch
2. Cloudflare will automatically build and deploy
3. Your site will be live at `your-project.pages.dev`

### 5.5 Custom Domain (Optional)

1. Go to your Pages project > Custom domains
2. Add your domain (e.g., `habitlock.com`)
3. Follow DNS configuration instructions

## Step 6: Update Supabase Redirect URLs

After deployment, add your Cloudflare domain to Supabase:

1. Go to Authentication > URL Configuration
2. Add `https://your-domain.pages.dev/auth/callback` to Redirect URLs
3. If using custom domain, also add `https://habitlock.com/auth/callback`

## Step 7: Test Everything

### Auth Flow
- [ ] Magic link sign-in works
- [ ] Email arrives and link redirects correctly
- [ ] User profile is created in `user_profiles` table

### Data Operations
- [ ] Creating habits works
- [ ] Calendar entries save correctly
- [ ] Real-time updates work (habit changes appear immediately)
- [ ] Achievements are tracked

### Edge Cases
- [ ] Signing out clears state
- [ ] Page refresh maintains session
- [ ] Multiple tabs stay in sync

## Rollback Plan

If issues occur, the original Firebase code is preserved in:
- `client/src/services/firebase.js` (auth)
- `client/src/services/db.js` (database)
- `client/src/services/achievements.js` (Firestore)

To rollback:
1. Revert imports in hooks and components to use Firebase files
2. Restore Firebase environment variables
3. Deploy to Firebase Hosting again

## Cost Comparison

| Service | Firebase (Spark) | Supabase + Cloudflare |
|---------|------------------|----------------------|
| Hosting Bandwidth | 10 GB/mo | **Unlimited** |
| Database | 1 GB storage | 500 MB storage |
| Auth | 10k verifications/mo | 50k MAU |
| **Monthly Cost** | $0 (then $25+) | **$0** |

You can run HabitLock at $0/month until you hit Supabase's free tier limits (50k monthly active users, 500MB database).

## Files Changed

### New Files
- `supabase/schema.sql` - Database schema
- `client/src/services/supabase.js` - Supabase auth
- `client/src/services/supabaseDb.js` - Database operations
- `client/src/services/supabaseAchievements.js` - Achievements
- `client/src/components/AuthCallback.jsx` - Magic link handler
- `scripts/migrate-firebase-to-supabase.js` - Data migration
- `MIGRATION.md` - This guide

### Modified Files
- `client/package.json` - Added Supabase dependency
- `client/src/App.jsx` - Added auth callback route
- `client/src/context/AuthContext.jsx` - Supabase auth
- `client/src/hooks/useHabits.js` - Supabase imports
- `client/src/hooks/useCalendar.js` - Supabase imports
- Various components - Updated imports

### Preserved Files (for rollback)
- `client/src/services/firebase.js`
- `client/src/services/db.js`
- `client/src/services/achievements.js`
