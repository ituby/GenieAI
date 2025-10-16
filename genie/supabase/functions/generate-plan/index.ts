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

interface AIResult {
  iconName: string;
  color: string;
  milestones: any[];
  planOutline: any[];
  category: string;
  deliverables: any;
  usedModel: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const VALID_CATEGORIES = ['lifestyle', 'career', 'mindset', 'character', 'goal', 'learning', 'health', 'finance', 'social', 'fitness', 'creativity', 'custom'];
const VALID_INTENSITIES = ['easy', 'medium', 'hard'];
const CATEGORY_COLOR_MAP: Record<string, string> = {
  lifestyle: 'green',
  career: 'blue',
  mindset: 'purple',
  character: 'pink',
  custom: 'yellow'
};
const FALLBACK_ICONS: Record<string, string> = {
  lifestyle: 'heart',
  career: 'briefcase',
  mindset: 'brain',
  character: 'star',
  custom: 'target'
};

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

function buildTailoredOutline(title: string, description: string): any[] {
  const shortTitle = (title || 'Your Goal').trim().slice(0, 50);
  return [
    { 
      title: `Week 1 • ${shortTitle} - Foundation`, 
      description: `Establish core systems and build momentum. Create strong foundations for success.` 
    },
    { 
      title: `Week 2 • ${shortTitle} - Development`, 
      description: `Develop skills and deepen expertise. Practice and apply what you've learned.` 
    },
    { 
      title: `Week 3 • ${shortTitle} - Mastery`, 
      description: `Master your skills and achieve your goals. Celebrate your transformation.` 
    }
  ];
}

function buildTailoredMilestones(title: string, planDurationDays: number = 21): any[] {
  const totalWeeks = Math.ceil(planDurationDays / 7);
  const t = (title || 'Your Goal').trim().slice(0, 60);

  const milestones: any[] = [];
  for (let week = 1; week <= totalWeeks; week++) {
    if (week === 1) {
      milestones.push({
        week,
        title: `Kickoff • ${t} Foundations`,
        description: 'Establish core systems, momentum, and measurement to start strong.',
        tasks: Math.ceil(planDurationDays / totalWeeks)
      });
    } else if (week === totalWeeks) {
      milestones.push({
        week,
        title: `Elevate • ${t} Mastery`,
        description: 'Integrate, optimize, and prepare for sustainable long-term success.',
        tasks: Math.ceil(planDurationDays / totalWeeks)
      });
    } else {
      milestones.push({
        week,
        title: `Build • ${t} Skills`,
        description: 'Advance skills with deliberate practice and concrete outputs.',
        tasks: Math.ceil(planDurationDays / totalWeeks)
      });
    }
  }
  return milestones;
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
    
    // If it's too late in the day or not enough time left, start tomorrow
    if (currentTime >= targetTime || timeLeftToday < requiredTime) {
      startDecision = 'tomorrow';
      finalLocalTime = new Date(deviceNow);
      finalLocalTime.setDate(finalLocalTime.getDate() + 1);
      finalLocalTime.setHours(targetHour, 0, 0, 0);
    } else {
      // We have time today, but check if the target time has passed
      if (targetDate <= deviceNow) {
        // Target time has passed, find next available slot
        const nextSlot = new Date(deviceNow);
        nextSlot.setMinutes(nextSlot.getMinutes() + 15);
        
        // If next slot is too late (after 23:00), start tomorrow
        if (nextSlot.getHours() >= 23) {
          startDecision = 'tomorrow';
          finalLocalTime = new Date(deviceNow);
          finalLocalTime.setDate(finalLocalTime.getDate() + 1);
          finalLocalTime.setHours(targetHour, 0, 0, 0);
        } else {
          finalLocalTime = nextSlot;
        }
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

  return {
    runAt: finalLocalTime.toISOString(),
    startDecision
  };
}

async function fetchWithRetry(url: string, init: RequestInit, maxRetries = 3): Promise<Response> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const response = await fetch(url, init);
      if (response.ok) return response;
      if (response.status === 429 && i < maxRetries) {
        await wait(Math.min(1000 * Math.pow(2, i), 10000));
        continue;
      }
      if (!response.ok) throw new Error(`API error ${response.status}`);
      return response;
    } catch (error) {
      if (i === maxRetries) throw error;
      await wait(1000 * (i + 1));
    }
  }
  throw new Error('Max retries exceeded');
}

// ============================================================================
// AI GENERATION - STAGE 1: OUTLINE
// ============================================================================

