-- Create notifications table for in-app notification display
CREATE TABLE public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('task_reminder', 'goal_milestone', 'daily_summary', 'motivation', 'milestone_reward', 'completion_reward', 'system', 'achievement')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications table
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all notifications" ON public.notifications
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Create indexes for notifications table
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, read) WHERE read = false;

-- Grant permissions
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- Update scheduled_notifications table to include new notification types
ALTER TABLE public.scheduled_notifications 
DROP CONSTRAINT IF EXISTS scheduled_notifications_type_check;

ALTER TABLE public.scheduled_notifications 
ADD CONSTRAINT scheduled_notifications_type_check 
CHECK (type IN ('task_reminder', 'goal_milestone', 'daily_summary', 'motivation', 'milestone_reward', 'completion_reward'));
