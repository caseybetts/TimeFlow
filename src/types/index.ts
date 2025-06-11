
import type { LucideIcon } from 'lucide-react';

export const TASK_TYPES = ["work", "personal", "errands", "appointment"] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export interface Task {
  id: string;
  name: string;
  startTime: string; // ISO string, represents start of the CORE task in UTC
  duration: number; // in minutes, for the CORE task
  type: TaskType;
  preActionDuration: number; // in minutes
  postActionDuration: number; // in minutes
  isCompleted?: boolean;
}

export interface TaskTypeOption {
  value: TaskType;
  label: string;
  icon: LucideIcon;
  color: string; // Tailwind color class or hex
  preActionDuration: number; // minutes
  preActionLabel?: string;
  postActionDuration: number; // minutes
  postActionLabel?: string;
}
