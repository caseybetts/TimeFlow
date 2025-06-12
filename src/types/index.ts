
import type { LucideIcon } from 'lucide-react';

export const TASK_TYPES = ["work", "personal", "errands", "appointment"] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const SPACECRAFT_OPTIONS = ["GE01", "WV01", "WV02", "WV03", "LG01", "LG02", "LG03", "LG04", "LG05", "LG06"] as const;
export type Spacecraft = (typeof SPACECRAFT_OPTIONS)[number];

export interface Task {
  id: string;
  name?: string; // Task name is now optional
  spacecraft: Spacecraft;
  startTime: string; // ISO string, represents start of the CORE task in UTC
  duration: number; // in minutes, for the CORE task. Now always 1.
  type: TaskType;
  preActionDuration: number; // in minutes, potentially from configured type
  postActionDuration: number; // in minutes, potentially from configured type
  isCompleted?: boolean;
}

// Represents the full definition of a task type, including non-configurable parts
export interface TaskTypeOption {
  value: TaskType;
  label: string;
  icon: LucideIcon;
  color: string;
  preActionDuration: number;
  preActionLabel?: string;
  postActionDuration: number;
  postActionLabel?: string;
}

// Represents the fields a user can configure for a task type
export interface UserEditableTaskTypeFields {
  label: string;
  preActionDuration: number;
  preActionLabel?: string;
  postActionDuration: number;
  postActionLabel?: string;
}

// Structure for storing user configurations in localStorage
export type UserTaskTypesConfig = Partial<Record<TaskType, UserEditableTaskTypeFields>>;

// Temporary type for rows in the SpreadsheetTaskInput
export interface SpreadsheetTaskRow {
  tempId: string; // Temporary ID for React key purposes
  name?: string;
  spacecraft: Spacecraft;
  startTime: string; // Store as string matching datetime-local input
  // duration is removed as it's now fixed at 1 min
  type: TaskType;
}
