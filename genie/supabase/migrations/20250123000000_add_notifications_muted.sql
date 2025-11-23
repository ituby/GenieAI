-- Add notifications_muted column to user_tokens table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_tokens' 
        AND column_name = 'notifications_muted'
    ) THEN
        ALTER TABLE user_tokens 
        ADD COLUMN notifications_muted BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN notifications_muted_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

