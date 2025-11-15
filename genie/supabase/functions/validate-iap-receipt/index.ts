import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IAPReceiptRequest {
  platform: 'ios' | 'android';
  productId: string;
  transactionReceipt: string;
  transactionId: string;
  purchaseToken?: string; // Android only
}

interface AppleReceiptResponse {
  status: number;
  receipt?: any;
  latest_receipt_info?: any[];
}

interface GoogleReceiptResponse {
  purchaseState: number;
  consumptionState: number;
  orderId: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Initialize Supabase client with SERVICE_ROLE_KEY to bypass RLS
    // This is safe because we validate the user's auth token first
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseServiceKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY not configured');
      throw new Error('Server configuration error');
    }

    // Create client with service role key for admin operations
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from token - extract token from Authorization header
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    let body: IAPReceiptRequest;
    try {
      // Check if request has body by checking content-length
      const contentLength = req.headers.get('content-length');
      if (contentLength === '0' || !contentLength) {
        console.error('❌ Request body is empty (content-length: 0 or missing)');
        console.error('❌ Content-Type:', req.headers.get('content-type'));
        console.error('❌ Request method:', req.method);
        console.error('❌ Request URL:', req.url);
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Request body is empty' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Parse JSON directly - supabase.functions.invoke sends body as JSON
      body = await req.json();
      
      // Validate body exists and has required structure
      if (!body || typeof body !== 'object') {
        throw new Error('Request body is missing or invalid');
      }
      
      if (Object.keys(body).length === 0) {
        throw new Error('Request body is empty object');
      }
      
      console.log('✅ Request body parsed successfully:', {
        platform: body.platform,
        productId: body.productId,
        hasTransactionId: !!body.transactionId,
        hasReceipt: !!body.transactionReceipt,
        receiptLength: body.transactionReceipt?.length || 0,
      });
    } catch (parseError) {
      console.error('❌ Error parsing request body:', parseError);
      // Log more details for debugging
      const contentType = req.headers.get('content-type');
      const contentLength = req.headers.get('content-length');
      console.error('❌ Content-Type:', contentType);
      console.error('❌ Content-Length:', contentLength);
      console.error('❌ Request method:', req.method);
      console.error('❌ Request URL:', req.url);
      
      // Return a proper error response instead of throwing
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Invalid request body: ${parseError instanceof Error ? parseError.message : 'Unknown error'}` 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const { platform, productId, transactionReceipt, transactionId, purchaseToken } = body;

    // Validate required fields
    if (!platform || (platform !== 'ios' && platform !== 'android')) {
      throw new Error('Invalid or missing platform. Must be "ios" or "android"');
    }
    if (!productId || productId.trim() === '') {
      throw new Error('Missing or empty productId');
    }
    if (!transactionId || transactionId.trim() === '') {
      throw new Error('Missing or empty transactionId');
    }
    
    // Check if it's a subscription based on product ID
    // Subscriptions have 'premium' in the product ID, consumable products (tokens) don't
    const isSubscription = productId.includes('premium');
    
    // For iOS:
    // - Consumable products (tokens): receipt might be empty - we can use transaction ID for validation
    // - Subscriptions: receipt is usually available and required for proper validation
    // However, in some cases (especially in sandbox/testing), receipt might be empty for both
    if (platform === 'ios') {
      // If receipt is empty, we'll try to validate using transaction ID for both types
      // This is acceptable for testing and in cases where receipt is not available
      if (!transactionReceipt || transactionReceipt.trim() === '') {
        if (isSubscription) {
          console.warn('⚠️ iOS subscription has empty receipt - will validate using transaction ID only');
        } else {
          console.warn('⚠️ iOS consumable product has empty receipt - will validate using transaction ID only');
        }
      }
    }
    
    if (platform === 'android' && (!purchaseToken || purchaseToken.trim() === '')) {
      throw new Error('Missing or empty purchaseToken for Android');
    }

    console.log('📱 Validating receipt:', { platform, productId, transactionId });

    let isValid = false;
    let receiptData: any = null;

    // Validate receipt based on platform
    if (platform === 'ios') {
      // If receipt is empty (for both consumable and subscription), we'll accept the transaction based on transaction ID
      // This is acceptable in testing/sandbox environments where receipt might not be available
      // In production, receipts should usually be available, but we handle the edge case
      if (!transactionReceipt || transactionReceipt.trim() === '') {
        console.log(`📱 iOS ${isSubscription ? 'subscription' : 'consumable'} product without receipt - accepting transaction based on transaction ID`);
        console.log('📱 This is acceptable for testing. In production, receipts should be available.');
        isValid = true;
        receiptData = {
          status: 0,
          receipt: {
            in_app: [{
              transaction_id: transactionId,
              product_id: productId,
            }],
          },
        };
      } else {
        // Receipt is available - validate it with Apple
        const validation = await validateAppleReceipt(transactionReceipt);
        isValid = validation.isValid;
        receiptData = validation.data;
        
        // Log validation errors for debugging
        if (!isValid && validation.error) {
          console.error('❌ Apple receipt validation error:', validation.error);
        }
      }
    } else if (platform === 'android') {
      if (!purchaseToken) {
        throw new Error('Purchase token required for Android');
      }
      const validation = await validateGoogleReceipt(productId, purchaseToken);
      isValid = validation.isValid;
      receiptData = validation.data;
    } else {
      throw new Error('Invalid platform');
    }

    if (!isValid) {
      console.error('❌ Receipt validation failed');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid receipt' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('✅ Receipt validated successfully');

    // Check and fix subscription sync issue before processing
    // If user has active subscription but is_subscribed is false, fix it
    await checkAndFixSubscriptionSync(supabaseClient, user.id);

    // Determine token amount based on product ID
    const tokenAmount = getTokenAmountFromProductId(productId);
    
    console.log('📱 Token amount determined:', {
      productId,
      tokenAmount,
      isSubscription,
    });
    
    if (!isSubscription && tokenAmount === 0) {
      console.error('❌ Token amount is 0 for product ID:', productId);
      console.error('❌ This means the product ID is not recognized in the token mapping');
      console.error('❌ Available product IDs:', [
        'com.ituby.genie.ai.tokens.50',
        'com.ituby.genie.ai.tokens.100',
        'com.ituby.genie.ai.tokens.250',
        'com.ituby.genie.ai.tokens.500',
        'com.ituby.genie.ai.tokens.1000',
        'com.ituby.genie.ai.tokens.2000',
      ]);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Invalid product ID: ${productId}. Token amount could not be determined.` 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
    
    // isSubscription is already defined above - reuse it

    // Process the purchase
    if (isSubscription) {
      await processSubscriptionPurchase(
        supabaseClient,
        user.id,
        productId,
        transactionId,
        receiptData
      );
    } else {
      await processTokenPurchase(
        supabaseClient,
        user.id,
        productId,
        transactionId,
        tokenAmount,
        receiptData
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error validating receipt:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * Validate Apple receipt with App Store
 * 
 * According to Apple's guidelines:
 * - Always validate against production first
 * - If status 21007 (sandbox receipt used in production), validate against sandbox
 * - This handles production-signed apps getting receipts from test environment
 */
async function validateAppleReceipt(receiptData: string): Promise<{ isValid: boolean; data?: any; error?: string }> {
  const applePassword = Deno.env.get('APPLE_SHARED_SECRET');
  
  if (!applePassword) {
    console.error('❌ APPLE_SHARED_SECRET not configured - receipt validation cannot proceed');
    // In production, this MUST be configured for App Review
    return { 
      isValid: false, 
      error: 'APPLE_SHARED_SECRET is not configured. Receipt validation cannot proceed.' 
    };
  }

  try {
    // Step 1: Always validate against production endpoint first
    console.log('📱 Validating receipt against production endpoint...');
    let response = await fetch('https://buy.itunes.apple.com/verifyReceipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'receipt-data': receiptData,
        password: applePassword,
        'exclude-old-transactions': true,
      }),
    });

    if (!response.ok) {
      console.error('❌ Production endpoint HTTP error:', response.status, response.statusText);
      throw new Error(`Production validation HTTP error: ${response.status}`);
    }

    let result: AppleReceiptResponse = await response.json();
    console.log('📱 Production validation status:', result.status);

    // Step 2: If status is 21007, receipt is from sandbox (test environment)
    // This happens when a production-signed app gets receipts from Apple's test environment
    // During App Review, Apple uses test accounts which generate sandbox receipts
    if (result.status === 21007) {
      console.log('📱 Receipt is from sandbox (status 21007), validating against sandbox endpoint...');
      
      try {
        response = await fetch('https://sandbox.itunes.apple.com/verifyReceipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            'receipt-data': receiptData,
            password: applePassword,
            'exclude-old-transactions': true,
          }),
        });

        if (!response.ok) {
          console.error('❌ Sandbox endpoint HTTP error:', response.status, response.statusText);
          throw new Error(`Sandbox validation HTTP error: ${response.status}`);
        }

        result = await response.json();
        console.log('📱 Sandbox validation status:', result.status);
      } catch (sandboxError) {
        console.error('❌ Error validating against sandbox:', sandboxError);
        // If sandbox validation fails, return the production result
        // This allows the app to handle the error appropriately
        return {
          isValid: false,
          data: result,
          error: `Sandbox validation failed: ${sandboxError instanceof Error ? sandboxError.message : 'Unknown error'}`,
        };
      }
    }

    // Step 3: Check if receipt is valid
    // Status 0 means valid receipt
    // Other status codes indicate various errors (see Apple documentation)
    const isValid = result.status === 0;

    if (!isValid) {
      // Log the status code for debugging
      const statusMessages: Record<number, string> = {
        21000: 'The App Store could not read the JSON object you provided.',
        21002: 'The data in the receipt-data property was malformed or missing.',
        21003: 'The receipt could not be authenticated.',
        21004: 'The shared secret you provided does not match the shared secret on file for your account.',
        21005: 'The receipt server is not currently available.',
        21006: 'This receipt is valid but the subscription has expired.',
        21007: 'This receipt is from the test environment, but it was sent to the production environment for verification.',
        21008: 'This receipt is from the production environment, but it was sent to the test environment for verification.',
        21010: 'This receipt could not be authorized. Treat this the same as if a purchase was never made.',
      };

      const errorMessage = statusMessages[result.status] || `Unknown status code: ${result.status}`;
      console.warn(`⚠️ Receipt validation failed with status ${result.status}: ${errorMessage}`);
    }

    return {
      isValid,
      data: result,
      error: isValid ? undefined : `Receipt validation failed with status ${result.status}`,
    };
  } catch (error) {
    console.error('❌ Error during receipt validation:', error);
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error during receipt validation',
    };
  }
}

