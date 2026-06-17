"use client";

import { useEffect, useState } from 'react';
import type { Task } from '@/types';

const LEGACY_TASKS_STORAGE_KEY = 'timeflow-tasks';

export function useTasks(): [Task[], (value: Task[] | ((val: Task[]) => Task[])) => void] {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      // Task data is intentionally in-memory only; remove values saved by older builds.
      window.localStorage.removeItem(LEGACY_TASKS_STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing legacy task storage:", error);
    }
  }, []);

  return [tasks, setTasks];
}
