import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface SendOtpRequest {
  email: string;
  password: string;
  type?: 'sms' | 'whatsapp';
}

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send SMS via Twilio
async function sendSMSViaTwilio(
  to: string,
  otp: string
): Promise<{ success: boolean; error?: string }> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const messagingServiceSid = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID');
  const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!accountSid || !authToken) {
    return { success: false, error: 'Twilio credentials not configured' };
  }

  if (!messagingServiceSid && !twilioPhoneNumber) {
    return {
      success: false,
      error: 'Twilio phone number or messaging service not configured',
    };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const body = new URLSearchParams({
    To: to,
    Body: `Your Genie verification code is: ${otp}. Valid for 10 minutes.`,
    ...(messagingServiceSid
      ? { MessagingServiceSid: messagingServiceSid }
      : { From: twilioPhoneNumber! }),
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Twilio error:', error);
      return { success: false, error: 'Failed to send SMS' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return { success: false, error: 'Failed to send SMS' };
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
    console.log(`📱 [${requestId}] Send OTP SMS request received`);

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { email, password, type = 'sms' }: SendOtpRequest = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({
          error: 'Email and password are required',
          requestId,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`📱 [${requestId}] Validating credentials for: ${email}`);

    // Step 1: Validate email and password
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !authData.user) {
      console.error(`❌ [${requestId}] Invalid credentials:`, authError);
      return new Response(
        JSON.stringify({
          error: 'Invalid email or password',
          requestId,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const userId = authData.user.id;
    console.log(`✅ [${requestId}] Credentials validated for user: ${userId}`);

    // Step 2: Get user's phone number from the database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('phone_number')
      .eq('id', userId)
      .single();

    if (userError || !userData?.phone_number) {
      console.error(`❌ [${requestId}] Phone number not found:`, userError);
      return new Response(
        JSON.stringify({
          error:
            'Phone number not found in system. Please update your profile.',
          requestId,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const phone = userData.phone_number;
    console.log(
      `📱 [${requestId}] Found phone number for user, sending OTP...`
    );

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone)) {
      return new Response(
        JSON.stringify({
          error:
            'Invalid phone number format in database. Please update your profile.',
          requestId,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Step 3: Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    console.log(`🔐 [${requestId}] Generated OTP for user: ${userId}`);
    console.log(`🔐 [${requestId}] OTP code: ${otp}`);
    console.log(`🔐 [${requestId}] Phone number: ${phone}`);
    console.log(`🔐 [${requestId}] Expires at: ${expiresAt.toISOString()}`);

    // Step 4: Save OTP to database
    const { data: insertedOtp, error: otpError } = await supabase
      .from('otp_verifications')
      .insert({
        user_id: userId,
        phone_number: phone,
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
        verified: false,
      })
      .select()
      .single();

    if (otpError) {
      console.error(`❌ [${requestId}] Error saving OTP:`, otpError);
      console.error(
        `❌ [${requestId}] Error details:`,
        JSON.stringify(otpError)
      );
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

    // Step 5: Send SMS via Twilio
    const smsResult = await sendSMSViaTwilio(phone, otp);

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

    console.log(`✅ [${requestId}] OTP sent successfully to ${phone}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'OTP sent successfully',
        phone: phone, // Return full phone number for verification
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
