
"use client";

import type { Task, TaskType } from "@/types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  type ChartConfig,
  ChartLegend,
  ChartLegendContent,
  ChartTooltipContent, // Ensure this is imported
} from "@/components/ui/chart";
import { useMemo, useState, useEffect } from "react";
import { formatTaskTime, getTaskTypeDetails, DEFAULT_TASK_TYPE_OPTIONS } from "@/lib/task-utils";
import { useTaskTypeConfig } from "@/hooks/useTaskTypeConfig";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface DayScheduleChartProps {
  tasks: Task[];
  selectedDate: Date; // This is the primary day the chart is focused on (UTC)
}

interface ProcessedChartDataPoint {
  id: string;
  taskNameForAxis: string;
  timeRange: [number, number]; // Minutes relative to 00:00 of selectedDate (UTC)
  fillColorKey: TaskType;
  originalTask: Task;
  tooltipLabel: string;
}

const taskValueToChartKey = (taskValue: TaskType): string => {
  return taskValue.toLowerCase().replace(/\s+/g, '');
};

const formatMinutesToTimeLocal = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  console.log("CustomTooltip called:", { active, payload, label }); // Added for debugging

  const { effectiveTaskTypeOptions } = useTaskTypeConfig();

  if (active && payload && payload.length) {
    if (!payload[0] || !payload[0].payload) {
      console.error("CustomTooltip: payload[0] or payload[0].payload is undefined!", payload);
      return (
        <div className="p-2 bg-destructive text-destructive-foreground rounded-md shadow-lg">
          Tooltip Error: Payload data missing.
        </div>
      );
    }

    const data = payload[0].payload as ProcessedChartDataPoint;

    if (!data.originalTask) {
      console.error("CustomTooltip: data.originalTask is undefined!", data);
      return (
        <div className="p-2 bg-destructive text-destructive-foreground rounded-md shadow-lg">
          Tooltip Error: Original task data missing.
        </div>
      );
    }
    
    const task = data.originalTask;
    const taskTypeDetails = getTaskTypeDetails(task.type, effectiveTaskTypeOptions);
    const taskNameDisplay = task.name || `${taskTypeDetails?.label || task.type} - ${task.spacecraft}`;

    const coreStartTime = new Date(task.startTime);
    const formattedCoreStartTime = formatTaskTime(coreStartTime.toISOString());
    const effectiveStartTime = new Date(coreStartTime.getTime() - task.preActionDuration * 60000);
    const coreEndTime = new Date(coreStartTime.getTime() + task.duration * 60000); // task.duration is now 1
    const effectiveEndTime = new Date(coreEndTime.getTime() + task.postActionDuration * 60000);

    const tooltipLabelContent = (
      <div className="font-bold">
        {taskNameDisplay} ({taskTypeDetails?.label || task.type} / {task.spacecraft})
        <br />
        <span className="text-xs font-normal">Core Starts: {formattedCoreStartTime}</span>
      </div>
    );

    return (
      <ChartTooltipContent
        className="w-[300px] bg-background"
        label={tooltipLabelContent}
        content={
          <div className="text-sm space-y-1">
            {task.preActionDuration > 0 && (
              <p>{taskTypeDetails?.preActionLabel || "Pre-Action"}: {formatTaskTime(effectiveStartTime.toISOString())} - {formatTaskTime(coreStartTime.toISOString())} ({task.preActionDuration} min)</p>
            )}
            <p>Core Task: {formatTaskTime(coreStartTime.toISOString())} - {formatTaskTime(coreEndTime.toISOString())} ({task.duration} min)</p>
            {task.postActionDuration > 0 && (
              <p>{taskTypeDetails?.postActionLabel || "Post-Action"}: {formatTaskTime(coreEndTime.toISOString())} - {formatTaskTime(effectiveEndTime.toISOString())} ({task.postActionDuration} min)</p>
            )}
            <p className="pt-1">Status: {task.isCompleted ? "Completed" : "Pending"}</p>
          </div>
        }
      />
    );
  }
  return null;
};

const MIN_SLIDER_MINUTES = 0;
const MAX_SLIDER_MINUTES = 48 * 60; 
const MIN_WINDOW_DURATION_MINUTES = 30; 
const DEFAULT_INITIAL_WINDOW_MINUTES: [number, number] = [0 * 60, 24 * 60]; 

