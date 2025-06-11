
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
import { TASK_TYPE_OPTIONS, getTaskTypeDetails } from "@/lib/task-utils";
import { PlusCircle, Edit3 } from "lucide-react";
import { useEffect } from "react";

const taskFormSchema = z.object({
  name: z.string().min(1, "Task name is required."),
  startTime: z.string().refine((val) => {
    // Check if the string can be parsed into a valid date
    // Appending 'Z' for validation purposes if user input is intended as UTC
    return !isNaN(Date.parse(val + 'Z')) || !isNaN(Date.parse(val));
  }, {
    message: "Invalid start time format. Please ensure it's a complete date and time.",
  }),
  duration: z.coerce.number().min(1, "Duration must be at least 1 minute."),
  type: z.enum(TASK_TYPE_OPTIONS.map(opt => opt.value) as [TaskType, ...TaskType[]]),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (task: Task) => void;
  initialTask?: Task | null;
}

// Helper to get YYYY-MM-DDTHH:MM string from a Date object, using its UTC components
const getUtcDateTimeLocalString = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Month is 0-indexed
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export function TaskForm({ isOpen, onOpenChange, onSubmit, initialTask }: TaskFormProps) {
  const defaultInitialUtcTimeForInput = getUtcDateTimeLocalString(new Date());

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: initialTask
      ? {
          name: initialTask.name,
          startTime: getUtcDateTimeLocalString(new Date(initialTask.startTime)), // Display existing UTC time
          duration: initialTask.duration,
          type: initialTask.type,
        }
      : {
          name: "",
          startTime: defaultInitialUtcTimeForInput, // Default to current UTC time
          duration: 30,
          type: "work",
        },
  });

  useEffect(() => {
    if (isOpen) { 
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
          startTime: getUtcDateTimeLocalString(new Date()), // Default to current UTC time on open
          duration: 30,
          type: "work",
        });
      }
    }
  }, [initialTask, form, isOpen]);


  const handleSubmit = (values: TaskFormValues) => {
    const taskTypeDetails = getTaskTypeDetails(values.type);
    const task: Task = {
      id: initialTask?.id || crypto.randomUUID(),
      name: values.name,
      // Input 'values.startTime' is YYYY-MM-DDTHH:mm, treat as UTC by appending 'Z'
      startTime: new Date(values.startTime + 'Z').toISOString(),
      duration: values.duration,
      type: values.type,
      preActionDuration: taskTypeDetails?.preActionDuration || 0,
      postActionDuration: taskTypeDetails?.postActionDuration || 0,
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
                      {TASK_TYPE_OPTIONS.map((option) => (
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
