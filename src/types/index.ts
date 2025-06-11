import type { LucideIcon } from 'lucide-react';

export const TASK_TYPES = ["work", "personal", "errands", "appointment"] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export interface Task {
  id: string;
  name: string;
  startTime: string; // ISO string
  duration: number; // in minutes
  type: TaskType;
  buffer: number; // in minutes, inferred
  isCompleted?: boolean;
}

export interface TaskTypeOption {
  value: TaskType;
  label: string;
  icon: LucideIcon;
  color: string; // Tailwind color class or hex
  defaultBuffer: number; // minutes
}
