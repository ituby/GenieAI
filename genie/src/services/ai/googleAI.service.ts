import { GoogleGenerativeAI } from '@google/generative-ai';
import Constants from 'expo-constants';

class GoogleAIService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    console.log('🔧 Initializing Google AI Service...');
    
    // Try multiple sources for the API key
    const apiKeyFromConstants = Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_AI_API_KEY as string;
    const apiKeyFromEnv = process.env.EXPO_PUBLIC_GOOGLE_AI_API_KEY;
    const apiKey = apiKeyFromConstants || apiKeyFromEnv || 'AIzaSyAzHeO1osVlxtsyj_zC5UdbQt4-0YYzFu4';
    
    console.log('🔧 Constants.expoConfig?.extra:', Constants.expoConfig?.extra);
    console.log('🔧 process.env.EXPO_PUBLIC_GOOGLE_AI_API_KEY:', apiKeyFromEnv ? `${apiKeyFromEnv.substring(0, 10)}...` : 'NOT FOUND');
    console.log('🔑 Google AI API Key loaded:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');
    
    if (!apiKey) {
      console.warn('⚠️ Google AI API key not found, AI features will be disabled');
      console.warn('⚠️ Available keys in extra:', Object.keys(Constants.expoConfig?.extra || {}));
      this.genAI = null as any;
      this.model = null as any;
      return;
    }
    
    try {
      console.log('🔧 Creating GoogleGenerativeAI instance...');
      this.genAI = new GoogleGenerativeAI(apiKey);
      console.log('🔧 Getting generative model...');
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      console.log('✅ Google AI service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Google AI service:', error);
      this.genAI = null as any;
      this.model = null as any;
    }
  }

  async generateGoalPlan(goalTitle: string, goalDescription: string, category: string): Promise<any[]> {
    if (!this.genAI || !this.model) {
      console.warn('⚠️ AI service not available, using template plan');
      return this.getTemplatePlan(category);
    }
    
    try {
      const prompt = `
        You are a professional life coach and goal achievement expert. Create a comprehensive, personalized 21-day transformation plan for this specific goal:
        
        GOAL DETAILS:
        Title: "${goalTitle}"
        Description: "${goalDescription}"
        Category: ${category}
        
        REQUIREMENTS:
        - Generate exactly 21 daily tasks (one per day)
        - Each task must be SPECIFIC, ACTIONABLE, and MEASURABLE
        - Tasks should build progressively on each other
        - Include realistic time estimates (15-60 minutes per task)
        - Make tasks relevant to the specific goal and category
        - Use professional coaching methodology
        
        CATEGORY-SPECIFIC GUIDELINES:
        ${this.getCategoryGuidelines(category)}
        
        TASK STRUCTURE:
        Each task must include:
        - title: Clear, specific action (max 40 characters)
        - description: Detailed step-by-step instructions with specific actions, tools needed, and success criteria (max 200 characters)
        - day_offset: Day number (0-20)
        - time_of_day: "morning", "afternoon", or "evening"
        
        PROFESSIONAL STANDARDS:
        - Use evidence-based approaches
        - Include specific metrics and milestones
        - Provide actionable steps with clear outcomes
        - Ensure tasks are achievable within the time frame
        - Build confidence through progressive difficulty
        
        Return ONLY a valid JSON array with exactly 21 tasks. No additional text or explanations.
        
        Example format:
        [
          {
            "title": "Goal Analysis & Vision Setting",
            "description": "Spend 30 minutes analyzing your current situation, defining success metrics, and creating a detailed vision board with specific outcomes and timelines.",
            "day_offset": 0,
            "time_of_day": "morning"
          }
        ]
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse the JSON response
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      const tasks = JSON.parse(cleanedText);
      
      return tasks;
    } catch (error) {
      console.error('Error generating AI plan:', error);
      
      // Fallback to template-based plan if AI fails
      return this.getTemplatePlan(category);
    }
  }

  private getCategoryGuidelines(category: string): string {
    const guidelines: Record<string, string> = {
      lifestyle: `
        - Focus on habit formation and lifestyle changes
        - Include health, wellness, and daily routine improvements
        - Emphasize sustainable practices and gradual changes
        - Address nutrition, exercise, sleep, and stress management
        - Include social and environmental factors`,
      
      career: `
        - Focus on professional development and skill building
        - Include networking, learning, and career advancement
        - Emphasize measurable outcomes and professional growth
        - Address industry-specific knowledge and competencies
        - Include portfolio building and professional branding`,
      
      mindset: `
        - Focus on mental health and cognitive development
        - Include meditation, mindfulness, and emotional intelligence
        - Emphasize positive thinking and mental resilience
        - Address limiting beliefs and mental barriers
        - Include self-awareness and personal growth`,
      
      character: `
        - Focus on personal values and ethical development
        - Include integrity, leadership, and moral development
        - Emphasize character traits and personal values
        - Address relationships and social responsibility
        - Include self-reflection and moral reasoning`,
      
      custom: `
        - Focus on the specific goal requirements
        - Include relevant skills and knowledge areas
        - Emphasize practical application and real-world results
        - Address specific challenges and obstacles
        - Include measurement and progress tracking`
    };
    
    return guidelines[category] || guidelines.custom;
  }

  private getTemplatePlan(category: string): any[] {
    const templates: Record<string, any[]> = {
      lifestyle: [
        { title: 'Baseline Assessment', description: 'Spend 30 minutes documenting your current lifestyle habits, health metrics, and daily routines. Create a detailed baseline for comparison.', day_offset: 0, time_of_day: 'morning' },
        { title: 'Goal Breakdown & Planning', description: 'Break down your lifestyle goal into specific, measurable milestones. Research evidence-based strategies and create a detailed action plan.', day_offset: 1, time_of_day: 'afternoon' },
        { title: 'Habit Foundation Setup', description: 'Identify 2-3 keystone habits that will drive your lifestyle change. Set up tracking systems and environmental cues for success.', day_offset: 2, time_of_day: 'morning' },
        { title: 'First Implementation Day', description: 'Execute your first lifestyle change with full commitment. Document the experience, challenges, and initial results.', day_offset: 3, time_of_day: 'morning' },
        { title: 'Progress Review & Optimization', description: 'Analyze your first week\'s data, identify patterns, and optimize your approach based on what\'s working and what isn\'t.', day_offset: 7, time_of_day: 'evening' },
      ],
      career: [
        { title: 'Career Vision & Strategy', description: 'Define your 5-year career vision, identify key milestones, and create a strategic roadmap with specific success metrics and timelines.', day_offset: 0, time_of_day: 'morning' },
        { title: 'Skills Gap Analysis', description: 'Conduct a comprehensive skills assessment, identify gaps, and prioritize learning objectives based on industry demands and career trajectory.', day_offset: 1, time_of_day: 'afternoon' },
        { title: 'Professional Network Expansion', description: 'Research and connect with 3 industry professionals. Prepare thoughtful questions and value propositions for meaningful conversations.', day_offset: 2, time_of_day: 'afternoon' },
        { title: 'Personal Brand Enhancement', description: 'Audit and optimize your professional profiles, portfolio, and online presence. Update with recent achievements and strategic positioning.', day_offset: 3, time_of_day: 'evening' },
        { title: 'Skill Development Session', description: 'Complete a focused 45-minute learning session on a priority skill. Apply new knowledge through a practical exercise or project.', day_offset: 4, time_of_day: 'morning' },
      ],
      mindset: [
        { title: 'Mental State Assessment', description: 'Conduct a 30-minute self-assessment of your current mindset, limiting beliefs, and mental patterns. Document your baseline mental state.', day_offset: 0, time_of_day: 'morning' },
        { title: 'Cognitive Restructuring Session', description: 'Identify 3 core limiting beliefs and systematically challenge them with evidence-based reframing techniques and positive alternatives.', day_offset: 1, time_of_day: 'morning' },
        { title: 'Mindfulness & Awareness Training', description: 'Practice 20 minutes of focused mindfulness meditation, followed by 10 minutes of mindful observation of your thoughts and emotions.', day_offset: 2, time_of_day: 'afternoon' },
        { title: 'Gratitude & Positivity Protocol', description: 'Complete a structured gratitude practice, write 5 specific positive affirmations, and engage in 15 minutes of positive visualization.', day_offset: 3, time_of_day: 'evening' },
        { title: 'Mental Resilience Building', description: 'Practice stress management techniques, emotional regulation strategies, and develop a personal resilience toolkit for challenging situations.', day_offset: 4, time_of_day: 'evening' },
      ],
      character: [
        { title: 'Character Values Assessment', description: 'Spend 30 minutes identifying your core values, character strengths, and areas for development. Create a personal character development plan.', day_offset: 0, time_of_day: 'morning' },
        { title: 'Ethical Framework Development', description: 'Define your personal ethical principles and decision-making framework. Practice applying these principles to real-life scenarios.', day_offset: 1, time_of_day: 'afternoon' },
        { title: 'Role Model Analysis & Learning', description: 'Study 2-3 individuals who exemplify your target character traits. Analyze their behaviors and extract actionable lessons.', day_offset: 2, time_of_day: 'evening' },
        { title: 'Character in Action Practice', description: 'Identify and execute 3 specific actions that demonstrate your target character traits in real-world situations.', day_offset: 3, time_of_day: 'afternoon' },
        { title: 'Character Development Journal', description: 'Reflect on your character development progress, document insights, and plan next steps for continued growth.', day_offset: 4, time_of_day: 'evening' },
      ],
      custom: [
        { title: 'Goal Analysis & Strategic Planning', description: 'Conduct a comprehensive analysis of your goal, break it into measurable milestones, and create a detailed strategic plan with specific success metrics.', day_offset: 0, time_of_day: 'morning' },
        { title: 'Research & Best Practices Study', description: 'Research evidence-based strategies, expert recommendations, and success stories related to your goal. Document key insights and actionable approaches.', day_offset: 1, time_of_day: 'afternoon' },
        { title: 'Foundation Building & First Action', description: 'Establish the foundational elements for your goal and execute your first concrete action step with full commitment and documentation.', day_offset: 2, time_of_day: 'morning' },
        { title: 'Progress Assessment & Optimization', description: 'Evaluate your initial progress, analyze what\'s working and what isn\'t, and optimize your approach based on data and feedback.', day_offset: 3, time_of_day: 'evening' },
        { title: 'Habit Formation & Consistency Protocol', description: 'Develop and implement a systematic approach to building consistent habits around your goal, including tracking and accountability measures.', day_offset: 7, time_of_day: 'morning' },
      ],
    };

    return templates[category] || templates.custom;
  }

  async testConnection(): Promise<boolean> {
    if (!this.genAI || !this.model) {
      console.warn('⚠️ AI service not available for connection test');
      return false;
    }
    
    try {
      const apiKeyFromConstants = Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_AI_API_KEY as string;
      const apiKeyFromEnv = process.env.EXPO_PUBLIC_GOOGLE_AI_API_KEY;
      const apiKey = apiKeyFromConstants || apiKeyFromEnv || 'AIzaSyAzHeO1osVlxtsyj_zC5UdbQt4-0YYzFu4';
      const projectId = Constants.expoConfig?.extra?.GOOGLE_PROJECT_ID as string;
      const projectNumber = Constants.expoConfig?.extra?.GOOGLE_PROJECT_NUMBER as string;
      
      console.log('🤖 Testing AI connection with key:', apiKey?.substring(0, 10) + '...');
      console.log('🤖 Project ID:', projectId);
      console.log('🤖 Project Number:', projectNumber);
      
      // Try direct API call first
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Hello, respond with "AI connection successful"'
            }]
          }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Response error:', response.status, errorText);
        return false;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      console.log('🤖 AI Response:', text);
      return text.includes('successful');
    } catch (error) {
      console.error('❌ AI connection test failed:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }
}

export const googleAIService = new GoogleAIService();
