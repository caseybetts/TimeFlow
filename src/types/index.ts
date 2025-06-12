
import type { LucideIcon } from 'lucide-react';

export const TASK_TYPES = ["work", "personal", "errands", "appointment"] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const SPACECRAFT_OPTIONS = ["GE01", "WV01", "WV02", "WV03", "LG01", "LG02", "LG03", "LG04", "LG05", "LG06"] as const;
export type Spacecraft = (typeof SPACECRAFT_OPTIONS)[number];

export interface Task {
  id: string;
  name?: string; // Task name is now optional
  spacecraft: Spacecraft; // New required field
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
  name?: string; // Task name is now optional
  spacecraft: Spacecraft; // New required field
  startTime: string; // Store as string matching datetime-local input
  duration: string; // Store as string from input, convert to number on submit
  type: TaskType;
}

// For DayScheduleChart time range configuration
// This represents the final structure for the dropdown and chart logic
export interface DayChartTimeRangeOption {
  id: string; // Unique ID for the option
  label: string; // e.g., "Days Shift (07:00 - 15:30 MST)"
  startHour: number; // Calculated UTC start hour for chart X-axis
  startMinute: number; // Calculated UTC start minute
  endHour: number; // Calculated UTC end hour (can be >23)
  endMinute: number; // Calculated UTC end minute
}

export type UserDayChartSettings = {
  selectedTimeRangeId?: string; // ID of the currently selected/default range from the static list
  isDstActive?: boolean; // Tracks if Daylight Savings Time offset is active (true for MDT, false for MST)
};

// Base definition for static time ranges, stores local time details
export interface BaseDayChartTimeRangeOption {
  id: string;
  baseLabel: string; // The fundamental label, e.g., "Days Shift"
  localStartHour: number;
  localStartMinute: number;
  localEndHour: number; // Can be 24 for end of day, or < localStartHour if spans midnight
  localEndMinute: number;
}