export function DayScheduleChart({ tasks, selectedDate }: DayScheduleChartProps) {
  const [isClient, setIsClient] = useState(false);
  const { effectiveTaskTypeOptions } = useTaskTypeConfig();
  const [currentTimeLinePosition, setCurrentTimeLinePosition] = useState<number | null>(null);
  const [viewWindow, setViewWindow] = useState<[number, number]>(DEFAULT_INITIAL_WINDOW_MINUTES);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const xAxisDomain: [number, number] = useMemo(() => {
    return viewWindow;
  }, [viewWindow]);


  useEffect(() => {
    const todayUTC = new Date(); // Current time in UTC
    // Calculate start of selectedDate in UTC milliseconds
    const selectedDateEpochStart = Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate());
    const nowEpoch = todayUTC.getTime(); // Current time in UTC milliseconds
    
    // Calculate current minutes relative to the START of the selectedDate (UTC)
    const currentMinutesRelativeToSelectedDayStart = (nowEpoch - selectedDateEpochStart) / 60000;
    
    // Check if current time falls within the current xAxisDomain (which is also in minutes relative to selectedDate start)
    if (currentMinutesRelativeToSelectedDayStart >= xAxisDomain[0] && currentMinutesRelativeToSelectedDayStart <= xAxisDomain[1]) {
      setCurrentTimeLinePosition(currentMinutesRelativeToSelectedDayStart);
    } else {
      setCurrentTimeLinePosition(null);
    }
  }, [selectedDate, xAxisDomain, tasks]); // Re-run when selectedDate or viewWindow (xAxisDomain) changes


  const chartConfig = useMemo(() => {
    return effectiveTaskTypeOptions.reduce((acc, option) => {
      const key = taskValueToChartKey(option.value);
      let color = "hsl(var(--muted))"; 
      const defaultType = DEFAULT_TASK_TYPE_OPTIONS.find(d => d.value === option.value);
      if (defaultType) {
          if (defaultType.value === "work") color = "hsl(var(--chart-1))";
          else if (defaultType.value === "personal") color = "hsl(var(--chart-2))";
          else if (defaultType.value === "errands") color = "hsl(var(--chart-3))";
          else if (defaultType.value === "appointment") color = "hsl(var(--chart-4))";
      }
      acc[key] = { label: option.label, color: color, icon: defaultType?.icon };
      return acc;
    }, {} as ChartConfig);
  }, [effectiveTaskTypeOptions]);


  const chartData = useMemo(() => {
    const viewWindowStartMinutesUTC = xAxisDomain[0];
    const viewWindowEndMinutesUTC = xAxisDomain[1];
    
    // selectedDate is already UTC. Get its start in milliseconds.
    const selectedDateEpochStartMs = Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate());

    // Calculate absolute UTC millisecond boundaries for the view window
    const viewWindowStartMs = selectedDateEpochStartMs + viewWindowStartMinutesUTC * 60000;
    const viewWindowEndMs = selectedDateEpochStartMs + viewWindowEndMinutesUTC * 60000;

    const tasksInView = tasks.filter(task => {
      const taskCoreStartMs = new Date(task.startTime).getTime(); // Already UTC
      const taskEffectiveStartMs = taskCoreStartMs - task.preActionDuration * 60000;
      const taskEffectiveEndMs = taskCoreStartMs + (task.duration + task.postActionDuration) * 60000;
      // Check if any part of the effective task duration overlaps with the view window
      return taskEffectiveStartMs < viewWindowEndMs && taskEffectiveEndMs > viewWindowStartMs;
    });
    
    tasksInView.sort((a,b) => {
        const effectiveStartTimeA = new Date(a.startTime).getTime() - (a.preActionDuration * 60000);
        const effectiveStartTimeB = new Date(b.startTime).getTime() - (b.preActionDuration * 60000);
        return effectiveStartTimeA - effectiveStartTimeB;
    });

    return tasksInView.map((task) => {
      const taskCoreStartMs = new Date(task.startTime).getTime(); // Already UTC
      const taskEffectiveStartMs = taskCoreStartMs - task.preActionDuration * 60000;
      
      // Calculate start minutes for the bar, relative to the selectedDate's 00:00 UTC
      let taskStartMinutesRelativeToDay = (taskEffectiveStartMs - selectedDateEpochStartMs) / 60000;
      
      const totalEffectiveDurationMinutes = task.preActionDuration + task.duration + task.postActionDuration;
      let taskEndMinutesRelativeToDay = taskStartMinutesRelativeToDay + totalEffectiveDurationMinutes;
      
      const taskTypeDetails = getTaskTypeDetails(task.type, effectiveTaskTypeOptions);
      const taskNameDisplay = task.name || `${taskTypeDetails?.label || task.type} - ${task.spacecraft}`;
      const taskNameForAxisDisplay = `${taskNameDisplay.substring(0,25)}${taskNameDisplay.length > 25 ? '...' : ''} (${task.spacecraft})`;

      return {
        id: task.id,
        taskNameForAxis: taskNameForAxisDisplay,
        timeRange: [taskStartMinutesRelativeToDay, taskEndMinutesRelativeToDay] as [number, number],
        fillColorKey: task.type,
        originalTask: task, // Pass the original task for the tooltip
        tooltipLabel: taskNameDisplay,
      };
    }).filter(Boolean) as ProcessedChartDataPoint[];
  }, [tasks, selectedDate, xAxisDomain, effectiveTaskTypeOptions]);

  const yAxisWidth = chartData.length > 0 ? Math.max(...chartData.map(d => d.taskNameForAxis.length)) * 6 + 40 : 80;
  
  const xAxisTickFormatter = (value: number) => { 
    // Value is minutes from the start of selectedDate (UTC)
    const displayHourUTC = Math.floor(value / 60) % 24; 
    const minute = value % 60;
    return `${String(displayHourUTC).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };

  const handleSliderChange = (newRange: [number, number]) => {
    let [newStart, newEnd] = newRange;
    // Ensure minimum window duration
    if (newEnd - newStart < MIN_WINDOW_DURATION_MINUTES) {
      // Prioritize adjusting the one that moved if it maintains/creates min duration
      // This logic can be complex; simplified: if newEnd moved, adjust newStart
      // if newStart moved, adjust newEnd.
      if (newEnd !== viewWindow[1]) { // If end thumb moved
        newStart = Math.max(MIN_SLIDER_MINUTES, newEnd - MIN_WINDOW_DURATION_MINUTES);
      } else { // If start thumb moved (or both, though slider typically moves one)
        newEnd = Math.min(MAX_SLIDER_MINUTES, newStart + MIN_WINDOW_DURATION_MINUTES);
      }
    }
    setViewWindow([Math.round(newStart), Math.round(newEnd)]);
  };

  if (!isClient) { 
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Schedule Graph</CardTitle>
           <CardDescription>
            Schedule for: {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}.
            Times are displayed in UTC. Use slider to adjust view.
          </CardDescription>
          <div className="pt-4 space-y-2">
            <div className="h-6 w-full bg-muted rounded animate-pulse" /> {/* Placeholder for slider */}
          </div>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center text-muted-foreground">Loading chart...</CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Schedule Graph</CardTitle>
         <CardDescription>
            Schedule for: {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}.
            Times are displayed in UTC. Use slider to adjust view.
        </CardDescription>
        <div className="pt-4 space-y-2">
            <Label htmlFor="time-range-slider" className="text-sm font-medium">
              Visible Time Range (UTC): {formatMinutesToTimeLocal(viewWindow[0])} - {formatMinutesToTimeLocal(viewWindow[1])}
            </Label>
            <Slider
              id="time-range-slider"
              min={MIN_SLIDER_MINUTES}
              max={MAX_SLIDER_MINUTES} // Allows selecting up to 48 hours
              step={15} // 15 minute increments
              value={viewWindow}
              onValueChange={handleSliderChange}
              className="w-full"
              aria-label="Time range slider"
            />
        </div>
      </CardHeader>
      <CardContent className="min-h-[250px] flex flex-col justify-center">
        { (chartData.length === 0 && currentTimeLinePosition === null && isClient) ?
            <p className="text-muted-foreground text-center py-8">
              No tasks scheduled for this period on {selectedDate.toLocaleDateString('en-CA', { timeZone: 'UTC' })}.
            </p>
          :
          <ChartContainer config={chartConfig} className="min-h-[200px] h-[calc(40px*var(--visible-tasks,10)+100px)] max-h-[800px] w-full" style={{ '--visible-tasks': Math.max(1, chartData.length) } as React.CSSProperties}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={chartData} 
                margin={{ top: 5, right: 30, left: Math.min(250, yAxisWidth), bottom: 20 }}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} />
                <XAxis
                  type="number"
                  dataKey="timeRange[0]" 
                  domain={xAxisDomain} 
                  tickFormatter={xAxisTickFormatter}
                  label={{ value: "Time (UTC)", position: "insideBottom", offset: -10, dy: 10 }}
                  allowDecimals={false}
                  scale="time" 
                  interval="preserveStartEnd"
                  minTickGap={30} // Min gap between ticks in pixels
                />
                <YAxis
                  type="category"
                  dataKey="id" 
                  tickFormatter={(tickValue) => chartData.find(d => d.id === tickValue)?.taskNameForAxis || ''}
                  width={yAxisWidth}
                  interval={0} // Show all task names if possible
                  domain={chartData.length > 0 ? undefined : ['No Tasks']} // Handle empty data for domain
                  ticks={chartData.length > 0 ? chartData.map(d => d.id) : []} // Explicitly pass ticks
                />
                <Tooltip
                  cursor={{ fill: 'hsla(var(--muted), 0.5)' }}
                  content={<CustomTooltip />}
                />
                <Legend content={<ChartLegendContent />} />
                {chartData.length > 0 && (
                  <Bar dataKey="timeRange" barSize={20} radius={[4, 4, 4, 4]}>
                    {chartData.map((entry) => {
                      const cellColorKey = taskValueToChartKey(entry.fillColorKey);
                      // Directly use the HSL string from chartConfig
                      const colorForCell = chartConfig[cellColorKey]?.color || "hsl(var(--muted))";
                      return (
                        <Cell key={`cell-${entry.id}`} fill={colorForCell} />
                      );
                    })}
                  </Bar>
                )}
                 {currentTimeLinePosition !== null && (
                  <ReferenceLine
                    x={currentTimeLinePosition}
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    strokeDasharray="8 4"
                    ifOverflow="hidden" // Ensure line is clipped to chart area
                    label={{
                      value: "Now",
                      position: "insideTopRight", // Position label relative to the line
                      fill: "hsl(var(--destructive))",
                      fontSize: 12,
                      fontWeight: "bold",
                      dy: -10, // Adjust vertical position
                      dx: 10 // Adjust horizontal position
                    }}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        }
      </CardContent>
    </Card>
  );
}

