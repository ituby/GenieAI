import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationRequest {
  user_id: string;
  title: string;
  body: string;
  data?: any;
  sound?: boolean;
  badge?: number;
}

interface PushToken {
  id: string;
  user_id: string;
  expo_token: string;
  platform: 'ios' | 'android';
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

    const { user_id, title, body, data, sound = true, badge }: PushNotificationRequest = 
      await req.json();

    console.log('📤 Push notification request:', {
      user_id,
      title,
      body,
      data
    });

    // Get user's push tokens
    const { data: pushTokens, error: tokensError } = await supabaseClient
      .from('push_tokens')
      .select('*')
      .eq('user_id', user_id);

    if (tokensError) {
      console.error('❌ Error fetching push tokens:', tokensError);
      throw tokensError;
    }

    if (!pushTokens || pushTokens.length === 0) {
      console.warn('⚠️ No push tokens found for user:', user_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No push tokens found for user' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check user's notification preferences (optional - only if table exists)
    // Note: user_settings table is optional. If it doesn't exist or user hasn't set preferences,
    // we default to sending notifications
    try {
      const { data: userSettings, error: settingsError } = await supabaseClient
        .from('user_settings')
        .select('notifications_enabled, push_notifications')
        .eq('user_id', user_id)
        .single();

      // Only block if user explicitly disabled notifications
      if (!settingsError && userSettings && 
          (userSettings.notifications_enabled === false || userSettings.push_notifications === false)) {
        console.warn('⚠️ User has disabled push notifications:', user_id);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'User has disabled push notifications' 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    } catch (error) {
      // If user_settings table doesn't exist or there's an error, continue with sending
      console.log('⚠️ Could not check user settings, continuing with notification send:', error.message);
    }

    // Send push notifications to all user's devices
    const results = await Promise.allSettled(
      pushTokens.map(async (token: PushToken) => {
        try {
          const message = {
            to: token.expo_token,
            sound: sound ? 'default' : undefined,
            title,
            body,
            data: data || {},
            badge: badge || undefined,
            priority: 'high',
            channelId: 'default',
          };

          console.log('📱 Sending to token:', token.expo_token.substring(0, 20) + '...');

          const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Accept-encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Expo push error for token ${token.expo_token.substring(0, 20)}...:`, response.status, errorText);
            throw new Error(`Expo push error: ${response.status} - ${errorText}`);
          }

          const result = await response.json();
          console.log('✅ Push sent successfully to token:', token.expo_token.substring(0, 20) + '...');
          
          return {
            token: token.expo_token,
            platform: token.platform,
            success: true,
            result
          };
        } catch (error) {
          console.error('❌ Error sending push to token:', token.expo_token.substring(0, 20) + '...', error);
          return {
            token: token.expo_token,
            platform: token.platform,
            success: false,
            error: error.message
          };
        }
      })
    );

    // Process results
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));

    console.log(`📊 Push notification results: ${successful.length} successful, ${failed.length} failed`);

    // Log failed tokens for cleanup
    if (failed.length > 0) {
      console.warn('⚠️ Failed push tokens:', failed.map(f => {
        if (f.status === 'fulfilled') {
          return f.value.token.substring(0, 20) + '...';
        }
        return 'unknown';
      }));
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Push notifications sent: ${successful.length} successful, ${failed.length} failed`,
        results: {
          successful: successful.length,
          failed: failed.length,
          details: results.map(r => {
            if (r.status === 'fulfilled') {
              return {
                token: r.value.token.substring(0, 20) + '...',
                platform: r.value.platform,
                success: r.value.success,
                error: r.value.error || null
              };
            }
            return {
              token: 'unknown',
              platform: 'unknown',
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
    console.error('❌ Push dispatcher error:', error);
    
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
