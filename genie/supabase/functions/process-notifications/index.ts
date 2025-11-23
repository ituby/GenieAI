import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduledNotification {
  id: string;
  user_id: string;
  task_id?: string;
  goal_id?: string;
  type: 'task_reminder' | 'goal_milestone' | 'daily_summary' | 'motivation' | 'milestone_reward' | 'completion_reward';
  title: string;
  body: string;
  scheduled_for: string;
  sent: boolean;
  sent_at?: string;
  created_at: string;
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

    console.log('🔄 Processing scheduled notifications...');

    // Get all notifications that are due and not yet sent
    const now = new Date().toISOString();
    const { data: scheduledNotifications, error: fetchError } = await supabaseClient
      .from('scheduled_notifications')
      .select('*')
      .eq('sent', false)
      .lte('scheduled_for', now)
      .order('scheduled_for', { ascending: true })
      .limit(50); // Process max 50 notifications at a time

    if (fetchError) {
      console.error('❌ Error fetching scheduled notifications:', fetchError);
      throw fetchError;
    }

    if (!scheduledNotifications || scheduledNotifications.length === 0) {
      console.log('✅ No notifications to process');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No notifications to process',
          processed: 0
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`📋 Found ${scheduledNotifications.length} notifications to process`);

    // Process each notification
    const results = await Promise.allSettled(
      scheduledNotifications.map(async (notification: ScheduledNotification) => {
        try {
          console.log(`📤 Processing notification: ${notification.title} for user ${notification.user_id}`);

          // Check if user has tokens and if notifications are muted
          const { data: tokenData, error: tokenError } = await supabaseClient
            .from('user_tokens')
            .select('tokens_remaining, tokens_used, is_subscribed, notifications_muted')
            .eq('user_id', notification.user_id)
            .single();

          if (tokenError) {
            console.error(`❌ Error checking tokens for user ${notification.user_id}:`, tokenError);
            throw new Error('Failed to check token balance');
          }

          // Check if notifications are muted for non-subscribed users
          if (!tokenData?.is_subscribed && tokenData?.notifications_muted) {
            console.warn(`🔇 User ${notification.user_id} has notifications muted (non-subscribed), skipping notification`);
            // Delete the notification since it won't be sent
            await supabaseClient
              .from('scheduled_notifications')
              .delete()
              .eq('id', notification.id);
            throw new Error('Notifications muted for non-subscribed user');
          }

          if (!tokenData || tokenData.tokens_remaining < 1) {
            console.warn(`⚠️ User ${notification.user_id} has insufficient tokens (${tokenData?.tokens_remaining || 0}), skipping notification`);
            // Don't send notification, but also don't delete it - it will be retried when user has tokens
            throw new Error('Insufficient tokens for notification');
          }

          // Store original token values for potential refund
          const originalTokensRemaining = tokenData.tokens_remaining;
          const originalTokensUsed = tokenData.tokens_used || 0;

          // Deduct 1 token for sending this notification
          const { error: deductError } = await supabaseClient
            .from('user_tokens')
            .update({
              tokens_remaining: tokenData.tokens_remaining - 1,
              tokens_used: originalTokensUsed + 1,
              last_used_at: new Date().toISOString(),
            })
            .eq('user_id', notification.user_id);

          if (deductError) {
            console.error(`❌ Error deducting token for user ${notification.user_id}:`, deductError);
            throw new Error('Failed to deduct token');
          }

          console.log(`💳 Deducted 1 token for notification, remaining: ${tokenData.tokens_remaining - 1}`);

          // Send push notification via push-dispatcher
          const pushResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/push-dispatcher`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: notification.user_id,
              title: notification.title,
              body: notification.body,
              data: {
                type: notification.type,
                task_id: notification.task_id,
                notification_id: notification.id,
                screen: notification.type === 'task_reminder' ? 'task-details' : 'dashboard'
              },
              sound: true,
              badge: 1
            }),
          });

          if (!pushResponse.ok) {
            const errorText = await pushResponse.text();
            console.error(`❌ Push notification failed for ${notification.id}:`, errorText);
            
            // Refund the token since notification failed
            await supabaseClient
              .from('user_tokens')
              .update({
                tokens_remaining: originalTokensRemaining,
                tokens_used: originalTokensUsed,
              })
              .eq('user_id', notification.user_id);
            
            console.log(`💳 Refunded 1 token due to notification failure`);
            throw new Error(`Push notification failed: ${pushResponse.status} - ${errorText}`);
          }

          const pushResult = await pushResponse.json();
          console.log(`✅ Push notification sent successfully for ${notification.id}`);

          // Delete notification after sending (to prevent duplicates)
          const { error: deleteError } = await supabaseClient
            .from('scheduled_notifications')
            .delete()
            .eq('id', notification.id);

          if (deleteError) {
            console.error(`❌ Error deleting notification ${notification.id}:`, deleteError);
            throw deleteError;
          }
          
          console.log(`🗑️ Notification ${notification.id} deleted after successful send`);

          // Create notification record in notifications table for in-app display
          const { error: insertError } = await supabaseClient
            .from('notifications')
            .insert({
              user_id: notification.user_id,
              goal_id: notification.goal_id,
              type: notification.type,
              title: notification.title,
              body: notification.body,
              data: {
                task_id: notification.task_id,
                scheduled_notification_id: notification.id
              }
            });

          if (insertError) {
            console.error(`❌ Error creating notification record for ${notification.id}:`, insertError);
            // Don't throw here, as the push notification was sent successfully
          }

          return {
            id: notification.id,
            success: true,
            pushResult
          };

        } catch (error) {
          console.error(`❌ Error processing notification ${notification.id}:`, error);
          return {
            id: notification.id,
            success: false,
            error: error.message
          };
        }
      })
    );

    // Process results
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));
    
    // Count token-related failures
    const tokenFailures = failed.filter(f => {
      if (f.status === 'rejected' && f.reason?.message?.includes('Insufficient tokens')) {
        return true;
      }
      if (f.status === 'fulfilled' && f.value.error?.includes('Insufficient tokens')) {
        return true;
      }
      return false;
    }).length;

    console.log(`📊 Notification processing results: ${successful.length} successful, ${failed.length} failed (${tokenFailures} due to insufficient tokens)`);

    // Log failed notifications
    if (failed.length > 0) {
      console.warn('⚠️ Failed notifications:', failed.map(f => {
        if (f.status === 'fulfilled') {
          return f.value.id;
        }
        return 'unknown';
      }));
    }
    
    if (tokenFailures > 0) {
      console.warn(`💳 ${tokenFailures} notification(s) skipped due to insufficient tokens. They will be retried when user has tokens.`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${scheduledNotifications.length} notifications: ${successful.length} successful, ${failed.length} failed${tokenFailures > 0 ? ` (${tokenFailures} skipped - no tokens)` : ''}`,
        results: {
          total: scheduledNotifications.length,
          successful: successful.length,
          failed: failed.length,
          token_failures: tokenFailures,
          details: results.map(r => {
            if (r.status === 'fulfilled') {
              return {
                id: r.value.id,
                success: r.value.success,
                error: r.value.error || null
              };
            }
            return {
              id: 'unknown',
              success: false,
              error: 'Promise rejected'
            };
          })
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Notification processor error:', error);
    
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
