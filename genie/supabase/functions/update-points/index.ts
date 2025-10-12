import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdatePointsRequest {
  goal_id: string;
  task_id: string;
  action: 'complete' | 'incomplete' | 'expire';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { goal_id, task_id, action }: UpdatePointsRequest = await req.json();

    if (!goal_id || !task_id || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get user from auth
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
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
    const { data: task, error: taskError } = await supabaseClient
      .from('goal_tasks')
      .select('intensity')
      .eq('id', task_id)
      .single();

    if (taskError || !task) {
      console.log('Task not found, using default intensity');
    }

    const intensity = task?.intensity || 'easy';

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
      .eq('user_id', user.id)
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
        user_id: user.id,
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
        user_id: user.id,
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