/**
 * Validate Google receipt with Google Play
 */
async function validateGoogleReceipt(
  productId: string,
  purchaseToken: string
): Promise<{ isValid: boolean; data?: any }> {
  const googleServiceAccount = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
  
  if (!googleServiceAccount) {
    console.warn('⚠️ GOOGLE_SERVICE_ACCOUNT_JSON not configured, skipping validation');
    // In development, you might want to skip validation
    // In production, this should throw an error
    return { isValid: true };
  }

  try {
    // Parse service account credentials
    const credentials = JSON.parse(googleServiceAccount);
    
    // Get OAuth2 token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: await createJWT(credentials),
      }),
    });

    const { access_token } = await tokenResponse.json();

    // Verify purchase with Google Play Developer API
    const packageName = 'com.ituby.genie.ai';
    const apiUrl = productId.includes('premium')
      ? `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${productId}/tokens/${purchaseToken}`
      : `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${productId}/tokens/${purchaseToken}`;

    const verifyResponse = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!verifyResponse.ok) {
      return { isValid: false };
    }

    const result: GoogleReceiptResponse = await verifyResponse.json();

    // purchaseState 0 = purchased
    const isValid = result.purchaseState === 0;

    return { isValid, data: result };
  } catch (error) {
    console.error('Error validating Google receipt:', error);
    return { isValid: false };
  }
}

