-- Fix notification system issues

-- 1. Add missing id column to scheduled_notifications table
ALTER TABLE public.scheduled_notifications 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4() PRIMARY KEY;

-- 2. Create user_settings table for notification preferences
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  daily_reminders BOOLEAN DEFAULT TRUE,
  task_reminders BOOLEAN DEFAULT TRUE,
  goal_milestones BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user_settings table
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user_settings table
CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all settings" ON public.user_settings
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Create indexes for user_settings table
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- Grant permissions
GRANT ALL ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;

-- 3. Create function to automatically create user settings when user is created
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user settings creation
DROP TRIGGER IF EXISTS on_user_created_settings ON public.users;
CREATE TRIGGER on_user_created_settings
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_settings();

-- 4. Add trigger for updated_at on user_settings
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Insert default settings for existing users who don't have settings
INSERT INTO public.user_settings (user_id)
SELECT id FROM public.users
WHERE id NOT IN (SELECT user_id FROM public.user_settings)
ON CONFLICT (user_id) DO NOTHING;
