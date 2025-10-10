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
const generateRewards = async (goalId: string, supabase: any, category: string, title: string): Promise<void> => {
  const rewards: RewardTemplate[] = [
    // Daily rewards (unlocked after completing daily tasks)
    { type: 'daily', title: 'Daily Achievement', description: 'You completed today\'s task! Every small step counts towards your bigger goal.' },
    
    // Milestone rewards (every 7 days)
    { type: 'milestone', title: 'Week 1 Complete!', description: 'Amazing! You\'ve built a solid foundation. Your new habits are starting to take root.', day_offset: 6 },
    { type: 'milestone', title: 'Week 2 Complete!', description: 'Incredible progress! You\'re developing real skills and seeing tangible results.', day_offset: 13 },
    { type: 'milestone', title: 'Week 3 Complete!', description: 'Outstanding! You\'re mastering your goal and becoming the person you want to be.', day_offset: 20 },
    
    // Completion reward
    { type: 'completion', title: 'Goal Mastered!', description: 'Congratulations! You\'ve completed your 21-day transformation journey. You should be incredibly proud of your dedication and growth.' }
  ];

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

// AI-powered plan generation with Google Gemini
const generateTasksWithAI = async (category: string, title: string, description: string, detailedPlan: boolean = false): Promise<TaskTemplate[]> => {
  // TEMPORARILY DISABLE AI AND USE TEMPLATE DIRECTLY FOR TESTING
  console.log('🤖 AI generation temporarily disabled, using template directly');
  return generateTasksForCategory(category, title, description);
  
  /* ORIGINAL AI CODE COMMENTED OUT FOR TESTING
  try {
    const prompt = detailedPlan ? `
      Create a comprehensive 21-day transformation roadmap with detailed hourly tasks for achieving this goal:
      
      Title: ${title}
      Description: ${description}
      Category: ${category}
      
      Generate a complete transformation journey with 3-5 tasks per day (63-105 total tasks):
      
      WEEK 1 (Days 1-7): Foundation & Awareness
      - Focus on mindset shifts, habit awareness, and initial actions
      - Morning tasks (7-9 AM): mindset work, planning, intention setting
      - Mid-morning tasks (10-11 AM): learning, research, skill building
      - Afternoon tasks (2-4 PM): application, practice, real-world actions
      - Evening tasks (7-9 PM): reflection, journaling, preparation for next day
      
      WEEK 2 (Days 8-14): Skill Building & Practice
      - Focus on developing specific skills and consistent practice
      - Morning tasks: practice sessions, skill development
      - Mid-day tasks: application, real-world practice
      - Afternoon tasks: evaluation, adjustment, planning
      - Evening tasks: reflection, progress tracking, next day planning
      
      WEEK 3 (Days 15-21): Mastery & Integration
      - Focus on advanced techniques and habit integration
      - Morning tasks: advanced practice, optimization
      - Mid-day tasks: teaching others, sharing knowledge
      - Afternoon tasks: integration, real-world application
      - Evening tasks: celebration, future planning, legacy building
      
      For each task, provide:
      - title: Specific, actionable task name (max 50 characters)
      - description: Detailed instructions with motivation, specific steps, and expected outcome (max 250 characters)
      - day_offset: Day number (0-20)
      - time_of_day: "morning", "mid_morning", "afternoon", "evening"
      
      Each task should:
      - Build logically on previous tasks
      - Include specific time requirements (15-90 minutes)
      - Have clear success criteria
      - Include motivational elements
      - Connect to the overall goal
      - Be actionable and measurable
      
      Return ONLY a JSON array of tasks, no additional text.
      
      Example format:
      [
        {
          "title": "Vision Mapping Session",
          "description": "Spend 20 minutes creating a detailed vision map of your goal. Include specific outcomes, timelines, and emotional benefits. Use colors and images to make it vivid.",
          "day_offset": 0,
          "time_of_day": "morning"
        },
        {
          "title": "Research Best Practices",
          "description": "Spend 30 minutes researching proven strategies and success stories related to your goal. Take notes on key insights and actionable tips.",
          "day_offset": 0,
          "time_of_day": "mid_morning"
        }
      ]
    ` : `
      Create a personalized 21-day transformation plan for achieving this goal:
      
      Title: ${title}
      Description: ${description}
      Category: ${category}
      
      Generate exactly 21 daily tasks that are:
      - Specific and actionable
      - Progressive (building on each other)
      - Realistic and achievable
      - Motivating and engaging
      
      For each task, provide:
      - title: Short, clear task name (max 50 characters)
      - description: Detailed instructions with motivation (max 200 characters)
      - day_offset: Day number (0-20)
      - time_of_day: "morning", "afternoon", or "evening"
      
      Return ONLY a JSON array of tasks, no additional text.
    `;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + Deno.env.get('GOOGLE_AI_API_KEY'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI API error: ${response.status}`, errorText);
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
      const tasks = JSON.parse(cleanedText);
      console.log('Parsed tasks:', tasks.length, 'tasks');
      
      // Validate that we got a reasonable number of tasks (at least 21, ideally 63-105)
      if (tasks.length < 21) {
        console.warn(`Expected at least 21 tasks, got ${tasks.length}. Falling back to template.`);
        throw new Error(`Expected at least 21 tasks, got ${tasks.length}`);
      }
      
      console.log(`✅ AI generated ${tasks.length} tasks successfully`);
      
      return tasks;
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Raw text:', cleanedText);
      throw parseError;
    }
  } catch (error) {
    console.error('AI generation failed, falling back to templates:', error);
    return generateTasksForCategory(category, title, description);
  }
  */
};

// Template-based plan generation (fallback) - generates detailed daily plan with multiple tasks per day
const generateTasksForCategory = (category: string, title: string, description: string): TaskTemplate[] => {
  const tasks: TaskTemplate[] = [];
  
  // Generate 4 tasks per day for 21 days = 84 total tasks
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
          time_of_day: 'mid_morning'
        },
        {
          title: `Day ${dayNumber}: First Action Step`,
          description: `Take one concrete action toward your goal, no matter how small. Focus on progress over perfection.`,
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
          time_of_day: 'mid_morning'
        },
        {
          title: `Day ${dayNumber}: Consistency Building`,
          description: `Focus on building consistent daily habits around your goal. Track your consistency.`,
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
          title: `Day ${dayNumber}: Knowledge Sharing`,
          description: `Share your knowledge and experience with others. Teaching reinforces learning.`,
          day_offset: day,
          time_of_day: 'mid_morning'
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

    const { user_id, goal_id, category, title, description, timezone, start_date, language = 'en', detailed_plan = false }: GeneratePlanRequest = 
      await req.json();

    console.log('📋 Plan generation request:', {
      user_id,
      goal_id,
      category,
      title,
      description,
      detailed_plan
    });

    // Generate tasks using AI (with template fallback)
    const taskTemplates = await generateTasksWithAI(category, title, description, detailed_plan);
    
    console.log('📋 Generated tasks:', taskTemplates.length, 'tasks');
    
    // Create scheduled tasks
    const startDate = start_date ? new Date(start_date) : new Date();
    const tasksToInsert = taskTemplates.map((template) => {
      const taskDate = new Date(startDate);
      taskDate.setDate(taskDate.getDate() + template.day_offset);
      
      const scheduledTime = getTimeForSchedule(taskDate, template.time_of_day);
      
      return {
        goal_id,
        title: template.title,
        description: template.description,
        run_at: scheduledTime.toISOString(),
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
    await generateRewards(goal_id, supabaseClient, category, title);

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

    return new Response(
      JSON.stringify({
        success: true,
        tasks: insertedTasks,
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