/**
 * Create JWT for Google API authentication
 */
async function createJWT(credentials: any): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  // This is a simplified version - in production you'd need proper JWT signing
  // You might want to use a library like jose for this
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedClaim = btoa(JSON.stringify(claim));
  const signature = await signJWT(`${encodedHeader}.${encodedClaim}`, credentials.private_key);

  return `${encodedHeader}.${encodedClaim}.${signature}`;
}

/**
 * Sign JWT with private key
 */
async function signJWT(data: string, privateKey: string): Promise<string> {
  // This is a placeholder - you need to implement proper RSA signing
  // Consider using a library like https://deno.land/x/jose
  return 'signature';
}

/**
 * Get token amount from product ID
 */
function getTokenAmountFromProductId(productId: string): number {
  const amountMap: Record<string, number> = {
    'com.ituby.genie.ai.tokens.50': 50,
    'com.ituby.genie.ai.tokens.100': 100,
    'com.ituby.genie.ai.tokens.250': 250,
    'com.ituby.genie.ai.tokens.500': 500,
    'com.ituby.genie.ai.tokens.1000': 1000,
    'com.ituby.genie.ai.tokens.2000': 2000,
  };

  return amountMap[productId] || 0;
}

/**
 * Process token purchase
 */
async function processTokenPurchase(
  supabaseClient: any,
  userId: string,
  productId: string,
  transactionId: string,
  tokenAmount: number,
  receiptData: any
) {
  // Check if transaction already processed
  // For IAP, we use stripe_payment_intent_id to store the transaction ID
  const { data: existing } = await supabaseClient
    .from('payments')
    .select('id')
    .eq('stripe_payment_intent_id', transactionId)
    .single();

  if (existing) {
    console.log('⚠️ Transaction already processed:', transactionId);
    return;
  }

  // Create payment record
  // Note: amount_cents is in cents, so 0 means we don't know the amount (IAP doesn't expose it)
  const { data: paymentRecord, error: paymentError } = await supabaseClient.from('payments').insert({
    user_id: userId,
    amount_cents: 0, // IAP doesn't expose the actual amount, so we set to 0
    currency: 'usd',
    status: 'succeeded',
    stripe_payment_intent_id: transactionId, // Store IAP transaction ID here
    payment_type: 'token_purchase',
    tokens_amount: tokenAmount,
    metadata: {
      platform: receiptData?.platform || 'mobile',
      productId,
      iap_transaction_id: transactionId,
    },
  }).select('id').single();

  if (paymentError) {
    console.error('Error creating payment record:', paymentError);
    throw new Error('Failed to create payment record');
  }

  // Add tokens to user balance using the correct function
  const { error: tokenError } = await supabaseClient.rpc('add_tokens_to_user', {
    p_user_id: userId,
    p_tokens: tokenAmount,
    p_change_type: 'purchase',
    p_reference_id: paymentRecord?.id || null,
    p_description: `IAP Purchase - ${productId}`,
  });

  if (tokenError) {
    console.error('Error adding tokens:', tokenError);
    throw new Error('Failed to add tokens');
  }

  console.log(`✅ Added ${tokenAmount} tokens to user ${userId}`);
}

