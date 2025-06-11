import type { TaskType, TaskTypeOption } from '@/types';
import { Briefcase, User, ShoppingCart, CalendarDays, type LucideIcon } from 'lucide-react';

export const TASK_TYPE_OPTIONS: TaskTypeOption[] = [
  { value: "work", label: "Work", icon: Briefcase, color: "bg-sky-500", defaultBuffer: 15 },
  { value: "personal", label: "Personal", icon: User, color: "bg-purple-500", defaultBuffer: 10 },
  { value: "errands", label: "Errands", icon: ShoppingCart, color: "bg-orange-500", defaultBuffer: 20 },
  { value: "appointment", label: "Appointment", icon: CalendarDays, color: "bg-teal-500", defaultBuffer: 30 },
];

export function getTaskTypeDetails(type: TaskType): TaskTypeOption | undefined {
  return TASK_TYPE_OPTIONS.find(option => option.value === type);
}

export function inferBuffer(type: TaskType): number {
  const details = getTaskTypeDetails(type);
  return details ? details.defaultBuffer : 15; // Default buffer if type not found
}

export function formatTaskTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function calculateEndTime(startTime: string, duration: number): string {
  const startDate = new Date(startTime);
  const endDate = new Date(startDate.getTime() + duration * 60000);
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
