/**
 * In-App Purchase Service
 * 
 * Handles iOS and Android in-app purchases using react-native-iap v14 (NitroIAP)
 */

import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
} from 'react-native-iap';
import type { Product, Purchase, PurchaseError } from 'react-native-iap';
import { Platform } from 'react-native';
import { supabase } from './supabase/client';
import { ALL_PRODUCT_IDS, TOKEN_PRODUCTS, SUBSCRIPTION_PRODUCTS } from '../config/iapConfig';

export type IAPPurchaseResult = {
  success: boolean;
  error?: string;
  purchase?: any;
};

class IAPService {
  private isInitialized = false;
  private products: Product[] = [];
  private subscriptions: Product[] = [];
  private purchaseUpdateSubscription: any = null;
  private purchaseErrorSubscription: any = null;

  /**
   * Initialize IAP connection
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      console.log('📱 IAP already initialized');
      return true;
    }

    try {
      console.log('📱 Initializing IAP connection...');
      await initConnection();
      
      // Load products
      await this.loadProducts();
      
      // Set up purchase listeners
      this.setupPurchaseListeners();
      
      this.isInitialized = true;
      console.log('✅ IAP initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Error initializing IAP:', error);
      return false;
    }
  }

  /**
   * Load products from stores
   */
  private async loadProducts(): Promise<void> {
    try {
      // Separate token products from subscriptions
      const tokenProductIds = Object.values(TOKEN_PRODUCTS);
      const subscriptionIds = Object.values(SUBSCRIPTION_PRODUCTS);

      console.log('📱 Loading products...', { tokenProductIds, subscriptionIds });
      console.log('📱 Platform:', Platform.OS);

      // Load consumable products (tokens) - using fetchProducts for v14
      if (tokenProductIds.length > 0) {
        try {
          const products = await fetchProducts({ skus: tokenProductIds, type: 'inapp' });
          this.products = products;
          console.log('✅ Loaded products:', products.length, products);
          
          if (products.length === 0) {
            console.warn('⚠️ No token products found!');
            console.warn('⚠️ Product IDs requested:', tokenProductIds);
            console.warn('⚠️ Possible reasons:');
            console.warn('  1. Products not created in App Store Connect (iOS) or Google Play Console (Android)');
            console.warn('  2. Products not in "Ready to Submit" status');
            console.warn('  3. Products not synced yet (wait 2-3 hours)');
            console.warn('  4. Product IDs mismatch');
            console.warn('  5. Not signed in with sandbox tester (for testing)');
          }
        } catch (productError) {
          console.error('❌ Error loading token products:', productError);
          console.error('❌ Error details:', productError instanceof Error ? productError.message : String(productError));
          // Don't throw - continue to try subscriptions
          this.products = [];
        }
      }

      // Load subscriptions - using fetchProducts with type: 'subs' for v14
      if (subscriptionIds.length > 0) {
        try {
          console.log('📱 Attempting to load subscriptions...', subscriptionIds);
          const subscriptions = await fetchProducts({ skus: subscriptionIds, type: 'subs' });
          this.subscriptions = subscriptions;
          console.log('✅ Loaded subscriptions:', subscriptions.length, subscriptions);
          
          if (subscriptions.length === 0) {
            console.warn('⚠️ No subscriptions found!');
            console.warn('⚠️ Subscription IDs requested:', subscriptionIds);
            console.warn('⚠️ Possible reasons:');
            console.warn('  1. Subscription not created in App Store Connect → Subscriptions');
            console.warn('  2. Subscription not in "Ready to Submit" or "In Review" status');
            console.warn('  3. Subscription not synced yet (wait 2-3 hours after creating)');
            console.warn('  4. Product ID mismatch (check: com.ituby.genie.ai.premium.monthly)');
            console.warn('  5. Not signed in with sandbox tester (for testing)');
            console.warn('  6. Subscription Group not configured correctly');
          } else {
            subscriptions.forEach(sub => {
              const productId = Platform.OS === 'ios' ? (sub as any).productIdentifier : (sub as any).productId;
              const price = (sub as any).price || (sub as any).localizedPrice || 'N/A';
              console.log(`✅ Subscription found: ${productId} - ${(sub as any).title || 'N/A'} - ${price}`);
            });
          }
        } catch (subscriptionError) {
          console.error('❌ Error loading subscriptions:', subscriptionError);
          console.error('❌ Error details:', subscriptionError instanceof Error ? subscriptionError.message : String(subscriptionError));
          console.error('❌ Subscription IDs that failed:', subscriptionIds);
          // Don't throw - subscriptions are optional
          this.subscriptions = [];
        }
      }
    } catch (error) {
      console.error('❌ Error in loadProducts:', error);
      console.error('❌ Error details:', error instanceof Error ? error.stack : String(error));
      // Don't throw - allow initialization to complete even if products fail to load
      // This way the app can still function and show fallback prices
      this.products = [];
      this.subscriptions = [];
    }
  }

