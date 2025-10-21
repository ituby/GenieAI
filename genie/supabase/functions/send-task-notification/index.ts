import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TaskNotificationRequest {
  user_id: string;
  task_id: string;
  task_title: string;
  task_description: string;
  goal_title: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, task_id, task_title, task_description, goal_title }: TaskNotificationRequest = 
      await req.json();

    console.log('📤 Sending task notification:', {
      user_id,
      task_id,
      task_title,
      goal_title
    });

    // Get goal_id from task
    const { data: taskData, error: taskError } = await supabaseClient
      .from('goal_tasks')
      .select('goal_id')
      .eq('id', task_id)
      .single();

    if (taskError) {
      console.error('❌ Error fetching task:', taskError);
      throw taskError;
    }

    // Detect language from task and goal titles
    const isHebrew = /[\u0590-\u05FF]/.test((task_title + goal_title) || '');
    const newTaskMessage = isHebrew ? {
      title: 'הג׳יני הוסיף משימה חדשה',
      body: `חבר, ${task_title} - בוא נעשה את זה ביחד!`,
    } : {
      title: 'Your Genie added a new task',
      body: `Friend, ${task_title} - let's do this together!`,
    };

    // Create notification for in-app display
    const { error: notificationError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id,
        goal_id: taskData.goal_id,
        type: 'task_reminder',
        title: newTaskMessage.title,
        body: newTaskMessage.body,
        data: {
          task_id,
          goal_title,
          type: 'new_task'
        }
      });

    if (notificationError) {
      console.error('❌ Error creating notification:', notificationError);
      throw notificationError;
    }

    // Send push notification
    const pushMessage = isHebrew ? {
      title: 'הג׳יני הוסיף משימה',
      body: `${task_title} - בוא נעשה קסמים!`,
    } : {
      title: 'Your Genie added a task',
      body: `${task_title} - let's make some magic!`,
    };
    
    const pushResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/push-dispatcher`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id,
        title: pushMessage.title,
        body: pushMessage.body,
        data: {
          type: 'task_reminder',
          task_id,
          goal_title,
          screen: 'task-details'
        },
        sound: true,
        badge: 1
      }),
    });

    if (!pushResponse.ok) {
      const errorText = await pushResponse.text();
      console.error('❌ Push notification failed:', errorText);
      // Don't throw here, as the in-app notification was created successfully
    } else {
      console.log('✅ Push notification sent successfully');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Task notification sent successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Task notification error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
