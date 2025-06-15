
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
  preActionDuration: number; // in minutes, duration of the phase before startTime, specific to this task
  postActionDuration: number; // in minutes, duration of the phase after startTime, specific to this task
  isCompleted?: boolean;
}

// Represents the full definition of a task type, including non-configurable parts
// and default durations.
export interface TaskTypeOption {
  value: TaskType;
  label: string;
  icon: LucideIcon;
  color: string;
  preActionDuration: number; // Default pre-action duration for this type
  postActionDuration: number; // Default post-action duration for this type
}

// Represents the fields a user can configure for a task type (defaults)
export interface UserEditableTaskTypeFields {
  label: string;
  preActionDuration: number;
  postActionDuration: number;
}

// Structure for storing user configurations in localStorage for task type defaults
export type UserTaskTypesConfig = Partial<Record<TaskType, UserEditableTaskTypeFields>>;

// Temporary type for rows in the SpreadsheetTaskInput
export interface SpreadsheetTaskRow {
  tempId: string;
  name?: string;
  spacecraft: Spacecraft;
  startTime: string; // Store as string matching datetime-local input, represents core event time
  type: TaskType;
  preActionDuration?: number; // Optional: user can specify, otherwise default from type
  postActionDuration?: number; // Optional: user can specify, otherwise default from type
}

