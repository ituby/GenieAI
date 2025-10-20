import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OtpRequest {
  action: 'send' | 'verify';
  email: string;
  password?: string;
  phone?: string;
  otp?: string;
}

// Generate secure 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send SMS via Twilio
async function sendTwilioSMS(phoneNumber: string, otp: string): Promise<{ success: boolean; error?: string }> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: 'SMS service not configured' };
  }

  try {
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const credentials = btoa(`${accountSid}:${authToken}`);
    
    const body = new URLSearchParams({
      To: phoneNumber,
      From: fromNumber,
      Body: `Your Genie verification code is: ${otp}\n\nThis code expires in 10 minutes.`
    });

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString()
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ Twilio error: ${response.status} - ${errorData}`);
      return { success: false, error: 'SMS delivery failed' };
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Twilio request failed:', error);
    return { success: false, error: 'SMS service temporarily unavailable' };
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`🚀 [${requestId}] OTP request started`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { action, email, password, phone, otp }: OtpRequest = await req.json();

    if (!action || !email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Action and email are required', requestId }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // ACTION: SEND OTP
    // ============================================
    if (action === 'send') {
      console.log(`📱 [${requestId}] Sending OTP for: ${email}`);

      let userId: string;
      let userPhone: string;
      let isRegistration = false;

      if (phone) {
        // Registration flow - phone provided
        // First try to get user from public.users
        let userData = await supabase
          .from('users')
          .select('id, phone_verified')
          .eq('email', email)
          .single();

        // If not found in public.users, try auth.users (might be very new user)
        if (userData.error || !userData.data) {
          console.log(`⏳ [${requestId}] User not in public.users yet, checking auth.users`);
          
          const { data: usersList } = await supabase.auth.admin.listUsers({
            page: 1,
            perPage: 1000
          });
          
          const authUser = usersList?.users.find(u => u.email === email);
          
          if (!authUser) {
            return new Response(
              JSON.stringify({ success: false, error: 'User not found', requestId }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          userId = authUser.id;
          isRegistration = true; // New user, definitely registration
        } else {
          userId = userData.data.id;
          isRegistration = !userData.data.phone_verified;
        }

        userPhone = phone;
      } else {
        // Login flow - no phone provided, get from DB by email
        // Password validation already happened in client-side signIn()
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, phone_number, phone_verified')
          .eq('email', email)
          .single();

        if (userError || !userData) {
          console.error(`❌ [${requestId}] User not found`);
          return new Response(
            JSON.stringify({ success: false, error: 'User not found', requestId }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!userData.phone_number) {
          return new Response(
            JSON.stringify({ success: false, error: 'No phone number found', requestId }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        userId = userData.id;
        userPhone = userData.phone_number;
        isRegistration = !userData.phone_verified; // If not verified, it's registration OTP
      }

      // Ensure phone number has + prefix
      if (!userPhone.startsWith('+')) {
        userPhone = '+' + userPhone;
      }

      console.log(`📱 [${requestId}] User: ${userId}, Phone: ${userPhone}, Type: ${isRegistration ? 'REGISTRATION' : 'LOGIN'}`);

      // Check for existing valid OTP of the same type
      const otpType = isRegistration ? 'registration' : 'login';
      const { data: existingOtp } = await supabase
        .from('otp_verifications')
        .select('id, otp_code, expires_at, type')
        .eq('user_id', userId)
        .eq('type', otpType)
        .eq('verified', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      let otpCode: string;

      if (existingOtp && existingOtp.length > 0) {
        // Reuse existing OTP
        console.log(`🔄 [${requestId}] Reusing existing OTP`);
        otpCode = existingOtp[0].otp_code;
        
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Using existing OTP',
            phone: userPhone,
            expiresIn: Math.floor((new Date(existingOtp[0].expires_at).getTime() - Date.now()) / 1000),
            requestId
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate new OTP
      otpCode = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Clean old unverified OTPs of the same type
      await supabase
        .from('otp_verifications')
        .delete()
        .eq('user_id', userId)
        .eq('type', otpType)
        .eq('verified', false);

      // Save new OTP with type
      const { error: otpError } = await supabase
        .from('otp_verifications')
        .insert({
          user_id: userId,
          phone_number: userPhone,
          otp_code: otpCode,
          expires_at: expiresAt.toISOString(),
          verified: false,
          attempts: 0,
          type: otpType
        });

      if (otpError) {
        console.error(`❌ [${requestId}] Failed to save OTP:`, otpError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to generate OTP', requestId }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Send SMS
      const smsResult = await sendTwilioSMS(userPhone, otpCode);

      if (!smsResult.success) {
        console.error(`❌ [${requestId}] SMS failed:`, smsResult.error);
        // Clean up OTP if SMS failed
        await supabase
          .from('otp_verifications')
          .delete()
          .eq('user_id', userId)
          .eq('verified', false);

        return new Response(
          JSON.stringify({ success: false, error: smsResult.error, requestId }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`✅ [${requestId}] OTP sent successfully`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'OTP sent successfully',
          phone: userPhone,
          expiresIn: 600,
          type: isRegistration ? 'registration' : 'login',
          requestId
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // ACTION: VERIFY OTP
    // ============================================
    if (action === 'verify') {
      console.log(`🔐 [${requestId}] Verifying OTP for: ${email}`);

      if (!otp || !phone) {
        return new Response(
          JSON.stringify({ success: false, error: 'OTP and phone required', requestId }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, phone_verified')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        console.error(`❌ [${requestId}] User not found for email: ${email}`);
        return new Response(
          JSON.stringify({ success: false, error: 'User not found', requestId }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`📱 [${requestId}] Looking for OTP with phone: ${phone}`);

      // Find valid OTP - try exact match first
      let { data: otpData, error: otpError } = await supabase
        .from('otp_verifications')
        .select('*')
        .eq('user_id', userData.id)
        .eq('phone_number', phone)
        .eq('verified', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      // If not found and phone doesn't have +, try with +
      if ((!otpData || otpData.length === 0) && !phone.startsWith('+')) {
        console.log(`📱 [${requestId}] Exact match not found, trying with + prefix`);
        const phoneWithPlus = '+' + phone;
        ({ data: otpData, error: otpError } = await supabase
          .from('otp_verifications')
          .select('*')
          .eq('user_id', userData.id)
          .eq('phone_number', phoneWithPlus)
          .eq('verified', false)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1));
      }

      // If still not found and phone has +, try without +
      if ((!otpData || otpData.length === 0) && phone.startsWith('+')) {
        console.log(`📱 [${requestId}] Exact match not found, trying without + prefix`);
        const phoneWithoutPlus = phone.substring(1);
        ({ data: otpData, error: otpError } = await supabase
          .from('otp_verifications')
          .select('*')
          .eq('user_id', userData.id)
          .eq('phone_number', phoneWithoutPlus)
          .eq('verified', false)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1));
      }

      if (otpError || !otpData || otpData.length === 0) {
        console.error(`❌ [${requestId}] No valid OTP found for user ${userData.id} with phone ${phone}`);
        return new Response(
          JSON.stringify({ success: false, error: 'No valid OTP found', requestId }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const otpRecord = otpData[0];
      console.log(`🔍 [${requestId}] Found OTP record, attempts: ${otpRecord.attempts}, stored phone: ${otpRecord.phone_number}`);

      // Check attempts
      if (otpRecord.attempts >= 5) {
        await supabase
          .from('otp_verifications')
          .delete()
          .eq('id', otpRecord.id);

        return new Response(
          JSON.stringify({ success: false, error: 'Too many attempts', requestId }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify OTP
      if (otpRecord.otp_code !== otp) {
        console.log(`❌ [${requestId}] Invalid OTP: expected ${otpRecord.otp_code}, got ${otp}`);
        // Increment attempts
        await supabase
          .from('otp_verifications')
          .update({ attempts: otpRecord.attempts + 1 })
          .eq('id', otpRecord.id);

        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid OTP', 
            attemptsLeft: 5 - (otpRecord.attempts + 1),
            requestId 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // OTP is correct - mark as verified
      await supabase
        .from('otp_verifications')
        .update({ verified: true, verified_at: new Date().toISOString() })
        .eq('id', otpRecord.id);

      // If this was registration OTP, mark phone as verified and save phone number
      if (!userData.phone_verified) {
        await supabase
          .from('users')
          .update({ 
            phone_verified: true, 
            phone_number: otpRecord.phone_number,
            updated_at: new Date().toISOString() 
          })
          .eq('id', userData.id);
      }

      console.log(`✅ [${requestId}] OTP verified successfully`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'OTP verified successfully',
          userId: userData.id,
          requestId
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Invalid action
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action', requestId }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`❌ [${requestId}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error', requestId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

