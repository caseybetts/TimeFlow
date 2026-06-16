
"use client";

import { useEffect, useState } from "react";
import type { Task } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
  onUpdateOwner: (taskId: string, owner: string) => void;
  refreshKey: number;
  countdownUpdateDelayMs?: number;
  isNextUpcoming?: boolean;
}

export const TASK_LIST_GRID_COLUMNS =
  "grid-cols-[auto_auto_7.25rem_4.75rem_minmax(9rem,0.7fr)_minmax(17rem,1.3fr)_minmax(8rem,0.45fr)_2.5rem]";

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

export function TaskItem({
  task,
  onEdit,
  onDelete,
  onToggleComplete,
  onUpdateOwner,
  refreshKey,
  countdownUpdateDelayMs = 0,
  isNextUpcoming = false,
}: TaskItemProps) {
  const { effectiveTaskTypeOptions } = useTaskTypeConfig();
  
  const taskTypeDetails = getTaskTypeDetails(task.type, effectiveTaskTypeOptions);

  // Core event time
  const coreEventTimeISO = task.startTime;

  // Calculate actual start and end of the entire activity
  const overallStartTimeISO = calculateEndTime(coreEventTimeISO, -task.preActionDuration);
  const overallEndTimeISO = calculateEndTime(coreEventTimeISO, task.postActionDuration);
  
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setNow(new Date());
    }, countdownUpdateDelayMs);

    return () => window.clearTimeout(timeoutId);
  }, [refreshKey, countdownUpdateDelayMs]);

  const isOverdue = new Date(overallEndTimeISO) < now && !task.isCompleted;

  const taskDisplayLabel = taskTypeDetails?.label || task.type;
  const defaultTitle = task.spacecraft ? `${taskDisplayLabel} - ${task.spacecraft}` : taskDisplayLabel;
  const taskNameDisplay = task.name || defaultTitle;
  const taskAccentColor = getTaskTypeChartColor(task.type);

  const countdownTargetMs = new Date(coreEventTimeISO).getTime();
  const remainingMs = countdownTargetMs - now.getTime();
  const isCountdownNegative = remainingMs <= 0;
  const usesEmphasizedText = isNextUpcoming || (isCountdownNegative && !task.isCompleted);
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
        "mb-0 overflow-hidden rounded-none border-0 border-b border-l-4 border-b-border/35 bg-card/88 shadow-none backdrop-blur-sm transition-colors last:border-b-0 hover:bg-card/95",
        task.isCompleted ? "opacity-60" : "",
        isOverdue ? "border-destructive" : ""
      )}
      style={{
        borderLeftColor: isOverdue ? undefined : taskAccentColor,
        backgroundColor: isNextUpcoming
          ? `color-mix(in srgb, ${taskAccentColor} 8%, hsl(var(--card)) 92%)`
          : undefined,
      }}
    >
      <CardContent className="p-2 sm:p-3">
        <div className={cn(
          "grid items-center gap-2 sm:gap-3",
          TASK_LIST_GRID_COLUMNS
        )}>
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
                  variant="outline"
                  size="icon"
                  onClick={() => onDelete(task.id)}
                  aria-label={`Delete task ${taskNameDisplay}`}
                  className="h-7 w-7 border-border/60 bg-background/40 text-muted-foreground hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <span className={cn("font-medium tabular-nums text-foreground", usesEmphasizedText ? "text-lg" : "text-sm")}>
            {formatTaskTime(coreEventTimeISO)}
          </span>

          <span className={cn("font-semibold text-muted-foreground", usesEmphasizedText ? "text-lg" : "text-sm")}>
            {task.spacecraft}
          </span>

          <div className="min-w-0">
            <CardTitle className={cn("truncate font-semibold leading-tight", usesEmphasizedText ? "text-2xl" : "text-base", task.isCompleted ? "line-through text-muted-foreground" : "")}>
              {taskNameDisplay}
            </CardTitle>
            <div className={cn("mt-0.5 flex items-center text-muted-foreground", usesEmphasizedText ? "gap-2 text-sm" : "gap-1.5 text-xs")}>
              <span className={cn("rounded-full", usesEmphasizedText ? "h-2.5 w-2.5" : "h-2 w-2")} style={{ backgroundColor: taskAccentColor }} />
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
                "font-mono font-semibold leading-none tabular-nums",
                usesEmphasizedText ? "text-5xl" : "text-3xl",
                isCountdownNegative && !task.isCompleted ? "animate-pulse text-destructive" : "text-foreground"
              )}
            >
              {remainingDisplay}
            </span>
          </div>

          <Input
            value={task.owner ?? ""}
            onChange={(event) => onUpdateOwner(task.id, event.target.value)}
            aria-label={`Owner for ${taskNameDisplay}`}
            placeholder="No Owner"
            className={cn(
              "h-8 min-w-0 border-border/60 bg-background/45 px-2 text-xs placeholder:text-muted-foreground/45",
              task.owner ? "text-foreground" : "text-muted-foreground/60"
            )}
          />

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
