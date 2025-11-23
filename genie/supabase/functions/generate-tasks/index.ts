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
  notification?: { title: string; body: string };
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
  preferredTimeRanges: PreferredTimeRange[] | null,
  customTime?: string
): string {
  const deviceNow = new Date(deviceNowIso);
  
  let targetHour = 8;
  let targetMinute = 0;
  
  // Priority 1: Use custom_time if provided (AI-specified exact time like "06:00")
  if (customTime) {
    const [hourStr, minStr] = customTime.split(':');
    targetHour = parseInt(hourStr, 10);
    targetMinute = minStr ? parseInt(minStr, 10) : 0;
    console.log(`[COMPUTE] Using custom_time: ${customTime} → ${targetHour}:${targetMinute.toString().padStart(2, '0')}`);
  }
  // Priority 2: Use preferred_time_ranges
  else if (preferredTimeRanges?.length) {
    const rangeIndex =
      timeOfDay === 'afternoon' ? 1 : timeOfDay === 'evening' ? 2 : 0;
    targetHour = preferredTimeRanges[rangeIndex]?.start_hour || 8;
    console.log(`[COMPUTE] Using preferred_time_ranges[${rangeIndex}].start_hour: ${targetHour}:00`);
  }
  // Priority 3: Default time slots
  else {
    const timeSlots: Record<string, number> = {
      morning: 8,
      mid_morning: 10,
      afternoon: 14,
      evening: 20,
    };
    targetHour = timeSlots[timeOfDay] || 8;
    console.log(`[COMPUTE] Using default for ${timeOfDay}: ${targetHour}:00`);
  }

  // 🚨 SIMPLE SOLUTION: Just set the hours directly!
  // The user's time preferences are ALREADY in their local time (06:00, 14:00, 20:00)
  // We store them as-is in the DB, and the frontend converts UTC to local display
  // NO TIMEZONE MATH NEEDED!
  
  const targetDate = new Date(deviceNowIso);
  targetDate.setDate(targetDate.getDate() + (dayNumber - 1));
  
  // Simply set the hours as specified - no conversion!
  targetDate.setUTCHours(targetHour, targetMinute, 0, 0);
  
  console.log(`[COMPUTE] Setting task time to ${targetHour}:${targetMinute.toString().padStart(2, '0')} UTC (user specified time)`);
  console.log(`[COMPUTE] Result ISO: ${targetDate.toISOString()}`);

  // Ensure not in the past
  const nowDate = new Date(deviceNowIso);
  if (targetDate <= nowDate) {
    const tomorrow = new Date(deviceNowIso);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setUTCHours(targetHour, targetMinute, 0, 0);
    console.log(`[COMPUTE] Task in past, moved to tomorrow: ${tomorrow.toISOString()}`);
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
  tasksReadyNotification?: { title: string; body: string } | null;
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
        tasks: generateTemplateTasks(goal, deviceNowIso),
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

    // Calculate goal start date once (used for all date calculations)
    const goalStartDate = new Date(deviceNowIso);
    
    // Calculate actual working days in this week based on preferred_days
    // Use actual dates, not modulo calculation!
    let workingDaysCount = 0;
    
    for (let day = startDay; day <= endDay; day++) {
      // Calculate actual day of week based on goal start date
      const currentDate = new Date(goalStartDate);
      currentDate.setDate(goalStartDate.getDate() + (day - 1));
      const dayOfWeek = currentDate.getDay(); // 0=Sunday, 1=Monday, etc.
      
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
      learning: `Apply learning-specific task design: Start with foundational concepts, include practice exercises, build complexity gradually. Write concise but valuable descriptions (2-3 sentences) that explain what to learn and one key insight. CRITICAL: Add 2-3 [SEARCH:Title|keywords] tags per task for tutorials, documentation, or courses.`,
      career: `Apply career-specific task design: Focus on skill-building, networking, portfolio development. Keep descriptions focused and actionable. CRITICAL: Add 1-2 [SEARCH:Title|keywords] tags for industry resources, courses, or professional development tools.`,
      fitness: `Apply fitness-specific task design: Progressive intensity, proper form focus, balance challenge with recovery. Descriptions should be brief but include form tips. CRITICAL: Add 1-2 [SEARCH:Title|keywords] tags for demonstration videos, form tutorials, or workout guides.`,
      health: `Apply health-specific task design: Sustainable habits, gradual changes, body awareness. Keep descriptions practical and encouraging. CRITICAL: Add 1-2 [SEARCH:Title|keywords] tags for health resources, guides, or expert advice.`,
      lifestyle: `Apply lifestyle-specific task design: Habit stacking, routine integration, sustainable changes. Brief, actionable descriptions with practical tips. CRITICAL: Add 1-2 [SEARCH:Title|keywords] tags for habit guides, productivity tools, or lifestyle resources.`,
      mindset: `Apply mindset-specific task design: Awareness exercises, belief examination, mental rewiring. Concise descriptions with one key insight per task. CRITICAL: Add 1-2 [SEARCH:Title|keywords] tags for mindfulness guides, psychology resources, or mental techniques.`,
      character: `Apply character-specific task design: Value-based actions, integrity practices, intentional challenges. Brief, meaningful descriptions. CRITICAL: Add 1-2 [SEARCH:Title|keywords] tags for character development resources, philosophical guides, or personal growth content.`,
      finance: `Apply finance-specific task design: Knowledge building, system setup, behavioral changes. Clear, actionable descriptions. CRITICAL: Add 1-2 [SEARCH:Title|keywords] tags for financial education, investment guides, or money management tools.`,
      social: `Apply social-specific task design: Regular connection activities, communication practice. Brief, warm descriptions with practical tips. CRITICAL: Add 1-2 [SEARCH:Title|keywords] tags for communication guides, social skills tutorials, or relationship resources.`,
      creativity: `Apply creativity-specific task design: Daily creation practice, experimentation, shipping outputs. Concise descriptions with creative guidance. CRITICAL: Add 1-2 [SEARCH:Title|keywords] tags for creative tutorials, inspiration sources, or technique guides.`,
      goal: `Apply goal-specific task design: Milestone-focused actions, momentum builders, progress tracking. Brief, motivating descriptions. CRITICAL: Add 1-2 [SEARCH:Title|keywords] tags for productivity tools, goal-setting frameworks, or achievement strategies.`,
      custom: `Apply personalized task design: Tailored to unique requirements, clear progress indicators. Focused, actionable descriptions. CRITICAL: Add 2-3 [SEARCH:Title|keywords] tags for relevant tutorials, guides, or resources specific to this unique goal.`,
    };

    const taskGuidance =
      categoryTaskGuidance[goal.category] || categoryTaskGuidance['custom'];

    // Get actual time slots from preferred_time_ranges - NO FALLBACK ALLOWED!
    const timeSlots: string[] = [];
    const timeLabels: string[] = [];
    
    // 🚨 CRITICAL: MUST have user preferences - no defaults!
    if (!goal.preferred_time_ranges || goal.preferred_time_ranges.length === 0) {
      console.error(`[${requestId}] ❌ CRITICAL: No preferred_time_ranges found! This should never happen.`);
      throw new Error('User preferences not found. Please set your preferred time ranges in settings.');
    }
    
    goal.preferred_time_ranges.forEach((range, idx) => {
      const hour = range.start_hour.toString().padStart(2, '0');
      timeSlots.push(`${hour}:00`);
      timeLabels.push(range.label || `Slot ${idx + 1}`);
    });
    
    console.log(`[${requestId}] ✅ Using user's preferred time slots (NO FALLBACK): ${timeSlots.join(', ')}`);


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
    
    // Build explicit list of which specific days to create tasks for in this week
    const explicitDaysForThisWeek: string[] = [];
    
    for (let day = startDay; day <= endDay; day++) {
      const currentDate = new Date(goalStartDate);
      currentDate.setDate(goalStartDate.getDate() + (day - 1));
      const dayOfWeek = currentDate.getDay();
      
      if (preferredDays.includes(dayOfWeek)) {
        const dayName = dayNames[dayOfWeek];
        const dateStr = currentDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          timeZone: deviceTimezone 
        });
        explicitDaysForThisWeek.push(`Day ${day} (${dayName}, ${dateStr})`);
      }
    }
    
    console.log(`[${requestId}] 📅 Explicit days for week ${weekNumber}: ${explicitDaysForThisWeek.join(', ')}`);
    console.log(
      `[${requestId}] 🗓️ Goal starts: ${goalStartDate.toDateString()}, Preferred days: ${preferredDays}, Time slots: ${timeSlots.join(', ')}`
    );

    const systemPrompt = `You are an expert goal planner and task architect specialized in ${goal.category} goals. Your mission is to help real people succeed by creating specific, actionable, and motivating daily tasks that TEACH and GUIDE, not just instruct.

🚨🚨🚨 LANGUAGE RULE - READ THIS FIRST! 🚨🚨🚨

YOU WILL RECEIVE A GOAL BELOW WITH A TITLE AND DESCRIPTION.
THE LANGUAGE OF YOUR ENTIRE RESPONSE MUST MATCH THE LANGUAGE OF THAT GOAL.

IF THE GOAL IS IN ENGLISH (contains only English letters a-z, A-Z):
→ Write EVERYTHING in English ONLY - titles, descriptions, subtasks, notifications, everything!

IF THE GOAL IS IN HEBREW (contains Hebrew characters א-ת):
→ Write EVERYTHING in Hebrew ONLY - titles, descriptions, subtasks, notifications, everything!

IF THE GOAL IS IN SPANISH:
→ Write EVERYTHING in Spanish ONLY - titles, descriptions, subtasks, notifications, everything!

ABSOLUTELY NO MIXING LANGUAGES!
If goal is English → NO Hebrew anywhere!
If goal is Hebrew → NO English anywhere!

EXAMPLES OF CORRECT LANGUAGE DETECTION:
- Goal: "Learn to code" → ENGLISH → All output in English
- Goal: "ללמוד לתכנת" → HEBREW → All output in Hebrew
- Goal: "Aprender a programar" → SPANISH → All output in Spanish

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 FOR TASK CONTENT (Titles, Descriptions, Subtasks):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TONE & STYLE (for all languages):
✓ Professional yet approachable - like an expert coach/mentor
✓ Clear, informative, actionable content
✓ Rich vocabulary with subtle contemporary expressions
✓ Encouraging but not overly casual

ENGLISH EXAMPLES (translate perfectly to target language):
✓ "Let's focus on this aspect"
✓ "Time to advance your skills"
✓ "Smart step forward"
✓ "Build your foundation"
✓ "Develop this capability"

TRANSLATION REQUIREMENTS:
- If writing in Hebrew: Use modern, natural Hebrew WITHOUT nikud (vowel marks), NO English words
- If writing in Spanish: Use modern, natural Spanish
- If writing in other languages: Use natural, contemporary vocabulary
- TRANSLATE the examples above perfectly into the target language
- Maintain the same professional yet warm tone

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔔 FOR NOTIFICATIONS (notification.title & notification.body):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

THIS IS WHERE THE GENIE PERSONALITY SHINES! ✨

GENIE VOICE (for all languages):
✓ FUN, PLAYFUL, ENERGETIC personality (like Genie from Aladdin!)
✓ Short, punchy, exciting (title: 3-5 words, body: 10-15 words max)
✓ Supportive friend who believes in you
✓ Use casual terms of endearment

ENGLISH EXAMPLES (translate perfectly to target language):
  • Title: "Your Genie's calling Boss!"
  • Title: "Time to shine Friend!"
  • Title: "Let's go Champ!"
  • Body: "Boss, let's make some magic! Your task awaits"
  • Body: "Friend, I'm here for you! Let's do this"
  • Body: "Champ, time to show what you can do!"

TRANSLATION GUIDE:
- Translate "Boss" as: Hebrew = "בוס", Spanish = "Jefe"
- Translate "Friend" as: Hebrew = "חבר", Spanish = "Amigo/a"
- Translate "Champ" as: Hebrew = "אלוף", Spanish = "Campeón/a"
- Translate "Let's go" as: Hebrew = "יאללה", Spanish = "Vamos"
- Add contemporary slang naturally in target language

GOLDEN RULES:
✓ Notifications = FUN & PLAYFUL (Genie personality)
✓ Tasks/Descriptions = PROFESSIONAL & INFORMATIVE (Expert coach)
✓ TRANSLATE examples above perfectly to match the goal's language
✓ NO mixing languages within the same text

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
  • Write 2-3 informative sentences with specific details
  • Explain WHAT the user will do, WHY it matters, and HOW to approach it effectively
  • Include practical tips, techniques, or insights that add real value
  • Be direct and actionable - provide specific guidance, not just general advice
  • For learning tasks: Explain key concepts, common pitfalls, and what success looks like
  • For skill-building tasks: Include technique pointers and progression markers
  • Make it educational and empowering - teach, don't just instruct
  • 🔍 ABSOLUTELY MANDATORY: END EVERY DESCRIPTION WITH 1-2 SEARCH TAGS
  
  BAD description (WILL BE REJECTED): 
  "Complete the first module exercises."
  
  GOOD description (acceptable): 
  "Complete the first module exercises to build foundational understanding. Focus on understanding each example rather than rushing through - notice the pattern of how solutions are structured. [SEARCH:Module Tutorial|module exercises tutorial youtube] [SEARCH:Common Mistakes|beginner mistakes module exercises]"
  
  EXCELLENT (aim for this): 
  "Complete the first module exercises focusing on truly understanding the underlying principles. Work through each problem systematically: read carefully, identify what's being asked, break it down into steps. [SEARCH:Problem Solving Guide|step by step problem solving techniques] [SEARCH:Study Methods|effective learning strategies students]"
  
- Subtasks: Concrete, sequential steps
- Be encouraging but realistic
- Consider user's timezone: morning tasks for fresh energy, evening for reflection/lighter work

🔍 SEARCH SUGGESTIONS & RESOURCES (ABSOLUTELY MANDATORY):
THIS IS THE MOST CRITICAL REQUIREMENT - DO NOT SKIP THIS!

RULES:
✓ EVERY SINGLE TASK MUST HAVE AT LEAST 1-2 SEARCH TAGS - NO EXCEPTIONS
✓ Even "simple" tasks need resources - always include helpful searches
✓ Format: [SEARCH:Button Title|search keywords]
✓ Place at the END of the task description

MANDATORY EXAMPLES FOR ALL TASK TYPES:

Learning/Skills:
✓ [SEARCH:Watch Tutorial|how to play guitar chords step by step youtube]
✓ [SEARCH:Common Mistakes|beginner guitar mistakes to avoid]

Spiritual/Character:
✓ [SEARCH:Prayer Guide|jewish prayer intentions kavvanah guide]
✓ [SEARCH:Study Resources|teshuvah repentance study materials]

Fitness/Health:
✓ [SEARCH:Form Tutorial|proper squat form demonstration youtube]
✓ [SEARCH:Workout Plan|beginner workout routine guide]

Creative/Hobby:
✓ [SEARCH:Tutorial Video|watercolor painting techniques youtube]
✓ [SEARCH:Tips Guide|beginner mistakes painting tips]

HOW TO CREATE SEARCH TAGS FOR ANY TASK:
1. ALWAYS include at least 1-2 tags - NO task is too simple
2. Think: "What resource would help the user DO this better?"
3. For tutorials: Add "youtube" or "step by step tutorial"
4. For guides: Add "guide", "tips", "how to"
5. Match the language to the task language

🚨 VALIDATION RULE:
EVERY task description MUST contain at least ONE [SEARCH:...|...] tag.
Tasks without search tags will cause the generation to FAIL.
Users NEED these resources to succeed - this is NOT optional!

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
          "description": "Detailed, educational explanation (2-3 sentences). Explain what to do, why it matters, and how to approach it. MANDATORY: End with 1-2 search tags in this EXACT format: [SEARCH:Watch Tutorial|specific skill tutorial youtube] [SEARCH:Common Mistakes|beginner mistakes topic]",
          "subtasks": [
            {"title": "Specific step 1", "estimated_minutes": 10},
            {"title": "Specific step 2", "estimated_minutes": 15}
          ],
          "time_allocation_minutes": 30,
          "notification": {
            "title": "Playful Genie-style notification title (3-5 words, in same language as task)",
            "body": "Friendly Genie message (10-15 words max, encouraging and fun, in same language as task)"
          }
        }
      ]
    }
  ]
}

CRITICAL - NOTIFICATION GENERATION:
Each task MUST include a "notification" object with Genie-style messaging:
- Write in authentic Genie voice: friendly, playful, encouraging (like Genie from Aladdin)
- Use casual terms: "Boss", "Friend", "Champ" (translate to target language)
- Keep it SHORT: title 3-5 words, body 10-15 words maximum
- Match the EXACT LANGUAGE of the goal (same as task titles/descriptions!)
- Be encouraging and fun, never boring or robotic

ENGLISH EXAMPLE (translate to target language):
  {"title": "Your Genie is calling", "body": "Boss, it's time! Let's make some magic with this task"}

If goal is in Hebrew → Translate the example above to Hebrew
If goal is in Spanish → Translate the example above to Spanish
If goal is in English → Use English as shown above`;

    const userPrompt = `Create tasks for WEEK ${weekNumber} of ${totalWeeks} (Days ${startDay}-${endDay}).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 GOAL INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Title: ${goal.title}
Description: ${goal.description}
Category: ${goal.category}

🚨🚨🚨 MANDATORY LANGUAGE CHECK - DO THIS NOW! 🚨🚨🚨

STEP 1: LOOK at the Title and Description above.
STEP 2: Identify the language:
  - Is it English? (only a-z, A-Z characters)
  - Is it Hebrew? (contains א-ת characters)  
  - Is it Spanish? (Spanish words/accents)
  - Is it German? (German words/accents)
  - Is it French? (French words/accents)
  - Is it Italian? (Italian words/accents)
  - Is it Portuguese? (Portuguese words/accents)
  - Is it Russian? (Russian words/accents)
  - Is it Chinese? (Chinese words/accents)
  - Is it Japanese? (Japanese words/accents)
  - Is it Korean? (Korean words/accents)
  - Is it Arabic? (Arabic words/accents)
  - Is it Hindi? (Hindi words/accents)
  - Is it Turkish? (Turkish words/accents)
  - Is it Polish? (Polish words/accents)
  - Is it Dutch? (Dutch words/accents)
  - Is it Swedish? (Swedish words/accents)
  - Is it Danish? (Danish words/accents)
  - Is it Norwegian? (Norwegian words/accents)
  - Is it Icelandic? (Icelandic words/accents)

STEP 3: Write your ENTIRE JSON response in that EXACT language ONLY!

If Title/Description = ENGLISH → All tasks, notifications, everything = ENGLISH ONLY
If Title/Description = HEBREW → All tasks, notifications, everything = HEBREW ONLY  
If Title/Description = SPANISH → All tasks, notifications, everything = SPANISH ONLY
If Title/Description = GERMAN → All tasks, notifications, everything = GERMAN ONLY
If Title/Description = FRENCH → All tasks, notifications, everything = FRENCH ONLY
If Title/Description = ITALIAN → All tasks, notifications, everything = ITALIAN ONLY
If Title/Description = PORTUGUESE → All tasks, notifications, everything = PORTUGUESE ONLY
If Title/Description = RUSSIAN → All tasks, notifications, everything = RUSSIAN ONLY
If Title/Description = CHINESE → All tasks, notifications, everything = CHINESE ONLY
If Title/Description = JAPANESE → All tasks, notifications, everything = JAPANESE ONLY
If Title/Description = KOREAN → All tasks, notifications, everything = KOREAN ONLY
If Title/Description = ARABIC → All tasks, notifications, everything = ARABIC ONLY
If Title/Description = HINDI → All tasks, notifications, everything = HINDI ONLY
If Title/Description = TURKISH → All tasks, notifications, everything = TURKISH ONLY
If Title/Description = POLISH → All tasks, notifications, everything = POLISH ONLY
If Title/Description = DUTCH → All tasks, notifications, everything = DUTCH ONLY
If Title/Description = SWEDISH → All tasks, notifications, everything = SWEDISH ONLY
If Title/Description = DANISH → All tasks, notifications, everything = DANISH ONLY
If Title/Description = NORWEGIAN → All tasks, notifications, everything = NORWEGIAN ONLY
If Title/Description = ICELANDIC → All tasks, notifications, everything = ICELANDIC ONLY

NO EXCEPTIONS! NO MIXING LANGUAGES!
Only High level of native translations and content writing with genie joyful personality style.

🌍 USER CONTEXT
Timezone: ${deviceTimezone}
Current time: ${new Date(deviceNowIso).toLocaleString('en-US', { timeZone: deviceTimezone })}

⚙️ USER PREFERENCES - DAYS AND TIMES
🚨 CRITICAL - EXACT DAYS FOR THIS WEEK:
You must create tasks for these SPECIFIC days ONLY:
${explicitDaysForThisWeek.map(d => `  ✅ ${d}`).join('\n')}

Total: ${workingDaysCount} working days in this week
Preferred Days of Week: ${preferredDaysText}

🚨 DO NOT create tasks for ANY other days!
Example: If the list shows "Day 1 (Monday), Day 3 (Wednesday), Day 5 (Friday)"
→ Create tasks ONLY for days 1, 3, and 5
→ SKIP days 2, 4, 6, 7 completely

Tasks Per Day: ${tasksPerDay} task(s) per working day

Preferred Time Slots (${deviceTimezone} timezone):
${timeSlots.map((time, idx) => `  ✅ ${timeLabels[idx]}: "${time}" ← USE THIS EXACT TIME`).join('\n')}
⚠️ CRITICAL: Use ONLY these exact times - NO other times allowed!

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

🚨🚨🚨 TIME SLOTS - ABSOLUTELY CRITICAL 🚨🚨🚨
User's timezone: ${deviceTimezone}
Allowed times: ${timeSlots.join(', ')}

YOU ARE FORBIDDEN TO USE ANY OTHER TIMES!
Examples of FORBIDDEN times: 00:00, 07:00, 08:00, 09:00, 10:00, 11:00, 12:00, 13:00, 15:00, 16:00, 17:00, 18:00, 19:00, 20:00, 22:00, 23:00

${tasksPerDay === 1 ? `Use ONLY: ${timeSlots[0]} - NO other times exist!` : ''}
${tasksPerDay === 2 ? `Use ONLY: ${timeSlots[0]} and ${timeSlots[1]} - These are the ONLY 2 allowed times!` : ''}
${tasksPerDay === 3 ? `Use ONLY: ${timeSlots[0]}, ${timeSlots[1]}, and ${timeSlots[2]} - These are the ONLY 3 allowed times!` : ''}

TASKS PER DAY LIMIT:
- Create EXACTLY ${tasksPerDay} tasks per working day
- NOT ${tasksPerDay + 1}, NOT ${tasksPerDay - 1}, EXACTLY ${tasksPerDay}
- Each day gets: ${timeSlots.slice(0, tasksPerDay).join(', ')} (one task per time slot)

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
          "description": "Concise explanation aligned with this week's theme. State what to do and why it matters. Focus on [key technique/concept]. MANDATORY RESOURCES: [SEARCH:Watch Tutorial|specific search keywords youtube] [SEARCH:Guide|helpful guide keywords]",
          "subtasks": [
            {"title": "Specific step 1", "estimated_minutes": 15},
            {"title": "Specific step 2", "estimated_minutes": 15}
          ],
          "time_allocation_minutes": 30,
          "notification": {
            "title": "Your Genie is calling",
            "body": "Boss, it's time! Let's make magic with this task"
          }
        }
      ]
    }
  ]${weekNumber === totalWeeks ? `,
  "tasks_ready_notification": {
    "title": "Everything is ready for you",
    "body": "Friend, your complete plan awaits! Let's begin this journey together"
  }` : ''}
}

🚨 CRITICAL REQUIREMENTS - WILL BE REJECTED IF VIOLATED:

1. DAYS - Create tasks ONLY for: ${preferredDaysText}
   - DO NOT create tasks for any other days
   - Skip days not in this list completely
   - Working days in this week: ${workingDaysCount} days

2. TIMES - Use ONLY: ${timeSlots.join(', ')} (in ${deviceTimezone} timezone)
   - DO NOT use any other times (no 08:00, 09:00, 10:00, 16:00, 17:00, 23:00, etc.)
   - ONLY ${timeSlots[0]}, ${timeSlots[1] || ''}, ${timeSlots[2] || ''} are allowed
   - Each task must use one of these EXACT times
   - Tasks per working day: EXACTLY ${tasksPerDay} task(s) - NO MORE, NO LESS!

3. CONTENT:
   - WRITE CONCISE, VALUABLE DESCRIPTIONS (2-3 sentences maximum!)
   - Include ONE key tip or insight per task
   - 🔍 Add 1-3 [SEARCH:Button Text|keywords] tags to EVERY task
   - Use format: [SEARCH:Button Text|google search keywords]
   - Be direct and actionable - avoid fluff

NOW CREATE WEEK ${weekNumber} - DAYS ${startDay} TO ${endDay}:
- Total tasks to create: ${tasksInThisWeek} tasks (${workingDaysCount} working days × ${tasksPerDay} tasks/day)
- Use ONLY the days: ${preferredDaysText}
- Use ONLY the times: ${timeSlots.join(', ')}

🚨 CRITICAL REQUIREMENTS - WILL BE REJECTED IF MISSING:
1. Descriptions: 2-3 sentences MAXIMUM
2. 🔍 SEARCH TAGS: EVERY task MUST end with 1-2 [SEARCH:Title|keywords] tags - NO EXCEPTIONS!
   Format: [SEARCH:Watch Tutorial|how to do X step by step youtube]
   Example: "Learn to hold guitar properly. [SEARCH:Guitar Grip Tutorial|proper guitar holding technique youtube] [SEARCH:Common Mistakes|beginner guitar grip mistakes]"
3. 🔔 NOTIFICATIONS: EVERY task MUST include a "notification" object - NO EXCEPTIONS!
   - Write in authentic Genie voice (friendly, playful, encouraging like Genie from Aladdin)
   - Title: 3-5 words, specific to this task, in same language as task
   - Body: 10-15 words max, motivating call-to-action, in same language as task
   - Make it UNIQUE to this specific task and goal (not generic!)
4. Subtasks: 2-3 per task with specific steps
5. Time allocation: 25-45 minutes total

VALIDATION: Before outputting, check EVERY task has:
✓ Description with [SEARCH:...|...] tags at the end
✓ Notification object
✓ Subtasks array

OUTPUT JSON ONLY:`;

    // Calculate max_tokens dynamically based on tasks needed
    // Each task ~500 tokens (title + concise description + subtasks + resources + notification + JSON structure)
    // Optimized for 2-3 sentence descriptions with one key insight + Genie-style notification
    // Add 1200 tokens for JSON overhead and buffer
    const estimatedTokensPerTask = 500;
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
        tasks: generateTemplateTasks(goal, deviceNowIso),
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

    // Fix common JSON issues with Hebrew/RTL text and special characters
    cleanedText = cleanedText
      .replace(/[\u200E\u200F\u202A-\u202E]/g, '') // Remove RTL/LTR direction marks
      .replace(/\u00A0/g, ' ') // Replace non-breaking spaces with regular spaces
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n') // Normalize carriage returns
      .trim();

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
      
      // 🚨 CRITICAL DEBUG: Show what times AI actually returned
      console.log(`[${requestId}] 🕐 AI RETURNED TIMES (RAW):`);
      planData.days?.forEach((day: any) => {
        const times = day.tasks?.map((t: any) => t.time).join(', ') || 'no tasks';
        console.log(`[${requestId}]   Day ${day.day}: [${times}]`);
      });
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
        tasks: generateTemplateTasks(goal, deviceNowIso),
        usedModel: 'template-fallback',
        metadata: {
          parseError: true,
          truncated: isTruncated,
          responseLength: cleanedText.length,
          maxTokens: calculatedMaxTokens,
        },
      };
    }

    // Get expected time slots for validation - NO FALLBACK!
    const expectedTimeSlots = new Set<string>();
    
    // 🚨 At this point, preferred_time_ranges MUST exist (validated earlier)
    goal.preferred_time_ranges.forEach((range) => {
      const hour = range.start_hour.toString().padStart(2, '0');
      expectedTimeSlots.add(`${hour}:00`);
    });
    
    console.log(
      `[${requestId}] 🔍 Expected time slots: ${Array.from(expectedTimeSlots).join(', ')}`
    );

    // Convert AI response to TaskTemplate format
    const tasks: TaskTemplate[] = [];
    const usedTimeSlots = new Map<string, Set<string>>();
    let invalidTimesDetected = 0;

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
        // Calculate the actual day of week based on goal start date
        const goalStartDate = new Date(deviceNowIso);
        goalStartDate.setDate(goalStartDate.getDate() + (dayNumber - 1));
        const dayOfWeek = goalStartDate.getDay(); // 0=Sunday, 1=Monday, etc.
        
        console.log(
          `[${requestId}] DEBUG: Day ${dayNumber} is ${goalStartDate.toDateString()} (day of week ${dayOfWeek}), preferred days: ${goal.preferred_days}`
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
          
          // Validate and correct task time if AI didn't follow instructions
          let correctedTime = task.time;
          if (!expectedTimeSlots.has(task.time)) {
            console.warn(
              `[${requestId}] ⚠️ AI used invalid time "${task.time}" instead of ${Array.from(expectedTimeSlots).join(', ')}`
            );
            invalidTimesDetected++;
            
            // Map AI's wrong time to nearest correct time slot
            const taskHour = parseInt(task.time.split(':')[0], 10);
            const timeSlotsArray = Array.from(expectedTimeSlots).map(t => parseInt(t.split(':')[0]));
            const nearest = timeSlotsArray.reduce((prev, curr) => 
              Math.abs(curr - taskHour) < Math.abs(prev - taskHour) ? curr : prev
            );
            correctedTime = `${nearest.toString().padStart(2, '0')}:00`;
            
            console.log(
              `[${requestId}] ✅ Corrected "${task.time}" → "${correctedTime}"`
            );
          }
          
          const timeOfDay = convertHHMMToTimeOfDay(correctedTime);
          const runAt = computeRunAt(
            dayNumber,
            timeOfDay,
            deviceNowIso,
            goal.preferred_time_ranges,
            correctedTime // Use corrected time
          );

          tasks.push({
            title: task.title || `Task for Day ${dayNumber}`,
            description: task.description || 'Complete this task',
            day_offset: dayNumber - 1,
            time_of_day: timeOfDay,
            subtasks: task.subtasks || [],
            time_allocation_minutes: task.time_allocation_minutes || 30,
            custom_time: correctedTime, // Save corrected time
            notification: task.notification || null, // AI-generated notification
          });
          console.log(
            `[${requestId}] DEBUG: Added task ${task.title} at ${correctedTime}, total tasks: ${tasks.length}`
          );
        } catch (taskError) {
          console.warn(`[${requestId}] Error processing task:`, taskError);
        }
      }
    }

    console.log(`[${requestId}] Generated ${tasks.length} tasks from AI`);
    
    if (invalidTimesDetected > 0) {
      console.warn(
        `[${requestId}] ⚠️ AI used ${invalidTimesDetected} invalid times - all corrected to match user preferences`
      );
    }
    
    // Validate that tasks have SEARCH tags
    const tasksWithSearchTags = tasks.filter(t => 
      t.description && t.description.includes('[SEARCH:')
    ).length;
    const searchTagPercentage = tasks.length > 0 ? (tasksWithSearchTags / tasks.length) * 100 : 0;
    
    console.log(`[${requestId}] SEARCH TAGS VALIDATION: ${tasksWithSearchTags}/${tasks.length} tasks (${searchTagPercentage.toFixed(0)}%) have search tags`);
    
    if (searchTagPercentage < 50) {
      console.error(`[${requestId}] ❌ CRITICAL: Only ${searchTagPercentage.toFixed(0)}% of tasks have search tags (minimum 80% required)!`);
      console.error(`[${requestId}] AI failed to follow SEARCH tag requirements - tasks will lack resources`);
    } else if (searchTagPercentage < 80) {
      console.warn(`[${requestId}] ⚠️ WARNING: Only ${searchTagPercentage.toFixed(0)}% of tasks have search tags (recommended 100%)`);
    } else {
      console.log(`[${requestId}] ✅ Good: ${searchTagPercentage.toFixed(0)}% of tasks have search tags`);
    }
    
    // Extract tasks_ready_notification from AI response if this is the final week
    const tasksReadyNotif = (weekNumber === totalWeeks && planData.tasks_ready_notification) 
      ? planData.tasks_ready_notification 
      : null;
    
    return {
      tasks,
      usedModel: 'claude-haiku-4-5-20251001',
      tokenUsage: tokenUsage || undefined,
      tasksReadyNotification: tasksReadyNotif,
      metadata: {
        searchTagCoverage: searchTagPercentage,
        tasksWithSearchTags,
        totalTasks: tasks.length,
        hasCustomNotification: !!tasksReadyNotif,
      },
    };
  } catch (error) {
    console.error(`[${requestId}] AI generation error:`, error);
    return {
      tasks: generateTemplateTasks(goal, deviceNowIso),
      usedModel: 'template-fallback',
      tasksReadyNotification: null,
    };
  }
}

