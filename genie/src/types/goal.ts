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
