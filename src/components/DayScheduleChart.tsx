
"use client";

import type { Task, TaskType } from "@/types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
import { TASK_TYPE_OPTIONS, formatTaskTime, getTaskTypeDetails } from "@/lib/task-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DayScheduleChartProps {
  tasks: Task[];
  selectedDate: Date; // Represents the UTC date to display
}

interface ProcessedChartDataPoint {
  id: string; // Unique ID for Y-axis dataKey (task.id)
  taskNameForAxis: string; // Task Name for Y-axis tick display
  timeRange: [number, number]; // [startMinuteOfDay, endMinuteOfDay]
  fillColorKey: TaskType;
  originalTask: Task;
  tooltipLabel: string;
}

const taskTypeToChartKey = (taskType: TaskType): string => {
  return taskType.toLowerCase().replace(/\s+/g, '');
};

const chartConfigBase: ChartConfig = TASK_TYPE_OPTIONS.reduce((acc, option) => {
  const key = taskTypeToChartKey(option.value);
  let color = "hsl(var(--muted))"; // Default color
  // Simple mapping, can be improved or made more robust
  if (option.value === "work") color = "hsl(var(--chart-1))";
  else if (option.value === "personal") color = "hsl(var(--chart-2))";
  else if (option.value === "errands") color = "hsl(var(--chart-3))";
  else if (option.value === "appointment") color = "hsl(var(--chart-4))";
  
  acc[key] = {
    label: option.label,
    color: color,
    icon: option.icon,
  };
  return acc;
}, {} as ChartConfig);


const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ProcessedChartDataPoint;
    const task = data.originalTask;
    const taskTypeDetails = getTaskTypeDetails(task.type);

    const coreStartTime = new Date(task.startTime);
    const effectiveStartTime = new Date(coreStartTime.getTime() - task.preActionDuration * 60000);
    const coreEndTime = new Date(coreStartTime.getTime() + task.duration * 60000);
    const effectiveEndTime = new Date(coreEndTime.getTime() + task.postActionDuration * 60000);

    return (
      <ChartTooltipContent
        className="w-[280px] bg-background"
        label={ <div className="font-bold">{task.name} ({taskTypeDetails?.label})</div> }
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

  useEffect(() => {
    setIsClient(true);
  }, []);

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

    return tasksForDay.map((task, index) => {
      const coreTaskStartTime = new Date(task.startTime);
      const taskEffectiveStart = new Date(coreTaskStartTime.getTime() - task.preActionDuration * 60000);
      const taskEffectiveEnd = new Date(coreTaskStartTime.getTime() + (task.duration + task.postActionDuration) * 60000);

      const startMinutesOnDay = Math.max(0, (taskEffectiveStart.getTime() - dayStart.getTime()) / 60000);
      const endMinutesOnDay = Math.min(1440, (taskEffectiveEnd.getTime() - dayStart.getTime()) / 60000);
      
      // Ensure bar is visible if it's within the day
      if (startMinutesOnDay >= 1440 || endMinutesOnDay <= 0 || startMinutesOnDay >= endMinutesOnDay) {
        return null; 
      }
      
      return {
        id: task.id,
        taskNameForAxis: `${task.name.substring(0,25)}${task.name.length > 25 ? '...' : ''}`, // For Y-axis display
        timeRange: [startMinutesOnDay, endMinutesOnDay] as [number, number],
        fillColorKey: task.type,
        originalTask: task,
        tooltipLabel: task.name,
      };
    }).filter(Boolean) as ProcessedChartDataPoint[];
  }, [tasks, selectedDate]);

  if (!isClient) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Schedule Graph</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center text-muted-foreground">
          Loading chart...
        </CardContent>
      </Card>
    );
  }
  
  if (chartData.length === 0) {
     return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Schedule Graph</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <p className="text-muted-foreground">No tasks scheduled for {selectedDate.toLocaleDateString('en-CA', { timeZone: 'UTC' })}.</p>
        </CardContent>
      </Card>
    );
  }

  const yAxisWidth = Math.max(...chartData.map(d => d.taskNameForAxis.length)) * 6 + 40; // Estimate width

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Schedule Graph - {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} (UTC)</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfigBase} className="min-h-[200px] h-[calc(40px*var(--visible-tasks,10)+100px)] max-h-[800px] w-full" style={{ '--visible-tasks': chartData.length } as React.CSSProperties}>
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
                domain={[0, 1440]} // 24 hours * 60 minutes
                ticks={[0, 180, 360, 540, 720, 900, 1080, 1260, 1440]} // Every 3 hours
                tickFormatter={(value) => {
                  const hours = Math.floor(value / 60);
                  const minutes = value % 60;
                  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                }}
                label={{ value: "Time (UTC)", position: "insideBottom", offset: -10, dy: 10 }}
              />
              <YAxis
                type="category"
                dataKey="id" // Use unique task ID for dataKey
                tickFormatter={(tick) => chartData.find(d => d.id === tick)?.taskNameForAxis || ''}
                width={yAxisWidth}
                interval={0} // Show all ticks
              />
              <Tooltip
                cursor={{ fill: 'hsla(var(--muted), 0.5)' }}
                content={<CustomTooltip />}
              />
              <Legend content={<ChartLegendContent />} />
              <Bar dataKey="timeRange" barSize={20} radius={[4, 4, 4, 4]}>
                {chartData.map((entry) => (
                  <Cell key={`cell-${entry.id}`} fill={`var(--color-${taskTypeToChartKey(entry.fillColorKey)})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
