-- Script to check user_preferences data
-- Run this in Supabase SQL Editor

-- Check if user_preferences table exists
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'user_preferences'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_preferences';

-- Check actual data (replace YOUR_USER_ID with actual user ID)
-- SELECT * FROM user_preferences WHERE user_id = 'YOUR_USER_ID';

-- Count total user_preferences rows
SELECT COUNT(*) as total_rows FROM user_preferences;

-- Show sample data (first 5 rows)
SELECT 
  user_id,
  preferred_time_ranges,
  preferred_days,
  tasks_per_day_min,
  tasks_per_day_max,
  timezone,
  created_at
FROM user_preferences
ORDER BY created_at DESC
LIMIT 5;

