
"use client";

import type { Task, TaskType } from "@/types";
import type { ChartConfig } from "@/components/ui/chart";
import { useMemo, useState, useEffect } from "react";
import { formatTaskTime, getTaskTypeDetails, DEFAULT_TASK_TYPE_OPTIONS, calculateEndTime } from "@/lib/task-utils";
import { useTaskTypeConfig } from "@/hooks/useTaskTypeConfig";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DayScheduleChartProps {
  tasks: Task[];
  selectedDate: Date;
  onRefreshNowLine?: () => void;
  refreshSignal?: number;
}

interface ProcessedChartDataPoint {
  id: string;
  timeRange: [number, number]; // [startMinuteRelativeToDay, endMinuteRelativeToDay]
  laneIndex: number;
  fillColorKey: TaskType;
  originalTask: Task;
  tooltipLabel: string;
  isCompleted: boolean;
}

const taskValueToChartKey = (taskValue: TaskType): string => {
  return taskValue.toLowerCase().replace(/\s+/g, '');
};

const formatMinutesToTimeLocal = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60) % 24; // Ensure hours wrap around 24 for display
  const minutes = totalMinutes % 60;
  // Handle potential negative minutes if totalMinutes is negative
  const displayHours = hours < 0 ? (hours + 24) % 24 : hours;
  const displayMinutes = minutes < 0 ? (minutes + 60) % 60 : minutes;
  return `${String(displayHours).padStart(2, '0')}:${String(displayMinutes).padStart(2, '0')}`;
};

const MIN_SLIDER_MINUTES = 0; // Represents 00:00 on selectedDate
const MAX_SLIDER_MINUTES = 48 * 60; // Allows viewing up to 48 hours from selectedDate start
const MIN_WINDOW_DURATION_MINUTES = 30; 
const TIMELINE_LANE_HEIGHT = 30;
const TIMELINE_TOP_PADDING = 12;
const TIMELINE_BOTTOM_PADDING = 42;

