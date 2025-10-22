import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.21.0';

// Helper function to send payment failure notification
async function sendPaymentFailureNotification(
  supabase: any,
  userId: string,
  paymentId: string,
  failureMessage: string
) {
  try {
    // Get user's email and push tokens
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const { data: pushTokens } = await supabase
      .from('push_tokens')
      .select('expo_token')
      .eq('user_id', userId);

    console.log(`📧 Sending failure notification to user ${userId}`);

    // Send push notification if user has tokens
    if (pushTokens && pushTokens.length > 0) {
      await supabase.functions.invoke('push-dispatcher', {
        body: {
          user_id: userId,
          title: '❌ Payment Failed',
          body: `Your payment could not be processed. ${failureMessage}`,
          data: { type: 'payment_failed', payment_id: paymentId },
        },
      });
    }

    // Record notification in database
    await supabase.from('payment_notifications').insert({
      payment_id: paymentId,
      user_id: userId,
      notification_type: 'payment_failed',
      channel: pushTokens && pushTokens.length > 0 ? 'push' : 'email',
      status: 'sent',
    });

    console.log(`✅ Payment failure notification sent`);
  } catch (error) {
    console.error(`❌ Error sending payment failure notification:`, error);
  }
}

// Helper function to get or create Stripe customer
async function getOrCreateStripeCustomer(
  supabase: any,
  stripe: any,
  userId: string,
  email: string
): Promise<string> {
  // Check if customer exists in our database
  const { data: existingCustomer } = await supabase
    .from('stripe_customers')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single();

  if (existingCustomer) {
    return existingCustomer.stripe_customer_id;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: { user_id: userId },
  });

  // Save to database
  await supabase.from('stripe_customers').insert({
    user_id: userId,
    stripe_customer_id: customer.id,
    email,
  });

  return customer.id;
}

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
      // ====================================================================
      // CHECKOUT SESSION COMPLETED
      // ====================================================================
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const userId = session.metadata?.user_id;
        const type = session.metadata?.type;

        if (!userId) {
          console.error('No user_id in metadata');
          break;
        }

        // Get or create Stripe customer
        const customerId = await getOrCreateStripeCustomer(
          supabase,
          stripe,
          userId,
          session.customer_email
        );

        if (type === 'tokens') {
          // Token purchase
          const tokensAmount = parseInt(session.metadata?.tokens_amount || '0');
          const amountCents = session.amount_total || 0;

          if (tokensAmount > 0) {
            console.log(`💰 Adding ${tokensAmount} tokens to user ${userId}`);

            // Use the new function to add tokens with history
            const { error: addTokensError } = await supabase.rpc('add_tokens_to_user', {
              p_user_id: userId,
              p_tokens: tokensAmount,
              p_change_type: 'purchase',
              p_description: `Purchased ${tokensAmount} tokens for $${(amountCents / 100).toFixed(2)}`,
            });

            if (addTokensError) {
              console.error('Error adding tokens:', addTokensError);
            }

            // Record payment
            await supabase.from('payments').insert({
              user_id: userId,
              stripe_payment_intent_id: session.payment_intent,
              amount_cents: amountCents,
              currency: session.currency || 'usd',
              status: 'succeeded',
              payment_type: 'token_purchase',
              tokens_amount: tokensAmount,
              metadata: { session_id: session.id },
            });

            console.log(`✅ Added ${tokensAmount} tokens to user ${userId}`);
          }
        } else if (type === 'subscription') {
          // Subscription activation
          console.log(`📋 Activating subscription for user ${userId}`);

          const subscriptionId = session.subscription;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);

          await supabase.rpc('subscribe_user', {
            p_user_id: userId,
            p_monthly_tokens: 1000,
            p_stripe_subscription_id: subscription.id,
            p_stripe_customer_id: customerId,
            p_stripe_price_id: subscription.items.data[0].price.id,
          });

          // Record payment
          await supabase.from('payments').insert({
            user_id: userId,
            stripe_payment_intent_id: session.payment_intent,
            amount_cents: session.amount_total || 0,
            currency: session.currency || 'usd',
            status: 'succeeded',
            payment_type: 'subscription',
            metadata: { 
              session_id: session.id,
              subscription_id: subscription.id,
            },
          });

          console.log(`✅ Subscription activated for user ${userId}`);
        }
        break;
      }

      // ====================================================================
      // PAYMENT INTENT SUCCEEDED
      // ====================================================================
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as any;
        console.log(`✅ [${requestId}] Payment succeeded: ${paymentIntent.id}`);

        // Update payment record if exists
        await supabase
          .from('payments')
          .update({ status: 'succeeded' })
          .eq('stripe_payment_intent_id', paymentIntent.id);
        break;
      }

      // ====================================================================
      // PAYMENT INTENT FAILED
      // ====================================================================
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as any;
        const userId = paymentIntent.metadata?.user_id;

        console.log(`❌ [${requestId}] Payment failed: ${paymentIntent.id}`);

        const failureMessage = paymentIntent.last_payment_error?.message || 'Unknown error';

        // Create or update payment record
        const { data: payment } = await supabase
          .from('payments')
          .upsert({
            user_id: userId,
            stripe_payment_intent_id: paymentIntent.id,
            amount_cents: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: 'failed',
            payment_type: paymentIntent.metadata?.type || 'token_purchase',
            failure_code: paymentIntent.last_payment_error?.code,
            failure_message: failureMessage,
            metadata: paymentIntent.metadata,
          })
          .select()
          .single();

        // Send notification to user
        if (userId && payment) {
          await sendPaymentFailureNotification(
            supabase,
            userId,
            payment.id,
            failureMessage
          );
        }
        break;
      }

      // ====================================================================
      // INVOICE PAYMENT SUCCEEDED
      // ====================================================================
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const userId = subscription.metadata?.user_id;

        if (userId) {
          console.log(`💰 [${requestId}] Subscription payment succeeded for user ${userId}`);

          // Grant monthly tokens
          await supabase.rpc('add_tokens_to_user', {
            p_user_id: userId,
            p_tokens: 1000,
            p_change_type: 'subscription_renewal',
            p_description: 'Monthly subscription renewal',
          });

          // Record payment
          await supabase.from('payments').insert({
            user_id: userId,
            stripe_invoice_id: invoice.id,
            stripe_payment_intent_id: invoice.payment_intent,
            amount_cents: invoice.amount_paid,
            currency: invoice.currency,
            status: 'succeeded',
            payment_type: 'subscription',
            metadata: { 
              subscription_id: subscription.id,
              period_start: new Date(invoice.period_start * 1000).toISOString(),
              period_end: new Date(invoice.period_end * 1000).toISOString(),
            },
          });

          console.log(`✅ Monthly tokens granted to user ${userId}`);
        }
        break;
      }

      // ====================================================================
      // INVOICE PAYMENT FAILED
      // ====================================================================
      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const userId = subscription.metadata?.user_id;

        if (userId) {
          console.log(`❌ [${requestId}] Subscription payment failed for user ${userId}`);

          const failureMessage = 'Your subscription payment failed. Please update your payment method.';

          // Record failed payment
          const { data: payment } = await supabase
            .from('payments')
            .insert({
              user_id: userId,
              stripe_invoice_id: invoice.id,
              stripe_payment_intent_id: invoice.payment_intent,
              amount_cents: invoice.amount_due,
              currency: invoice.currency,
              status: 'failed',
              payment_type: 'subscription',
              failure_message: failureMessage,
              metadata: { subscription_id: subscription.id },
            })
            .select()
            .single();

          // Send notification
          if (payment) {
            await sendPaymentFailureNotification(
              supabase,
              userId,
              payment.id,
              failureMessage
            );
          }
        }
        break;
      }

      // ====================================================================
      // SUBSCRIPTION CREATED
      // ====================================================================
      case 'customer.subscription.created': {
        const subscription = event.data.object as any;
        const userId = subscription.metadata?.user_id;

        if (userId) {
          console.log(`🆕 [${requestId}] Subscription created for user ${userId}`);

          await supabase.from('subscriptions').insert({
            user_id: userId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer,
            stripe_price_id: subscription.items.data[0].price.id,
            status: subscription.status,
            monthly_tokens: 1000,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          });
        }
        break;
      }

      // ====================================================================
      // SUBSCRIPTION UPDATED
      // ====================================================================
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const userId = subscription.metadata?.user_id;

        if (userId) {
          console.log(`🔄 [${requestId}] Subscription updated for user ${userId}`);

          await supabase
            .from('subscriptions')
            .update({
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
            })
            .eq('stripe_subscription_id', subscription.id);

          // If subscription was reactivated
          if (subscription.status === 'active' && subscription.cancel_at_period_end === false) {
            await supabase.rpc('reinstate_subscription', {
              p_user_id: userId,
              p_stripe_subscription_id: subscription.id,
            });
          }
        }
        break;
      }

      // ====================================================================
      // SUBSCRIPTION DELETED/CANCELED
      // ====================================================================
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const userId = subscription.metadata?.user_id;

        if (userId) {
          console.log(`🚫 [${requestId}] Subscription cancelled for user ${userId}`);

          await supabase.rpc('cancel_subscription', {
            p_user_id: userId,
            p_immediate: true,
          });

          console.log(`✅ Subscription cancelled for user ${userId}`);
        }
        break;
      }

      // ====================================================================
      // CHARGE REFUNDED
      // ====================================================================
      case 'charge.refunded': {
        const charge = event.data.object as any;
        const paymentIntent = charge.payment_intent;

        console.log(`💸 [${requestId}] Charge refunded: ${charge.id}`);

        // Find the payment and user
        const { data: payment } = await supabase
          .from('payments')
          .select('user_id, tokens_amount')
          .eq('stripe_payment_intent_id', paymentIntent)
          .single();

        if (payment) {
          // Update payment status
          await supabase
            .from('payments')
            .update({ status: 'refunded' })
            .eq('stripe_payment_intent_id', paymentIntent);

          // Deduct tokens if it was a token purchase
          if (payment.tokens_amount) {
            await supabase.rpc('deduct_tokens_from_user', {
              p_user_id: payment.user_id,
              p_tokens: payment.tokens_amount,
              p_change_type: 'refund',
              p_description: `Refund for charge ${charge.id}`,
            });
          }
        }
        break;
      }

      default:
        console.log(`ℹ️ [${requestId}] Unhandled event type: ${event.type}`);
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

