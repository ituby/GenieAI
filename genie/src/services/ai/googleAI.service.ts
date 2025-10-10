import { GoogleGenerativeAI } from '@google/generative-ai';
import env from '../../config/env';

class GoogleAIService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(env.EXPO_PUBLIC_GOOGLE_AI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  }

  async generateGoalPlan(goalTitle: string, goalDescription: string, category: string): Promise<any[]> {
    try {
      const prompt = `
        Create a personalized 21-day plan for achieving this goal:
        
        Title: ${goalTitle}
        Description: ${goalDescription}
        Category: ${category}
        
        Generate exactly 21 daily tasks that are:
        - Specific and actionable
        - Progressive (building on each other)
        - Realistic and achievable
        - Motivating and engaging
        
        For each task, provide:
        - title: Short, clear task name
        - description: Detailed instructions (2-3 sentences)
        - day_offset: Day number (0-20)
        - time_of_day: "morning", "afternoon", or "evening"
        
        Return the response as a JSON array of tasks only, no additional text.
        
        Example format:
        [
          {
            "title": "Set Clear Intention",
            "description": "Spend 10 minutes writing down exactly what you want to achieve and why it matters to you. Be specific about your vision.",
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

  private getTemplatePlan(category: string): any[] {
    const templates: Record<string, any[]> = {
      lifestyle: [
        { title: 'Morning Reflection', description: 'Spend 5 minutes reflecting on your goal and setting intentions for the day', day_offset: 0, time_of_day: 'morning' },
        { title: 'Research and Planning', description: 'Research specific steps needed to achieve your lifestyle goal', day_offset: 1, time_of_day: 'afternoon' },
        { title: 'Take First Action', description: 'Take one small concrete step toward your goal today', day_offset: 2, time_of_day: 'morning' },
        { title: 'Track Progress', description: 'Document what you\'ve accomplished and how you feel about your progress', day_offset: 3, time_of_day: 'evening' },
        { title: 'Adjust Strategy', description: 'Review your approach and make any necessary adjustments', day_offset: 7, time_of_day: 'afternoon' },
      ],
      career: [
        { title: 'Define Career Vision', description: 'Write down your specific career goals and timeline', day_offset: 0, time_of_day: 'morning' },
        { title: 'Skills Assessment', description: 'Identify skills you need to develop for your career goal', day_offset: 1, time_of_day: 'afternoon' },
        { title: 'Network Building', description: 'Reach out to one person in your desired field', day_offset: 2, time_of_day: 'afternoon' },
        { title: 'Update Professional Profile', description: 'Update your LinkedIn or resume with recent accomplishments', day_offset: 3, time_of_day: 'evening' },
        { title: 'Learn Something New', description: 'Spend 30 minutes learning a skill relevant to your career goal', day_offset: 4, time_of_day: 'morning' },
      ],
      mindset: [
        { title: 'Mindfulness Practice', description: 'Spend 10 minutes in meditation or mindful breathing', day_offset: 0, time_of_day: 'morning' },
        { title: 'Positive Affirmations', description: 'Write and recite 3 positive affirmations about your goal', day_offset: 1, time_of_day: 'morning' },
        { title: 'Challenge Negative Thoughts', description: 'Identify and reframe one limiting belief today', day_offset: 2, time_of_day: 'afternoon' },
        { title: 'Gratitude Practice', description: 'Write down 3 things you\'re grateful for related to your growth', day_offset: 3, time_of_day: 'evening' },
        { title: 'Visualization Exercise', description: 'Spend 5 minutes visualizing yourself achieving your goal', day_offset: 4, time_of_day: 'evening' },
      ],
      character: [
        { title: 'Self-Reflection', description: 'Reflect on how you want to embody this character trait today', day_offset: 0, time_of_day: 'morning' },
        { title: 'Practice Opportunity', description: 'Look for one opportunity to practice this character trait', day_offset: 1, time_of_day: 'afternoon' },
        { title: 'Role Model Study', description: 'Study someone who exemplifies this character trait', day_offset: 2, time_of_day: 'evening' },
        { title: 'Small Act of Character', description: 'Perform one small act that demonstrates this character trait', day_offset: 3, time_of_day: 'afternoon' },
        { title: 'Character Journal', description: 'Write about how you practiced this character trait today', day_offset: 4, time_of_day: 'evening' },
      ],
      custom: [
        { title: 'Goal Breakdown', description: 'Break your goal into smaller, actionable steps', day_offset: 0, time_of_day: 'morning' },
        { title: 'Research Phase', description: 'Research best practices and strategies for your goal', day_offset: 1, time_of_day: 'afternoon' },
        { title: 'First Action Step', description: 'Take the first concrete action toward your goal', day_offset: 2, time_of_day: 'morning' },
        { title: 'Progress Check', description: 'Evaluate your progress and adjust your approach if needed', day_offset: 3, time_of_day: 'evening' },
        { title: 'Consistency Building', description: 'Focus on building consistent habits around your goal', day_offset: 7, time_of_day: 'morning' },
      ],
    };

    return templates[category] || templates.custom;
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('🤖 Testing AI connection with key:', env.EXPO_PUBLIC_GOOGLE_AI_API_KEY?.substring(0, 10) + '...');
      console.log('🤖 Project ID:', env.GOOGLE_PROJECT_ID);
      console.log('🤖 Project Number:', env.GOOGLE_PROJECT_NUMBER);
      
      // Try direct API call first
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.EXPO_PUBLIC_GOOGLE_AI_API_KEY,
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
      console.error('❌ Error details:', error.message);
      return false;
    }
  }
}

export const googleAIService = new GoogleAIService();
