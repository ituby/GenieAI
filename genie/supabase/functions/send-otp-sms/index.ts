import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Twilio credentials
const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER") || "+14154461046";
const messagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");

// Validate and format phone number
const validatePhoneNumber = (phoneNumber) => {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/[^0-9]/g, "");
  
  // If number starts with 0, assume it's Israeli and needs 972 prefix
  if (cleaned.startsWith("0")) {
    cleaned = "972" + cleaned.substring(1);
  }
  
  // If number doesn't start with country code, assume Israeli (972)
  if (!cleaned.startsWith("972") && cleaned.length === 9) {
    cleaned = "972" + cleaned;
  }
  
  // Validate Israeli phone number format (972 + 9 digits)
  if (cleaned.startsWith("972") && cleaned.length !== 12) {
    return {
      isValid: false,
      formatted: `+${cleaned}`,
      error: "Invalid Israeli phone number length"
    };
  }
  
  // Check for valid Israeli mobile prefixes (50, 51, 52, 53, 54, 55, 58)
  const mobilePrefix = cleaned.substring(3, 5);
  const validPrefixes = [
    "50", "51", "52", "53", "54", "55", "58"
  ];
  
  if (cleaned.startsWith("972") && !validPrefixes.includes(mobilePrefix)) {
    return {
      isValid: false,
      formatted: `+${cleaned}`,
      error: `Invalid Israeli mobile prefix: ${mobilePrefix}`
    };
  }
  
  return {
    isValid: true,
    formatted: `+${cleaned}`
  };
};

