import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function convertHHMMToTimeOfDay(hhmm: string): string {
  const [hoursStr] = hhmm.split(':');
  const hours = parseInt(hoursStr, 10);
  if (hours < 10) return 'morning';
  if (hours < 13) return 'mid_morning';
  if (hours < 18) return 'afternoon';
  return 'evening';
}

function computeRunAtDeviceAware(
  dayNumber: number,
  timeOfDay: string,
  deviceNowIso: string,
  deviceTimezone: string,
  preferredTimeRanges: PreferredTimeRange[] | undefined,
  preferredDays: number[] | undefined
): { runAt: string; startDecision: 'today' | 'tomorrow' } {
  const deviceNow = new Date(deviceNowIso);
  console.log(`[TIMING] Input - Day: ${dayNumber}, TimeOfDay: ${timeOfDay}, DeviceNow: ${deviceNowIso}, Timezone: ${deviceTimezone}`);
  console.log(`[TIMING] Device time: ${deviceNow.toISOString()}, Local: ${deviceNow.toLocaleString()}`);
  
  const timeSlots: Record<string, number> = { morning: 8, mid_morning: 10, afternoon: 14, evening: 20 };
  
  let targetHour = 8;
  if (preferredTimeRanges?.length) {
    const rangeIndex = timeOfDay === 'afternoon' ? 1 : timeOfDay === 'evening' ? 2 : 0;
    targetHour = preferredTimeRanges[rangeIndex]?.start_hour || 8;
  } else {
    targetHour = timeSlots[timeOfDay] || 8;
  }
  
  let targetDate = new Date(deviceNow);
  targetDate.setDate(targetDate.getDate() + (dayNumber - 1));
  targetDate.setHours(targetHour, 0, 0, 0);

  // Adjust for preferred days
  if (preferredDays?.length) {
    let dayOfWeek = targetDate.getDay();
      let daysToAdd = 1;
    while (!preferredDays.includes(dayOfWeek) && daysToAdd <= 7) {
      targetDate.setDate(targetDate.getDate() + 1);
      dayOfWeek = targetDate.getDay();
        daysToAdd++;
    }
  }

  let startDecision: 'today' | 'tomorrow' = 'today';
  let finalLocalTime = targetDate;

  if (dayNumber === 1) {
    const currentHour = deviceNow.getHours();
    const currentMinute = deviceNow.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    const targetTime = targetHour * 60;
    
    // Check if we have enough time left in the day
    const timeLeftToday = (23 * 60) - currentTime; // Minutes left until 23:00
    const requiredTime = 30; // Minimum 30 minutes per task
    
    console.log(`[TIMING] Day 1 - Current: ${currentHour}:${currentMinute.toString().padStart(2, '0')}, Target: ${targetHour}:00, Time left: ${timeLeftToday}min`);
    
    // If it's too late in the day or not enough time left, start tomorrow
    if (currentTime >= targetTime || timeLeftToday < requiredTime) {
      console.log(`[TIMING] Day 1 - Too late or not enough time, starting tomorrow`);
      startDecision = 'tomorrow';
      finalLocalTime = new Date(deviceNow);
      finalLocalTime.setDate(finalLocalTime.getDate() + 1);
      finalLocalTime.setHours(targetHour, 0, 0, 0);
    } else {
      // We have time today, but check if the target time has passed
      if (targetDate <= deviceNow) {
        console.log(`[TIMING] Day 1 - Target time has passed, finding next slot`);
        // Target time has passed, find next available slot
        const nextSlot = new Date(deviceNow);
        nextSlot.setMinutes(nextSlot.getMinutes() + 15);
        
        // If next slot is too late (after 23:00), start tomorrow
        if (nextSlot.getHours() >= 23) {
          console.log(`[TIMING] Day 1 - Next slot too late, starting tomorrow`);
          startDecision = 'tomorrow';
          finalLocalTime = new Date(deviceNow);
          finalLocalTime.setDate(finalLocalTime.getDate() + 1);
          finalLocalTime.setHours(targetHour, 0, 0, 0);
        } else {
          console.log(`[TIMING] Day 1 - Using next available slot: ${nextSlot.toISOString()}`);
          finalLocalTime = nextSlot;
        }
      } else {
        console.log(`[TIMING] Day 1 - Using target time: ${targetDate.toISOString()}`);
        finalLocalTime = targetDate;
      }
    }
  } else if (dayNumber === 2) {
      const tomorrow = new Date(deviceNow);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(targetHour, 0, 0, 0);
      finalLocalTime = tomorrow;
  }

  // Clamp to 07:00-23:00
  const clampedHour = Math.max(7, Math.min(23, finalLocalTime.getHours()));
  finalLocalTime.setHours(clampedHour, finalLocalTime.getMinutes(), 0, 0);

  // Final safety check - ensure we're not scheduling in the past
  if (finalLocalTime <= deviceNow) {
    console.log(`[TIMING] WARNING - Scheduled time is in the past! Moving to tomorrow.`);
    startDecision = 'tomorrow';
    finalLocalTime = new Date(deviceNow);
    finalLocalTime.setDate(finalLocalTime.getDate() + 1);
    finalLocalTime.setHours(targetHour, 0, 0, 0);
  }
  
  console.log(`[TIMING] Final result - Local: ${finalLocalTime.toISOString()}, Decision: ${startDecision}`);

  return {
    runAt: finalLocalTime.toISOString(),
    startDecision
  };
}

