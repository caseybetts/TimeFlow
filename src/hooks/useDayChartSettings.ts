
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { DayChartTimeRangeOption, UserDayChartSettings } from '@/types';

const DAY_CHART_SETTINGS_KEY = 'timeflow-day-chart-settings';

export const DEFAULT_FULL_DAY_TIME_RANGE: Readonly<DayChartTimeRangeOption> = {
  id: 'full_day_default',
  label: 'Full Day (00:00 - 23:59 UTC)',
  startHour: 0,
  startMinute: 0,
  endHour: 24, // Represents 24:00, effectively covering up to 23:59:59
  endMinute: 0,
};

export function useDayChartSettings(): {
  allTimeRangeOptions: DayChartTimeRangeOption[];
  selectedTimeRange: DayChartTimeRangeOption;
  setSelectedTimeRangeId: (id: string) => void;
  customTimeRanges: DayChartTimeRangeOption[];
  addCustomTimeRange: (range: Omit<DayChartTimeRangeOption, 'id'>) => void;
  updateCustomTimeRange: (updatedRange: DayChartTimeRangeOption) => void;
  deleteCustomTimeRange: (id: string) => void;
} {
  const [settings, setSettings] = useState<UserDayChartSettings>(() => {
    if (typeof window === 'undefined') {
      return { customTimeRanges: [], selectedTimeRangeId: DEFAULT_FULL_DAY_TIME_RANGE.id };
    }
    try {
      const item = window.localStorage.getItem(DAY_CHART_SETTINGS_KEY);
      const parsed = item ? JSON.parse(item) : { customTimeRanges: [] };
      return {
        customTimeRanges: parsed.customTimeRanges || [],
        selectedTimeRangeId: parsed.selectedTimeRangeId || DEFAULT_FULL_DAY_TIME_RANGE.id,
      };
    } catch (error) {
      console.error("Error reading day chart settings from localStorage:", error);
      return { customTimeRanges: [], selectedTimeRangeId: DEFAULT_FULL_DAY_TIME_RANGE.id };
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(DAY_CHART_SETTINGS_KEY, JSON.stringify(settings));
      } catch (error) {
        console.error("Error setting day chart settings in localStorage:", error);
      }
    }
  }, [settings]);

  // Ensure sync on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const item = window.localStorage.getItem(DAY_CHART_SETTINGS_KEY);
        const loadedSettings = item ? JSON.parse(item) : { customTimeRanges: [], selectedTimeRangeId: DEFAULT_FULL_DAY_TIME_RANGE.id };
        setSettings({
            customTimeRanges: loadedSettings.customTimeRanges || [],
            selectedTimeRangeId: loadedSettings.selectedTimeRangeId || DEFAULT_FULL_DAY_TIME_RANGE.id,
        });
      } catch (error) {
        console.error("Error synchronizing day chart settings from localStorage:", error);
      }
    }
  }, []);

  const addCustomTimeRange = useCallback((range: Omit<DayChartTimeRangeOption, 'id'>) => {
    setSettings(prev => ({
      ...prev,
      customTimeRanges: [...prev.customTimeRanges, { ...range, id: crypto.randomUUID() }],
    }));
  }, []);

  const updateCustomTimeRange = useCallback((updatedRange: DayChartTimeRangeOption) => {
    setSettings(prev => ({
      ...prev,
      customTimeRanges: prev.customTimeRanges.map(r => r.id === updatedRange.id ? updatedRange : r),
    }));
  }, []);

  const deleteCustomTimeRange = useCallback((id: string) => {
    setSettings(prev => {
      const newCustomTimeRanges = prev.customTimeRanges.filter(r => r.id !== id);
      let newSelectedId = prev.selectedTimeRangeId;
      if (prev.selectedTimeRangeId === id) {
        newSelectedId = DEFAULT_FULL_DAY_TIME_RANGE.id; // Fallback to default
      }
      return {
        customTimeRanges: newCustomTimeRanges,
        selectedTimeRangeId: newSelectedId,
      };
    });
  }, []);

  const setSelectedTimeRangeId = useCallback((id: string) => {
    setSettings(prev => ({ ...prev, selectedTimeRangeId: id }));
  }, []);

  const allTimeRangeOptions = useMemo(() => {
    return [DEFAULT_FULL_DAY_TIME_RANGE, ...settings.customTimeRanges];
  }, [settings.customTimeRanges]);

  const selectedTimeRange = useMemo(() => {
    return allTimeRangeOptions.find(option => option.id === settings.selectedTimeRangeId) || DEFAULT_FULL_DAY_TIME_RANGE;
  }, [allTimeRangeOptions, settings.selectedTimeRangeId]);

  return {
    allTimeRangeOptions,
    selectedTimeRange,
    setSelectedTimeRangeId,
    customTimeRanges: settings.customTimeRanges,
    addCustomTimeRange,
    updateCustomTimeRange,
    deleteCustomTimeRange,
  };
}
