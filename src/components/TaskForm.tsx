
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
import { Checkbox } from "@/components/ui/checkbox";
import type { Task, TaskType, Spacecraft } from "@/types";
import { BLANK_SPACECRAFT, TASK_TYPES, SPACECRAFT_OPTIONS, SELECTABLE_SPACECRAFT_OPTIONS } from "@/types";
import { getTaskTypeDetails, getUniqueAutoTaskName } from "@/lib/task-utils";
import { useTaskTypeConfig } from "@/hooks/useTaskTypeConfig";
import { PlusCircle, Edit3 } from "lucide-react";
import { useEffect } from "react";

const taskFormSchema = z.object({
  name: z.string().optional(),
  owner: z.string().optional(),
  spacecraft: z.enum(SPACECRAFT_OPTIONS, {
    required_error: "Spacecraft selection is required.",
  }),
  startTime: z.string().refine((val) => {
    return !isNaN(Date.parse(val + 'Z')) || !isNaN(Date.parse(val));
  }, {
    message: "Invalid start time format. Please ensure it's a complete date and time.",
  }),
  type: z.enum(TASK_TYPES),
  preActionDuration: z.coerce.number().min(0, "Duration must be non-negative.").default(0),
  postActionDuration: z.coerce.number().min(0, "Duration must be non-negative.").default(0),
  changeMatchingTaskNames: z.boolean().default(false),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

export interface TaskFormSubmitOptions {
  changeMatchingTaskNames: boolean;
  originalTaskName: string;
}

const BLANK_SPACECRAFT_SELECT_VALUE = "__blank_spacecraft__";

const toSpacecraftSelectValue = (spacecraft: Spacecraft) =>
  spacecraft === BLANK_SPACECRAFT ? BLANK_SPACECRAFT_SELECT_VALUE : spacecraft;

const fromSpacecraftSelectValue = (value: string): Spacecraft =>
  value === BLANK_SPACECRAFT_SELECT_VALUE ? BLANK_SPACECRAFT : (value as Spacecraft);

interface TaskFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (task: Task, options?: TaskFormSubmitOptions) => void;
  initialTask?: Task | null;
  existingTaskNames?: readonly (string | null | undefined)[];
}

const getUtcDateTimeLocalString = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export function TaskForm({ isOpen, onOpenChange, onSubmit, initialTask, existingTaskNames = [] }: TaskFormProps) {
  const { effectiveTaskTypeOptions } = useTaskTypeConfig();

  const defaultInitialUtcTimeForInput = getUtcDateTimeLocalString(new Date());
  const defaultTaskType = effectiveTaskTypeOptions.length > 0 ? effectiveTaskTypeOptions[0].value : TASK_TYPES[0];
  const defaultSpacecraft = SELECTABLE_SPACECRAFT_OPTIONS[0];
  const defaultTaskTypeDetails = getTaskTypeDetails(defaultTaskType, effectiveTaskTypeOptions);
  const canChangeMatchingTaskNames = Boolean(initialTask?.name?.trim());


  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: initialTask
      ? {
          name: initialTask.name || "",
          owner: initialTask.owner || "",
          spacecraft: initialTask.spacecraft,
          startTime: getUtcDateTimeLocalString(new Date(initialTask.startTime)),
          type: initialTask.type,
          preActionDuration: initialTask.preActionDuration,
          postActionDuration: initialTask.postActionDuration,
          changeMatchingTaskNames: false,
        }
      : {
          name: "",
          owner: "",
          spacecraft: defaultSpacecraft,
          startTime: defaultInitialUtcTimeForInput,
          type: defaultTaskType,
          preActionDuration: defaultTaskTypeDetails?.preActionDuration ?? 0,
          postActionDuration: defaultTaskTypeDetails?.postActionDuration ?? 0,
          changeMatchingTaskNames: false,
        },
  });

  const selectedTaskType = form.watch("type");

  useEffect(() => {
    if (isOpen) {
      const defaultTypeForNew = effectiveTaskTypeOptions.length > 0 ? effectiveTaskTypeOptions[0].value : TASK_TYPES[0];
      const defaultDetailsForNew = getTaskTypeDetails(defaultTypeForNew, effectiveTaskTypeOptions);
      if (initialTask) {
        form.reset({
          name: initialTask.name || "",
          owner: initialTask.owner || "",
          spacecraft: initialTask.spacecraft,
          startTime: getUtcDateTimeLocalString(new Date(initialTask.startTime)),
          type: initialTask.type,
          preActionDuration: initialTask.preActionDuration,
          postActionDuration: initialTask.postActionDuration,
          changeMatchingTaskNames: false,
        });
      } else {
        form.reset({
          name: "",
          owner: "",
          spacecraft: defaultSpacecraft,
          startTime: getUtcDateTimeLocalString(new Date()),
          type: defaultTypeForNew,
          preActionDuration: defaultDetailsForNew?.preActionDuration ?? 0,
          postActionDuration: defaultDetailsForNew?.postActionDuration ?? 0,
          changeMatchingTaskNames: false,
        });
      }
    }
  }, [initialTask, form, isOpen, effectiveTaskTypeOptions, defaultSpacecraft]);

  useEffect(() => {
    if (!form.formState.isDirty && !initialTask) { // Only update if form is not dirty (user hasn't typed) and it's a new task
        const taskTypeDetails = getTaskTypeDetails(selectedTaskType, effectiveTaskTypeOptions);
        if (taskTypeDetails) {
            form.setValue("preActionDuration", taskTypeDetails.preActionDuration, { shouldValidate: true });
            form.setValue("postActionDuration", taskTypeDetails.postActionDuration, { shouldValidate: true });
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTaskType, effectiveTaskTypeOptions, form.setValue, initialTask]);


  const handleSubmit = (values: TaskFormValues) => {
    const selectedTaskTypeDetails = getTaskTypeDetails(values.type, effectiveTaskTypeOptions);
    
    let taskName = values.name;
    if (!taskName || taskName.trim() === "") {
      const autoName = values.spacecraft
        ? `${selectedTaskTypeDetails?.label || values.type} - ${values.spacecraft}`
        : `${selectedTaskTypeDetails?.label || values.type}`;
      taskName = getUniqueAutoTaskName(autoName, existingTaskNames);
    }

    const task: Task = {
      id: initialTask?.id || crypto.randomUUID(),
      name: taskName,
      spacecraft: values.spacecraft,
      startTime: new Date(values.startTime + 'Z').toISOString(),
      type: values.type,
      preActionDuration: values.preActionDuration,
      postActionDuration: values.postActionDuration,
      isCompleted: initialTask?.isCompleted || false,
      owner: values.owner?.trim() || "",
    };
    onSubmit(task, {
      changeMatchingTaskNames: values.changeMatchingTaskNames,
      originalTaskName: initialTask?.name?.trim() || "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">
            {initialTask ? "Edit Task" : "Add New Task"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Morning Standup" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {canChangeMatchingTaskNames && (
              <FormField
                control={form.control}
                name="changeMatchingTaskNames"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer font-normal">
                      Change all tasks with this name
                    </FormLabel>
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="owner"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Owner (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Casey" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="spacecraft"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Spacecraft</FormLabel>
                  <Select
                    value={toSpacecraftSelectValue(field.value)}
                    onValueChange={(value) => field.onChange(fromSpacecraftSelectValue(value))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a spacecraft" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={BLANK_SPACECRAFT_SELECT_VALUE}>
                        <span className="text-muted-foreground">Blank</span>
                      </SelectItem>
                      {SELECTABLE_SPACECRAFT_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Core Event Time (UTC)</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
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
             <FormField
              control={form.control}
              name="preActionDuration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pre-Action Duration (min)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" placeholder="e.g., 10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="postActionDuration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Post-Action Duration (min)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" placeholder="e.g., 5" {...field} />
                  </FormControl>
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
