-- Clean all goals for ITUBY user
DO $$
DECLARE
    ituby_user_id UUID;
    deleted_goals_count INTEGER := 0;
    deleted_tasks_count INTEGER := 0;
    deleted_rewards_count INTEGER := 0;
    deleted_outlines_count INTEGER := 0;
    deleted_ai_runs_count INTEGER := 0;
    deleted_points_count INTEGER := 0;
BEGIN
    -- Find ITUBY user
    SELECT id INTO ituby_user_id
    FROM public.users
    WHERE email ILIKE '%ituby%' OR full_name ILIKE '%ituby%'
    LIMIT 1;
    
    IF ituby_user_id IS NOT NULL THEN
        RAISE NOTICE 'Found ITUBY user: %', ituby_user_id;
        
        -- Delete all related data first (due to foreign key constraints)
        WITH deleted_tasks AS (
            DELETE FROM goal_tasks 
            WHERE goal_id IN (SELECT id FROM goals WHERE user_id = ituby_user_id)
            RETURNING *
        )
        SELECT COUNT(*) INTO deleted_tasks_count FROM deleted_tasks;
        
        WITH deleted_rewards AS (
            DELETE FROM rewards 
            WHERE goal_id IN (SELECT id FROM goals WHERE user_id = ituby_user_id)
            RETURNING *
        )
        SELECT COUNT(*) INTO deleted_rewards_count FROM deleted_rewards;
        
        WITH deleted_outlines AS (
            DELETE FROM plan_outlines 
            WHERE goal_id IN (SELECT id FROM goals WHERE user_id = ituby_user_id)
            RETURNING *
        )
        SELECT COUNT(*) INTO deleted_outlines_count FROM deleted_outlines;
        
        WITH deleted_ai_runs AS (
            DELETE FROM ai_runs 
            WHERE goal_id IN (SELECT id FROM goals WHERE user_id = ituby_user_id)
            RETURNING *
        )
        SELECT COUNT(*) INTO deleted_ai_runs_count FROM deleted_ai_runs;
        
        WITH deleted_points AS (
            DELETE FROM user_points 
            WHERE goal_id IN (SELECT id FROM goals WHERE user_id = ituby_user_id)
            RETURNING *
        )
        SELECT COUNT(*) INTO deleted_points_count FROM deleted_points;
        
        -- Finally delete the goals
        WITH deleted_goals AS (
            DELETE FROM goals 
            WHERE user_id = ituby_user_id
            RETURNING *
        )
        SELECT COUNT(*) INTO deleted_goals_count FROM deleted_goals;
        
        RAISE NOTICE 'Deleted for ITUBY user (%):', ituby_user_id;
        RAISE NOTICE '  - Goals: %', deleted_goals_count;
        RAISE NOTICE '  - Tasks: %', deleted_tasks_count;
        RAISE NOTICE '  - Rewards: %', deleted_rewards_count;
        RAISE NOTICE '  - Plan Outlines: %', deleted_outlines_count;
        RAISE NOTICE '  - AI Runs: %', deleted_ai_runs_count;
        RAISE NOTICE '  - User Points: %', deleted_points_count;
    ELSE
        RAISE NOTICE 'ITUBY user not found';
    END IF;
END $$;

