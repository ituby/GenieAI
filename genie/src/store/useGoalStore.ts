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
  createGoal: (
    goal: Omit<Goal, 'id' | 'created_at' | 'updated_at'>
  ) => Promise<Goal>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  refreshGoal: (goalId: string) => Promise<void>;
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
        .select(
          `
          *,
          goal_tasks (
            id,
            completed
          )
        `
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const goalsWithProgress: GoalWithProgress[] = data.map((goal) => {
        const totalTasks = goal.goal_tasks?.length || 0;
        const completedTasks =
          goal.goal_tasks?.filter((task: any) => task.completed).length || 0;
        const completionPercentage =
          totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        return {
          ...goal,
          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          completion_percentage: completionPercentage,
          current_streak: 0, // TODO: Calculate streak
        };
      });

      // Include active goals and failed goals with 0 tasks (so user can retry)
      const activeGoals = goalsWithProgress.filter(
        (goal) => 
          (goal.status === 'active' && goal.completion_percentage < 100) ||
          (goal.status === 'failed' && goal.total_tasks === 0)
      );

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
        activeGoals:
          data.status === 'active'
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
      const updatedGoals = goals.map((goal) =>
        goal.id === id ? { ...goal, ...updates } : goal
      );

      // If status changed to paused or completed, remove from active goals
      let updatedActiveGoals = activeGoals;
      if (updates.status && updates.status !== 'active') {
        updatedActiveGoals = activeGoals.filter((goal) => goal.id !== id);
      } else if (updates.status === 'active') {
        // If status changed to active, add back to active goals
        const goalToAdd = updatedGoals.find((goal) => goal.id === id);
        if (goalToAdd && !activeGoals.find((goal) => goal.id === id)) {
          updatedActiveGoals = [...activeGoals, goalToAdd];
        }
      } else {
        // For other updates, just update the goal in active goals
        updatedActiveGoals = activeGoals.map((goal) =>
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
      // Delete goal tasks explicitly to avoid orphaned tasks in dashboards
      await supabase.from('goal_tasks').delete().eq('goal_id', id);

      // Delete scheduled notifications for this goal (both task-level and goal-level)
      await supabase.from('scheduled_notifications').delete().eq('goal_id', id);

      // Delete in-app notifications for this goal
      await supabase.from('notifications').delete().eq('goal_id', id);

      // Then delete the goal
      const { error } = await supabase.from('goals').delete().eq('id', id);

      if (error) throw error;

      // Update local state
      const { goals, activeGoals } = get();
      set({
        goals: goals.filter((goal) => goal.id !== id),
        activeGoals: activeGoals.filter((goal) => goal.id !== id),
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

  refreshGoal: async (goalId: string) => {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select(
          `
          *,
          goal_tasks (
            id,
            completed
          )
        `
        )
        .eq('id', goalId)
        .single();

      if (error) {
        // If goal doesn't exist (PGRST116), remove it from local state
        if (error.code === 'PGRST116') {
          console.log(`🧹 Goal ${goalId} not found in database, removing from local state`);
          const { goals, activeGoals } = get();
          const updatedGoals = goals.filter((goal) => goal.id !== goalId);
          const updatedActiveGoals = activeGoals.filter((goal) => goal.id !== goalId);
          set({
            goals: updatedGoals,
            activeGoals: updatedActiveGoals,
          });
          return;
        }
        throw error;
      }

      const totalTasks = data.goal_tasks?.length || 0;
      const completedTasks =
        data.goal_tasks?.filter((task: any) => task.completed).length || 0;
      const completionPercentage =
        totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      const updatedGoal: GoalWithProgress = {
        ...data,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        completion_percentage: completionPercentage,
        current_streak: data.current_streak || 0,
      };

      // Update local state
      const { goals, activeGoals } = get();
      const updatedGoals = goals.map((goal) =>
        goal.id === goalId ? updatedGoal : goal
      );

      // Update active goals - include failed goals with 0 tasks
      let updatedActiveGoals = activeGoals.map((goal) =>
        goal.id === goalId ? updatedGoal : goal
      );
      
      // If goal is failed with 0 tasks and not in activeGoals, add it
      if (updatedGoal.status === 'failed' && updatedGoal.total_tasks === 0) {
        if (!updatedActiveGoals.find(g => g.id === goalId)) {
          updatedActiveGoals = [...updatedActiveGoals, updatedGoal];
        }
      }
      // If goal is no longer active or failed with tasks, remove it
      else if (updatedGoal.status !== 'active' || updatedGoal.completion_percentage >= 100) {
        updatedActiveGoals = updatedActiveGoals.filter(g => g.id !== goalId);
      }

      set({
        goals: updatedGoals,
        activeGoals: updatedActiveGoals,
      });

      console.log(`🔄 Goal ${goalId} refreshed: ${totalTasks} tasks (${completedTasks} completed)`);
    } catch (error: any) {
      console.error('Error refreshing goal:', error);
    }
  },
}));
