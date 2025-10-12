import { TASK_TIMES } from '../config/constants';

export type TaskTime = typeof TASK_TIMES[number];

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
