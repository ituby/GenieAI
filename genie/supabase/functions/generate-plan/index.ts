import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface GeneratePlanRequest {
  user_id: string;
  goal_id: string;
  category: string;
  title: string;
  description: string;
  intensity?: 'easy' | 'medium' | 'hard';
  timezone: string;
  start_date?: string;
  language?: string;
  detailed_plan?: boolean;
}

interface TaskTemplate {
  title: string;
  description: string;
  day_offset: number;
  time_of_day: 'morning' | 'mid_morning' | 'afternoon' | 'evening';
}

interface RewardTemplate {
  type: 'daily' | 'milestone' | 'completion';
  title: string;
  description: string;
  day_offset?: number;
}

// Generate rewards for the goal
const getSpecificGuidelines = (
  category: string,
  title: string,
  description: string
): string => {
  const titleLower = title.toLowerCase();
  const descLower = description.toLowerCase();

  // Language learning goals
  if (
    titleLower.includes('learn') &&
    (titleLower.includes('language') ||
      titleLower.includes('spanish') ||
      titleLower.includes('french') ||
      titleLower.includes('english'))
  ) {
    return `
      LANGUAGE LEARNING GUIDELINES:
      - Day 1-3: Set up learning tools (apps, books, resources)
      - Day 4-7: Master basic vocabulary and pronunciation
      - Day 8-14: Practice conversations and grammar
      - Day 15-21: Advanced usage and real-world application
      - Include specific apps, websites, or resources
      - Focus on practical communication skills
      - Include speaking, listening, reading, writing practice`;
  }

  // Fitness goals
  if (
    titleLower.includes('fitness') ||
    titleLower.includes('exercise') ||
    titleLower.includes('workout') ||
    titleLower.includes('gym')
  ) {
    return `
      FITNESS GUIDELINES:
      - Day 1-3: Assess current fitness level and create workout plan
      - Day 4-7: Establish consistent workout routine
      - Day 8-14: Increase intensity and add variety
      - Day 15-21: Advanced training and goal achievement
      - Include specific exercises, sets, reps, duration
      - Focus on progressive overload and proper form
      - Include nutrition and recovery planning`;
  }

  // Career goals
  if (
    titleLower.includes('career') ||
    titleLower.includes('job') ||
    titleLower.includes('promotion') ||
    titleLower.includes('skill')
  ) {
    return `
      CAREER GUIDELINES:
      - Day 1-3: Assess current skills and identify gaps
      - Day 4-7: Develop specific skills and knowledge
      - Day 8-14: Build portfolio and network
      - Day 15-21: Apply skills and advance career
      - Include specific courses, certifications, or projects
      - Focus on measurable professional outcomes
      - Include networking and industry engagement`;
  }

  // Business goals
  if (
    titleLower.includes('business') ||
    titleLower.includes('startup') ||
    titleLower.includes('entrepreneur')
  ) {
    return `
      BUSINESS GUIDELINES:
      - Day 1-3: Market research and business plan development
      - Day 4-7: Legal setup and initial operations
      - Day 8-14: Product/service development and testing
      - Day 15-21: Launch and marketing execution
      - Include specific business tools and platforms
      - Focus on revenue generation and customer acquisition
      - Include financial planning and operations`;
  }

  // Health goals
  if (
    titleLower.includes('health') ||
    titleLower.includes('diet') ||
    titleLower.includes('weight') ||
    titleLower.includes('nutrition')
  ) {
    return `
      HEALTH GUIDELINES:
      - Day 1-3: Assess current health status and set targets
      - Day 4-7: Implement nutrition and exercise changes
      - Day 8-14: Establish healthy habits and routines
      - Day 15-21: Optimize and maintain progress
      - Include specific foods, meal plans, or exercises
      - Focus on measurable health improvements
      - Include tracking and monitoring systems`;
  }

  // Default guidelines
  return `
    GENERAL GUIDELINES:
    - Analyze the specific goal requirements and break into actionable steps
    - Include specific tools, resources, or methods needed
    - Focus on measurable progress and concrete outcomes
    - Build from basic to advanced implementation
    - Address potential obstacles and solutions`;
};

