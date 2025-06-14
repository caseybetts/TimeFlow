
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

// A short, simple "pluck" or "chime" like sound as a Base64 encoded WAV file.
// This sound is in the public domain or generated to be royalty-free.
const CHIME_SOUND_DATA_URI = "data:audio/wav;base64,UklGRlMMAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YUkMAAB9AAACAQMEBQYHCAkKCwwNDg8QERITFBUWFxgZGhscHR4fICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj9AQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVpbXF1eX2BhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ent8fX5/gIGCg4SFhoeIiYqLjI2OjqCio6SlpqeoqaqrrK2ur7Cxsrc=";


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
    const { effectiveTaskTypeOptions } = useTaskTypeConfig(); // Use hook here
    const taskTypeDetailsEffective = getTaskTypeDetails(task.type, effectiveTaskTypeOptions);
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
          zIndex: 1000 // Ensure tooltip is on top
        }}>
        <p style={{ fontWeight: '600', margin: '0 0 8px 0', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '8px' }}>
          {taskNameDisplay} <span style={{opacity: 0.7}}>({task.isCompleted ? "Completed" : "Pending"})</span>
        </p>
         <p style={{ margin: '0 0 5px 0' }}><span style={{fontWeight: '500'}}>Core Starts:</span> {formattedCoreStartTime}</p>
        <p style={{ margin: '0 0 5px 0' }}><span style={{fontWeight: '500'}}>Spacecraft:</span> {task.spacecraft}</p>
        <p style={{ margin: '0 0 5px 0' }}><span style={{fontWeight: '500'}}>Pre-Action:</span> {task.preActionDuration} min</p>
        <p style={{ margin: '0' }}><span style={{fontWeight: '500'}}>Post-Action:</span> {task.postActionDuration} min</p>
      </div>
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
  const [refreshKey, setRefreshKey] = useState(0);
  const [playedChimeTaskIds, setPlayedChimeTaskIds] = useState(new Set<string>());


  useEffect(() => {
    setIsClient(true);
  }, []);

  const xAxisDomain: [number, number] = useMemo(() => {
    return viewWindow;
  }, [viewWindow]);

  const chartConfig = useMemo(() => {
    return effectiveTaskTypeOptions.reduce((acc, option) => {
      const key = taskValueToChartKey(option.value); 
      let color = "hsl(var(--muted))"; 

      const defaultType = DEFAULT_TASK_TYPE_OPTIONS.find(d => d.value === option.value);

      if (defaultType) {
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
          default:
            break;
        }
      }

      acc[key] = {
        label: option.label, 
        color: color,
        icon: option.icon || defaultType?.icon 
      };
      return acc;
    }, {} as ChartConfig);
  }, [effectiveTaskTypeOptions]);


  const chartData = useMemo(() => {
    const viewWindowStartMinutesUTC = xAxisDomain[0];
    const viewWindowEndMinutesUTC = xAxisDomain[1];

    const selectedDateEpochStartMs = Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate());

    const viewWindowStartMs = selectedDateEpochStartMs + viewWindowStartMinutesUTC * 60000;
    const viewWindowEndMs = selectedDateEpochStartMs + viewWindowEndMinutesUTC * 60000;

    const tasksInView = tasks.filter(task => {
      const taskCoreStartMs = new Date(task.startTime).getTime(); 
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
        isCompleted: task.isCompleted || false,
      };
    }).filter(Boolean) as ProcessedChartDataPoint[]; 
  }, [tasks, selectedDate, xAxisDomain, effectiveTaskTypeOptions]); 


  useEffect(() => {
    const todayUTC = new Date(); 
    const selectedDateEpochStart = Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate()); 

    const nowEpoch = todayUTC.getTime(); 

    const currentMinutesRelativeToSelectedDayStart = (nowEpoch - selectedDateEpochStart) / 60000;

    if (currentMinutesRelativeToSelectedDayStart >= xAxisDomain[0] && currentMinutesRelativeToSelectedDayStart <= xAxisDomain[1]) {
      setCurrentTimeLinePosition(currentMinutesRelativeToSelectedDayStart);
    } else {
      setCurrentTimeLinePosition(null); 
    }
  }, [selectedDate, xAxisDomain, tasks, refreshKey]);

  // Effect to play chime sounds
  useEffect(() => {
    if (currentTimeLinePosition === null || !chartData.length || !isClient) {
      return;
    }

    const newPlayedIds = new Set(playedChimeTaskIds);
    let soundPlayedThisCycle = false;

    chartData.forEach((taskDataPoint) => {
      const taskEffectiveStartMinutes = taskDataPoint.timeRange[0]; // Start of the bar on the chart

      if (
        taskEffectiveStartMinutes <= currentTimeLinePosition &&
        !playedChimeTaskIds.has(taskDataPoint.id)
      ) {
        try {
          const audio = new Audio(CHIME_SOUND_DATA_URI);
          audio.play().catch(e => console.warn("Audio play failed (user gesture may be needed for sound):", e));
          newPlayedIds.add(taskDataPoint.id);
          soundPlayedThisCycle = true;
        } catch (e) {
          console.error("Error playing chime sound:", e);
        }
      }
    });

    if (soundPlayedThisCycle) {
      setPlayedChimeTaskIds(newPlayedIds);
    }
  }, [currentTimeLinePosition, chartData, playedChimeTaskIds, isClient]);

  // Effect to reset played chimes when context changes (e.g., date, tasks, view window)
  useEffect(() => {
    if (isClient) { // Only run client-side
        setPlayedChimeTaskIds(new Set<string>());
    }
  }, [selectedDate, tasks, viewWindow, isClient]);


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
                  domain={xAxisDomain} 
                  tickFormatter={xAxisTickFormatter} 
                  label={{ value: "Time (UTC)", position: "insideBottom", offset: -10, dy: 10 }}
                  allowDecimals={false}
                  scale="time" 
                  interval="preserveStartEnd" 
                  minTickGap={30} 
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
                  content={<CustomTooltip />} 
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