  /**
   * Set up purchase listeners
   */
  private setupPurchaseListeners(): void {
    // Listen for purchase updates
    this.purchaseUpdateSubscription = purchaseUpdatedListener(
      async (purchase: Purchase) => {
        console.log('📱 Purchase updated:', purchase);
        await this.handlePurchaseUpdate(purchase);
      }
    );

    // Listen for purchase errors
    this.purchaseErrorSubscription = purchaseErrorListener(
      (error: PurchaseError) => {
        console.warn('⚠️ Purchase error:', error);
        // Handle purchase errors if needed
      }
    );
  }

  /**
   * Handle purchase update
   */
  private async handlePurchaseUpdate(purchase: Purchase): Promise<void> {
    try {
      const productId = Platform.OS === 'ios' ? (purchase as any).productIdentifier : (purchase as any).productId;
      const transactionReceipt = (purchase as any).transactionReceipt || (purchase as any).transactionReceiptData;
      
      console.log('📱 Processing purchase:', { productId });

      // Validate receipt with backend
      const validated = await this.validateReceipt(purchase);

      if (validated) {
        console.log('✅ Purchase validated successfully');
        
        // Finish the transaction
        await finishTransaction({ 
          purchase, 
          isConsumable: this.isConsumableProduct(productId) 
        });
        console.log('✅ Transaction finished');
      } else {
        console.error('❌ Purchase validation failed - finishing transaction anyway to prevent hanging');
        // Even if validation fails, we should finish the transaction
        // to prevent the transaction from hanging in the queue
        // The user will not receive tokens, but the transaction won't block future purchases
        try {
          await finishTransaction({ 
            purchase, 
            isConsumable: this.isConsumableProduct(productId) 
          });
          console.log('⚠️ Transaction finished despite validation failure');
        } catch (finishError) {
          console.error('❌ Error finishing transaction:', finishError);
        }
      }
    } catch (error) {
      console.error('❌ Error handling purchase update:', error);
        // Try to finish the transaction even if there's an error
        // to prevent it from blocking future purchases
        try {
          const productId = Platform.OS === 'ios' ? (purchase as any).productIdentifier : (purchase as any).productId;
          await finishTransaction({ 
            purchase, 
            isConsumable: this.isConsumableProduct(productId) 
          });
        console.log('⚠️ Transaction finished after error');
      } catch (finishError) {
        console.error('❌ Error finishing transaction after error:', finishError);
      }
    }
  }

  /**
   * Check if product is consumable (tokens)
   */
  private isConsumableProduct(productId: string): boolean {
    return Object.values(TOKEN_PRODUCTS).includes(productId);
  }

