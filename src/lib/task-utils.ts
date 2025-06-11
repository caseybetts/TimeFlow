
import type { TaskType, TaskTypeOption } from '@/types';
import { Briefcase, User, ShoppingCart, CalendarDays, type LucideIcon } from 'lucide-react';

export const TASK_TYPE_OPTIONS: TaskTypeOption[] = [
  {
    value: "work",
    label: "Work",
    icon: Briefcase,
    color: "bg-sky-500",
    preActionDuration: 10,
    preActionLabel: "Prep",
    postActionDuration: 5,
    postActionLabel: "Wrap-up",
  },
  {
    value: "personal",
    label: "Personal",
    icon: User,
    color: "bg-purple-500",
    preActionDuration: 0,
    postActionDuration: 0,
  },
  {
    value: "errands",
    label: "Errands",
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
  },
];

export function getTaskTypeDetails(type: TaskType): TaskTypeOption | undefined {
  return TASK_TYPE_OPTIONS.find(option => option.value === type);
}

export function formatTaskTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC'
  }) + ' UTC';
}

export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const startDate = new Date(startTime);
  // Ensure startTime is treated as UTC if it's not already fully qualified
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
  const details = getTaskTypeDetails(type);
  return details ? details.color : 'bg-gray-500'; // Default color
}

export function getTaskTypeIcon(type: TaskType): LucideIcon {
  const details = getTaskTypeDetails(type);
  return details ? details.icon : Briefcase; // Default icon
}
