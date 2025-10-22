/**
 * Payment Service
 * 
 * Service for handling Stripe payments via Supabase Edge Functions
 */

import { supabase } from './supabase/supabaseClient';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

export interface CheckoutResponse {
  success: boolean;
  sessionId?: string;
  url?: string;
  error?: string;
  requestId?: string;
}

export interface SubscriptionManagementResponse {
  success: boolean;
  message?: string;
  error?: string;
  requestId?: string;
  subscription?: any;
  cancelDate?: string;
}

export type PaymentType = 'tokens' | 'subscription';
export type SubscriptionAction = 'upgrade' | 'downgrade' | 'reinstate' | 'cancel_immediate' | 'cancel_end_of_period';

class PaymentService {
  /**
   * Create a checkout session for token purchase
   */
  async purchaseTokens(amount: number): Promise<CheckoutResponse> {
    try {
      // Validate amount
      if (amount < 50) {
        return {
          success: false,
          error: 'Minimum purchase is 50 tokens',
        };
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return {
          success: false,
          error: 'User not authenticated',
        };
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          type: 'tokens' as PaymentType,
          amount,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error creating checkout session:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return data;
    } catch (error) {
      console.error('Unexpected error in purchaseTokens:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a checkout session for subscription
   */
  async createSubscription(priceId: string): Promise<CheckoutResponse> {
    try {
      if (!priceId) {
        return {
          success: false,
          error: 'Price ID is required',
        };
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return {
          success: false,
          error: 'User not authenticated',
        };
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          type: 'subscription' as PaymentType,
          priceId,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error creating subscription:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return data;
    } catch (error) {
      console.error('Unexpected error in createSubscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Open Stripe checkout in browser
   */
  async openCheckout(checkoutUrl: string): Promise<void> {
    try {
      // Use deep linking to return to app after payment
      const redirectUrl = Linking.createURL('payment-callback');
      
      // Open browser with checkout URL
      const result = await WebBrowser.openBrowserAsync(checkoutUrl);
      
      console.log('Checkout browser result:', result);
    } catch (error) {
      console.error('Error opening checkout:', error);
      throw error;
    }
  }

  /**
   * Handle payment callback after Stripe redirect
   */
  async handlePaymentCallback(url: string): Promise<{ success: boolean; type?: 'success' | 'cancelled' }> {
    try {
      const { path } = Linking.parse(url);
      
      if (path === 'payment-success') {
        return { success: true, type: 'success' };
      } else if (path === 'payment-cancelled') {
        return { success: false, type: 'cancelled' };
      }
      
      return { success: false };
    } catch (error) {
      console.error('Error handling payment callback:', error);
      return { success: false };
    }
  }

  /**
   * Manage subscription (upgrade, downgrade, cancel, reinstate)
   */
  async manageSubscription(
    action: SubscriptionAction,
    options?: {
      newPriceId?: string;
      proration?: boolean;
    }
  ): Promise<SubscriptionManagementResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return {
          success: false,
          error: 'User not authenticated',
        };
      }

      const { data, error } = await supabase.functions.invoke('manage-subscription-advanced', {
        body: {
          action,
          newPriceId: options?.newPriceId,
          proration: options?.proration ?? true,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error managing subscription:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return data;
    } catch (error) {
      console.error('Unexpected error in manageSubscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get user's payment history
   */
  async getPaymentHistory(limit: number = 10): Promise<any[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching payment history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error in getPaymentHistory:', error);
      return [];
    }
  }

  /**
   * Get user's token balance history
   */
  async getTokenHistory(limit: number = 20): Promise<any[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from('token_balance_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching token history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error in getTokenHistory:', error);
      return [];
    }
  }

  /**
   * Get user's active subscription
   */
  async getActiveSubscription(): Promise<any | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return null;
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No subscription found
          return null;
        }
        console.error('Error fetching subscription:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error in getActiveSubscription:', error);
      return null;
    }
  }

  /**
   * Calculate token purchase price
   */
  calculateTokenPrice(amount: number): number {
    const pricePerToken = 0.05; // $0.05 per token
    return amount * pricePerToken;
  }

  /**
   * Get subscription pricing tiers
   */
  getSubscriptionTiers() {
    return [
      {
        id: 'basic',
        name: 'Basic',
        priceId: 'price_1SL0uz9mCMmqa2BSombHKoR7', // Stripe price ID
        price: 4.99,
        tokens: 500,
        features: [
          '500 tokens per month',
          'Basic AI models',
          'Email support',
        ],
      },
      {
        id: 'standard',
        name: 'Standard',
        priceId: 'price_1SL0vF9mCMmqa2BSSDnNUCym', // Stripe price ID
        price: 9.99,
        tokens: 1000,
        features: [
          '1,000 tokens per month',
          'Advanced AI models',
          'Priority support',
          'Early access to features',
        ],
        popular: true,
      },
      {
        id: 'premium',
        name: 'Premium',
        priceId: 'price_1SL0vU9mCMmqa2BSBedO3lAr', // Stripe price ID
        price: 19.99,
        tokens: 2500,
        features: [
          '2,500 tokens per month',
          'Premium AI models',
          'Priority support',
          'Custom integrations',
          'Analytics dashboard',
        ],
      },
    ];
  }
}

export const paymentService = new PaymentService();

