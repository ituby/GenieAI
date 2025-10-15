import { supabase } from './supabase/client';
import { useGoalStore } from '../store/useGoalStore';
import { TaskWithGoal } from '../types/task';
import { Reward } from '../types/goal';

export interface UserData {
  goals: any[];
  activeGoals: any[];
  todaysTasks: TaskWithGoal[];
  todaysTasksCount: number;
  totalPoints: number;
  recentRewards: Reward[];
  userTokens: {
    used: number;
    remaining: number;
    total: number;
    isSubscribed: boolean;
    monthlyTokens: number;
  };
}

export class DataLoadingService {
  private static instance: DataLoadingService;
  private loadedData: UserData | null = null;
  private loadingPromise: Promise<UserData> | null = null;

  static getInstance(): DataLoadingService {
    if (!DataLoadingService.instance) {
      DataLoadingService.instance = new DataLoadingService();
    }
    return DataLoadingService.instance;
  }

  async preloadUserData(userId: string): Promise<UserData> {
    // If already loading, return the existing promise
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    // If data already loaded, return cached data
    if (this.loadedData) {
      return this.loadedData;
    }

    console.log('🔄 Preloading user data for:', userId);

    this.loadingPromise = this.loadUserData(userId);
    
    try {
      this.loadedData = await this.loadingPromise;
      console.log('✅ User data preloaded successfully');
      return this.loadedData;
    } catch (error) {
      console.error('❌ Failed to preload user data:', error);
      this.loadingPromise = null;
      throw error;
    }
  }

  private async loadUserData(userId: string): Promise<UserData> {
    try {
      // Load all data in parallel for better performance
      const [
        goalsData,
        todaysTasksData,
        totalPointsData,
        recentRewardsData,
        userTokensData
      ] = await Promise.all([
        this.fetchGoals(userId),
        this.fetchTodaysTasks(userId),
        this.fetchTotalPoints(userId),
        this.fetchRecentRewards(userId),
        this.fetchUserTokens(userId)
      ]);

      const activeGoals = goalsData.filter((goal: any) => goal.status === 'active');

      return {
        goals: goalsData,
        activeGoals,
        todaysTasks: todaysTasksData.tasks,
        todaysTasksCount: todaysTasksData.count,
        totalPoints: totalPointsData,
        recentRewards: recentRewardsData,
        userTokens: userTokensData
      };
    } catch (error) {
      console.error('❌ Error loading user data:', error);
      throw error;
    }
  }

  private async fetchGoals(userId: string): Promise<any[]> {
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

    return data.map((goal) => {
      const totalTasks = goal.goal_tasks?.length || 0;
      const completedTasks = goal.goal_tasks?.filter((task: any) => task.completed).length || 0;
      const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      return {
        ...goal,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        completion_percentage: completionPercentage,
        current_streak: 0,
      };
    });
  }

  private async fetchTodaysTasks(userId: string): Promise<{ tasks: TaskWithGoal[], count: number }> {
    // First check if user has any goals
    const { data: userGoals } = await supabase
      .from('goals')
      .select('id, status')
      .eq('user_id', userId);
    
    if (!userGoals || userGoals.length === 0) {
      return { tasks: [], count: 0 };
    }

    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );

    const { data, error } = await supabase
      .from('goal_tasks')
      .select(`
        id,
        title,
        description,
        run_at,
        completed,
        completed_at,
        goal_id,
        intensity,
        created_at,
        updated_at,
        goals!inner(
          id,
          title,
          category,
          user_id,
          color,
          status
        )
      `)
      .eq('goals.user_id', userId)
      .eq('goals.status', 'active')
      .gte('run_at', startOfDay.toISOString())
      .lt('run_at', endOfDay.toISOString())
      .order('run_at', { ascending: true });

    if (error) throw error;

    // Transform data to match TaskWithGoal interface
    const transformedTasks: TaskWithGoal[] = (data || []).map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      run_at: task.run_at,
      completed: task.completed,
      completed_at: task.completed_at,
      goal_id: task.goal_id,
      intensity: task.intensity,
      created_at: task.created_at,
      updated_at: task.updated_at,
      goal: {
        id: task.goals.id,
        title: task.goals.title,
        category: task.goals.category,
        color: task.goals.color
      }
    }));

    return { tasks: transformedTasks, count: transformedTasks.length };
  }

  private async fetchTotalPoints(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('user_points')
      .select('points')
      .eq('user_id', userId);

    if (error) throw error;

    const total = data?.reduce((sum, item) => sum + (item.points || 0), 0) || 0;
    return total;
  }

  private async fetchRecentRewards(userId: string): Promise<Reward[]> {
    const { data, error } = await supabase
      .from('rewards')
      .select(`
        *,
        goal:goals(id, title, category)
      `)
      .eq('unlocked', true)
      .order('unlocked_at', { ascending: false })
      .limit(3);

    if (error) throw error;

    return data || [];
  }

  private async fetchUserTokens(userId: string): Promise<{ used: number, remaining: number, total: number, isSubscribed: boolean, monthlyTokens: number }> {
    const { data, error } = await supabase
      .from('user_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

    if (data) {
      return {
        used: data.tokens_used || 0,
        remaining: data.tokens_remaining || 0,
        total: data.total_tokens || 0,
        isSubscribed: data.is_subscribed || false,
        monthlyTokens: data.monthly_tokens || 0
      };
    } else {
      return {
        used: 0,
        remaining: 0,
        total: 0,
        isSubscribed: false,
        monthlyTokens: 0
      };
    }
  }

  // Method to clear cached data (useful for logout or data refresh)
  clearCache(): void {
    this.loadedData = null;
    this.loadingPromise = null;
    console.log('🧹 Cleared data loading cache');
  }

  // Method to get cached data without loading
  getCachedData(): UserData | null {
    return this.loadedData;
  }

  // Method to check if data is currently loading
  isLoading(): boolean {
    return this.loadingPromise !== null;
  }
}

export const dataLoadingService = DataLoadingService.getInstance();
