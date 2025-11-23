-- Add terms_accepted and terms_accepted_at columns to users table
DO $$ 
BEGIN
    -- Add terms_accepted column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'terms_accepted'
    ) THEN
        ALTER TABLE users ADD COLUMN terms_accepted BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add terms_accepted_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'terms_accepted_at'
    ) THEN
        ALTER TABLE users ADD COLUMN terms_accepted_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Update existing users who have terms_accepted in user_metadata
UPDATE users u
SET 
    terms_accepted = COALESCE(
        (au.raw_user_meta_data->>'terms_accepted')::boolean,
        FALSE
    ),
    terms_accepted_at = CASE 
        WHEN au.raw_user_meta_data->>'terms_accepted_at' IS NOT NULL 
        THEN (au.raw_user_meta_data->>'terms_accepted_at')::timestamp with time zone
        ELSE NULL
    END
FROM auth.users au
WHERE u.id = au.id
AND au.raw_user_meta_data->>'terms_accepted' = 'true';

-- Update handle_new_user function to include terms_accepted
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, terms_accepted, terms_accepted_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE((NEW.raw_user_meta_data->>'terms_accepted')::boolean, FALSE),
        CASE 
            WHEN NEW.raw_user_meta_data->>'terms_accepted_at' IS NOT NULL 
            THEN (NEW.raw_user_meta_data->>'terms_accepted_at')::timestamp with time zone
            ELSE NULL
        END
    )
    ON CONFLICT (id) DO UPDATE SET
        terms_accepted = COALESCE((NEW.raw_user_meta_data->>'terms_accepted')::boolean, users.terms_accepted),
        terms_accepted_at = CASE 
            WHEN NEW.raw_user_meta_data->>'terms_accepted_at' IS NOT NULL 
            THEN (NEW.raw_user_meta_data->>'terms_accepted_at')::timestamp with time zone
            ELSE users.terms_accepted_at
        END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

