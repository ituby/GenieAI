-- Find ITUBY user
SELECT id, email, full_name 
FROM public.users 
WHERE email ILIKE '%ituby%' OR full_name ILIKE '%ituby%';

-- After finding the user_id, run this to delete all goals:
-- DELETE FROM goals WHERE user_id = '<user_id_from_above>';

-- Or delete all goals for ITUBY user in one go:
DO $$
DECLARE
    ituby_user_id UUID;
BEGIN
    -- Find ITUBY user
    SELECT id INTO ituby_user_id
    FROM public.users
    WHERE email ILIKE '%ituby%' OR full_name ILIKE '%ituby%'
    LIMIT 1;
    
    IF ituby_user_id IS NOT NULL THEN
        -- Delete all related data first (due to foreign key constraints)
        DELETE FROM goal_tasks WHERE goal_id IN (SELECT id FROM goals WHERE user_id = ituby_user_id);
        DELETE FROM rewards WHERE goal_id IN (SELECT id FROM goals WHERE user_id = ituby_user_id);
        DELETE FROM plan_outlines WHERE goal_id IN (SELECT id FROM goals WHERE user_id = ituby_user_id);
        DELETE FROM ai_runs WHERE goal_id IN (SELECT id FROM goals WHERE user_id = ituby_user_id);
        DELETE FROM user_points WHERE goal_id IN (SELECT id FROM goals WHERE user_id = ituby_user_id);
        
        -- Finally delete the goals
        DELETE FROM goals WHERE user_id = ituby_user_id;
        
        RAISE NOTICE 'Deleted all goals for user: %', ituby_user_id;
    ELSE
        RAISE NOTICE 'ITUBY user not found';
    END IF;
END $$;