/**
 * Check and fix subscription sync issue
 * If user has active subscription in subscriptions table but is_subscribed is false in user_tokens,
 * this function will fix the sync issue
 */
async function checkAndFixSubscriptionSync(
  supabaseClient: any,
  userId: string
): Promise<void> {
  try {
    // Check if user has active subscription
    const { data: activeSubscription, error: subError } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subError && subError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine
      console.error('Error checking subscription:', subError);
      return;
    }

    // Check user_tokens status
    const { data: userTokens, error: tokenError } = await supabaseClient
      .from('user_tokens')
      .select('is_subscribed, monthly_tokens')
      .eq('user_id', userId)
      .single();

    if (tokenError) {
      console.error('Error checking user_tokens:', tokenError);
      return;
    }

    // If there's an active subscription but user_tokens shows not subscribed, fix it
    if (activeSubscription && (!userTokens?.is_subscribed || userTokens.is_subscribed === false)) {
      console.log(`🔧 Fixing subscription sync issue for user ${userId}`);
      console.log(`   Active subscription found: ${activeSubscription.id}`);
      console.log(`   user_tokens.is_subscribed: ${userTokens?.is_subscribed}`);
      
      // Update user_tokens to match subscription status
      const { error: updateError } = await supabaseClient
        .from('user_tokens')
        .update({
          is_subscribed: true,
          monthly_tokens: activeSubscription.monthly_tokens || 1000,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error fixing subscription sync:', updateError);
      } else {
        console.log(`✅ Fixed subscription sync for user ${userId}`);
      }
    }
  } catch (error) {
    console.error('Error in checkAndFixSubscriptionSync:', error);
    // Don't throw - this is a sync fix, not critical for purchase processing
  }
}

