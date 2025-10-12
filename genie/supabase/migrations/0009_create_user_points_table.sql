-- Create user_points table for tracking points earned per goal
CREATE TABLE public.user_points (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE NOT NULL,
  points INTEGER DEFAULT 0 NOT NULL,
  total_earned INTEGER DEFAULT 0 NOT NULL,
  total_lost INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, goal_id)
);

-- Enable RLS on user_points table
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

-- Create policies for user_points table
CREATE POLICY "Users can view own points" ON public.user_points
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own points" ON public.user_points
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own points" ON public.user_points
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all points" ON public.user_points
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Create indexes for user_points table
CREATE INDEX idx_user_points_user_id ON public.user_points(user_id);
CREATE INDEX idx_user_points_goal_id ON public.user_points(goal_id);
CREATE INDEX idx_user_points_user_goal ON public.user_points(user_id, goal_id);

-- Grant permissions
GRANT ALL ON public.user_points TO authenticated;
GRANT ALL ON public.user_points TO service_role;

-- Add trigger for updated_at
CREATE TRIGGER update_user_points_updated_at
  BEFORE UPDATE ON public.user_points
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
