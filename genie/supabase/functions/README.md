# Supabase Edge Functions

This directory contains all the Edge Functions for the Genie AI application.

## Functions Overview

### 1. `generate-plan`
Generates AI-powered 21-day plans for user goals with daily tasks and notifications.

**Features:**
- AI-powered task generation
- Creates scheduled notifications for each task
- Generates rewards and milestone notifications
- Sends immediate notification for the first task

### 2. `push-dispatcher`
Handles sending push notifications to users via Expo Push API.

**Features:**
- Sends push notifications to all user devices
- Checks user notification preferences
- Handles multiple push tokens per user
- Provides detailed success/failure reporting

### 3. `process-notifications`
Processes scheduled notifications and sends them as push notifications.

**Features:**
- Runs via cron job every minute
- Finds due notifications
- Sends push notifications
- Updates notification status
- Creates in-app notification records

### 4. `send-task-notification`
Sends immediate notifications when new tasks are created.

**Features:**
- Sends instant notification for new tasks
- Creates in-app notification record
- Provides task details and goal context

### 5. `update-progress`
Updates user progress and goal completion status.

### 6. `update-points`
Updates user points and rewards.

### 7. `update-rewards`
Manages reward system and unlocks.

### 8. `save-push-token`
Saves user push tokens to database.

## Deployment

To deploy all functions:

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy generate-plan
supabase functions deploy push-dispatcher
supabase functions deploy process-notifications
supabase functions deploy send-task-notification
```

## Environment Variables

Make sure these environment variables are set in your Supabase project:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations
- `OPENAI_API_KEY` - OpenAI API key for AI generation

## Cron Jobs

The `process-notifications` function should be set up as a cron job to run every minute:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the cron job
SELECT cron.schedule(
  'process-notifications',
  '* * * * *', -- Every minute
  'SELECT process_scheduled_notifications();'
);
```

## Testing

You can test the functions using the Supabase CLI:

```bash
# Test generate-plan function
supabase functions invoke generate-plan --data '{"user_id": "user-id", "title": "Learn Spanish", "description": "Become fluent in Spanish", "category": "learning", "intensity": "medium"}'

# Test push-dispatcher function
supabase functions invoke push-dispatcher --data '{"user_id": "user-id", "title": "Test Notification", "body": "This is a test"}'
```

## Monitoring

Monitor function performance and errors in the Supabase Dashboard:
- Go to Edge Functions section
- View logs and metrics for each function
- Set up alerts for errors

## Push Notification Flow

1. **Goal Creation**: User creates a goal
2. **Plan Generation**: `generate-plan` creates tasks and scheduled notifications
3. **Immediate Notification**: First task notification sent via `send-task-notification`
4. **Scheduled Notifications**: Cron job processes due notifications via `process-notifications`
5. **Push Delivery**: `push-dispatcher` sends actual push notifications
6. **In-App Display**: Notifications appear in the app's notification screen

## Database Tables

The functions interact with these tables:
- `goals` - User goals
- `goal_tasks` - Tasks for each goal
- `scheduled_notifications` - Notifications to be sent
- `notifications` - In-app notification history
- `push_tokens` - User push notification tokens
- `users` - User profiles
