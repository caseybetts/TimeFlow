
"use client";

import { useMemo } from "react";
import type { Task } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit3, Trash2, Clock, AlertTriangle } from "lucide-react"; 
import {
  formatTaskTime,
  calculateEndTime, // We can use this for adding and subtracting (by using negative duration)
  getTaskTypeDetails,    
} from "@/lib/task-utils";
import { useTaskTypeConfig } from "@/hooks/useTaskTypeConfig";
import { cn } from "@/lib/utils";

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onToggleComplete: (taskId: string) => void;
  refreshKey: number;
}

const getTaskTypeChartColor = (taskType: Task["type"]): string => {
  switch (taskType) {
    case "fsv":
      return "hsl(var(--chart-1))";
    case "rtp":
      return "hsl(var(--chart-2))";
    case "tl":
      return "hsl(var(--chart-3))";
    case "appointment":
      return "hsl(var(--chart-4))";
    default:
      return "hsl(var(--chart-5))";
  }
};

export function TaskItem({ task, onEdit, onDelete, onToggleComplete, refreshKey }: TaskItemProps) {
  const { effectiveTaskTypeOptions } = useTaskTypeConfig();
  
  const taskTypeDetails = getTaskTypeDetails(task.type, effectiveTaskTypeOptions);

  // Core event time
  const coreEventTimeISO = task.startTime;

  // Calculate actual start and end of the entire activity
  const overallStartTimeISO = calculateEndTime(coreEventTimeISO, -task.preActionDuration);
  const overallEndTimeISO = calculateEndTime(coreEventTimeISO, task.postActionDuration);
  
  const now = useMemo(() => new Date(), [refreshKey]);
  const isOverdue = new Date(overallEndTimeISO) < now && !task.isCompleted;

  const taskDisplayLabel = taskTypeDetails?.label || task.type;
  const defaultTitle = `${taskDisplayLabel} - ${task.spacecraft}`;
  const taskNameDisplay = task.name || defaultTitle;
  const taskAccentColor = getTaskTypeChartColor(task.type);

  const eventStartMs = new Date(overallStartTimeISO).getTime();
  const remainingMs = eventStartMs - now.getTime();
  const isCountdownNegative = remainingMs <= 0;
  const remainingTotalMinutes = isCountdownNegative
    ? Math.floor(remainingMs / 60000)
    : Math.ceil(remainingMs / 60000);
  const absoluteRemainingMinutes = Math.abs(remainingTotalMinutes);
  const remainingHours = Math.floor(absoluteRemainingMinutes / 60);
  const remainingMinutes = absoluteRemainingMinutes % 60;
  const remainingDisplay = `${isCountdownNegative ? "-" : ""}${String(remainingHours).padStart(2, "0")}:${String(remainingMinutes).padStart(2, "0")}`;

  return (
    <Card
      className={cn(
        "mb-2 overflow-hidden border-l-4 bg-card/95 shadow-sm backdrop-blur-sm transition-all hover:bg-card hover:shadow-md",
        task.isCompleted ? "opacity-60" : "",
        isOverdue ? "border-destructive" : ""
      )}
      style={{ borderLeftColor: isOverdue ? undefined : taskAccentColor }}
    >
      <CardContent className="p-2 sm:p-3">
        <div className="grid grid-cols-[auto_auto_5.75rem_4.25rem_minmax(8rem,0.7fr)_minmax(16rem,1.3fr)_2.5rem] items-center gap-2 sm:gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onEdit(task)}
                  aria-label={`Edit task ${taskNameDisplay}`}
                  className="h-7 w-7"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => onDelete(task.id)}
                  aria-label={`Delete task ${taskNameDisplay}`}
                  className="h-7 w-7"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <span className="text-sm font-medium tabular-nums text-foreground">
            {formatTaskTime(coreEventTimeISO)}
          </span>

          <span className="text-sm font-semibold text-muted-foreground">
            {task.spacecraft}
          </span>

          <div className="min-w-0">
            <CardTitle className={cn("truncate text-base font-semibold leading-tight", task.isCompleted ? "line-through text-muted-foreground" : "")}>
              {taskNameDisplay}
            </CardTitle>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: taskAccentColor }} />
              <span>{taskDisplayLabel}</span>
              {isOverdue && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>This task is overdue!</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2" aria-label={`Countdown for ${taskNameDisplay}`}>
            <Clock className="h-6 w-6 shrink-0" style={{ color: taskAccentColor }} />
            <span
              className={cn(
                "font-mono text-3xl font-semibold leading-none tabular-nums",
                isCountdownNegative && !task.isCompleted ? "animate-pulse text-destructive" : "text-foreground"
              )}
            >
              {remainingDisplay}
            </span>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Checkbox
                  id={`complete-${task.id}`}
                  checked={task.isCompleted}
                  onCheckedChange={() => onToggleComplete(task.id)}
                  aria-label="Mark task as complete"
                  className={cn(
                    "h-8 w-8 rounded-lg border-2 border-muted-foreground/40 bg-background/70 shadow-inner transition-all hover:border-foreground/50 hover:bg-background focus-visible:ring-1 data-[state=checked]:border-accent data-[state=checked]:bg-accent/90 data-[state=checked]:text-accent-foreground [&>span>svg]:h-5 [&>span>svg]:w-5",
                    task.isCompleted ? "shadow-sm" : ""
                  )}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>{task.isCompleted ? "Mark as Incomplete" : "Mark as Complete"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
