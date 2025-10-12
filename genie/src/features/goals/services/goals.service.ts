import { supabase } from '../../../services/supabase/client';
import { googleAIService } from '../../../services/ai/googleAI.service';
import { Goal, GoalCategory } from '../../../types/goal';

export class GoalsService {
  static async createGoalWithAIPlan(
    userId: string,
    title: string,
    description: string,
    category: GoalCategory,
    timezone: string = 'UTC'
  ): Promise<Goal> {
    try {
      // First, create the goal
      const { data: goal, error: goalError } = await supabase
        .from('goals')
        .insert([{
          user_id: userId,
          title,
          description,
          category,
          status: 'active',
          start_date: new Date().toISOString().split('T')[0],
        }])
        .select()
        .single();

      if (goalError) throw goalError;

      // Then, generate AI-powered plan
      try {
        const response = await supabase.functions.invoke('generate-plan', {
          body: {
            user_id: userId,
            goal_id: goal.id,
            category,
            title,
            description,
            timezone,
          },
        });

        if (response.error) {
          console.error('Plan generation error:', response.error);
          // Goal is still created even if plan generation fails
        }
      } catch (planError) {
        console.error('Failed to generate plan:', planError);
        // Goal is still created even if plan generation fails
      }

      return goal;
    } catch (error) {
      console.error('Error creating goal:', error);
      throw error;
    }
  }

  static async testAIConnection(): Promise<boolean> {
    try {
      return await googleAIService.testConnection();
    } catch (error) {
      console.error('AI connection test failed:', error);
      return false;
    }
  }

  static async generateLocalPlan(
    title: string,
    description: string,
    category: GoalCategory
  ): Promise<any[]> {
    try {
      return await googleAIService.generateGoalPlan(title, description, category);
    } catch (error) {
      console.error('Local AI plan generation failed:', error);
      throw error;
    }
  }
}

