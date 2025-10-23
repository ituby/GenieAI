/**
 * Payment Utilities
 * 
 * Helper functions for handling payment success/error states
 */

import { supabase } from '../services/supabase/client';

export interface PaymentResult {
  success: boolean;
  message: string;
  type: 'token_purchase' | 'subscription' | 'error';
  amount?: number;
}

/**
 * Check for recent payment status and return appropriate message
 */
export const checkRecentPaymentStatus = async (userId: string): Promise<PaymentResult | null> => {
  try {
    // Check for recent payments (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: recentPayments, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error checking payment status:', error);
      return null;
    }

    if (recentPayments && recentPayments.length > 0) {
      const payment = recentPayments[0];
      
      switch (payment.status) {
        case 'succeeded':
          if (payment.payment_type === 'token_purchase') {
            return {
              success: true,
              message: `Successfully added ${payment.tokens_amount} tokens to your account!`,
              type: 'token_purchase',
              amount: payment.tokens_amount,
            };
          } else {
            return {
              success: true,
              message: 'Subscription activated successfully!',
              type: 'subscription',
            };
          }
          
        case 'failed':
          return {
            success: false,
            message: payment.failure_message || 'Payment failed. Please try again.',
            type: 'error',
          };
          
        case 'pending':
          return {
            success: false,
            message: 'Payment is being processed. You will be notified when complete.',
            type: 'error',
          };
          
        default:
          return null;
      }
    }

    return null;
  } catch (error) {
    console.error('Error in checkRecentPaymentStatus:', error);
    return null;
  }
};

/**
 * Check for recent subscription changes
 */
export const checkRecentSubscriptionStatus = async (userId: string): Promise<PaymentResult | null> => {
  try {
    // Check for recent subscription changes (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: recentSubscriptions, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error checking subscription status:', error);
      return null;
    }

    if (recentSubscriptions && recentSubscriptions.length > 0) {
      const subscription = recentSubscriptions[0];
      
      if (subscription.status === 'active') {
        return {
          success: true,
          message: `Welcome to Genie Premium! You now receive ${subscription.monthly_tokens} tokens every month.`,
          type: 'subscription',
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error in checkRecentSubscriptionStatus:', error);
    return null;
  }
};
