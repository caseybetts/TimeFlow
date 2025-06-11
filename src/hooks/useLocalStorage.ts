"use client";

import { useState, useEffect } from 'react';
import type { Task } from '@/types';

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error("Error reading localStorage key “" + key + "”:", error);
      return initialValue;
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const valueToStore = storedValue instanceof Function ? storedValue(storedValue) : storedValue;
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error("Error setting localStorage key “" + key + "”:", error);
      }
    }
  }, [key, storedValue]);
  
  // This effect ensures that the state is synchronized with localStorage on mount,
  // especially important for Next.js client components that might render on server first.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const item = window.localStorage.getItem(key);
        if (item) {
          setStoredValue(JSON.parse(item));
        }
      } catch (error) {
        console.error("Error synchronizing localStorage key “" + key + "”:", error);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);


  return [storedValue, setStoredValue];
}

export function useTasks(): [Task[], (value: Task[] | ((val: Task[]) => Task[])) => void] {
  return useLocalStorage<Task[]>('timeflow-tasks', []);
}
