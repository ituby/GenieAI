-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Goals table policies
CREATE POLICY "Users can view own goals" ON public.goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goals" ON public.goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON public.goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON public.goals
  FOR DELETE USING (auth.uid() = user_id);

-- Goal tasks table policies
CREATE POLICY "Users can view own goal tasks" ON public.goal_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.goals 
      WHERE goals.id = goal_tasks.goal_id 
      AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tasks for own goals" ON public.goal_tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.goals 
      WHERE goals.id = goal_tasks.goal_id 
      AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own goal tasks" ON public.goal_tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.goals 
      WHERE goals.id = goal_tasks.goal_id 
      AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own goal tasks" ON public.goal_tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.goals 
      WHERE goals.id = goal_tasks.goal_id 
      AND goals.user_id = auth.uid()
    )
  );

-- Push tokens table policies
CREATE POLICY "Users can view own push tokens" ON public.push_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own push tokens" ON public.push_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push tokens" ON public.push_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push tokens" ON public.push_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Scheduled notifications table policies
CREATE POLICY "Users can view own notifications" ON public.scheduled_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all notifications" ON public.scheduled_notifications
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions to service role for notifications
GRANT ALL ON public.scheduled_notifications TO service_role;
GRANT ALL ON public.push_tokens TO service_role;
GRANT SELECT ON public.users TO service_role;
GRANT SELECT ON public.goals TO service_role;
GRANT SELECT ON public.goal_tasks TO service_role;
