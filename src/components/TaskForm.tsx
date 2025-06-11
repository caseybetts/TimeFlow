
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Task, TaskType } from "@/types";
import { TASK_TYPES } from "@/types"; // Use TASK_TYPES for zod enum
import { getTaskTypeDetails } from "@/lib/task-utils";
import { useTaskTypeConfig } from "@/hooks/useTaskTypeConfig"; // Import the new hook
import { PlusCircle, Edit3 } from "lucide-react";
import { useEffect } from "react";

const taskFormSchema = z.object({
  name: z.string().min(1, "Task name is required."),
  startTime: z.string().refine((val) => {
    return !isNaN(Date.parse(val + 'Z')) || !isNaN(Date.parse(val));
  }, {
    message: "Invalid start time format. Please ensure it's a complete date and time.",
  }),
  duration: z.coerce.number().min(1, "Duration must be at least 1 minute."),
  type: z.enum(TASK_TYPES), // Use the raw TaskType values for Zod validation
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (task: Task) => void;
  initialTask?: Task | null;
}

const getUtcDateTimeLocalString = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export function TaskForm({ isOpen, onOpenChange, onSubmit, initialTask }: TaskFormProps) {
  const { effectiveTaskTypeOptions } = useTaskTypeConfig(); // Get configured task types

  const defaultInitialUtcTimeForInput = getUtcDateTimeLocalString(new Date());
  const defaultTaskType = effectiveTaskTypeOptions.length > 0 ? effectiveTaskTypeOptions[0].value : TASK_TYPES[0];

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: initialTask
      ? {
          name: initialTask.name,
          startTime: getUtcDateTimeLocalString(new Date(initialTask.startTime)),
          duration: initialTask.duration,
          type: initialTask.type,
        }
      : {
          name: "",
          startTime: defaultInitialUtcTimeForInput,
          duration: 30,
          type: defaultTaskType,
        },
  });

  useEffect(() => {
    if (isOpen) {
      const defaultTypeForNew = effectiveTaskTypeOptions.length > 0 ? effectiveTaskTypeOptions[0].value : TASK_TYPES[0];
      if (initialTask) {
        form.reset({
          name: initialTask.name,
          startTime: getUtcDateTimeLocalString(new Date(initialTask.startTime)),
          duration: initialTask.duration,
          type: initialTask.type,
        });
      } else {
        form.reset({
          name: "",
          startTime: getUtcDateTimeLocalString(new Date()),
          duration: 30,
          type: defaultTypeForNew,
        });
      }
    }
  }, [initialTask, form, isOpen, effectiveTaskTypeOptions]);


  const handleSubmit = (values: TaskFormValues) => {
    const selectedTaskTypeDetails = getTaskTypeDetails(values.type, effectiveTaskTypeOptions);
    
    const task: Task = {
      id: initialTask?.id || crypto.randomUUID(),
      name: values.name,
      startTime: new Date(values.startTime + 'Z').toISOString(),
      duration: values.duration,
      type: values.type,
      preActionDuration: selectedTaskTypeDetails?.preActionDuration || 0,
      postActionDuration: selectedTaskTypeDetails?.postActionDuration || 0,
      isCompleted: initialTask?.isCompleted || false,
    };
    onSubmit(task);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">
            {initialTask ? "Edit Task" : "Add New Task"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Name</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Morning Standup" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time (UTC)</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Core Duration (minutes)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="30" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a task type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {effectiveTaskTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center">
                            <option.icon className="mr-2 h-4 w-4" />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit">
                {initialTask ? <Edit3 className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                {initialTask ? "Save Changes" : "Add Task"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
