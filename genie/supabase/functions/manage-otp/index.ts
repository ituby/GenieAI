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

// Send OTP via Resend Email
async function sendResendEmail(email: string, otp: string, isRegistration: boolean): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');

  if (!resendApiKey) {
    return { success: false, error: 'Email service not configured' };
  }

  try {
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
            
            <h2>Your Verification Code</h2>
            <p class="message">
              ${isRegistration ? 'Welcome to Genie! Complete your registration by entering this code:' : 'Here is your login verification code:'}
            </p>
            
            <div class="otp-box">
              <div style="color: #666; font-size: 14px; margin-bottom: 10px;">Verification Code</div>
              <div class="otp-code">${otp}</div>
              <div style="color: #666; font-size: 14px; margin-top: 10px;">This code expires in 10 minutes</div>
            </div>
            
            <p class="message warning">
              ⚠️ Never share this code with anyone. Genie will never ask for your verification code.
            </p>
            
            <div class="footer">
              <p>© 2024 Genie AI - Your AI-powered goal companion</p>
              <p>If you didn't request this code, please ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Genie AI <noreply@askgenie.info>',
        to: email,
        subject: `Your Genie Verification Code: ${otp}`,
        html: emailHtml,
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ Resend error: ${response.status} - ${errorData}`);
      return { success: false, error: 'Email delivery failed' };
    }

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
  console.log(`🚀 [${requestId}] OTP request started`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get authorization header to identify the user
    const authHeader = req.headers.get('Authorization');
    let currentUserId: string | null = null;
    
    if (authHeader) {
      // Try to get user from JWT token
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (user && !userError) {
        currentUserId = user.id;
        console.log(`🔐 [${requestId}] Authenticated user: ${currentUserId}`);
      }
    }
    
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
      console.log(`📧 [${requestId}] Sending OTP for: ${email}`);

      let userId: string;
      let isRegistration = false;

      // If we have authenticated user from token, use that
      if (currentUserId) {
        console.log(`✅ [${requestId}] Using authenticated user ID: ${currentUserId}`);
        userId = currentUserId;
        
        // Check if user has completed initial verification
        const { data: userData } = await supabase
          .from('users')
          .select('account_verified')
          .eq('id', userId)
          .single();
        
        isRegistration = !(userData?.account_verified); // Not verified = registration
      } else {
        // Try to find user by email
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, account_verified')
          .eq('email', email)
          .single();

        if (userError || !userData) {
          // Not found in public.users, try auth.users
          console.log(`⏳ [${requestId}] User not in public.users yet, looking up by email`);
          
          const { data: authUserData, error: authError } = await supabase.auth.admin.getUserByEmail(email);
          
          if (authError || !authUserData?.user) {
            console.error(`❌ [${requestId}] User not found: ${authError?.message}`);
            return new Response(
              JSON.stringify({ success: false, error: 'User not found', requestId }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          userId = authUserData.user.id;
          isRegistration = true; // New user, definitely registration
        } else {
          userId = userData.id;
          isRegistration = !(userData.account_verified); // Not verified = registration
        }
      }

      console.log(`📧 [${requestId}] User: ${userId}, Type: ${isRegistration ? 'REGISTRATION' : 'LOGIN'}`);

      const otpType = isRegistration ? 'registration' : 'login';

      // Get or create user's auth status record
      let { data: authStatus, error: authError } = await supabase
        .from('otp_verifications')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (authError || !authStatus) {
        // Create initial record for this user
        const { data: newRecord, error: createError } = await supabase
          .from('otp_verifications')
          .insert({
            user_id: userId,
            current_stage: otpType,
            registration_verified: false,
            login_verified: false,
          })
          .select()
          .single();

        if (createError || !newRecord) {
          console.error(`❌ [${requestId}] Failed to create auth status:`, createError);
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to initialize authentication', requestId }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        authStatus = newRecord;
      }

      // Check for cooldown (60 seconds)
      if (authStatus.last_otp_sent_at) {
        const timeSinceLastOtp = Date.now() - new Date(authStatus.last_otp_sent_at).getTime();
        const COOLDOWN_PERIOD = 60 * 1000; // 60 seconds
        
        if (timeSinceLastOtp < COOLDOWN_PERIOD) {
          const cooldownRemaining = Math.ceil((COOLDOWN_PERIOD - timeSinceLastOtp) / 1000);
          console.log(`⏳ [${requestId}] Cooldown active: ${cooldownRemaining} seconds remaining`);
          
          // Return existing OTP if still valid
          if (authStatus.current_otp_code && authStatus.current_otp_expires_at) {
            const timeUntilExpiry = new Date(authStatus.current_otp_expires_at).getTime() - Date.now();
            if (timeUntilExpiry > 0) {
              return new Response(
                JSON.stringify({
                  success: true,
                  message: `Please wait ${cooldownRemaining} seconds. Check your email for the code we already sent.`,
                  email: email,
                  expiresIn: Math.floor(timeUntilExpiry / 1000),
                  type: otpType,
                  requestId
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }
          
          // No valid OTP but still in cooldown
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

      // Update user's record with new OTP
      const { error: updateError } = await supabase
        .from('otp_verifications')
        .update({
          current_stage: otpType,
          current_otp_code: otpCode,
          current_otp_expires_at: expiresAt.toISOString(),
          current_otp_attempts: 0,
          last_otp_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error(`❌ [${requestId}] Failed to update OTP:`, updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to generate OTP', requestId }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Send Email via Resend
      console.log(`📤 [${requestId}] Sending OTP email to ${email}`);
      const emailResult = await sendResendEmail(email, otpCode, isRegistration);

      if (!emailResult.success) {
        console.error(`❌ [${requestId}] Email failed:`, emailResult.error);
        // Clear the OTP if email failed
        await supabase
          .from('otp_verifications')
          .update({
            current_otp_code: null,
            current_otp_expires_at: null,
            current_otp_attempts: 0,
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
          message: 'OTP sent to your email',
          phone: email, // Return email as "phone" for compatibility
          email: email,
          expiresIn: 600,
          type: otpType,
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

      if (!otp) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Verification code is required',
            requestId 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, account_verified')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        console.error(`❌ [${requestId}] User not found for email: ${email}`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'User not found. Please register first.',
            requestId 
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user's auth status
      const { data: authStatus, error: authError } = await supabase
        .from('otp_verifications')
        .select('*')
        .eq('user_id', userData.id)
        .single();

      if (authError || !authStatus) {
        console.error(`❌ [${requestId}] No auth status found for user`);
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
      if (!authStatus.current_otp_expires_at || new Date(authStatus.current_otp_expires_at) < new Date()) {
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
      if (authStatus.current_otp_attempts >= 5) {
        // Reset OTP after too many attempts
        await supabase
          .from('otp_verifications')
          .update({
            current_otp_code: null,
            current_otp_expires_at: null,
            current_otp_attempts: 0,
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
      if (authStatus.current_otp_code !== otp) {
        console.log(`❌ [${requestId}] Invalid OTP: expected ${authStatus.current_otp_code}, got ${otp}`);
        
        // Increment attempts
        const newAttempts = authStatus.current_otp_attempts + 1;
        await supabase
          .from('otp_verifications')
          .update({ current_otp_attempts: newAttempts })
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

      // OTP is correct! Update verification status
      const updates: any = {
        current_otp_code: null, // Clear OTP after successful verification
        current_otp_expires_at: null,
        current_otp_attempts: 0,
        updated_at: new Date().toISOString(),
      };

      if (authStatus.current_stage === 'registration') {
        // First-time verification
        updates.registration_verified = true;
        updates.registration_verified_at = new Date().toISOString();
        updates.login_verified = true; // Also mark as logged in
        updates.login_verified_at = new Date().toISOString();
        updates.current_stage = 'login'; // Move to login stage
        
        // Update users table
        await supabase
          .from('users')
          .update({ account_verified: true, updated_at: new Date().toISOString() })
          .eq('id', userData.id);
      } else {
        // Login verification (2FA)
        updates.login_verified = true;
        updates.login_verified_at = new Date().toISOString();
      }

      await supabase
        .from('otp_verifications')
        .update(updates)
        .eq('user_id', userData.id);

      console.log(`✅ [${requestId}] OTP verified successfully (${authStatus.current_stage})`);

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

