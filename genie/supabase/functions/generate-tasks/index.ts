import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// CORS HEADERS
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// TYPES
// ============================================================================

interface PreferredTimeRange {
  start_hour: number;
  end_hour: number;
  label: string;
}

interface TaskTemplate {
  title: string;
  description: string;
  day_offset: number;
  time_of_day: string;
  subtasks?: Array<{ title: string; estimated_minutes: number }>;
  time_allocation_minutes?: number;
  custom_time?: string;
}

interface RequestBody {
  user_id: string;
  goal_id: string;
  device_now_iso?: string;
  device_timezone?: string;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  plan_duration_days: number;
  preferred_time_ranges: PreferredTimeRange[] | null;
  preferred_days: number[] | null;
  status: string;
  user_id: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function convertHHMMToTimeOfDay(hhmm: string): string {
  const [hoursStr] = hhmm.split(':');
  const hours = parseInt(hoursStr, 10);
  if (hours < 10) return 'morning';
  if (hours < 13) return 'mid_morning';
  if (hours < 18) return 'afternoon';
  return 'evening';
}

function computeRunAt(
  dayNumber: number,
  timeOfDay: string,
  deviceNowIso: string,
  preferredTimeRanges: PreferredTimeRange[] | null
): string {
  const deviceNow = new Date(deviceNowIso);

  const timeSlots: Record<string, number> = {
    morning: 8,
    mid_morning: 10,
    afternoon: 14,
    evening: 20,
  };

  let targetHour = 8;
  if (preferredTimeRanges?.length) {
    const rangeIndex =
      timeOfDay === 'afternoon' ? 1 : timeOfDay === 'evening' ? 2 : 0;
    targetHour = preferredTimeRanges[rangeIndex]?.start_hour || 8;
  } else {
    targetHour = timeSlots[timeOfDay] || 8;
  }

  const targetDate = new Date(deviceNow);
  targetDate.setDate(targetDate.getDate() + (dayNumber - 1));
  targetDate.setHours(targetHour, 0, 0, 0);

  // Clamp to 07:00-23:00
  const clampedHour = Math.max(7, Math.min(23, targetDate.getHours()));
  targetDate.setHours(clampedHour, 0, 0, 0);

  // Ensure not in the past
  if (targetDate <= deviceNow) {
    const tomorrow = new Date(deviceNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(targetHour, 0, 0, 0);
    return tomorrow.toISOString();
  }

  return targetDate.toISOString();
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const response = await fetch(url, init);

      if (response.status === 429 || response.status === 529) {
        if (i < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, i), 10000);
          console.log(`[AI] Rate limited, retrying in ${delay}ms...`);
          await wait(delay);
          continue;
        }
      }

      if (response.ok) return response;

      let errorDetails = '';
      try {
        const errorText = await response.text();
        errorDetails = ` - ${errorText.substring(0, 200)}`;
      } catch {
        // Ignore
      }

      if (i === maxRetries) {
        throw new Error(`API error ${response.status}${errorDetails}`);
      }

      if (
        response.status >= 400 &&
        response.status < 500 &&
        response.status !== 429
      ) {
        throw new Error(`API error ${response.status}${errorDetails}`);
      }

      await wait(1000 * (i + 1));
    } catch (error) {
      if (i === maxRetries) throw error;
      await wait(1000 * (i + 1));
    }
  }
  throw new Error('Max retries exceeded');
}

function errorResponse(
  status: number,
  message: string,
  requestId: string,
  processingTime = 0
) {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      request_id: requestId,
      processing_time_ms: processingTime,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    }
  );
}

// ============================================================================
// AI GENERATION
// ============================================================================

