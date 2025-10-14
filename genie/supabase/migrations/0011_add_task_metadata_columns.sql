-- Add missing columns to goal_tasks table for better task management
ALTER TABLE public.goal_tasks 
ADD COLUMN IF NOT EXISTS day_offset INTEGER,
ADD COLUMN IF NOT EXISTS time_of_day TEXT,
ADD COLUMN IF NOT EXISTS local_run_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS intensity TEXT CHECK (intensity IN ('easy', 'medium', 'hard'));

-- Add unique constraint to prevent duplicate tasks for same goal, day, and time
ALTER TABLE public.goal_tasks 
ADD CONSTRAINT unique_goal_day_time 
UNIQUE (goal_id, day_offset, time_of_day);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_goal_tasks_day_offset ON public.goal_tasks(day_offset);
CREATE INDEX IF NOT EXISTS idx_goal_tasks_time_of_day ON public.goal_tasks(time_of_day);
CREATE INDEX IF NOT EXISTS idx_goal_tasks_intensity ON public.goal_tasks(intensity);
CREATE INDEX IF NOT EXISTS idx_goal_tasks_goal_day_time ON public.goal_tasks(goal_id, day_offset, time_of_day);
