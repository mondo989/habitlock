#!/usr/bin/env node
/**
 * Firebase to Supabase Migration Script
 * 
 * This script migrates data from Firebase Realtime Database to Supabase PostgreSQL.
 * 
 * Prerequisites:
 * 1. Export your Firebase data as JSON from Firebase Console
 * 2. Set up your Supabase project and run the schema.sql
 * 3. Set environment variables (see below)
 * 
 * Usage:
 *   node scripts/migrate-firebase-to-supabase.js --data ./firebase-export.json
 * 
 * Environment variables:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_KEY - Service role key (NOT anon key - needs admin access)
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: Missing required environment variables');
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Parse command line arguments
const args = process.argv.slice(2);
const dataFileIndex = args.indexOf('--data');
if (dataFileIndex === -1 || !args[dataFileIndex + 1]) {
  console.error('Error: Missing --data argument');
  console.error('Usage: node migrate-firebase-to-supabase.js --data ./firebase-export.json');
  process.exit(1);
}

const dataFilePath = args[dataFileIndex + 1];

async function main() {
  console.log('🚀 Starting Firebase to Supabase migration...\n');

  // Read Firebase export
  console.log(`📖 Reading Firebase export from: ${dataFilePath}`);
  const firebaseData = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));

  const { userProfiles = {}, habits = {}, calendarEntries = {} } = firebaseData;

  // Statistics
  const stats = {
    usersCreated: 0,
    habitsCreated: 0,
    calendarEntriesCreated: 0,
    habitCompletionsCreated: 0,
    errors: [],
  };

  // Step 1: Create migration mapping table in memory
  // Maps Firebase UIDs to email addresses for later migration
  const firebaseUidToEmail = {};
  
  console.log('\n📧 Building user email mapping...');
  Object.entries(userProfiles).forEach(([firebaseUid, profile]) => {
    if (profile.email) {
      firebaseUidToEmail[firebaseUid] = profile.email;
      console.log(`  - ${firebaseUid} → ${profile.email}`);
    }
  });

  // Step 2: Create a temporary user mapping file
  // This will be used when users log in with the same email
  const migrationMapping = {
    generatedAt: new Date().toISOString(),
    users: {},
  };

  // Step 3: For each Firebase user, we'll store their data in a staging format
  // Real user IDs will be assigned when they sign up with Supabase
  
  console.log('\n👤 Processing users and their data...\n');
  
  for (const [firebaseUid, userHabits] of Object.entries(habits)) {
    const email = firebaseUidToEmail[firebaseUid];
    const profile = userProfiles[firebaseUid] || {};
    
    console.log(`Processing user: ${email || firebaseUid}`);
    
    // Store migration data for this user
    migrationMapping.users[firebaseUid] = {
      email: email,
      displayName: profile.displayName,
      photoURL: profile.photoURL,
      lastLoginAt: profile.lastLoginAt,
      habits: [],
      calendarEntries: [],
    };

    // Process habits
    const habitIdMapping = {}; // Firebase habit ID → new habit data
    
    for (const [firebaseHabitId, habitData] of Object.entries(userHabits)) {
      const newHabitId = crypto.randomUUID();
      
      habitIdMapping[firebaseHabitId] = newHabitId;
      
      migrationMapping.users[firebaseUid].habits.push({
        legacyFirebaseId: firebaseHabitId,
        newId: newHabitId,
        name: habitData.name,
        description: habitData.description || null,
        emoji: habitData.emoji || '✅',
        color: habitData.color || '#4CAF50',
        weeklyGoal: habitData.weeklyGoal || 7,
        category: habitData.category || null,
        frequency: habitData.frequency || null,
        createdAt: habitData.createdAt 
          ? new Date(habitData.createdAt).toISOString()
          : new Date().toISOString(),
      });
      
      stats.habitsCreated++;
    }

    // Process calendar entries
    const userEntries = calendarEntries[firebaseUid] || {};
    
    for (const [date, entryData] of Object.entries(userEntries)) {
      if (!entryData.completedHabits || entryData.completedHabits.length === 0) {
        continue;
      }

      const completions = [];
      
      for (const firebaseHabitId of entryData.completedHabits) {
        const newHabitId = habitIdMapping[firebaseHabitId];
        if (!newHabitId) {
          console.warn(`  ⚠️ Habit ${firebaseHabitId} not found for entry ${date}`);
          continue;
        }
        
        const habitDetails = entryData.habits?.[firebaseHabitId] || {};
        
        completions.push({
          habitId: newHabitId,
          legacyHabitId: firebaseHabitId,
          completedAt: habitDetails.completedAt || new Date(date).toISOString(),
        });
        
        stats.habitCompletionsCreated++;
      }
      
      if (completions.length > 0) {
        migrationMapping.users[firebaseUid].calendarEntries.push({
          date,
          completions,
        });
        stats.calendarEntriesCreated++;
      }
    }
    
    stats.usersCreated++;
    console.log(`  ✓ ${Object.keys(userHabits).length} habits, ${Object.keys(userEntries).length} entries\n`);
  }

  // Save migration mapping
  const outputPath = path.join(path.dirname(dataFilePath), 'supabase-migration-mapping.json');
  fs.writeFileSync(outputPath, JSON.stringify(migrationMapping, null, 2));
  
  console.log('\n📊 Migration Summary:');
  console.log(`  Users: ${stats.usersCreated}`);
  console.log(`  Habits: ${stats.habitsCreated}`);
  console.log(`  Calendar Entries: ${stats.calendarEntriesCreated}`);
  console.log(`  Habit Completions: ${stats.habitCompletionsCreated}`);
  
  console.log(`\n✅ Migration mapping saved to: ${outputPath}`);
  console.log('\nNext steps:');
  console.log('1. When users sign in with their email, look up their data in the mapping file');
  console.log('2. Import their habits and calendar entries with their new Supabase user ID');
  console.log('3. Delete the mapping entry after successful import');
  
  // Also create a SQL import script for direct database import (admin use)
  const sqlOutputPath = path.join(path.dirname(dataFilePath), 'supabase-migration-data.sql');
  let sqlScript = `-- Supabase Migration Data
-- Generated: ${new Date().toISOString()}
-- 
-- IMPORTANT: This script requires you to manually create users first,
-- then replace the placeholder UUIDs with actual Supabase user IDs.
--
-- Steps:
-- 1. Have users sign up with their email addresses
-- 2. Look up their Supabase UUIDs from auth.users table
-- 3. Replace 'PLACEHOLDER_USER_ID_FOR_xxx' with actual UUIDs
-- 4. Run this script

`;

  for (const [firebaseUid, userData] of Object.entries(migrationMapping.users)) {
    const placeholder = `PLACEHOLDER_USER_ID_FOR_${userData.email || firebaseUid}`;
    
    sqlScript += `\n-- User: ${userData.email || firebaseUid}\n`;
    sqlScript += `-- Firebase UID: ${firebaseUid}\n`;
    sqlScript += `-- Replace '${placeholder}' with actual Supabase user UUID\n\n`;
    
    // Insert habits
    for (const habit of userData.habits) {
      sqlScript += `INSERT INTO habits (id, user_id, name, description, emoji, color, weekly_goal, category, frequency, legacy_firebase_id, created_at)
VALUES (
  '${habit.newId}',
  '${placeholder}',
  '${(habit.name || '').replace(/'/g, "''")}',
  ${habit.description ? `'${habit.description.replace(/'/g, "''")}'` : 'NULL'},
  '${habit.emoji}',
  '${habit.color}',
  ${habit.weeklyGoal},
  ${habit.category ? `'${habit.category.replace(/'/g, "''")}'` : 'NULL'},
  ${habit.frequency ? `'${habit.frequency.replace(/'/g, "''")}'` : 'NULL'},
  '${habit.legacyFirebaseId}',
  '${habit.createdAt}'
);\n`;
    }
    
    sqlScript += '\n';
  }
  
  fs.writeFileSync(sqlOutputPath, sqlScript);
  console.log(`\n📝 SQL import script saved to: ${sqlOutputPath}`);
}

main().catch(console.error);
