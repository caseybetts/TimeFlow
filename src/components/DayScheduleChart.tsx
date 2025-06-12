
"use client";

import type { Task, TaskType, DayChartTimeRangeOption } from "@/types";
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
  ChartTooltipContent,
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
  timeRange: [number, number]; // Minutes relative to 00:00 of selectedDate (potentially offset by DST for view)
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
  const { allTimeRangeOptions, selectedTimeRange, setSelectedTimeRangeId } = useDayChartSettings();
  const [currentTimeLinePosition, setCurrentTimeLinePosition] = useState<number | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const xAxisDomain: [number, number] = useMemo(() => {
    const range = selectedTimeRange; // This is now DST adjusted if applicable
    // These are absolute minutes in the potentially extended timeline (e.g. up to 48 hours worth of minutes)
    const startMinutes = range.startHour * 60 + range.startMinute;
    const endMinutes = range.endHour * 60 + range.endMinute;
    return [startMinutes, endMinutes];
  }, [selectedTimeRange]);


  useEffect(() => {
    const todayUTC = new Date(); // Current UTC time
    
    // Calculate current minutes relative to 00:00 UTC of the selectedDate parameter
    const selectedDateEpochStart = Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate());
    const nowEpoch = todayUTC.getTime();
    const currentMinutesRelativeToSelectedDayStart = (nowEpoch - selectedDateEpochStart) / 60000;
    
    // The "Now" line should represent the actual UTC time on the chart's X-axis,
    // which is already defined by xAxisDomain (which is DST-adjusted if DST is on).
    // So, if DST is active, the domain [0, 1440] effectively becomes [60, 1500] for display.
    // A current UTC time of 10:00 (600 minutes from selectedDate 00:00 UTC)
    // should appear at the 600 mark on the X-axis, regardless of DST on the view.
    // However, if DST is on, what was the 09:00 mark is now the 10:00 mark.
    // The currentMinutePosition is relative to the *displayed* X-axis.
    // The currentMinutesRelativeToSelectedDayStart is the true UTC minute mark.
    
    if (currentMinutesRelativeToSelectedDayStart >= xAxisDomain[0] && currentMinutesRelativeToSelectedDayStart <= xAxisDomain[1]) {
      setCurrentTimeLinePosition(currentMinutesRelativeToSelectedDayStart);
    } else {
      setCurrentTimeLinePosition(null);
    }
  }, [selectedDate, xAxisDomain, tasks]);


  const chartConfig = useMemo(() => {
    return effectiveTaskTypeOptions.reduce((acc, option) => {
      const key = taskValueToChartKey(option.value);
      let color = "hsl(var(--muted))";

      // Keep consistent color mapping based on default task type values
      if (DEFAULT_TASK_TYPE_OPTIONS.find(d => d.value === option.value)?.value === "work") color = "hsl(var(--chart-1))";
      else if (DEFAULT_TASK_TYPE_OPTIONS.find(d => d.value === option.value)?.value === "personal") color = "hsl(var(--chart-2))";
      else if (DEFAULT_TASK_TYPE_OPTIONS.find(d => d.value === option.value)?.value === "errands") color = "hsl(var(--chart-3))";
      else if (DEFAULT_TASK_TYPE_OPTIONS.find(d => d.value === option.value)?.value === "appointment") color = "hsl(var(--chart-4))";
      
      acc[key] = {
        label: option.label,
        color: color,
        icon: DEFAULT_TASK_TYPE_OPTIONS.find(defOpt => defOpt.value === option.value)?.icon,
      };
      return acc;
    }, {} as ChartConfig);
  }, [effectiveTaskTypeOptions]);


  const chartData = useMemo(() => {
    const viewWindowStartMinutes = xAxisDomain[0]; // Already DST adjusted if applicable
    const viewWindowEndMinutes = xAxisDomain[1];   // Already DST adjusted if applicable

    // Epoch milliseconds for 00:00 UTC of the selectedDate
    const selectedDateEpochStartMs = Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate());

    // Epoch milliseconds for the view window boundaries in UTC
    // Note: xAxisDomain minutes are already potentially shifted if DST is active for the *view*,
    // but they still represent offsets from selectedDateEpochStartMs (00:00 UTC of selectedDate)
    const viewWindowStartMs = selectedDateEpochStartMs + viewWindowStartMinutes * 60000;
    const viewWindowEndMs = selectedDateEpochStartMs + viewWindowEndMinutes * 60000;

    const tasksInView = tasks.filter(task => {
      const taskCoreStartMs = new Date(task.startTime).getTime(); // Absolute UTC time
      const taskEffectiveStartMs = taskCoreStartMs - task.preActionDuration * 60000;
      const taskEffectiveEndMs = taskCoreStartMs + (task.duration + task.postActionDuration) * 60000;
      
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
      const taskEffectiveEndMs = taskCoreStartMs + (task.duration + task.postActionDuration) * 60000;

      // Task's start/end minutes relative to 00:00 UTC of selectedDate. These are absolute UTC minute marks.
      let taskStartMinutesRelativeToDay = (taskEffectiveStartMs - selectedDateEpochStartMs) / 60000;
      let taskEndMinutesRelativeToDay = (taskEffectiveEndMs - selectedDateEpochStartMs) / 60000;
      
      // The bar's start/end minutes must be relative to the chart's x-axis domain (viewWindowStartMinutes)
      // and clipped to it.
      const barStartMinutes = Math.max(viewWindowStartMinutes, taskStartMinutesRelativeToDay);
      const barEndMinutes = Math.min(viewWindowEndMinutes, taskEndMinutesRelativeToDay);
      
      if (barStartMinutes >= barEndMinutes) { 
        return null;
      }
      
      const taskTypeDetails = getTaskTypeDetails(task.type, effectiveTaskTypeOptions);
      const taskNameDisplay = task.name || `${taskTypeDetails?.label || task.type} - ${task.spacecraft}`;
      const taskNameForAxisDisplay = `${taskNameDisplay.substring(0,25)}${taskNameDisplay.length > 25 ? '...' : ''} (${task.spacecraft})`;

      return {
        id: task.id,
        taskNameForAxis: taskNameForAxisDisplay,
        // timeRange is what the Bar component uses. It expects values *within* the current XAxis domain.
        // So, if xAxisDomain is [60, 1500] (DST active for full day), and a task is 09:00-10:00 UTC (540-600 mins from selectedDate 00:00),
        // these values (540, 600) are what should be plotted.
        timeRange: [taskStartMinutesRelativeToDay, taskEndMinutesRelativeToDay] as [number, number],
        fillColorKey: task.type,
        originalTask: task,
        tooltipLabel: taskNameDisplay,
      };
    }).filter(Boolean) as ProcessedChartDataPoint[];
  }, [tasks, selectedDate, xAxisDomain, effectiveTaskTypeOptions]);

  if (!isClient) {
    return (
      <Card>
        <CardHeader><CardTitle>Daily Schedule Graph</CardTitle></CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center text-muted-foreground">Loading chart...</CardContent>
      </Card>
    );
  }
  
  if (chartData.length === 0 && currentTimeLinePosition === null) {
     return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Schedule Graph</CardTitle>
          <CardDescription>
            {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} (UTC)
            <span className="text-muted-foreground"> - {selectedTimeRange.label}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <p className="text-muted-foreground">No tasks scheduled for this period on {selectedDate.toLocaleDateString('en-CA', { timeZone: 'UTC' })}.</p>
        </CardContent>
      </Card>
    );
  }

  const yAxisWidth = chartData.length > 0 ? Math.max(...chartData.map(d => d.taskNameForAxis.length)) * 6 + 40 : 80;

  const xAxisTickFormatter = (value: number) => { // value is a minute from the xAxisDomain
    const hour = Math.floor(value / 60) % 24; // Modulo 24 for displaying HH
    const minute = value % 60;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Schedule Graph</CardTitle>
         <CardDescription>
            {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
            {' '}({selectedTimeRange.label.endsWith('DST)') ? 'Effective Local Time with DST' : 'UTC'})
        </CardDescription>
        <div className="w-full sm:w-1/3 md:w-1/4 pt-2">
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
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] h-[calc(40px*var(--visible-tasks,10)+100px)] max-h-[800px] w-full" style={{ '--visible-tasks': Math.max(1, chartData.length) } as React.CSSProperties}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={chartData} // chartData timeRange is absolute UTC minutes from selectedDate 00:00
              margin={{ top: 5, right: 30, left: Math.min(250, yAxisWidth), bottom: 20 }}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} />
              <XAxis
                type="number"
                dataKey="timeRange[0]" // This seems to be ignored if domain is set
                domain={xAxisDomain} // xAxisDomain is DST adjusted if applicable
                tickFormatter={xAxisTickFormatter}
                label={{ value: "Time", position: "insideBottom", offset: -10, dy: 10 }}
                allowDecimals={false}
                scale="time" 
                interval="preserveStartEnd"
                minTickGap={30}
              />
              <YAxis
                type="category"
                dataKey="id"
                tickFormatter={(tick) => chartData.find(d => d.id === tick)?.taskNameForAxis || ''}
                width={yAxisWidth}
                interval={0}
                domain={chartData.length > 0 ? undefined : ['No Tasks']}
                ticks={chartData.length > 0 ? undefined : []}
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
                  x={currentTimeLinePosition} // This value is absolute UTC minutes from selectedDate 00:00
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
      </CardContent>
    </Card>
  );
}
