"use client";

import type { Task } from "@/types";
import { TaskItem } from "./TaskItem";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";

interface TimelineProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleComplete: (taskId: string) => void;
}

export function Timeline({ tasks, onEditTask, onDeleteTask, onToggleComplete }: TimelineProps) {
  const sortedTasks = [...tasks].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  if (sortedTasks.length === 0) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border rounded-lg bg-card min-h-[300px]">
        <Image src="https://placehold.co/200x200.png" alt="No tasks" width={150} height={150} data-ai-hint="empty calendar illustration" className="mb-6 rounded-lg opacity-70" />
        <h3 className="text-xl font-headline text-foreground mb-2">Your schedule is empty!</h3>
        <p className="text-muted-foreground">Add some tasks to get started with TimeFlow.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="mt-6 h-[calc(100vh-250px)] rounded-md border p-1 sm:p-4 bg-background shadow-inner">
      <div className="space-y-1 sm:space-y-0">
        {sortedTasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
            onToggleComplete={onToggleComplete}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