async function fetchWithRetry(url: string, init: RequestInit, maxRetries = 3): Promise<Response> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const response = await fetch(url, init);
      
      // Handle rate limiting and overloaded service
      if (response.status === 429 || response.status === 529) {
        if (i < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, i), 10000);
          console.log(`[AI] Rate limited/overloaded (${response.status}), retrying in ${delay}ms...`);
          await wait(delay);
          continue;
        }
      }
      
      if (response.ok) return response;
      
      // For other errors, try to get error details
      let errorDetails = '';
      try {
        const errorText = await response.text();
        errorDetails = ` - ${errorText.substring(0, 200)}`;
      } catch (e) {
        // Ignore text parsing errors
      }
      
      if (i === maxRetries) {
        throw new Error(`API error ${response.status}${errorDetails}`);
      }
      
      // For non-retryable errors, throw immediately
      if (response.status >= 400 && response.status < 500 && response.status !== 429 && response.status !== 529) {
        // Special handling for credit balance errors
        if (errorDetails.includes('credit balance') || errorDetails.includes('too low')) {
          throw new Error(`CREDIT_BALANCE_TOO_LOW: ${errorDetails}`);
        }
        throw new Error(`API error ${response.status}${errorDetails}`);
      }
      
      // For server errors, retry
      await wait(1000 * (i + 1));
    } catch (error) {
      if (i === maxRetries) throw error;
      await wait(1000 * (i + 1));
    }
  }
  throw new Error('Max retries exceeded');
}

// ============================================================================
// AI GENERATION - DETAILED TASKS
// ============================================================================

