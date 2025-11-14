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

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get user from token
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const body: IAPReceiptRequest = await req.json();
    const { platform, productId, transactionReceipt, transactionId, purchaseToken } = body;

    console.log('📱 Validating receipt:', { platform, productId, transactionId });

    let isValid = false;
    let receiptData: any = null;

    // Validate receipt based on platform
    if (platform === 'ios') {
      const validation = await validateAppleReceipt(transactionReceipt);
      isValid = validation.isValid;
      receiptData = validation.data;
      
      // Log validation errors for debugging
      if (!isValid && validation.error) {
        console.error('❌ Apple receipt validation error:', validation.error);
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

    // Determine token amount based on product ID
    const tokenAmount = getTokenAmountFromProductId(productId);
    
    // Check if it's a subscription
    const isSubscription = productId.includes('premium');

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
  const { data: existing } = await supabaseClient
    .from('payments')
    .select('id')
    .eq('stripe_payment_id', transactionId)
    .single();

  if (existing) {
    console.log('⚠️ Transaction already processed:', transactionId);
    return;
  }

  // Create payment record
  const { data: paymentRecord, error: paymentError } = await supabaseClient.from('payments').insert({
    user_id: userId,
    amount: 0, // IAP doesn't expose the actual amount
    currency: 'USD',
    status: 'succeeded',
    stripe_payment_id: transactionId,
    payment_type: 'token_purchase',
    tokens_amount: tokenAmount,
    metadata: {
      platform: receiptData.platform || 'mobile',
      productId,
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
 * Process subscription purchase
 */
async function processSubscriptionPurchase(
  supabaseClient: any,
  userId: string,
  productId: string,
  transactionId: string,
  receiptData: any
) {
  // Check if subscription already exists
  const { data: existing } = await supabaseClient
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  const subscriptionData = {
    user_id: userId,
    status: 'active',
    stripe_subscription_id: transactionId,
    stripe_customer_id: userId, // Using user_id as customer identifier
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    cancel_at_period_end: false,
    plan_id: productId,
    plan_name: 'Premium',
  };

  if (existing) {
    // Update existing subscription
    const { error } = await supabaseClient
      .from('subscriptions')
      .update(subscriptionData)
      .eq('id', existing.id);

    if (error) {
      console.error('Error updating subscription:', error);
      throw new Error('Failed to update subscription');
    }
  } else {
    // Create new subscription
    const { error } = await supabaseClient
      .from('subscriptions')
      .insert(subscriptionData);

    if (error) {
      console.error('Error creating subscription:', error);
      throw new Error('Failed to create subscription');
    }

    // Grant initial tokens
    await supabaseClient.rpc('add_tokens_to_user', {
      p_user_id: userId,
      p_tokens: 1000,
      p_change_type: 'subscription_renewal',
      p_description: 'Premium subscription - initial grant',
    });
  }

  console.log(`✅ Processed subscription for user ${userId}`);
}

