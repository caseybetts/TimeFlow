
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { DayChartTimeRangeOption, UserDayChartSettings, BaseDayChartTimeRangeOption } from '@/types';

const DAY_CHART_SETTINGS_KEY = 'timeflow-day-chart-settings-v2'; // Changed key due to structure change

const displayTime = (hour: number, minute: number): string => 
  `${String(hour % 24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

// Define the static base time ranges
const STATIC_TIME_RANGES_BASE: Readonly<BaseDayChartTimeRangeOption[]> = [
  { id: 'full_day', baseLabel: 'Full Day', startHour: 0, startMinute: 0, endHour: 24, endMinute: 0 },
  { id: 'work_hours', baseLabel: 'Work Hours', startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
  { id: 'morning', baseLabel: 'Morning', startHour: 6, startMinute: 0, endHour: 12, endMinute: 0 },
  { id: 'afternoon', baseLabel: 'Afternoon', startHour: 12, startMinute: 0, endHour: 18, endMinute: 0 },
  { id: 'evening', baseLabel: 'Evening', startHour: 18, startMinute: 0, endHour: 24, endMinute: 0 }, // Covers up to midnight
  { id: 'late_night_early_morning', baseLabel: 'Late Night/Early Morning', startHour: 22, startMinute: 0, endHour: 30, endMinute: 0 }, // 22:00 to 06:00 next day
];

const DEFAULT_SELECTED_TIME_RANGE_ID = STATIC_TIME_RANGES_BASE[0].id;

export function useDayChartSettings(): {
  allTimeRangeOptions: DayChartTimeRangeOption[];
  selectedTimeRange: DayChartTimeRangeOption;
  setSelectedTimeRangeId: (id: string) => void;
  isDstActive: boolean;
  toggleDstActive: () => void;
} {
  const [settings, setSettings] = useState<UserDayChartSettings>(() => {
    if (typeof window === 'undefined') {
      return { selectedTimeRangeId: DEFAULT_SELECTED_TIME_RANGE_ID, isDstActive: false };
    }
    try {
      const item = window.localStorage.getItem(DAY_CHART_SETTINGS_KEY);
      const parsed = item ? JSON.parse(item) : {};
      return {
        selectedTimeRangeId: parsed.selectedTimeRangeId || DEFAULT_SELECTED_TIME_RANGE_ID,
        isDstActive: parsed.isDstActive === true, // Ensure boolean
      };
    } catch (error) {
      console.error("Error reading day chart settings from localStorage:", error);
      return { selectedTimeRangeId: DEFAULT_SELECTED_TIME_RANGE_ID, isDstActive: false };
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const item = window.localStorage.getItem(DAY_CHART_SETTINGS_KEY);
        const loadedSettings = item ? JSON.parse(item) : {};
        setSettings({
            selectedTimeRangeId: loadedSettings.selectedTimeRangeId || DEFAULT_SELECTED_TIME_RANGE_ID,
            isDstActive: loadedSettings.isDstActive === true,
        });
      } catch (error) {
        console.error("Error synchronizing day chart settings from localStorage:", error);
      }
    }
  }, []);

  const setSelectedTimeRangeId = useCallback((id: string) => {
    setSettings(prev => ({ ...prev, selectedTimeRangeId: id }));
  }, []);

  const toggleDstActive = useCallback(() => {
    setSettings(prev => ({ ...prev, isDstActive: !prev.isDstActive }));
  }, []);

  const allTimeRangeOptions = useMemo(() => {
    const dstOffset = settings.isDstActive ? 1 : 0;
    return STATIC_TIME_RANGES_BASE.map(baseRange => {
      const adjStartHour = baseRange.startHour + dstOffset;
      const adjEndHour = baseRange.endHour + dstOffset;
      
      let dynamicLabel = `${baseRange.baseLabel} (${displayTime(adjStartHour, baseRange.startMinute)} - ${displayTime(adjEndHour, baseRange.endMinute)}`;
      if(settings.isDstActive) dynamicLabel += " DST";
      dynamicLabel += ")";

      return {
        id: baseRange.id,
        label: dynamicLabel,
        startHour: adjStartHour,
        startMinute: baseRange.startMinute,
        endHour: adjEndHour,
        endMinute: baseRange.endMinute,
      };
    });
  }, [settings.isDstActive]);

  const selectedTimeRange = useMemo(() => {
    return allTimeRangeOptions.find(option => option.id === settings.selectedTimeRangeId) || allTimeRangeOptions[0];
  }, [allTimeRangeOptions, settings.selectedTimeRangeId]);

  return {
    allTimeRangeOptions,
    selectedTimeRange,
    setSelectedTimeRangeId,
    isDstActive: settings.isDstActive ?? false,
    toggleDstActive,
  };
}
