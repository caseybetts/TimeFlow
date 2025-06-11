
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { TaskTypeOption, UserTaskTypesConfig, TaskType } from '@/types';
import { DEFAULT_TASK_TYPE_OPTIONS, getEffectiveTaskTypeOptions } from '@/lib/task-utils';

const TASK_TYPE_CONFIG_KEY = 'timeflow-task-type-config';

export function useTaskTypeConfig(): {
  effectiveTaskTypeOptions: TaskTypeOption[];
  userConfig: UserTaskTypesConfig;
  updateUserConfig: (newConfig: UserTaskTypesConfig) => void;
  resetTaskTypeConfig: (taskType?: TaskType) => void;
} {
  const [userConfig, setUserConfig] = useState<UserTaskTypesConfig>(() => {
    if (typeof window === 'undefined') {
      return {};
    }
    try {
      const item = window.localStorage.getItem(TASK_TYPE_CONFIG_KEY);
      return item ? JSON.parse(item) : {};
    } catch (error) {
      console.error("Error reading task type config from localStorage:", error);
      return {};
    }
  });

  const [effectiveTaskTypeOptions, setEffectiveTaskTypeOptions] = useState<TaskTypeOption[]>(() =>
    getEffectiveTaskTypeOptions(userConfig)
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(TASK_TYPE_CONFIG_KEY, JSON.stringify(userConfig));
        setEffectiveTaskTypeOptions(getEffectiveTaskTypeOptions(userConfig));
      } catch (error) {
        console.error("Error setting task type config in localStorage:", error);
      }
    }
  }, [userConfig]);

  // Ensure sync on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const item = window.localStorage.getItem(TASK_TYPE_CONFIG_KEY);
        const loadedConfig = item ? JSON.parse(item) : {};
        setUserConfig(loadedConfig); // This will trigger the above useEffect to update effective options
      } catch (error) {
        console.error("Error synchronizing task type config from localStorage:", error);
      }
    }
  }, []);

  const updateUserConfig = useCallback((newConfig: UserTaskTypesConfig) => {
    setUserConfig(newConfig);
  }, []);

  const resetTaskTypeConfig = useCallback((taskType?: TaskType) => {
    setUserConfig(prevConfig => {
      if (taskType) {
        const { [taskType]: _, ...restConfig } = prevConfig;
        return restConfig;
      }
      return {}; // Reset all to defaults
    });
  }, []);

  return { effectiveTaskTypeOptions, userConfig, updateUserConfig, resetTaskTypeConfig };
}