async function generateTasksWithAI(
  goal: Goal,
  deviceNowIso: string,
  savedOutline: any,
  requestId: string
): Promise<{ tasks: TaskTemplate[]; usedModel: string }> {
  try {
    console.log(`[${requestId}] Starting AI task generation...`);

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is missing');
    }

    // Extract outline
    const outlineArray = extractPlanOutline(savedOutline);
    console.log(`[${requestId}] Found ${outlineArray.length} outline items`);

    if (outlineArray.length === 0) {
      console.warn(`[${requestId}] No outline found, using template fallback`);
      return {
        tasks: generateTemplateTasks(goal),
        usedModel: 'template-fallback',
      };
    }

    const outlineContext = outlineArray
      .map((w) => `${w.title}: ${w.description}`)
      .join('\n');

    const tasksPerDay = goal.preferred_time_ranges?.length || 3;
    const daysPerWeek = goal.preferred_days?.length || 7;
    const totalWorkingDays = Math.ceil(
      (goal.plan_duration_days / 7) * daysPerWeek
    );
    // Smart calculation based on user's advanced settings
    const finalTaskCount = totalWorkingDays * tasksPerDay;

    console.log(`[${requestId}] Requesting ${finalTaskCount} tasks from AI`);

    const systemPrompt = `You are a JSON task generator. Your ONLY job is to output valid JSON. No explanations, no markdown, no text before or after the JSON.

CRITICAL RULES:
1. Output MUST start with { and end with }
2. Use double quotes for all strings
3. No comments in JSON
4. No trailing commas
5. All strings must be properly escaped

REQUIRED JSON STRUCTURE (copy this exactly):
{
  "days": [
    {
      "day": 1,
      "summary": "Daily focus",
      "tasks": [
        {
          "time": "09:00",
          "title": "Task title",
          "description": "Task description",
          "subtasks": [
            {"title": "Step 1", "estimated_minutes": 15},
            {"title": "Step 2", "estimated_minutes": 15}
          ],
          "time_allocation_minutes": 30
        }
      ]
    }
  ]
}`;

    const userPrompt = `Generate ${finalTaskCount} tasks for this goal.

GOAL: ${goal.title}
DESCRIPTION: ${goal.description}
CATEGORY: ${goal.category}

PLAN OUTLINE:
${outlineContext}

REQUIREMENTS:
- Create ${Math.ceil(goal.plan_duration_days)} days
- ${tasksPerDay} tasks per day
- Times: 09:00 (morning), 14:00 (afternoon), 19:00 (evening)
- Each task: 2-3 subtasks, 25-45 minutes total
- Make tasks specific and actionable
- Follow the plan outline structure

OUTPUT VALID JSON ONLY. Start with { and end with }. No markdown, no explanations.`;

    const response = await fetchWithRetry(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 16384,
          messages: [
            { role: 'user', content: `${systemPrompt}\n\n${userPrompt}` },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!data.content?.[0]?.text) {
      console.warn(`[${requestId}] Invalid AI response`);
      return {
        tasks: generateTemplateTasks(goal),
        usedModel: 'template-fallback',
      };
    }

    const text = data.content[0].text;

    // Try multiple cleaning strategies
    let cleanedText = text.trim();

    // Remove markdown code blocks
    cleanedText = cleanedText.replace(/```json\n?/g, '');
    cleanedText = cleanedText.replace(/```\n?/g, '');

    // Remove any text before the first {
    const firstBrace = cleanedText.indexOf('{');
    if (firstBrace > 0) {
      cleanedText = cleanedText.substring(firstBrace);
    }

    // Remove any text after the last }
    const lastBrace = cleanedText.lastIndexOf('}');
    if (lastBrace > 0 && lastBrace < cleanedText.length - 1) {
      cleanedText = cleanedText.substring(0, lastBrace + 1);
    }

    cleanedText = cleanedText.trim();

    let planData;
    try {
      planData = JSON.parse(cleanedText);
      console.log(
        `[${requestId}] Successfully parsed JSON with ${planData.days?.length || 0} days`
      );
    } catch (parseError) {
      console.error(`[${requestId}] JSON parse failed`);
      console.error(`[${requestId}] Parse error:`, parseError);
      console.error(
        `[${requestId}] First 500 chars of cleaned text:`,
        cleanedText.substring(0, 500)
      );
      console.error(
        `[${requestId}] Last 200 chars of cleaned text:`,
        cleanedText.substring(cleanedText.length - 200)
      );

      console.warn(`[${requestId}] Using template fallback due to parse error`);
      return {
        tasks: generateTemplateTasks(goal),
        usedModel: 'template-fallback',
      };
    }

    // Convert AI response to TaskTemplate format
    const tasks: TaskTemplate[] = [];
    const usedTimeSlots = new Map<string, Set<string>>();

    for (const day of planData.days || []) {
      const dayNumber = day.day;

      // Check preferred days
      if (goal.preferred_days?.length) {
        const dayOfWeek = (dayNumber - 1) % 7;
        if (!goal.preferred_days.includes(dayOfWeek)) continue;
      }

      for (const task of day.tasks?.slice(0, tasksPerDay) || []) {
        try {
          const timeOfDay = convertHHMMToTimeOfDay(task.time);
          const runAt = computeRunAt(
            dayNumber,
            timeOfDay,
            deviceNowIso,
            goal.preferred_time_ranges
          );

          tasks.push({
            title: task.title || `Task for Day ${dayNumber}`,
            description: task.description || 'Complete this task',
            day_offset: dayNumber - 1,
            time_of_day: timeOfDay,
            subtasks: task.subtasks || [],
            time_allocation_minutes: task.time_allocation_minutes || 30,
            custom_time: task.time,
          });
        } catch (taskError) {
          console.warn(`[${requestId}] Error processing task:`, taskError);
        }
      }
    }

    console.log(`[${requestId}] Generated ${tasks.length} tasks from AI`);
    return { tasks, usedModel: 'claude-haiku-4-5-20251001' };
  } catch (error) {
    console.error(`[${requestId}] AI generation error:`, error);
    return {
      tasks: generateTemplateTasks(goal),
      usedModel: 'template-fallback',
    };
  }
}

