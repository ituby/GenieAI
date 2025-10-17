import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

// Available icons list - matches iconMapping.ts from the app
const AVAILABLE_ICONS = [
  'user', 'user-circle', 'user-square', 'users', 'person-simple-run', 'person-simple-walk', 
  'person-simple-bike', 'fingerprint', 'hand-heart', 'heart', 'star', 'target', 'lightbulb', 
  'rocket', 'trophy', 'medal', 'crown', 'sparkle', 'compass', 'shield', 'key', 'lock', 
  'puzzle-piece', 'infinity', 'atom', 'flask', 'globe', 'test-tube', 'briefcase', 'laptop', 
  'building', 'bank', 'money', 'coins', 'credit-card', 'wallet', 'chart-line', 'chart-pie', 
  'storefront', 'handshake', 'book', 'book-open', 'graduation-cap', 'pencil', 'calculator', 
  'leaf', 'sun', 'moon', 'tree', 'flower', 'cloud', 'rainbow', 'drop', 'mountains', 'wave', 
  'fire', 'bicycle', 'music-notes', 'camera', 'brain', 'eye', 'eye-closed', 'bell', 
  'chat-circle', 'chat-text', 'paper-plane', 'calendar', 'clock', 'map-pin', 
  'globe-hemisphere-west', 'thumbs-up', 'thumbs-down', 'password'
];

function validateIcon(icon: string | undefined): string {
  if (!icon || !AVAILABLE_ICONS.includes(icon)) {
    console.warn(`[AI] Invalid icon "${icon}", using fallback "star"`);
    return 'star';
  }
  return icon;
}

const VALID_CATEGORIES = [
  'lifestyle',
  'career',
  'mindset',
  'character',
  'goal',
  'learning',
  'health',
  'finance',
  'social',
  'fitness',
  'creativity',
  'custom',
];
const VALID_INTENSITIES = ['easy', 'medium', 'hard'];
const CATEGORY_COLOR_MAP: Record<string, string> = {
  lifestyle: 'green',
  career: 'blue',
  mindset: 'purple',
  character: 'pink',
  custom: 'yellow',
};
const FALLBACK_ICONS: Record<string, string> = {
  lifestyle: 'heart',
  career: 'briefcase',
  mindset: 'brain',
  character: 'star',
  custom: 'target',
};

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

function buildTailoredOutline(title: string, description: string): any[] {
  const shortTitle = (title || 'Your Goal').trim().slice(0, 50);
  return [
    {
      title: `Week 1 • ${shortTitle} - Foundation`,
      description: `Establish core systems and build momentum. Create strong foundations for success.`,
    },
    {
      title: `Week 2 • ${shortTitle} - Development`,
      description: `Develop skills and deepen expertise. Practice and apply what you've learned.`,
    },
    {
      title: `Week 3 • ${shortTitle} - Mastery`,
      description: `Master your skills and achieve your goals. Celebrate your transformation.`,
    },
  ];
}

