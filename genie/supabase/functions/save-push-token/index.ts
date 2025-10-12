import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SavePushTokenRequest {
  user_id: string;
  expo_token: string;
  platform: 'ios' | 'android';
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

    const { user_id, expo_token, platform }: SavePushTokenRequest = await req.json();

    if (!user_id || !expo_token || !platform) {
      return new Response(
        JSON.stringify({ error: 'user_id, expo_token, and platform are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate platform
    if (!['ios', 'android'].includes(platform)) {
      return new Response(
        JSON.stringify({ error: 'platform must be ios or android' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if this is a development/simulator token
    const isDevToken = expo_token.includes('simulator-dev-token') || 
                      expo_token.includes('dev-token-no-project-id') || 
                      expo_token.includes('fallback-dev-token');

    console.log('💾 Saving push token:', { 
      user_id, 
      platform, 
      token_length: expo_token.length,
      is_dev_token: isDevToken 
    });

    // Check if token already exists for this user
    const { data: existingToken, error: checkError } = await supabaseClient
      .from('push_tokens')
      .select('id, expo_token')
      .eq('user_id', user_id)
      .eq('platform', platform)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingToken) {
      // Update existing token if it's different
      if (existingToken.expo_token !== expo_token) {
        const { error: updateError } = await supabaseClient
          .from('push_tokens')
          .update({ 
            expo_token,
            created_at: new Date().toISOString()
          })
          .eq('id', existingToken.id);

        if (updateError) throw updateError;

        console.log('✅ Updated existing push token', isDevToken ? '(dev token)' : '');
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Push token updated successfully',
            action: 'updated',
            is_dev_token: isDevToken
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } else {
        console.log('ℹ️ Token already exists and is the same', isDevToken ? '(dev token)' : '');
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Push token already exists',
            action: 'exists',
            is_dev_token: isDevToken
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    } else {
      // Insert new token
      const { error: insertError } = await supabaseClient
        .from('push_tokens')
        .insert({
          user_id,
          expo_token,
          platform
        });

      if (insertError) throw insertError;

      console.log('✅ Created new push token', isDevToken ? '(dev token)' : '');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Push token saved successfully',
          action: 'created',
          is_dev_token: isDevToken
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error: any) {
    console.error('❌ Error saving push token:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to save push token' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
