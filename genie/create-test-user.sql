-- Create test user for Apple Review
-- This should be run manually in Supabase SQL Editor

-- Insert user into auth.users (you'll need to do this via Supabase Dashboard Auth)
-- Email: applereview@askgenie.info
-- Password: AppleReview2025!

-- After user is created via Auth, run this to set up tokens:
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the user ID (will be available after auth creation)
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'applereview@askgenie.info';
  
  IF v_user_id IS NOT NULL THEN
    -- Set up tokens for this user
    INSERT INTO user_tokens (user_id, tokens_remaining, tokens_used, total_tokens, is_subscribed, monthly_tokens)
    VALUES (v_user_id, 100, 0, 100, false, 0)
    ON CONFLICT (user_id) DO UPDATE SET
      tokens_remaining = 100,
      tokens_used = 0,
      is_subscribed = false;
    
    -- Create OTP verification record
    INSERT INTO otp_verifications (user_id, current_stage, registration_verified, login_verified)
    VALUES (v_user_id, 'registration', true, true)
    ON CONFLICT (user_id) DO UPDATE SET
      registration_verified = true,
      login_verified = true;
      
    RAISE NOTICE 'Test user setup complete';
  ELSE
    RAISE NOTICE 'User not found - create via Supabase Auth first';
  END IF;
END $$;
