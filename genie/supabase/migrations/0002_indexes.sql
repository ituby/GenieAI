-- Create indexes for better query performance

-- Users table indexes
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_created_at ON public.users(created_at);

-- Goals table indexes
CREATE INDEX idx_goals_user_id ON public.goals(user_id);
CREATE INDEX idx_goals_status ON public.goals(status);
CREATE INDEX idx_goals_category ON public.goals(category);
CREATE INDEX idx_goals_created_at ON public.goals(created_at);
CREATE INDEX idx_goals_user_status ON public.goals(user_id, status);

-- Goal tasks table indexes
CREATE INDEX idx_goal_tasks_goal_id ON public.goal_tasks(goal_id);
CREATE INDEX idx_goal_tasks_run_at ON public.goal_tasks(run_at);
CREATE INDEX idx_goal_tasks_completed ON public.goal_tasks(completed);
CREATE INDEX idx_goal_tasks_goal_completed ON public.goal_tasks(goal_id, completed);
CREATE INDEX idx_goal_tasks_run_at_completed ON public.goal_tasks(run_at, completed);

-- Push tokens table indexes
CREATE INDEX idx_push_tokens_user_id ON public.push_tokens(user_id);
CREATE INDEX idx_push_tokens_expo_token ON public.push_tokens(expo_token);
CREATE INDEX idx_push_tokens_platform ON public.push_tokens(platform);

-- Scheduled notifications table indexes
CREATE INDEX idx_scheduled_notifications_user_id ON public.scheduled_notifications(user_id);
CREATE INDEX idx_scheduled_notifications_task_id ON public.scheduled_notifications(task_id);
CREATE INDEX idx_scheduled_notifications_scheduled_for ON public.scheduled_notifications(scheduled_for);
CREATE INDEX idx_scheduled_notifications_sent ON public.scheduled_notifications(sent);
CREATE INDEX idx_scheduled_notifications_type ON public.scheduled_notifications(type);
CREATE INDEX idx_scheduled_notifications_pending ON public.scheduled_notifications(scheduled_for, sent) WHERE sent = FALSE;
