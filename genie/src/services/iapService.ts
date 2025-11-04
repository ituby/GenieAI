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

      // Load consumable products (tokens) - using fetchProducts for v14
      if (tokenProductIds.length > 0) {
        const products = await fetchProducts({ skus: tokenProductIds, type: 'inapp' });
        this.products = products;
        console.log('✅ Loaded products:', products.length, products);
      }

      // Load subscriptions - using fetchProducts with type: 'subs' for v14
      if (subscriptionIds.length > 0) {
        const subscriptions = await fetchProducts({ skus: subscriptionIds, type: 'subs' });
        this.subscriptions = subscriptions;
        console.log('✅ Loaded subscriptions:', subscriptions.length, subscriptions);
      }
    } catch (error) {
      console.error('❌ Error loading products:', error);
      throw error;
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
      const { productId, transactionReceipt } = purchase;
      
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
        await finishTransaction({ 
          purchase, 
          isConsumable: this.isConsumableProduct(purchase.productId) 
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

      console.log('📱 Validating receipt with backend...', {
        platform: Platform.OS,
        productId: purchase.productId,
        transactionId: purchase.transactionId,
      });

      const { data, error } = await supabase.functions.invoke('validate-iap-receipt', {
        body: {
          platform: Platform.OS,
          productId: purchase.productId,
          transactionReceipt: purchase.transactionReceipt,
          transactionId: purchase.transactionId,
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
      this.products.find((p) => p.productId === productId) ||
      this.subscriptions.find((s) => s.productId === productId)
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

      console.log('📱 Requesting purchase:', productId);

      // v14 requires platform-specific request object
      await requestPurchase({
        request: {
          ios: { sku: productId },
          android: { skus: [productId] },
        },
        type: 'inapp',
      });

      // requestPurchase is event-based, not promise-based
      // The result will come through purchaseUpdatedListener
      return {
        success: true,
      };
    } catch (error) {
      console.error('❌ Error purchasing tokens:', error);
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
        await this.initialize();
      }

      console.log('📱 Requesting subscription:', productId);

      // v14 requires platform-specific request object
      await requestPurchase({
        request: {
          ios: { sku: productId },
          android: { skus: [productId] },
        },
        type: 'subs',
      });

      // requestPurchase is event-based, not promise-based
      // The result will come through purchaseUpdatedListener
      return {
        success: true,
      };
    } catch (error) {
      console.error('❌ Error subscribing:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
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

