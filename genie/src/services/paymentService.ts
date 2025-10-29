/**
 * Payment Service
 * 
 * Service for handling payments via IAP (mobile) or Stripe (web)
 */

import { Platform } from 'react-native';
import { supabase } from './supabase/client';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { iapService } from './iapService';
import { TOKEN_PACKAGES } from '../config/iapConfig';

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
   * Uses IAP on mobile, Stripe on web
   */
  async purchaseTokens(amount: number, productId?: string): Promise<CheckoutResponse> {
    try {
      // Use IAP on mobile platforms
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        if (!productId) {
          return {
            success: false,
            error: 'Product ID is required for mobile purchases',
          };
        }

        const result = await iapService.purchaseTokens(productId);
        
        if (result.success) {
          return {
            success: true,
            sessionId: result.purchase?.transactionId,
          };
        } else {
          return {
            success: false,
            error: result.error || 'Purchase failed',
          };
        }
      }

      // Use Stripe on web
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
   * Uses IAP on mobile, Stripe on web
   */
  async createSubscription(priceId: string): Promise<CheckoutResponse> {
    try {
      // Use IAP on mobile platforms
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        const result = await iapService.subscribeToPremium(priceId);
        
        if (result.success) {
          return {
            success: true,
            sessionId: result.purchase?.transactionId,
          };
        } else {
          return {
            success: false,
            error: result.error || 'Subscription failed',
          };
        }
      }

      // Use Stripe on web
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
   * Open Stripe checkout in browser (web only)
   */
  async openCheckout(checkoutUrl: string): Promise<void> {
    try {
      // Only for web platform
      if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
        // Open browser with checkout URL and enable dismiss on redirect
        const result = await WebBrowser.openBrowserAsync(checkoutUrl, {
          dismissButtonStyle: 'close',
          showTitle: false,
          enableBarCollapsing: false,
          // This will make the browser close automatically when redirecting to app
          createTask: false,
        });
        
        console.log('Checkout browser result:', result);
      } else {
        console.warn('⚠️ openCheckout should not be called on mobile platforms');
      }
    } catch (error) {
      console.error('Error opening checkout:', error);
      throw error;
    }
  }

  /**
   * Initialize IAP (mobile only)
   */
  async initializeIAP(): Promise<boolean> {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      return await iapService.initialize();
    }
    return false;
  }

  /**
   * Get IAP products
   */
  getIAPProducts() {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      return iapService.getAvailableProducts();
    }
    return [];
  }

  /**
   * Get IAP subscriptions
   */
  getIAPSubscriptions() {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      return iapService.getAvailableSubscriptions();
    }
    return [];
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
  calculateTokenPrice(amount: number, isSubscribed: boolean = false): number {
    // Price mapping based on actual IAP prices
    const priceMap: Record<number, number> = {
      50: 2.99,
      100: 4.99,
      250: 12.99,
      500: 24.99,
      1000: 49.99,
      2000: 99.99,
    };
    
    const basePrice = priceMap[amount] || (amount * 0.05);
    
    // No subscriber discount - same price for everyone
    return basePrice;
  }

  /**
   * Get subscription pricing tiers
   */
  getSubscriptionTiers() {
    return [
      {
        id: 'premium',
        name: 'Premium',
        priceId: 'price_1SNHrn9mCMmqa2BSvCym8Pq7', // Live Stripe price ID ($14.99)
        price: 14.99,
        tokens: 1000,
        features: [
          '1,000 tokens per month',
          'Advanced AI models',
          'Priority support',
          'Early access to features',
        ],
        popular: true,
      },
    ];
  }
}

export const paymentService = new PaymentService();

