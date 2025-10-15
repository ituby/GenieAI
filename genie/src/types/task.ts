import { TASK_TIMES } from '../config/constants';

export type TaskTime = typeof TASK_TIMES[number];

export interface Subtask {
  title: string;
  estimated_minutes: number;
  completed?: boolean;
}

export interface Task {
  id: string;
  goal_id: string;
  title: string;
  description: string;
  run_at: string;
  completed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at?: string;
  intensity?: string;
  // New subtasks structure
  subtasks?: Subtask[];
  time_allocation_minutes?: number;
  total_subtasks?: number;
  subtasks_completed?: number;
}

export interface TaskWithGoal extends Task {
  goal: {
    id: string;
    title: string;
    category: string;
    color?: string;
  };
}

export interface DailyTasks {
  date: string;
  tasks: TaskWithGoal[];
  completed_count: number;
  total_count: number;
}
