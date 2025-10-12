# Process Notifications Cron Job

This cron job processes scheduled notifications and sends push notifications to users.

## Setup Instructions

1. **Deploy the Edge Function:**
   ```bash
   supabase functions deploy process-notifications
   ```

2. **Create the Cron Job in Supabase Dashboard:**
   - Go to Database → Cron Jobs
   - Add new cron job with the following settings:
     - Name: `process_notifications`
     - Schedule: `* * * * *` (every minute)
     - SQL: 
     ```sql
     SELECT
       net.http_post(
         url := 'https://your-project-ref.supabase.co/functions/v1/process-notifications',
         headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '", "Content-Type": "application/json"}'::jsonb,
         body := '{}'::jsonb
       ) as request_id;
     ```

3. **Enable the Cron Extension:**
   ```sql
   -- Enable the pg_cron extension
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   ```

4. **Set up the Service Role Key:**
   ```sql
   -- Set the service role key for the cron job
   ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
   ```

## How it Works

1. The cron job runs every minute
2. It calls the `process-notifications` Edge Function
3. The function finds all scheduled notifications that are due and not yet sent
4. For each notification, it:
   - Sends a push notification via the `push-dispatcher` function
   - Updates the `scheduled_notifications` table to mark as sent
   - Creates a record in the `notifications` table for in-app display

## Monitoring

- Check the Edge Function logs in Supabase Dashboard
- Monitor the `scheduled_notifications` table for sent notifications
- Check the `notifications` table for in-app notifications

## Troubleshooting

- Ensure the service role key is correctly set
- Check that the Edge Function is deployed
- Verify that the cron job is enabled and running
- Check Edge Function logs for errors
