import { GOAL_CATEGORIES, GOAL_STATUSES } from '../config/constants';

export type GoalCategory = typeof GOAL_CATEGORIES[number];
export type GoalStatus = typeof GOAL_STATUSES[number];

export interface Goal {
  id: string;
  user_id: string;
  category: GoalCategory;
  title: string;
  description: string;
  start_date: string;
  status: GoalStatus;
  icon_name?: string; // Phosphor icon name
  color?: string; // AI-selected color
  created_at: string;
  updated_at?: string;
  // Advanced settings
  plan_duration_days?: number;
  preferred_time_ranges?: Array<{
    start_hour: number;
    end_hour: number;
    label: string;
  }>;
  preferred_days?: number[];
  tasks_per_day_min?: number;
  tasks_per_day_max?: number;
}

export interface GoalWithProgress extends Goal {
  total_tasks: number;
  completed_tasks: number;
  completion_percentage: number;
  current_streak: number;
  rewards?: Reward[];
}

export interface Reward {
  id: string;
  goal_id: string;
  type: 'daily' | 'milestone' | 'completion';
  title: string;
  description: string;
  day_offset?: number;
  unlocked: boolean;
  unlocked_at?: string;
  created_at: string;
}
