
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { DayChartTimeRangeOption, UserDayChartSettings, BaseDayChartTimeRangeOption } from '@/types';

const DAY_CHART_SETTINGS_KEY = 'timeflow-day-chart-settings-v3'; // Changed key due to structure change

const displayTimeLocal = (hour: number, minute: number): string => 
  `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

// Define the static base time ranges based on local MST shift times
const STATIC_TIME_RANGES_BASE: Readonly<BaseDayChartTimeRangeOption[]> = [
  { id: 'full_day_local', baseLabel: 'Full Day', localStartHour: 0, localStartMinute: 0, localEndHour: 24, localEndMinute: 0 }, // Represents 00:00 to 24:00 Local
  { id: 'days_shift_local', baseLabel: 'Days Shift', localStartHour: 7, localStartMinute: 0, localEndHour: 15, localEndMinute: 30 },
  { id: 'swings_shift_local', baseLabel: 'Swings Shift', localStartHour: 15, localStartMinute: 0, localEndHour: 23, localEndMinute: 30 },
  { id: 'mids_shift_local', baseLabel: 'Mids Shift', localStartHour: 23, localStartMinute: 0, localEndHour: 7, localEndMinute: 30 }, // Spans midnight locally
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
    const utcOffset = settings.isDstActive ? 6 : 7; // MDT is UTC-6, MST is UTC-7. Add to local to get UTC.
    const localTimeZoneLabel = settings.isDstActive ? 'MDT' : 'MST';

    return STATIC_TIME_RANGES_BASE.map(baseRange => {
      let effectiveStartHourUTC = baseRange.localStartHour + utcOffset;
      let effectiveEndHourUTC = baseRange.localEndHour + utcOffset;

      // Adjust UTC end hour if the local range spans midnight or is a full 24-hour range ending at "24:00"
      if (baseRange.localEndHour < baseRange.localStartHour) { // e.g. Mids 23:00 - 07:00
        effectiveEndHourUTC += 24;
      } else if (baseRange.localStartHour === 0 && baseRange.localEndHour === 24) { // Full Day 00:00 - 24:00
        // effectiveEndHourUTC is already correct (e.g. 24 + offset)
      } else if (baseRange.localEndHour === baseRange.localStartHour && baseRange.localStartHour !== 0) { // e.g. 08:00 - 08:00 (implies 24h)
         effectiveEndHourUTC += 24;
      }
      
      const label = `${baseRange.baseLabel} (${displayTimeLocal(baseRange.localStartHour, baseRange.localStartMinute)} - ${displayTimeLocal(baseRange.localEndHour % 24, baseRange.localEndMinute)} ${localTimeZoneLabel})`;

      return {
        id: baseRange.id,
        label: label,
        startHour: effectiveStartHourUTC,
        startMinute: baseRange.localStartMinute,
        endHour: effectiveEndHourUTC,
        endMinute: baseRange.localEndMinute,
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
