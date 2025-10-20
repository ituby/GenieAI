import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckoutRequest {
  type: 'tokens' | 'subscription';
  amount?: number;  // For tokens: number of tokens
  priceId?: string; // For subscription: Stripe price ID
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`💳 [${requestId}] Checkout request started`);

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

    const { type, amount, priceId }: CheckoutRequest = await req.json();

    if (!type) {
      return new Response(
        JSON.stringify({ success: false, error: 'Type is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sessionParams: any = {
      customer_email: user.email,
      mode: type === 'subscription' ? 'subscription' : 'payment',
      success_url: 'genie://payment-success',
      cancel_url: 'genie://payment-cancelled',
      metadata: {
        user_id: user.id,
        type: type,
      },
    };

    if (type === 'tokens') {
      // Token purchase
      if (!amount || amount < 50) {
        return new Response(
          JSON.stringify({ success: false, error: 'Minimum 50 tokens required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const pricePerToken = 0.05; // $0.05 per token
      const totalPrice = Math.round(amount * pricePerToken * 100); // in cents

      sessionParams.line_items = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${amount} Genie Tokens`,
            description: `${amount} tokens for creating goals and tasks`,
          },
          unit_amount: totalPrice,
        },
        quantity: 1,
      }];
      sessionParams.metadata.tokens_amount = amount.toString();
    } else {
      // Subscription
      if (!priceId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Price ID required for subscription' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      sessionParams.line_items = [{
        price: priceId,
        quantity: 1,
      }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(`✅ [${requestId}] Checkout session created: ${session.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: session.id,
        url: session.url,
        requestId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`❌ [${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error', requestId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

