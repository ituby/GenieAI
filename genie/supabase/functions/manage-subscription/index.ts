import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ManageSubscriptionRequest {
  action: 'subscribe' | 'cancel';
  monthlyTokens?: number;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`📋 [${requestId}] Subscription request started`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header to verify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized', requestId }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized', requestId }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, monthlyTokens }: ManageSubscriptionRequest = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Action is required', requestId }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // ACTION: SUBSCRIBE
    // ============================================
    if (action === 'subscribe') {
      console.log(`💳 [${requestId}] Activating subscription for user: ${user.id}`);
      const tokensToAdd = monthlyTokens || 1000;  // Default: 1000 tokens for subscribers

      const { error: subscribeError } = await supabase.rpc('subscribe_user', {
        p_user_id: user.id,
        p_monthly_tokens: tokensToAdd,
      });

      if (subscribeError) {
        console.error(`❌ [${requestId}] Subscribe error:`, subscribeError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to activate subscription', requestId }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`✅ [${requestId}] Subscription activated with ${tokensToAdd} monthly tokens`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Subscription activated successfully',
          monthlyTokens: tokensToAdd,
          requestId
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // ACTION: CANCEL
    // ============================================
    if (action === 'cancel') {
      console.log(`🚫 [${requestId}] Cancelling subscription for user: ${user.id}`);

      const { error: cancelError } = await supabase.rpc('cancel_subscription', {
        p_user_id: user.id,
      });

      if (cancelError) {
        console.error(`❌ [${requestId}] Cancel error:`, cancelError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to cancel subscription', requestId }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`✅ [${requestId}] Subscription cancelled`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Subscription cancelled successfully',
          requestId
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Invalid action
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action', requestId }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`❌ [${requestId}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error', requestId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

