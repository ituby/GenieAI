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
  week_number?: number; // Which week to generate (1-based). If not provided, start from week 1
}

interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  plan_duration_days: number;
  preferred_time_ranges: PreferredTimeRange[] | null;
  preferred_days: number[] | null;
  tasks_per_day_min: number | null;
  tasks_per_day_max: number | null;
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
  deviceTimezone: string,
  savedOutline: any,
  requestId: string,
  weekNumber: number = 1,
  totalWeeks: number = 1
): Promise<{
  tasks: TaskTemplate[];
  usedModel: string;
  tokenUsage?: { input: number; output: number; total: number };
  metadata?: any;
}> {
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

    // Calculate week-specific parameters
    // Use tasks_per_day_min/max if available, otherwise fallback to preferred_time_ranges length
    const minTasks = goal.tasks_per_day_min || 1;
    const maxTasks =
      goal.tasks_per_day_max || goal.preferred_time_ranges?.length || 3;

    // Calculate actual tasks per day based on available time slots
    const availableTimeSlots = goal.preferred_time_ranges?.length || 3;
    const tasksPerDay = Math.min(maxTasks, availableTimeSlots);

    const preferredDays = goal.preferred_days || [0, 1, 2, 3, 4, 5, 6]; // All days if not specified

    // Calculate which days belong to this week
    const startDay = (weekNumber - 1) * 7 + 1;
    const endDay = Math.min(weekNumber * 7, goal.plan_duration_days);
    const daysInThisWeek = endDay - startDay + 1;

    // Calculate actual working days in this week based on preferred_days
    let workingDaysCount = 0;
    for (let day = startDay; day <= endDay; day++) {
      const dayOfWeek = (day - 1) % 7; // 0=Sunday, 1=Monday, etc.
      if (preferredDays.includes(dayOfWeek)) {
        workingDaysCount++;
      }
    }

    const tasksInThisWeek = workingDaysCount * tasksPerDay;

    console.log(
      `[${requestId}] Generating Week ${weekNumber}/${totalWeeks}: Days ${startDay}-${endDay} (${workingDaysCount} working days, ${tasksInThisWeek} tasks)`
    );

    // Get the specific week's outline
    const currentWeekOutline = outlineArray[weekNumber - 1];
    const outlineContext = currentWeekOutline
      ? `${currentWeekOutline.title}: ${currentWeekOutline.description}`
      : outlineArray.map((w) => `${w.title}: ${w.description}`).join('\n');

    // Category-specific task design principles
    const categoryTaskGuidance: Record<string, string> = {
      learning: `Apply learning-specific task design: Start with foundational concepts, include practice exercises, build complexity gradually. Write concise but valuable descriptions (2-3 sentences) that explain what to learn and one key insight. Suggest Google searches for tutorials, documentation, or courses when they genuinely help - max 1-2 per task using [SEARCH:Title|keywords] format.`,
      career: `Apply career-specific task design: Focus on skill-building, networking, portfolio development. Keep descriptions focused and actionable. Suggest searches for relevant industry resources or tutorials when they add real value.`,
      fitness: `Apply fitness-specific task design: Progressive intensity, proper form focus, balance challenge with recovery. Descriptions should be brief but include form tips. Suggest searches for demonstration videos when helpful (e.g., [SEARCH:Proper Squat Form|squat technique demonstration]).`,
      health: `Apply health-specific task design: Sustainable habits, gradual changes, body awareness. Keep descriptions practical and encouraging. Suggest searches for helpful resources when relevant.`,
      lifestyle: `Apply lifestyle-specific task design: Habit stacking, routine integration, sustainable changes. Brief, actionable descriptions with practical tips.`,
      mindset: `Apply mindset-specific task design: Awareness exercises, belief examination, mental rewiring. Concise descriptions with one key insight per task.`,
      character: `Apply character-specific task design: Value-based actions, integrity practices, intentional challenges. Brief, meaningful descriptions.`,
      finance: `Apply finance-specific task design: Knowledge building, system setup, behavioral changes. Clear, actionable descriptions. Suggest searches for educational resources when genuinely helpful.`,
      social: `Apply social-specific task design: Regular connection activities, communication practice. Brief, warm descriptions with practical tips.`,
      creativity: `Apply creativity-specific task design: Daily creation practice, experimentation, shipping outputs. Concise descriptions with creative guidance.`,
      goal: `Apply goal-specific task design: Milestone-focused actions, momentum builders, progress tracking. Brief, motivating descriptions.`,
      custom: `Apply personalized task design: Tailored to unique requirements, clear progress indicators. Focused, actionable descriptions.`,
    };

    const taskGuidance =
      categoryTaskGuidance[goal.category] || categoryTaskGuidance['custom'];

    // Prepare preferred days and time ranges info
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const preferredDaysText = preferredDays.map((d) => dayNames[d]).join(', ');

    // Get actual time slots from preferred_time_ranges
    const timeSlots: string[] = [];
    const timeLabels: string[] = [];
    if (goal.preferred_time_ranges && goal.preferred_time_ranges.length > 0) {
      goal.preferred_time_ranges.forEach((range, idx) => {
        const hour = range.start_hour.toString().padStart(2, '0');
        timeSlots.push(`${hour}:00`);
        timeLabels.push(range.label || `Slot ${idx + 1}`);
      });
    } else {
      // Default time slots if not specified
      timeSlots.push('09:00', '14:00', '19:00');
      timeLabels.push('Morning', 'Afternoon', 'Evening');
    }

    const systemPrompt = `You are an expert goal planner and task architect specialized in ${goal.category} goals. Your mission is to help real people succeed by creating specific, actionable, and motivating daily tasks that TEACH and GUIDE, not just instruct.

CATEGORY-SPECIFIC APPROACH:
${taskGuidance}

CORE PRINCIPLES:
✓ Specific & Measurable - "Practice piano scales for 15 minutes" not "Practice music"
✓ Progressive Difficulty - Start manageable, gradually increase challenge
✓ Human-Centered - Remember there's a real person with limited time and energy
✓ Motivating - Tasks should feel achievable and rewarding
✓ Action-Oriented - Start each task with a clear action verb
✓ Category-Aligned - Design tasks that match ${goal.category} best practices
✓ Educational - Each task should teach something, not just tell what to do

WRITING GUIDELINES:
- Use clear, direct language
- Task titles: 4-8 words, starting with action verb (Create, Practice, Complete, Review, Build, etc.)
- Descriptions: This is the MOST IMPORTANT part - write rich, valuable content:
  
  DESCRIPTION REQUIREMENTS:
  • Write 2-3 concise, informative sentences
  • Explain WHAT the user will do and WHY it matters
  • Include ONE key tip or insight that adds real value
  • Be direct and actionable - no fluff
  • For learning tasks: Focus on one main concept or technique to master
  • Keep it focused - comprehensive but not overwhelming
  
  BAD description: "Complete the first module exercises."
  GOOD description: "Complete the first module exercises to build foundational understanding. Focus on understanding each example rather than rushing through - notice the pattern of how solutions are structured. This pattern will be your template for future problems."
  
  TOO LONG (avoid): "Complete the first module exercises to build foundational understanding of core concepts. Focus on truly understanding each example rather than rushing through. Pay special attention to the pattern of how solutions are structured - this will be your template for future problems. Take notes on any concepts that feel unclear. Review difficult sections multiple times. Compare your solutions with the provided answers."
  
- Subtasks: Concrete, sequential steps
- Be encouraging but realistic
- Consider user's timezone: morning tasks for fresh energy, evening for reflection/lighter work

SEARCH SUGGESTIONS & RESOURCES:
When appropriate (especially for learning, career, fitness, creativity goals):
- Provide Google search keywords that will help users find relevant resources
- Use this EXACT format: [SEARCH:Button Title|search keywords]
  Example: [SEARCH:Sword Grip Tutorial|medieval longsword grip technique demonstration]
  Example: [SEARCH:React Hooks Guide|react hooks tutorial useState useEffect]
- The search keywords should be specific and likely to return high-quality results
- Include YouTube-specific searches when video demonstrations would help
- Place search suggestions at the end of task descriptions
- Maximum 1-2 search suggestions per task - quality over quantity
- Users will click the button and see Google search results with these keywords

AVOID:
✗ Vague tasks ("Improve yourself", "Work on goals")
✗ Large difficulty jumps between days
✗ Assumptions about resources or availability
✗ Generic advice - be specific to the goal
✗ Random or low-quality links - only curated, helpful resources
✗ Links for every task - only when they add real value

CRITICAL JSON RULES:
1. Output MUST be valid JSON only - no markdown, no explanations, no text before/after
2. Start with { and end with }
3. Use double quotes for all strings
4. No comments, no trailing commas
5. All strings must be properly escaped

REQUIRED JSON STRUCTURE:
{
  "days": [
    {
      "day": 1,
      "summary": "Brief daily focus (3-6 words)",
      "tasks": [
        {
          "time": "09:00",
          "title": "Action-oriented task title",
          "description": "Concise explanation (2-3 sentences). State what to do and why. Include one key tip. [SEARCH:Find Tutorial|search keywords here] (optional)",
          "subtasks": [
            {"title": "Specific step 1", "estimated_minutes": 10},
            {"title": "Specific step 2", "estimated_minutes": 15}
          ],
          "time_allocation_minutes": 30
        }
      ]
    }
  ]
}`;

    const userPrompt = `Create tasks for WEEK ${weekNumber} of ${totalWeeks} (Days ${startDay}-${endDay}).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 GOAL INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Title: ${goal.title}
Description: ${goal.description}
Category: ${goal.category}

🌍 USER CONTEXT
Timezone: ${deviceTimezone}
Current time: ${new Date(deviceNowIso).toLocaleString('en-US', { timeZone: deviceTimezone })}

⚙️ USER PREFERENCES
Preferred Days: ${preferredDaysText}
⚠️ CRITICAL: Create tasks ONLY for these days! Skip other days completely.

Tasks Per Day: ${minTasks === maxTasks ? `${tasksPerDay} task(s)` : `${minTasks}-${maxTasks} tasks (using ${tasksPerDay} based on available time slots)`}

Preferred Time Slots: ${timeSlots.map((time, idx) => `${time} (${timeLabels[idx]})`).join(', ')}
⚠️ CRITICAL: Use ONLY these exact time slots for tasks!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 THIS WEEK'S FOCUS (Week ${weekNumber}/${totalWeeks})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${outlineContext}

⚠️ CRITICAL: Create tasks ONLY for this week. Align all tasks with this week's theme and objectives.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ TECHNICAL REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Structure:
  • This week: Week ${weekNumber} of ${totalWeeks}
  • Days to create: ${startDay} to ${endDay} (${daysInThisWeek} days)
  • Tasks per day: ${tasksPerDay}
  • Total tasks for this week: ${tasksInThisWeek}

Task Distribution:
  • Distribute tasks across the EXACT time slots the user selected
  • Each PREFERRED day should have ${tasksPerDay} tasks
  • Follow the progression in the plan outline
  • SKIP days that are NOT in the preferred days list

Time Slots (user's selected times in ${deviceTimezone}):
${timeSlots.map((time, idx) => `  • ${timeLabels[idx]}: "${time}"`).join('\n')}
  ${tasksPerDay === 1 ? `\n  ⚠️ Use ONLY the first time slot: ${timeSlots[0]}` : ''}
  ${tasksPerDay === 2 ? `\n  ⚠️ Use ONLY first two time slots: ${timeSlots[0]} and ${timeSlots[1]}` : ''}
  ${tasksPerDay === 3 ? `\n  ⚠️ Use ALL three time slots: ${timeSlots.join(', ')}` : ''}
  
  IMPORTANT: Use these EXACT times - the user specifically chose them!

Task Composition:
  • Each task MUST have 2-3 subtasks
  • Subtask duration: 10-20 minutes each
  • Total time per task: 25-45 minutes
  • Subtasks should be sequential steps
  • EACH TASK DESCRIPTION must be concise but valuable (2-3 sentences MAXIMUM)

Content Quality & Week Alignment (CRITICAL):
  • Make tasks specific to "${goal.title}"
  • ALIGN with Week ${weekNumber}'s theme and objectives above
  • Focus ONLY on this week (Days ${startDay}-${endDay})
  • Ensure each task is actionable and clear
  • Progressive difficulty within this week
  
Educational Value & Search Suggestions:
  • Write concise task descriptions (2-3 sentences, no more)
  • Include ONE helpful tip or key insight per task
  • Suggest Google searches ONLY when they add significant value:
    - YouTube tutorials for demonstrations
    - Official documentation for reference
    - Interactive tools or courses
  • Use format: [SEARCH:Button Title|search keywords]
    Example: [SEARCH:Tutorial Video|medieval sword grip technique youtube]
  • Maximum 1-2 search suggestions per task - quality over quantity
  • Avoid over-explaining - be direct and actionable
  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Return ONLY valid JSON. No markdown blocks, no explanations, no text before or after.
Must start with { and end with }

Example for Day ${startDay}:
{
  "days": [
    {
      "day": ${startDay},
      "summary": "Week ${weekNumber} focus",
      "tasks": [
        {
          "time": "${timeSlots[0]}",
          "title": "Action-oriented task for week ${weekNumber}",
          "description": "Concise explanation aligned with this week's theme. State what to do and why it matters. Focus on [key technique/concept]. [SEARCH:Watch Tutorial|specific search keywords for youtube or google] (if helpful)",
          "subtasks": [
            {"title": "Specific step 1", "estimated_minutes": 15},
            {"title": "Specific step 2", "estimated_minutes": 15}
          ],
          "time_allocation_minutes": 30
        }
      ]
    }
  ]
}

⚠️ IMPORTANT REMINDERS:
- Create tasks ONLY for preferred days: ${preferredDaysText}
- Use ONLY these time slots: ${timeSlots.join(', ')}
- Skip any days that are NOT in the preferred days list
- Each preferred day should have ${tasksPerDay} task(s)
- WRITE CONCISE, VALUABLE DESCRIPTIONS (2-3 sentences, no more!)
- Include ONE key tip or insight per task - no over-explaining
- Add search suggestions ONLY when they add real value (max 1-2 per task)
- Use format: [SEARCH:Button Text|google search keywords]
- Be direct and actionable - avoid fluff

NOW CREATE WEEK ${weekNumber} - DAYS ${startDay} TO ${endDay} (${workingDaysCount} WORKING DAYS, ${tasksInThisWeek} TASKS TOTAL).
REMEMBER: Descriptions should be valuable but CONCISE - 2-3 sentences maximum!
When adding search suggestions, use relevant keywords that will return helpful Google results.
OUTPUT JSON ONLY:`;

    // Calculate max_tokens dynamically based on tasks needed
    // Each task ~450 tokens (title + concise description + subtasks + optional resources + JSON structure)
    // Optimized for 2-3 sentence descriptions with one key insight
    // Add 1200 tokens for JSON overhead and buffer
    const estimatedTokensPerTask = 450;
    const jsonOverhead = 1200;
    const safetyBuffer = 800;
    const calculatedMaxTokens = Math.min(
      Math.max(
        tasksInThisWeek * estimatedTokensPerTask + jsonOverhead + safetyBuffer,
        2500 // minimum 2.5K tokens
      ),
      16384 // maximum 16K tokens (Haiku limit)
    );

    console.log(
      `[${requestId}] Calculated max_tokens: ${calculatedMaxTokens} for ${tasksInThisWeek} tasks`
    );
    console.log(`[${requestId}] Sending request to Claude API...`);

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
          max_tokens: calculatedMaxTokens,
          messages: [
            { role: 'user', content: `${systemPrompt}\n\n${userPrompt}` },
          ],
        }),
      }
    );

    console.log(
      `[${requestId}] Received response from Claude, status: ${response.status}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${requestId}] Claude API error response:`, errorText);
      throw new Error(`Claude API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(
      `[${requestId}] Response parsed, has content: ${!!data.content}`
    );

    // Extract token usage for tracking
    const tokenUsage = data.usage
      ? {
          input: data.usage.input_tokens || 0,
          output: data.usage.output_tokens || 0,
          total:
            (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
        }
      : null;

    if (tokenUsage) {
      console.log(
        `[${requestId}] Token usage - Input: ${tokenUsage.input}, Output: ${tokenUsage.output}, Total: ${tokenUsage.total}`
      );
    }

    if (!data.content?.[0]?.text) {
      console.error(
        `[${requestId}] Invalid AI response structure:`,
        JSON.stringify(data).substring(0, 500)
      );
      console.warn(
        `[${requestId}] Using template fallback due to invalid response`
      );
      return {
        tasks: generateTemplateTasks(goal),
        usedModel: 'template-fallback',
      };
    }

    console.log(
      `[${requestId}] AI returned ${data.content[0].text.length} characters`
    );

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
      console.log(
        `[${requestId}] DEBUG: Full planData structure:`,
        JSON.stringify(planData, null, 2)
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

      // Check if this is likely a truncation issue (max_tokens exceeded)
      const isTruncated =
        cleanedText.length > 0 &&
        !cleanedText.trim().endsWith('}') &&
        !cleanedText.trim().endsWith(']');

      if (isTruncated) {
        console.error(
          `[${requestId}] JSON appears truncated - likely hit max_tokens limit (${calculatedMaxTokens})`
        );
        console.error(
          `[${requestId}] Response length: ${text.length} chars, Cleaned: ${cleanedText.length} chars`
        );
      }

      console.warn(
        `[${requestId}] Using template fallback due to parse error${isTruncated ? ' (truncated response)' : ''}`
      );
      return {
        tasks: generateTemplateTasks(goal),
        usedModel: 'template-fallback',
        metadata: {
          parseError: true,
          truncated: isTruncated,
          responseLength: cleanedText.length,
          maxTokens: calculatedMaxTokens,
        },
      };
    }

    // Convert AI response to TaskTemplate format
    const tasks: TaskTemplate[] = [];
    const usedTimeSlots = new Map<string, Set<string>>();

    console.log(
      `[${requestId}] DEBUG: planData.days length: ${planData.days?.length || 0}`
    );
    console.log(
      `[${requestId}] DEBUG: goal.preferred_days:`,
      goal.preferred_days
    );
    console.log(`[${requestId}] DEBUG: tasksPerDay: ${tasksPerDay}`);

    for (const day of planData.days || []) {
      const dayNumber = day.day;
      console.log(
        `[${requestId}] DEBUG: Processing day ${dayNumber}, tasks count: ${day.tasks?.length || 0}`
      );

      // Check preferred days
      if (goal.preferred_days?.length) {
        const dayOfWeek = (dayNumber - 1) % 7;
        console.log(
          `[${requestId}] DEBUG: Day ${dayNumber} is day of week ${dayOfWeek}, preferred days: ${goal.preferred_days}`
        );
        if (!goal.preferred_days.includes(dayOfWeek)) {
          console.log(
            `[${requestId}] DEBUG: Skipping day ${dayNumber} - not in preferred days`
          );
          continue;
        }
      }

      console.log(
        `[${requestId}] DEBUG: Day ${dayNumber} passed preferred days check, processing ${day.tasks?.length || 0} tasks`
      );

      for (const task of day.tasks?.slice(0, tasksPerDay) || []) {
        try {
          console.log(
            `[${requestId}] DEBUG: Processing task: ${task.title} at ${task.time}`
          );
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
          console.log(
            `[${requestId}] DEBUG: Added task ${task.title}, total tasks: ${tasks.length}`
          );
        } catch (taskError) {
          console.warn(`[${requestId}] Error processing task:`, taskError);
        }
      }
    }

    console.log(`[${requestId}] Generated ${tasks.length} tasks from AI`);
    return {
      tasks,
      usedModel: 'claude-haiku-4-5-20251001',
      tokenUsage: tokenUsage || undefined,
    };
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

  // Calculate tasks per day based on user preferences
  const maxTasks =
    goal.tasks_per_day_max || goal.preferred_time_ranges?.length || 3;
  const availableTimeSlots = goal.preferred_time_ranges?.length || 3;
  const tasksPerDay = Math.min(maxTasks, availableTimeSlots);

  // Use preferred time ranges or defaults
  const timeSlots: string[] = [];
  const timeLabels: string[] = [];
  if (goal.preferred_time_ranges && goal.preferred_time_ranges.length > 0) {
    goal.preferred_time_ranges.forEach((range) => {
      const hour = range.start_hour.toString().padStart(2, '0');
      timeSlots.push(`${hour}:00`);
      timeLabels.push(range.label || 'Session');
    });
  } else {
    timeSlots.push('09:00', '14:00', '19:00');
    timeLabels.push('Morning', 'Afternoon', 'Evening');
  }

  const timeOfDays = ['morning', 'afternoon', 'evening'];

  for (let day = 1; day <= goal.plan_duration_days; day++) {
    // Check if this day is in preferred_days
    if (goal.preferred_days?.length) {
      const dayOfWeek = (day - 1) % 7;
      if (!goal.preferred_days.includes(dayOfWeek)) {
        continue; // Skip this day
      }
    }

    for (let taskIdx = 0; taskIdx < tasksPerDay; taskIdx++) {
      const timeOfDay = timeOfDays[taskIdx] || 'morning';
      const customTime = timeSlots[taskIdx] || timeSlots[0];
      const label = timeLabels[taskIdx] || 'Session';

      tasks.push({
        title: `Day ${day}: ${['Foundation', 'Development', 'Practice'][taskIdx] || 'Progress'}`,
        description: `Complete your ${label.toLowerCase()} work session for ${goal.title}.`,
        day_offset: day - 1,
        time_of_day: timeOfDay,
        subtasks: [
          { title: 'Start with a 5-minute warm-up', estimated_minutes: 5 },
          { title: 'Complete main activities', estimated_minutes: 20 },
          { title: 'Document your progress', estimated_minutes: 5 },
        ],
        time_allocation_minutes: 30,
        custom_time: customTime,
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
  // Note: We don't check for existing tasks anymore because we're adding week-by-week
  // Each week adds its own tasks incrementally

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

  // Create scheduled notifications for each task
  if (data && data.length > 0) {
    // Get user_id from goal
    const { data: goalData, error: goalError } = await supabase
      .from('goals')
      .select('user_id')
      .eq('id', goalId)
      .single();

    if (goalError) {
      console.error(
        `[${requestId}] Error fetching goal for notifications:`,
        goalError
      );
    } else {
      const scheduledNotifications = data.map((task: any) => ({
        user_id: goalData.user_id,
        task_id: task.id,
        goal_id: goalId,
        type: 'task_reminder',
        title: '⏰ Task Reminder',
        body: `Time to work on: ${task.title}`,
        scheduled_for: task.run_at,
        sent: false,
      }));

      const { error: notificationError } = await supabase
        .from('scheduled_notifications')
        .insert(scheduledNotifications);

      if (notificationError) {
        console.error(
          `[${requestId}] Error creating scheduled notifications:`,
          notificationError
        );
      } else {
        console.log(
          `[${requestId}] Created ${scheduledNotifications.length} scheduled notifications`
        );
      }
    }
  }

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

    const currentTokens = tokenData.tokens_remaining || 0;

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

    const { user_id, goal_id, device_now_iso, device_timezone, week_number } =
      body;

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

    // Week number: default to 1 if not provided
    const currentWeek = week_number || 1;

    // Note: Token deduction moved to AFTER task generation
    // We'll deduct 1 token per task created

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

    // For active goals, check if ALL tasks already exist (only if this is week 1)
    // For subsequent weeks (week > 1), allow adding more tasks
    if (goal.status === 'active' && currentWeek === 1) {
      const totalWeeks = Math.ceil(goal.plan_duration_days / 7);

      // Count existing tasks
      const { count: existingTaskCount } = await supabase
        .from('goal_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('goal_id', goal_id);

      // Calculate expected total tasks for the full plan
      const maxTasks =
        goal.tasks_per_day_max || goal.preferred_time_ranges?.length || 3;
      const availableTimeSlots = goal.preferred_time_ranges?.length || 3;
      const tasksPerDay = Math.min(maxTasks, availableTimeSlots);

      const daysPerWeek = goal.preferred_days?.length || 7;
      const totalWorkingDays = Math.ceil(
        (goal.plan_duration_days / 7) * daysPerWeek
      );
      const expectedTotalTasks = totalWorkingDays * tasksPerDay;

      // Only block if we already have all expected tasks
      if (existingTaskCount && existingTaskCount >= expectedTotalTasks) {
        console.log(
          `[${requestId}] All tasks already exist (${existingTaskCount}/${expectedTotalTasks})`
        );
        return new Response(
          JSON.stringify({
            success: true,
            message: 'All tasks already exist',
            request_id: requestId,
            processing_time_ms: Date.now() - startTime,
            tasks_count: existingTaskCount,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      console.log(
        `[${requestId}] Partial tasks exist (${existingTaskCount}/${expectedTotalTasks}), continuing generation`
      );
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

    // Calculate total weeks
    const totalWeeks = Math.ceil(goal.plan_duration_days / 7);

    // Check if this is the first week or a continuation
    if (currentWeek === 1) {
      console.log(
        `[${requestId}] Starting multi-week generation: ${totalWeeks} weeks total`
      );
    } else {
      console.log(
        `[${requestId}] Continuing generation for week ${currentWeek}/${totalWeeks}`
      );
    }

    // Generate tasks for this specific week
    console.log(`[${requestId}] Generating tasks for week ${currentWeek}...`);
    const tasksResult = await generateTasksWithAI(
      goal as Goal,
      finalDeviceNow,
      finalTimezone,
      savedOutline,
      requestId,
      currentWeek,
      totalWeeks
    );

    // Check if fallback tasks were used - this means AI generation failed
    if (tasksResult.usedModel === 'template-fallback') {
      const metadata = tasksResult.metadata || {};
      const isTruncated = metadata.truncated;

      console.error(
        `[${requestId}] AI generation failed for week ${currentWeek}, fallback tasks were generated`
      );

      if (isTruncated) {
        console.error(
          `[${requestId}] Failure reason: Response truncated at ${metadata.maxTokens} tokens (${metadata.responseLength} chars)`
        );
      }

      // Save failure to ai_runs for tracking
      const { error: aiRunError } = await supabase.from('ai_runs').insert({
        goal_id: goal_id,
        stage: `tasks_week_${currentWeek}`,
        status: 'failed',
        provider_model: 'template-fallback',
        latency_ms: Date.now() - startTime,
        week_number: currentWeek,
        total_weeks: totalWeeks,
        metadata: {
          reason: isTruncated
            ? `Response truncated - exceeded max_tokens (${metadata.maxTokens})`
            : 'AI generation failed, would have used fallback tasks',
          ...metadata,
        },
        completed_at: new Date().toISOString(),
      });

      const errorMessage = isTruncated
        ? `AI response was truncated for week ${currentWeek}. The system is generating comprehensive task descriptions which exceeded the token limit. Please try again - the system will automatically adjust.`
        : `AI generation failed for week ${currentWeek}. Please try again or contact support.`;

      return errorResponse(
        500,
        errorMessage,
        requestId,
        Date.now() - startTime
      );
    }

    // Insert tasks for this week
    console.log(
      `[${requestId}] Inserting ${tasksResult.tasks.length} AI-generated tasks for week ${currentWeek}`
    );
    const insertedTasks = await insertTasks(
      supabase,
      goal_id,
      tasksResult.tasks,
      finalDeviceNow,
      goal.preferred_time_ranges,
      requestId
    );

    // Check if tasks were actually inserted
    if (!insertedTasks || insertedTasks.length === 0) {
      console.error(`[${requestId}] No tasks were inserted for week ${currentWeek}`);
      return errorResponse(
        500,
        'Failed to insert tasks into database',
        requestId,
        Date.now() - startTime
      );
    }

    // NOW deduct tokens based on actual number of tasks created
    const tasksCreated = insertedTasks.length;
    console.log(`[${requestId}] Deducting ${tasksCreated} tokens for ${tasksCreated} tasks created`);
    
    const tokenCheck = await checkAndDeductTokens(
      supabase,
      user_id,
      tasksCreated,  // 1 token per task
      requestId
    );

    if (!tokenCheck.success) {
      console.error(`[${requestId}] Failed to deduct tokens after task creation: ${tokenCheck.message}`);
      // Tasks already created, just log the error - don't fail the request
      console.warn(`[${requestId}] Tasks created but token deduction failed`);
    }

    const totalTime = Date.now() - startTime;
    console.log(
      `[${requestId}] Week ${currentWeek} completed in ${totalTime}ms - ${tasksCreated} tasks, ${tasksCreated} tokens used`
    );

    // Calculate days for this week (for metadata)
    const startDay = (currentWeek - 1) * 7 + 1;
    const endDay = Math.min(currentWeek * 7, goal.plan_duration_days);
    const daysInWeek = endDay - startDay + 1;

    // Save to ai_runs for tracking (documentation - never delete!)
    const inputTokens = tasksResult.tokenUsage?.input || 0;
    const outputTokens = tasksResult.tokenUsage?.output || 0;

    // Calculate cost using SQL function
    const { data: costData } = await supabase.rpc('calculate_ai_cost', {
      model_name: tasksResult.usedModel,
      input_tokens_count: inputTokens,
      output_tokens_count: outputTokens,
    });

    const estimatedCost = costData || 0;
    console.log(
      `[${requestId}] 💰 Week ${currentWeek} cost: $${estimatedCost.toFixed(6)}`
    );

    const aiRunData = {
      goal_id: goal_id,
      stage: `tasks_week_${currentWeek}`,
      status: 'success',
      provider_model: tasksResult.usedModel,
      latency_ms: totalTime,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: tasksResult.tokenUsage?.total || 0,
      week_number: currentWeek,
      total_weeks: totalWeeks,
      tasks_generated: insertedTasks.length,
      cost_usd: estimatedCost,
      metadata: {
        days_in_week: daysInWeek,
        tasks_per_day: goal.preferred_time_ranges?.length || 3,
      },
      completed_at: new Date().toISOString(),
    };

    const { error: aiRunError } = await supabase
      .from('ai_runs')
      .insert(aiRunData);

    if (aiRunError) {
      console.error(
        `[${requestId}] Failed to save ai_run (non-critical):`,
        aiRunError
      );
    } else {
      console.log(
        `[${requestId}] Saved ai_run for week ${currentWeek} (cost: $${estimatedCost.toFixed(6)})`
      );
    }

    // Check if there are more weeks to generate
    if (currentWeek < totalWeeks) {
      console.log(
        `[${requestId}] Triggering generation for week ${currentWeek + 1}/${totalWeeks}`
      );

      // Call the function again for the next week (non-blocking)
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-tasks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user_id,
          goal_id: goal_id,
          device_now_iso: finalDeviceNow,
          device_timezone: finalTimezone,
          week_number: currentWeek + 1,
        }),
      }).catch((error) => {
        console.error(`[${requestId}] Failed to trigger next week:`, error);
      });

      // Return success for this week
      return new Response(
        JSON.stringify({
          success: true,
          request_id: requestId,
          processing_time_ms: totalTime,
          week_number: currentWeek,
          total_weeks: totalWeeks,
          tasks_count: insertedTasks.length,
          used_model: tasksResult.usedModel,
          status: 'in_progress',
          next_week: currentWeek + 1,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // This is the last week - update goal status and send notification
    console.log(
      `[${requestId}] Final week (${currentWeek}) completed - updating goal status`
    );

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

    // Get total task count for final notification
    const { count: totalTaskCount } = await supabase
      .from('goal_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('goal_id', goal_id);

    // Send push notification for completion
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
            title: 'All Tasks Ready! 🎉',
            body: `Your ${goal.title} plan is complete! ${totalTaskCount || insertedTasks.length} tasks created.`,
            data: {
              type: 'tasks_generated',
              goal_id: goal_id,
              task_count: totalTaskCount || insertedTasks.length,
              screen: 'dashboard',
            },
            sound: true,
            badge: 1,
          }),
        }
      );
      console.log(`[${requestId}] Completion push notification sent`);
    } catch (pushError) {
      console.warn(`[${requestId}] Push notification failed:`, pushError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        request_id: requestId,
        processing_time_ms: totalTime,
        week_number: currentWeek,
        total_weeks: totalWeeks,
        tasks_count: insertedTasks.length,
        total_task_count: totalTaskCount || insertedTasks.length,
        used_model: tasksResult.usedModel,
        status: 'completed',
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