const generateRewards = async (
  goalId: string,
  supabase: any,
  category: string,
  title: string,
  tasks: any[],
  intensity: 'easy' | 'medium' | 'hard' = 'easy'
): Promise<any[]> => {
  // Generate personalized rewards based on tasks
  const getPersonalizedRewards = (
    category: string,
    goalTitle: string,
    tasks: any[]
  ): RewardTemplate[] => {
    const rewards: RewardTemplate[] = [];

    // Daily consistency reward (adjusted for intensity)
    const dailyTaskCount =
      intensity === 'easy' ? 3 : intensity === 'medium' ? 6 : 10;
    rewards.push({
      type: 'daily',
      title: 'Daily Champion',
      description: `Complete ${dailyTaskCount} daily "${goalTitle}" tasks to unlock this achievement! Consistency is the key to success.`,
    });

    // Task-specific rewards (every 5 tasks)
    const taskMilestones = [5, 10, 15, 20];
    taskMilestones.forEach((milestone, index) => {
      if (milestone <= tasks.length) {
        rewards.push({
          type: 'milestone',
          title: `${milestone} Tasks Complete!`,
          description: `Incredible! You've completed ${milestone} tasks for "${goalTitle}". You're making real progress!`,
          day_offset: milestone - 1,
        });
      }
    });

    // Weekly consistency rewards
    rewards.push({
      type: 'milestone',
      title: 'Week 1 Consistency',
      description: `Amazing! You've been consistent with "${goalTitle}" for a full week. Your habits are taking root!`,
      day_offset: 6,
    });

    rewards.push({
      type: 'milestone',
      title: 'Week 2 Momentum',
      description: `Outstanding! Two weeks of consistent progress with "${goalTitle}". You're building unstoppable momentum!`,
      day_offset: 13,
    });

    rewards.push({
      type: 'milestone',
      title: 'Week 3 Mastery',
      description: `Incredible! Three weeks of dedication to "${goalTitle}". You've mastered the art of consistency!`,
      day_offset: 20,
    });

    // Points-based rewards (adjusted for intensity)
    const pointsMilestones =
      intensity === 'easy'
        ? [50, 100, 200]
        : intensity === 'medium'
          ? [100, 200, 400]
          : [200, 400, 800];

    pointsMilestones.forEach((points, index) => {
      const titles = ['Master', 'Champion', 'Legend'];
      rewards.push({
        type: 'milestone',
        title: `${points} Points ${titles[index]}`,
        description: `Congratulations! You've earned ${points} points for "${goalTitle}". Your dedication is paying off!`,
        day_offset: undefined,
      });
    });

    // Category-specific completion rewards
    const completionRewards = {
      lifestyle: {
        title: 'Lifestyle Transformation Complete!',
        description: `Congratulations! You've successfully transformed your lifestyle with "${goalTitle}". You've built healthy habits that will last a lifetime!`,
      },
      career: {
        title: 'Professional Growth Achieved!',
        description: `Outstanding! You've completed your "${goalTitle}" journey and advanced your career. Your dedication has paid off!`,
      },
      mindset: {
        title: 'Mental Strength Mastered!',
        description: `Incredible! You've developed mental resilience through "${goalTitle}". You now have the mindset of a champion!`,
      },
      character: {
        title: 'Character Development Complete!',
        description: `Amazing! You've strengthened your character through "${goalTitle}". You've become the person you always wanted to be!`,
      },
      custom: {
        title: 'Personal Goal Achieved!',
        description: `Congratulations! You've successfully completed your "${goalTitle}" journey. You should be incredibly proud of your dedication and growth!`,
      },
    };

    const completionReward =
      completionRewards[category as keyof typeof completionRewards] ||
      completionRewards.custom;
    rewards.push({
      type: 'completion',
      title: completionReward.title,
      description: completionReward.description,
    });

    return rewards;
  };

  const rewards = getPersonalizedRewards(category, title, tasks);

  // Insert rewards into database
  const insertedRewards: any[] = [];
  for (const reward of rewards) {
    const { data: insertedReward, error } = await supabase
      .from('rewards')
      .insert({
        goal_id: goalId,
        type: reward.type,
        title: reward.title,
        description: reward.description,
        day_offset: reward.day_offset,
        unlocked: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting reward:', error);
    } else {
      insertedRewards.push(insertedReward);
    }
  }

  return insertedRewards;
};

// Helper function to compute run_at time from time-of-day labels
function computeRunAt(dayNumber: number, timeLabel: string): string {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Define time slots and their hours
  const timeSlots = {
    Morning: 8,
    'Mid-Morning': 10,
    Afternoon: 14,
    'Mid-Afternoon': 16,
    Evening: 20,
    Night: 22,
  };

  let targetHour = timeSlots[timeLabel as keyof typeof timeSlots] || 8;
  let startDay = 0; // Start from today

  // For the first day (dayNumber === 1), calculate smart timing based on current time
  if (dayNumber === 1) {
    // If current time is after 20:00 (8 PM), start tomorrow
    if (currentHour >= 20) {
      startDay = 1; // Start tomorrow
      targetHour = timeSlots[timeLabel as keyof typeof timeSlots] || 8;
    } else {
      // If current time is before 20:00 (8 PM), start today
      startDay = 0; // Start today

      // Get the standard time for this task
      const standardHour = timeSlots[timeLabel as keyof typeof timeSlots] || 8;

      // If the standard time has already passed today, make it available immediately
      if (currentHour >= standardHour) {
        // Task time has passed - make it available now (current time minus 1 minute to ensure it's available)
        targetHour = currentHour;
        const currentMinutes = new Date().getMinutes();
        // Set to current time minus 1 minute to ensure task is available
        const base = new Date();
        base.setHours(targetHour, Math.max(0, currentMinutes - 1), 0, 0);
        return base.toISOString();
      } else {
        // Task time hasn't passed yet - schedule for the standard time
        targetHour = standardHour;
      }
    }
  } else {
    // For subsequent days (dayNumber > 1), always schedule for future days
    // Don't schedule tasks for today if they're not day 1
    startDay = dayNumber - 1; // dayNumber 2 = tomorrow, dayNumber 3 = day after tomorrow, etc.

    // Reset to standard time slots for future days
    targetHour = timeSlots[timeLabel as keyof typeof timeSlots] || 8;
  }

  const base = new Date();
  base.setDate(base.getDate() + startDay);
  base.setHours(targetHour, 0, 0, 0);

  return base.toISOString();
}

// Parse "HH:MM" and clamp into the 07:00-23:00 window
function computeRunAtFromHHMM(
  dayNumber: number,
  hhmm: string,
  currentTimeIso?: string
): string {
  const now = currentTimeIso ? new Date(currentTimeIso) : new Date();
  const [hStr, mStr] = hhmm.split(':');
  let hours = Math.max(7, Math.min(23, parseInt(hStr, 10)));
  let minutes = Math.max(0, Math.min(59, parseInt(mStr || '0', 10)));

  const scheduled = new Date(now);
  // dayNumber is 1-based; schedule for today + (dayNumber-1)
  scheduled.setDate(scheduled.getDate() + (dayNumber - 1));
  scheduled.setHours(hours, minutes, 0, 0);

  // For day 1: ensure time is not in the past; if past and before 23:00, move to now+15m capped to 23:00
  if (dayNumber === 1) {
    if (scheduled < now) {
      const candidate = new Date(now.getTime() + 15 * 60 * 1000);
      // clamp candidate within today 07:00-23:00
      const todayStart = new Date(now);
      todayStart.setHours(7, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 0, 0, 0);
      if (candidate <= todayEnd) {
        const clamped = new Date(Math.max(candidate.getTime(), todayStart.getTime()));
        clamped.setSeconds(0, 0);
        return clamped.toISOString();
      }
      // Otherwise schedule tomorrow at earliest valid time (07:00)
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(Math.max(7, hours), minutes, 0, 0);
      return tomorrow.toISOString();
    }
  }

  // Ensure within 07:00-23:00 window for non-day1 as well
  const dayStart = new Date(scheduled);
  dayStart.setHours(7, 0, 0, 0);
  const dayEnd = new Date(scheduled);
  dayEnd.setHours(23, 0, 0, 0);
  if (scheduled < dayStart) {
    scheduled.setHours(7, 0, 0, 0);
  } else if (scheduled > dayEnd) {
    scheduled.setHours(23, 0, 0, 0);
  }

  return scheduled.toISOString();
}

// AI-powered plan generation with Google Gemini
const generateTasksWithAI = async (
  category: string,
  title: string,
  description: string,
  intensity: 'easy' | 'medium' | 'hard' = 'easy',
  detailedPlan: boolean = false,
  currentTimeIso?: string,
  timezone?: string
): Promise<{ tasks: TaskTemplate[]; iconName: string; color: string }> => {
  console.log('🤖 Generating AI-powered plan for:', {
    category,
    title,
    description,
  });

  try {
    const systemPrompt = `
You are Genie, a personal mentor. Create a progressive 21-day action plan for the user's goal.

INTENSITY LEVELS:
- Easy: 3 tasks per day (Morning, Afternoon, Evening) - 63 total tasks
- Medium: 6 tasks per day (Morning, Mid-Morning, Afternoon, Mid-Afternoon, Evening, Night) - 126 total tasks
- Hard: 10-12 tasks per day (distributed throughout 07:00-23:00) - 210-252 total tasks

Current intensity level: ${intensity.toUpperCase()}

TIME RULES (STRICT):
1) Use 24-hour clock times in HH:MM format only
2) All task times MUST be between 07:00 and 23:00 inclusive
3) For Day 1, consider the user's current time and timezone provided below. Do NOT schedule any Day 1 task in the past. If a suggested time has already passed, choose the next valid future time today; if no valid slot remains today, schedule the task for tomorrow at the earliest valid time (>= 07:00)

CRITICAL REQUIREMENTS:
1. Week 1 (Days 1-7): Foundation & Awareness - Focus on building habits, research, and initial steps
2. Week 2 (Days 8-14): Skill Building & Practice - Develop core skills and increase intensity
3. Week 3 (Days 15-21): Mastery & Completion - Advanced tasks and goal achievement

Each task must be:
- Specific and actionable (not vague)
- Progressive (builds on previous days)
- Realistic for the time allocated
- Directly related to the goal
- Appropriate for the selected intensity level

Choose an appropriate Phosphor icon for this goal:

IMPORTANT: Use ONLY valid Phosphor React Native icon names. The icon name must be in kebab-case format and exist in the phosphor-react-native library.

ICON CATEGORIES (all names are valid Phosphor React Native icons):
- lifestyle: heart, leaf, sun, moon, tree, bicycle, person-simple-run, person-simple-walk, person-simple-bike, music-notes, camera, book, flower, cloud, rainbow, drop, mountains, wave, fire
- career: briefcase, laptop, target, lightbulb, rocket, trophy, medal, book, pencil, calculator, users, handshake, money, bank, building, coins, credit-card, wallet, chart-line, chart-pie, storefront, graduation-cap
- mindset: brain, eye, heart, lightbulb, star, compass, target, shield, lock, key, puzzle-piece, infinity, atom, flask, globe, test-tube, book-open, graduation-cap, fingerprint, eye-closed, password
- character: user-circle, users, handshake, heart, shield, star, medal, trophy, compass, user, user-square, hand-heart, crown, sparkle
- custom: star, heart, lightbulb, target, rocket, trophy, medal, tree, sparkle, crown, infinity, puzzle-piece, bell, chat-circle, chat-text, paper-plane, calendar, clock, map-pin, globe-hemisphere-west, thumbs-up, thumbs-down

CRITICAL: The icon_name field MUST be a valid Phosphor React Native icon name in kebab-case format (e.g., "person-simple-run", "user-circle", "lightbulb"). Do NOT use invalid names like "running" which don't exist in the library.

Context for day 1 timing:
- current_time_iso: ${currentTimeIso || ''}
- timezone: ${timezone || ''}

Return ONLY valid JSON in this exact format:
{
  "icon_name": "chosen-icon-name", // MUST be a valid Phosphor React Native icon name in kebab-case
  "days": [
    {
      "day": 1,
      "summary": "Day 1 focus",
      "tasks": [
        { "time": "HH:MM", "title": "Task title", "description": "What to do" },
        { "time": "HH:MM", "title": "Task title", "description": "What to do" },
        { "time": "HH:MM", "title": "Task title", "description": "What to do" }
      ]
    }
  ]
}
Generate exactly 21 days with the correct number of tasks based on intensity:
- Easy: 3 tasks per day (63 total)
- Medium: 6 tasks per day (126 total) 
- Hard: 10-12 tasks per day (210-252 total)
Ensure all times are between 07:00 and 23:00.
`;

    const userGoalPrompt = `
Goal: ${title}
Description: ${description}
Category: ${category}

Create a progressive 21-day plan with the correct number of daily tasks to achieve this goal.

IMPORTANT: Make sure the plan follows this progression:
- Days 1-7: Start with foundational tasks, research, and habit building
- Days 8-14: Increase complexity and skill development
- Days 15-21: Focus on mastery, advanced techniques, and goal completion

Each task should be specific enough that someone could follow it without additional explanation.
For Medium intensity, include tasks at: Morning, Mid-Morning, Afternoon, Mid-Afternoon, Evening, Night
For Hard intensity, distribute tasks throughout the day from 07:00 to 23:00 with appropriate spacing
Use only 24h HH:MM times within 07:00-23:00. Day 1 times must not be in the past relative to the provided current time and timezone.
`;

    console.log('📡 Sending request to Gemini API...');
    console.log('🔑 API Key exists:', !!Deno.env.get('GOOGLE_AI_API_KEY'));
    console.log(
      '🔑 API Key length:',
      Deno.env.get('GOOGLE_AI_API_KEY')?.length || 0
    );

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' +
        Deno.env.get('GOOGLE_AI_API_KEY'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n${userGoalPrompt}` }],
            },
          ],
        }),
      }
    );

    console.log('📡 Gemini API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ AI API error: ${response.status}`, errorText);
      console.error('❌ Full error details:', {
        status: response.status,
        statusText: response.statusText,
        errorText,
      });
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('AI Response data:', JSON.stringify(data, null, 2));

    if (
      !data.candidates ||
      !data.candidates[0] ||
      !data.candidates[0].content
    ) {
      console.error('Invalid AI response structure:', data);
      throw new Error('Invalid AI response structure');
    }

    const text = data.candidates[0].content.parts[0].text;
    console.log('AI Response text:', text);

    // Parse the JSON response
    const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
    console.log('Cleaned AI text:', cleanedText);

    try {
      const planData = JSON.parse(cleanedText);
      console.log('Parsed plan data:', planData);

      // Convert the new format to the expected format
      const tasks: TaskTemplate[] = [];

      if (planData.days && Array.isArray(planData.days)) {
        for (const day of planData.days) {
          if (day.tasks && Array.isArray(day.tasks)) {
            for (const task of day.tasks) {
              // Detect HH:MM and derive a time bucket for greetings; attach custom_time
              const isHHMM = typeof task.time === 'string' && /^\d{2}:\d{2}$/.test(task.time);
              let timeBucket: 'morning' | 'mid_morning' | 'afternoon' | 'evening' = 'morning';
              if (isHHMM) {
                const hour = parseInt(task.time.slice(0, 2), 10);
                if (hour < 10) timeBucket = 'morning';
                else if (hour < 13) timeBucket = 'mid_morning';
                else if (hour < 18) timeBucket = 'afternoon';
                else timeBucket = 'evening';
              } else {
                const t = String(task.time).toLowerCase();
                if (t.includes('mid') && t.includes('morning')) timeBucket = 'mid_morning';
                else if (t.includes('afternoon')) timeBucket = 'afternoon';
                else if (t.includes('evening')) timeBucket = 'evening';
                else timeBucket = 'morning';
              }
              const entry: any = {
                title: task.title,
                description: task.description,
                day_offset: day.day - 1,
                time_of_day: timeBucket,
              };
              if (isHHMM) entry.custom_time = task.time;
              tasks.push(entry as TaskTemplate);
            }
          }
        }
      }

      console.log('Converted tasks:', tasks.length, 'tasks');

      // Validate that we got tasks from AI
      if (tasks.length === 0) {
        console.warn(`No tasks generated by AI. Falling back to template.`);
        throw new Error(`No tasks generated by AI`);
      }

      console.log(`✅ AI generated ${tasks.length} tasks successfully`);

      // Extract icon name and color from AI response
      let iconName = planData.icon_name || 'star'; // Default fallback

      // Validate icon name - ensure it's a valid Phosphor React Native icon
      const validIcons = [
        // Nature & Environment
        'leaf',
        'tree',
        'flower',
        'sun',
        'moon',
        'cloud',
        'rainbow',
        'drop',
        'mountains',
        'wave',
        'fire',

        // People & Activities
        'user',
        'user-circle',
        'user-square',
        'users',
        'handshake',
        'person-simple-run',
        'person-simple-walk',
        'person-simple-bike',
        'bicycle',
        'heart',
        'hand-heart',

        // Objects & Tools
        'camera',
        'music-notes',
        'book',
        'pencil',
        'paint-brush',
        'notebook',
        'briefcase',
        'laptop',
        'device-mobile',
        'calculator',
        'lightbulb',
        'wrench',
        'gear',
        'magnifying-glass',
        'target',

        // Business & Finance
        'money',
        'coins',
        'credit-card',
        'wallet',
        'bank',
        'chart-line',
        'chart-pie',
        'building',
        'storefront',

        // Science & Knowledge
        'atom',
        'brain',
        'flask',
        'globe',
        'compass',
        'test-tube',
        'book-open',
        'graduation-cap',

        // Security & System
        'lock',
        'lock-key',
        'key',
        'shield',
        'fingerprint',
        'eye',
        'eye-closed',
        'password',
        'folder',
        'file',

        // Creativity & Motivation
        'star',
        'rocket',
        'trophy',
        'medal',
        'sparkle',
        'crown',
        'infinity',
        'puzzle-piece',

        // Misc
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
      ];

      if (!validIcons.includes(iconName)) {
        console.warn(
          `⚠️ Invalid icon name "${iconName}" from AI, using fallback "star"`
        );
        iconName = 'star';
      }

      // Always choose a random color from our approved list
      const validColors = [
        'yellow',
        'green',
        'red',
        'blue',
        'orange',
        'purple',
        'pink',
        'cyan',
        'lime',
        'magenta',
      ];
      const randomIndex = Math.floor(Math.random() * validColors.length);
      const color = validColors[randomIndex];

      console.log(`🎲 Random color selected: ${color}`);

      console.log(`🎨 AI selected icon: ${iconName}, color: ${color}`);

      return { tasks, iconName, color };
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Raw text:', cleanedText);
      throw parseError;
    }
  } catch (error) {
    console.error('❌ AI generation failed, falling back to templates:', error);
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    const fallbackTasks = generateTasksForCategory(
      category,
      title,
      description,
      intensity
    );
    return { tasks: fallbackTasks, iconName: 'star', color: 'yellow' }; // Default icon and color for fallback
  }
};

// Template-based plan generation (fallback) - generates detailed daily plan based on intensity
const generateTasksForCategory = (
  category: string,
  title: string,
  description: string,
  intensity: 'easy' | 'medium' | 'hard' = 'easy'
): TaskTemplate[] => {
  const tasks: TaskTemplate[] = [];

  // Determine number of tasks per day based on intensity
  const tasksPerDay = intensity === 'easy' ? 3 : intensity === 'medium' ? 6 : 12;

  // Generate tasks per day for 21 days
  for (let day = 0; day < 21; day++) {
    const dayNumber = day + 1;
    const weekNumber = Math.ceil(dayNumber / 7);

    // Week 1: Foundation & Awareness
    if (weekNumber === 1) {
      const dayTasks = [
        {
          title: `Day ${dayNumber}: Morning Intention Setting`,
          description: `Spend 10 minutes writing down your daily intention and how it connects to your goal. Visualize your success.`,
          day_offset: day,
          time_of_day: 'morning' as const,
        },
        {
          title: `Day ${dayNumber}: Research & Learning`,
          description: `Spend 20 minutes researching strategies and best practices for your goal. Take notes on key insights.`,
          day_offset: day,
          time_of_day: 'afternoon' as const,
        },
        {
          title: `Day ${dayNumber}: Progress Documentation`,
          description: `Write down what you accomplished today and how you feel about your progress. Celebrate small wins.`,
          day_offset: day,
          time_of_day: 'evening' as const,
        },
        {
          title: `Day ${dayNumber}: Mid-Morning Focus`,
          description: `Take a focused 15-minute session to work on your goal. Use this time for concentrated effort.`,
          day_offset: day,
          time_of_day: 'mid_morning' as const,
        },
        {
          title: `Day ${dayNumber}: Mid-Afternoon Break`,
          description: `Take a 10-minute break to reflect on your progress and recharge for the evening session.`,
          day_offset: day,
          time_of_day: 'afternoon' as const,
        },
        {
          title: `Day ${dayNumber}: Evening Review`,
          description: `Review your day's accomplishments and plan tomorrow's focus areas.`,
          day_offset: day,
          time_of_day: 'evening' as const,
        },
        {
          title: `Day ${dayNumber}: Early Morning Preparation`,
          description: `Set up your workspace and prepare materials for today's goal work.`,
          day_offset: day,
          time_of_day: 'morning' as const,
        },
        {
          title: `Day ${dayNumber}: Midday Check-in`,
          description: `Check your progress and adjust your approach if needed.`,
          day_offset: day,
          time_of_day: 'afternoon' as const,
        },
        {
          title: `Day ${dayNumber}: Late Morning Session`,
          description: `Dedicate 20 minutes to focused work on your goal.`,
          day_offset: day,
          time_of_day: 'mid_morning' as const,
        },
        {
          title: `Day ${dayNumber}: Afternoon Deep Work`,
          description: `Engage in 30 minutes of deep, uninterrupted work on your goal.`,
          day_offset: day,
          time_of_day: 'afternoon' as const,
        },
        {
          title: `Day ${dayNumber}: Evening Reflection`,
          description: `Spend 15 minutes reflecting on today's learnings and insights.`,
          day_offset: day,
          time_of_day: 'evening' as const,
        },
        {
          title: `Day ${dayNumber}: Night Planning`,
          description: `Plan tomorrow's tasks and set intentions for continued progress.`,
          day_offset: day,
          time_of_day: 'evening' as const,
        }
      ];
      
      // Add tasks based on intensity level
      tasks.push(...dayTasks.slice(0, tasksPerDay));
    }
    // Week 2: Skill Building & Practice
    else if (weekNumber === 2) {
      const dayTasks = [
        {
          title: `Day ${dayNumber}: Skill Development`,
          description: `Practice and develop specific skills needed for your goal. Focus on deliberate practice.`,
          day_offset: day,
          time_of_day: 'morning' as const,
        },
        {
          title: `Day ${dayNumber}: Real-world Application`,
          description: `Apply what you've learned in a real-world context. Test your skills in practical situations.`,
          day_offset: day,
          time_of_day: 'afternoon' as const,
        },
        {
          title: `Day ${dayNumber}: Progress Evaluation`,
          description: `Evaluate your progress and identify what's working well. Adjust your approach if needed.`,
          day_offset: day,
          time_of_day: 'evening' as const,
        },
        {
          title: `Day ${dayNumber}: Advanced Practice`,
          description: `Engage in advanced practice techniques to deepen your skills.`,
          day_offset: day,
          time_of_day: 'mid_morning' as const,
        },
        {
          title: `Day ${dayNumber}: Skill Integration`,
          description: `Integrate multiple skills together in complex scenarios.`,
          day_offset: day,
          time_of_day: 'afternoon' as const,
        },
        {
          title: `Day ${dayNumber}: Performance Review`,
          description: `Review your performance and identify areas for improvement.`,
          day_offset: day,
          time_of_day: 'evening' as const,
        },
        {
          title: `Day ${dayNumber}: Intensive Training`,
          description: `Dedicate 45 minutes to intensive skill development.`,
          day_offset: day,
          time_of_day: 'morning' as const,
        },
        {
          title: `Day ${dayNumber}: Challenge Practice`,
          description: `Challenge yourself with difficult scenarios and problems.`,
          day_offset: day,
          time_of_day: 'afternoon' as const,
        },
        {
          title: `Day ${dayNumber}: Skill Refinement`,
          description: `Refine and polish your existing skills to perfection.`,
          day_offset: day,
          time_of_day: 'mid_morning' as const,
        },
        {
          title: `Day ${dayNumber}: Complex Application`,
          description: `Apply your skills to complex, multi-step problems.`,
          day_offset: day,
          time_of_day: 'afternoon' as const,
        },
        {
          title: `Day ${dayNumber}: Mastery Assessment`,
          description: `Assess your current mastery level and set new challenges.`,
          day_offset: day,
          time_of_day: 'evening' as const,
        },
        {
          title: `Day ${dayNumber}: Skill Expansion`,
          description: `Learn new related skills to expand your capabilities.`,
          day_offset: day,
          time_of_day: 'evening' as const,
        }
      ];
      
      // Add tasks based on intensity level
      tasks.push(...dayTasks.slice(0, tasksPerDay));
    }
    // Week 3: Mastery & Integration
    else {
      const dayTasks = [
        {
          title: `Day ${dayNumber}: Advanced Practice`,
          description: `Engage in advanced practice and optimization of your skills. Push your boundaries.`,
          day_offset: day,
          time_of_day: 'morning' as const,
        },
        {
          title: `Day ${dayNumber}: Mastery Demonstration`,
          description: `Demonstrate your mastery of the skills you've developed. Show your progress.`,
          day_offset: day,
          time_of_day: 'afternoon' as const,
        },
        {
          title: `Day ${dayNumber}: Integration Practice`,
          description: `Integrate your new skills into your daily life and routine. Make it sustainable.`,
          day_offset: day,
          time_of_day: 'evening' as const,
        },
        {
          title: `Day ${dayNumber}: Expert-Level Challenges`,
          description: `Tackle expert-level challenges to test your mastery.`,
          day_offset: day,
          time_of_day: 'mid_morning' as const,
        },
        {
          title: `Day ${dayNumber}: Teaching Others`,
          description: `Teach someone else what you've learned to solidify your understanding.`,
          day_offset: day,
          time_of_day: 'afternoon' as const,
        },
        {
          title: `Day ${dayNumber}: Long-term Planning`,
          description: `Plan how to maintain and continue developing your skills long-term.`,
          day_offset: day,
          time_of_day: 'evening' as const,
        },
        {
          title: `Day ${dayNumber}: Peak Performance`,
          description: `Push yourself to peak performance levels in your goal area.`,
          day_offset: day,
          time_of_day: 'morning' as const,
        },
        {
          title: `Day ${dayNumber}: Innovation & Creativity`,
          description: `Apply your skills in creative and innovative ways.`,
          day_offset: day,
          time_of_day: 'afternoon' as const,
        },
        {
          title: `Day ${dayNumber}: Leadership Application`,
          description: `Use your skills to lead and inspire others.`,
          day_offset: day,
          time_of_day: 'mid_morning' as const,
        },
        {
          title: `Day ${dayNumber}: Excellence Standards`,
          description: `Set new excellence standards for yourself based on your growth.`,
          day_offset: day,
          time_of_day: 'afternoon' as const,
        },
        {
          title: `Day ${dayNumber}: Legacy Building`,
          description: `Consider how your skills can create lasting impact and legacy.`,
          day_offset: day,
          time_of_day: 'evening' as const,
        },
        {
          title: `Day ${dayNumber}: Future Vision`,
          description: `Envision your future with these mastered skills and set new goals.`,
          day_offset: day,
          time_of_day: 'evening' as const,
        }
      ];
      
      // Add tasks based on intensity level
      tasks.push(...dayTasks.slice(0, tasksPerDay));
    }
  }

  return tasks;
};

const getTimeForSchedule = (
  date: Date,
  timeOfDay: 'morning' | 'mid_morning' | 'afternoon' | 'evening'
): Date => {
  const scheduledDate = new Date(date);

  switch (timeOfDay) {
    case 'morning':
      scheduledDate.setHours(8, 0, 0, 0);
      break;
    case 'mid_morning':
      scheduledDate.setHours(10, 30, 0, 0);
      break;
    case 'afternoon':
      scheduledDate.setHours(14, 0, 0, 0);
      break;
    case 'evening':
      scheduledDate.setHours(19, 0, 0, 0);
      break;
    default:
      // Fallback for old format
      scheduledDate.setHours(9, 0, 0, 0);
      break;
  }

  return scheduledDate;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      user_id,
      goal_id,
      category,
      title,
      description,
      intensity = 'easy',
      timezone,
      start_date,
      language = 'en',
      detailed_plan = false,
    }: GeneratePlanRequest = await req.json();

    console.log('📋 Plan generation request:', {
      user_id,
      goal_id,
      category,
      title,
      description,
      intensity,
      detailed_plan,
    });

    // Generate tasks using AI (with template fallback)
    const {
      tasks: taskTemplates,
      iconName,
      color,
    } = await generateTasksWithAI(
      category,
      title,
      description,
      intensity,
      detailed_plan,
      new Date().toISOString(),
      timezone
    );

    console.log('📋 Generated tasks:', taskTemplates.length, 'tasks');
    console.log('🎨 Selected icon:', iconName);

    // Create scheduled tasks using the new computeRunAt function
    const startDate = start_date ? new Date(start_date) : new Date();
    const tasksToInsert = taskTemplates.map((template: any) => {
      const dayNumber = template.day_offset + 1; // Convert back to 1-based
      const timeLabel =
        template.time_of_day.charAt(0).toUpperCase() +
        template.time_of_day.slice(1);

      // Prefer AI-provided HH:MM when available
      const runAt = template.custom_time
        ? computeRunAtFromHHMM(dayNumber, template.custom_time, new Date().toISOString())
        : computeRunAt(dayNumber, timeLabel);

      return {
        goal_id,
        title: template.title,
        description: template.description,
        run_at: runAt,
        intensity: intensity, // Store intensity level with task
      };
    });

    // Insert tasks into database
    const { data: insertedTasks, error: insertError } = await supabaseClient
      .from('goal_tasks')
      .insert(tasksToInsert)
      .select();

    if (insertError) {
      throw insertError;
    }

    // Create personalized notifications for tasks
    const notificationsToInsert = insertedTasks.map((task, index) => {
      const dayNumber = index + 1;
      const weekNumber = Math.ceil(dayNumber / 7);

      const motivationalMessages = {
        week1: [
          `Day ${dayNumber}: Building your foundation! 💪`,
          `Day ${dayNumber}: Every step counts! 🚀`,
          `Day ${dayNumber}: You're creating new habits! ✨`,
          `Day ${dayNumber}: Progress starts with action! 🎯`,
          `Day ${dayNumber}: Your journey begins now! 🌟`,
        ],
        week2: [
          `Day ${dayNumber}: Skills are developing! 💪`,
          `Day ${dayNumber}: You're getting stronger! 🚀`,
          `Day ${dayNumber}: Consistency is key! ✨`,
          `Day ${dayNumber}: Building momentum! 🎯`,
          `Day ${dayNumber}: You're halfway there! 🌟`,
        ],
        week3: [
          `Day ${dayNumber}: Mastery is emerging! 💪`,
          `Day ${dayNumber}: You're almost there! 🚀`,
          `Day ${dayNumber}: Excellence is becoming natural! ✨`,
          `Day ${dayNumber}: The finish line is near! 🎯`,
          `Day ${dayNumber}: You're transforming! 🌟`,
        ],
      };

      const timeBasedGreetings = {
        morning: 'Good morning! ☀️',
        mid_morning: 'Good morning! 🌅',
        afternoon: 'Good afternoon! 🌤️',
        evening: 'Good evening! 🌙',
      };

      const timeOfDay = task.run_at.includes('08:')
        ? 'morning'
        : task.run_at.includes('10:')
          ? 'mid_morning'
          : task.run_at.includes('14:')
            ? 'afternoon'
            : 'evening';

      const weekKey =
        weekNumber === 1 ? 'week1' : weekNumber === 2 ? 'week2' : 'week3';
      const weekMessages = motivationalMessages[weekKey];
      const messageIndex = (dayNumber - 1) % weekMessages.length;

      return {
        user_id,
        task_id: task.id,
        type: 'task_reminder',
        title: `${timeBasedGreetings[timeOfDay]} Day ${dayNumber} - ${task.title}`,
        body: `${weekMessages[messageIndex]}\n\n${task.description}\n\nTap to start your task!`,
        scheduled_for: task.run_at,
      };
    });

    const { error: notificationError } = await supabaseClient
      .from('scheduled_notifications')
      .insert(notificationsToInsert);

    if (notificationError) {
      console.error('Error creating notifications:', notificationError);
      // Don't throw here, as the main task creation succeeded
    }

    // Generate rewards for the goal
    const rewards = await generateRewards(
      goal_id,
      supabaseClient,
      category,
      title,
      taskTemplates,
      intensity
    );

    // Create reward notification templates
    const rewardNotifications = [
      {
        user_id,
        type: 'milestone_reward',
        title: '🎉 Reward Unlocked!',
        body: 'You reached a milestone! A new reward is waiting for you in the rewards screen',
        scheduled_for: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(), // 7 days from now
      },
      {
        user_id,
        type: 'completion_reward',
        title: '🏆 Goal Completed!',
        body: 'Congratulations! You completed all tasks and achieved your goal!',
        scheduled_for: new Date(
          Date.now() + 21 * 24 * 60 * 60 * 1000
        ).toISOString(), // 21 days from now
      },
    ];

    await supabaseClient
      .from('scheduled_notifications')
      .insert(rewardNotifications);

    // Update the goal with the AI-selected icon and color
    await supabaseClient
      .from('goals')
      .update({ icon_name: iconName, color: color })
      .eq('id', goal_id);

    // Send immediate notification for the first task
    if (insertedTasks.length > 0) {
      const firstTask = insertedTasks[0];
      try {
        const notificationResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-task-notification`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id,
              task_id: firstTask.id,
              task_title: firstTask.title,
              task_description: firstTask.description,
              goal_title: title,
            }),
          }
        );

        if (notificationResponse.ok) {
          console.log('✅ Immediate task notification sent');
        } else {
          console.warn('⚠️ Failed to send immediate task notification');
        }
      } catch (error) {
        console.error('❌ Error sending immediate task notification:', error);
        // Don't fail the whole process for notification errors
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        tasks: insertedTasks,
        rewards: rewards,
        icon_name: iconName,
        color: color,
        message: `Generated ${insertedTasks.length} tasks and ${rewards.length} rewards for your goal`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error generating plan:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
