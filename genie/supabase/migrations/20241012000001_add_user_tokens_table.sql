-- Create user_tokens table to track token usage
CREATE TABLE public.user_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  tokens_remaining INTEGER DEFAULT 3,
  total_tokens INTEGER DEFAULT 3,
  is_subscribed BOOLEAN DEFAULT FALSE,
  monthly_tokens INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own tokens" ON public.user_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens" ON public.user_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens" ON public.user_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE public.user_tokens IS 'Tracks token usage for each user. Non-subscribed users are limited to 3 tokens total.';

