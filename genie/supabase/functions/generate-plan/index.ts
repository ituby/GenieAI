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
  rewards?: any[]; // AI-generated rewards for each week
  planReadyNotification?: { title: string; body: string } | null; // AI-generated notification
  category: string;
  deliverables: any;
  usedModel: string;
  tokenUsage?: { input: number; output: number; total: number };
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Available icons list - matches iconMapping.ts from the app
const AVAILABLE_ICONS = [
  'user',
  'user-circle',
  'user-square',
  'users',
  'person-simple-run',
  'person-simple-walk',
  'person-simple-bike',
  'fingerprint',
  'hand-heart',
  'heart',
  'star',
  'target',
  'lightbulb',
  'rocket',
  'trophy',
  'medal',
  'crown',
  'sparkle',
  'compass',
  'shield',
  'key',
  'lock',
  'puzzle-piece',
  'infinity',
  'atom',
  'flask',
  'globe',
  'test-tube',
  'briefcase',
  'laptop',
  'building',
  'bank',
  'money',
  'coins',
  'credit-card',
  'wallet',
  'chart-line',
  'chart-pie',
  'storefront',
  'handshake',
  'book',
  'book-open',
  'graduation-cap',
  'pencil',
  'calculator',
  'leaf',
  'sun',
  'moon',
  'tree',
  'flower',
  'cloud',
  'rainbow',
  'drop',
  'mountains',
  'wave',
  'fire',
  'bicycle',
  'music-notes',
  'camera',
  'brain',
  'eye',
  'eye-closed',
  'bell',
  'chat-circle',
  'chat-text',
  'paper-plane',
  'calendar',
  'clock',
  'map-pin',
  'globe-hemisphere-west',
  'thumbs-up',
  'thumbs-down',
  'password',
  'hammer',
  'wrench',
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

function truncateDescription(
  description: string,
  maxWords: number = 30
): string {
  // Split by words
  const words = description.trim().split(/\s+/);

  // If already short enough, return as-is
  if (words.length <= maxWords) {
    return description.trim();
  }

  // Take only first N words
  const truncated = words.slice(0, maxWords).join(' ');

  // Add period if needed
  return truncated.endsWith('.') ||
    truncated.endsWith('!') ||
    truncated.endsWith('?')
    ? truncated
    : truncated + '.';
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
      description: `Establish core systems. Build momentum. Create strong foundations for success.`, // 11 words
    },
    {
      title: `Week 2 • ${shortTitle} - Development`,
      description: `Develop skills and deepen expertise. Practice and apply what you learned.`, // 12 words
    },
    {
      title: `Week 3 • ${shortTitle} - Mastery`,
      description: `Master your skills. Achieve your goals. Celebrate your transformation.`, // 10 words
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

  // Category-specific approach and principles
  const categoryGuidance: Record<string, string> = {
    learning: `LEARNING APPROACH:
✓ Curriculum Design - Structure knowledge progression logically
✓ Practice & Repetition - Build mastery through consistent practice
✓ Application Focus - Learn by doing, not just consuming
✓ Incremental Complexity - Start simple, gradually increase difficulty
✓ Knowledge Retention - Include review and reinforcement`,

    career: `CAREER DEVELOPMENT APPROACH:
✓ Skills & Impact - Focus on valuable, demonstrable competencies
✓ Network Building - Create meaningful professional connections
✓ Visible Progress - Build portfolio/evidence of growth
✓ Strategic Positioning - Align actions with career goals
✓ Continuous Learning - Stay current and relevant`,

    fitness: `FITNESS TRANSFORMATION APPROACH:
✓ Progressive Overload - Gradually increase challenge and intensity
✓ Recovery & Balance - Include rest for sustainable progress
✓ Form & Technique - Master basics before advancing
✓ Consistency Over Intensity - Regular practice beats sporadic effort
✓ Body Awareness - Listen and adapt to physical feedback`,

    health: `HEALTH OPTIMIZATION APPROACH:
✓ Sustainable Habits - Build practices you can maintain long-term
✓ Holistic View - Address physical, mental, and emotional health
✓ Gradual Change - Small, consistent improvements compound
✓ Listen to Body - Adapt based on how you feel
✓ Prevention Focus - Build resilience and vitality`,

    lifestyle: `LIFESTYLE TRANSFORMATION APPROACH:
✓ Habit Stacking - Build new routines on existing ones
✓ Environment Design - Set up surroundings for success
✓ Balance & Integration - Fit improvements into real life
✓ Enjoyment Factor - Make changes sustainable and pleasant
✓ Identity Shift - Become the person who lives this way`,

    mindset: `MINDSET TRANSFORMATION APPROACH:
✓ Awareness First - Notice current patterns and beliefs
✓ Gradual Rewiring - Replace limiting beliefs progressively
✓ Practice & Embodiment - Turn concepts into lived experience
✓ Self-Compassion - Change with kindness, not criticism
✓ Evidence Building - Collect proof of new possibilities`,

    character: `CHARACTER DEVELOPMENT APPROACH:
✓ Value Clarity - Define what matters most to you
✓ Daily Practice - Character is built through consistent actions
✓ Challenge & Growth - Step into discomfort intentionally
✓ Self-Reflection - Regular examination of choices and impact
✓ Accountability - Hold yourself to your standards`,

    finance: `FINANCIAL GROWTH APPROACH:
✓ Knowledge Foundation - Understand money principles clearly
✓ Systems & Automation - Build structures that work passively
✓ Incremental Progress - Small wins create momentum
✓ Long-term Perspective - Balance present and future needs
✓ Behavior Change - Transform relationship with money`,

    social: `SOCIAL DEVELOPMENT APPROACH:
✓ Authentic Connection - Build genuine, meaningful relationships
✓ Communication Skills - Learn to express and listen effectively
✓ Consistent Presence - Show up regularly for people
✓ Vulnerability & Trust - Deepen bonds through openness
✓ Give & Receive - Balance supporting others and receiving support`,

    creativity: `CREATIVE DEVELOPMENT APPROACH:
✓ Regular Practice - Creativity grows through consistent creation
✓ Experimentation - Try new approaches without judgment
✓ Inspiration Gathering - Feed your creative mind constantly
✓ Ship & Share - Create outputs, not just ideas
✓ Process Over Perfection - Focus on creating, not critiquing`,

    goal: `GOAL ACHIEVEMENT APPROACH:
✓ Clear Milestones - Break big goal into concrete checkpoints
✓ Momentum Building - Create early wins for motivation
✓ Obstacle Planning - Anticipate and prepare for challenges
✓ Measurement - Track progress objectively
✓ Celebration - Acknowledge progress along the way`,

    custom: `TRANSFORMATION APPROACH:
✓ Personalized Path - Design specifically for this unique goal
✓ Adaptive Structure - Build flexibility into the plan
✓ Clear Progress - Define what success looks like at each stage
✓ Sustainable Pace - Balance ambition with sustainability
✓ Meaningful Impact - Focus on what truly matters`,
  };

  const categoryApproach =
    categoryGuidance[category] || categoryGuidance['custom'];

  const systemPrompt = `You are an expert goal transformation architect specialized in ${category} goals. Your mission is to create comprehensive, week-by-week roadmaps that guide real people to achieve their goals.

🌍 LANGUAGE INSTRUCTION - ABSOLUTELY CRITICAL:

🚨 LANGUAGE DETECTION (READ THIS FIRST!):
LOOK at the goal title and description that will be provided below in the user message.
- If they contain HEBREW characters (א-ת) → Write EVERYTHING in Hebrew ONLY
- If they contain ENGLISH alphabet (a-z, A-Z) and NO Hebrew → Write EVERYTHING in English ONLY
- If they contain SPANISH text → Write EVERYTHING in Spanish ONLY

DO NOT GUESS! LOOK AT THE ACTUAL CHARACTERS IN THE GOAL TITLE/DESCRIPTION!
IF YOU SEE: "Learn piano" → ENGLISH
IF YOU SEE: "ללמוד פסנתר" → HEBREW
IF YOU SEE: "Aprender piano" → SPANISH

TONE & STYLE (for all languages):
- Professional yet warm - like an expert mentor
- Clear, informative, actionable
- Contemporary vocabulary with subtle contemporary expressions
- Encouraging but not overly casual

ENGLISH EXAMPLES (translate perfectly to target language):
- "Let's focus on building fundamentals"
- "Time to advance your skills"
- "Smart step forward in your journey"
- "Establish your foundation"
- "Develop key capabilities"

TRANSLATION REQUIREMENTS:
- If writing in Hebrew: Use modern, natural Hebrew WITHOUT nikud (vowel marks), NO English words
- If writing in Spanish: Use modern, natural Spanish
- If writing in other languages: Use natural, contemporary vocabulary
- TRANSLATE the examples above perfectly into the target language
- Maintain the same professional yet warm tone

Match the user's language EXACTLY for all plan_outline titles, descriptions, milestones, notifications, and deliverables.

${categoryApproach}

UNIVERSAL PRINCIPLES:
✓ Human-Centered - Design for real people with limited time and energy
✓ Progressive Structure - Each week builds naturally on the previous
✓ Specific & Actionable - Clear, concrete outcomes for each week
✓ Motivating Journey - Create a compelling transformation narrative
✓ Practical Focus - Realistic, achievable milestones

WEEK DESIGN PRINCIPLES:
- Week 1: Start with essential basics specific to the goal
- Middle Weeks: Progressive skill/habit building with increasing challenge
- Final Week: Integration and completion specific to the goal
- IMPORTANT: Use goal-specific language in titles, NOT generic terms like "Foundation" or "Development"

EACH WEEK MUST INCLUDE:
1. Clear Theme - What this week is about
2. Specific Goals - Measurable outcomes expected
3. Key Activities - What the person will actually do
4. Progress Markers - How they'll know they're succeeding

WEEK DESCRIPTION LENGTH - STRICT LIMIT:
- Each week description: MAXIMUM 30 WORDS
- Count every single word - absolutely no more than 30
- Short, punchy, focused sentences
- Every word must add value
- Remove all fluff and redundancy

CRITICAL INSTRUCTIONS:
- Return ONLY valid JSON, no markdown, no explanations, no extra text
- Generate comprehensive plan outline in 30-45 seconds maximum
- Each week must be separate, detailed, and distinct
- Milestones must be comprehensive and specific
- Focus on practical, achievable steps
- Include specific outcomes and measurements
- Make each week's progression feel natural and motivating
- Apply ${category}-specific expertise to the plan structure

REQUIRED JSON STRUCTURE:
{
  "category": "lifestyle|career|mindset|character|custom",
  "icon_name": "star",
  "milestones": [{"week": 1, "title": "Week 1: Foundation", "description": "Detailed week description with specific goals and outcomes", "tasks": 21}],
  "plan_outline": [
    {"title": "Week 1: [Specific action related to the goal]", "description": "30 words max describing week 1 focus."},
    {"title": "Week 2: [Specific action related to the goal]", "description": "30 words max describing week 2 focus."},
    {"title": "Week 3: [Specific action related to the goal]", "description": "30 words max describing week 3 focus."}
  ],
  "rewards": [
    {
      "week": 1,
      "title": "Motivating reward title (2-4 words)",
      "description": "Achievement description - what they accomplished this week (1-2 sentences)",
      "points": 35
    }
  ],
  "plan_ready_notification": {
    "title": "Short Genie-style title (3-5 words, in same language as goal, NO emojis)",
    "body": "Friendly Genie message about plan being ready (10-15 words, same language, NO emojis)"
  },
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

🏆 CRITICAL - REWARDS GENERATION (MANDATORY):
You MUST create a "rewards" array in your JSON response!
- Create EXACTLY ONE reward for EACH week in the plan_outline
- If you have 3 weeks → create 3 rewards
- If you have 6 weeks → create 6 rewards
- Number of rewards MUST EQUAL number of weeks

REWARD STRUCTURE:
- week: The week number (1, 2, 3, etc.)
- title: Celebratory achievement title (2-5 words, in same language as goal)
- description: What they accomplished (1-2 sentences, celebrate progress, in same language)
- points: Progressive points using this formula:
  * Week 1: 10 + (190 / totalWeeks) × 1 = lower points (around 10-75)
  * Week N: 10 + (190 / totalWeeks) × N = middle points (around 50-150)
  * Final week: 10 + (190 / totalWeeks) × totalWeeks = 200 points
  * Always round to nearest 5

EXAMPLE for 3-week plan:
- Week 1 reward: {"week": 1, "title": "Foundation Complete", "description": "Great start! You built strong foundations.", "points": 75}
- Week 2 reward: {"week": 2, "title": "Skills Growing", "description": "Amazing! Your skills are developing fast.", "points": 135}
- Week 3 reward: {"week": 3, "title": "Goal Achieved", "description": "Incredible! You completed the journey!", "points": 200}

EXAMPLE for "Learn Spanish" (3 weeks):
{
  "plan_outline": [
    {"title": "Week 1: Master Basic Pronunciation & Greetings", "description": "Learn Spanish alphabet sounds. Practice common greetings daily. Build confidence with basic phrases."},
    {"title": "Week 2: Essential Vocabulary & Present Tense", "description": "Learn 200 most common words. Practice present tense conjugation. Hold simple conversations."},
    {"title": "Week 3: Conversations & Real-World Practice", "description": "Practice ordering food and asking directions. Engage with native speakers. Build fluency and confidence."}
  ],
  "rewards": [
    {"week": 1, "title": "First Steps Mastered", "description": "You've built your Spanish foundation! You can now greet people and understand basic pronunciation.", "points": 75},
    {"week": 2, "title": "Vocabulary Builder", "description": "Amazing progress! You've learned essential vocabulary and can form basic sentences in present tense.", "points": 135},
    {"week": 3, "title": "Conversation Champion", "description": "Incredible achievement! You can now hold real conversations and communicate confidently in Spanish.", "points": 200}
  ]
}

CRITICAL: You MUST choose icon_name from this exact list (no other icons allowed):
user, user-circle, user-square, users, person-simple-run, person-simple-walk, person-simple-bike, fingerprint, hand-heart, heart, star, target, lightbulb, rocket, trophy, medal, crown, sparkle, compass, shield, key, lock, puzzle-piece, infinity, atom, flask, globe, test-tube, briefcase, laptop, building, bank, money, coins, credit-card, wallet, chart-line, chart-pie, storefront, handshake, book, book-open, graduation-cap, pencil, calculator, leaf, sun, moon, tree, flower, cloud, rainbow, drop, mountains, wave, fire, bicycle, music-notes, camera, brain, eye, eye-closed, bell, chat-circle, chat-text, paper-plane, calendar, clock, map-pin, globe-hemisphere-west, thumbs-up, thumbs-down, password, hammer, wrench

FOCUS ON:
- Creating comprehensive, actionable plan outline
- Ensuring each week has clear value and purpose
- Making weeks progressive and interconnected
- Keeping descriptions MAXIMUM 30 WORDS per week (strict limit!)
- Using SPECIFIC titles related to the goal (NOT generic "Foundation/Development/Mastery")
- Make each week title unique and action-oriented
- 🏆 CREATING THE REWARDS ARRAY - This is MANDATORY! Don't forget it!
- Maintaining consistent quality throughout
- Being ultra-concise - every word counts

CRITICAL - WEEK TITLES:
✗ BAD: "Week 1: Foundation Phase", "Week 2: Development Phase"
✓ GOOD: "Week 1: Master Basic Pronunciation", "Week 2: Build Core Vocabulary"`;

  const totalWeeks = Math.ceil(planDurationDays / 7);

  const userPrompt = `Create a transformative ${planDurationDays}-day roadmap (${totalWeeks} weeks) for this goal:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 GOAL INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Title: ${title}
Description: ${description}
Category: ${category}
Intensity Level: ${intensity}

🚨🚨🚨 LANGUAGE INSTRUCTION - READ FIRST! 🚨🚨🚨
LOOK at the Title and Description above.
What language are they written in? Hebrew? English? Spanish?
Write your ENTIRE response in that EXACT SAME LANGUAGE!
DO NOT write in a different language than the goal!

🌍 USER CONTEXT
Timezone: ${deviceTimezone}
Starting: ${new Date(deviceNowIso).toLocaleString('en-US', { timeZone: deviceTimezone })}
Duration: ${planDurationDays} days (${totalWeeks} weeks)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 YOUR MISSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Create a detailed week-by-week outline that will guide this person from where they are today to achieving their goal.

CRITICAL REQUIREMENTS:
✓ Create EXACTLY ${totalWeeks} distinct weeks
✓ Each week needs:
  - Clear weekly theme/focus
  - Specific learning objectives
  - Key activities and practices
  - Expected outcomes and progress markers
  
✓ Description Length - STRICT WORD LIMIT:
  - Each week description: MAXIMUM 30 WORDS (count them!)
  - Write ultra-short, punchy sentences
  - One key idea per sentence
  - Absolutely no fluff or redundancy
  - 30 words maximum - this is critical!

✓ Week Titles - BE SPECIFIC TO THE GOAL:
  - DO NOT use generic words like "Foundation", "Development", "Mastery"
  - USE specific actions related to "${title}"
  - Each title should describe WHAT the person will actually do/learn that week
  - Make titles concrete and goal-specific
  
✓ Progressive Structure:
  - Week 1: Start with basics and early actions for "${title}"
  ${totalWeeks > 1 ? `- Weeks 2-${Math.max(2, totalWeeks - 1)}: Build skills progressively for "${title}"` : ''}
  ${totalWeeks > 1 ? `- Week ${totalWeeks}: Complete and integrate for "${title}"` : ''}

✓ Ensure ${intensity} intensity level (${intensity === 'easy' ? 'gentle pace, achievable steps' : intensity === 'medium' ? 'moderate challenge, steady progress' : 'ambitious pace, intensive focus'})
✓ Each week must feel valuable and distinct
✓ Create a compelling transformation journey

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Return ONLY valid JSON. No markdown, no explanations.

YOU MUST CREATE ${totalWeeks} WEEKS IN THE plan_outline ARRAY.
OUTPUT JSON ONLY:`;

  try {
    console.log('[AI] Sending outline generation request to Claude...');
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
            { role: 'user', content: `${systemPrompt}\n${userPrompt}` },
          ],
        }),
      }
    );

    console.log(`[AI] Received response, status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI] Claude API error response:', errorText);
      throw new Error(`Claude API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`[AI] Response parsed, has content: ${!!data.content}`);

    // Extract token usage
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
        `[AI] Token usage - Input: ${tokenUsage.input}, Output: ${tokenUsage.output}, Total: ${tokenUsage.total}`
      );
    }

    const text = data.content?.[0]?.text || '';

    if (!text) {
      console.error(
        '[AI] Empty response from Claude:',
        JSON.stringify(data).substring(0, 500)
      );
      throw new Error('Empty response from Claude API');
    }

    console.log(`[AI] Outline response: ${text.length} characters`);
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

      // Return fallback data with truncated descriptions
      const fallbackOutline = buildTailoredOutline(title, description).map(
        (week: any) => ({
          ...week,
          description: truncateDescription(week.description || '', 30),
        })
      );

      return {
        iconName: 'star',
        color: CATEGORY_COLOR_MAP[category] || 'yellow',
        milestones: buildTailoredMilestones(title, planDurationDays),
        planOutline: fallbackOutline,
        rewards: [], // Will be created in savePlanOutline with fallback logic
        category,
        deliverables: {
          overview: { chosen_topic: '', rationale: '', synopsis: '' },
          sections: [],
        },
        usedModel: 'template-fallback',
      };
    }

    // Truncate long descriptions to max 30 words
    const truncatedPlanOutline = (
      planData.plan_outline || buildTailoredOutline(title, description)
    ).map((week: any) => ({
      ...week,
      description: truncateDescription(week.description || '', 30),
    }));

    return {
      iconName: validateIcon(planData.icon_name),
      color: CATEGORY_COLOR_MAP[category] || 'yellow',
      milestones:
        planData.milestones || buildTailoredMilestones(title, planDurationDays),
      planOutline: truncatedPlanOutline,
      rewards: planData.rewards || [], // AI-generated rewards
      planReadyNotification: planData.plan_ready_notification || null, // AI-generated notification
      category,
      deliverables: planData.deliverables || {
        overview: { chosen_topic: '', rationale: '', synopsis: '' },
        sections: [],
      },
      usedModel: 'claude-haiku-4-5-20251001',
      tokenUsage: tokenUsage || undefined,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[AI] Outline API error: ${msg}`);

    // Check if it's a credit/balance error
    if (msg.includes('credit balance') || msg.includes('too low')) {
      console.warn('[AI] Credit balance too low, using template fallback');
    }

    // Return fallback data for any API error with truncated descriptions
    const errorFallbackOutline = buildTailoredOutline(title, description).map(
      (week: any) => ({
        ...week,
        description: truncateDescription(week.description || '', 30),
      })
    );

    return {
      iconName: 'star',
      color: CATEGORY_COLOR_MAP[category] || 'yellow',
      milestones: buildTailoredMilestones(title, planDurationDays),
      planOutline: errorFallbackOutline,
      rewards: [], // Will be created in savePlanOutline with fallback logic
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
  userId: string,
  result: AIResult,
  startTime: number
): Promise<void> {
  const latency = Date.now() - startTime;
  const tokenUsage = result.tokenUsage;

  const planOutlineData: Record<string, any> = {
    goal_id: goalId,
    milestones: result.milestones,
    deliverables: result.deliverables,
    ai_model_used: result.usedModel,
    generation_latency_ms: latency,
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

  // Create rewards from AI-generated data or fallback
  const aiRewards = result.rewards || [];
  const totalWeeks = result.planOutline.length;
  
  console.log(`[REWARDS] AI returned ${aiRewards.length} rewards, expected ${totalWeeks}`);
  
  const rewardsToCreate = [];
  
  for (let index = 0; index < totalWeeks; index++) {
    const weekNumber = index + 1;
    const aiReward = aiRewards.find((r: any) => r.week === weekNumber);
    
    // Calculate day_offset: end of the week (0-indexed)
    const daysInWeek = 7;
    const dayOffset = (weekNumber * daysInWeek) - 1;
    
    if (aiReward) {
      // Use AI-generated reward
      rewardsToCreate.push({
        goal_id: goalId,
        type: 'milestone',
        title: aiReward.title,
        description: aiReward.description,
        day_offset: dayOffset,
        unlocked: false,
        points_value: aiReward.points,
      });
    } else {
      // Fallback: create reward from outline data
      console.warn(`[REWARDS] Missing AI reward for week ${weekNumber}, using fallback`);
      
      const minPoints = 10;
      const maxPoints = 200;
      const progressRatio = totalWeeks > 1 ? weekNumber / totalWeeks : 1;
      const basePoints = minPoints + ((maxPoints - minPoints) * progressRatio);
      const points = Math.round(basePoints / 5) * 5;
      
      const week = result.planOutline[index];
      rewardsToCreate.push({
        goal_id: goalId,
        type: 'milestone',
        title: week.title || `שבוע ${weekNumber}`,
        description: week.description || 'השלמת שבוע נוסף בתוכנית',
        day_offset: dayOffset,
        unlocked: false,
        points_value: points,
      });
    }
  }

  console.log(`[REWARDS] Creating ${rewardsToCreate.length} rewards with points: ${rewardsToCreate.map(r => r.points_value).join(', ')}`);

  // Insert rewards
  const { error: rewardsError } = await supabase
    .from('rewards')
    .insert(rewardsToCreate);

  if (rewardsError) {
    console.error('⚠️ Failed to create rewards (non-critical):', rewardsError);
  } else {
    console.log(`✅ Created ${rewardsToCreate.length} milestone rewards (10-200 points range)`);
  }

  // Save to ai_runs for tracking (never delete - for documentation!)
  const inputTokens = tokenUsage?.input || 0;
  const outputTokens = tokenUsage?.output || 0;

  // Calculate cost using SQL function
  const { data: costData } = await supabase.rpc('calculate_ai_cost', {
    model_name: result.usedModel,
    input_tokens_count: inputTokens,
    output_tokens_count: outputTokens,
  });

  const estimatedCost = costData || 0;
  console.log(`💰 Estimated cost: $${estimatedCost.toFixed(6)}`);

  const aiRunData = {
    goal_id: goalId,
    stage: 'outline',
    status: 'success',
    provider_model: result.usedModel,
    latency_ms: latency,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: tokenUsage?.total || 0,
    total_weeks: result.planOutline.length,
    cost_usd: estimatedCost,
    metadata: {
      milestones_count: result.milestones.length,
      deliverables_sections: result.deliverables?.sections?.length || 0,
    },
    completed_at: new Date().toISOString(),
  };

  const { error: aiRunError } = await supabase
    .from('ai_runs')
    .insert(aiRunData);

  if (aiRunError) {
    console.error('⚠️ Failed to save ai_run (non-critical):', aiRunError);
  } else {
    console.log(
      `✅ Saved ai_run for outline generation (cost: $${estimatedCost.toFixed(6)})`
    );
  }
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
      tasks_per_day_min,
      tasks_per_day_max,
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

    // Verify goal and get plan duration FIRST
    const { data: goal, error: goalPreCheckError } = await supabase
      .from('goals')
      .select('plan_duration_days')
      .eq('id', goal_id)
      .eq('user_id', user_id)
      .single();

    if (goalPreCheckError || !goal) {
      return errorResponse(404, 'Goal not found', requestId);
    }

    // Calculate tokens needed: 3 tokens per milestone
    const totalWeeks = Math.ceil((goal.plan_duration_days || 21) / 7);
    const tokensNeeded = totalWeeks * 3;
    
    console.log(`📊 Plan will have ${totalWeeks} milestones, requiring ${tokensNeeded} tokens (3 per milestone)`);

    // Check if user has enough tokens
    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('tokens_remaining, tokens_used')
      .eq('user_id', user_id)
      .single();

    if (!tokenData || tokenData.tokens_remaining < tokensNeeded) {
      const currentTokens = tokenData?.tokens_remaining || 0;
      const tokensToLoad = Math.max(100, tokensNeeded - currentTokens);
      
      console.log(`[${requestId}] Insufficient tokens: has ${currentTokens}, needs ${tokensNeeded}`);
      
      return errorResponse(
        402,
        `Not enough tokens to continue with Genie. You have ${currentTokens} tokens but need ${tokensNeeded}. Please load at least ${tokensToLoad} tokens to continue.`,
        requestId,
        Date.now() - startTime
      );
    }
    
    console.log(`[${requestId}] User has ${tokenData.tokens_remaining} tokens - sufficient for ${totalWeeks} milestones`);

    if (!VALID_CATEGORIES.includes(category)) {
      return errorResponse(400, `Invalid category: ${category}`, requestId);
    }

    if (!VALID_INTENSITIES.includes(intensity)) {
      return errorResponse(400, `Invalid intensity: ${intensity}`, requestId);
    }

    // Get advanced settings from goal and user preferences
    const { data: goalDetails, error: goalError } = await supabase
      .from('goals')
      .select('id, plan_duration_days, preferred_time_ranges, preferred_days, tasks_per_day_min, tasks_per_day_max')
      .eq('id', goal_id)
      .eq('user_id', user_id)
      .single();

    if (goalError || !goalDetails) {
      return errorResponse(404, 'Goal not found', requestId);
    }

    // Get user preferences as fallback (includes timezone synced from users table)
    const { data: userPrefs } = await supabase
      .from('user_preferences')
      .select('plan_duration_days, preferred_time_ranges, preferred_days, tasks_per_day_min, tasks_per_day_max, timezone')
      .eq('user_id', user_id)
      .single();

    console.log(`[${requestId}] Generating outline for: ${title}`);
    console.log(`[${requestId}] User preferences:`, userPrefs);
    console.log(`[${requestId}] User timezone from preferences:`, userPrefs?.timezone);

    // Priority: request params > goal settings > user preferences > defaults
    const finalPlanDuration = 
      plan_duration_days || 
      goalDetails.plan_duration_days || 
      userPrefs?.plan_duration_days || 
      21;
    
    const finalTimeRanges = 
      preferred_time_ranges || 
      goalDetails.preferred_time_ranges || 
      userPrefs?.preferred_time_ranges || 
      [
        { start_hour: 8, end_hour: 12, label: 'Morning' },
        { start_hour: 14, end_hour: 18, label: 'Afternoon' },
        { start_hour: 19, end_hour: 23, label: 'Evening' },
      ];
    
    const finalPreferredDays = 
      preferred_days || 
      goalDetails.preferred_days || 
      userPrefs?.preferred_days || 
      [1, 2, 3, 4, 5, 6];
    
    const finalTasksPerDayMin = 
      tasks_per_day_min || 
      goalDetails.tasks_per_day_min || 
      userPrefs?.tasks_per_day_min || 
      3;
    
    const finalTasksPerDayMax = 
      tasks_per_day_max || 
      goalDetails.tasks_per_day_max || 
      userPrefs?.tasks_per_day_max || 
      5;

    // Priority for timezone: device_timezone > user preferences > UTC
    const finalTimezone = device_timezone || userPrefs?.timezone || 'UTC';
    
    console.log(
      `[${requestId}] Using settings: duration=${finalPlanDuration}, timeRanges=${JSON.stringify(finalTimeRanges)}, preferredDays=${JSON.stringify(finalPreferredDays)}, tasksPerDay=${finalTasksPerDayMin}-${finalTasksPerDayMax}, timezone=${finalTimezone}`
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
      finalTimezone
    );

    await savePlanOutline(supabase, goal_id, user_id, result, startTime);

    // Update goal metadata
    await supabase
      .from('goals')
      .update({
        icon_name: result.iconName,
        color: result.color,
        category: result.category,
        device_timezone: finalTimezone,
      })
      .eq('id', goal_id);

    // Send push notification for plan approval
    // Use AI-generated notification if available, otherwise fallback
    const isHebrew = /[\u0590-\u05FF]/.test(title || '');
    
    let approvalMessage;
    if (result.planReadyNotification?.title && result.planReadyNotification?.body) {
      // Use AI-generated notification
      approvalMessage = result.planReadyNotification;
      console.log('✅ Using AI-generated plan ready notification');
    } else {
      // Fallback messages (no emojis, Genie style)
      const hebrewMessages = [
        { title: 'התוכנית מוכנה', body: `חבר, ${title} - הכנתי לך תוכנית מושלמת! בוא תבדוק` },
        { title: 'הג׳יני הכין משהו מיוחד', body: `${title} - כל פרט מתוכנן בשבילך. בוא נתחיל` },
        { title: 'הקסם מתחיל', body: `${title} - התוכנית שלך מחכה לך!` },
      ];
      
      const englishMessages = [
        { title: 'Your plan is ready', body: `Friend, ${title} - I crafted the perfect plan for you!` },
        { title: 'Something special awaits', body: `${title} - Every detail planned just for you. Let\'s begin` },
        { title: 'The magic begins', body: `${title} - Your personalized plan awaits!` },
      ];
      
      const messages = isHebrew ? hebrewMessages : englishMessages;
      approvalMessage = messages[Math.floor(Math.random() * messages.length)];
      console.log('⚠️ Using fallback plan ready notification');
    }
    
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
            title: approvalMessage.title,
            body: approvalMessage.body,
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

    // Deduct tokens: 3 tokens per milestone
    const milestonesCount = result.milestones?.length || 0;
    const tokensToDeduct = milestonesCount * 3;
    
    console.log(`💳 Deducting ${tokensToDeduct} tokens (${milestonesCount} milestones × 3 tokens)`);
    
    await supabase
      .from('user_tokens')
      .update({
        tokens_remaining: tokenData.tokens_remaining - tokensToDeduct,
        tokens_used: (tokenData.tokens_used || 0) + tokensToDeduct,
        last_used_at: new Date().toISOString(),
      })
      .eq('user_id', user_id);

    const totalTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        stage: 'outline',
        request_id: requestId,
        processing_time_ms: totalTime,
        tokens_used: tokensToDeduct,
        tokens_remaining: tokenData.tokens_remaining - tokensToDeduct,
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
