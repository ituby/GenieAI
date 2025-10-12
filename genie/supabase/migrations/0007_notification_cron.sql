-- Enable the pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to process notifications
CREATE OR REPLACE FUNCTION process_scheduled_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Call the Edge Function to process notifications
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/process-notifications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) INTO result;
  
  -- Log the result (optional)
  RAISE LOG 'Notification processing result: %', result;
END;
$$;

-- Schedule the cron job to run every minute
SELECT cron.schedule(
  'process-notifications',
  '* * * * *', -- Every minute
  'SELECT process_scheduled_notifications();'
);

-- Add indexes for better performance on scheduled_notifications
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_due 
ON scheduled_notifications(scheduled_for, sent) 
WHERE sent = false;

CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_user_id 
ON scheduled_notifications(user_id, scheduled_for);

-- Add indexes for notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON notifications(user_id, read) 
WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
ON notifications(created_at DESC);
