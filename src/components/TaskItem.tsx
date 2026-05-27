
"use client";

import { useMemo } from "react";
import type { Task } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
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
  const taskNameDisplay = task.name ? `${task.name} (${defaultTitle})` : defaultTitle;
  const totalDurationMinutes = Math.max(0, task.preActionDuration + task.postActionDuration);
  const hasTaskWindow = totalDurationMinutes > 0;

  const eventStartMs = new Date(overallStartTimeISO).getTime();
  const remainingMs = Math.max(0, eventStartMs - now.getTime());
  const remainingTotalMinutes = Math.ceil(remainingMs / 60000);
  const remainingHours = Math.floor(remainingTotalMinutes / 60);
  const remainingMinutes = remainingTotalMinutes % 60;
  const remainingDisplay = remainingTotalMinutes <= 0
    ? "--:--"
    : `${String(remainingHours).padStart(2, "0")}:${String(remainingMinutes).padStart(2, "0")}`;

  return (
    <Card className={cn("mb-3 shadow-lg transition-all hover:shadow-xl", task.isCompleted ? "opacity-60" : "", isOverdue ? "border-destructive" : "")}>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className={cn("text-lg font-headline", task.isCompleted ? "line-through text-muted-foreground" : "")}>
            {taskNameDisplay}
          </CardTitle>
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <Clock className="mr-2 h-4 w-4 text-primary opacity-70" />
            <span className="text-2xl font-semibold text-foreground">{remainingDisplay}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(task)} aria-label={`Edit task ${taskNameDisplay}`}>
              <Edit3 className="mr-1 h-4 w-4" /> Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={() => onDelete(task.id)} aria-label={`Delete task ${taskNameDisplay}`}>
              <Trash2 className="mr-1 h-4 w-4" /> Delete
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Checkbox
                    id={`complete-${task.id}`}
                    checked={task.isCompleted}
                    onCheckedChange={() => onToggleComplete(task.id)}
                    aria-label="Mark task as complete"
                    className={cn(task.isCompleted ? "border-accent data-[state=checked]:bg-accent" : "")}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{task.isCompleted ? "Mark as Incomplete" : "Mark as Complete"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {isOverdue && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This task is overdue!</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="space-y-1 text-sm">
          <div className="flex items-center font-medium">
            <Clock className="mr-2 h-4 w-4 text-primary" />
            <span>
              Core Event Time: {formatTaskTime(coreEventTimeISO)}
            </span>
          </div>
          {hasTaskWindow && (
            <div className="flex items-center text-muted-foreground">
              <Clock className="mr-2 h-4 w-4 text-primary opacity-70" />
              <span>
                Task Window: {formatTaskTime(overallStartTimeISO)} - {formatTaskTime(overallEndTimeISO)} ({totalDurationMinutes} min)
              </span>
            </div>
          )}
        </div>
        <Separator className="my-2" />
      </CardContent>
    </Card>
  );
}
