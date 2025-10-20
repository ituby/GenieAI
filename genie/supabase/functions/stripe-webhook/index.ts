import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.21.0';

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`🎣 [${requestId}] Webhook received`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey || !webhookSecret) {
      throw new Error('Missing configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response('No signature', { status: 400 });
    }

    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );

    console.log(`📨 [${requestId}] Event type: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const userId = session.metadata?.user_id;
        const type = session.metadata?.type;

        if (!userId) {
          console.error('No user_id in metadata');
          break;
        }

        if (type === 'tokens') {
          // Token purchase
          const tokensAmount = parseInt(session.metadata?.tokens_amount || '0');
          if (tokensAmount > 0) {
            console.log(`💰 Adding ${tokensAmount} tokens to user ${userId}`);
            
            const { data: currentTokens } = await supabase
              .from('user_tokens')
              .select('tokens_remaining, tokens_used')
              .eq('user_id', userId)
              .single();

            if (currentTokens) {
              await supabase
                .from('user_tokens')
                .update({
                  tokens_remaining: currentTokens.tokens_remaining + tokensAmount,
                  updated_at: new Date().toISOString(),
                })
                .eq('user_id', userId);

              console.log(`✅ Added ${tokensAmount} tokens to user ${userId}`);
            }
          }
        } else if (type === 'subscription') {
          // Subscription activation
          console.log(`📋 Activating subscription for user ${userId}`);
          
          await supabase.rpc('subscribe_user', {
            p_user_id: userId,
            p_monthly_tokens: 1000,
          });

          console.log(`✅ Subscription activated for user ${userId}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        // Subscription cancelled
        const subscription = event.data.object as any;
        const userId = subscription.metadata?.user_id;

        if (userId) {
          console.log(`🚫 Cancelling subscription for user ${userId}`);
          
          await supabase.rpc('cancel_subscription', {
            p_user_id: userId,
          });

          console.log(`✅ Subscription cancelled for user ${userId}`);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`❌ [${requestId}] Webhook error:`, error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