// ============================================================================
// TEMPLATE FALLBACK
// ============================================================================

function generateTemplateTasks(goal: Goal): TaskTemplate[] {
  const tasks: TaskTemplate[] = [];
  const tasksPerDay = goal.preferred_time_ranges?.length || 3;
  const timeOfDays = ['morning', 'afternoon', 'evening'];

  for (let day = 1; day <= goal.plan_duration_days; day++) {
    if (goal.preferred_days?.length) {
      const dayOfWeek = (day - 1) % 7;
      if (!goal.preferred_days.includes(dayOfWeek)) {
        continue;
      }
    }

    for (let taskIdx = 0; taskIdx < tasksPerDay; taskIdx++) {
      const timeOfDay = timeOfDays[taskIdx] || 'morning';

      tasks.push({
        title: `Day ${day}: ${['Foundation', 'Development', 'Practice'][taskIdx] || 'Progress'}`,
        description: `Complete your ${timeOfDay} work session for ${goal.title}.`,
        day_offset: day - 1,
        time_of_day: timeOfDay,
        subtasks: [
          { title: 'Start with a 5-minute warm-up', estimated_minutes: 5 },
          { title: 'Complete main activities', estimated_minutes: 20 },
          { title: 'Document your progress', estimated_minutes: 5 },
        ],
        time_allocation_minutes: 30,
        custom_time: undefined,
      });
    }
  }

  return tasks;
}

