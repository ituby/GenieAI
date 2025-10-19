import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface VerifyOtpRequest {
  phone: string;
  otp: string;
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
    console.log(`🔐 [${requestId}] Verify OTP request received`);

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { phone, otp }: VerifyOtpRequest = await req.json();

    if (!phone || !otp) {
      return new Response(
        JSON.stringify({
          error: 'Phone and OTP are required',
          requestId,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(
      `🔐 [${requestId}] Verifying OTP for phone: "${phone}", code: "${otp}"`
    );
    console.log(`🔐 [${requestId}] Phone length: ${phone.length}`);
    console.log(`🔐 [${requestId}] OTP length: ${otp.length}`);
    console.log(`🔐 [${requestId}] Current time: ${new Date().toISOString()}`);

    // First, check if there are any OTP records for this phone
    const { data: allOtps, error: allOtpsError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone_number', phone)
      .order('created_at', { ascending: false })
      .limit(5);

    console.log(
      `🔍 [${requestId}] Found ${allOtps?.length || 0} OTP records for phone`
    );
    if (allOtps && allOtps.length > 0) {
      console.log(
        `🔍 [${requestId}] Latest OTP record:`,
        JSON.stringify(allOtps[0])
      );
      console.log(
        `🔍 [${requestId}] Phone match: stored="${allOtps[0].phone_number}" vs input="${phone}"`
      );
      console.log(
        `🔍 [${requestId}] Code match: stored="${allOtps[0].otp_code}" vs input="${otp}"`
      );
      console.log(`🔍 [${requestId}] Verified: ${allOtps[0].verified}`);
      console.log(`🔍 [${requestId}] Expires: ${allOtps[0].expires_at}`);
      console.log(`🔍 [${requestId}] Now: ${new Date().toISOString()}`);
      console.log(
        `🔍 [${requestId}] Is expired: ${new Date(allOtps[0].expires_at) < new Date()}`
      );
    }

    // Find the most recent valid OTP for this phone number
    console.log(`🔍 [${requestId}] Searching for OTP with phone: "${phone}" and code: "${otp}"`);
    console.log(`🔍 [${requestId}] Search conditions: verified=false, expires_at > ${new Date().toISOString()}`);
    
    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone_number', phone)
      .eq('otp_code', otp)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpRecord) {
      console.error(
        `❌ [${requestId}] Invalid or expired OTP. Error:`,
        otpError
      );
      console.error(
        `❌ [${requestId}] Search failed for phone: "${phone}" and code: "${otp}"`
      );
      console.error(
        `❌ [${requestId}] Error details:`,
        JSON.stringify(otpError, null, 2)
      );
      return new Response(
        JSON.stringify({
          error: 'Invalid or expired OTP code',
          requestId,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Mark OTP as verified
    const { error: updateError } = await supabase
      .from('otp_verifications')
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', otpRecord.id);

    if (updateError) {
      console.error(`❌ [${requestId}] Error updating OTP:`, updateError);
      return new Response(
        JSON.stringify({
          error: 'Failed to verify OTP',
          requestId,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(
      `✅ [${requestId}] OTP verified successfully for user: ${otpRecord.user_id}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: 'OTP verified successfully',
        userId: otpRecord.user_id,
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
