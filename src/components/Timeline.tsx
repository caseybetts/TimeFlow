
"use client";

import type { Task } from "@/types";
import { TASK_LIST_GRID_COLUMNS, TaskItem } from "./TaskItem";
import { Orbit, Radar } from "lucide-react";
import { cn } from "@/lib/utils";

const COUNTDOWN_UPDATE_STAGGER_MS = 250;

interface TimelineProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleComplete: (taskId: string) => void;
  onUpdateOwner: (taskId: string, owner: string) => void;
  refreshKey: number;
  showCompletedTasks: boolean;
}

export function Timeline({
  tasks,
  onEditTask,
  onDeleteTask,
  onToggleComplete,
  onUpdateOwner,
  refreshKey,
  showCompletedTasks,
}: TimelineProps) {
  const sortedTasks = [...tasks].sort((a, b) => {
    // Sort by the actual start time (core task start time - preActionDuration)
    const effectiveStartTimeA = new Date(a.startTime).getTime() - (a.preActionDuration * 60000);
    const effectiveStartTimeB = new Date(b.startTime).getTime() - (b.preActionDuration * 60000);
    return effectiveStartTimeA - effectiveStartTimeB;
  });
  const visibleTasks = showCompletedTasks
    ? sortedTasks
    : sortedTasks.filter((task) => !task.isCompleted);
  const nowMs = Date.now();
  const nextUpcomingTask = visibleTasks.find(
    (task) => !task.isCompleted && new Date(task.startTime).getTime() >= nowMs
  );

  if (sortedTasks.length === 0) {
    return (
      <div className="mt-2 overflow-hidden rounded-md border border-border/40 bg-card/95 shadow-inner backdrop-blur-sm">
        <div className="relative min-h-[300px] overflow-hidden p-6 sm:min-h-[340px] sm:p-8">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.28)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.22)_1px,transparent_1px)] bg-[size:28px_28px]" />
          <div className="absolute inset-x-10 top-1/2 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
          <div className="absolute left-[12%] top-8 h-24 w-24 rounded-full border border-primary/15" />
          <div className="absolute bottom-8 right-[14%] h-28 w-28 rounded-full border border-accent/15" />

          <div className="relative z-10 flex min-h-[252px] flex-col items-center justify-center text-center">
            <div className="relative mb-7 flex h-28 w-28 items-center justify-center rounded-full border border-primary/25 bg-background/65 shadow-[0_0_50px_hsl(var(--primary)/0.16)] sm:h-32 sm:w-32">
              <div className="absolute inset-3 rounded-full border border-dashed border-primary/30" />
              <div className="absolute h-20 w-20 rounded-full border border-accent/20 sm:h-24 sm:w-24" />
              <Orbit className="absolute h-20 w-20 text-primary/45 sm:h-24 sm:w-24" strokeWidth={1.25} />
              <Radar className="h-10 w-10 text-accent sm:h-11 sm:w-11" strokeWidth={1.7} />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">Timeline Clear</p>
              <h3 className="text-2xl font-semibold text-foreground sm:text-3xl">No Active Tasks</h3>
              <p className="mx-auto max-w-xl text-sm leading-6 text-muted-foreground">
                The schedule is clear and ready for the next planning window.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <div className="relative rounded-md border-0 bg-card/95 p-1 shadow-inner backdrop-blur-sm sm:p-4">
        {visibleTasks.length > 0 ? (
          <div className="space-y-1 sm:space-y-0">
            <div
              className={cn(
                "grid items-center gap-2 px-2 pb-2 pt-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground/65 sm:gap-3 sm:px-3",
                TASK_LIST_GRID_COLUMNS
              )}
            >
              <span className="col-span-2">Actions</span>
              <span>Time</span>
              <span>SCID</span>
              <span>Task</span>
              <span className="text-center">Countdown</span>
              <span>Owner</span>
              <span className="text-center">Done</span>
            </div>
            {visibleTasks.map((task, index) => (
              <TaskItem
                key={task.id}
                task={task}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onToggleComplete={onToggleComplete}
                onUpdateOwner={onUpdateOwner}
                refreshKey={refreshKey}
                countdownUpdateDelayMs={index * COUNTDOWN_UPDATE_STAGGER_MS}
                isNextUpcoming={task.id === nextUpcomingTask?.id}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[220px] items-center justify-center rounded-md bg-card/85 p-6 text-center text-sm text-muted-foreground backdrop-blur-sm">
            All active tasks are clear. Use the button above to review completed tasks.
          </div>
        )}
      </div>
    </div>
  );
}