  /**
   * Validate receipt with backend
   */
  private async validateReceipt(purchase: Purchase): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('❌ User not authenticated');
        return false;
      }

      const productId = Platform.OS === 'ios' ? (purchase as any).productIdentifier : (purchase as any).productId;
      const transactionReceipt = (purchase as any).transactionReceipt || (purchase as any).transactionReceiptData;
      const transactionId = (purchase as any).transactionId || (purchase as any).transactionIdentifier;
      
      console.log('📱 Validating receipt with backend...', {
        platform: Platform.OS,
        productId: productId,
        transactionId: transactionId,
      });

      const { data, error } = await supabase.functions.invoke('validate-iap-receipt', {
        body: {
          platform: Platform.OS,
          productId: productId,
          transactionReceipt: transactionReceipt,
          transactionId: transactionId,
          purchaseToken: (purchase as any).purchaseToken, // Android only
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('❌ Receipt validation error:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        return false;
      }

      if (!data?.success) {
        console.error('❌ Receipt validation failed:', data?.error || 'Unknown error');
        return false;
      }

      console.log('✅ Receipt validated successfully');
      return true;
    } catch (error) {
      console.error('❌ Error validating receipt:', error);
      console.error('❌ Error details:', error instanceof Error ? error.stack : String(error));
      return false;
    }
  }

  /**
   * Get available products
   */
  getAvailableProducts(): Product[] {
    return this.products;
  }

  /**
   * Get available subscriptions
   */
  getAvailableSubscriptions(): Product[] {
    return this.subscriptions;
  }

  /**
   * Get product by ID
   */
  getProduct(productId: string): Product | undefined {
    return (
      this.products.find((p) => {
        const pId = Platform.OS === 'ios' ? (p as any).productIdentifier : (p as any).productId;
        return pId === productId;
      }) ||
      this.subscriptions.find((s) => {
        const sId = Platform.OS === 'ios' ? (s as any).productIdentifier : (s as any).productId;
        return sId === productId;
      })
    );
  }

  /**
   * Purchase tokens
   */
  async purchaseTokens(productId: string): Promise<IAPPurchaseResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Check if product exists
      const product = this.products.find((p) => {
        const pId = Platform.OS === 'ios' ? (p as any).productIdentifier : (p as any).productId;
        return pId === productId;
      });
      if (!product) {
        console.error('❌ Product not found:', productId);
        const availableIds = this.products.map((p) => {
          return Platform.OS === 'ios' ? (p as any).productIdentifier : (p as any).productId;
        });
        console.error('❌ Available products:', availableIds);
        return {
          success: false,
          error: `Product not found: ${productId}. Please make sure the product is available in App Store Connect.`,
        };
      }

      const productIdValue = Platform.OS === 'ios' ? (product as any).productIdentifier : (product as any).productId;
      const price = (product as any).price || (product as any).localizedPrice || 'N/A';
      console.log('📱 Requesting purchase:', productId);
      console.log('📱 Product details:', {
        productId: productIdValue,
        title: (product as any).title || 'N/A',
        price: price,
      });

      // v14 requires platform-specific request object
      // This will open the native purchase dialog automatically
      await requestPurchase({
        request: {
          ios: { sku: productId },
          android: { skus: [productId] },
        },
        type: 'inapp',
      });

      // requestPurchase is event-based, not promise-based
      // The result will come through purchaseUpdatedListener
      // If we get here without error, the purchase dialog should be opening
      console.log('✅ Purchase request sent - native dialog should open');
      
      return {
        success: true,
      };
    } catch (error) {
      console.error('❌ Error purchasing tokens:', error);
      console.error('❌ Error details:', error instanceof Error ? error.stack : String(error));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Subscribe to premium
   */
  async subscribeToPremium(productId: string): Promise<IAPPurchaseResult> {
    try {
      if (!this.isInitialized) {
        console.log('📱 IAP not initialized, initializing...');
        await this.initialize();
      }

      // Check if subscriptions are loaded
      if (this.subscriptions.length === 0) {
        console.warn('⚠️ No subscriptions loaded, trying to reload...');
        console.warn('⚠️ Attempting to reload subscriptions from App Store Connect...');
        await this.loadProducts();
        
        if (this.subscriptions.length === 0) {
          console.error('❌ No subscriptions available after reload');
          console.error('❌ Subscription ID requested:', productId);
          console.error('❌ Expected: com.ituby.genie.ai.premium.monthly');
          console.error('❌ Please check:');
          console.error('  1. Subscription exists in App Store Connect → Subscriptions → Premium');
          console.error('  2. Subscription status is "Ready to Submit" or "In Review"');
          console.error('  3. Product ID matches exactly: com.ituby.genie.ai.premium.monthly');
          console.error('  4. Wait 2-3 hours if subscription was just created');
          console.error('  5. You are signed in with Sandbox Tester (for testing)');
          
          return {
            success: false,
            error: `Subscription product "${productId}" is not available. Please check:\n1. Subscription exists in App Store Connect → Subscriptions\n2. Status is "Ready to Submit" or "In Review"\n3. Product ID matches: com.ituby.genie.ai.premium.monthly\n4. Wait 2-3 hours if just created\n5. You are signed in with Sandbox Tester`,
          };
        }
      }

      // Check if subscription product exists
      const subscription = this.subscriptions.find((s) => {
        const sId = Platform.OS === 'ios' ? (s as any).productIdentifier : (s as any).productId;
        return sId === productId;
      });
      if (!subscription) {
        console.error('❌ Subscription product not found:', productId);
        const availableIds = this.subscriptions.map((s) => {
          return Platform.OS === 'ios' ? (s as any).productIdentifier : (s as any).productId;
        });
        console.error('❌ Available subscriptions:', availableIds);
        console.error('❌ Total subscriptions loaded:', this.subscriptions.length);
        return {
          success: false,
          error: `Subscription product "${productId}" not found. Available: ${availableIds.join(', ') || 'none'}. Please make sure the subscription is "Ready to Submit" in App Store Connect.`,
        };
      }

      const subscriptionId = Platform.OS === 'ios' ? (subscription as any).productIdentifier : (subscription as any).productId;
      const price = (subscription as any).price || (subscription as any).localizedPrice || 'N/A';
      console.log('📱 Requesting subscription:', productId);
      console.log('📱 Subscription details:', {
        productId: subscriptionId,
        title: (subscription as any).title || 'N/A',
        price: price,
      });

      // v14 requires platform-specific request object
      // This will open the native purchase dialog automatically
      await requestPurchase({
        request: {
          ios: { sku: productId },
          android: { skus: [productId] },
        },
        type: 'subs',
      });

      // requestPurchase is event-based, not promise-based
      // The result will come through purchaseUpdatedListener
      // If we get here without error, the purchase dialog should be opening
      console.log('✅ Subscription request sent - native dialog should open');
      
      return {
        success: true,
      };
    } catch (error) {
      console.error('❌ Error subscribing:', error);
      console.error('❌ Error details:', error instanceof Error ? error.stack : String(error));
      
      // Provide more detailed error messages
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
        // Check for common error patterns
        if (errorMessage.includes('not available') || errorMessage.includes('not found')) {
          errorMessage = `Subscription product "${productId}" is not available. Please make sure it's "Ready to Submit" in App Store Connect.`;
        } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        }
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get current user ID for obfuscation
   */
  private async getUserId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || '';
  }

  /**
   * Cleanup IAP connection
   */
  async cleanup(): Promise<void> {
    try {
      if (this.purchaseUpdateSubscription) {
        this.purchaseUpdateSubscription.remove();
        this.purchaseUpdateSubscription = null;
      }

      if (this.purchaseErrorSubscription) {
        this.purchaseErrorSubscription.remove();
        this.purchaseErrorSubscription = null;
      }

      if (this.isInitialized) {
        await endConnection();
        this.isInitialized = false;
        console.log('✅ IAP connection closed');
      }
    } catch (error) {
      console.error('❌ Error cleaning up IAP:', error);
    }
  }
}

export const iapService = new IAPService();

