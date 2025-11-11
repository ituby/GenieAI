-- Fix password_reset_verifications table - remove phone_number column
-- Since we now use email instead of phone for password reset

-- First, ensure the table exists (if not, create it without phone_number)
CREATE TABLE IF NOT EXISTS password_reset_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    otp_code TEXT,
    otp_expires_at TIMESTAMPTZ,
    otp_attempts INTEGER DEFAULT 0,
    last_otp_sent_at TIMESTAMPTZ,
    reset_token TEXT,
    reset_token_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- If table already exists, drop phone_number column if it exists
DO $$ 
BEGIN
    -- Check if phone_number column exists and drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'password_reset_verifications' 
        AND column_name = 'phone_number'
    ) THEN
        ALTER TABLE password_reset_verifications 
        DROP COLUMN phone_number;
    END IF;
END $$;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_password_reset_user_id 
ON password_reset_verifications(user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_token 
ON password_reset_verifications(reset_token) 
WHERE reset_token IS NOT NULL;

-- Enable RLS if not already enabled
ALTER TABLE password_reset_verifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can manage own password resets" ON password_reset_verifications;

CREATE POLICY "Users can manage own password resets" 
ON password_reset_verifications
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