async function generatePlanOutlineWithAI(
  category: string,
  title: string,
  description: string,
  intensity: string,
  planDurationDays: number,
  preferredTimeRanges: PreferredTimeRange[] | undefined,
  preferredDays: number[] | undefined,
  deviceNowIso: string,
  deviceTimezone: string
): Promise<AIResult> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey?.length) throw new Error('ANTHROPIC_API_KEY is missing');

  const systemPrompt = `You are Genie, an AI mentor creating professional 21-day transformation plans.
Generate ONLY valid JSON (no markdown, no explanations):
{
  "category": "lifestyle|career|mindset|character|custom",
  "icon_name": "star",
  "milestones": [{"week": 1, "title": "...", "description": "...", "tasks": 21}],
  "plan_outline": [{"title": "Week 1...", "description": "..."}],
  "deliverables": {"overview": {"chosen_topic": "", "rationale": "", "synopsis": ""}, "sections": []}
}

CRITICAL: You MUST choose icon_name from this exact list (no other icons allowed):
user, user-circle, user-square, users, person-simple-run, person-simple-walk, person-simple-bike, fingerprint, hand-heart, heart, star, target, lightbulb, rocket, trophy, medal, crown, sparkle, compass, shield, key, lock, puzzle-piece, infinity, atom, flask, globe, test-tube, briefcase, laptop, building, bank, money, coins, credit-card, wallet, chart-line, chart-pie, storefront, handshake, book, book-open, graduation-cap, pencil, calculator, leaf, sun, moon, tree, flower, cloud, rainbow, drop, mountains, wave, fire, bicycle, music-notes, camera, brain, eye, eye-closed, bell, chat-circle, chat-text, paper-plane, calendar, clock, map-pin, globe-hemisphere-west, thumbs-up, thumbs-down, password

Example icon selections:
- Fitness/health goals → person-simple-run, heart, leaf
- Career/business → briefcase, rocket, chart-line
- Learning/education → book, graduation-cap, brain
- Personal development → sparkle, target, compass
- Money/finance → money, wallet, chart-pie`;

  const userPrompt = `Create a ${planDurationDays}-day plan:
Title: ${title}
Description: ${description}
Category: ${category}
Intensity: ${intensity}`;

  const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 4096,
      messages: [{ role: 'user', content: `${systemPrompt}\n${userPrompt}` }]
    })
  });

  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();

  console.log(`[AI] Outline raw response: ${text.substring(0, 500)}...`);
  console.log(`[AI] Outline cleaned text: ${cleanedText.substring(0, 500)}...`);

  let planData;
  try {
    planData = JSON.parse(cleanedText);
    console.log(`[AI] Outline successfully parsed JSON`);
  } catch (parseError) {
    console.warn('[AI] Outline JSON parse failed, using fallback');
    console.error('[AI] Outline parse error:', parseError);
    console.error('[AI] Failed to parse outline text:', cleanedText.substring(0, 1000));
    
    // Return fallback data
    return {
      iconName: 'star',
      color: CATEGORY_COLOR_MAP[category] || 'yellow',
      milestones: buildTailoredMilestones(title, planDurationDays),
      planOutline: buildTailoredOutline(title, description),
      category,
      deliverables: { overview: { chosen_topic: '', rationale: '', synopsis: '' }, sections: [] },
      usedModel: 'template-fallback'
    };
  }

  return {
    iconName: planData.icon_name || 'star',
    color: CATEGORY_COLOR_MAP[category] || 'yellow',
    milestones: planData.milestones || buildTailoredMilestones(title, planDurationDays),
    planOutline: planData.plan_outline || buildTailoredOutline(title, description),
    category,
    deliverables: planData.deliverables || { overview: { chosen_topic: '', rationale: '', synopsis: '' }, sections: [] },
    usedModel: 'claude-opus-4-1-20250805'
  };
}