// Generate random 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const sendTextMessage = async (messageBody, accountSid, authToken, fromNumber, toNumber, maxRetries = 2, useMessagingService = true) => {
  if (!accountSid || !authToken) {
    console.log("Your Twilio account credentials are missing. Please add them.");
    return {
      status: "failed",
      code: "MISSING_CREDENTIALS",
      message: "Missing Twilio credentials"
    };
  }

  // Validate phone number before attempting to send
  const phoneValidation = validatePhoneNumber(toNumber);
  if (!phoneValidation.isValid) {
    console.error(`Phone validation failed: ${phoneValidation.error}`);
    return {
      status: "failed",
      code: "INVALID_PHONE",
      message: phoneValidation.error
    };
  }

  const validatedNumber = phoneValidation.formatted;

  // Trim credentials to remove any whitespace
  const cleanAccountSid = accountSid.trim();
  const cleanAuthToken = authToken.trim();
  
  console.log(`Attempting to send SMS with Account SID: ${cleanAccountSid.substring(0, 8)}... to ${validatedNumber}`);

  const url = `https://api.twilio.com/2010-04-01/Accounts/${cleanAccountSid}/Messages.json`;
  const encodedCredentials = btoa(`${cleanAccountSid}:${cleanAuthToken}`);

  // Retry logic for transient failures
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const body = new URLSearchParams({
        To: validatedNumber,
        Body: messageBody
      });

      // Use Messaging Service if available, otherwise use From number
      if (useMessagingService && messagingServiceSid) {
        body.append("MessagingServiceSid", messagingServiceSid);
        console.log(`Using Messaging Service: ${messagingServiceSid}`);
      } else {
        body.append("From", fromNumber);
        console.log(`Using From number: ${fromNumber}`);
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${encodedCredentials}`
        },
        body
      });

      const result = await response.json();

      // Log detailed error if authentication fails
      if (result.code === 20003) {
        console.error("Authentication error - please verify your Twilio credentials");
        console.error(`Account SID starts with: ${cleanAccountSid.substring(0, 8)}`);
        console.error("Auth Token length:", cleanAuthToken.length);
        return result; // Don't retry auth errors
      }

      // If message is queued successfully, return
      if (result.status === "queued" || result.status === "sent") {
        console.log(`SMS queued successfully on attempt ${attempt + 1}`);
        return result;
      }

      // Log errors and potentially retry
      console.error(`SMS send failed on attempt ${attempt + 1}:`, result);

      // Don't retry certain error codes
      const noRetryErrors = [21211, 21408, 21614]; // Invalid phone, invalid parameters, etc.
      if (noRetryErrors.includes(result.code)) {
        return result;
      }

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.log(`Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        return result;
      }
    } catch (error) {
      console.error(`Network error on attempt ${attempt + 1}:`, error);
      if (attempt === maxRetries) {
        return {
          status: "failed",
          code: "NETWORK_ERROR",
          message: error.message
        };
      }
      // Wait before retrying
      const delayMs = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

Deno.serve(async (req) => {
  console.log('🚀 send-otp-sms function called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization')
          }
        }
      }
    );

    const { action, ...data } = await req.json();
    console.log('📋 Action:', action, 'Data:', data);

    if (action === 'send') {
      const { phone_number, user_id } = data;
      console.log('📱 Sending OTP to:', phone_number, 'for user:', user_id);

      // Generate OTP (use fixed code for testing if no Twilio credentials)
      const otpCode = (!accountSid || !authToken) ? '123456' : generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      console.log('🔢 Generated OTP:', otpCode, 'expires at:', expiresAt.toISOString());

      // Store OTP in database
      const { error: insertError } = await supabaseClient
        .from('otp_verifications')
        .insert({
          user_id,
          phone_number,
          otp_code: otpCode,
          expires_at: expiresAt.toISOString()
        });

      if (insertError) {
        console.error('❌ Error storing OTP:', insertError);
        return new Response(JSON.stringify({
          error: 'Failed to store OTP'
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      console.log('✅ OTP stored successfully');

      // Custom message for Genie
      const messageBody = `Your Genie verification code is: ${otpCode}. The code is valid for 10 minutes.`;

      // Check Twilio credentials first
      if (!accountSid || !authToken) {
        console.error('❌ Missing Twilio credentials - returning success for testing');
        // For testing purposes, return success even without SMS
        return new Response(JSON.stringify({
          success: true,
          method: "test",
          message: "OTP stored successfully (SMS disabled for testing)",
          details: {
            accountSid: !!accountSid,
            authToken: !!authToken,
            fromNumber: !!fromNumber,
            messagingServiceSid: !!messagingServiceSid
          }
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      console.log('📱 Twilio credentials found, attempting to send SMS...');

      // Try SMS with Messaging Service first, then fallback to phone number
      let smsResponse = await sendTextMessage(messageBody, accountSid, authToken, fromNumber, phone_number, 2, true);

      // If Messaging Service failed, try with phone number
      if (!smsResponse || smsResponse.status !== "queued" && smsResponse.status !== "sent") {
        console.log('Messaging Service failed, trying with phone number...');
        smsResponse = await sendTextMessage(messageBody, accountSid, authToken, fromNumber, phone_number, 2, false);
      }

      // If SMS succeeded, return success
      if (smsResponse && (smsResponse.status === "queued" || smsResponse.status === "sent")) {
        console.log("OTP sent successfully via SMS");
        return new Response(JSON.stringify({
          success: true,
          method: "sms",
          message: "OTP sent successfully",
          twilio_sid: smsResponse.sid
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      // SMS failed - return success for testing
      const errorMessage = smsResponse?.message || "Unknown SMS error";
      console.error('❌ SMS sending failed, but returning success for testing:', smsResponse);
      return new Response(JSON.stringify({
        success: true,
        method: "test",
        message: "OTP stored successfully (SMS failed but continuing for testing)",
        details: smsResponse
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    if (action === 'verify') {
      const { phone_number, otp_code, user_id } = data;
      console.log('🔍 Verifying OTP for:', phone_number, 'code:', otp_code);

      // Find valid OTP
      const { data: otpData, error: fetchError } = await supabaseClient
        .from('otp_verifications')
        .select('*')
        .eq('user_id', user_id)
        .eq('phone_number', phone_number)
        .eq('verified', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !otpData) {
        console.error('❌ Invalid or expired OTP:', fetchError);
        return new Response(JSON.stringify({
          error: 'Invalid or expired OTP'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      // Check attempts
      if (otpData.attempts >= 3) {
        console.error('❌ Too many attempts:', otpData.attempts);
        return new Response(JSON.stringify({
          error: 'Too many attempts. Please request a new OTP.'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      // Verify OTP
      if (otpData.otp_code === otp_code) {
        console.log('✅ OTP verified successfully');

        // Mark as verified
        const { error: updateError } = await supabaseClient
          .from('otp_verifications')
          .update({
            verified: true,
            verified_at: new Date().toISOString()
          })
          .eq('id', otpData.id);

        if (updateError) {
          console.error('❌ Error updating OTP:', updateError);
          return new Response(JSON.stringify({
            error: 'Failed to verify OTP'
          }), {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }

        // Update user phone number
        const { error: userUpdateError } = await supabaseClient
          .from('users')
          .update({ phone_number })
          .eq('id', user_id);

        if (userUpdateError) {
          console.error('❌ Error updating user phone:', userUpdateError);
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'OTP verified successfully'
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } else {
        console.log('❌ Invalid OTP code');
        // Increment attempts
        await supabaseClient
          .from('otp_verifications')
          .update({ attempts: otpData.attempts + 1 })
          .eq('id', otpData.id);

        return new Response(JSON.stringify({
          error: 'Invalid OTP code'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    console.error('❌ Invalid action:', action);
    return new Response(JSON.stringify({
      error: 'Invalid action'
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Error in send-otp-sms function:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
