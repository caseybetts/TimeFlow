
import type { TaskType, TaskTypeOption, UserTaskTypesConfig, UserEditableTaskTypeFields } from '@/types';
import { Briefcase, User, ShoppingCart, CalendarDays, type LucideIcon } from 'lucide-react';

// Base default definitions for task types
export const DEFAULT_TASK_TYPE_OPTIONS: Readonly<TaskTypeOption[]> = [
  {
    value: "fsv",
    label: "FSV",
    icon: Briefcase,
    color: "bg-sky-500",
    preActionDuration: 10,
    preActionLabel: "Prep",
    postActionDuration: 5,
    postActionLabel: "Wrap-up",
  },
  {
    value: "rtp",
    label: "RTP",
    icon: User,
    color: "bg-purple-500",
    preActionDuration: 0,
    preActionLabel: "",
    postActionDuration: 0,
    postActionLabel: "",
  },
  {
    value: "tl",
    label: "TL",
    icon: ShoppingCart,
    color: "bg-orange-500",
    preActionDuration: 5,
    preActionLabel: "Travel to",
    postActionDuration: 5,
    postActionLabel: "Travel from",
  },
  {
    value: "appointment",
    label: "Appointment",
    icon: CalendarDays,
    color: "bg-teal-500",
    preActionDuration: 15,
    preActionLabel: "Travel & Check-in",
    postActionDuration: 0,
    postActionLabel: "",
  },
];

// Applies user configurations to the default task types
export function getEffectiveTaskTypeOptions(
  userConfig: UserTaskTypesConfig
): TaskTypeOption[] {
  return DEFAULT_TASK_TYPE_OPTIONS.map(defaultOption => {
    const userOverrides = userConfig[defaultOption.value];
    if (userOverrides) {
      return {
        ...defaultOption,
        ...userOverrides,
      };
    }
    return defaultOption;
  });
}

// Gets the details for a specific task type from a list of effective options
export function getTaskTypeDetails(type: TaskType, effectiveOptions: readonly TaskTypeOption[]): TaskTypeOption | undefined {
  return effectiveOptions.find(option => option.value === type);
}

export function formatTaskTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { // Changed to en-GB for 24-hour format, or use hourCycle
    hour: '2-digit',
    minute: '2-digit',
    hour12: false, // Ensure 24-hour format
    timeZone: 'UTC'
  }) + ' UTC';
}

export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const startDate = new Date(startTime);
  const startDateUtc = new Date(Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate(),
    startDate.getUTCHours(),
    startDate.getUTCMinutes(),
    startDate.getUTCSeconds(),
    startDate.getUTCMilliseconds()
  ));
  const endDate = new Date(startDateUtc.getTime() + durationMinutes * 60000);
  return endDate.toISOString();
}

// These functions still rely on the 'value' to find the base default for icon/color
export function getTaskTypeColorClass(type: TaskType): string {
  const details = DEFAULT_TASK_TYPE_OPTIONS.find(option => option.value === type);
  return details ? details.color : 'bg-gray-500';
}

export function getTaskTypeIcon(type: TaskType): LucideIcon {
  const details = DEFAULT_TASK_TYPE_OPTIONS.find(option => option.value === type);
  return details ? details.icon : Briefcase;
}