// ============================================================================
// TEMPLATE FALLBACK
// ============================================================================

function generateTemplateTasks(goal: Goal, deviceNowIso?: string): TaskTemplate[] {
  const tasks: TaskTemplate[] = [];

  // Calculate tasks per day based on user preferences
  const maxTasks =
    goal.tasks_per_day_max || goal.preferred_time_ranges?.length || 3;
  const availableTimeSlots = goal.preferred_time_ranges?.length || 3;
  const tasksPerDay = Math.min(maxTasks, availableTimeSlots);

  // Use preferred time ranges - NO FALLBACK ALLOWED!
  const timeSlots: string[] = [];
  const timeLabels: string[] = [];
  
  // 🚨 CRITICAL: Template fallback also requires user preferences
  if (!goal.preferred_time_ranges || goal.preferred_time_ranges.length === 0) {
    console.error('[TEMPLATE] ❌ CRITICAL: No preferred_time_ranges in template fallback!');
    throw new Error('User preferences required even for template fallback');
  }
  
  goal.preferred_time_ranges.forEach((range) => {
    const hour = range.start_hour.toString().padStart(2, '0');
    timeSlots.push(`${hour}:00`);
    timeLabels.push(range.label || 'Session');
  });
  
  console.log(`[TEMPLATE] ✅ Using user's preferred times (NO FALLBACK): ${timeSlots.join(', ')}`);

  const timeOfDays = ['morning', 'afternoon', 'evening'];

  // Get goal start date to calculate actual day of week
  const goalStartDate = deviceNowIso ? new Date(deviceNowIso) : new Date();
  console.log(`[TEMPLATE] Goal starts on: ${goalStartDate.toDateString()} (day ${goalStartDate.getDay()})`);
  console.log(`[TEMPLATE] Preferred days: ${goal.preferred_days}`);
  console.log(`[TEMPLATE] Preferred times: ${timeSlots.join(', ')}`);
  
  for (let day = 1; day <= goal.plan_duration_days; day++) {
    // Check if this day is in preferred_days
    if (goal.preferred_days?.length) {
      // Calculate actual day of week based on goal start date
      const currentDate = new Date(goalStartDate);
      currentDate.setDate(goalStartDate.getDate() + (day - 1));
      const dayOfWeek = currentDate.getDay(); // 0=Sunday, 1=Monday, etc.
      
      console.log(`[TEMPLATE] Day ${day}: ${currentDate.toDateString()} = day of week ${dayOfWeek}`);
      
      if (!goal.preferred_days.includes(dayOfWeek)) {
        console.log(`[TEMPLATE] ❌ Skipping day ${day} - not in preferred days`);
        continue; // Skip this day
      }
      
      console.log(`[TEMPLATE] ✅ Day ${day} included - is in preferred days`);
    }

    for (let taskIdx = 0; taskIdx < tasksPerDay; taskIdx++) {
      const timeOfDay = timeOfDays[taskIdx] || 'morning';
      const customTime = timeSlots[taskIdx] || timeSlots[0];
      const label = timeLabels[taskIdx] || 'Session';

      console.log(`[TEMPLATE] 📝 Day ${day}, Task ${taskIdx + 1}: ${customTime} (${label}) - time_of_day: ${timeOfDay}`);

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
        custom_time: customTime, // This will be passed to computeRunAt!
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
  tasks: (TaskTemplate & { notification?: { title: string; body: string } })[],
  deviceNowIso: string,
  preferredTimeRanges: PreferredTimeRange[] | null,
  requestId: string
): Promise<any[]> {
  // Note: We don't check for existing tasks anymore because we're adding week-by-week
  // Each week adds its own tasks incrementally

  const tasksToInsert = tasks.map((task, idx) => {
    const runAt = computeRunAt(
      task.day_offset + 1,
      task.time_of_day,
      deviceNowIso,
      preferredTimeRanges,
      task.custom_time // Pass custom_time to computeRunAt
    );

    const taskToInsert = {
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
    
    // 🚨 DEBUG: Log what we're about to insert
    if (idx < 3) { // Only log first 3 tasks to avoid spam
      console.log(`[${requestId}] 📝 Inserting task ${idx + 1}:`, {
        title: task.title.substring(0, 30),
        custom_time: task.custom_time,
        time_of_day: task.time_of_day,
        run_at: runAt,
        run_at_hour: new Date(runAt).getHours(),
        run_at_minute: new Date(runAt).getMinutes(),
      });
    }
    
    return taskToInsert;
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
    // Get user_id and title from goal
    const { data: goalData, error: goalError } = await supabase
      .from('goals')
      .select('user_id, title')
      .eq('id', goalId)
      .single();

    if (goalError) {
      console.error(
        `[${requestId}] Error fetching goal for notifications:`,
        goalError
      );
    } else {
      // Use AI-generated notifications if available, otherwise fallback to variations
      const isHebrew = /[\u0590-\u05FF]/.test(goalData.title || '');
      
      // Fallback variations (only used if AI didn't provide notifications)
      // 🎭 GENIE-STYLE NOTIFICATIONS - Fun, playful, supportive!
      const fallbackVariations = isHebrew ? [
        { title: 'הג׳יני שלך קורא בוס!', body: (title: string) => `בוס, המשימה מחכה! ${title} - יאללה נעשה קסמים` },
        { title: 'זמן להצליח חבר!', body: (title: string) => `חבר יקר, ${title} - אני כאן בשבילך, בוא נתחיל!` },
        { title: 'יאללה בואנה!', body: (title: string) => `${title} - תותח, הזמן הגיע! בוא נראה אותך!` },
        { title: 'הג׳יני שלך כאן!', body: (title: string) => `${title} - ביחד נגשים את המשאלה, אלוף!` },
        { title: 'זמן לקסמים בוס!', body: (title: string) => `${title} - אתה מוכשר יותר ממה שאתה חושב!` },
        { title: 'חבר, הזמן הגיע!', body: (title: string) => `בוס, ${title} - בוא נעשה את זה ביחד!` },
        { title: 'המשימה שלך מחכה!', body: (title: string) => `${title} - יאללה חבר, אני כאן לצידך!` },
      ] : [
        { title: 'Your Genie calling Boss!', body: (title: string) => `Boss, time for magic! ${title} - let\'s do this!` },
        { title: 'Time to shine Friend!', body: (title: string) => `Friend, ${title} - I\'m here for you, let\'s begin!` },
        { title: 'Let\'s go Champ!', body: (title: string) => `${title} - you got this! Show me what you can do!` },
        { title: 'Your Genie is here!', body: (title: string) => `${title} - together we\'ll make it happen!` },
        { title: 'Magic time Boss!', body: (title: string) => `${title} - you\'re more capable than you think!` },
        { title: 'Friend, it\'s time!', body: (title: string) => `Boss, ${title} - let\'s make it together!` },
        { title: 'Your task awaits!', body: (title: string) => `${title} - come on friend, I\'m by your side!` },
      ];

      const scheduledNotifications = data.map((task: any, index: number) => {
        // Find corresponding task in the original tasks array to get AI notification
        const originalTask = tasks.find(t => 
          t.title === task.title && t.day_offset === task.day_offset
        );
        
        let notifTitle, notifBody;
        
        if (originalTask?.notification?.title && originalTask?.notification?.body) {
          // Use AI-generated notification
          notifTitle = originalTask.notification.title;
          notifBody = originalTask.notification.body;
          console.log(`[${requestId}] Using AI notification for task: ${task.title.substring(0, 30)}...`);
        } else {
          // Use fallback variation
          const variation = fallbackVariations[index % fallbackVariations.length];
          notifTitle = variation.title;
          notifBody = variation.body(task.title);
          console.log(`[${requestId}] Using fallback notification for task: ${task.title.substring(0, 30)}...`);
        }
        
        return {
          user_id: goalData.user_id,
          task_id: task.id,
          goal_id: goalId,
          type: 'task_reminder',
          title: notifTitle,
          body: notifBody,
          scheduled_for: task.run_at,
          sent: false,
        };
      });

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

    // Get user preferences - CRITICAL for time slots!
    console.log(`[${requestId}] 🔍 Fetching user preferences for user_id: ${user_id}`);
    const { data: userPrefs, error: userPrefsError } = await supabase
      .from('user_preferences')
      .select('plan_duration_days, preferred_time_ranges, preferred_days, tasks_per_day_min, tasks_per_day_max, timezone')
      .eq('user_id', user_id)
      .single();

    // 🚨 CRITICAL: Check for errors or missing data
    if (userPrefsError) {
      console.error(`[${requestId}] ❌ ERROR fetching user_preferences:`, userPrefsError);
      console.error(`[${requestId}] Error code: ${userPrefsError.code}, Message: ${userPrefsError.message}`);
      if (userPrefsError.code === 'PGRST116') {
        console.error(`[${requestId}] ❌ CRITICAL: No user_preferences row found for user ${user_id}!`);
        return errorResponse(
          400,
          'User preferences not found. Please set your preferences in settings first.',
          requestId,
          Date.now() - startTime
        );
      }
    }

    if (!userPrefs) {
      console.error(`[${requestId}] ❌ CRITICAL: userPrefs is null/undefined!`);
      return errorResponse(
        400,
        'User preferences not loaded. Please try again.',
        requestId,
        Date.now() - startTime
      );
    }

    console.log(`[${requestId}] ✅ User preferences loaded successfully`);
    console.log(`[${requestId}] 📊 User preferences data:`, JSON.stringify(userPrefs, null, 2));
    console.log(`[${requestId}] 🕐 preferred_time_ranges:`, JSON.stringify(userPrefs.preferred_time_ranges, null, 2));
    console.log(`[${requestId}] 📅 preferred_days:`, userPrefs.preferred_days);
    console.log(`[${requestId}] 🌍 timezone:`, userPrefs.timezone);

    // Priority for timezone: device_timezone > user preferences > goal timezone > UTC
    const finalTimezone = device_timezone || userPrefs?.timezone || goal.device_timezone || 'UTC';
    console.log(`[${requestId}] Final timezone: ${finalTimezone}`);

    // ALWAYS use user preferences for time-related settings (they are the source of truth)
    // This ensures tasks are scheduled according to user's current preferences, even if goal was created earlier
    if (userPrefs?.preferred_time_ranges) {
      goal.preferred_time_ranges = userPrefs.preferred_time_ranges;
      console.log(`[${requestId}] ✅ Using preferred_time_ranges from user preferences (ALWAYS):`, JSON.stringify(userPrefs.preferred_time_ranges, null, 2));
    } else {
      console.error(`[${requestId}] ❌ WARNING: No preferred_time_ranges in user_preferences!`);
    }
    
    if (userPrefs?.preferred_days) {
      goal.preferred_days = userPrefs.preferred_days;
      console.log(`[${requestId}] ✅ Using preferred_days from user preferences (ALWAYS):`, userPrefs.preferred_days);
    } else {
      console.error(`[${requestId}] ❌ WARNING: No preferred_days in user_preferences!`);
    }
    
    if (userPrefs?.tasks_per_day_min) {
      goal.tasks_per_day_min = userPrefs.tasks_per_day_min;
      console.log(`[${requestId}] Using tasks_per_day_min from user preferences:`, userPrefs.tasks_per_day_min);
    }
    if (userPrefs?.tasks_per_day_max) {
      goal.tasks_per_day_max = userPrefs.tasks_per_day_max;
      console.log(`[${requestId}] Using tasks_per_day_max from user preferences:`, userPrefs.tasks_per_day_max);
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

    // 🚨 CHECK TOKENS BEFORE GENERATING TASKS
    // Estimate tasks needed for this week
    const maxTasks = goal.tasks_per_day_max || goal.preferred_time_ranges?.length || 3;
    const availableTimeSlots = goal.preferred_time_ranges?.length || 3;
    const tasksPerDay = Math.min(maxTasks, availableTimeSlots);
    const daysPerWeek = goal.preferred_days?.length || 7;
    const daysInThisWeek = Math.min(7, goal.plan_duration_days - (currentWeek - 1) * 7);
    const workingDaysInWeek = Math.ceil((daysInThisWeek / 7) * daysPerWeek);
    const estimatedTasksForWeek = workingDaysInWeek * tasksPerDay;
    
    console.log(`[${requestId}] Estimated ${estimatedTasksForWeek} tasks needed for week ${currentWeek}`);
    
    // Check if user has enough tokens BEFORE generating
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_tokens')
      .select('tokens_remaining, tokens_used')
      .eq('user_id', user_id)
      .single();

    if (tokenError) {
      console.error(`[${requestId}] Error checking tokens:`, tokenError);
      return errorResponse(
        500,
        'Failed to check token balance',
        requestId,
        Date.now() - startTime
      );
    }

    const currentTokens = tokenData?.tokens_remaining || 0;
    
    if (currentTokens < estimatedTasksForWeek) {
      const tokensToLoad = Math.max(100, estimatedTasksForWeek - currentTokens);
      
      console.log(`[${requestId}] Insufficient tokens: has ${currentTokens}, needs ${estimatedTasksForWeek}`);
      
      // Mark goal as needing tokens (partial state)
      await supabase
        .from('goals')
        .update({
          status: 'paused',
          error_message: `Insufficient tokens. Need ${estimatedTasksForWeek} tokens but only have ${currentTokens}. Please purchase at least ${tokensToLoad} tokens to continue.`,
        })
        .eq('id', goal_id);
      
      return errorResponse(
        402,
        `Not enough tokens to continue creating tasks. You have ${currentTokens} tokens but need ${estimatedTasksForWeek} for week ${currentWeek}. Please purchase at least ${tokensToLoad} tokens to continue.`,
        requestId,
        Date.now() - startTime
      );
    }
    
    console.log(`[${requestId}] User has ${currentTokens} tokens - sufficient for week ${currentWeek}`);

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
    // Mark goal as 'failed' and let user retry manually
    if (tasksResult.usedModel === 'template-fallback') {
      const metadata = tasksResult.metadata || {};
      const isTruncated = metadata.truncated;

      console.error(
        `[${requestId}] AI generation failed for week ${currentWeek}, marking goal as failed`
      );

      if (isTruncated) {
        console.error(
          `[${requestId}] Failure reason: Response truncated at ${metadata.maxTokens} tokens (${metadata.responseLength} chars)`
        );
      }

      // Save failure to ai_runs for tracking
      await supabase.from('ai_runs').insert({
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
            : 'AI generation failed - user can retry',
          ...metadata,
        },
        completed_at: new Date().toISOString(),
      });

      // Mark goal as failed so polling stops
      await supabase
        .from('goals')
        .update({
          status: 'failed',
          error_message: isTruncated
            ? 'AI response was too long. Please try again.'
            : 'Task generation failed. Please try again.',
        })
        .eq('id', goal_id);

      const errorMessage = isTruncated
        ? `AI response was truncated for week ${currentWeek}. Please try again - the system will adjust automatically.`
        : `AI generation failed for week ${currentWeek}. Please click "Try Again" to retry.`;

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

      // Call the function again for the next week (non-blocking, fire-and-forget)
      // Start the fetch BEFORE returning response, then use Deno.waitUntil() to keep it alive
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (!serviceRoleKey) {
        console.error(`[${requestId}] ❌ SUPABASE_SERVICE_ROLE_KEY not found - cannot trigger next week`);
        await supabase
          .from('goals')
          .update({
            error_message: `Failed to trigger task generation for week ${currentWeek + 1}: Service role key not configured.`,
            status: 'active',
          })
          .eq('id', goal_id);
      } else {
        // Start the fetch immediately - this is critical!
        // For service-to-service calls, use both apikey and Authorization headers
        const nextWeekPromise = fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-tasks`, {
          method: 'POST',
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user_id,
            goal_id: goal_id,
            device_now_iso: finalDeviceNow,
            device_timezone: finalTimezone,
            week_number: currentWeek + 1,
          }),
        })
        .then(async (response) => {
          const asyncSupabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
          );
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(
              `[${requestId}] ❌ Failed to trigger week ${currentWeek + 1}: ${response.status} - ${errorText}`
            );
            await asyncSupabase
              .from('goals')
              .update({
                error_message: `Failed to generate tasks for week ${currentWeek + 1}. The system will retry automatically.`,
                status: 'active',
              })
              .eq('id', goal_id);
          } else {
            const responseData = await response.json();
            console.log(
              `[${requestId}] ✅ Successfully triggered week ${currentWeek + 1}: ${responseData.tasks_count || 0} tasks`
            );
            await asyncSupabase
              .from('goals')
              .update({
                error_message: null,
              })
              .eq('id', goal_id);
          }
        })
        .catch(async (error) => {
          console.error(`[${requestId}] ❌ Failed to trigger next week:`, error);
          const asyncSupabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
          );
          await asyncSupabase
            .from('goals')
            .update({
              error_message: `Failed to trigger task generation for week ${currentWeek + 1}. The system will retry automatically.`,
              status: 'active',
            })
            .eq('id', goal_id);
        });
        
        // CRITICAL: Use Deno.waitUntil() to keep the promise alive after function returns
        Deno.waitUntil(nextWeekPromise);
      }

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

    // Get total task count and goal title for final notification
    const { count: totalTaskCount } = await supabase
      .from('goal_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('goal_id', goal_id);

    const { data: goalForNotification } = await supabase
      .from('goals')
      .select('title')
      .eq('id', goal_id)
      .single();

    // Send push notification for completion
    // Use AI-generated notification if available (only on final week)
    const goalTitle = goalForNotification?.title || '';
    const isHebrew = /[\u0590-\u05FF]/.test(goalTitle);
    const taskCount = totalTaskCount || insertedTasks.length;
    
    let completionMessage;
    if (currentWeek === totalWeeks && tasksResult.tasksReadyNotification?.title && tasksResult.tasksReadyNotification?.body) {
      // Use AI-generated notification for final week
      completionMessage = tasksResult.tasksReadyNotification;
      console.log('✅ Using AI-generated tasks ready notification');
    } else {
      // Fallback messages (no emojis, Genie style)
      // 🎉 GENIE-STYLE "TASKS READY" NOTIFICATIONS - Exciting, motivating!
      const messages = [
        { title: 'Tasks Ready!', body: `Your Genie created ${taskCount} tasks for "${goalTitle}". Let's get started!` },
        { title: 'Your Plan is Ready', body: `${taskCount} new tasks created for "${goalTitle}". Time to take action!` },
        { title: 'Genie Prepared Everything', body: `Tasks for "${goalTitle}" are ready! ${taskCount} steps towards your goal` },
      ];
      completionMessage = messages[Math.floor(Math.random() * messages.length)];
      console.log('⚠️ Using fallback tasks ready notification');
    }
    
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
            title: completionMessage.title,
            body: completionMessage.body,
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