export function DayScheduleChart({ tasks, selectedDate, onRefreshNowLine, refreshSignal }: DayScheduleChartProps) {
  const [isClient, setIsClient] = useState(false);
  const { effectiveTaskTypeOptions } = useTaskTypeConfig(); 
  const [currentTimeLinePosition, setCurrentTimeLinePosition] = useState<number | null>(null);
  const [viewWindow, setViewWindow] = useState<[number, number]>([0, 24*60]); // Initial default, will be overridden by useEffect
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const chartConfig = useMemo(() => {
    return effectiveTaskTypeOptions.reduce((acc, option) => {
      const key = taskValueToChartKey(option.value);
      let color = "hsl(var(--muted))";

      const defaultTypeMatch = DEFAULT_TASK_TYPE_OPTIONS.find(d => d.value === option.value);

      if (defaultTypeMatch) {
        switch (defaultTypeMatch.value) {
          case "fsv":
            color = "hsl(var(--chart-1))";
            break;
          case "rtp":
            color = "hsl(var(--chart-2))";
            break;
          case "tl":
            color = "hsl(var(--chart-3))";
            break;
          case "appointment":
            color = "hsl(var(--chart-4))";
            break;
          default:
            color = "hsl(var(--chart-5))"; 
            break;
        }
      } else {
         color = "hsl(var(--chart-5))"; 
      }
      
      acc[key] = {
        label: option.label,
        color: color,
        icon: option.icon || defaultTypeMatch?.icon
      };
      return acc;
    }, {} as ChartConfig);
  }, [effectiveTaskTypeOptions]);

  const chartData = useMemo(() => {
    const viewWindowStartMinutesUTC = viewWindow[0];
    const viewWindowEndMinutesUTC = viewWindow[1];

    const selectedDateEpochStartMs = Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate());

    const viewWindowStartMs = selectedDateEpochStartMs + viewWindowStartMinutesUTC * 60000;
    const viewWindowEndMs = selectedDateEpochStartMs + viewWindowEndMinutesUTC * 60000;

    const tasksInView = tasks.filter(task => {
      const coreEventTimeMs = new Date(task.startTime).getTime();
      const taskActualStartMs = coreEventTimeMs - (task.preActionDuration * 60000);
      const taskActualEndMs = coreEventTimeMs + (task.postActionDuration * 60000);
      
      const effectiveTotalDurationMs = Math.max(60000, taskActualEndMs - taskActualStartMs);
      const effectiveTaskActualEndMs = taskActualStartMs + effectiveTotalDurationMs;

      return taskActualStartMs < viewWindowEndMs && effectiveTaskActualEndMs > viewWindowStartMs;
    });

     tasksInView.sort((a,b) => {
        const coreTimeA = new Date(a.startTime).getTime();
        const effectiveStartTimeA = coreTimeA - (a.preActionDuration * 60000);
        const coreTimeB = new Date(b.startTime).getTime();
        const effectiveStartTimeB = coreTimeB - (b.preActionDuration * 60000);
        return effectiveStartTimeA - effectiveStartTimeB;
    });

    const laneEndMinutes: number[] = [];

    return tasksInView.map((task) => {
      const coreEventTimeMs = new Date(task.startTime).getTime();
      const actualStartMs = coreEventTimeMs - (task.preActionDuration * 60000);
      const actualEndMs = coreEventTimeMs + (task.postActionDuration * 60000);

      let taskStartMinutesRelativeToDay = (actualStartMs - selectedDateEpochStartMs) / 60000;
      let taskEndMinutesRelativeToDay = (actualEndMs - selectedDateEpochStartMs) / 60000;

      if (taskEndMinutesRelativeToDay <= taskStartMinutesRelativeToDay) {
        taskEndMinutesRelativeToDay = taskStartMinutesRelativeToDay + 1; 
      }

      const taskTypeDetails = getTaskTypeDetails(task.type, effectiveTaskTypeOptions);
      const taskNameDisplay = task.name || (task.spacecraft ? `${taskTypeDetails?.label || task.type} - ${task.spacecraft}` : `${taskTypeDetails?.label || task.type}`);

      let laneIndex = laneEndMinutes.findIndex((laneEndMinute) => taskStartMinutesRelativeToDay >= laneEndMinute);
      if (laneIndex === -1) {
        laneIndex = laneEndMinutes.length;
        laneEndMinutes.push(taskEndMinutesRelativeToDay);
      } else {
        laneEndMinutes[laneIndex] = taskEndMinutesRelativeToDay;
      }

      return {
        id: task.id,
        timeRange: [taskStartMinutesRelativeToDay, taskEndMinutesRelativeToDay] as [number, number],
        laneIndex,
        fillColorKey: task.type, 
        originalTask: task,
        tooltipLabel: taskNameDisplay,
        isCompleted: task.isCompleted || false,
      };
    }).filter(Boolean) as ProcessedChartDataPoint[]; 
  }, [tasks, selectedDate, viewWindow, effectiveTaskTypeOptions]); 


  // Effect to set the initial view window relative to current time
  useEffect(() => {
    if (isClient && selectedDate) {
      const now = new Date();
      const selectedDateEpochStartMs = Date.UTC(
        selectedDate.getUTCFullYear(),
        selectedDate.getUTCMonth(),
        selectedDate.getUTCDate()
      );
      const currentMinutesRelativeToSelectedDayStart = (now.getTime() - selectedDateEpochStartMs) / 60000;

      let newStartMinutes = currentMinutesRelativeToSelectedDayStart - (1 * 60); // now - 1 hour
      let newEndMinutes = currentMinutesRelativeToSelectedDayStart + (9 * 60);   // now + 9 hours

      // Bound by slider limits
      newStartMinutes = Math.max(MIN_SLIDER_MINUTES, newStartMinutes);
      newEndMinutes = Math.min(MAX_SLIDER_MINUTES, newEndMinutes);

      // Ensure minimum window duration
      if (newEndMinutes - newStartMinutes < MIN_WINDOW_DURATION_MINUTES) {
        // Attempt to center the minimum duration window around the current time if possible
        const centerAttempt = currentMinutesRelativeToSelectedDayStart + (4 * 60); // Midpoint of desired 10hr window (9 - (-1) = 10; 10/2 = 5; -1+5 = 4)
        newStartMinutes = centerAttempt - MIN_WINDOW_DURATION_MINUTES / 2;
        newEndMinutes = centerAttempt + MIN_WINDOW_DURATION_MINUTES / 2;
        
        // Re-bound and adjust if boundaries make it too small
        newStartMinutes = Math.max(MIN_SLIDER_MINUTES, newStartMinutes);
        newEndMinutes = Math.min(MAX_SLIDER_MINUTES, newEndMinutes);

        if (newEndMinutes - newStartMinutes < MIN_WINDOW_DURATION_MINUTES) {
          if (newEndMinutes === MAX_SLIDER_MINUTES) { // If hitting max limit
            newStartMinutes = newEndMinutes - MIN_WINDOW_DURATION_MINUTES;
          } else { // newStartMinutes must be MIN_SLIDER_MINUTES (hitting min limit)
            newEndMinutes = newStartMinutes + MIN_WINDOW_DURATION_MINUTES;
          }
        }
      }
      setViewWindow([Math.round(newStartMinutes), Math.round(newEndMinutes)]);
    }
  }, [isClient, selectedDate]);


  useEffect(() => {
    if (!isClient) return;

    const todayUTC = new Date(); 
    const selectedDateEpochStart = Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate()); 
    const nowEpoch = todayUTC.getTime(); 
    const currentMinutesRelativeToSelectedDayStart = (nowEpoch - selectedDateEpochStart) / 60000;

    if (currentMinutesRelativeToSelectedDayStart >= viewWindow[0] && currentMinutesRelativeToSelectedDayStart <= viewWindow[1]) {
      setCurrentTimeLinePosition(currentMinutesRelativeToSelectedDayStart);
    } else {
      setCurrentTimeLinePosition(null); 
    }
  }, [selectedDate, viewWindow, refreshKey, isClient]);


  const laneCount = chartData.length > 0
    ? Math.max(...chartData.map((dataPoint) => dataPoint.laneIndex)) + 1
    : 1;
  const compactTimelineHeight = Math.max(
    92,
    TIMELINE_TOP_PADDING + TIMELINE_BOTTOM_PADDING + laneCount * TIMELINE_LANE_HEIGHT
  );

  const xAxisTickFormatter = (value: number) => {
    const displayHourUTC = Math.floor(value / 60) % 24; 
    const minute = value % 60;
    return `${String(displayHourUTC).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };

  const handleSliderChange = (newRange: [number, number]) => {
    let [newStart, newEnd] = newRange;

    if (newEnd - newStart < MIN_WINDOW_DURATION_MINUTES) {
      if (newEnd !== viewWindow[1]) { 
        newStart = Math.max(MIN_SLIDER_MINUTES, newEnd - MIN_WINDOW_DURATION_MINUTES);
      } else { 
        newEnd = Math.min(MAX_SLIDER_MINUTES, newStart + MIN_WINDOW_DURATION_MINUTES);
      }
    }
    setViewWindow([Math.round(newStart), Math.round(newEnd)]);
  };

  const handleRefreshNowLine = () => {
    setRefreshKey(prevKey => prevKey + 1);
    onRefreshNowLine?.();
  };

  useEffect(() => {
    if (refreshSignal === undefined) return;
    setRefreshKey(prevKey => prevKey + 1);
  }, [refreshSignal]);

  const xAxisTicks = useMemo(() => {
    return Array.from(
      { length: Math.floor((viewWindow[1] - viewWindow[0]) / (4 * 60)) + 1 },
      (_, i) => Math.floor(viewWindow[0] / (4 * 60) + i) * (4 * 60)
    ).filter(tick => tick >= viewWindow[0] && tick <= viewWindow[1]);
  }, [viewWindow]);

  const getTimelinePercent = (minute: number) => {
    const clampedMinute = Math.min(viewWindow[1], Math.max(viewWindow[0], minute));
    return ((clampedMinute - viewWindow[0]) / (viewWindow[1] - viewWindow[0])) * 100;
  };

  if (!isClient) {
    return (
      <Card className="border-0 bg-card/95">
        <CardHeader className="px-4 py-3">
          <div className="pt-4 space-y-2">
            <div className="h-6 w-full bg-muted rounded animate-pulse" />
          </div>
        </CardHeader>
        <CardContent className="flex h-[180px] items-center justify-center px-4 py-3 text-muted-foreground">Loading chart...</CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 bg-card/95">
      <CardHeader className="px-4 pb-2 pt-3">
        <div className="group space-y-1 opacity-70 transition-opacity hover:opacity-100">
            <Label
              htmlFor="time-range-slider"
              className="inline-block origin-left text-xs font-medium text-muted-foreground transition-[color,transform] duration-150 group-hover:scale-[1.03] group-hover:text-primary group-active:scale-[1.03] group-active:text-primary"
            >
              Visible Time Range (UTC): {formatMinutesToTimeLocal(viewWindow[0])} - {formatMinutesToTimeLocal(viewWindow[1])}
            </Label>
            <Slider
              id="time-range-slider"
              min={MIN_SLIDER_MINUTES} 
              max={MAX_SLIDER_MINUTES} 
              step={15} 
              value={viewWindow}
              onValueChange={handleSliderChange}
              onPointerUp={(event) => {
                const activeElement = document.activeElement;
                if (activeElement instanceof HTMLElement && event.currentTarget.contains(activeElement)) {
                  activeElement.blur();
                }
              }}
              className="h-3 w-full [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-zinc-500 [&_[role=slider]]:bg-zinc-800 [&_[role=slider]]:shadow-sm [&_[role=slider]]:ring-offset-background [&_[data-orientation=horizontal]]:bg-zinc-800/70 [&_[data-orientation=horizontal]]:transition-colors [&_[data-orientation=horizontal]>span]:bg-zinc-500 [&_[data-orientation=horizontal]>span]:transition-colors group-hover:[&_[data-orientation=horizontal]]:bg-primary/20 group-hover:[&_[data-orientation=horizontal]>span]:bg-primary group-active:[&_[data-orientation=horizontal]]:bg-primary/25 group-active:[&_[data-orientation=horizontal]>span]:bg-primary"
              aria-label="Time range slider"
            />
        </div>
      </CardHeader>
      <CardContent className="flex min-h-[130px] flex-col justify-center px-4 pb-4 pt-0">
        { (chartData.length === 0 && currentTimeLinePosition === null && isClient) ?
            <p className="text-muted-foreground text-center py-8">
              No tasks scheduled for this period on {selectedDate.toLocaleDateString('en-CA', { timeZone: 'UTC' })}.
            </p>
          :
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_8.5rem] lg:items-start">
            <TooltipProvider>
              <div
                className="relative w-full overflow-hidden rounded-md bg-background/55"
                style={{ height: compactTimelineHeight }}
                onClick={handleRefreshNowLine}
              >
                <div className="absolute inset-x-0 top-0" style={{ bottom: TIMELINE_BOTTOM_PADDING }}>
                  {xAxisTicks.map((tick) => (
                    <div
                      key={`grid-${tick}`}
                      className="absolute inset-y-0 border-l border-border/70"
                      style={{ left: `${getTimelinePercent(tick)}%` }}
                    />
                  ))}
                  {Array.from({ length: laneCount }).map((_, laneIndex) => (
                    <div
                      key={`lane-${laneIndex}`}
                      className="absolute inset-x-0 border-t border-border/40"
                      style={{ top: TIMELINE_TOP_PADDING + laneIndex * TIMELINE_LANE_HEIGHT + TIMELINE_LANE_HEIGHT / 2 }}
                    />
                  ))}
                  {chartData.map((entry) => {
                    const task = entry.originalTask;
                    const startPercent = getTimelinePercent(entry.timeRange[0]);
                    const endPercent = getTimelinePercent(entry.timeRange[1]);
                    const widthPercent = Math.max(0.35, endPercent - startPercent);
                    const chartKey = taskValueToChartKey(entry.fillColorKey);
                    const taskColor = chartConfig[chartKey]?.color || "hsl(var(--muted))";
                    const overallStartTimeISO = calculateEndTime(task.startTime, -task.preActionDuration);
                    const overallEndTimeISO = calculateEndTime(task.startTime, task.postActionDuration);

                    return (
                      <Tooltip key={entry.id}>
                        <TooltipTrigger asChild>
                          <div
                            className="absolute h-4 cursor-default rounded-full shadow-sm ring-1 ring-background/70 transition-[height,top,filter] hover:h-5 hover:brightness-110"
                            style={{
                              top: TIMELINE_TOP_PADDING + entry.laneIndex * TIMELINE_LANE_HEIGHT + 6,
                              left: `${startPercent}%`,
                              width: `max(${widthPercent}%, 18px)`,
                              backgroundColor: taskColor,
                              opacity: entry.isCompleted ? 0.45 : 1,
                            }}
                            aria-label={entry.tooltipLabel}
                          />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <div className="space-y-1 text-sm">
                            <p className="font-semibold">{entry.tooltipLabel}</p>
                            <p className="text-muted-foreground">
                              {[task.spacecraft, getTaskTypeDetails(task.type, effectiveTaskTypeOptions)?.label || task.type].filter(Boolean).join(" | ")}
                            </p>
                            <p>Core: {formatTaskTime(task.startTime)}</p>
                            <p>Window: {formatTaskTime(overallStartTimeISO)} - {formatTaskTime(overallEndTimeISO)}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                  {currentTimeLinePosition !== null && (
                    <div
                      className="absolute inset-y-0 border-l border-destructive/80"
                      style={{ left: `${getTimelinePercent(currentTimeLinePosition)}%` }}
                    >
                      <span className="absolute -left-1 top-1 h-2 w-2 rounded-full bg-destructive shadow-[0_0_0_3px_hsl(var(--destructive)/0.14)]" />
                    </div>
                  )}
                </div>
                <div className="absolute inset-x-0 bottom-0 h-10 border-t border-border bg-background/80">
                  {xAxisTicks.map((tick) => (
                    <span
                      key={`tick-${tick}`}
                      className="absolute top-2 -translate-x-1/2 text-xs text-muted-foreground"
                      style={{ left: `${getTimelinePercent(tick)}%` }}
                    >
                      {xAxisTickFormatter(tick)}
                    </span>
                  ))}
                </div>
              </div>
            </TooltipProvider>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground lg:flex-col lg:items-start lg:gap-2 lg:pt-1">
              {effectiveTaskTypeOptions.map((option) => {
                const chartKey = taskValueToChartKey(option.value);
                return (
                  <div key={option.value} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartConfig[chartKey]?.color || "hsl(var(--muted))" }} />
                    <span>{option.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        }
      </CardContent>
    </Card>
  );
}

    
