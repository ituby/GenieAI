import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubscriptionRequest {
  action: 'upgrade' | 'downgrade' | 'reinstate' | 'cancel_immediate' | 'cancel_end_of_period';
  newPriceId?: string; // For upgrade/downgrade
  subscriptionId?: string; // For reinstate
  proration?: boolean; // Whether to prorate charges
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`🔧 [${requestId}] Advanced subscription management request`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
      throw new Error('Missing configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Get user from auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, newPriceId, subscriptionId, proration = true }: SubscriptionRequest = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Action is required', requestId }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 [${requestId}] Action: ${action} for user ${user.id}`);

    // ====================================================================
    // ACTION: UPGRADE OR DOWNGRADE SUBSCRIPTION
    // ====================================================================
    if (action === 'upgrade' || action === 'downgrade') {
      if (!newPriceId) {
        return new Response(
          JSON.stringify({ success: false, error: 'New price ID is required for upgrade/downgrade', requestId }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user's current subscription
      const { data: currentSubscription } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id, stripe_price_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (!currentSubscription) {
        return new Response(
          JSON.stringify({ success: false, error: 'No active subscription found', requestId }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get the subscription from Stripe
      const subscription = await stripe.subscriptions.retrieve(currentSubscription.stripe_subscription_id);

      // Update the subscription with new price
      const updatedSubscription = await stripe.subscriptions.update(
        subscription.id,
        {
          items: [{
            id: subscription.items.data[0].id,
            price: newPriceId,
          }],
          proration_behavior: proration ? 'create_prorations' : 'none',
        }
      );

      // Calculate new monthly tokens based on price
      const tokenMapping: Record<string, number> = {
        'price_1SL0uz9mCMmqa2BSombHKoR7': 500,   // Basic ($4.99)
        'price_1SL0vF9mCMmqa2BSSDnNUCym': 1000,  // Standard Old ($9.99)
        'price_1SLUWE9mCMmqa2BSeNa94ig7': 1000,  // Standard New ($15.00)
        'price_1SL0vU9mCMmqa2BSBedO3lAr': 2500,  // Premium ($19.99)
      };

      const newMonthlyTokens = tokenMapping[newPriceId] || 1000;

      // Update subscription in database
      await supabase
        .from('subscriptions')
        .update({
          stripe_price_id: newPriceId,
          monthly_tokens: newMonthlyTokens,
        })
        .eq('stripe_subscription_id', subscription.id);

      // Update user tokens
      await supabase
        .from('user_tokens')
        .update({
          monthly_tokens: newMonthlyTokens,
        })
        .eq('user_id', user.id);

      console.log(`✅ [${requestId}] Subscription ${action}d successfully`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Subscription ${action}d successfully`,
          subscription: {
            id: updatedSubscription.id,
            priceId: newPriceId,
            monthlyTokens: newMonthlyTokens,
            prorationApplied: proration,
          },
          requestId
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ====================================================================
    // ACTION: REINSTATE CANCELED SUBSCRIPTION
    // ====================================================================
    if (action === 'reinstate') {
      // Get user's subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id, stripe_price_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!subscription) {
        return new Response(
          JSON.stringify({ success: false, error: 'No subscription found to reinstate', requestId }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get the subscription from Stripe
      const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);

      // Check if subscription is scheduled to cancel
      if (!stripeSubscription.cancel_at_period_end) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Subscription is not scheduled for cancellation', 
            requestId 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Remove cancellation
      const updatedSubscription = await stripe.subscriptions.update(
        stripeSubscription.id,
        {
          cancel_at_period_end: false,
        }
      );

      // Update database
      await supabase.rpc('reinstate_subscription', {
        p_user_id: user.id,
        p_stripe_subscription_id: subscription.stripe_subscription_id,
      });

      console.log(`✅ [${requestId}] Subscription reinstated successfully`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Subscription reinstated successfully',
          subscription: {
            id: updatedSubscription.id,
            currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
          },
          requestId
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ====================================================================
    // ACTION: CANCEL IMMEDIATELY
    // ====================================================================
    if (action === 'cancel_immediate') {
      // Get user's current subscription
      const { data: currentSubscription } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (!currentSubscription) {
        return new Response(
          JSON.stringify({ success: false, error: 'No active subscription found', requestId }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Cancel immediately in Stripe
      await stripe.subscriptions.cancel(currentSubscription.stripe_subscription_id);

      // Update database
      await supabase.rpc('cancel_subscription', {
        p_user_id: user.id,
        p_immediate: true,
      });

      console.log(`✅ [${requestId}] Subscription canceled immediately`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Subscription canceled immediately',
          requestId
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ====================================================================
    // ACTION: CANCEL AT END OF PERIOD
    // ====================================================================
    if (action === 'cancel_end_of_period') {
      // Get user's current subscription
      const { data: currentSubscription } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (!currentSubscription) {
        return new Response(
          JSON.stringify({ success: false, error: 'No active subscription found', requestId }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Cancel at end of period in Stripe
      const updatedSubscription = await stripe.subscriptions.update(
        currentSubscription.stripe_subscription_id,
        {
          cancel_at_period_end: true,
        }
      );

      // Update database
      await supabase
        .from('subscriptions')
        .update({
          cancel_at_period_end: true,
        })
        .eq('stripe_subscription_id', currentSubscription.stripe_subscription_id);

      console.log(`✅ [${requestId}] Subscription set to cancel at end of period`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Subscription will be canceled at the end of the billing period',
          cancelDate: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
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
    console.error(`❌ [${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error', 
        requestId 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

