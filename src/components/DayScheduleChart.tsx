
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
  type ChartConfig,
  ChartLegendContent,
} from "@/components/ui/chart";
import { useMemo, useState, useEffect } from "react";
import { formatTaskTime, getTaskTypeDetails, DEFAULT_TASK_TYPE_OPTIONS, calculateEndTime } from "@/lib/task-utils";
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
  timeRange: [number, number]; // [startMinuteRelativeToDay, endMinuteRelativeToDay]
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

interface CustomTooltipInternalProps {
  active?: boolean;
  payload?: Array<{ payload: ProcessedChartDataPoint; [key: string]: any }>;
  label?: string | number;
  effectiveTaskTypeOptions: TaskTypeOption[];
}

const CustomTooltipContentRenderer = ({ active, payload, effectiveTaskTypeOptions }: CustomTooltipInternalProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;

    if (!data) {
        return (
            <div style={{ backgroundColor: 'hsl(var(--destructive))', color: 'hsl(var(--destructive-foreground))', padding: '5px', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', zIndex: 1000 }}>
                Error: Tooltip payload data missing.
            </div>
        );
    }
    if (!data.originalTask) {
         return (
            <div style={{ backgroundColor: 'hsl(var(--destructive))', color: 'hsl(var(--destructive-foreground))', padding: '5px', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', zIndex: 1000 }}>
                Error: Original task data missing in tooltip. (Task name: {data.taskNameForAxis || 'Unknown'})
            </div>
        );
    }

    const task = data.originalTask;
    const taskTypeDetailsEffective = getTaskTypeDetails(task.type, effectiveTaskTypeOptions);
    const taskNameDisplay = task.name || `${taskTypeDetailsEffective?.label || task.type} - ${task.spacecraft}`;
    
    const overallStartTimeISO = calculateEndTime(task.startTime, -task.preActionDuration);

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
        <p style={{ margin: '0 0 5px 0' }}><span style={{fontWeight: '500'}}>Overall Start:</span> {formatTaskTime(overallStartTimeISO)}</p>
        <p style={{ margin: '0 0 5px 0' }}><span style={{fontWeight: '500'}}>Core Event Time:</span> {formatTaskTime(task.startTime)}</p>
        <p style={{ margin: '0 0 5px 0' }}><span style={{fontWeight: '500'}}>Spacecraft:</span> {task.spacecraft}</p>
        <p style={{ margin: '0 0 5px 0' }}><span style={{fontWeight: '500'}}>Preparation:</span> {task.preActionDuration} min</p>
        <p style={{ margin: '0' }}><span style={{fontWeight: '500'}}>Follow-up:</span> {task.postActionDuration} min</p>
      </div>
    );
  }
  return null;
};


const MIN_SLIDER_MINUTES = 0; // Represents 00:00 on selectedDate
const MAX_SLIDER_MINUTES = 48 * 60; // Allows viewing up to 48 hours from selectedDate start
const MIN_WINDOW_DURATION_MINUTES = 30; 

export function DayScheduleChart({ tasks, selectedDate }: DayScheduleChartProps) {
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
      const taskNameDisplay = task.name || `${taskTypeDetails?.label || task.type} - ${task.spacecraft}`;
      const taskNameForAxisDisplay = `${taskNameDisplay.substring(0,25)}${taskNameDisplay.length > 25 ? '...' : ''} (${task.spacecraft})`;

      return {
        id: task.id,
        taskNameForAxis: taskNameForAxisDisplay,
        timeRange: [taskStartMinutesRelativeToDay, taskEndMinutesRelativeToDay] as [number, number],
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


  const yAxisWidth = chartData.length > 0 ? Math.max(...chartData.map(d => d.taskNameForAxis.length)) * 6 + 40 : 80; 

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
                    Times are displayed in UTC. Use slider to adjust view. (Total range: 48 hours)
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
              min={MIN_SLIDER_MINUTES} 
              max={MAX_SLIDER_MINUTES} 
              step={15} 
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
                  domain={viewWindow} 
                  tickFormatter={xAxisTickFormatter} 
                  label={{ value: "Time (UTC)", position: "insideBottom", offset: -10, dy: 10 }}
                  allowDecimals={false}
                  scale="time" 
                  interval="preserveStartEnd" 
                  minTickGap={30} 
                  ticks={
                    Array.from(
                      { length: Math.floor((viewWindow[1] - viewWindow[0]) / (4 * 60)) + 1 }, 
                      (_, i) => Math.floor(viewWindow[0] / (4*60) + i) * (4*60)
                    ).filter(tick => tick >= viewWindow[0] && tick <= viewWindow[1])
                  }
                />
                <YAxis
                  type="category"
                  dataKey="id" 
                  tickFormatter={(tickValue) => chartData.find(d => d.id === tickValue)?.taskNameForAxis || ''} 
                  width={yAxisWidth} 
                  interval={0} 
                  domain={chartData.length > 0 ? undefined : ['No Tasks']} 
                  ticks={chartData.length > 0 ? chartData.map(d => d.id) : []} 
                />
                <Tooltip
                  cursor={{ fill: 'hsla(var(--muted), 0.5)' }} 
                  content={(props) => <CustomTooltipContentRenderer {...props} effectiveTaskTypeOptions={effectiveTaskTypeOptions} />}
                  wrapperStyle={{ zIndex: 1100 }}
                />
                <Legend content={<ChartLegendContent />} />
                {chartData.length > 0 && (
                  <Bar dataKey="timeRange" barSize={20} radius={[4, 4, 4, 4]}>
                    {chartData.map((entry) => {
                      const cellColorKey = taskValueToChartKey(entry.fillColorKey);
                      let colorForCell = chartConfig[cellColorKey]?.color || "hsl(var(--muted))";
                      
                      if (entry.isCompleted) {
                        if (colorForCell.startsWith("hsl(var(--")) { 
                           const variablePart = colorForCell.substring(4, colorForCell.length - 1); 
                           colorForCell = `hsla(${variablePart}, 0.5)`; 
                        } else if (colorForCell.startsWith("hsl(")) { 
                           const valuesPart = colorForCell.substring(4, colorForCell.length - 1); 
                           colorForCell = `hsla(${valuesPart}, 0.5)`; 
                        } else { 
                           colorForCell = `${colorForCell}80`; 
                        }
                      }
                      
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

    