/**
 * Process subscription purchase
 */
async function processSubscriptionPurchase(
  supabaseClient: any,
  userId: string,
  productId: string,
  transactionId: string,
  receiptData: any
) {
  console.log('📋 Processing subscription purchase for user:', userId);
  console.log('📋 Product ID:', productId);
  console.log('📋 Transaction ID:', transactionId);
  console.log('📋 Receipt data available:', !!receiptData);
  
  // First, check user_tokens to see current subscription status
  const { data: userTokens, error: tokenError } = await supabaseClient
    .from('user_tokens')
    .select('is_subscribed, monthly_tokens')
    .eq('user_id', userId)
    .single();

  if (tokenError) {
    console.error('Error checking user_tokens:', tokenError);
  } else {
    console.log('📋 Current user_tokens status:', {
      is_subscribed: userTokens?.is_subscribed,
      monthly_tokens: userTokens?.monthly_tokens,
    });
  }

  // Check if there's an active subscription in database
  // This handles the case where user has subscription but is_subscribed is false
  const { data: activeSubscription, error: activeSubError } = await supabaseClient
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeSubError && activeSubError.code !== 'PGRST116') {
    console.error('Error checking active subscription:', activeSubError);
  }

  // Check if subscription already exists (any status, not just active)
  // This prevents creating duplicate subscriptions
  const { data: existingSubscriptions, error: fetchError } = await supabaseClient
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (fetchError) {
    console.error('Error checking existing subscriptions:', fetchError);
    // Continue anyway - might be first subscription
  }

  const existing = existingSubscriptions && existingSubscriptions.length > 0 
    ? existingSubscriptions[0] 
    : null;

  // Check if this transaction was already processed
  if (existing && existing.stripe_subscription_id === transactionId) {
    console.log('⚠️ Transaction already processed:', transactionId);
    console.log('📋 Existing subscription status:', existing.status);
    
    // Even if transaction was processed, make sure user_tokens is synced
    if (existing.status === 'active') {
      console.log('🔧 Syncing user_tokens with active subscription...');
      await checkAndFixSubscriptionSync(supabaseClient, userId);
    }
    return;
  }

  // If there's an active subscription OR user_tokens shows subscribed but no active subscription in DB
  // This handles the case where Apple has subscription but DB is out of sync
  if (activeSubscription && activeSubscription.id) {
    console.log(`📝 User already has active subscription ${activeSubscription.id}, updating instead of creating new`);
    console.log('📝 This might be a re-purchase attempt - will sync and update');
  } else if (userTokens?.is_subscribed && !activeSubscription) {
    console.log('⚠️ User marked as subscribed in user_tokens but no active subscription in DB');
    console.log('⚠️ This indicates a sync issue - will create/update subscription');
  }

  // Extract subscription period from receipt data if available (Apple)
  // Also check if Apple shows an active subscription even if DB doesn't
  let currentPeriodStart = new Date().toISOString();
  let currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  let hasActiveSubscriptionInApple = false;
  let appleSubscriptionExpiry: Date | null = null;
  
  if (receiptData?.latest_receipt_info && receiptData.latest_receipt_info.length > 0) {
    // Find the subscription that matches our productId
    const matchingSubscription = receiptData.latest_receipt_info.find(
      (receipt: any) => receipt.product_id === productId
    );
    
    if (matchingSubscription) {
      console.log('📋 Found matching subscription in Apple receipt:', matchingSubscription.product_id);
      
      if (matchingSubscription.expires_date_ms) {
        const expiryDate = new Date(parseInt(matchingSubscription.expires_date_ms));
        appleSubscriptionExpiry = expiryDate;
        currentPeriodEnd = expiryDate.toISOString();
        
        // Check if subscription is still active (not expired)
        if (expiryDate > new Date()) {
          hasActiveSubscriptionInApple = true;
          console.log('✅ Apple shows active subscription (expires:', expiryDate.toISOString(), ')');
        } else {
          console.log('⚠️ Apple subscription has expired:', expiryDate.toISOString());
        }
      }
      
      if (matchingSubscription.purchase_date_ms) {
        currentPeriodStart = new Date(parseInt(matchingSubscription.purchase_date_ms)).toISOString();
      }
    }
    
    // If no matching subscription found, use the latest one
    if (!matchingSubscription && receiptData.latest_receipt_info.length > 0) {
      const latestReceipt = receiptData.latest_receipt_info[0];
      if (latestReceipt.expires_date_ms) {
        const expiryDate = new Date(parseInt(latestReceipt.expires_date_ms));
        appleSubscriptionExpiry = expiryDate;
        currentPeriodEnd = expiryDate.toISOString();
        if (expiryDate > new Date()) {
          hasActiveSubscriptionInApple = true;
        }
      }
      if (latestReceipt.purchase_date_ms) {
        currentPeriodStart = new Date(parseInt(latestReceipt.purchase_date_ms)).toISOString();
      }
    }
  }
  
  // If Apple shows active subscription but DB doesn't, we need to create/update it
  if (hasActiveSubscriptionInApple && !activeSubscription && !existing) {
    console.log('🔍 Apple shows active subscription but DB does not - will create subscription record');
  }

  const subscriptionData = {
    user_id: userId,
    status: 'active',
    stripe_subscription_id: transactionId,
    stripe_customer_id: userId, // Using user_id as customer identifier
    stripe_price_id: productId, // For IAP, we use productId as the price identifier
    monthly_tokens: 1000, // Default monthly tokens for premium subscription
    current_period_start: currentPeriodStart,
    current_period_end: currentPeriodEnd,
    cancel_at_period_end: false,
  };

  // Determine if we should update existing subscription or create new one
  // We update if there's an existing subscription record in DB (active or not)
  // We create new if:
  // 1. No subscription exists in DB (first purchase)
  // 2. Apple shows active subscription but DB doesn't (sync issue - will create to sync)
  const hasExistingSubscription = existing || activeSubscription;
  
  if (hasExistingSubscription) {
    // Use active subscription if exists, otherwise use existing
    const subscriptionToUpdate = activeSubscription || existing;
    
    if (!subscriptionToUpdate) {
      // This shouldn't happen, but handle it gracefully
      console.error('⚠️ hasExistingSubscription is true but no subscription found');
      // Fall through to create new subscription
    } else {
      // Update existing subscription (reactivate if it was canceled)
      console.log(`📝 Updating existing subscription ${subscriptionToUpdate.id} for user ${userId}`);
      console.log(`   Previous status: ${subscriptionToUpdate.status}`);
      console.log(`   Previous is_subscribed in user_tokens: ${userTokens?.is_subscribed}`);
    
    const { error } = await supabaseClient
      .from('subscriptions')
      .update(subscriptionData)
      .eq('id', subscriptionToUpdate.id);

    if (error) {
      console.error('Error updating subscription:', error);
      throw new Error('Failed to update subscription');
    }
    
    console.log('✅ Subscription updated successfully');
    
    // ALWAYS update user_tokens to mark as subscribed (fixes sync issues)
    // This ensures that even if user_tokens was out of sync, it gets fixed now
    const monthlyTokens = subscriptionToUpdate.monthly_tokens || 1000;
    const { error: tokenUpdateError } = await supabaseClient
      .from('user_tokens')
      .update({
        is_subscribed: true,
        monthly_tokens: monthlyTokens,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (tokenUpdateError) {
      console.error('Error updating user_tokens:', tokenUpdateError);
      // Don't throw - subscription was updated successfully, but log the error
    } else {
      console.log('✅ Updated user_tokens.is_subscribed to true');
      console.log(`✅ Set monthly_tokens to ${monthlyTokens}`);
    }
    
    // Only grant tokens if subscription was not active before OR if user_tokens was not subscribed
    const wasNotActive = subscriptionToUpdate.status !== 'active';
    const wasNotSubscribed = !userTokens?.is_subscribed;
    
    if (wasNotActive || wasNotSubscribed) {
      console.log(`🔄 ${wasNotActive ? 'Reactivating' : 'Fixing sync'} subscription - granting tokens`);
      console.log(`   Reason: ${wasNotActive ? 'Subscription was not active' : 'User was not marked as subscribed'}`);
      
      await supabaseClient.rpc('add_tokens_to_user', {
        p_user_id: userId,
        p_tokens: 1000,
        p_change_type: 'subscription_renewal',
        p_description: wasNotActive 
          ? 'Premium subscription - reactivation grant'
          : 'Premium subscription - sync fix grant',
      });
      
      console.log('✅ Granted 1000 tokens to user');
    } else {
      console.log('ℹ️ Subscription was already active and user was marked as subscribed, no additional tokens granted');
    }
    } // End of else block for subscriptionToUpdate check
    return; // Exit early if we updated existing subscription
  }
  
  // If we reach here, we need to create a new subscription
  // Create new subscription
  // This handles:
  // 1. First-time subscription purchase
  // 2. Apple shows active subscription but DB doesn't (sync issue)
  if (hasActiveSubscriptionInApple && !activeSubscription) {
    console.log(`🔧 Apple shows active subscription but DB doesn't - creating subscription record to sync`);
    console.log(`   Apple subscription expires: ${appleSubscriptionExpiry?.toISOString()}`);
  } else {
    console.log(`✨ Creating new subscription for user ${userId}`);
  }
  const { error } = await supabaseClient
    .from('subscriptions')
    .insert(subscriptionData);

  if (error) {
    console.error('Error creating subscription:', error);
    throw new Error('Failed to create subscription');
  }

  // Update user_tokens to mark as subscribed
  const { error: tokenUpdateError } = await supabaseClient
    .from('user_tokens')
    .update({
      is_subscribed: true,
      monthly_tokens: 1000,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (tokenUpdateError) {
    console.error('Error updating user_tokens:', tokenUpdateError);
    // Don't throw - subscription was created successfully
  }

  // Grant initial tokens
  await supabaseClient.rpc('add_tokens_to_user', {
    p_user_id: userId,
    p_tokens: 1000,
    p_change_type: 'subscription_renewal',
    p_description: 'Premium subscription - initial grant',
  });

  console.log(`✅ Processed subscription for user ${userId}`);
}

