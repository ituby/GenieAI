-- Create points_history table for tracking points changes
CREATE TABLE public.points_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES public.goal_tasks(id) ON DELETE CASCADE NOT NULL,
  points_change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on points_history table
ALTER TABLE public.points_history ENABLE ROW LEVEL SECURITY;

-- Create policies for points_history table
CREATE POLICY "Users can view own points history" ON public.points_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all points history" ON public.points_history
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Create indexes for points_history table
CREATE INDEX idx_points_history_user_id ON public.points_history(user_id);
CREATE INDEX idx_points_history_goal_id ON public.points_history(goal_id);
CREATE INDEX idx_points_history_task_id ON public.points_history(task_id);
CREATE INDEX idx_points_history_created_at ON public.points_history(created_at);

-- Grant permissions
GRANT ALL ON public.points_history TO authenticated;
GRANT ALL ON public.points_history TO service_role;
