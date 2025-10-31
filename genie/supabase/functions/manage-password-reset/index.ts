import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PasswordResetRequest {
  action: 'send-otp' | 'verify-otp' | 'reset-password';
  email?: string;
  phone?: string;
  otp?: string;
  newPassword?: string;
  resetToken?: string;
}

// Generate secure 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send SMS via Twilio
async function sendTwilioSMS(to: string, message: string): Promise<{ success: boolean; error?: string }> {
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    console.error('❌ Twilio credentials not configured');
    console.error('Missing credentials:', {
      hasSid: !!twilioAccountSid,
      hasToken: !!twilioAuthToken,
      hasPhone: !!twilioPhoneNumber
    });
    return { success: false, error: 'SMS service not configured. Please contact support.' };
  }

  try {
    console.log(`📱 Sending SMS to: ${to}`);
    
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    
    const body = new URLSearchParams({
      To: to,
      From: twilioPhoneNumber,
      Body: message,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      console.error(`❌ Twilio API error:`, responseData);
      return { success: false, error: `SMS delivery failed: ${responseData.message || response.statusText}` };
    }

    console.log(`✅ SMS sent successfully! SID: ${responseData.sid}`);
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
  console.log(`🚀 [${requestId}] Password reset request started`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { action, email, phone, otp, newPassword, resetToken }: PasswordResetRequest = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Action is required', requestId }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // ACTION: SEND OTP (via SMS)
    // ============================================
    if (action === 'send-otp') {
      console.log(`📱 [${requestId}] Sending password reset OTP for phone: ${phone}`);

      if (!phone) {
        return new Response(
          JSON.stringify({ success: false, error: 'Phone number is required', requestId }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find user by phone number
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, phone_number')
        .eq('phone_number', phone)
        .single();

      if (userError || !userData) {
        console.error(`❌ [${requestId}] User not found for phone: ${phone}`);
        // Don't reveal if phone exists or not - security
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'If this phone number is registered, an SMS will be sent.',
            requestId 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userId = userData.id;
      const userEmail = userData.email;
      const phoneNumber = userData.phone_number;

      // Check for cooldown (60 seconds)
      const { data: existingReset } = await supabase
        .from('password_reset_verifications')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existingReset && existingReset.last_otp_sent_at) {
        const timeSinceLastOtp = Date.now() - new Date(existingReset.last_otp_sent_at).getTime();
        const COOLDOWN_PERIOD = 60 * 1000; // 60 seconds
        
        if (timeSinceLastOtp < COOLDOWN_PERIOD) {
          const cooldownRemaining = Math.ceil((COOLDOWN_PERIOD - timeSinceLastOtp) / 1000);
          console.log(`⏳ [${requestId}] Cooldown active: ${cooldownRemaining} seconds remaining`);
          
          return new Response(
            JSON.stringify({
              success: false,
              error: `Please wait ${cooldownRemaining} seconds before requesting a new code`,
              cooldownRemaining,
              requestId
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Generate new OTP
      const otpCode = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Save or update reset verification
      const { error: upsertError } = await supabase
        .from('password_reset_verifications')
        .upsert({
          user_id: userId,
          phone_number: phoneNumber,
          otp_code: otpCode,
          otp_expires_at: expiresAt.toISOString(),
          otp_attempts: 0,
          last_otp_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (upsertError) {
        console.error(`❌ [${requestId}] Failed to save OTP:`, upsertError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to generate OTP', requestId }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Send SMS via Twilio
      const maskedPhone = phoneNumber.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2');
      const smsMessage = `Your Genie password reset code is: ${otpCode}\n\nThis code expires in 10 minutes.\n\nDon't share this code with anyone.`;
      
      console.log(`📤 [${requestId}] Sending SMS to ${phoneNumber}`);
      const smsResult = await sendTwilioSMS(phoneNumber, smsMessage);

      if (!smsResult.success) {
        console.error(`❌ [${requestId}] SMS failed:`, smsResult.error);
        // Clear the OTP if SMS failed
        await supabase
          .from('password_reset_verifications')
          .update({
            otp_code: null,
            otp_expires_at: null,
            otp_attempts: 0,
          })
          .eq('user_id', userId);

        return new Response(
          JSON.stringify({ success: false, error: smsResult.error, requestId }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`✅ [${requestId}] OTP SMS sent successfully`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Verification code sent to your phone',
          phone: maskedPhone,
          email: userEmail, // Return email so client knows which account
          expiresIn: 600,
          requestId
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // ACTION: VERIFY OTP
    // ============================================
    if (action === 'verify-otp') {
      console.log(`🔐 [${requestId}] Verifying password reset OTP`);

      if (!email || !otp) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Email and OTP are required',
            requestId 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        console.error(`❌ [${requestId}] User not found`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid verification code',
            requestId 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get reset verification
      const { data: resetData, error: resetError } = await supabase
        .from('password_reset_verifications')
        .select('*')
        .eq('user_id', userData.id)
        .single();

      if (resetError || !resetData) {
        console.error(`❌ [${requestId}] No reset request found`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No verification code found. Please request a new code.',
            requestId 
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if OTP expired
      if (!resetData.otp_expires_at || new Date(resetData.otp_expires_at) < new Date()) {
        console.error(`❌ [${requestId}] OTP expired`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Code expired. Please request a new code.',
            requestId 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check attempts
      if (resetData.otp_attempts >= 5) {
        // Reset OTP after too many attempts
        await supabase
          .from('password_reset_verifications')
          .update({
            otp_code: null,
            otp_expires_at: null,
            otp_attempts: 0,
          })
          .eq('user_id', userData.id);

        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Too many failed attempts. Please request a new code.',
            requestId 
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify OTP
      if (resetData.otp_code !== otp) {
        console.log(`❌ [${requestId}] Invalid OTP`);
        
        // Increment attempts
        const newAttempts = resetData.otp_attempts + 1;
        await supabase
          .from('password_reset_verifications')
          .update({ otp_attempts: newAttempts })
          .eq('user_id', userData.id);

        const attemptsLeft = 5 - newAttempts;
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Invalid code. ${attemptsLeft} ${attemptsLeft === 1 ? 'attempt' : 'attempts'} remaining`,
            attemptsLeft,
            requestId 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // OTP is correct! Generate reset token
      const resetTokenValue = crypto.randomUUID();
      const resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await supabase
        .from('password_reset_verifications')
        .update({
          otp_code: null, // Clear OTP after successful verification
          otp_expires_at: null,
          otp_attempts: 0,
          reset_token: resetTokenValue,
          reset_token_expires_at: resetTokenExpires.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userData.id);

      console.log(`✅ [${requestId}] OTP verified successfully`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Code verified successfully',
          resetToken: resetTokenValue,
          expiresIn: 900, // 15 minutes
          requestId
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // ACTION: RESET PASSWORD
    // ============================================
    if (action === 'reset-password') {
      console.log(`🔐 [${requestId}] Resetting password`);

      if (!resetToken || !newPassword) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Reset token and new password are required',
            requestId 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate password strength
      if (newPassword.length < 8) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Password must be at least 8 characters long',
            requestId 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find reset verification by token
      const { data: resetData, error: resetError } = await supabase
        .from('password_reset_verifications')
        .select('*')
        .eq('reset_token', resetToken)
        .single();

      if (resetError || !resetData) {
        console.error(`❌ [${requestId}] Invalid reset token`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid or expired reset token',
            requestId 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if token expired
      if (!resetData.reset_token_expires_at || new Date(resetData.reset_token_expires_at) < new Date()) {
        console.error(`❌ [${requestId}] Reset token expired`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Reset token expired. Please start the process again.',
            requestId 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update password using admin API
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        resetData.user_id,
        { password: newPassword }
      );

      if (updateError) {
        console.error(`❌ [${requestId}] Failed to update password:`, updateError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to update password. Please try again.',
            requestId 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Clear reset verification
      await supabase
        .from('password_reset_verifications')
        .delete()
        .eq('user_id', resetData.user_id);

      console.log(`✅ [${requestId}] Password reset successfully`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Password reset successfully',
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

