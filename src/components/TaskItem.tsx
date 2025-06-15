
"use client";

import type { Task } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit3, Trash2, Clock, AlertTriangle, Satellite } from "lucide-react"; 
import {
  getTaskTypeColorClass, 
  getTaskTypeIcon,       
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
}

export function TaskItem({ task, onEdit, onDelete, onToggleComplete }: TaskItemProps) {
  const { effectiveTaskTypeOptions } = useTaskTypeConfig();
  
  const Icon = getTaskTypeIcon(task.type); 
  const colorClass = getTaskTypeColorClass(task.type);

  const taskTypeDetails = getTaskTypeDetails(task.type, effectiveTaskTypeOptions);

  // Core event time
  const coreEventTimeISO = task.startTime;

  // Calculate actual start and end of the entire activity
  const overallStartTimeISO = calculateEndTime(coreEventTimeISO, -task.preActionDuration);
  const overallEndTimeISO = calculateEndTime(coreEventTimeISO, task.postActionDuration);

  // Pre-Action phase timings
  const preActionPhaseStartTimeISO = overallStartTimeISO;
  const preActionPhaseEndTimeISO = coreEventTimeISO;

  // Post-Action phase timings
  const postActionPhaseStartTimeISO = coreEventTimeISO;
  const postActionPhaseEndTimeISO = overallEndTimeISO;
  
  const dateInUTC = new Date(overallStartTimeISO).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  });

  const isOverdue = new Date(overallEndTimeISO) < new Date() && !task.isCompleted;

  const taskDisplayLabel = taskTypeDetails?.label || task.type;
  const taskNameDisplay = task.name || `${taskDisplayLabel} - ${task.spacecraft}`;

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
                {taskNameDisplay}
              </CardTitle>
              <div className="flex items-center space-x-2">
                <CardDescription className="text-xs">
                  {dateInUTC} (UTC)
                </CardDescription>
                <span className="text-xs text-muted-foreground flex items-center">
                  <Satellite className="mr-1 h-3 w-3" /> {task.spacecraft}
                </span>
                 <span className="text-xs text-muted-foreground">({taskDisplayLabel})</span>
              </div>
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
        <div className="space-y-1 text-sm">
          {task.preActionDuration > 0 && (
            <div className="flex items-center text-muted-foreground">
              <Clock className="mr-2 h-4 w-4 text-primary opacity-70" />
              <span>
                Preparation: {task.preActionDuration} min
                ({formatTaskTime(preActionPhaseStartTimeISO)} - {formatTaskTime(preActionPhaseEndTimeISO)})
              </span>
            </div>
          )}
          
          {(task.preActionDuration > 0 || task.postActionDuration > 0) && (
             <div className="flex items-center font-medium">
                <Clock className="mr-2 h-4 w-4 text-primary" />
                <span>Core Event Time: {formatTaskTime(coreEventTimeISO)}</span>
             </div>
          )}

          {task.postActionDuration > 0 && (
            <div className="flex items-center text-muted-foreground">
              <Clock className="mr-2 h-4 w-4 text-primary opacity-70" />
              <span>
                Follow-up: {task.postActionDuration} min
                ({formatTaskTime(postActionPhaseStartTimeISO)} - {formatTaskTime(postActionPhaseEndTimeISO)})
              </span>
            </div>
          )}

          {task.preActionDuration === 0 && task.postActionDuration === 0 && (
            <div className="flex items-center font-medium">
              <Clock className="mr-2 h-4 w-4 text-primary" />
              <span>Event at {formatTaskTime(coreEventTimeISO)}</span>
            </div>
          )}
        </div>
        <Separator className="my-3" />
        <div className="flex justify-end space-x-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(task)} aria-label={`Edit task ${taskNameDisplay}`}>
            <Edit3 className="mr-1 h-4 w-4" /> Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onDelete(task.id)} aria-label={`Delete task ${taskNameDisplay}`}>
            <Trash2 className="mr-1 h-4 w-4" /> Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
