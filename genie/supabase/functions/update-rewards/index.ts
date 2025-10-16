import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RewardUpdateRequest {
  goal_id: string;
  task_id?: string;
  task_completed?: boolean;
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

    const { goal_id, task_id, task_completed }: RewardUpdateRequest = await req.json();

    if (!goal_id) {
      return new Response(
        JSON.stringify({ error: 'goal_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get user_id from the goal
    const { data: goal, error: goalError } = await supabaseClient
      .from('goals')
      .select('user_id')
      .eq('id', goal_id)
      .single();

    if (goalError || !goal) {
      return new Response(
        JSON.stringify({ error: 'Goal not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const user_id = goal.user_id;

    // Get all tasks for the goal
    const { data: tasks, error: tasksError } = await supabaseClient
      .from('goal_tasks')
      .select('*')
      .eq('goal_id', goal_id)
      .order('run_at', { ascending: true });

    if (tasksError) {
      throw tasksError;
    }

    // Get all rewards for the goal
    const { data: rewards, error: rewardsError } = await supabaseClient
      .from('rewards')
      .select('*')
      .eq('goal_id', goal_id)
      .order('day_offset', { ascending: true, nullsFirst: true });

    if (rewardsError) {
      throw rewardsError;
    }

    const now = new Date();
    const updates: any[] = [];

    // Check daily rewards - unlock after completing today's tasks
    const dailyRewards = rewards.filter(r => r.type === 'daily' && !r.unlocked);
    for (const dailyReward of dailyRewards) {
      // Check if there are completed tasks today
      const today = now.toISOString().split('T')[0];
      const todayTasks = tasks.filter(t => {
        const taskDate = new Date(t.run_at).toISOString().split('T')[0];
        return taskDate === today;
      });

      const completedTodayTasks = todayTasks.filter(t => t.completed);
      
      // Unlock daily reward if at least 50% of today's tasks are completed
      if (todayTasks.length > 0 && (completedTodayTasks.length / todayTasks.length) >= 0.5) {
        updates.push({
          id: dailyReward.id,
          unlocked: true,
          unlocked_at: now.toISOString()
        });
      }
    }

    // Check milestone rewards
    const milestoneRewards = rewards.filter(r => r.type === 'milestone' && !r.unlocked);
    for (const reward of milestoneRewards) {
      let shouldUnlock = false;

      // Check task-specific milestones (5, 10, 15, 20 tasks)
      if (reward.title.includes('Tasks Complete!')) {
        const completedTasks = tasks.filter(t => t.completed).length;
        const milestoneNumber = parseInt(reward.title.match(/\d+/)?.[0] || '0');
        
        if (completedTasks >= milestoneNumber) {
          shouldUnlock = true;
        }
      }
      // Check points-based rewards
      else if (reward.title.includes('Points') && reward.title.includes('Master')) {
        // Get user points for this goal
        const { data: userPoints } = await supabaseClient
          .from('user_points')
          .select('points')
          .eq('goal_id', goal_id)
          .eq('user_id', user_id)
          .single();

        const currentPoints = userPoints?.points || 0;
        const pointsRequired = parseInt(reward.title.match(/\d+/)?.[0] || '0');
        
        if (currentPoints >= pointsRequired) {
          shouldUnlock = true;
        }
      }
      // Check weekly consistency milestones
      else if (reward.day_offset !== null) {
        // Count completed tasks up to this day
        const completedTasksUpToDay = tasks.filter(t => {
          const taskDate = new Date(t.run_at);
          const daysFromStart = Math.floor((taskDate.getTime() - new Date(tasks[0]?.run_at || 0).getTime()) / (1000 * 60 * 60 * 24));
          return daysFromStart <= reward.day_offset && t.completed;
        });

        // Check if milestone is reached - need at least 70% completion rate for that period
        const totalTasksInPeriod = tasks.filter(t => {
          const taskDate = new Date(t.run_at);
          const daysFromStart = Math.floor((taskDate.getTime() - new Date(tasks[0]?.run_at || 0).getTime()) / (1000 * 60 * 60 * 24));
          return daysFromStart <= reward.day_offset;
        }).length;

        const completionRate = totalTasksInPeriod > 0 ? completedTasksUpToDay.length / totalTasksInPeriod : 0;

        if (completionRate >= 0.7) { // 70% completion rate
          shouldUnlock = true;
        }
      }

      if (shouldUnlock) {
        updates.push({
          id: reward.id,
          unlocked: true,
          unlocked_at: now.toISOString()
        });
      }
    }

    // Check completion reward
    const completionReward = rewards.find(r => r.type === 'completion' && !r.unlocked);
    if (completionReward) {
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.completed).length;
      
      // Unlock completion reward if 85% of tasks are completed
      if (totalTasks > 0 && (completedTasks / totalTasks) >= 0.85) {
        updates.push({
          id: completionReward.id,
          unlocked: true,
          unlocked_at: now.toISOString()
        });
      }
    }

    // Update rewards in database and send notifications
    if (updates.length > 0) {
      for (const update of updates) {
        // Get reward details for notification
        const reward = rewards.find(r => r.id === update.id);
        
        const { error: updateError } = await supabaseClient
          .from('rewards')
          .update({
            unlocked: update.unlocked,
            unlocked_at: update.unlocked_at
          })
          .eq('id', update.id);

        if (updateError) {
          console.error('Error updating reward:', updateError);
          continue;
        }
        
        // Send push notification about unlocked reward
        if (reward) {
          try {
            await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/push-dispatcher`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                user_id,
                title: '🎉 Reward Unlocked!',
                body: `${reward.title} - ${reward.description.slice(0, 100)}...`,
                data: {
                  type: 'reward_unlocked',
                  reward_id: reward.id,
                  goal_id,
                  screen: 'rewards'
                },
                sound: true,
                badge: 1
              }),
            });
            console.log(`✅ Sent notification for unlocked reward: ${reward.title}`);
          } catch (notificationError) {
            console.error('Error sending reward notification:', notificationError);
            // Don't fail the whole process for notification errors
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated_rewards: updates.length,
        message: `Updated ${updates.length} rewards` 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error updating rewards:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
