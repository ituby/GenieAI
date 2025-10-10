import { create } from 'zustand';
import { Goal, GoalWithProgress } from '../types/goal';
import { supabase } from '../services/supabase/client';

interface GoalState {
  goals: GoalWithProgress[];
  activeGoals: GoalWithProgress[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchGoals: (userId: string) => Promise<void>;
  createGoal: (goal: Omit<Goal, 'id' | 'created_at' | 'updated_at'>) => Promise<Goal>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  activeGoals: [],
  loading: false,
  error: null,

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  fetchGoals: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('goals')
        .select(`
          *,
          goal_tasks (
            id,
            completed
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const goalsWithProgress: GoalWithProgress[] = data.map((goal) => {
        const totalTasks = goal.goal_tasks?.length || 0;
        const completedTasks = goal.goal_tasks?.filter((task: any) => task.completed).length || 0;
        const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        return {
          ...goal,
          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          completion_percentage: completionPercentage,
          current_streak: 0, // TODO: Calculate streak
        };
      });

      const activeGoals = goalsWithProgress.filter(goal => goal.status === 'active');

      set({
        goals: goalsWithProgress,
        activeGoals,
        loading: false,
      });
    } catch (error: any) {
      set({
        error: error.message,
        loading: false,
      });
    }
  },

  createGoal: async (goalData) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('goals')
        .insert([goalData])
        .select()
        .single();

      if (error) throw error;

      // Refresh goals after creation
      const { goals } = get();
      const newGoalWithProgress: GoalWithProgress = {
        ...data,
        total_tasks: 0,
        completed_tasks: 0,
        completion_percentage: 0,
        current_streak: 0,
      };

      set({
        goals: [newGoalWithProgress, ...goals],
        activeGoals: data.status === 'active' 
          ? [newGoalWithProgress, ...get().activeGoals]
          : get().activeGoals,
        loading: false,
      });

      return data;
    } catch (error: any) {
      set({
        error: error.message,
        loading: false,
      });
      throw error;
    }
  },

  updateGoal: async (id: string, updates: Partial<Goal>) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Update local state
      const { goals, activeGoals } = get();
      const updatedGoals = goals.map(goal => 
        goal.id === id ? { ...goal, ...updates } : goal
      );
      
      // If status changed to paused or completed, remove from active goals
      let updatedActiveGoals = activeGoals;
      if (updates.status && updates.status !== 'active') {
        updatedActiveGoals = activeGoals.filter(goal => goal.id !== id);
      } else if (updates.status === 'active') {
        // If status changed to active, add back to active goals
        const goalToAdd = updatedGoals.find(goal => goal.id === id);
        if (goalToAdd && !activeGoals.find(goal => goal.id === id)) {
          updatedActiveGoals = [...activeGoals, goalToAdd];
        }
      } else {
        // For other updates, just update the goal in active goals
        updatedActiveGoals = activeGoals.map(goal => 
          goal.id === id ? { ...goal, ...updates } : goal
        );
      }

      set({
        goals: updatedGoals,
        activeGoals: updatedActiveGoals,
        loading: false,
      });
    } catch (error: any) {
      set({
        error: error.message,
        loading: false,
      });
      throw error;
    }
  },

  deleteGoal: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update local state
      const { goals, activeGoals } = get();
      set({
        goals: goals.filter(goal => goal.id !== id),
        activeGoals: activeGoals.filter(goal => goal.id !== id),
        loading: false,
      });
    } catch (error: any) {
      set({
        error: error.message,
        loading: false,
      });
      throw error;
    }
  },
}));
