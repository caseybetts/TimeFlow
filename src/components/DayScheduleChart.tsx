
"use client";

import type { Task, TaskType, TaskTypeOption } from "@/types";
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
import { useTaskTypeConfig } from "@/hooks/useTaskTypeConfig"; // Import hook
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DayScheduleChartProps {
  tasks: Task[];
  selectedDate: Date;
}

interface ProcessedChartDataPoint {
  id: string;
  taskNameForAxis: string;
  timeRange: [number, number];
  fillColorKey: TaskType; // This will be the 'value' of the task type
  originalTask: Task;
  tooltipLabel: string;
}

// Maps the fixed 'value' of a task type to a chart key (e.g., "work" -> "work")
const taskValueToChartKey = (taskValue: TaskType): string => {
  return taskValue.toLowerCase().replace(/\s+/g, '');
};

const CustomTooltip = ({ active, payload, label }: any) => {
  const { effectiveTaskTypeOptions } = useTaskTypeConfig(); // Use hook for labels
  if (active && payload && payload.length) {
    const data = payload[0].payload as ProcessedChartDataPoint;
    const task = data.originalTask;
    // Get details (like configured label) using effective options
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
  const { effectiveTaskTypeOptions } = useTaskTypeConfig(); // Get effective options for labels
  const [currentTimeLinePosition, setCurrentTimeLinePosition] = useState<number | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const todayUTC = new Date();
    const isSelectedDateToday =
      selectedDate.getUTCFullYear() === todayUTC.getUTCFullYear() &&
      selectedDate.getUTCMonth() === todayUTC.getUTCMonth() &&
      selectedDate.getUTCDate() === todayUTC.getUTCDate();

    if (isSelectedDateToday) {
      const now = new Date();
      const currentMinutesUTC = now.getUTCHours() * 60 + now.getUTCMinutes();
      setCurrentTimeLinePosition(currentMinutesUTC);
    } else {
      setCurrentTimeLinePosition(null);
    }
  }, [selectedDate]);

  // Chart config now uses effective labels but fixed icons/colors from defaults
  const chartConfig = useMemo(() => {
    return effectiveTaskTypeOptions.reduce((acc, option) => {
      const key = taskValueToChartKey(option.value);
      const defaultOption = DEFAULT_TASK_TYPE_OPTIONS.find(defOpt => defOpt.value === option.value);
      let color = "hsl(var(--muted))"; // Default color

      // Determine color based on the fixed 'value' using a simple mapping from defaults
      if (defaultOption) {
        if (option.value === "work") color = "hsl(var(--chart-1))";
        else if (option.value === "personal") color = "hsl(var(--chart-2))";
        else if (option.value === "errands") color = "hsl(var(--chart-3))";
        else if (option.value === "appointment") color = "hsl(var(--chart-4))";
      }
      
      acc[key] = {
        label: option.label, // Use user-configured label
        color: color,
        icon: defaultOption?.icon, // Use default icon
      };
      return acc;
    }, {} as ChartConfig);
  }, [effectiveTaskTypeOptions]);


  const chartData = useMemo(() => {
    const dayStart = new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate(), 0, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate(), 23, 59, 59, 999));

    const tasksForDay = tasks.filter(task => {
      const coreTaskStartTime = new Date(task.startTime);
      const taskEffectiveStart = new Date(coreTaskStartTime.getTime() - task.preActionDuration * 60000);
      const taskEffectiveEnd = new Date(coreTaskStartTime.getTime() + (task.duration + task.postActionDuration) * 60000);
      return taskEffectiveStart.getTime() <= dayEnd.getTime() && taskEffectiveEnd.getTime() >= dayStart.getTime();
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

      const startMinutesOnDay = Math.max(0, (taskEffectiveStart.getTime() - dayStart.getTime()) / 60000);
      const endMinutesOnDay = Math.min(1440, (taskEffectiveEnd.getTime() - dayStart.getTime()) / 60000);
      
      if (startMinutesOnDay >= 1440 || endMinutesOnDay <= 0 || startMinutesOnDay >= endMinutesOnDay) {
        return null; 
      }
      
      return {
        id: task.id,
        taskNameForAxis: `${task.name.substring(0,25)}${task.name.length > 25 ? '...' : ''}`,
        timeRange: [startMinutesOnDay, endMinutesOnDay] as [number, number],
        fillColorKey: task.type, // This is the 'value' (e.g., "work")
        originalTask: task,
        tooltipLabel: task.name,
      };
    }).filter(Boolean) as ProcessedChartDataPoint[];
  }, [tasks, selectedDate]);

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
        <CardHeader><CardTitle>Daily Schedule Graph</CardTitle></CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <p className="text-muted-foreground">No tasks scheduled for {selectedDate.toLocaleDateString('en-CA', { timeZone: 'UTC' })}.</p>
        </CardContent>
      </Card>
    );
  }

  const yAxisWidth = chartData.length > 0 ? Math.max(...chartData.map(d => d.taskNameForAxis.length)) * 6 + 40 : 80;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Schedule Graph - {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} (UTC)</CardTitle>
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
                domain={[0, 1440]}
                ticks={[0, 180, 360, 540, 720, 900, 1080, 1260, 1440]}
                tickFormatter={(value) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`}
                label={{ value: "Time (UTC)", position: "insideBottom", offset: -10, dy: 10 }}
              />
              <YAxis
                type="category"
                dataKey="id"
                tickFormatter={(tick) => chartData.find(d => d.id === tick)?.taskNameForAxis || ''}
                width={yAxisWidth}
                interval={0}
                domain={chartData.length > 0 ? undefined : ['No Tasks']} // Provide a dummy domain if no tasks
                ticks={chartData.length > 0 ? undefined : []} // Hide ticks if no tasks
              />
              <Tooltip
                cursor={{ fill: 'hsla(var(--muted), 0.5)' }}
                content={<CustomTooltip />}
              />
              <Legend content={<ChartLegendContent />} />
              {chartData.length > 0 && (
                <Bar dataKey="timeRange" barSize={20} radius={[4, 4, 4, 4]}>
                  {chartData.map((entry) => (
                    // Use taskValueToChartKey to ensure we reference the correct key in chartConfig
                    <Cell key={`cell-${entry.id}`} fill={`var(--color-${taskValueToChartKey(entry.fillColorKey)})`} />
                  ))}
                </Bar>
              )}
               {currentTimeLinePosition !== null && (
                <ReferenceLine
                  x={currentTimeLinePosition}
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  strokeDasharray="8 4"
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
