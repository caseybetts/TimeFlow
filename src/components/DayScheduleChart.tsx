
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
  ChartLegendContent,
} from "@/components/ui/chart";
import { useMemo, useState, useEffect } from "react";
import { formatTaskTime, getTaskTypeDetails, DEFAULT_TASK_TYPE_OPTIONS } from "@/lib/task-utils";
import { useTaskTypeConfig } from "@/hooks/useTaskTypeConfig";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface DayScheduleChartProps {
  tasks: Task[];
  selectedDate: Date;
}

interface ProcessedChartDataPoint {
  id: string;
  taskNameForAxis: string;
  timeRange: [number, number];
  fillColorKey: TaskType;
  originalTask: Task;
  tooltipLabel: string;
  isCompleted: boolean;
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
  console.log("CustomTooltip called (simplified test):", { active, payload, label });
  if (active && payload && payload.length) {
    const data = payload[0].payload as ProcessedChartDataPoint;

    if (!data) {
        console.error("CustomTooltip (simplified): data (payload[0].payload) is undefined!", payload);
        return (
            <div style={{ backgroundColor: 'darkred', color: 'white', padding: '5px', border: '1px solid black', zIndex: 1000 }}>
                Error: Payload data missing.
            </div>
        );
    }
    if (!data.originalTask) {
        console.error("CustomTooltip (simplified): data.originalTask is undefined!", data);
         return (
            <div style={{ backgroundColor: 'darkred', color: 'white', padding: '5px', border: '1px solid black', zIndex: 1000 }}>
                Error: Original task data missing. (Task name: {data.taskNameForAxis || 'Unknown'})
            </div>
        );
    }

    const task = data.originalTask;
    const taskTypeDetailsEffective = getTaskTypeDetails(task.type, DEFAULT_TASK_TYPE_OPTIONS); // Use non-hook version here for simplicity or pass effectiveTaskTypeOptions
    const taskNameDisplay = task.name || `${taskTypeDetailsEffective?.label || task.type} - ${task.spacecraft}`;
    const coreStartTime = new Date(task.startTime);
    const formattedCoreStartTime = formatTaskTime(coreStartTime.toISOString());

    return (
      <div style={{
          backgroundColor: 'hsla(var(--background) / 0.9)',
          border: '1px solid hsl(var(--border))',
          padding: '10px',
          borderRadius: 'var(--radius)',
          boxShadow: '0 4px 6px hsla(var(--foreground) / 0.1)',
          color: 'hsl(var(--foreground))',
          fontSize: '0.875rem',
          zIndex: 1000
        }}>
        <p style={{ fontWeight: '600', margin: '0 0 8px 0', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '8px' }}>
          {taskNameDisplay} <span style={{opacity: 0.7}}>({task.isCompleted ? "Completed" : "Pending"})</span>
        </p>
        <p style={{ margin: '0 0 5px 0' }}><span style={{fontWeight: '500'}}>Spacecraft:</span> {task.spacecraft}</p>
        <p style={{ margin: '0 0 5px 0' }}><span style={{fontWeight: '500'}}>Core Starts:</span> {formattedCoreStartTime}</p>
        <p style={{ margin: '0 0 5px 0' }}><span style={{fontWeight: '500'}}>Pre-Action:</span> {task.preActionDuration} min</p>
        <p style={{ margin: '0' }}><span style={{fontWeight: '500'}}>Post-Action:</span> {task.postActionDuration} min</p>
      </div>
    );
  }
  return null;
};

const MIN_SLIDER_MINUTES = 0;
const MAX_SLIDER_MINUTES = 48 * 60; // Allows up to a 48-hour window, though UI limits to 24hr of selectedDate + 24hr into next
const MIN_WINDOW_DURATION_MINUTES = 30; // Minimum 30-minute window
const DEFAULT_INITIAL_WINDOW_MINUTES: [number, number] = [0 * 60, 24 * 60]; // Default to full 24h of selectedDate