async function generateDetailedTasksWithAI(
  category: string,
  title: string,
  description: string,
  intensity: string,
  deviceNowIso: string,
  deviceTimezone: string,
  planDurationDays: number,
  preferredTimeRanges: PreferredTimeRange[] | undefined,
  preferredDays: number[] | undefined,
  savedOutline: any
): Promise<{ tasks: TaskTemplate[]; usedModel: string }> {
  try {
    console.log('[AI] Starting generateDetailedTasksWithAI...');
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey?.length) {
      console.error('[AI] ANTHROPIC_API_KEY is missing!');
      throw new Error('ANTHROPIC_API_KEY is missing');
    }
    console.log('[AI] API Key found, proceeding...');

    console.log('[AI] Extracting outline from saved data');
    console.log('[AI] Saved outline keys:', Object.keys(savedOutline));
    console.log('[AI] Saved outline sample:', JSON.stringify(savedOutline, null, 2).substring(0, 500));
    
    const outlineArray = extractPlanOutline(savedOutline);
    console.log(`[AI] Found ${outlineArray.length} weeks`);
    console.log('[AI] Extracted outline:', JSON.stringify(outlineArray, null, 2).substring(0, 500));

    if (outlineArray.length === 0) {
      return { tasks: generateTemplateTasks(planDurationDays, preferredTimeRanges, preferredDays), usedModel: 'template-fallback' };
    }

    const outlineContext = outlineArray.map(w => `${w.title}: ${w.description}`).join('\n');
    console.log('[AI] Outline context for AI:', outlineContext.substring(0, 500));
    
    const tasksPerDay = preferredTimeRanges?.length || 3;
    const daysPerWeek = preferredDays?.length || 7;
    const totalWorkingDays = Math.ceil((planDurationDays / 7) * daysPerWeek);
    const finalTaskCount = Math.min(totalWorkingDays * tasksPerDay, 30); // Limit to 30 tasks max
    
    console.log(`[AI] Generating ${finalTaskCount} tasks (${tasksPerDay} per day, ${totalWorkingDays} working days)`);

    console.log(`[AI] Requesting ${finalTaskCount} tasks from Claude`);
    console.log(`[AI] About to make API call to Anthropic...`);

    const systemPrompt = `You are a task generation expert. Generate exactly ${finalTaskCount} detailed, high-quality tasks in valid JSON format ONLY.

CRITICAL INSTRUCTIONS:
- Return ONLY valid JSON, no markdown, no explanations, no extra text
- Focus on creating the JSON structure, not introductory text
- Each task must be comprehensive, actionable, and valuable
- Task titles must be unique, descriptive, and professional (NO "Day X, Task X" format)
- Descriptions must be detailed and actionable (50-100 characters)
- Subtasks must be specific and measurable
- Use realistic time slots (09:00, 14:00, 19:00)
- Include 2-4 subtasks per task
- Make tasks progressive and building upon each other
- Focus on high-value, practical activities
- Ensure JSON is complete and valid
- Generate exactly ${finalTaskCount} tasks total

REQUIRED JSON STRUCTURE:
{
  "days": [
    {
      "day": 1,
      "summary": "Brief daily summary",
      "tasks": [
        {
          "time": "09:00",
          "title": "Specific task title",
          "description": "Detailed task description",
          "subtasks": [
            {"title": "Subtask 1", "estimated_minutes": 25},
            {"title": "Subtask 2", "estimated_minutes": 20},
            {"title": "Subtask 3", "estimated_minutes": 15}
          ],
          "time_allocation_minutes": 60
        }
      ]
    }
  ]
}

FOCUS ON:
- Creating comprehensive, actionable tasks
- Ensuring each task has clear value and purpose
- Making tasks progressive and interconnected
- Providing detailed, specific subtasks
- Using professional, descriptive titles
- Maintaining consistent quality throughout`;

    const userPrompt = `Generate ${finalTaskCount} detailed tasks for: "${title}"

GOAL: ${title}
DESCRIPTION: ${description}
CATEGORY: ${category}
INTENSITY: ${intensity}
DURATION: ${planDurationDays} days
TASKS PER DAY: ${tasksPerDay}
WORKING DAYS: ${preferredDays?.length ? 'selected days' : 'all days'}

PLAN OUTLINE CONTEXT:
${outlineContext}

USER PREFERENCES:
- Time Ranges: ${preferredTimeRanges?.map(r => `${r.label} (${r.start_hour}:00-${r.end_hour}:00)`).join(', ') || 'Default'}
- Preferred Days: ${preferredDays?.map(d => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d]).join(', ') || 'All days'}
- Device Timezone: ${deviceTimezone}
- Current Time: ${deviceNowIso}

CRITICAL REQUIREMENTS:
- Generate exactly ${finalTaskCount} tasks total
- ${tasksPerDay} tasks per day
- Use time slots: 09:00, 14:00, 19:00
- Each task needs 2-4 detailed subtasks
- Task titles must be unique, descriptive, and professional (NO "Day X, Task X" format)
- Descriptions must be comprehensive and actionable
- Make tasks highly specific and valuable
- Focus on high-value, practical activities
- Ensure tasks are progressive and build upon each other
- Include measurable outcomes and deliverables
- Make each day distinct and valuable
- Return ONLY valid JSON, no markdown formatting
- Generate detailed, professional-quality tasks

FOCUS ON CREATING THE JSON STRUCTURE WITH COMPREHENSIVE TASKS BASED ON THE PLAN OUTLINE AND USER PREFERENCES.`;

    console.log(`[AI] Making API call to Anthropic...`);
    const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022', // Faster model
              max_tokens: 15000, // Reduced from 30000
        messages: [{ role: 'user', content: `${systemPrompt}\n${userPrompt}` }]
      })
    });

    console.log(`[AI] Response status: ${response.status}`);
    console.log(`[AI] Response headers:`, Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log(`[AI] Response data keys:`, Object.keys(data));

    if (!data.content?.[0]?.text) {
      console.warn('[AI] Invalid response, using template fallback');
      return { tasks: generateTemplateTasks(planDurationDays, preferredTimeRanges, preferredDays), usedModel: 'template-fallback' };
    }

    const text = data.content[0].text;
    const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();

    console.log(`[AI] Raw response text: ${text.substring(0, 500)}...`);
    console.log(`[AI] Cleaned text: ${cleanedText.substring(0, 500)}...`);

    let planData;
    try {
      // Try to fix common JSON issues
      let fixedText = cleanedText;
      
      // Remove any trailing commas before closing braces/brackets
      fixedText = fixedText.replace(/,(\s*[}\]])/g, '$1');
      
      // Try to find and fix incomplete JSON
      const lastBrace = fixedText.lastIndexOf('}');
      const lastBracket = fixedText.lastIndexOf(']');
      const lastComplete = Math.max(lastBrace, lastBracket);
      
      if (lastComplete > 0 && lastComplete < fixedText.length - 10) {
        // Try to complete the JSON
        const truncated = fixedText.substring(0, lastComplete + 1);
        try {
          planData = JSON.parse(truncated);
          console.log(`[AI] Successfully parsed truncated JSON with ${planData.days?.length || 0} days`);
        } catch (truncatedError) {
          throw new Error('JSON parsing failed'); // Fall back to original error
        }
      } else {
        planData = JSON.parse(fixedText);
        console.log(`[AI] Successfully parsed JSON with ${planData.days?.length || 0} days`);
      }
    } catch (parseError) {
      console.warn('[AI] JSON parse failed, using template fallback');
      console.error('[AI] Parse error:', parseError);
      console.error('[AI] Failed to parse text:', cleanedText.substring(0, 1000));
      return { tasks: generateTemplateTasks(planDurationDays, preferredTimeRanges, preferredDays), usedModel: 'template-fallback' };
    }

    const tasks: TaskTemplate[] = [];
    const usedTimeSlots = new Map<string, Set<string>>();

    for (const day of planData.days || []) {
      const dayNumber = day.day;

      if (preferredDays?.length) {
        const dayOfWeek = (dayNumber - 1) % 7;
        if (!preferredDays.includes(dayOfWeek)) continue;
      }

      for (const task of day.tasks?.slice(0, tasksPerDay) || []) {
        try {
          const timeOfDay = convertHHMMToTimeOfDay(task.time);
          const timing = computeRunAtDeviceAware(
            dayNumber,
            timeOfDay,
            deviceNowIso,
            deviceTimezone,
            preferredTimeRanges,
            preferredDays
          );

          let finalTime = new Date(timing.runAt);
          const dayKey = finalTime.toDateString();

          if (!usedTimeSlots.has(dayKey)) {
            usedTimeSlots.set(dayKey, new Set());
          }

          const timeSlot = `${finalTime.getHours().toString().padStart(2, '0')}:${finalTime.getMinutes().toString().padStart(2, '0')}`;
          const daySlots = usedTimeSlots.get(dayKey)!;

          let attempts = 0;
          while (daySlots.has(timeSlot) && attempts < 50) {
            finalTime.setMinutes(finalTime.getMinutes() + 15);
            if (finalTime.getHours() >= 23) {
              finalTime.setDate(finalTime.getDate() + 1);
              finalTime.setHours(7, 0, 0, 0);
            }
            attempts++;
          }

          const newTimeSlot = `${finalTime.getHours().toString().padStart(2, '0')}:${finalTime.getMinutes().toString().padStart(2, '0')}`;
          daySlots.add(newTimeSlot);

          const duration = task.time_allocation_minutes || 30;
          const reservedSlots = Math.ceil(duration / 15);
          for (let i = 1; i < reservedSlots; i++) {
            const reserved = new Date(finalTime.getTime() + i * 15 * 60 * 1000);
            daySlots.add(
              `${reserved.getHours().toString().padStart(2, '0')}:${reserved.getMinutes().toString().padStart(2, '0')}`
            );
          }

          tasks.push({
            title: task.title || `Task for ${timeOfDay}`,
            description: task.description || 'Complete this task as part of your daily progress.',
            day_offset: dayNumber - 1,
            time_of_day: timeOfDay,
                subtasks: task.subtasks || [],
            time_allocation_minutes: duration,
            custom_time: task.time
          });
        } catch (taskError) {
          console.warn(`[AI] Error processing task on day ${dayNumber}:`, taskError);
        }
      }
    }

    console.log(`[AI] Generated ${tasks.length} tasks successfully`);
    return { tasks, usedModel: 'claude-3-5-sonnet-20241022' };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[AI] Critical error in generateDetailedTasksWithAI: ${msg}`);
    console.error(`[AI] Error stack:`, error instanceof Error ? error.stack : 'No stack');
    console.error(`[AI] Error type:`, typeof error);
    console.error(`[AI] Full error object:`, JSON.stringify(error, null, 2));
    return { tasks: generateTemplateTasks(planDurationDays, preferredTimeRanges, preferredDays), usedModel: 'template-fallback' };
  }
}

// ============================================================================
// TEMPLATE TASK GENERATION (FALLBACK)
// ============================================================================

function generateTemplateTasks(
  planDurationDays: number,
  preferredTimeRanges: PreferredTimeRange[] | undefined,
  preferredDays: number[] | undefined
): TaskTemplate[] {
      const tasks: TaskTemplate[] = [];
  const tasksPerDay = preferredTimeRanges?.length || 3;
  const timeOfDays = ['morning', 'afternoon', 'evening'];

  for (let day = 1; day <= planDurationDays; day++) {
    // Check if this day is in preferred days
    if (preferredDays?.length) {
      const dayOfWeek = (day - 1) % 7;
              if (!preferredDays.includes(dayOfWeek)) {
            continue;
      }
    }

    for (let taskIdx = 0; taskIdx < tasksPerDay; taskIdx++) {
      const timeOfDay = timeOfDays[taskIdx] || 'morning';
      
      tasks.push({
        title: `Day ${day}: Task ${taskIdx + 1} - ${['Foundation', 'Development', 'Practice'][taskIdx] || 'Progress'}`,
        description: `Complete your ${timeOfDay} focused work session. Break down the task into smaller subtasks and track your progress.`,
        day_offset: day - 1,
        time_of_day: timeOfDay,
        subtasks: [
          { title: 'Start with a 5-minute warm-up', estimated_minutes: 5 },
          { title: 'Complete main task activities', estimated_minutes: 20 },
          { title: 'Document your progress and learnings', estimated_minutes: 5 }
        ],
        time_allocation_minutes: 30,
        custom_time: undefined
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

async function insertTasks(
  supabase: any,
  goalId: string,
  tasks: TaskTemplate[],
  deviceNowIso: string,
  deviceTimezone: string,
  preferredTimeRanges: PreferredTimeRange[] | undefined,
  preferredDays: number[] | undefined
): Promise<any[]> {
  // First, check if tasks already exist for this goal
  const { data: existingTasks, error: checkError } = await supabase
    .from('goal_tasks')
    .select('id, title, day_offset, time_of_day')
    .eq('goal_id', goalId);

  if (checkError) {
    console.error('❌ Failed to check existing tasks:', checkError);
    throw checkError;
  }

  if (existingTasks && existingTasks.length > 0) {
    console.log(`⚠️ Tasks already exist for goal ${goalId}, skipping insertion`);
    return existingTasks;
  }

  const tasksToInsert = tasks.map(task => {
    // Calculate proper run_at and local_run_at using the timing function
    const timing = computeRunAtDeviceAware(
      task.day_offset + 1, // day_offset is 0-based, but function expects 1-based
      task.time_of_day,
      deviceNowIso,
      deviceTimezone,
      preferredTimeRanges,
      preferredDays
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
      run_at: timing.runAt,
      local_run_at: timing.runAt // Use the same time for both
    };
  });

  const { data, error } = await supabase
    .from('goal_tasks')
    .insert(tasksToInsert)
    .select();

  if (error) {
    console.error('❌ Failed to insert tasks:', error);
    throw error;
  }
  console.log(`✅ Inserted ${data?.length || 0} tasks`);
  return data || [];
}

function errorResponse(status: number, message: string, requestId: string, processingTime = 0) {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      request_id: requestId,
      processing_time_ms: processingTime
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status }
  );
}

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

async function checkAndDeductTokens(
  supabase: any,
  user_id: string,
  tokensRequired: number,
  requestId: string
): Promise<{ success: boolean; remainingTokens: number; message?: string }> {
  try {
    // Get user's current token balance from user_tokens table
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_tokens')
      .select('tokens_remaining, tokens_used, is_subscribed, monthly_tokens')
      .eq('user_id', user_id)
      .single();

    if (tokenError) {
      console.error(`[${requestId}] Error fetching user tokens:`, tokenError);
      return { success: false, remainingTokens: 0, message: 'Failed to fetch user token balance' };
    }

    if (!tokenData) {
      console.error(`[${requestId}] User tokens not found:`, user_id);
      return { success: false, remainingTokens: 0, message: 'User tokens not found' };
    }

    let currentTokens = tokenData.tokens_remaining || 0;
    const isSubscribed = tokenData.is_subscribed || false;
    const monthlyTokens = tokenData.monthly_tokens || 0;

    // If user is subscribed and has monthly tokens, add them to balance
    if (isSubscribed && monthlyTokens > 0) {
      console.log(`[${requestId}] Subscribed user detected, adding ${monthlyTokens} monthly tokens`);
      currentTokens += monthlyTokens;
      
      // Update the user's token balance with monthly tokens
      const { error: updateMonthlyError } = await supabase
        .from('user_tokens')
        .update({ 
          tokens_remaining: currentTokens,
          monthly_tokens: 0 // Reset monthly tokens after adding them
        })
        .eq('user_id', user_id);

      if (updateMonthlyError) {
        console.error(`[${requestId}] Error updating monthly tokens:`, updateMonthlyError);
      }
    }

    if (currentTokens < tokensRequired) {
      console.log(`[${requestId}] Insufficient tokens: ${currentTokens} < ${tokensRequired}`);
    return {
        success: false,
        remainingTokens: currentTokens,
        message: `Insufficient tokens. You have ${currentTokens} tokens but need ${tokensRequired}`
      };
    }

    // Deduct tokens and update usage
    const newTokenBalance = currentTokens - tokensRequired;
    const newTokensUsed = (tokenData.tokens_used || 0) + tokensRequired;
    
    const { error: updateError } = await supabase
      .from('user_tokens')
      .update({ 
        tokens_remaining: newTokenBalance,
        tokens_used: newTokensUsed,
        last_used_at: new Date().toISOString(),
        usage_count: (tokenData.usage_count || 0) + 1
      })
      .eq('user_id', user_id);

    if (updateError) {
      console.error(`[${requestId}] Error updating tokens:`, updateError);
      return { success: false, remainingTokens: currentTokens, message: 'Failed to update token balance' };
    }

    console.log(`[${requestId}] Tokens deducted: ${tokensRequired}, remaining: ${newTokenBalance}`);
    return { success: true, remainingTokens: newTokenBalance };

  } catch (error) {
    console.error(`[${requestId}] Token management error:`, error);
    return { success: false, remainingTokens: 0, message: 'Token management error' };
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

    let body;
    try {
      body = await req.json();
      console.log(`[${requestId}] Request body:`, JSON.stringify(body, null, 2));
    } catch (jsonError) {
      console.error(`[${requestId}] JSON parsing error:`, jsonError);
      return errorResponse(400, 'Invalid JSON in request body', requestId);
    }

    const {
      user_id,
      goal_id,
      device_now_iso,
      device_timezone
    } = body;

    console.log(`[${requestId}] Parsed params: user_id=${user_id}, goal_id=${goal_id}, device_now_iso=${device_now_iso}, device_timezone=${device_timezone}`);

    // Validate
    if (!user_id || !goal_id) {
      console.error(`[${requestId}] Missing required fields: user_id=${user_id}, goal_id=${goal_id}`);
      return errorResponse(400, 'Missing required fields', requestId);
    }

    // Check and deduct tokens
    const tokensRequired = 1; // 1 token for task generation
    const tokenCheck = await checkAndDeductTokens(supabase, user_id, tokensRequired, requestId);
    
    if (!tokenCheck.success) {
      console.log(`[${requestId}] Token check failed: ${tokenCheck.message}`);
      return errorResponse(402, tokenCheck.message || 'Insufficient tokens', requestId, Date.now() - startTime);
    }

    console.log(`[${requestId}] Tokens deducted: ${tokensRequired}, remaining: ${tokenCheck.remainingTokens}`);

    // Verify goal and get advanced settings
    console.log(`[${requestId}] Looking for goal with ID: ${goal_id}`);
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('id, title, description, category, intensity, plan_duration_days, preferred_time_ranges, preferred_days, status, user_id')
      .eq('id', goal_id)
      .single();

    if (goalError || !goal) {
      console.error(`[${requestId}] Goal fetch error:`, goalError);
      console.error(`[${requestId}] Goal data:`, goal);
      return errorResponse(404, 'Goal not found', requestId);
    }

    console.log(`[${requestId}] Found goal:`, JSON.stringify(goal, null, 2));

    // Verify user matches the goal owner
    if (goal.user_id !== user_id) {
      console.error(`[${requestId}] User ${user_id} does not own goal ${goal_id} (owner: ${goal.user_id})`);
      return errorResponse(403, 'Access denied: Goal belongs to different user', requestId);
    }

    // Check if goal is in a valid state for task generation
    if (goal.status === 'failed') {
      console.log(`[${requestId}] Goal ${goal_id} is in failed state, cannot generate tasks`);
      return errorResponse(400, 'Goal is in failed state. Please create a new goal.', requestId);
    }

    if (goal.status !== 'paused') {
      console.log(`[${requestId}] Goal ${goal_id} is not in paused state (status: ${goal.status}), cannot generate tasks`);
      return errorResponse(400, 'Goal is not ready for task generation. Please ensure the plan outline is complete.', requestId);
    }

    console.log(`[${requestId}] Generating tasks for: ${goal.title}`);

    // Load outline from plan_outlines table
    console.log(`[${requestId}] Loading outline from plan_outlines table...`);
    
    const { data: savedOutline, error: outlineError } = await supabase
      .from('plan_outlines')
      .select('*')
      .eq('goal_id', goal_id)
      .single();

    if (outlineError) {
      console.error(`[${requestId}] Outline fetch error:`, outlineError);
      
      // If it's a "no rows" error, the outline doesn't exist yet
      if (outlineError.code === 'PGRST116') {
        console.error(`[${requestId}] No outline found for goal ${goal_id} - outline may not be ready yet`);
        return errorResponse(400, 'Outline not found. The plan outline may still be generating. Please try again in a few moments.', requestId);
      }
      
      return errorResponse(400, `Failed to load outline: ${outlineError.message}`, requestId);
    }

    if (!savedOutline) {
      console.error(`[${requestId}] No outline found for goal ${goal_id}`);
      return errorResponse(400, 'Outline not found. Run outline generation first.', requestId);
    }

    console.log(`[${requestId}] Outline loaded successfully. Generating tasks...`);

    // Use goal's advanced settings
    const finalPlanDuration = goal.plan_duration_days || 21;
    const finalTimeRanges = goal.preferred_time_ranges;
    const finalPreferredDays = goal.preferred_days;

    console.log(`[${requestId}] Using settings: duration=${finalPlanDuration}, timeRanges=${JSON.stringify(finalTimeRanges)}, preferredDays=${JSON.stringify(finalPreferredDays)}`);

    let tasksResult;
    try {
      console.log(`[${requestId}] Starting AI task generation...`);
      console.log(`[${requestId}] API Key available: ${Deno.env.get('ANTHROPIC_API_KEY') ? 'YES' : 'NO'}`);
      
      tasksResult = await generateDetailedTasksWithAI(
        goal.category, 
        goal.title, 
        goal.description, 
        goal.intensity, 
        device_now_iso || new Date().toISOString(),
        device_timezone || 'UTC',
        finalPlanDuration,
        finalTimeRanges,
        finalPreferredDays,
        savedOutline
      );
      console.log(`[${requestId}] Task generation returned ${tasksResult.tasks.length} tasks`);
      console.log(`[${requestId}] Used model: ${tasksResult.usedModel}`);
    } catch (aiError) {
      const errorMsg = aiError instanceof Error ? aiError.message : String(aiError);
      console.error(`[${requestId}] Task generation failed:`, errorMsg);
      console.error(`[${requestId}] Error stack:`, aiError instanceof Error ? aiError.stack : 'No stack');
      
      // Check for specific error types
      if (errorMsg.includes('ANTHROPIC_API_KEY is missing')) {
        console.error(`[${requestId}] CRITICAL: API Key is missing!`);
      } else if (errorMsg.includes('credit balance') || errorMsg.includes('too low')) {
        console.error(`[${requestId}] CRITICAL: Credit balance too low!`);
      } else if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
        console.error(`[${requestId}] CRITICAL: Rate limited!`);
      } else if (errorMsg.includes('timeout')) {
        console.error(`[${requestId}] CRITICAL: Request timeout!`);
      }
      
      // Fallback: generate template tasks instead of failing completely
      console.log(`[${requestId}] Falling back to template tasks...`);
      tasksResult = {
        tasks: generateTemplateTasks(finalPlanDuration, finalTimeRanges, finalPreferredDays),
        usedModel: 'template-fallback'
      };
      console.log(`[${requestId}] Generated ${tasksResult.tasks.length} template tasks as fallback`);
    }

    let insertedTasks: any[] = [];
    if (tasksResult.tasks.length > 0) {
      console.log(`[${requestId}] Inserting ${tasksResult.tasks.length} tasks into database...`);
      try {
        insertedTasks = await insertTasks(
          supabase, 
          goal_id, 
          tasksResult.tasks,
        device_now_iso, 
        device_timezone, 
          finalTimeRanges,
          finalPreferredDays
        );
        console.log(`[${requestId}] Successfully inserted ${insertedTasks.length} tasks`);
        
        // Verify tasks were actually inserted by checking the database
        const { data: verifyTasks, error: verifyError } = await supabase
          .from('goal_tasks')
          .select('id, title')
          .eq('goal_id', goal_id)
          .limit(5);
          
        if (verifyError) {
          console.error(`[${requestId}] Error verifying task insertion:`, verifyError);
          return errorResponse(500, `Failed to verify task insertion: ${verifyError.message}`, requestId);
        }
        
        if (!verifyTasks || verifyTasks.length === 0) {
          console.error(`[${requestId}] No tasks found in database after insertion`);
          return errorResponse(500, 'Tasks were not properly inserted into database', requestId);
        }
        
        console.log(`[${requestId}] Verified ${verifyTasks.length} tasks are in database`);
        
        // Update goal status to active after successful task generation
        const { error: statusUpdateError } = await supabase
          .from('goals')
          .update({ 
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', goal_id);
          
        if (statusUpdateError) {
          console.error(`[${requestId}] Error updating goal status:`, statusUpdateError);
        } else {
          console.log(`[${requestId}] Goal status updated to active`);
        }
      } catch (insertError) {
        const errorMsg = insertError instanceof Error ? insertError.message : String(insertError);
        console.error(`[${requestId}] Task insertion failed:`, errorMsg);
        return errorResponse(500, `Failed to insert tasks: ${errorMsg}`, requestId);
      }
    } else {
      console.warn(`[${requestId}] No tasks generated. Returning error.`);
      return errorResponse(400, 'No tasks could be generated. Please try again.', requestId);
    }

    // Send push notification for task completion
    try {
      // Double-check that tasks are actually in the database before sending notification
      const { data: finalTaskCheck, error: finalCheckError } = await supabase
        .from('goal_tasks')
        .select('id')
        .eq('goal_id', goal_id)
        .limit(1);
        
      if (finalCheckError) {
        console.error(`[${requestId}] Final task check failed:`, finalCheckError);
        console.warn(`[${requestId}] Skipping notification due to task verification failure`);
      } else if (!finalTaskCheck || finalTaskCheck.length === 0) {
        console.error(`[${requestId}] No tasks found in final check, skipping notification`);
      } else {
        console.log(`[${requestId}] Final verification passed, sending notification`);
        
        const pushResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/push-dispatcher`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user_id,
            title: 'Tasks Generated',
            body: `Your ${goal.title} tasks are ready. ${insertedTasks.length} tasks have been created for your journey.`,
            data: {
              type: 'tasks_generated',
              goal_id: goal_id, 
              stage: 'tasks', 
              task_count: insertedTasks.length,
              screen: 'dashboard'
            },
            sound: true,
            badge: 1
          }),
        });

        if (!pushResponse.ok) {
          const errorText = await pushResponse.text();
          console.error('❌ Push notification failed for tasks:', errorText);
        } else {
          console.log('✅ Push notification sent successfully for tasks');
        }
      }
    } catch (pushError) {
      console.warn('Failed to send push notification:', pushError);
    }

    const totalTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        request_id: requestId,
        processing_time_ms: totalTime,
        tokens_used: tokensRequired,
        tokens_remaining: tokenCheck.remainingTokens,
        tasks: insertedTasks,
        tasks_count: insertedTasks.length,
        used_model: tasksResult.usedModel
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    const totalTime = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : '';
    console.error(`[${requestId}] Error: ${message}`);
    console.error(`[${requestId}] Stack: ${stack}`);
    console.error(`[${requestId}] Error object:`, JSON.stringify(error, null, 2));
    
    // Mark goal as failed if there's an error
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      const { error: statusUpdateError } = await supabase
        .from('goals')
        .update({ 
          status: 'failed',
          error_message: message,
          updated_at: new Date().toISOString()
        })
        .eq('id', goal_id);
        
      if (statusUpdateError) {
        console.error(`[${requestId}] Error updating goal status to failed:`, statusUpdateError);
      } else {
        console.log(`[${requestId}] Goal status updated to failed`);
      }
    } catch (updateError) {
      console.error(`[${requestId}] Error updating goal status:`, updateError);
    }
    
    return errorResponse(500, `${message}. Check function logs for details.`, requestId, totalTime);
  }
});
