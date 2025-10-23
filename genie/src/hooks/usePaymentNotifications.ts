/**
 * Payment Notifications Hook
 * 
 * Listens for payment notifications from database and shows popups
 */

import { useEffect } from 'react';
import { supabase } from '../services/supabase/client';
import { useAuthStore } from '../store/useAuthStore';
import { usePopupContext } from '../contexts/PopupContext';
import { useTokens } from './useTokens';
import * as Notifications from 'expo-notifications';

export const usePaymentNotifications = () => {
  const { user } = useAuthStore();
  const { showAlert } = usePopupContext();
  const { refreshTokens } = useTokens();

  // Function to show notification with sound
  const showPaymentNotification = async (title: string, body: string, isSuccess: boolean = true) => {
    try {
      // Show popup
      showAlert(body, title);
      
      // Play local notification with sound
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'magic', // Uses iPhone "Magic" sound on iOS, default on Android
          data: { type: 'payment' },
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Error showing payment notification:', error);
      // Fallback to just popup if notification fails
      showAlert(body, title);
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    // Listen for payment notifications
    const paymentChannel = supabase
      .channel('payment_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payment_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('💳 Payment notification received:', payload);
          
          const notification = payload.new;
          
          switch (notification.notification_type) {
            case 'payment_failed':
              await showPaymentNotification(
                '❌ Payment Failed',
                'Your payment could not be processed. Please check your payment method and try again.',
                false
              );
              break;
              
            case 'payment_retry':
              await showPaymentNotification(
                '🔄 Payment Retry',
                'We will retry your payment. You will be notified of the result.',
                false
              );
              break;
              
            case 'subscription_canceled':
              await showPaymentNotification(
                '📋 Subscription Cancelled',
                'Your subscription has been cancelled. You can resubscribe anytime.',
                false
              );
              refreshTokens();
              break;
              
            case 'subscription_renewed':
              await showPaymentNotification(
                '✅ Subscription Renewed',
                'Your subscription has been renewed successfully! Your monthly tokens have been added.',
                true
              );
              refreshTokens();
              break;
              
            default:
              console.log('Unknown notification type:', notification.notification_type);
          }
        }
      )
      .subscribe();

    // Listen for token balance changes (successful purchases)
    const tokenChannel = supabase
      .channel('token_balance_history')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'token_balance_history',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('💰 Token balance change:', payload);
          
          const change = payload.new;
          
          if (change.change_type === 'purchase' && change.change_amount > 0) {
            await showPaymentNotification(
              '✅ Tokens Added',
              `Successfully added ${change.change_amount} tokens to your account!`,
              true
            );
            refreshTokens();
          }
          
          if (change.change_type === 'subscription_renewal' && change.change_amount > 0) {
            await showPaymentNotification(
              '🎉 Monthly Tokens',
              `Your monthly ${change.change_amount} tokens have been added!`,
              true
            );
            refreshTokens();
          }
        }
      )
      .subscribe();

    // Listen for subscription changes
    const subscriptionChannel = supabase
      .channel('subscriptions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('📋 Subscription change:', payload);
          
          if (payload.eventType === 'INSERT') {
            const subscription = payload.new;
            if (subscription.status === 'active') {
              await showPaymentNotification(
                '🎉 Subscription Active',
                `Welcome to Genie Premium! You now have ${subscription.monthly_tokens} tokens every month.`,
                true
              );
              refreshTokens();
            }
          }
          
          if (payload.eventType === 'UPDATE') {
            const subscription = payload.new;
            if (subscription.status === 'canceled') {
              await showPaymentNotification(
                '📋 Subscription Cancelled',
                'Your subscription has been cancelled. Your current tokens remain available.',
                false
              );
              refreshTokens();
            }
          }
        }
      )
      .subscribe();

    return () => {
      paymentChannel.unsubscribe();
      tokenChannel.unsubscribe();
      subscriptionChannel.unsubscribe();
    };
  }, [user?.id, showAlert, refreshTokens]);

  return null; // This component doesn't render anything
};
