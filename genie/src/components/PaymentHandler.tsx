/**
 * Payment Handler Component
 * 
 * Handles payment callbacks and shows appropriate notifications
 */

import React, { useEffect } from 'react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { paymentService } from '../services/paymentService';
import { usePopupContext } from '../contexts/PopupContext';
import { useTokens } from '../hooks/useTokens';

interface PaymentHandlerProps {
  children: React.ReactNode;
}

export const PaymentHandler: React.FC<PaymentHandlerProps> = ({ children }) => {
  const { showAlert } = usePopupContext();
  const { refreshTokens } = useTokens();

  useEffect(() => {
    const handlePaymentCallback = async (url: string) => {
      console.log('💳 Payment callback received:', url);
      
      // Try to dismiss the browser if it's still open
      try {
        await WebBrowser.dismissBrowser();
      } catch (e) {
        // Browser might already be closed, ignore error
      }
      
      // Handle payment callbacks
      if (url.includes('payment-success')) {
        console.log('✅ Payment successful');
        
        // Small delay to ensure browser is closed
        setTimeout(() => {
          // Refresh token data
          refreshTokens();
          
          // Show success popup
          showAlert(
            'Payment successful! Your tokens have been added to your account.',
            'Payment Complete'
          );
        }, 500);
        return;
      }
      
      if (url.includes('payment-cancelled')) {
        console.log('❌ Payment cancelled');
        
        // Small delay to ensure browser is closed
        setTimeout(() => {
          // Show cancellation popup
          showAlert(
            'Payment was cancelled. You can try again anytime.',
            'Payment Cancelled'
          );
        }, 500);
        return;
      }
    };

    // Handle initial URL if app was opened via deep link
    const getInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl && (initialUrl.includes('payment-success') || initialUrl.includes('payment-cancelled'))) {
        handlePaymentCallback(initialUrl);
      }
    };

    // Handle URL when app is already running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (url.includes('payment-success') || url.includes('payment-cancelled')) {
        handlePaymentCallback(url);
      }
    });

    getInitialURL();

    return () => {
      subscription?.remove();
    };
  }, [showAlert, refreshTokens]);

  return <>{children}</>;
};
