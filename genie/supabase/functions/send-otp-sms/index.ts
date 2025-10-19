import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface SendOtpRequest {
  email: string;
  password?: string;
  phone?: string;
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
    const { email, password, phone, type = 'sms' }: SendOtpRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({
          error: 'Email is required',
          requestId,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let userId: string;
    let phoneNumber: string;

    if (password) {
      // Existing user login - validate credentials
      console.log(`📱 [${requestId}] Validating credentials for existing user: ${email}`);
      
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

      userId = authData.user.id;
      console.log(`✅ [${requestId}] Credentials validated for user: ${userId}`);

      // Get user's phone number from the database
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

      phoneNumber = userData.phone_number;
    } else if (phone) {
      // New user registration - use provided phone number
      console.log(`📱 [${requestId}] New user registration with phone: ${phone}`);
      
      // First check if user exists in public.users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        // User doesn't exist in public.users, check if they exist in auth.users
        console.log(`📱 [${requestId}] User not found in public.users, checking auth.users...`);
        
        // Try to get user from auth.users
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) {
          console.error(`❌ [${requestId}] Error checking auth users:`, authError);
          return new Response(
            JSON.stringify({
              error: 'Failed to verify user. Please try again.',
              requestId,
            }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const authUser = authUsers.users.find(u => u.email === email);
        
        if (!authUser) {
          console.error(`❌ [${requestId}] User not found in auth.users either`);
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

        // User exists in auth but not in public.users - create them
        console.log(`📱 [${requestId}] Creating user in public.users...`);
        const { data: newUserData, error: createError } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            email: authUser.email,
            full_name: authUser.user_metadata?.full_name || '',
            phone_number: phone,
            phone_verified: false
          })
          .select('id')
          .single();

        if (createError) {
          console.error(`❌ [${requestId}] Error creating user:`, createError);
          return new Response(
            JSON.stringify({
              error: 'Failed to create user profile. Please try again.',
              requestId,
            }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        userId = newUserData.id;
        phoneNumber = phone;
      } else {
        // User exists in public.users - check if they have a phone number
        const { data: fullUserData, error: fullUserError } = await supabase
          .from('users')
          .select('id, phone_number')
          .eq('email', email)
          .single();

        if (fullUserError || !fullUserData) {
          console.error(`❌ [${requestId}] Error getting user data:`, fullUserError);
          return new Response(
            JSON.stringify({
              error: 'Failed to get user data. Please try again.',
              requestId,
            }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // If user has no phone number, update it
        if (!fullUserData.phone_number) {
          console.log(`📱 [${requestId}] User has no phone number, updating with: ${phone}`);
          const { error: updateError } = await supabase
            .from('users')
            .update({ phone_number: phone })
            .eq('id', fullUserData.id);

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
        }

        userId = fullUserData.id;
        phoneNumber = phone;
      }
    } else {
      return new Response(
        JSON.stringify({
          error: 'Either password (for existing users) or phone (for new users) is required',
          requestId,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    console.log(
      `📱 [${requestId}] Using phone number: ${phoneNumber}, sending OTP...`
    );

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
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
    console.log(`🔐 [${requestId}] Phone number: ${phoneNumber}`);
    console.log(`🔐 [${requestId}] Expires at: ${expiresAt.toISOString()}`);

    // Step 4: Save OTP to database
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
        phone: phoneNumber, // Return full phone number for verification
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
