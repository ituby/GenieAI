-- Update handle_new_user function to only create/update row if terms_accepted is true
-- If terms_accepted is false or missing, the row will NOT be created
-- This function is called on INSERT and UPDATE of auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    terms_accepted_value BOOLEAN;
BEGIN
    -- Check if terms_accepted is true in user_metadata
    terms_accepted_value := COALESCE((NEW.raw_user_meta_data->>'terms_accepted')::boolean, FALSE);
    
    -- Only create/update row in public.users if terms_accepted is true
    IF terms_accepted_value = TRUE THEN
        INSERT INTO public.users (id, email, full_name, terms_accepted, terms_accepted_at)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
            TRUE,
            CASE 
                WHEN NEW.raw_user_meta_data->>'terms_accepted_at' IS NOT NULL 
                THEN (NEW.raw_user_meta_data->>'terms_accepted_at')::timestamp with time zone
                ELSE NOW()
            END
        )
        ON CONFLICT (id) DO UPDATE SET
            terms_accepted = TRUE,
            terms_accepted_at = CASE 
                WHEN NEW.raw_user_meta_data->>'terms_accepted_at' IS NOT NULL 
                THEN (NEW.raw_user_meta_data->>'terms_accepted_at')::timestamp with time zone
                ELSE COALESCE(users.terms_accepted_at, NOW())
            END,
            email = NEW.email,
            full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', users.full_name);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also create a trigger for UPDATE to handle when user accepts terms later
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    WHEN (OLD.raw_user_meta_data->>'terms_accepted' IS DISTINCT FROM NEW.raw_user_meta_data->>'terms_accepted')
    EXECUTE FUNCTION public.handle_new_user();