export function DayScheduleChart({ tasks, selectedDate }: DayScheduleChartProps) {
  const [isClient, setIsClient] = useState(false);
  const { effectiveTaskTypeOptions } = useTaskTypeConfig(); // Hook for dynamic task types
  const [currentTimeLinePosition, setCurrentTimeLinePosition] = useState<number | null>(null);
  const [viewWindow, setViewWindow] = useState<[number, number]>(DEFAULT_INITIAL_WINDOW_MINUTES);
  const [refreshKey, setRefreshKey] = useState(0);


  useEffect(() => {
    setIsClient(true);
  }, []);

  const xAxisDomain: [number, number] = useMemo(() => {
    // viewWindow is [startMinutesRelativeToSelectedDayStart, endMinutesRelativeToSelectedDayStart]
    return viewWindow;
  }, [viewWindow]);


  useEffect(() => {
    // This effect calculates the "Now" line's position
    const todayUTC = new Date(); // Current time in UTC
    const selectedDateEpochStart = Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate()); // Start of selectedDate in UTC ms

    const nowEpoch = todayUTC.getTime(); // Current time in UTC ms

    // Calculate "now" in minutes relative to the start of the selectedDate (UTC)
    const currentMinutesRelativeToSelectedDayStart = (nowEpoch - selectedDateEpochStart) / 60000;

    // Check if "now" is within the current xAxisDomain (which is also relative to selectedDate start)
    if (currentMinutesRelativeToSelectedDayStart >= xAxisDomain[0] && currentMinutesRelativeToSelectedDayStart <= xAxisDomain[1]) {
      setCurrentTimeLinePosition(currentMinutesRelativeToSelectedDayStart);
    } else {
      setCurrentTimeLinePosition(null); // "Now" is outside the current view
    }
  // Rerun when selectedDate, the chart's view window (xAxisDomain), tasks, or refreshKey change
  }, [selectedDate, xAxisDomain, tasks, refreshKey]);


  const chartConfig = useMemo(() => {
    // Build chartConfig based on effectiveTaskTypeOptions (dynamic)
    return effectiveTaskTypeOptions.reduce((acc, option) => {
      const key = taskValueToChartKey(option.value); // e.g., "fsv", "rtp"
      let color = "hsl(var(--muted))"; // Default color

      // Find the base default definition for this task type value
      const defaultType = DEFAULT_TASK_TYPE_OPTIONS.find(d => d.value === option.value);

      if (defaultType) {
        // Assign chart-specific theme colors based on the *original* task type value
        switch (defaultType.value) {
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
          // Add more cases here if you have more default task types with specific chart colors
          default:
            // Use the color defined in defaultType.color if no specific chart color mapping
            // This part might be redundant if all defaults are covered above or use muted
            break;
        }
      }

      acc[key] = {
        label: option.label, // Use the (potentially user-customized) label
        color: color,
        icon: option.icon || defaultType?.icon // Use configured icon or fallback to default
      };
      return acc;
    }, {} as ChartConfig);
  }, [effectiveTaskTypeOptions]);


  const chartData = useMemo(() => {
    // These are minutes relative to the start of selectedDate (UTC 00:00)
    const viewWindowStartMinutesUTC = xAxisDomain[0];
    const viewWindowEndMinutesUTC = xAxisDomain[1];

    // Absolute start of selectedDate in UTC milliseconds
    const selectedDateEpochStartMs = Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate());

    // Absolute UTC millisecond boundaries of the chart's current view
    const viewWindowStartMs = selectedDateEpochStartMs + viewWindowStartMinutesUTC * 60000;
    const viewWindowEndMs = selectedDateEpochStartMs + viewWindowEndMinutesUTC * 60000;

    // Filter tasks that fall within the absolute view window
    const tasksInView = tasks.filter(task => {
      const taskCoreStartMs = new Date(task.startTime).getTime(); // Core task start in UTC ms
      const taskEffectiveStartMs = taskCoreStartMs - task.preActionDuration * 60000; // Includes pre-action
      const taskEffectiveEndMs = taskCoreStartMs + (task.duration + task.postActionDuration) * 60000; // Includes core (1 min) and post-action

      // Task is in view if its effective span overlaps with the view window
      return taskEffectiveStartMs < viewWindowEndMs && taskEffectiveEndMs > viewWindowStartMs;
    });

    // Sort tasks for consistent Y-axis ordering
     tasksInView.sort((a,b) => {
        const effectiveStartTimeA = new Date(a.startTime).getTime() - (a.preActionDuration * 60000);
        const effectiveStartTimeB = new Date(b.startTime).getTime() - (b.preActionDuration * 60000);
        return effectiveStartTimeA - effectiveStartTimeB;
    });

    return tasksInView.map((task) => {
      const taskCoreStartMs = new Date(task.startTime).getTime();
      const taskEffectiveStartMs = taskCoreStartMs - task.preActionDuration * 60000; // Start of the bar (UTC ms)

      // Calculate bar start time in minutes relative to selectedDate UTC 00:00
      let taskStartMinutesRelativeToDay = (taskEffectiveStartMs - selectedDateEpochStartMs) / 60000;

      const totalEffectiveDurationMinutes = task.preActionDuration + task.duration + task.postActionDuration;
      let taskEndMinutesRelativeToDay = taskStartMinutesRelativeToDay + totalEffectiveDurationMinutes; // End of the bar

      const taskTypeDetails = getTaskTypeDetails(task.type, effectiveTaskTypeOptions);
      const taskNameDisplay = task.name || `${taskTypeDetails?.label || task.type} - ${task.spacecraft}`;
      const taskNameForAxisDisplay = `${taskNameDisplay.substring(0,25)}${taskNameDisplay.length > 25 ? '...' : ''} (${task.spacecraft})`;


      return {
        id: task.id,
        taskNameForAxis: taskNameForAxisDisplay,
        // timeRange is [startMinuteRelativeToDay, endMinuteRelativeToDay] for the bar
        timeRange: [taskStartMinutesRelativeToDay, taskEndMinutesRelativeToDay] as [number, number],
        fillColorKey: task.type, // e.g., "fsv", "rtp" for chartConfig lookup
        originalTask: task,
        tooltipLabel: taskNameDisplay,
        isCompleted: task.isCompleted || false,
      };
    }).filter(Boolean) as ProcessedChartDataPoint[]; // filter(Boolean) might not be necessary if map always returns object
  }, [tasks, selectedDate, xAxisDomain, effectiveTaskTypeOptions]); // Ensure all dependencies are listed

  // Dynamically calculate Y-axis width based on the longest task name
  const yAxisWidth = chartData.length > 0 ? Math.max(...chartData.map(d => d.taskNameForAxis.length)) * 6 + 40 : 80; // Heuristic for width

  const xAxisTickFormatter = (value: number) => {
    // 'value' is minutes from the start of selectedDate (UTC 00:00)
    const displayHourUTC = Math.floor(value / 60) % 24; // Hour in UTC
    const minute = value % 60;
    return `${String(displayHourUTC).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };

  const handleSliderChange = (newRange: [number, number]) => {
    let [newStart, newEnd] = newRange;

    // Enforce minimum window duration
    if (newEnd - newStart < MIN_WINDOW_DURATION_MINUTES) {
      // Prioritize the thumb being moved
      if (newEnd !== viewWindow[1]) { // If end thumb moved
        newStart = Math.max(MIN_SLIDER_MINUTES, newEnd - MIN_WINDOW_DURATION_MINUTES);
      } else { // If start thumb moved (or both, though slider typically moves one)
        newEnd = Math.min(MAX_SLIDER_MINUTES, newStart + MIN_WINDOW_DURATION_MINUTES);
      }
    }
    setViewWindow([Math.round(newStart), Math.round(newEnd)]);
  };

  const handleRefreshNowLine = () => {
    setRefreshKey(prevKey => prevKey + 1); // Trigger re-calculation of "Now" line
  };

  if (!isClient) {
    // Basic skeleton loader for server-side rendering or before client hydration
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Schedule Graph</CardTitle>
           <CardDescription>
            Schedule for: {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}.
            Times are displayed in UTC. Use slider to adjust view.
          </CardDescription>
          <div className="pt-4 space-y-2">
            {/* Skeleton for slider */}
            <div className="h-6 w-full bg-muted rounded animate-pulse" />
          </div>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center text-muted-foreground">Loading chart...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Daily Schedule Graph</CardTitle>
                <CardDescription>
                    Schedule for: {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}.
                    Times are displayed in UTC. Use slider to adjust view.
                </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefreshNowLine} aria-label="Refresh 'Now' line">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh 'Now'
            </Button>
        </div>
        <div className="pt-4 space-y-2">
            <Label htmlFor="time-range-slider" className="text-sm font-medium">
              Visible Time Range (UTC): {formatMinutesToTimeLocal(viewWindow[0])} - {formatMinutesToTimeLocal(viewWindow[1])}
            </Label>
            <Slider
              id="time-range-slider"
              min={MIN_SLIDER_MINUTES} // 0 minutes
              max={MAX_SLIDER_MINUTES} // 24*60*2 = 2880 minutes for up to 48hr view relative to selectedDate start
              step={15} // 15-minute increments
              value={viewWindow}
              onValueChange={handleSliderChange}
              className="w-full"
              aria-label="Time range slider"
            />
        </div>
      </CardHeader>
      <CardContent className="min-h-[250px] flex flex-col justify-center">
        {/* Conditional rendering for no tasks / no "Now" line vs. chart */}
        { (chartData.length === 0 && currentTimeLinePosition === null && isClient) ?
            <p className="text-muted-foreground text-center py-8">
              No tasks scheduled for this period on {selectedDate.toLocaleDateString('en-CA', { timeZone: 'UTC' })}.
            </p>
          :
          // ChartContainer defines dynamic height based on number of tasks
          <ChartContainer config={chartConfig} className="min-h-[200px] h-[calc(40px*var(--visible-tasks,10)+100px)] max-h-[800px] w-full" style={{ '--visible-tasks': Math.max(1, chartData.length) } as React.CSSProperties}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={chartData} // Processed data for the chart
                margin={{ top: 5, right: 30, left: Math.min(250, yAxisWidth), bottom: 20 }} // Dynamic left margin
                barCategoryGap="20%" // Spacing between bars
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} />
                <XAxis
                  type="number"
                  dataKey="timeRange[0]" // This is just to satisfy Recharts, actual rendering is tricky with range bars
                  domain={xAxisDomain} // [startMinute, endMinute] relative to selectedDate
                  tickFormatter={xAxisTickFormatter} // Formats tick to HH:mm UTC
                  label={{ value: "Time (UTC)", position: "insideBottom", offset: -10, dy: 10 }}
                  allowDecimals={false}
                  scale="time" // Treat values as time-based
                  interval="preserveStartEnd" // Show first and last tick
                  minTickGap={30} // Minimum pixels between ticks
                />
                <YAxis
                  type="category"
                  dataKey="id" // Use unique task ID for Y-axis category
                  tickFormatter={(tickValue) => chartData.find(d => d.id === tickValue)?.taskNameForAxis || ''} // Display task name
                  width={yAxisWidth} // Dynamic width
                  interval={0} // Show all ticks (task names)
                  domain={chartData.length > 0 ? undefined : ['No Tasks']} // Handle empty state
                  ticks={chartData.length > 0 ? chartData.map(d => d.id) : []} // Explicitly set ticks
                />
                <Tooltip
                  cursor={{ fill: 'hsla(var(--muted), 0.5)' }} // Styling for hover cursor
                  content={<CustomTooltip />} // Use our custom tooltip
                  wrapperStyle={{ zIndex: 1100 }}
                />
                <Legend content={<ChartLegendContent />} />
                {chartData.length > 0 && (
                  <Bar dataKey="timeRange" barSize={20} radius={[4, 4, 4, 4]}>
                    {chartData.map((entry) => {
                      const cellColorKey = taskValueToChartKey(entry.fillColorKey);
                      let colorForCell = chartConfig[cellColorKey]?.color || "hsl(var(--muted))";
                      
                      if (entry.isCompleted) {
                        // Modify color for completed tasks to be dimmer
                        // Assumes colorForCell is in 'hsl(value)' or 'hsl(var(--css-var))' format
                        if (colorForCell.startsWith("hsl(var(--")) { // e.g. hsl(var(--chart-1))
                           const variablePart = colorForCell.substring(4, colorForCell.length - 1); // var(--chart-1)
                           colorForCell = `hsla(${variablePart}, 0.5)`; // hsla(var(--chart-1), 0.5)
                        } else if (colorForCell.startsWith("hsl(")) { // e.g. hsl(220 70% 50%)
                           const valuesPart = colorForCell.substring(4, colorForCell.length - 1); // 220 70% 50%
                           colorForCell = `hsla(${valuesPart}, 0.5)`; // hsla(220 70% 50%, 0.5)
                        }
                        // If it's a non-HSL color, dimming is harder. For now, it relies on HSL format.
                      }
                      
                      return (
                        <Cell key={`cell-${entry.id}`} fill={colorForCell} />
                      );
                    })}
                  </Bar>
                )}
                 {currentTimeLinePosition !== null && (
                  <ReferenceLine
                    x={currentTimeLinePosition} // Position in minutes relative to selectedDate start
                    stroke="hsl(var(--destructive))" // Red color for "Now" line
                    strokeWidth={2}
                    strokeDasharray="8 4" // Dashed line style
                    ifOverflow="hidden" // Don't draw outside chart area
                    label={{
                      value: "Now",
                      position: "insideTopRight",
                      fill: "hsl(var(--destructive))",
                      fontSize: 12,
                      fontWeight: "bold",
                      dy: -10, // Offset Y
                      dx: 10   // Offset X
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