function extractPlanOutline(savedOutline: any): any[] {
  const outline: any[] = [];
  for (let i = 1; i <= 24; i++) {
    const title = savedOutline[`week_${i}_title`];
    const description = savedOutline[`week_${i}_description`];
    if (title && description) {
      outline.push({ title, description });
    } else if (title || description) {
      break;
    }
  }
  return outline;
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

async function insertTasks(
  supabase: any,
  goalId: string,
  tasks: TaskTemplate[],
  deviceNowIso: string,
  preferredTimeRanges: PreferredTimeRange[] | null,
  requestId: string
): Promise<any[]> {
  // Check if tasks already exist
  const { data: existingTasks, error: checkError } = await supabase
    .from('goal_tasks')
    .select('id')
    .eq('goal_id', goalId)
    .limit(1);

  if (checkError) {
    console.error(`[${requestId}] Error checking existing tasks:`, checkError);
    throw checkError;
  }

  if (existingTasks && existingTasks.length > 0) {
    console.log(`[${requestId}] Tasks already exist, skipping insertion`);
    return existingTasks;
  }

  const tasksToInsert = tasks.map((task) => {
    const runAt = computeRunAt(
      task.day_offset + 1,
      task.time_of_day,
      deviceNowIso,
      preferredTimeRanges
    );

    return {
      goal_id: goalId,
      title: task.title,
      description: task.description,
      day_offset: task.day_offset,
      time_of_day: task.time_of_day,
      subtasks: task.subtasks || [],
      time_allocation_minutes: task.time_allocation_minutes || 30,
      total_subtasks: task.subtasks?.length || 0,
      subtasks_completed: 0,
      custom_time: task.custom_time,
      run_at: runAt,
      local_run_at: runAt,
    };
  });

  const { data, error } = await supabase
    .from('goal_tasks')
    .insert(tasksToInsert)
    .select();

  if (error) {
    console.error(`[${requestId}] Error inserting tasks:`, error);
    throw error;
  }

  console.log(`[${requestId}] Inserted ${data?.length || 0} tasks`);
  return data || [];
}

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

async function checkAndDeductTokens(
  supabase: any,
  userId: string,
  tokensRequired: number,
  requestId: string
): Promise<{ success: boolean; remainingTokens: number; message?: string }> {
  try {
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_tokens')
      .select('tokens_remaining, tokens_used, is_subscribed, monthly_tokens')
      .eq('user_id', userId)
      .single();

    if (tokenError || !tokenData) {
      console.error(`[${requestId}] Token fetch error:`, tokenError);
      return {
        success: false,
        remainingTokens: 0,
        message: 'Failed to fetch token balance',
      };
    }

    let currentTokens = tokenData.tokens_remaining || 0;

    // Add monthly tokens for subscribers
    if (tokenData.is_subscribed && tokenData.monthly_tokens > 0) {
      currentTokens += tokenData.monthly_tokens;
      await supabase
        .from('user_tokens')
        .update({
          tokens_remaining: currentTokens,
          monthly_tokens: 0,
        })
        .eq('user_id', userId);
    }

    if (currentTokens < tokensRequired) {
      return {
        success: false,
        remainingTokens: currentTokens,
        message: `Insufficient tokens. You have ${currentTokens} but need ${tokensRequired}`,
      };
    }

    // Deduct tokens
    const newBalance = currentTokens - tokensRequired;
    const { error: updateError } = await supabase
      .from('user_tokens')
      .update({
        tokens_remaining: newBalance,
        tokens_used: (tokenData.tokens_used || 0) + tokensRequired,
        last_used_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error(`[${requestId}] Token update error:`, updateError);
      return {
        success: false,
        remainingTokens: currentTokens,
        message: 'Failed to update tokens',
      };
    }

    console.log(
      `[${requestId}] Tokens deducted: ${tokensRequired}, remaining: ${newBalance}`
    );
    return { success: true, remainingTokens: newBalance };
  } catch (error) {
    console.error(`[${requestId}] Token management error:`, error);
    return {
      success: false,
      remainingTokens: 0,
      message: 'Token management error',
    };
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    let body: RequestBody;
    try {
      body = await req.json();
      console.log(`[${requestId}] Request received:`, {
        user_id: body.user_id,
        goal_id: body.goal_id,
        has_device_info: !!body.device_now_iso,
      });
    } catch (jsonError) {
      console.error(`[${requestId}] JSON parse error:`, jsonError);
      return errorResponse(400, 'Invalid JSON in request body', requestId);
    }

    const { user_id, goal_id, device_now_iso, device_timezone } = body;

    // Validate required fields
    if (!user_id || !goal_id) {
      console.error(`[${requestId}] Missing fields:`, { user_id, goal_id });
      return errorResponse(
        400,
        'Missing required fields: user_id and goal_id',
        requestId
      );
    }

    // Set defaults for device info
    const finalDeviceNow = device_now_iso || new Date().toISOString();
    const finalTimezone = device_timezone || 'UTC';

    // Check and deduct tokens
    const tokenCheck = await checkAndDeductTokens(
      supabase,
      user_id,
      1,
      requestId
    );

    if (!tokenCheck.success) {
      console.log(`[${requestId}] Token check failed: ${tokenCheck.message}`);
      return errorResponse(
        402,
        tokenCheck.message || 'Insufficient tokens',
        requestId,
        Date.now() - startTime
      );
    }

    // Fetch goal with all necessary fields
    console.log(`[${requestId}] Fetching goal: ${goal_id}`);
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goal_id)
      .single();

    if (goalError || !goal) {
      console.error(`[${requestId}] Goal fetch error:`, goalError);
      return errorResponse(
        404,
        'Goal not found',
        requestId,
        Date.now() - startTime
      );
    }

    // Verify ownership
    if (goal.user_id !== user_id) {
      console.error(
        `[${requestId}] User ${user_id} does not own goal ${goal_id}`
      );
      return errorResponse(
        403,
        'Access denied',
        requestId,
        Date.now() - startTime
      );
    }

    // Check goal status - allow both 'paused' and 'active' states
    if (goal.status === 'failed') {
      console.log(`[${requestId}] Goal is in failed state`);
      return errorResponse(
        400,
        'Goal is in failed state. Please create a new goal.',
        requestId,
        Date.now() - startTime
      );
    }

    // For active goals, check if tasks already exist
    if (goal.status === 'active') {
      const { data: existingTasks } = await supabase
        .from('goal_tasks')
        .select('id')
        .eq('goal_id', goal_id)
        .limit(1);

      if (existingTasks && existingTasks.length > 0) {
        console.log(`[${requestId}] Tasks already exist for active goal`);
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Tasks already exist',
            request_id: requestId,
            processing_time_ms: Date.now() - startTime,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
    }

    // Fetch outline
    console.log(`[${requestId}] Fetching outline for goal`);
    const { data: savedOutline, error: outlineError } = await supabase
      .from('plan_outlines')
      .select('*')
      .eq('goal_id', goal_id)
      .single();

    if (outlineError) {
      if (outlineError.code === 'PGRST116') {
        console.error(`[${requestId}] No outline found`);
        return errorResponse(
          400,
          'Plan outline not found. Please wait for outline generation to complete.',
          requestId,
          Date.now() - startTime
        );
      }
      console.error(`[${requestId}] Outline fetch error:`, outlineError);
      return errorResponse(
        500,
        'Failed to load plan outline',
        requestId,
        Date.now() - startTime
      );
    }

    if (!savedOutline) {
      console.error(`[${requestId}] Outline is null`);
      return errorResponse(
        400,
        'Plan outline not ready',
        requestId,
        Date.now() - startTime
      );
    }

    // Generate tasks
    console.log(`[${requestId}] Generating tasks...`);
    const tasksResult = await generateTasksWithAI(
      goal as Goal,
      finalDeviceNow,
      savedOutline,
      requestId
    );

    if (tasksResult.tasks.length === 0) {
      console.error(`[${requestId}] No tasks generated`);
      return errorResponse(
        500,
        'Failed to generate tasks',
        requestId,
        Date.now() - startTime
      );
    }

    // Insert tasks
    console.log(`[${requestId}] Inserting ${tasksResult.tasks.length} tasks`);
    const insertedTasks = await insertTasks(
      supabase,
      goal_id,
      tasksResult.tasks,
      finalDeviceNow,
      goal.preferred_time_ranges,
      requestId
    );

    // Update goal status to active
    const { error: statusUpdateError } = await supabase
      .from('goals')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', goal_id);

    if (statusUpdateError) {
      console.error(`[${requestId}] Status update error:`, statusUpdateError);
    } else {
      console.log(`[${requestId}] Goal status updated to active`);
    }

    // Send push notification
    try {
      await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/push-dispatcher`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user_id,
            title: 'Tasks Generated',
            body: `Your ${goal.title} tasks are ready! ${insertedTasks.length} tasks created.`,
            data: {
              type: 'tasks_generated',
              goal_id: goal_id,
              task_count: insertedTasks.length,
              screen: 'dashboard',
            },
            sound: true,
            badge: 1,
          }),
        }
      );
      console.log(`[${requestId}] Push notification sent`);
    } catch (pushError) {
      console.warn(`[${requestId}] Push notification failed:`, pushError);
    }

    const totalTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        request_id: requestId,
        processing_time_ms: totalTime,
        tokens_used: 1,
        tokens_remaining: tokenCheck.remainingTokens,
        tasks_count: insertedTasks.length,
        used_model: tasksResult.usedModel,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const totalTime = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${requestId}] Error:`, message);
    console.error(
      `[${requestId}] Stack:`,
      error instanceof Error ? error.stack : ''
    );

    return errorResponse(
      500,
      `Internal error: ${message}`,
      requestId,
      totalTime
    );
  }
});