function buildTailoredMilestones(
  title: string,
  planDurationDays: number = 21
): any[] {
  const totalWeeks = Math.ceil(planDurationDays / 7);
  const t = (title || 'Your Goal').trim().slice(0, 60);

  const milestones: any[] = [];
  for (let week = 1; week <= totalWeeks; week++) {
    if (week === 1) {
      milestones.push({
        week,
        title: `Kickoff • ${t} Foundations`,
        description:
          'Establish core systems, momentum, and measurement to start strong.',
        tasks: Math.ceil(planDurationDays / totalWeeks),
      });
    } else if (week === totalWeeks) {
      milestones.push({
        week,
        title: `Elevate • ${t} Mastery`,
        description:
          'Integrate, optimize, and prepare for sustainable long-term success.',
        tasks: Math.ceil(planDurationDays / totalWeeks),
      });
    } else {
      milestones.push({
        week,
        title: `Build • ${t} Skills`,
        description:
          'Advance skills with deliberate practice and concrete outputs.',
        tasks: Math.ceil(planDurationDays / totalWeeks),
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
  console.log(
    `[TIMING] Input - Day: ${dayNumber}, TimeOfDay: ${timeOfDay}, DeviceNow: ${deviceNowIso}, Timezone: ${deviceTimezone}`
  );
  console.log(
    `[TIMING] Device time: ${deviceNow.toISOString()}, Local: ${deviceNow.toLocaleString()}`
  );

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
    const timeLeftToday = 23 * 60 - currentTime; // Minutes left until 23:00
    const requiredTime = 30; // Minimum 30 minutes per task

    console.log(
      `[TIMING] Day 1 - Current: ${currentHour}:${currentMinute.toString().padStart(2, '0')}, Target: ${targetHour}:00, Time left: ${timeLeftToday}min`
    );

    // If it's too late in the day or not enough time left, start tomorrow
    if (currentTime >= targetTime || timeLeftToday < requiredTime) {
      console.log(
        `[TIMING] Day 1 - Too late or not enough time, starting tomorrow`
      );
      startDecision = 'tomorrow';
      finalLocalTime = new Date(deviceNow);
      finalLocalTime.setDate(finalLocalTime.getDate() + 1);
      finalLocalTime.setHours(targetHour, 0, 0, 0);
    } else {
      // We have time today, but check if the target time has passed
      if (targetDate <= deviceNow) {
        console.log(
          `[TIMING] Day 1 - Target time has passed, finding next slot`
        );
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
          console.log(
            `[TIMING] Day 1 - Using next available slot: ${nextSlot.toISOString()}`
          );
          finalLocalTime = nextSlot;
        }
      } else {
        console.log(
          `[TIMING] Day 1 - Using target time: ${targetDate.toISOString()}`
        );
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
    console.log(
      `[TIMING] WARNING - Scheduled time is in the past! Moving to tomorrow.`
    );
    startDecision = 'tomorrow';
    finalLocalTime = new Date(deviceNow);
    finalLocalTime.setDate(finalLocalTime.getDate() + 1);
    finalLocalTime.setHours(targetHour, 0, 0, 0);
  }

  console.log(
    `[TIMING] Final result - Local: ${finalLocalTime.toISOString()}, Decision: ${startDecision}`
  );

  return {
    runAt: finalLocalTime.toISOString(),
    startDecision,
  };
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const response = await fetch(url, init);

      // Handle rate limiting and overloaded service
      if (response.status === 429 || response.status === 529) {
        if (i < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, i), 10000);
          console.log(
            `[AI] Rate limited/overloaded (${response.status}), retrying in ${delay}ms...`
          );
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
      if (
        response.status >= 400 &&
        response.status < 500 &&
        response.status !== 429 &&
        response.status !== 529
      ) {
        // Special handling for credit balance errors
        if (
          errorDetails.includes('credit balance') ||
          errorDetails.includes('too low')
        ) {
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

  const systemPrompt = `You are a plan outline generation expert. Generate a detailed transformation plan in valid JSON format ONLY.

CRITICAL INSTRUCTIONS:
- Return ONLY valid JSON, no markdown, no explanations, no extra text
- Focus on creating the JSON structure, not introductory text
- Generate comprehensive plan outline in 30-45 seconds maximum
- Each week must be separate and detailed
- Milestones must be comprehensive and specific
- Plan outline must be actionable and valuable
- Focus on practical, achievable steps
- Include specific outcomes and measurements
- Make each week distinct and progressive

REQUIRED JSON STRUCTURE:
{
  "category": "lifestyle|career|mindset|character|custom",
  "icon_name": "star",
  "milestones": [{"week": 1, "title": "Week 1: Foundation", "description": "Detailed week description with specific goals and outcomes", "tasks": 21}],
  "plan_outline": [
    {"title": "Week 1: Foundation Phase", "description": "Comprehensive description of week 1 activities, goals, and expected outcomes"},
    {"title": "Week 2: Development Phase", "description": "Comprehensive description of week 2 activities, goals, and expected outcomes"},
    {"title": "Week 3: Mastery Phase", "description": "Comprehensive description of week 3 activities, goals, and expected outcomes"},
    {"title": "Week 4: Advanced Phase", "description": "Comprehensive description of week 4 activities, goals, and expected outcomes"},
    {"title": "Week 5: Optimization Phase", "description": "Comprehensive description of week 5 activities, goals, and expected outcomes"},
    {"title": "Week 6: Refinement Phase", "description": "Comprehensive description of week 6 activities, goals, and expected outcomes"},
    {"title": "Week 7: Expansion Phase", "description": "Comprehensive description of week 7 activities, goals, and expected outcomes"},
    {"title": "Week 8: Consolidation Phase", "description": "Comprehensive description of week 8 activities, goals, and expected outcomes"},
    {"title": "Week 9: Innovation Phase", "description": "Comprehensive description of week 9 activities, goals, and expected outcomes"},
    {"title": "Week 10: Mastery Phase", "description": "Comprehensive description of week 10 activities, goals, and expected outcomes"},
    {"title": "Week 11: Excellence Phase", "description": "Comprehensive description of week 11 activities, goals, and expected outcomes"},
    {"title": "Week 12: Achievement Phase", "description": "Comprehensive description of week 12 activities, goals, and expected outcomes"}
  ],
  "deliverables": {
    "overview": {
      "chosen_topic": "Specific topic chosen for this goal",
      "rationale": "Why this approach is optimal for achieving the goal",
      "synopsis": "Complete summary of the transformation plan"
    },
    "sections": [
      {"title": "Section 1", "description": "Detailed section description"},
      {"title": "Section 2", "description": "Detailed section description"}
    ]
  }
}

CRITICAL: You MUST choose icon_name from this exact list (no other icons allowed):
user, user-circle, user-square, users, person-simple-run, person-simple-walk, person-simple-bike, fingerprint, hand-heart, heart, star, target, lightbulb, rocket, trophy, medal, crown, sparkle, compass, shield, key, lock, puzzle-piece, infinity, atom, flask, globe, test-tube, briefcase, laptop, building, bank, money, coins, credit-card, wallet, chart-line, chart-pie, storefront, handshake, book, book-open, graduation-cap, pencil, calculator, leaf, sun, moon, tree, flower, cloud, rainbow, drop, mountains, wave, fire, bicycle, music-notes, camera, brain, eye, eye-closed, bell, chat-circle, chat-text, paper-plane, calendar, clock, map-pin, globe-hemisphere-west, thumbs-up, thumbs-down, password

FOCUS ON:
- Creating comprehensive, actionable plan outline
- Ensuring each week has clear value and purpose
- Making weeks progressive and interconnected
- Providing detailed, specific descriptions
- Using professional, descriptive titles
- Maintaining consistent quality throughout`;

  const userPrompt = `Generate a comprehensive ${planDurationDays}-day transformation plan:

GOAL: ${title}
DESCRIPTION: ${description}
CATEGORY: ${category}
INTENSITY: ${intensity}
DURATION: ${planDurationDays} days (${Math.ceil(planDurationDays / 7)} weeks)

USER PREFERENCES:
- Device Timezone: ${deviceTimezone}
- Current Time: ${deviceNowIso}

CRITICAL REQUIREMENTS:
- Generate detailed plan in 30-45 seconds
- Create EXACTLY ${Math.ceil(planDurationDays / 7)} separate, distinct weeks (one for each week)
- Each week must have specific goals and outcomes
- Include practical, actionable steps
- Focus on measurable progress
- Make each week build upon the previous
- Provide comprehensive descriptions
- Include specific deliverables and outcomes
- Ensure high value and detailed information
- Return ONLY valid JSON format

IMPORTANT: You must create ${Math.ceil(planDurationDays / 7)} weeks total - one week for each week of the ${planDurationDays}-day plan.

FOCUS ON CREATING THE JSON STRUCTURE WITH COMPREHENSIVE PLAN OUTLINE BASED ON THE GOAL AND USER PREFERENCES.`;

  try {
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
          model: 'claude-opus-4-1-20250805',
          max_tokens: 16384,
          messages: [
            { role: 'user', content: `${systemPrompt}\n${userPrompt}` },
          ],
        }),
      }
    );

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();

    console.log(`[AI] Outline raw response: ${text.substring(0, 500)}...`);
    console.log(
      `[AI] Outline cleaned text: ${cleanedText.substring(0, 500)}...`
    );

    let planData;
    try {
      planData = JSON.parse(cleanedText);
      console.log(`[AI] Outline successfully parsed JSON`);
    } catch (parseError) {
      console.warn('[AI] Outline JSON parse failed, using fallback');
      console.error('[AI] Outline parse error:', parseError);
      console.error(
        '[AI] Failed to parse outline text:',
        cleanedText.substring(0, 1000)
      );

      // Return fallback data
      return {
        iconName: 'star',
        color: CATEGORY_COLOR_MAP[category] || 'yellow',
        milestones: buildTailoredMilestones(title, planDurationDays),
        planOutline: buildTailoredOutline(title, description),
        category,
        deliverables: {
          overview: { chosen_topic: '', rationale: '', synopsis: '' },
          sections: [],
        },
        usedModel: 'template-fallback',
      };
    }

    return {
      iconName: validateIcon(planData.icon_name),
      color: CATEGORY_COLOR_MAP[category] || 'yellow',
      milestones:
        planData.milestones || buildTailoredMilestones(title, planDurationDays),
      planOutline:
        planData.plan_outline || buildTailoredOutline(title, description),
      category,
      deliverables: planData.deliverables || {
        overview: { chosen_topic: '', rationale: '', synopsis: '' },
        sections: [],
      },
      usedModel: 'claude-opus-4-1-20250805',
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[AI] Outline API error: ${msg}`);

    // Check if it's a credit/balance error
    if (msg.includes('credit balance') || msg.includes('too low')) {
      console.warn('[AI] Credit balance too low, using template fallback');
    }

    // Return fallback data for any API error
    return {
      iconName: 'star',
      color: CATEGORY_COLOR_MAP[category] || 'yellow',
      milestones: buildTailoredMilestones(title, planDurationDays),
      planOutline: buildTailoredOutline(title, description),
      category,
      deliverables: {
        overview: { chosen_topic: '', rationale: '', synopsis: '' },
        sections: [],
      },
      usedModel: 'template-fallback',
    };
  }
}

// ============================================================================
// STAGE 2: TASK GENERATION (MOVED TO SEPARATE FUNCTION)
// ============================================================================
// Task generation has been moved to a separate function: generate-tasks
// This allows for better performance and timeout management

// ============================================================================
// TEMPLATE TASK GENERATION (MOVED TO SEPARATE FUNCTION)
// ============================================================================
// Template task generation has been moved to the generate-tasks function

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
    generation_latency_ms: Date.now() - startTime,
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

// ============================================================================
// TASK INSERTION (MOVED TO SEPARATE FUNCTION)
// ============================================================================
// Task insertion has been moved to the generate-tasks function

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
      return {
        success: false,
        remainingTokens: 0,
        message: 'Failed to fetch user token balance',
      };
    }

    if (!tokenData) {
      console.error(`[${requestId}] User tokens not found:`, user_id);
      return {
        success: false,
        remainingTokens: 0,
        message: 'User tokens not found',
      };
    }

    let currentTokens = tokenData.tokens_remaining || 0;
    const isSubscribed = tokenData.is_subscribed || false;
    const monthlyTokens = tokenData.monthly_tokens || 0;

    // If user is subscribed and has monthly tokens, add them to balance
    if (isSubscribed && monthlyTokens > 0) {
      console.log(
        `[${requestId}] Subscribed user detected, adding ${monthlyTokens} monthly tokens`
      );
      currentTokens += monthlyTokens;

      // Update the user's token balance with monthly tokens
      const { error: updateMonthlyError } = await supabase
        .from('user_tokens')
        .update({
          tokens_remaining: currentTokens,
          monthly_tokens: 0, // Reset monthly tokens after adding them
        })
        .eq('user_id', user_id);

      if (updateMonthlyError) {
        console.error(
          `[${requestId}] Error updating monthly tokens:`,
          updateMonthlyError
        );
      }
    }

    if (currentTokens < tokensRequired) {
      console.log(
        `[${requestId}] Insufficient tokens: ${currentTokens} < ${tokensRequired}`
      );
      return {
        success: false,
        remainingTokens: currentTokens,
        message: `Insufficient tokens. You have ${currentTokens} tokens but need ${tokensRequired}`,
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
        usage_count: (tokenData.usage_count || 0) + 1,
      })
      .eq('user_id', user_id);

    if (updateError) {
      console.error(`[${requestId}] Error updating tokens:`, updateError);
      return {
        success: false,
        remainingTokens: currentTokens,
        message: 'Failed to update token balance',
      };
    }

    console.log(
      `[${requestId}] Tokens deducted: ${tokensRequired}, remaining: ${newTokenBalance}`
    );
    return { success: true, remainingTokens: newTokenBalance };
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
      device_timezone,
    } = body;

    // This function now only handles stage 1 (outline generation)
    // Stage 2 (task generation) is handled by the separate generate-tasks function

    // Validate
    if (!user_id || !goal_id || !category || !title || !description) {
      return errorResponse(400, 'Missing required fields', requestId);
    }

    // Check and deduct tokens for outline generation
    const tokensRequired = 1; // 1 token for outline generation
    const tokenCheck = await checkAndDeductTokens(
      supabase,
      user_id,
      tokensRequired,
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

    console.log(
      `[${requestId}] Tokens deducted: ${tokensRequired}, remaining: ${tokenCheck.remainingTokens}`
    );

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

    console.log(`[${requestId}] Generating outline for: ${title}`);

    // Use goal's advanced settings if available, otherwise use request parameters
    const finalPlanDuration = goal.plan_duration_days || plan_duration_days;
    const finalTimeRanges = goal.preferred_time_ranges || preferred_time_ranges;
    const finalPreferredDays = goal.preferred_days || preferred_days;

    console.log(
      `[${requestId}] Using settings: duration=${finalPlanDuration}, timeRanges=${JSON.stringify(finalTimeRanges)}, preferredDays=${JSON.stringify(finalPreferredDays)}`
    );

    // STAGE 1: Generate and save outline
    const result = await generatePlanOutlineWithAI(
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
        device_timezone: device_timezone || 'UTC',
      })
      .eq('id', goal_id);

    // Send push notification for plan approval
    try {
      const pushResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/push-dispatcher`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user_id,
            title: 'Your Plan is Ready',
            body: `Your ${title} plan is ready for your review. Tap to approve and start your journey.`,
            data: {
              type: 'plan_ready_for_approval',
              goal_id: goal_id,
              stage: 'outline',
              screen: 'plan-approval',
            },
            sound: true,
            badge: 1,
          }),
        }
      );

      if (!pushResponse.ok) {
        const errorText = await pushResponse.text();
        console.error('❌ Push notification failed for outline:', errorText);
      } else {
        console.log('✅ Push notification sent successfully for outline');
      }
    } catch (pushError) {
      console.warn('Failed to send push notification:', pushError);
    }

    const totalTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        stage: 'outline',
        request_id: requestId,
        processing_time_ms: totalTime,
        tokens_used: tokensRequired,
        tokens_remaining: tokenCheck.remainingTokens,
        icon_name: result.iconName,
        color: result.color,
        category: result.category,
        milestones: result.milestones,
        plan_outline: result.planOutline,
        deliverables: result.deliverables,
        used_model: result.usedModel,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const totalTime = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : '';
    console.error(`[${requestId}] Error: ${message}`);
    console.error(`[${requestId}] Stack: ${stack}`);
    console.error(
      `[${requestId}] Error object:`,
      JSON.stringify(error, null, 2)
    );

    // This function only handles outline generation, so no cleanup needed

    return errorResponse(
      500,
      `${message}. Check function logs for details.`,
      requestId,
      totalTime
    );
  }
});
