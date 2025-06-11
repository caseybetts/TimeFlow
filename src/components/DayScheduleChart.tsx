
"use client";

import type { Task, TaskType, TaskTypeOption, DayChartTimeRangeOption } from "@/types";
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
  ChartTooltipContent,
  type ChartConfig,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { useMemo, useState, useEffect } from "react";
import { formatTaskTime, getTaskTypeDetails, DEFAULT_TASK_TYPE_OPTIONS } from "@/lib/task-utils";
import { useTaskTypeConfig } from "@/hooks/useTaskTypeConfig";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useDayChartSettings, DEFAULT_FULL_DAY_TIME_RANGE } from "@/hooks/useDayChartSettings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DayScheduleChartProps {
  tasks: Task[];
  selectedDate: Date; // This is the UTC date to display
}

interface ProcessedChartDataPoint {
  id: string;
  taskNameForAxis: string;
  timeRange: [number, number]; // [startMinuteOnDay, endMinuteOnDay]
  fillColorKey: TaskType; // This will map to a key in chartConfig
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

    const coreStartTime = new Date(task.startTime);
    const effectiveStartTime = new Date(coreStartTime.getTime() - task.preActionDuration * 60000);
    const coreEndTime = new Date(coreStartTime.getTime() + task.duration * 60000);
    const effectiveEndTime = new Date(coreEndTime.getTime() + task.postActionDuration * 60000);

    return (
      <ChartTooltipContent
        className="w-[280px] bg-background"
        label={ <div className="font-bold">{task.name} ({taskTypeDetails?.label || task.type})</div> }
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
    const range = selectedTimeRange || DEFAULT_FULL_DAY_TIME_RANGE;
    const startMinutes = range.startHour * 60 + range.startMinute;
    const endMinutes = range.endHour * 60 + range.endMinute;
    return [startMinutes, Math.min(endMinutes, 1440)]; // Cap at 1440 minutes (24:00)
  }, [selectedTimeRange]);


  useEffect(() => {
    const todayUTC = new Date();
    const isSelectedDateToday =
      selectedDate.getUTCFullYear() === todayUTC.getUTCFullYear() &&
      selectedDate.getUTCMonth() === todayUTC.getUTCMonth() &&
      selectedDate.getUTCDate() === todayUTC.getUTCDate();

    if (isSelectedDateToday) {
      const now = new Date();
      const currentMinutesUTC = now.getUTCHours() * 60 + now.getUTCMinutes();
       if (currentMinutesUTC >= xAxisDomain[0] && currentMinutesUTC <= xAxisDomain[1]) {
        setCurrentTimeLinePosition(currentMinutesUTC);
      } else {
        setCurrentTimeLinePosition(null);
      }
    } else {
      setCurrentTimeLinePosition(null);
    }
  }, [selectedDate, xAxisDomain]);


  const chartConfig = useMemo(() => {
    return effectiveTaskTypeOptions.reduce((acc, option) => {
      const key = taskValueToChartKey(option.value);
      const defaultOption = DEFAULT_TASK_TYPE_OPTIONS.find(defOpt => defOpt.value === option.value);
      let color = "hsl(var(--muted))"; 

      if (option.value === "work") color = "hsl(var(--chart-1))";
      else if (option.value === "personal") color = "hsl(var(--chart-2))";
      else if (option.value === "errands") color = "hsl(var(--chart-3))";
      else if (option.value === "appointment") color = "hsl(var(--chart-4))";
      
      acc[key] = {
        label: option.label,
        color: color,
        icon: defaultOption?.icon,
      };
      return acc;
    }, {} as ChartConfig);
  }, [effectiveTaskTypeOptions]);


  const chartData = useMemo(() => {
    const dayStart = new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate(), 0, 0, 0, 0));

    const tasksForDay = tasks.filter(task => {
      const coreTaskStartTime = new Date(task.startTime); 
      const taskEffectiveStart = new Date(coreTaskStartTime.getTime() - task.preActionDuration * 60000);
      const taskEffectiveEnd = new Date(coreTaskStartTime.getTime() + (task.duration + task.postActionDuration) * 60000);
      
      const taskStartDay = new Date(Date.UTC(taskEffectiveStart.getUTCFullYear(), taskEffectiveStart.getUTCMonth(), taskEffectiveStart.getUTCDate()));
      const taskEndDay = new Date(Date.UTC(taskEffectiveEnd.getUTCFullYear(), taskEffectiveEnd.getUTCMonth(), taskEffectiveEnd.getUTCDate()));
      
      return taskStartDay.getTime() <= selectedDate.getTime() && taskEndDay.getTime() >= selectedDate.getTime();
    });
    
    tasksForDay.sort((a,b) => {
        const effectiveStartTimeA = new Date(a.startTime).getTime() - (a.preActionDuration * 60000);
        const effectiveStartTimeB = new Date(b.startTime).getTime() - (b.preActionDuration * 60000);
        return effectiveStartTimeA - effectiveStartTimeB;
    });

    return tasksForDay.map((task) => {
      const coreTaskStartTime = new Date(task.startTime);
      const taskEffectiveStart = new Date(coreTaskStartTime.getTime() - task.preActionDuration * 60000);
      const taskEffectiveEnd = new Date(coreTaskStartTime.getTime() + (task.duration + task.postActionDuration) * 60000);

      let startMinutesOnDay = (taskEffectiveStart.getTime() - dayStart.getTime()) / 60000;
      let endMinutesOnDay = (taskEffectiveEnd.getTime() - dayStart.getTime()) / 60000;

      startMinutesOnDay = Math.max(xAxisDomain[0], startMinutesOnDay);
      endMinutesOnDay = Math.min(xAxisDomain[1], endMinutesOnDay);
      
      if (startMinutesOnDay >= xAxisDomain[1] || endMinutesOnDay <= xAxisDomain[0] || startMinutesOnDay >= endMinutesOnDay) {
        return null; 
      }
      
      return {
        id: task.id,
        taskNameForAxis: `${task.name.substring(0,25)}${task.name.length > 25 ? '...' : ''}`,
        timeRange: [startMinutesOnDay, endMinutesOnDay] as [number, number],
        fillColorKey: task.type, 
        originalTask: task,
        tooltipLabel: task.name,
      };
    }).filter(Boolean) as ProcessedChartDataPoint[];
  }, [tasks, selectedDate, xAxisDomain]);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Schedule Graph</CardTitle>
         <CardDescription>
            {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} (UTC)
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
              data={chartData}
              margin={{ top: 5, right: 30, left: Math.min(200, yAxisWidth), bottom: 20 }}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} />
              <XAxis
                type="number"
                domain={xAxisDomain}
                tickFormatter={(value) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`}
                label={{ value: "Time (UTC)", position: "insideBottom", offset: -10, dy: 10 }}
                allowDecimals={false}
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
                    // Directly use the color defined in chartConfig for the Cell's fill
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
      </CardContent>
    </Card>
  );
}
