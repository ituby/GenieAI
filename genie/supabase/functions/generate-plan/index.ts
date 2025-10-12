import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
const getSpecificGuidelines = (category: string, title: string, description: string): string => {
  const titleLower = title.toLowerCase();
  const descLower = description.toLowerCase();
  
  // Language learning goals
  if (titleLower.includes('learn') && (titleLower.includes('language') || titleLower.includes('spanish') || titleLower.includes('french') || titleLower.includes('english'))) {
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
  if (titleLower.includes('fitness') || titleLower.includes('exercise') || titleLower.includes('workout') || titleLower.includes('gym')) {
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
  if (titleLower.includes('career') || titleLower.includes('job') || titleLower.includes('promotion') || titleLower.includes('skill')) {
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
  if (titleLower.includes('business') || titleLower.includes('startup') || titleLower.includes('entrepreneur')) {
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
  if (titleLower.includes('health') || titleLower.includes('diet') || titleLower.includes('weight') || titleLower.includes('nutrition')) {
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

const generateRewards = async (goalId: string, supabase: any, category: string, title: string, tasks: any[], intensity: 'easy' | 'medium' | 'hard' = 'easy'): Promise<void> => {
  // Generate personalized rewards based on tasks
  const getPersonalizedRewards = (category: string, goalTitle: string, tasks: any[]): RewardTemplate[] => {
    const rewards: RewardTemplate[] = [];

    // Daily consistency reward (adjusted for intensity)
    const dailyTaskCount = intensity === 'easy' ? 3 : intensity === 'medium' ? 6 : 12;
    rewards.push({
      type: 'daily',
      title: 'Daily Champion',
      description: `Complete ${dailyTaskCount} daily "${goalTitle}" tasks to unlock this achievement! Consistency is the key to success.`
    });

    // Task-specific rewards (every 5 tasks)
    const taskMilestones = [5, 10, 15, 20];
    taskMilestones.forEach((milestone, index) => {
      if (milestone <= tasks.length) {
        rewards.push({
          type: 'milestone',
          title: `${milestone} Tasks Complete!`,
          description: `Incredible! You've completed ${milestone} tasks for "${goalTitle}". You're making real progress!`,
          day_offset: milestone - 1
        });
      }
    });

    // Weekly consistency rewards
    rewards.push({
      type: 'milestone',
      title: 'Week 1 Consistency',
      description: `Amazing! You've been consistent with "${goalTitle}" for a full week. Your habits are taking root!`,
      day_offset: 6
    });

    rewards.push({
      type: 'milestone',
      title: 'Week 2 Momentum',
      description: `Outstanding! Two weeks of consistent progress with "${goalTitle}". You're building unstoppable momentum!`,
      day_offset: 13
    });

    rewards.push({
      type: 'milestone',
      title: 'Week 3 Mastery',
      description: `Incredible! Three weeks of dedication to "${goalTitle}". You've mastered the art of consistency!`,
      day_offset: 20
    });

    // Points-based rewards (adjusted for intensity)
    const pointsMilestones = intensity === 'easy' ? [50, 100, 200] : 
                            intensity === 'medium' ? [100, 200, 400] : 
                            [200, 400, 800];
    
    pointsMilestones.forEach((points, index) => {
      const titles = ['Master', 'Champion', 'Legend'];
      rewards.push({
        type: 'milestone',
        title: `${points} Points ${titles[index]}`,
        description: `Congratulations! You've earned ${points} points for "${goalTitle}". Your dedication is paying off!`,
        day_offset: null
      });
    });

    // Category-specific completion rewards
    const completionRewards = {
      lifestyle: {
        title: 'Lifestyle Transformation Complete!',
        description: `Congratulations! You've successfully transformed your lifestyle with "${goalTitle}". You've built healthy habits that will last a lifetime!`
      },
      career: {
        title: 'Professional Growth Achieved!',
        description: `Outstanding! You've completed your "${goalTitle}" journey and advanced your career. Your dedication has paid off!`
      },
      mindset: {
        title: 'Mental Strength Mastered!',
        description: `Incredible! You've developed mental resilience through "${goalTitle}". You now have the mindset of a champion!`
      },
      character: {
        title: 'Character Development Complete!',
        description: `Amazing! You've strengthened your character through "${goalTitle}". You've become the person you always wanted to be!`
      },
      custom: {
        title: 'Personal Goal Achieved!',
        description: `Congratulations! You've successfully completed your "${goalTitle}" journey. You should be incredibly proud of your dedication and growth!`
      }
    };

    const completionReward = completionRewards[category as keyof typeof completionRewards] || completionRewards.custom;
    rewards.push({
      type: 'completion',
      title: completionReward.title,
      description: completionReward.description
    });

    return rewards;
  };

  const rewards = getPersonalizedRewards(category, title, tasks);

  // Insert rewards into database
  for (const reward of rewards) {
    await supabase
      .from('rewards')
      .insert({
        goal_id: goalId,
        type: reward.type,
        title: reward.title,
        description: reward.description,
        day_offset: reward.day_offset,
        unlocked: false
      });
  }
};


// Helper function to compute run_at time
function computeRunAt(dayNumber: number, timeLabel: string): string {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Determine start day and time based on current time
  let startDay = 0; // Default: start today
  let targetHour = 8; // Default morning hour
  
  // Define time slots and their hours
  const timeSlots = {
    "Morning": 8,
    "Mid-Morning": 10,
    "Afternoon": 14,
    "Mid-Afternoon": 16,
    "Evening": 20,
    "Night": 22
  };
  
  targetHour = timeSlots[timeLabel as keyof typeof timeSlots] || 8;
  
  // For the first day (dayNumber === 1), calculate smart timing based on current time
  if (dayNumber === 1) {
    // If current time is before 22:00 (10 PM), start today
    if (currentHour < 22) {
      startDay = 0; // Start today
      
      // Calculate smart timing for first day tasks based on current time
      const currentTimeMinutes = currentHour * 60 + currentMinute;
      
      if (timeLabel === "Morning") {
        // First task: start soon (30 minutes from now, but not before 8:00)
        const nextSlotMinutes = Math.max(8 * 60, currentTimeMinutes + 30);
        targetHour = Math.floor(nextSlotMinutes / 60);
      } else if (timeLabel === "Afternoon") {
        // Second task: afternoon (14:00-16:00)
        targetHour = Math.max(14, currentHour + 1);
      } else if (timeLabel === "Evening") {
        // Third task: evening (18:00-20:00)
        targetHour = Math.max(18, currentHour + 2);
      } else {
        // Fallback for other time labels
        targetHour = Math.max(8, currentHour + 1);
      }
      
      // Ensure we don't schedule too late in the day
      if (targetHour > 22) {
        startDay = 1; // Move to tomorrow
        targetHour = 8;
      }
    } else {
      // If current time is after 22:00 (10 PM), start tomorrow
      startDay = 1;
      targetHour = 8; // Tomorrow morning
    }
  } else {
    // For subsequent days, use the original logic
    if (currentHour < 12) {
      startDay = 0; // Start today
    } else if (currentHour < 18) {
      startDay = 0; // Start today
    } else {
      startDay = 1; // Start tomorrow
    }
  }
  
  const base = new Date();
  base.setDate(base.getDate() + startDay + dayNumber - 1);
  base.setHours(targetHour, 0, 0, 0);
  
  return base.toISOString();
}

// AI-powered plan generation with Google Gemini
const generateTasksWithAI = async (category: string, title: string, description: string, intensity: 'easy' | 'medium' | 'hard' = 'easy', detailedPlan: boolean = false): Promise<{ tasks: TaskTemplate[], iconName: string, color: string }> => {
  console.log('🤖 Generating AI-powered plan for:', { category, title, description });
  
  try {
    const systemPrompt = `
You are Genie, a personal mentor. Create a progressive 21-day action plan for the user's goal.

INTENSITY LEVELS:
- Easy: 3 tasks per day (Morning, Afternoon, Evening)
- Medium: 6 tasks per day (Morning, Mid-Morning, Afternoon, Mid-Afternoon, Evening, Night)
- Hard: 12 tasks per day (Hourly tasks from 6 AM to 6 PM)

Current intensity level: ${intensity.toUpperCase()}

SMART TIME LOGIC FOR DAY 1:
- If goal is created before 22:00 (10 PM), tasks will be scheduled intelligently based on current time
- First task (Morning): Starts 30 minutes from now (minimum 8:00 AM)
- Second task (Afternoon): Scheduled for afternoon hours (14:00-16:00)
- Third task (Evening): Scheduled for evening hours (18:00-20:00)
- If goal is created after 22:00 (10 PM), all tasks start tomorrow morning
- For subsequent days, use standard time slots: Morning (8:00), Afternoon (14:00), Evening (20:00)

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

ICON CATEGORIES:
- lifestyle: heart, leaf, sun, moon, tree, bicycle, running, music, camera, book
- career: briefcase, laptop, target, lightbulb, rocket, trophy, medal, book, pencil, calculator, users, handshake, money, bank, building
- mindset: brain, eye, heart, lightbulb, star, compass, target, shield, lock, key, puzzle, infinity, atom
- character: user-circle, users, handshake, heart, shield, star, medal, trophy, compass
- custom: star, heart, lightbulb, target, rocket, trophy, medal, tree

Return ONLY valid JSON in this exact format:
{
  "icon_name": "chosen-icon-name",
  "days": [
    {
      "day": 1,
      "summary": "Day 1 focus",
      "tasks": [
        { "time": "Morning", "title": "Task title", "description": "What to do" },
        { "time": "Afternoon", "title": "Task title", "description": "What to do" },
        { "time": "Evening", "title": "Task title", "description": "What to do" }
      ]
    }
  ]
}
Generate exactly 21 days with 3 tasks each (63 total tasks).
`;

    const userGoalPrompt = `
Goal: ${title}
Description: ${description}
Category: ${category}

Create a progressive 21-day plan with 3 daily tasks to achieve this goal.

IMPORTANT: Make sure the plan follows this progression:
- Days 1-7: Start with foundational tasks, research, and habit building
- Days 8-14: Increase complexity and skill development
- Days 15-21: Focus on mastery, advanced techniques, and goal completion

Each task should be specific enough that someone could follow it without additional explanation.
`;

    console.log('📡 Sending request to Gemini API...');
    console.log('🔑 API Key exists:', !!Deno.env.get('GOOGLE_AI_API_KEY'));
    console.log('🔑 API Key length:', Deno.env.get('GOOGLE_AI_API_KEY')?.length || 0);
    
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + Deno.env.get('GOOGLE_AI_API_KEY'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          { 
            role: "user", 
            parts: [{ text: `${systemPrompt}\n\n${userGoalPrompt}` }] 
          }
        ]
      })
    });

    console.log('📡 Gemini API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ AI API error: ${response.status}`, errorText);
      console.error('❌ Full error details:', { status: response.status, statusText: response.statusText, errorText });
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('AI Response data:', JSON.stringify(data, null, 2));
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
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
              tasks.push({
                title: task.title,
                description: task.description,
                day_offset: day.day - 1, // Convert to 0-based index
                time_of_day: task.time.toLowerCase()
              });
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
      const iconName = planData.icon_name || 'star'; // Default fallback
      
      // Always choose a random color from our approved list
      const validColors = ['yellow', 'green', 'red', 'blue', 'orange', 'purple', 'pink', 'cyan', 'lime', 'magenta'];
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
    const fallbackTasks = generateTasksForCategory(category, title, description);
    return { tasks: fallbackTasks, iconName: 'star', color: 'yellow' }; // Default icon and color for fallback
  }
};

// Template-based plan generation (fallback) - generates detailed daily plan with 3 tasks per day
const generateTasksForCategory = (category: string, title: string, description: string): TaskTemplate[] => {
  const tasks: TaskTemplate[] = [];
  
  // Generate 3 tasks per day for 21 days = 63 total tasks
  for (let day = 0; day < 21; day++) {
    const dayNumber = day + 1;
    const weekNumber = Math.ceil(dayNumber / 7);
    
    // Week 1: Foundation & Awareness
    if (weekNumber === 1) {
      tasks.push(
        {
          title: `Day ${dayNumber}: Morning Intention Setting`,
          description: `Spend 10 minutes writing down your daily intention and how it connects to your goal. Visualize your success.`,
          day_offset: day,
          time_of_day: 'morning'
        },
        {
          title: `Day ${dayNumber}: Research & Learning`,
          description: `Spend 20 minutes researching strategies and best practices for your goal. Take notes on key insights.`,
          day_offset: day,
          time_of_day: 'afternoon'
        },
        {
          title: `Day ${dayNumber}: Progress Documentation`,
          description: `Write down what you accomplished today and how you feel about your progress. Celebrate small wins.`,
          day_offset: day,
          time_of_day: 'evening'
        }
      );
    }
    // Week 2: Skill Building & Practice
    else if (weekNumber === 2) {
      tasks.push(
        {
          title: `Day ${dayNumber}: Skill Development`,
          description: `Practice and develop specific skills needed for your goal. Focus on deliberate practice.`,
          day_offset: day,
          time_of_day: 'morning'
        },
        {
          title: `Day ${dayNumber}: Real-world Application`,
          description: `Apply what you've learned in a real-world context. Test your skills in practical situations.`,
          day_offset: day,
          time_of_day: 'afternoon'
        },
        {
          title: `Day ${dayNumber}: Progress Evaluation`,
          description: `Evaluate your progress and identify what's working well. Adjust your approach if needed.`,
          day_offset: day,
          time_of_day: 'evening'
        }
      );
    }
    // Week 3: Mastery & Integration
    else {
      tasks.push(
        {
          title: `Day ${dayNumber}: Advanced Practice`,
          description: `Engage in advanced practice and optimization of your skills. Push your boundaries.`,
          day_offset: day,
          time_of_day: 'morning'
        },
        {
          title: `Day ${dayNumber}: Mastery Demonstration`,
          description: `Demonstrate your mastery of the skills you've developed. Show your progress.`,
          day_offset: day,
          time_of_day: 'afternoon'
        },
        {
          title: `Day ${dayNumber}: Integration Practice`,
          description: `Integrate your new skills into your daily life and routine. Make it sustainable.`,
          day_offset: day,
          time_of_day: 'evening'
        }
      );
    }
  }
  
  return tasks;
};

const getTimeForSchedule = (date: Date, timeOfDay: 'morning' | 'mid_morning' | 'afternoon' | 'evening'): Date => {
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

    const { user_id, goal_id, category, title, description, intensity = 'easy', timezone, start_date, language = 'en', detailed_plan = false }: GeneratePlanRequest = 
      await req.json();

    console.log('📋 Plan generation request:', {
      user_id,
      goal_id,
      category,
      title,
      description,
      intensity,
      detailed_plan
    });

    // Generate tasks using AI (with template fallback)
    const { tasks: taskTemplates, iconName, color } = await generateTasksWithAI(category, title, description, intensity, detailed_plan);
    
    console.log('📋 Generated tasks:', taskTemplates.length, 'tasks');
    console.log('🎨 Selected icon:', iconName);
    
    // Create scheduled tasks using the new computeRunAt function
    const startDate = start_date ? new Date(start_date) : new Date();
    const tasksToInsert = taskTemplates.map((template) => {
      const dayNumber = template.day_offset + 1; // Convert back to 1-based
      const timeLabel = template.time_of_day.charAt(0).toUpperCase() + template.time_of_day.slice(1);
      
      // Use computeRunAt for consistent time calculation
      const runAt = computeRunAt(dayNumber, timeLabel);
      
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
          `Day ${dayNumber}: Your journey begins now! 🌟`
        ],
        week2: [
          `Day ${dayNumber}: Skills are developing! 💪`,
          `Day ${dayNumber}: You're getting stronger! 🚀`,
          `Day ${dayNumber}: Consistency is key! ✨`,
          `Day ${dayNumber}: Building momentum! 🎯`,
          `Day ${dayNumber}: You're halfway there! 🌟`
        ],
        week3: [
          `Day ${dayNumber}: Mastery is emerging! 💪`,
          `Day ${dayNumber}: You're almost there! 🚀`,
          `Day ${dayNumber}: Excellence is becoming natural! ✨`,
          `Day ${dayNumber}: The finish line is near! 🎯`,
          `Day ${dayNumber}: You're transforming! 🌟`
        ]
      };
      
      const timeBasedGreetings = {
        morning: 'Good morning! ☀️',
        mid_morning: 'Good morning! 🌅',
        afternoon: 'Good afternoon! 🌤️',
        evening: 'Good evening! 🌙'
      };
      
      const timeOfDay = task.run_at.includes('08:') ? 'morning' : 
                       task.run_at.includes('10:') ? 'mid_morning' :
                       task.run_at.includes('14:') ? 'afternoon' : 'evening';
      
      const weekKey = weekNumber === 1 ? 'week1' : weekNumber === 2 ? 'week2' : 'week3';
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
    await generateRewards(goal_id, supabaseClient, category, title, taskTemplates, intensity);

    // Create reward notification templates
    const rewardNotifications = [
      {
        user_id,
        type: 'milestone_reward',
        title: '🎉 Reward Unlocked!',
        body: 'You reached a milestone! A new reward is waiting for you in the rewards screen',
        scheduled_for: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      },
      {
        user_id,
        type: 'completion_reward',
        title: '🏆 Goal Completed!',
        body: 'Congratulations! You completed all tasks and achieved your goal!',
        scheduled_for: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), // 21 days from now
      }
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
        const notificationResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-task-notification`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id,
            task_id: firstTask.id,
            task_title: firstTask.title,
            task_description: firstTask.description,
            goal_title: title
          }),
        });

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
        icon_name: iconName,
        color: color,
        message: `Generated ${insertedTasks.length} tasks for your goal`,
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
