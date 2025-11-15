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
  getAvailablePurchases,
} from 'react-native-iap';
import type { Product, Purchase, PurchaseError } from 'react-native-iap';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
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
  private onPurchaseSuccessCallback: (() => void) | null = null;

  /**
   * Initialize IAP connection
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      console.log('📱 IAP already initialized');
      // Make sure listeners are still set up
      if (!this.purchaseUpdateSubscription) {
        console.log('⚠️ Listeners not set up, setting them up now...');
        this.setupPurchaseListeners();
      }
      return true;
    }

    try {
      console.log('📱 Initializing IAP connection...');
      await initConnection();
      
      // Set up purchase listeners FIRST, before loading products
      // This ensures listeners are ready for any purchases
      console.log('📱 Setting up purchase listeners BEFORE loading products...');
      this.setupPurchaseListeners();
      
      // Load products
      await this.loadProducts();
      
      this.isInitialized = true;
      console.log('✅ IAP initialized successfully');
      console.log('✅ Purchase listeners are active:', {
        hasUpdateListener: !!this.purchaseUpdateSubscription,
        hasErrorListener: !!this.purchaseErrorSubscription,
      });
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
          
          // Debug: Log the structure of the first product to understand the format
          if (products.length > 0) {
            console.log('📱 First product structure:', JSON.stringify(products[0], null, 2));
            console.log('📱 First product keys:', Object.keys(products[0]));
            console.log('📱 First product productIdentifier:', (products[0] as any).productIdentifier);
            console.log('📱 First product productId:', (products[0] as any).productId);
            console.log('📱 First product id:', (products[0] as any).id);
            console.log('📱 First product sku:', (products[0] as any).sku);
          }
          
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
    console.log('🔧 Setting up purchase listeners...');
    
    // Remove existing listeners if they exist
    if (this.purchaseUpdateSubscription) {
      console.log('🔄 Removing existing purchase update listener...');
      try {
        this.purchaseUpdateSubscription.remove();
      } catch (e) {
        console.warn('⚠️ Error removing existing listener:', e);
      }
      this.purchaseUpdateSubscription = null;
    }
    
    if (this.purchaseErrorSubscription) {
      console.log('🔄 Removing existing purchase error listener...');
      try {
        this.purchaseErrorSubscription.remove();
      } catch (e) {
        console.warn('⚠️ Error removing existing error listener:', e);
      }
      this.purchaseErrorSubscription = null;
    }
    
    // Listen for purchase updates
    try {
      this.purchaseUpdateSubscription = purchaseUpdatedListener(
        async (purchase: Purchase) => {
          console.log('📱 ========== Purchase updated listener called! ==========');
          console.log('📱 Purchase object:', JSON.stringify(purchase, null, 2));
          console.log('📱 Purchase keys:', Object.keys(purchase));
          console.log('📱 Purchase type:', typeof purchase);
          await this.handlePurchaseUpdate(purchase);
        }
      );
      console.log('✅ Purchase update listener set up');
      console.log('✅ Listener subscription:', this.purchaseUpdateSubscription ? 'exists' : 'null');
    } catch (listenerError) {
      console.error('❌ Error setting up purchase update listener:', listenerError);
    }

    // Listen for purchase errors
    this.purchaseErrorSubscription = purchaseErrorListener(
      (error: PurchaseError) => {
        console.warn('⚠️ ========== Purchase error listener called! ==========');
        console.warn('⚠️ Purchase error:', JSON.stringify(error, null, 2));
        console.warn('⚠️ Error code:', error.code);
        console.warn('⚠️ Error message:', error.message);
        // Handle purchase errors if needed
      }
    );
    console.log('✅ Purchase error listener set up');
  }

  /**
   * Handle purchase update
   */
  private async handlePurchaseUpdate(purchase: Purchase): Promise<void> {
    try {
      console.log('📱 ========== handlePurchaseUpdate called ==========');
      
      // In v14, productId is in 'id' field (same as Product object)
      const productId = (purchase as any).id || 
                       (purchase as any).productIdentifier || 
                       (purchase as any).productId;
      const transactionReceipt = (purchase as any).transactionReceipt || 
                                (purchase as any).transactionReceiptData ||
                                (purchase as any).transactionReceiptString;
      const transactionId = (purchase as any).transactionId || 
                           (purchase as any).transactionIdentifier ||
                           (purchase as any).originalTransactionIdentifierIOS;
      
      console.log('📱 Processing purchase:', { 
        productId,
        transactionId,
        hasReceipt: !!transactionReceipt,
        receiptLength: transactionReceipt?.length || 0,
        purchaseKeys: Object.keys(purchase),
      });

      if (!productId || !transactionId) {
        console.error('❌ Missing required purchase data:', { productId, transactionId });
        return;
      }

      console.log('📱 Calling validateReceipt to send to Edge Function...');
      // Validate receipt with backend - THIS IS WHERE WE CALL THE EDGE FUNCTION
      const validated = await this.validateReceipt(purchase);

      if (validated) {
        console.log('✅ Purchase validated successfully');
        
        // Finish the transaction
        await finishTransaction({ 
          purchase, 
          isConsumable: this.isConsumableProduct(productId) 
        });
        console.log('✅ Transaction finished');
        
        // Trigger callback to refresh tokens in UI
        if (this.onPurchaseSuccessCallback) {
          console.log('🔄 Calling purchase success callback to refresh tokens...');
          this.onPurchaseSuccessCallback();
        }
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
        const productId = (purchase as any).id || 
                         (purchase as any).productIdentifier || 
                         (purchase as any).productId;
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
   * Validate receipt with backend - THIS CALLS THE EDGE FUNCTION
   */
  private async validateReceipt(purchase: Purchase): Promise<boolean> {
    try {
      console.log('📱 ========== validateReceipt called - preparing to call Edge Function ==========');
      
      // Get user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('❌ User not authenticated:', sessionError?.message);
        return false;
      }

      console.log('✅ User session found');

      // Extract purchase data
      // Log full purchase object for debugging
      console.log('📱 Full purchase object:', JSON.stringify(purchase, null, 2));
      console.log('📱 Purchase object keys:', Object.keys(purchase));
      
      // Try multiple fields to get product ID - in v14 it might be in different fields
      const productId = (purchase as any).productId || 
                       (purchase as any).productIdentifier || 
                       (purchase as any).id ||
                       (purchase as any).sku;
      const transactionReceipt = (purchase as any).transactionReceipt || 
                                (purchase as any).transactionReceiptData ||
                                (purchase as any).transactionReceiptString;
      const transactionId = (purchase as any).transactionId || 
                          (purchase as any).transactionIdentifier ||
                          (purchase as any).originalTransactionIdentifierIOS;

      console.log('📱 Extracted purchase data:', {
        productId,
        transactionId,
        hasReceipt: !!transactionReceipt,
        purchaseKeys: Object.keys(purchase),
        purchaseId: (purchase as any).id,
        purchaseProductId: (purchase as any).productId,
        purchaseProductIdentifier: (purchase as any).productIdentifier,
        purchaseSku: (purchase as any).sku,
      });

      if (!productId || !transactionId) {
        console.error('❌ Missing required purchase data:', { productId, transactionId });
        console.error('❌ Full purchase object:', JSON.stringify(purchase, null, 2));
        return false;
      }

      // Validate product ID format - should start with 'com.ituby.genie.ai'
      if (!productId.startsWith('com.ituby.genie.ai')) {
        console.error('❌ Invalid product ID format:', productId);
        console.error('❌ Product ID should start with "com.ituby.genie.ai"');
        console.error('❌ This might be a transaction ID instead of product ID');
        // Try to get the actual product ID from the purchase
        // In some cases, the product ID might be in a different field
        const actualProductId = (purchase as any).productId || 
                               (purchase as any).productIdentifier;
        if (actualProductId && actualProductId.startsWith('com.ituby.genie.ai')) {
          console.log('✅ Found valid product ID in alternative field:', actualProductId);
          // Use the valid product ID
          (purchase as any).productId = actualProductId;
        } else {
          console.error('❌ Could not find valid product ID in purchase object');
          return false;
        }
      }

      console.log('✅ Purchase data extracted:', { productId, transactionId, hasReceipt: !!transactionReceipt });

      // Prepare request body
      const requestBody = {
        platform: Platform.OS,
        productId: productId,
        transactionReceipt: transactionReceipt || '',
        transactionId: transactionId,
        purchaseToken: (purchase as any).purchaseToken || undefined,
      };

      console.log('📱 ========== CALLING SUPABASE EDGE FUNCTION validate-iap-receipt ==========');
      console.log('📱 Request body:', JSON.stringify(requestBody, null, 2));
      console.log('📱 Function name: validate-iap-receipt');
      console.log('📱 Request body keys:', Object.keys(requestBody));
      console.log('📱 Request body size:', JSON.stringify(requestBody).length, 'bytes');

      // Validate request body before sending
      if (!requestBody.platform || !requestBody.productId || !requestBody.transactionId) {
        console.error('❌ Invalid request body - missing required fields');
        console.error('📱 Request body:', requestBody);
        return false;
      }

      // Get Supabase URL and anon key
      const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL as string;
      const functionUrl = `${supabaseUrl}/functions/v1/validate-iap-receipt`;

      console.log('📱 Calling Edge Function via fetch:', functionUrl);
      console.log('📱 Request body size:', JSON.stringify(requestBody).length, 'bytes');

      // Call Edge Function using fetch directly to ensure body is sent correctly
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY as string,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📱 ========== EDGE FUNCTION RESPONSE RECEIVED ==========');
      console.log('📱 Response status:', response.status);
      console.log('📱 Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Edge Function HTTP error:', response.status, errorText);
        return false;
      }

      const data = await response.json();
      console.log('📱 Response data:', JSON.stringify(data, null, 2));

      if (!data || !data.success) {
        console.error('❌ Validation failed:', data?.error || 'Unknown error');
        return false;
      }

      console.log('✅ Receipt validated successfully by Edge Function');
      return true;
    } catch (error) {
      console.error('❌ Error validating receipt:', error instanceof Error ? error.message : String(error));
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'no stack');
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
        return (p as any).id === productId;
      }) ||
      this.subscriptions.find((s) => {
        return (s as any).id === productId;
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

      // Debug: Log all products structure
      console.log('📱 All products structure:', this.products.map(p => ({
        keys: Object.keys(p),
        productIdentifier: (p as any).productIdentifier,
        productId: (p as any).productId,
        id: (p as any).id,
        sku: (p as any).sku,
        full: p,
      })));
      
      // Check if product exists - use 'id' field which contains the productId
      const product = this.products.find((p) => {
        const pId = (p as any).id; // In v14, the productId is in the 'id' field
        console.log('📱 Comparing product:', { pId, productId, match: pId === productId });
        return pId === productId;
      });
      if (!product) {
        console.error('❌ Product not found:', productId);
        const availableIds = this.products.map((p) => {
          return (p as any).id || 'unknown';
        });
        console.error('❌ Available products:', availableIds);
        return {
          success: false,
          error: `Product not found: ${productId}. Please make sure the product is available in App Store Connect.`,
        };
      }

      // In v14, the productId is in the 'id' field
      const productIdValue = (product as any).id || productId;
      const price = (product as any).price || (product as any).localizedPrice || 'N/A';
      console.log('📱 Requesting purchase:', productId);
      console.log('📱 Product details:', {
        productId: productIdValue,
        title: (product as any).title || 'N/A',
        price: price,
      });

      // v14 requires platform-specific request object
      // This will open the native purchase dialog automatically
      try {
        // For iOS, we need to use the productIdentifier from the product object
        // For Android, we can use the productId directly
        const skuToUse = Platform.OS === 'ios' ? productIdValue : productId;
        
        console.log('📱 Calling requestPurchase with:', {
          productId,
          productIdValue,
          skuToUse,
          type: 'inapp',
          platform: Platform.OS,
        });
        console.log('📱 Full product object:', JSON.stringify(product, null, 2));
        
        console.log('📱 About to call requestPurchase...');
        console.log('📱 Checking if listener is set up...', {
          hasListener: !!this.purchaseUpdateSubscription,
          isInitialized: this.isInitialized,
        });
        
        // Double-check listener is set up before purchase
        if (!this.purchaseUpdateSubscription) {
          console.error('❌ Purchase listener not set up! Setting it up now...');
          this.setupPurchaseListeners();
        }
        
        console.log('📱 Calling requestPurchase with:', {
          sku: skuToUse,
          productId: productId,
          platform: Platform.OS,
        });
        
        try {
          // For iOS, use the product object directly if available
          const purchaseRequest = Platform.OS === 'ios' 
            ? {
                request: {
                  ios: { sku: skuToUse },
                },
                type: 'inapp' as const,
              }
            : {
                request: {
                  android: { skus: [productId] },
                },
                type: 'inapp' as const,
              };
          
          console.log('📱 Purchase request object:', JSON.stringify(purchaseRequest, null, 2));
          
          await requestPurchase(purchaseRequest);
          console.log('✅ requestPurchase completed without throwing error');
        } catch (requestError) {
          console.error('❌ requestPurchase threw an error:', requestError);
          throw requestError; // Re-throw to handle properly
        }

        // requestPurchase is event-based, not promise-based
        // The result will come through purchaseUpdatedListener
        // If we get here without error, the purchase dialog should be opening
        console.log('✅ Purchase request sent - native dialog should open');
        console.log('⏳ Waiting for purchaseUpdatedListener to be called...');
        console.log('📱 Listener status:', {
          hasSubscription: !!this.purchaseUpdateSubscription,
          subscriptionType: typeof this.purchaseUpdateSubscription,
        });
        
        // Give a hint about what to expect
        console.log('💡 If purchase is successful, you should see:');
        console.log('💡   📱 ========== Purchase updated listener called! ==========');
        
        // Fallback: Check for pending purchases after a delay
        // Sometimes purchaseUpdatedListener doesn't fire immediately
        // This is a backup mechanism to ensure purchases are processed
        let checkCount = 0;
        const maxChecks = 10; // Check for 10 seconds
        
        const checkInterval = setInterval(async () => {
          checkCount++;
          try {
            console.log(`🔍 [${checkCount}/${maxChecks}] Checking for pending purchases (fallback mechanism)...`);
            const availablePurchases = await getAvailablePurchases();
            console.log('🔍 Available purchases found:', availablePurchases?.length || 0);
            
            if (availablePurchases && availablePurchases.length > 0) {
              console.log('📱 Found pending purchases! Processing...');
              for (const purchase of availablePurchases) {
                // Check if this is the purchase we just made
                const purchaseProductId = (purchase as any).id || 
                                        (purchase as any).productIdentifier || 
                                        (purchase as any).productId;
                
                console.log('🔍 Checking purchase:', {
                  purchaseProductId,
                  targetProductId: productId,
                  match: purchaseProductId === productId,
                });
                
                if (purchaseProductId === productId) {
                  console.log('✅ Found matching purchase! Processing and sending to Edge Function...');
                  clearInterval(checkInterval);
                  await this.handlePurchaseUpdate(purchase);
                  return;
                }
              }
            } else {
              console.log('🔍 No pending purchases found yet...');
            }
          } catch (checkError) {
            console.error('❌ Error checking for pending purchases:', checkError);
          }
          
          // Stop after max checks
          if (checkCount >= maxChecks) {
            clearInterval(checkInterval);
            console.log('⏰ Stopped checking for pending purchases (timeout after 10 seconds)');
            console.log('⚠️ If purchase was successful but not processed, it may be stuck in the queue');
          }
        }, 1000); // Check every 1 second
        
        return {
          success: true,
        };
      } catch (purchaseError) {
        console.error('❌ requestPurchase threw an error:', purchaseError);
        console.error('❌ Error type:', purchaseError instanceof Error ? purchaseError.constructor.name : typeof purchaseError);
        console.error('❌ Error message:', purchaseError instanceof Error ? purchaseError.message : String(purchaseError));
        console.error('❌ Error stack:', purchaseError instanceof Error ? purchaseError.stack : 'No stack');
        
        // Even if requestPurchase throws, the purchase might still work
        // because it's event-based. But we should log the error.
        throw purchaseError;
      }
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

      // Check if subscription product exists - use 'id' field
      const subscription = this.subscriptions.find((s) => {
        return (s as any).id === productId;
      });
      if (!subscription) {
        console.error('❌ Subscription product not found:', productId);
        const availableIds = this.subscriptions.map((s) => {
          return (s as any).id || 'unknown';
        });
        console.error('❌ Available subscriptions:', availableIds);
        console.error('❌ Total subscriptions loaded:', this.subscriptions.length);
        return {
          success: false,
          error: `Subscription product "${productId}" not found. Available: ${availableIds.join(', ') || 'none'}. Please make sure the subscription is "Ready to Submit" in App Store Connect.`,
        };
      }

      // In v14, the productId is in the 'id' field
      const subscriptionId = (subscription as any).id || productId;
      const price = (subscription as any).price || (subscription as any).localizedPrice || 'N/A';
      console.log('📱 Requesting subscription:', productId);
      console.log('📱 Subscription details:', {
        productId: subscriptionId,
        title: (subscription as any).title || 'N/A',
        price: price,
      });
      console.log('📱 Full subscription object:', JSON.stringify(subscription, null, 2));

      // v14 requires platform-specific request object
      // This will open the native purchase dialog automatically
      try {
        // For iOS, we need to use the productIdentifier from the subscription object
        // For Android, we can use the productId directly
        const skuToUse = Platform.OS === 'ios' ? subscriptionId : productId;
        
        console.log('📱 Calling requestPurchase for subscription with:', {
          productId,
          subscriptionId,
          skuToUse,
          type: 'subs',
          platform: Platform.OS,
        });
        
        await requestPurchase({
          request: {
            ios: { sku: skuToUse },
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
      } catch (purchaseError) {
        console.error('❌ requestPurchase threw an error for subscription:', purchaseError);
        console.error('❌ Error type:', purchaseError instanceof Error ? purchaseError.constructor.name : typeof purchaseError);
        console.error('❌ Error message:', purchaseError instanceof Error ? purchaseError.message : String(purchaseError));
        console.error('❌ Error stack:', purchaseError instanceof Error ? purchaseError.stack : 'No stack');
        
        // Even if requestPurchase throws, the purchase might still work
        // because it's event-based. But we should log the error.
        throw purchaseError;
      }
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
   * Set callback for purchase success (to refresh tokens)
   */
  setPurchaseSuccessCallback(callback: () => void): void {
    this.onPurchaseSuccessCallback = callback;
    console.log('📱 Purchase success callback set');
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

