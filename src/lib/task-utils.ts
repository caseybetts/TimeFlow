
import type { TaskType, TaskTypeOption, UserTaskTypesConfig } from '@/types';
import { Briefcase, User, ShoppingCart, CalendarDays, type LucideIcon } from 'lucide-react';

// Base default definitions for task types
export const DEFAULT_TASK_TYPE_OPTIONS: Readonly<TaskTypeOption[]> = [
  {
    value: "fsv",
    label: "FSV",
    icon: Briefcase,
    color: "bg-sky-500",
    preActionDuration: 10,
    // preActionLabel: "Prep", // Removed
    postActionDuration: 5,
    // postActionLabel: "Wrap-up", // Removed
  },
  {
    value: "rtp",
    label: "RTP",
    icon: User,
    color: "bg-purple-500",
    preActionDuration: 0,
    // preActionLabel: "", // Removed
    postActionDuration: 0,
    // postActionLabel: "", // Removed
  },
  {
    value: "tl",
    label: "TL",
    icon: ShoppingCart,
    color: "bg-orange-500",
    preActionDuration: 5,
    // preActionLabel: "Travel to", // Removed
    postActionDuration: 5,
    // postActionLabel: "Travel from", // Removed
  },
  {
    value: "appointment",
    label: "Appointment",
    icon: CalendarDays,
    color: "bg-teal-500",
    preActionDuration: 15,
    // preActionLabel: "Travel & Check-in", // Removed
    postActionDuration: 0,
    // postActionLabel: "", // Removed
  },
];

// Applies user configurations to the default task types
export function getEffectiveTaskTypeOptions(
  userConfig: UserTaskTypesConfig
): TaskTypeOption[] {
  return DEFAULT_TASK_TYPE_OPTIONS.map(defaultOption => {
    const userOverrides = userConfig[defaultOption.value];
    if (userOverrides) {
      // Ensure only valid fields are spread
      const { label, preActionDuration, postActionDuration } = userOverrides;
      return {
        ...defaultOption,
        label: label ?? defaultOption.label,
        preActionDuration: preActionDuration ?? defaultOption.preActionDuration,
        postActionDuration: postActionDuration ?? defaultOption.postActionDuration,
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
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC'
  }) + ' UTC';
}

export function calculateEndTime(startTime: string, durationMinutes: number): string {
  if (!startTime) return "";
  const startDate = new Date(startTime);
  // Ensure we are operating on UTC dates to avoid timezone shifts during calculations
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

export function getTaskTypeColorClass(type: TaskType): string {
  const details = DEFAULT_TASK_TYPE_OPTIONS.find(option => option.value === type);
  return details ? details.color : 'bg-gray-500';
}

export function getTaskTypeIcon(type: TaskType): LucideIcon {
  const details = DEFAULT_TASK_TYPE_OPTIONS.find(option => option.value === type);
  return details ? details.icon : Briefcase;
}
