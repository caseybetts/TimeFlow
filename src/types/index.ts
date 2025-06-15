
import type { LucideIcon } from 'lucide-react';

export const TASK_TYPES = ["fsv", "rtp", "tl", "appointment"] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const SPACECRAFT_OPTIONS = ["GE01", "WV01", "WV02", "WV03", "LG01", "LG02", "LG03", "LG04", "LG05", "LG06"] as const;
export type Spacecraft = (typeof SPACECRAFT_OPTIONS)[number];

export interface Task {
  id: string;
  name?: string;
  spacecraft: Spacecraft;
  startTime: string; // ISO string, represents the start of the core event time in UTC
  type: TaskType;
  preActionDuration: number; // in minutes, duration of the phase before startTime
  postActionDuration: number; // in minutes, duration of the phase after startTime
  isCompleted?: boolean;
}

// Represents the full definition of a task type, including non-configurable parts
export interface TaskTypeOption {
  value: TaskType;
  label: string;
  icon: LucideIcon;
  color: string;
  preActionDuration: number; 
  postActionDuration: number; 
}

// Represents the fields a user can configure for a task type
export interface UserEditableTaskTypeFields {
  label: string;
  preActionDuration: number;
  postActionDuration: number;
}

// Structure for storing user configurations in localStorage
export type UserTaskTypesConfig = Partial<Record<TaskType, UserEditableTaskTypeFields>>;

// Temporary type for rows in the SpreadsheetTaskInput
export interface SpreadsheetTaskRow {
  tempId: string;
  name?: string;
  spacecraft: Spacecraft;
  startTime: string; // Store as string matching datetime-local input, represents core event time
  type: TaskType;
}

