import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdatePointsRequest {
  goal_id: string;
  task_id: string;
  user_id: string;
  action: 'complete' | 'incomplete' | 'expire';
}

function calculateCurrentStreak(completedTasks: any[]): number {
  if (!completedTasks || completedTasks.length === 0) {
    return 0;
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  
  let streak = 0;
  let currentDate = new Date(today);
  
  // Group completed tasks by date
  const tasksByDate = new Map<string, boolean>();
  completedTasks.forEach(task => {
    if (task.completed_at) {
      const taskDate = new Date(task.completed_at);
      const dateKey = taskDate.toISOString().split('T')[0]; // YYYY-MM-DD
      tasksByDate.set(dateKey, true);
    }
  });

  // Count consecutive days backwards from today
  while (true) {
    const dateKey = currentDate.toISOString().split('T')[0];
    
    if (tasksByDate.has(dateKey)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { goal_id, task_id, user_id, action }: UpdatePointsRequest = await req.json();

    if (!goal_id || !task_id || !user_id || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get task details
    const { data: task, error: taskError } = await supabaseClient
      .from('goal_tasks')
      .select('*')
      .eq('id', task_id)
      .eq('goal_id', goal_id)
      .single();

    if (taskError || !task) {
      return new Response(
        JSON.stringify({ error: 'Task not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get task intensity level
    const { data: taskData, error: taskError } = await supabaseClient
      .from('goal_tasks')
      .select('intensity')
      .eq('id', task_id)
      .single();

    if (taskError || !taskData) {
      console.log('Task not found, using default intensity');
    }

    const intensity = taskData?.intensity || 'easy';

    // Calculate points based on action and intensity
    let pointsChange = 0;
    let reason = '';

    // Base points multipliers
    const intensityMultiplier = intensity === 'easy' ? 1 : intensity === 'medium' ? 2 : 4;

    switch (action) {
      case 'complete':
        pointsChange = 10 * intensityMultiplier; // Base 10 points * multiplier
        reason = `Task completed (${intensity} intensity)`;
        break;
      case 'incomplete':
        pointsChange = -5 * intensityMultiplier; // Base -5 points * multiplier
        reason = `Task marked as incomplete (${intensity} intensity)`;
        break;
      case 'expire':
        pointsChange = -10 * intensityMultiplier; // Base -10 points * multiplier
        reason = `Task expired without response (${intensity} intensity)`;
        break;
    }

    // Get or create user_points record
    const { data: existingPoints, error: pointsError } = await supabaseClient
      .from('user_points')
      .select('*')
      .eq('user_id', user_id)
      .eq('goal_id', goal_id)
      .single();

    let newPoints = pointsChange;
    let newTotalEarned = pointsChange > 0 ? pointsChange : 0;
    let newTotalLost = pointsChange < 0 ? Math.abs(pointsChange) : 0;

    if (existingPoints) {
      newPoints = existingPoints.points + pointsChange;
      newTotalEarned = existingPoints.total_earned + (pointsChange > 0 ? pointsChange : 0);
      newTotalLost = existingPoints.total_lost + (pointsChange < 0 ? Math.abs(pointsChange) : 0);
    }

    // Update or insert user_points
    const { error: upsertError } = await supabaseClient
      .from('user_points')
      .upsert({
        user_id: user_id,
        goal_id: goal_id,
        points: newPoints,
        total_earned: newTotalEarned,
        total_lost: newTotalLost,
        updated_at: new Date().toISOString()
      });

    if (upsertError) {
      console.error('Error updating user points:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to update points' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Insert points history
    const { error: historyError } = await supabaseClient
      .from('points_history')
      .insert({
        user_id: user_id,
        goal_id: goal_id,
        task_id: task_id,
        points_change: pointsChange,
        reason: reason
      });

    if (historyError) {
      console.error('Error inserting points history:', historyError);
      // Don't fail the request, just log the error
    }

    // Check for automatic reward unlocks based on points
    const { data: rewards, error: rewardsError } = await supabaseClient
      .from('rewards')
      .select('*')
      .eq('goal_id', goal_id)
      .eq('unlocked', false);

    if (!rewardsError && rewards) {
      const unlockedRewards = [];

      for (const reward of rewards) {
        let shouldUnlock = false;

        // Points-based rewards
        if (reward.title.includes('Points') && reward.title.includes('Master')) {
          const pointsRequired = parseInt(reward.title.match(/\d+/)?.[0] || '0');
          if (newPoints >= pointsRequired) {
            shouldUnlock = true;
          }
        }

        if (shouldUnlock) {
          unlockedRewards.push(reward.id);
        }
      }

      // Unlock rewards
      if (unlockedRewards.length > 0) {
        const { error: unlockError } = await supabaseClient
          .from('rewards')
          .update({
            unlocked: true,
            unlocked_at: new Date().toISOString()
          })
          .in('id', unlockedRewards);

        if (unlockError) {
          console.error('Error unlocking rewards:', unlockError);
        }
      }
    }

    // Calculate and update streak
    if (action === 'complete') {
      try {
        // Get all completed tasks for this goal
        const { data: completedTasks, error: tasksError } = await supabaseClient
          .from('goal_tasks')
          .select('completed_at')
          .eq('goal_id', goal_id)
          .eq('completed', true)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false });

        if (tasksError) {
          console.error('Error fetching completed tasks for streak calculation:', tasksError);
        } else {
          // Calculate current streak
          const currentStreak = calculateCurrentStreak(completedTasks || []);
          
          // Update goal streak
          const { error: streakError } = await supabaseClient
            .from('goals')
            .update({ current_streak: currentStreak })
            .eq('id', goal_id);

          if (streakError) {
            console.error('Error updating goal streak:', streakError);
          }
        }
      } catch (streakError) {
        console.error('Error calculating streak:', streakError);
        // Don't fail the points update if streak calculation fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        points_change: pointsChange,
        new_total_points: newPoints,
        unlocked_rewards: unlockedRewards?.length || 0
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in update-points function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
