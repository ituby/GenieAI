import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface SendOtpRegistrationRequest {
  email: string;
  phone: string;
}

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send SMS via Twilio
async function sendSMSViaTwilio(phoneNumber: string, otp: string) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    return {
      success: false,
      error: 'Twilio configuration missing',
    };
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: phoneNumber,
          From: fromNumber,
          Body: `Your Genie verification code is: ${otp}`,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Twilio API error: ${response.status} - ${errorText}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to send SMS: ${error.message}`,
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const requestId = crypto.randomUUID();
    console.log(`📱 [${requestId}] Send OTP Registration request received`);

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { email, phone }: SendOtpRegistrationRequest = await req.json();

    if (!email || !phone) {
      return new Response(
        JSON.stringify({
          error: 'Email and phone are required',
          requestId,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`📱 [${requestId}] Registration OTP for: ${email}, phone: ${phone}`);

    // Check if user exists in public.users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, phone_number')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      console.error(`❌ [${requestId}] User not found in public.users:`, userError);
      return new Response(
        JSON.stringify({
          error: 'User not found. Please complete registration first.',
          requestId,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Always update phone number for registration
    console.log(`📱 [${requestId}] Updating phone number for user: ${userData.id}`);
    const { error: updateError } = await supabase
      .from('users')
      .update({ phone_number: phone })
      .eq('id', userData.id);

    if (updateError) {
      console.error(`❌ [${requestId}] Error updating phone number:`, updateError);
      return new Response(
        JSON.stringify({
          error: 'Failed to update phone number. Please try again.',
          requestId,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const userId = userData.id;
    const phoneNumber = phone;

    console.log(
      `📱 [${requestId}] Using phone number: ${phoneNumber}, sending OTP...`
    );

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid phone number format',
          requestId,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    console.log(`🔐 [${requestId}] Generated OTP for user: ${userId}`);
    console.log(`🔐 [${requestId}] OTP code: ${otp}`);
    console.log(`🔐 [${requestId}] Phone number: ${phoneNumber}`);
    console.log(`🔐 [${requestId}] Expires at: ${expiresAt.toISOString()}`);

    // Save OTP to database
    const { data: insertedOtp, error: otpError } = await supabase
      .from('otp_verifications')
      .insert({
        user_id: userId,
        phone_number: phoneNumber,
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
        verified: false,
      })
      .select()
      .single();

    if (otpError) {
      console.error(`❌ [${requestId}] Error saving OTP:`, otpError);
      return new Response(
        JSON.stringify({
          error: 'Failed to generate OTP',
          requestId,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(
      `✅ [${requestId}] OTP saved to database. Record:`,
      JSON.stringify(insertedOtp)
    );

    // Send SMS via Twilio
    const smsResult = await sendSMSViaTwilio(phoneNumber, otp);

    if (!smsResult.success) {
      console.error(`❌ [${requestId}] Error sending SMS:`, smsResult.error);
      return new Response(
        JSON.stringify({
          error: smsResult.error || 'Failed to send SMS',
          requestId,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`✅ [${requestId}] OTP sent successfully to ${phoneNumber}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'OTP sent successfully',
        phone: phoneNumber,
        requestId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});