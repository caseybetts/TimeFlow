
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
import { useDayChartSettings } from "@/hooks/useDayChartSettings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

const CustomTooltip = ({ active, payload, label }: any) => {
  const { effectiveTaskTypeOptions } = useTaskTypeConfig();
  if (active && payload && payload.length) {
    const data = payload[0].payload as ProcessedChartDataPoint;
    const task = data.originalTask;
    const taskTypeDetails = getTaskTypeDetails(task.type, effectiveTaskTypeOptions);
    const taskNameDisplay = task.name || `${taskTypeDetails?.label || task.type} - ${task.spacecraft}`;

    const coreStartTime = new Date(task.startTime);
    const effectiveStartTime = new Date(coreStartTime.getTime() - task.preActionDuration * 60000);
    const coreEndTime = new Date(coreStartTime.getTime() + task.duration * 60000);
    const effectiveEndTime = new Date(coreEndTime.getTime() + task.postActionDuration * 60000);

    return (
      <ChartTooltipContent
        className="w-[300px] bg-background"
        label={ <div className="font-bold">{taskNameDisplay} ({taskTypeDetails?.label || task.type} / {task.spacecraft})</div> }
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


export function DayScheduleChart({ tasks, selectedDate }: DayScheduleChartProps) {
  const [isClient, setIsClient] = useState(false);
  const { effectiveTaskTypeOptions } = useTaskTypeConfig();
  const { allTimeRangeOptions, selectedTimeRange, setSelectedTimeRangeId, isDstActive } = useDayChartSettings();
  const [currentTimeLinePosition, setCurrentTimeLinePosition] = useState<number | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const xAxisDomain: [number, number] = useMemo(() => {
    // selectedTimeRange start/endHour are already calculated UTC hours relative to 00:00 of selectedDate
    // e.g., Mids MST (23:00-07:30 local) might be startHour=30, endHour=38.5 (relative to selectedDate 00:00 UTC)
    const startMinutes = selectedTimeRange.startHour * 60 + selectedTimeRange.startMinute;
    const endMinutes = selectedTimeRange.endHour * 60 + selectedTimeRange.endMinute;
    return [startMinutes, endMinutes];
  }, [selectedTimeRange]);


  useEffect(() => {
    const todayUTC = new Date(); // Current UTC time
    
    // selectedDateEpochStart is 00:00:00 UTC of the day the chart is displaying
    const selectedDateEpochStart = Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate());
    const nowEpoch = todayUTC.getTime();
    
    // currentMinutesRelativeToSelectedDayStart is minutes from 00:00 UTC of selectedDate to now (UTC)
    const currentMinutesRelativeToSelectedDayStart = (nowEpoch - selectedDateEpochStart) / 60000;
    
    if (currentMinutesRelativeToSelectedDayStart >= xAxisDomain[0] && currentMinutesRelativeToSelectedDayStart <= xAxisDomain[1]) {
      setCurrentTimeLinePosition(currentMinutesRelativeToSelectedDayStart);
    } else {
      setCurrentTimeLinePosition(null);
    }
  }, [selectedDate, xAxisDomain, tasks]);


  const chartConfig = useMemo(() => {
    return effectiveTaskTypeOptions.reduce((acc, option) => {
      const key = taskValueToChartKey(option.value);
      let color = "hsl(var(--muted))"; // Default color

      // Assign colors based on default task types for consistency
      const defaultType = DEFAULT_TASK_TYPE_OPTIONS.find(d => d.value === option.value);
      if (defaultType) {
          if (defaultType.value === "work") color = "hsl(var(--chart-1))";
          else if (defaultType.value === "personal") color = "hsl(var(--chart-2))";
          else if (defaultType.value === "errands") color = "hsl(var(--chart-3))";
          else if (defaultType.value === "appointment") color = "hsl(var(--chart-4))";
      }
      
      acc[key] = {
        label: option.label,
        color: color,
        icon: DEFAULT_TASK_TYPE_OPTIONS.find(defOpt => defOpt.value === option.value)?.icon,
      };
      return acc;
    }, {} as ChartConfig);
  }, [effectiveTaskTypeOptions]);


  const chartData = useMemo(() => {
    // xAxisDomain is in UTC minutes from 00:00 of selectedDate (e.g., Mids: [1800, 2310])
    const viewWindowStartMinutesUTC = xAxisDomain[0];
    const viewWindowEndMinutesUTC = xAxisDomain[1];

    const selectedDateEpochStartMs = Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate());

    // These are absolute UTC millisecond timestamps for the view window boundaries
    const viewWindowStartMs = selectedDateEpochStartMs + viewWindowStartMinutesUTC * 60000;
    const viewWindowEndMs = selectedDateEpochStartMs + viewWindowEndMinutesUTC * 60000;

    const tasksInView = tasks.filter(task => {
      const taskCoreStartMs = new Date(task.startTime).getTime(); // Absolute UTC time
      const taskEffectiveStartMs = taskCoreStartMs - task.preActionDuration * 60000;
      const taskEffectiveEndMs = taskCoreStartMs + (task.duration + task.postActionDuration) * 60000;
      
      // Standard interval overlap check
      return taskEffectiveStartMs < viewWindowEndMs && taskEffectiveEndMs > viewWindowStartMs;
    });
    
    tasksInView.sort((a,b) => {
        const effectiveStartTimeA = new Date(a.startTime).getTime() - (a.preActionDuration * 60000);
        const effectiveStartTimeB = new Date(b.startTime).getTime() - (b.preActionDuration * 60000);
        return effectiveStartTimeA - effectiveStartTimeB;
    });

    return tasksInView.map((task) => {
      const taskCoreStartMs = new Date(task.startTime).getTime();
      const taskEffectiveStartMs = taskCoreStartMs - task.preActionDuration * 60000;

      // taskStartMinutesRelativeToDay is the task's start in minutes from 00:00 UTC of `selectedDate`.
      // This positions the bar correctly on the X-axis which uses the same relative minute scale.
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
        originalTask: task,
        tooltipLabel: taskNameDisplay,
      };
    }).filter(Boolean) as ProcessedChartDataPoint[];
  }, [tasks, selectedDate, xAxisDomain, effectiveTaskTypeOptions]);

  const yAxisWidth = chartData.length > 0 ? Math.max(...chartData.map(d => d.taskNameForAxis.length)) * 6 + 40 : 80;
  
  const utcOffsetForDisplay = isDstActive ? 6 : 7; // MDT: UTC-6, MST: UTC-7

  const xAxisTickFormatter = (value: number) => { // value is an absolute UTC minute from selectedDate 00:00 UTC
    const hourUTC = Math.floor(value / 60);
    const localHour = (hourUTC - utcOffsetForDisplay + 2400) % 24; 
    const minute = value % 60;
    return `${String(localHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };

  const localTimeZoneLabel = isDstActive ? 'MDT' : 'MST';

  if (!isClient) { // Keep the skeleton for initial load
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Schedule Graph</CardTitle>
           <CardDescription>
            {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
            {' '}(Times shown in {localTimeZoneLabel})
          </CardDescription>
           <div className="w-full sm:w-2/3 md:w-1/2 lg:w-1/3 pt-2">
            <Select value={selectedTimeRange.id} onValueChange={setSelectedTimeRangeId}>
                <SelectTrigger>
                    <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                    {allTimeRangeOptions.map(option => (
                        <SelectItem key={option.id} value={option.id}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
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
            {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
            {' '}(Times shown in {localTimeZoneLabel})
        </CardDescription>
        <div className="w-full sm:w-2/3 md:w-1/2 lg:w-1/3 pt-2">
            <Select value={selectedTimeRange.id} onValueChange={setSelectedTimeRangeId}>
                <SelectTrigger>
                    <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                    {allTimeRangeOptions.map(option => (
                        <SelectItem key={option.id} value={option.id}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
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
                  label={{ value: `Time (${localTimeZoneLabel})`, position: "insideBottom", offset: -10, dy: 10 }}
                  allowDecimals={false}
                  scale="time" 
                  interval="preserveStartEnd"
                  minTickGap={30}
                />
                <YAxis
                  type="category"
                  dataKey="id" // Use the unique task ID for the Y-axis dataKey
                  tickFormatter={(tickValue) => chartData.find(d => d.id === tickValue)?.taskNameForAxis || ''}
                  width={yAxisWidth}
                  interval={0}
                  domain={chartData.length > 0 ? undefined : ['No Tasks']} // Handle empty data for domain/ticks
                  ticks={chartData.length > 0 ? chartData.map(d => d.id) : []} // Use actual task IDs for ticks
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
                    ifOverflow="hidden"
                    label={{
                      value: "Now",
                      position: "insideTopRight",
                      fill: "hsl(var(--destructive))",
                      fontSize: 12,
                      fontWeight: "bold",
                      dy: -10,
                      dx: 10
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

