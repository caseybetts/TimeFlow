
import type { LucideIcon } from 'lucide-react';

export const TASK_TYPES = ["work", "personal", "errands", "appointment"] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export interface Task {
  id: string;
  name: string;
  startTime: string; // ISO string, represents start of the CORE task in UTC
  duration: number; // in minutes, for the CORE task
  type: TaskType; // This will be the 'value' from TaskTypeOption
  preActionDuration: number; // in minutes, potentially from configured type
  postActionDuration: number; // in minutes, potentially from configured type
  isCompleted?: boolean;
}

// Represents the full definition of a task type, including non-configurable parts
export interface TaskTypeOption {
  value: TaskType; // Fixed identifier (e.g., "work")
  label: string; // User-configurable display name
  icon: LucideIcon; // Fixed icon
  color: string; // Fixed Tailwind color class
  preActionDuration: number; // User-configurable default
  preActionLabel?: string; // User-configurable
  postActionDuration: number; // User-configurable default
  postActionLabel?: string; // User-configurable
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
  name: string;
  startTime: string; // Store as string matching datetime-local input
  duration: string; // Store as string from input, convert to number on submit
  type: TaskType;
}

// For DayScheduleChart time range configuration
export interface DayChartTimeRangeOption {
  id: string; // Unique ID for the option
  label: string; // e.g., "Work Hours", "Full Day"
  startHour: number; // 0-23 (UTC)
  startMinute: number; // 0-59
  endHour: number; // 0-24 (UTC, 24 means end of day, i.e., 24:00 is next day 00:00)
  endMinute: number; // 0-59
}

export type UserDayChartSettings = {
  customTimeRanges: DayChartTimeRangeOption[]; // User-defined ranges
  selectedTimeRangeId?: string; // ID of the currently selected/default range
};
