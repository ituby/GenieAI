-- Fix task intensity values to ensure consistency
-- Update all tasks with NULL or incorrect intensity to 'easy'

UPDATE goal_tasks 
SET intensity = 'easy' 
WHERE intensity IS NULL OR intensity NOT IN ('easy', 'medium', 'hard');

-- Add a comment to explain the change
COMMENT ON COLUMN goal_tasks.intensity IS 'Task intensity level: easy (1x), medium (2x), hard (4x) points multiplier';
