-- Create OTP verification table
CREATE TABLE public.otp_verifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  phone_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_otp_verifications_user_id ON public.otp_verifications(user_id);
CREATE INDEX idx_otp_verifications_phone_number ON public.otp_verifications(phone_number);
CREATE INDEX idx_otp_verifications_expires_at ON public.otp_verifications(expires_at);

-- Enable RLS
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own OTP verifications" ON public.otp_verifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own OTP verifications" ON public.otp_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own OTP verifications" ON public.otp_verifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Add phone_number column to users table
ALTER TABLE public.users ADD COLUMN phone_number TEXT;

-- Create unique index on phone_number
CREATE UNIQUE INDEX idx_users_phone_number ON public.users(phone_number) WHERE phone_number IS NOT NULL;

-- Add comment for documentation
COMMENT ON TABLE public.otp_verifications IS 'Stores OTP codes for phone number verification';
COMMENT ON COLUMN public.users.phone_number IS 'User phone number for OTP verification';