// ============================================================================
// AI GENERATION - STAGE 2: DETAILED TASKS
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
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey?.length) throw new Error('ANTHROPIC_API_KEY is missing');

    console.log('[AI] Extracting outline from saved data');
    const outlineArray = extractPlanOutline(savedOutline);
    console.log(`[AI] Found ${outlineArray.length} weeks`);

    if (outlineArray.length === 0) {
      return { tasks: generateTemplateTasks(planDurationDays, preferredTimeRanges, preferredDays), usedModel: 'template-fallback' };
    }

    const outlineContext = outlineArray.map(w => `${w.title}: ${w.description}`).join('\n');
    const tasksPerDay = preferredTimeRanges?.length || 3;
    const daysPerWeek = preferredDays?.length || 7;
    const totalWorkingDays = Math.ceil((planDurationDays / 7) * daysPerWeek);

    console.log(`[AI] Requesting ${totalWorkingDays * tasksPerDay} tasks from Claude`);

    const systemPrompt = `Generate exactly ${totalWorkingDays * tasksPerDay} tasks in valid JSON only (no markdown):
{
  "days": [{"day": 1, "summary": "...", "tasks": [{"time": "09:00", "title": "...", "description": "...", "subtasks": [{"title": "...", "estimated_minutes": 15}], "time_allocation_minutes": 30}]}]
}`;

    const userPrompt = `Create ${totalWorkingDays * tasksPerDay} tasks for "${title}" over ${planDurationDays} days, ${tasksPerDay} tasks per day on ${preferredDays?.length ? 'selected' : 'all'} days.

Goal Description: ${description}
Category: ${category}
Intensity: ${intensity}`;

    const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
        model: 'claude-opus-4-1-20250805',
              max_tokens: 8192,
        messages: [{ role: 'user', content: `${systemPrompt}\n${userPrompt}` }]
      })
    });

    console.log(`[AI] Response status: ${response.status}`);
    const data = await response.json();

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
      planData = JSON.parse(cleanedText);
      console.log(`[AI] Successfully parsed JSON with ${planData.days?.length || 0} days`);
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
    return { tasks, usedModel: 'claude-opus-4-1-20250805' };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[AI] Critical error: ${msg}`);
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

async function savePlanOutline(
  supabase: any,
  goalId: string,
  result: AIResult,
  startTime: number
): Promise<void> {
  const planOutlineData: Record<string, any> = {
    goal_id: goalId,
    milestones: result.milestones,
    deliverables: result.deliverables,
    ai_model_used: result.usedModel,
    generation_latency_ms: Date.now() - startTime
  };

  // Save week-by-week data (up to 24 weeks)
  result.planOutline.forEach((week, index) => {
    const weekNum = index + 1;
    if (weekNum <= 24) {
      planOutlineData[`week_${weekNum}_title`] = week.title || '';
      planOutlineData[`week_${weekNum}_description`] = week.description || '';
    }
  });

  const { error } = await supabase
    .from('plan_outlines')
    .upsert(planOutlineData, { onConflict: 'goal_id' });

  if (error) {
    console.error('❌ Failed to save plan outline:', error);
    throw error;
  }
  console.log(`✅ Saved outline with ${result.planOutline.length} weeks`);
}

async function insertTasks(
  supabase: any,
  goalId: string,
  tasks: TaskTemplate[]
): Promise<any[]> {
  const tasksToInsert = tasks.map(task => ({
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
    // Set default run_at and local_run_at based on day_offset
    run_at: new Date(Date.now() + (task.day_offset * 24 * 60 * 60 * 1000)).toISOString(),
    local_run_at: new Date(Date.now() + (task.day_offset * 24 * 60 * 60 * 1000)).toISOString()
  }));

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

    const body = await req.json();
    const {
      user_id,
      goal_id,
      category,
      title,
      description,
      intensity = 'easy',
      plan_duration_days = 21,
      preferred_time_ranges,
      preferred_days,
      stage = 'outline',
      device_now_iso,
      device_timezone
    } = body;

    // Validate
    if (!user_id || !goal_id || !category || !title || !description) {
      return errorResponse(400, 'Missing required fields', requestId);
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return errorResponse(400, `Invalid category: ${category}`, requestId);
    }

    if (!VALID_INTENSITIES.includes(intensity)) {
      return errorResponse(400, `Invalid intensity: ${intensity}`, requestId);
    }

    // Verify goal and get advanced settings
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('id, plan_duration_days, preferred_time_ranges, preferred_days')
      .eq('id', goal_id)
      .eq('user_id', user_id)
      .single();

    if (goalError || !goal) {
      return errorResponse(404, 'Goal not found', requestId);
    }

    console.log(`[${requestId}] Generating ${stage} for: ${title}`);

    // Use goal's advanced settings if available, otherwise use request parameters
    const finalPlanDuration = goal.plan_duration_days || plan_duration_days;
    const finalTimeRanges = goal.preferred_time_ranges || preferred_time_ranges;
    const finalPreferredDays = goal.preferred_days || preferred_days;

    console.log(`[${requestId}] Using settings: duration=${finalPlanDuration}, timeRanges=${JSON.stringify(finalTimeRanges)}, preferredDays=${JSON.stringify(finalPreferredDays)}`);

    let result: AIResult | null = null;
    let insertedTasks: any[] = [];

    if (stage === 'outline') {
      // STAGE 1: Generate and save outline
      result = await generatePlanOutlineWithAI(
        category,
        title,
        description,
        intensity,
        finalPlanDuration,
        finalTimeRanges,
        finalPreferredDays,
        device_now_iso || new Date().toISOString(),
        device_timezone || 'UTC'
      );

      await savePlanOutline(supabase, goal_id, result, startTime);

      // Update goal metadata
      await supabase
        .from('goals')
        .update({
          icon_name: result.iconName,
          color: result.color,
          category: result.category,
          device_timezone: device_timezone || 'UTC'
        })
        .eq('id', goal_id);

    } else if (stage === 'tasks') {
      // STAGE 2: Load outline and generate tasks
      console.log(`[${requestId}] Stage 2: Loading outline from plan_outlines table...`);
      
      const { data: savedOutline, error: outlineError } = await supabase
        .from('plan_outlines')
        .select('*')
        .eq('goal_id', goal_id)
        .single();

      if (outlineError) {
        console.error(`[${requestId}] Outline fetch error:`, outlineError);
        return errorResponse(400, `Failed to load outline: ${outlineError.message}`, requestId);
      }

      if (!savedOutline) {
        console.error(`[${requestId}] No outline found for goal ${goal_id}`);
        return errorResponse(400, 'Outline not found. Run stage=outline first.', requestId);
      }

      console.log(`[${requestId}] Outline loaded successfully. Generating tasks...`);

      let tasksResult;
      try {
        tasksResult = await generateDetailedTasksWithAI(
        category, 
        title, 
        description, 
        intensity, 
          device_now_iso || new Date().toISOString(),
          device_timezone || 'UTC',
          finalPlanDuration,
          finalTimeRanges,
          finalPreferredDays,
          savedOutline
        );
        console.log(`[${requestId}] Task generation returned ${tasksResult.tasks.length} tasks`);
      } catch (aiError) {
        const errorMsg = aiError instanceof Error ? aiError.message : String(aiError);
        console.error(`[${requestId}] Task generation failed:`, errorMsg);
        // Fallback: generate template tasks instead of failing completely
        console.log(`[${requestId}] Falling back to template tasks...`);
        tasksResult = {
          tasks: generateTemplateTasks(finalPlanDuration, finalTimeRanges, finalPreferredDays),
          usedModel: 'template-fallback'
        };
        console.log(`[${requestId}] Generated ${tasksResult.tasks.length} template tasks as fallback`);
      }

      if (tasksResult.tasks.length > 0) {
        console.log(`[${requestId}] Inserting ${tasksResult.tasks.length} tasks into database...`);
        try {
          insertedTasks = await insertTasks(supabase, goal_id, tasksResult.tasks);
          console.log(`[${requestId}] Successfully inserted ${insertedTasks.length} tasks`);
        } catch (insertError) {
          const errorMsg = insertError instanceof Error ? insertError.message : String(insertError);
          console.error(`[${requestId}] Task insertion failed:`, errorMsg);
          return errorResponse(500, `Failed to insert tasks: ${errorMsg}`, requestId);
        }
      } else {
        console.warn(`[${requestId}] No tasks generated. Returning error.`);
        return errorResponse(400, 'No tasks could be generated. Please try again.', requestId);
      }

      result = {
        iconName: savedOutline.icon_name || 'star',
        color: savedOutline.color || CATEGORY_COLOR_MAP[category] || 'yellow',
        milestones: savedOutline.milestones || [],
        planOutline: extractPlanOutline(savedOutline),
        category,
        deliverables: savedOutline.deliverables || { overview: { chosen_topic: '', rationale: '', synopsis: '' }, sections: [] },
        usedModel: tasksResult.usedModel
      };
    }

    // Send push notification for plan approval (stage 1) or task completion (stage 2)
    try {
      if (stage === 'outline') {
        const pushResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/push-dispatcher`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user_id,
            title: 'Your Plan is Ready',
            body: `Your ${title} plan is ready for your review. Tap to approve and start your journey!`,
            data: { 
              type: 'plan_ready_for_approval',
              goal_id: goal_id, 
              stage: 'outline',
              screen: 'plan-approval'
            },
            sound: true,
            badge: 1
          }),
        });

        if (!pushResponse.ok) {
          const errorText = await pushResponse.text();
          console.error('❌ Push notification failed for outline:', errorText);
    } else {
          console.log('✅ Push notification sent successfully for outline');
        }
      } else if (stage === 'tasks') {
        const pushResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/push-dispatcher`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user_id,
            title: 'Tasks Generated',
            body: `Your ${title} tasks are ready! ${insertedTasks.length} tasks have been created for your journey.`,
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
        stage,
        request_id: requestId,
        processing_time_ms: totalTime,
        icon_name: result?.iconName,
        color: result?.color,
        category: result?.category,
        milestones: result?.milestones,
        plan_outline: result?.planOutline,
        deliverables: result?.deliverables,
        tasks: insertedTasks.length > 0 ? insertedTasks : undefined,
        tasks_count: insertedTasks.length
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
    return errorResponse(500, `${message}. Check function logs for details.`, requestId, totalTime);
  }
});