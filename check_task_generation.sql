-- Check active goals and their task counts
SELECT 
  g.id,
  g.title,
  g.status,
  g.plan_duration_days,
  g.preferred_days,
  g.tasks_per_day_max,
  (SELECT COUNT(*) FROM goal_tasks WHERE goal_id = g.id) as total_tasks,
  g.error_message,
  g.created_at,
  g.updated_at
FROM goals g
WHERE g.status = 'active'
ORDER BY g.created_at DESC
LIMIT 10;

-- Check AI runs to see which weeks were generated
SELECT 
  goal_id,
  week_number,
  status,
  tasks_generated,
  total_weeks,
  created_at,
  metadata
FROM ai_runs
WHERE stage LIKE 'tasks_week%'
ORDER BY created_at DESC
LIMIT 20;

-- Check if there are goals stuck in loading (active with few tasks)
SELECT 
  g.id,
  g.title,
  g.plan_duration_days,
  (SELECT COUNT(*) FROM goal_tasks WHERE goal_id = g.id) as total_tasks,
  g.status,
  g.error_message
FROM goals g
WHERE g.status = 'active'
  AND (SELECT COUNT(*) FROM goal_tasks WHERE goal_id = g.id) < (
    -- Calculate expected tasks
    CEIL(g.plan_duration_days / 7.0) * 
    COALESCE(ARRAY_LENGTH(g.preferred_days, 1), 7) * 
    LEAST(
      COALESCE(g.tasks_per_day_max, ARRAY_LENGTH(g.preferred_time_ranges, 1), 3),
      COALESCE(ARRAY_LENGTH(g.preferred_time_ranges, 1), 3)
    )
  )
ORDER BY g.created_at DESC;

