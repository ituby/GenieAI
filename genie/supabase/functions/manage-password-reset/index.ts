import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PasswordResetRequest {
  action: 'send-otp' | 'verify-otp' | 'reset-password';
  email?: string;
  otp?: string;
  newPassword?: string;
  resetToken?: string;
}

// Generate secure 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via Resend Email
async function sendResendEmail(email: string, otp: string): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');

  if (!resendApiKey) {
    return { success: false, error: 'Email service not configured' };
  }

  try {
    console.log(`📧 Preparing to send password reset email to: ${email}`);
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header { text-align: center; margin-bottom: 40px; }
            .logo { font-size: 32px; font-weight: bold; color: #FFFF68; }
            .otp-box { background: #f5f5f5; border: 2px solid #FFFF68; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
            .otp-code { font-size: 48px; font-weight: bold; letter-spacing: 8px; color: #000; margin: 20px 0; }
            .message { color: #666; line-height: 1.6; margin: 20px 0; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 40px; }
            .warning { color: #ff6b6b; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🧞 Genie AI</div>
            </div>
            
            <h2>Password Reset Verification Code</h2>
            <p class="message">
              You requested to reset your password. Enter this verification code to continue:
            </p>
            
            <div class="otp-box">
              <div style="color: #666; font-size: 14px; margin-bottom: 10px;">Verification Code</div>
              <div class="otp-code">${otp}</div>
              <div style="color: #666; font-size: 14px; margin-top: 10px;">This code expires in 10 minutes</div>
            </div>
            
            <p class="message warning">
              ⚠️ Never share this code with anyone. Genie will never ask for your verification code.
            </p>
            
            <p class="message">
              If you didn't request a password reset, please ignore this email and your password will remain unchanged.
            </p>
            
            <div class="footer">
              <p>© 2024 Genie AI - Your AI-powered goal companion</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailPayload = {
      from: 'Genie AI <auth@askgenie.info>',
      to: email,
      subject: `Your Genie Password Reset Code: ${otp}`,
      html: emailHtml,
    };
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error(`❌ Resend API error: ${response.status}`, responseData);
      return { success: false, error: `Email delivery failed: ${responseData.message || response.statusText}` };
    }

    console.log(`✅ Email sent successfully via Resend! ID: ${responseData.id}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Resend request failed:', error);
    return { success: false, error: 'Email service temporarily unavailable' };
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
    
    const { action, email, otp, newPassword, resetToken }: PasswordResetRequest = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Action is required', requestId }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // ACTION: SEND OTP (via Email)
    // ============================================
    if (action === 'send-otp') {
      console.log(`📧 [${requestId}] Sending password reset OTP for email: ${email}`);

      if (!email) {
        return new Response(
          JSON.stringify({ success: false, error: 'Email is required', requestId }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find user by email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        console.error(`❌ [${requestId}] User not found for email: ${email}`);
        // Don't reveal if email exists or not - security
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'If this email is registered, a verification code will be sent.',
            requestId 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userId = userData.id;
      const userEmail = userData.email;

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

      // Send Email via Resend
      console.log(`📤 [${requestId}] Sending password reset email to ${userEmail}`);
      const emailResult = await sendResendEmail(userEmail, otpCode);

      if (!emailResult.success) {
        console.error(`❌ [${requestId}] Email failed:`, emailResult.error);
        // Clear the OTP if email failed
        await supabase
          .from('password_reset_verifications')
          .update({
            otp_code: null,
            otp_expires_at: null,
            otp_attempts: 0,
          })
          .eq('user_id', userId);

        return new Response(
          JSON.stringify({ success: false, error: emailResult.error, requestId }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`✅ [${requestId}] OTP email sent successfully`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Verification code sent to your email',
          email: userEmail,
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

