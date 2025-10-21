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

    // Get all existing tokens for this user
    const { data: existingTokens, error: checkError } = await supabaseClient
      .from('push_tokens')
      .select('id, expo_token, platform, created_at')
      .eq('user_id', user_id)
      .order('created_at', { ascending: true }); // Oldest first

    if (checkError) {
      throw checkError;
    }

    // Check if this exact token already exists (same token)
    const existingToken = existingTokens?.find(token => 
      token.expo_token === expo_token
    );
    
    if (existingToken) {
      console.log('ℹ️ Token already exists', isDevToken ? '(dev token)' : '');
      
      // Update last_used_at to keep it active
      const { error: updateError } = await supabaseClient
        .from('push_tokens')
        .update({
          last_used_at: new Date().toISOString(),
          is_active: true
        })
        .eq('id', existingToken.id);

      if (updateError) console.warn('⚠️ Failed to update token timestamp:', updateError);
      
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

    // Allow multiple tokens per user (up to 5 devices: simulator + 2 iOS + 2 Android)
    // If limit is reached, delete the oldest inactive token, or the oldest token if all active

    // Check if user has reached the limit of 5 tokens
    if (existingTokens && existingTokens.length >= 5) {
      console.log(`🗑️ User has ${existingTokens.length} tokens (limit: 5). Deleting oldest token...`);
      
      // Try to find an inactive token first
      const inactiveToken = existingTokens.find(token => !token.is_active);
      const tokenToDelete = inactiveToken || existingTokens[0]; // Delete oldest if no inactive found
      
      const { error: deleteError } = await supabaseClient
        .from('push_tokens')
        .delete()
        .eq('id', tokenToDelete.id);

      if (deleteError) throw deleteError;
      
      console.log('🗑️ Deleted token:', tokenToDelete.expo_token.substring(0, 30) + '...');
    }

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

  } catch (error: any) {
    console.error('❌ Error saving push token:', error);
    console.error('Error message:', error?.message);
    console.error('Error code:', error?.code);
    console.error('Error details:', JSON.stringify(error));
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to save push token',
        error_code: error?.code,
        error_details: error?.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
