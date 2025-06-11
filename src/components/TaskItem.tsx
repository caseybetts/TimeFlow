"use client";

import type { Task } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit3, Trash2, Clock, CalendarDays, Briefcase, User, ShoppingCart, AlertTriangle } from "lucide-react";
import {
  getTaskTypeColorClass,
  getTaskTypeIcon,
  formatTaskTime,
  calculateEndTime,
} from "@/lib/task-utils";
import { cn } from "@/lib/utils";

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onToggleComplete: (taskId: string) => void;
}

export function TaskItem({ task, onEdit, onDelete, onToggleComplete }: TaskItemProps) {
  const Icon = getTaskTypeIcon(task.type);
  const colorClass = getTaskTypeColorClass(task.type);
  const startTimeFormatted = formatTaskTime(task.startTime);
  const endTimeFormatted = formatTaskTime(calculateEndTime(task.startTime, task.duration));
  const bufferEndTimeFormatted = formatTaskTime(calculateEndTime(task.startTime, task.duration + task.buffer));

  const isOverdue = new Date(task.startTime) < new Date() && !task.isCompleted;

  return (
    <Card className={cn("mb-4 shadow-lg transition-all hover:shadow-xl", task.isCompleted ? "opacity-60" : "", isOverdue ? "border-destructive" : "")}>
      <CardHeader className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={cn("p-2 rounded-full", colorClass, task.isCompleted ? "" : "text-primary-foreground")}>
              <Icon className={cn("h-5 w-5", task.isCompleted ? "text-muted-foreground" : "text-primary-foreground")} />
            </div>
            <div>
              <CardTitle className={cn("text-lg font-headline", task.isCompleted ? "line-through text-muted-foreground" : "")}>
                {task.name}
              </CardTitle>
              <CardDescription className="text-xs">
                {new Date(task.startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
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
      <CardContent className="p-4 pt-0">
        <div className="space-y-2 text-sm">
          <div className="flex items-center">
            <Clock className="mr-2 h-4 w-4 text-primary" />
            <span>{startTimeFormatted} - {endTimeFormatted} ({task.duration} min)</span>
          </div>
          {task.buffer > 0 && (
            <div className="flex items-center text-muted-foreground">
              <Clock className="mr-2 h-4 w-4" />
              <span>Buffer: {task.buffer} min (until {bufferEndTimeFormatted})</span>
            </div>
          )}
        </div>
        <Separator className="my-3" />
        <div className="flex justify-end space-x-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(task)} aria-label={`Edit task ${task.name}`}>
            <Edit3 className="mr-1 h-4 w-4" /> Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onDelete(task.id)} aria-label={`Delete task ${task.name}`}>
            <Trash2 className="mr-1 h-4 w-4" /> Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
