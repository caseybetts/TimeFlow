
import type { LucideIcon } from 'lucide-react';

export const TASK_TYPES = ["fsv", "rtp", "tl", "appointment"] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const SPACECRAFT_OPTIONS = ["GE01", "WV01", "WV02", "WV03", "LG01", "LG02", "LG03", "LG04", "LG05", "LG06"] as const;
export type Spacecraft = (typeof SPACECRAFT_OPTIONS)[number];

export interface Task {
  id: string;
  name?: string;
  spacecraft: Spacecraft;
  startTime: string; // ISO string, represents start of the entire activity (pre-action phase) in UTC
  // duration: number; // Removed: Core duration is no longer used
  type: TaskType;
  preActionDuration: number; // in minutes, duration of the first phase
  postActionDuration: number; // in minutes, duration of the second phase
  isCompleted?: boolean;
}

// Represents the full definition of a task type, including non-configurable parts
export interface TaskTypeOption {
  value: TaskType;
  label: string;
  icon: LucideIcon;
  color: string;
  preActionDuration: number; // Duration of the "preparation" phase
  // preActionLabel?: string; // Removed
  postActionDuration: number; // Duration of the "follow-up" phase
  // postActionLabel?: string; // Removed
}

// Represents the fields a user can configure for a task type
export interface UserEditableTaskTypeFields {
  label: string;
  preActionDuration: number;
  // preActionLabel?: string; // Removed
  postActionDuration: number;
  // postActionLabel?: string; // Removed
}

// Structure for storing user configurations in localStorage
export type UserTaskTypesConfig = Partial<Record<TaskType, UserEditableTaskTypeFields>>;

// Temporary type for rows in the SpreadsheetTaskInput
export interface SpreadsheetTaskRow {
  tempId: string;
  name?: string;
  spacecraft: Spacecraft;
  startTime: string; // Store as string matching datetime-local input
  type: TaskType;
}

