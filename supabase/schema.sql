-- HabitLock Supabase Schema
-- Run this in Supabase SQL Editor to set up your database

-- ============================================
-- USER PROFILES
-- ============================================
-- Extends Supabase auth.users with app-specific data
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  photo_url TEXT,
  legacy_firebase_uid TEXT, -- For migration: maps old Firebase UID
  last_login_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for migration lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_legacy_uid ON user_profiles(legacy_firebase_uid);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- ============================================
-- HABITS
-- ============================================
CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  emoji TEXT DEFAULT '✅',
  color TEXT DEFAULT '#4CAF50',
  weekly_goal INTEGER DEFAULT 7,
  category TEXT,
  frequency TEXT,
  legacy_firebase_id TEXT, -- For migration: maps old Firebase habit ID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user's habits lookup
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_legacy_id ON habits(legacy_firebase_id);

-- ============================================
-- CALENDAR ENTRIES
-- ============================================
-- One row per user per day (stores which habits were completed)
CREATE TABLE IF NOT EXISTS calendar_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_calendar_entries_user_date ON calendar_entries(user_id, date);

-- ============================================
-- HABIT COMPLETIONS
-- ============================================
-- Junction table: which habits were completed on which day
CREATE TABLE IF NOT EXISTS habit_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_entry_id UUID NOT NULL REFERENCES calendar_entries(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(calendar_entry_id, habit_id)
);

-- Index for habit completion lookups
CREATE INDEX IF NOT EXISTS idx_habit_completions_entry ON habit_completions(calendar_entry_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_habit ON habit_completions(habit_id);

-- ============================================
-- ACHIEVEMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  rarity TEXT,
  emoji TEXT,
  type TEXT, -- 'permanent' or 'dynamic'
  first_completed_at TIMESTAMPTZ DEFAULT NOW(),
  last_completed_at TIMESTAMPTZ DEFAULT NOW(),
  completion_count INTEGER DEFAULT 1,
  is_currently_earned BOOLEAN DEFAULT TRUE,
  is_backfilled BOOLEAN DEFAULT FALSE,
  timezone TEXT,
  UNIQUE(user_id, badge_id)
);

-- Index for user achievements lookup
CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- User profiles: users can only access their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Habits: users can only access their own habits
CREATE POLICY "Users can view own habits" ON habits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own habits" ON habits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habits" ON habits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own habits" ON habits
  FOR DELETE USING (auth.uid() = user_id);

-- Calendar entries: users can only access their own entries
CREATE POLICY "Users can view own calendar entries" ON calendar_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own calendar entries" ON calendar_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar entries" ON calendar_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar entries" ON calendar_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Habit completions: users can access completions for their calendar entries
CREATE POLICY "Users can view own habit completions" ON habit_completions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM calendar_entries 
      WHERE calendar_entries.id = habit_completions.calendar_entry_id 
      AND calendar_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own habit completions" ON habit_completions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM calendar_entries 
      WHERE calendar_entries.id = habit_completions.calendar_entry_id 
      AND calendar_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own habit completions" ON habit_completions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM calendar_entries 
      WHERE calendar_entries.id = habit_completions.calendar_entry_id 
      AND calendar_entries.user_id = auth.uid()
    )
  );

-- Achievements: users can only access their own achievements
CREATE POLICY "Users can view own achievements" ON achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own achievements" ON achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own achievements" ON achievements
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name, photo_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_habits_updated_at
  BEFORE UPDATE ON habits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_entries_updated_at
  BEFORE UPDATE ON calendar_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- USEFUL VIEWS (Optional)
-- ============================================

-- View to get habits with completion counts
CREATE OR REPLACE VIEW habits_with_stats AS
SELECT 
  h.*,
  COUNT(hc.id) as total_completions,
  MAX(ce.date) as last_completed_date
FROM habits h
LEFT JOIN habit_completions hc ON hc.habit_id = h.id
LEFT JOIN calendar_entries ce ON ce.id = hc.calendar_entry_id
GROUP BY h.id;
