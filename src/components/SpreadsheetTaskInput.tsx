
"use client";

import { useState } from "react";
import type { SpreadsheetTaskRow, Task, TaskType, Spacecraft } from "@/types";
import { SPACECRAFT_OPTIONS } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTaskTypeConfig } from "@/hooks/useTaskTypeConfig";
import { getTaskTypeDetails, DEFAULT_TASK_TYPE_OPTIONS } from "@/lib/task-utils";
import { PlusCircle, Trash2, SaveAll, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SpreadsheetTaskInputProps {
  onBatchAddTasks: (tasksToAdd: Omit<Task, "id" | "isCompleted">[]) => void;
}

const getUtcDateTimeLocalString = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export function SpreadsheetTaskInput({ onBatchAddTasks }: SpreadsheetTaskInputProps) {
  const [rows, setRows] = useState<SpreadsheetTaskRow[]>([]);
  const { effectiveTaskTypeOptions } = useTaskTypeConfig();
  const { toast } = useToast();

  const defaultTaskType = effectiveTaskTypeOptions.length > 0 ? effectiveTaskTypeOptions[0].value : DEFAULT_TASK_TYPE_OPTIONS[0].value;
  const defaultSpacecraft = SPACECRAFT_OPTIONS[0];

  const handleAddRow = () => {
    setRows([
      ...rows,
      {
        tempId: crypto.randomUUID(),
        name: "",
        spacecraft: defaultSpacecraft,
        startTime: getUtcDateTimeLocalString(new Date()),
        duration: "30",
        type: defaultTaskType,
      },
    ]);
  };

  const handleRemoveRow = (tempId: string) => {
    setRows(rows.filter((row) => row.tempId !== tempId));
  };

  const handleDuplicateRow = (tempId: string) => {
    const rowIndex = rows.findIndex((row) => row.tempId === tempId);
    if (rowIndex === -1) return;

    const rowToDuplicate = rows[rowIndex];
    const newRow: SpreadsheetTaskRow = {
      ...rowToDuplicate,
      tempId: crypto.randomUUID(),
    };

    const newRows = [
      ...rows.slice(0, rowIndex + 1),
      newRow,
      ...rows.slice(rowIndex + 1),
    ];
    setRows(newRows);
    toast({
      title: "Row Duplicated",
      description: `A copy of the task "${rowToDuplicate.name || 'Untitled Task'}" has been added below.`,
    });
  };

  const handleInputChange = (
    tempId: string,
    field: keyof Omit<SpreadsheetTaskRow, "tempId">,
    value: string
  ) => {
    setRows(
      rows.map((row) =>
        row.tempId === tempId ? { ...row, [field]: value } : row
      )
    );
  };

  const handleBatchSubmit = () => {
    const tasksToAdd: Omit<Task, "id" | "isCompleted">[] = [];
    let isValid = true;

    if (rows.length === 0) {
      toast({
        title: "No Tasks to Add",
        description: "Please add some rows to the table first.",
        variant: "destructive",
      });
      return;
    }

    for (const row of rows) {
      const taskTypeDetails = getTaskTypeDetails(row.type, effectiveTaskTypeOptions);
      if (!taskTypeDetails) {
        toast({ title: "Error", description: `Could not find details for task type "${row.type}".`, variant: "destructive" });
        isValid = false;
        break;
      }
      
      let taskName = row.name;
      if (!taskName || taskName.trim() === "") {
        taskName = `${taskTypeDetails.label} - ${row.spacecraft}`;
      }

      const durationNum = parseInt(row.duration, 10);
      if (isNaN(durationNum) || durationNum <= 0) {
        toast({ title: "Validation Error", description: `Duration must be a positive number for task "${taskName}".`, variant: "destructive" });
        isValid = false;
        break;
      }
      if (isNaN(Date.parse(row.startTime + 'Z'))) {
         toast({ title: "Validation Error", description: `Invalid start time for task "${taskName}".`, variant: "destructive" });
        isValid = false;
        break;
      }

      tasksToAdd.push({
        name: taskName,
        spacecraft: row.spacecraft,
        startTime: new Date(row.startTime + 'Z').toISOString(),
        duration: durationNum,
        type: row.type,
        preActionDuration: taskTypeDetails.preActionDuration,
        postActionDuration: taskTypeDetails.postActionDuration,
      });
    }

    if (isValid && tasksToAdd.length > 0) {
      onBatchAddTasks(tasksToAdd);
      setRows([]); 
    } else if (isValid && tasksToAdd.length === 0 && rows.length > 0) {
        toast({
            title: "No Valid Tasks",
            description: "No valid tasks were found to add. Please check your inputs.",
            variant: "destructive",
        });
    }
  };

  return (
    <div className="my-8 p-4 border rounded-lg shadow-sm bg-card">
      <h3 className="text-xl font-headline font-semibold text-foreground mb-4">
        Batch Add Tasks
      </h3>
      {rows.length === 0 && (
        <p className="text-muted-foreground mb-4">
          Click "Add Row" to start entering tasks in the table below.
        </p>
      )}
      {rows.length > 0 && (
        <Table className="mb-4">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[20%]">Task Name (Optional)</TableHead>
              <TableHead className="w-[15%]">Spacecraft</TableHead>
              <TableHead className="w-[25%]">Start Time (UTC)</TableHead>
              <TableHead className="w-[10%]">Duration (min)</TableHead>
              <TableHead className="w-[15%]">Type</TableHead>
              <TableHead className="w-[15%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.tempId}>
                <TableCell>
                  <Input
                    value={row.name || ""}
                    onChange={(e) =>
                      handleInputChange(row.tempId, "name", e.target.value)
                    }
                    placeholder="E.g., Team Meeting"
                    className="h-9"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={row.spacecraft}
                    onValueChange={(value) =>
                      handleInputChange(row.tempId, "spacecraft", value as Spacecraft)
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select spacecraft" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPACECRAFT_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="datetime-local"
                    value={row.startTime}
                    onChange={(e) =>
                      handleInputChange(row.tempId, "startTime", e.target.value)
                    }
                    className="h-9"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={row.duration}
                    onChange={(e) =>
                      handleInputChange(row.tempId, "duration", e.target.value)
                    }
                    placeholder="30"
                    className="h-9"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={row.type}
                    onValueChange={(value) =>
                      handleInputChange(row.tempId, "type", value as TaskType)
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
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
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDuplicateRow(row.tempId)}
                    aria-label="Duplicate row"
                    title="Duplicate row"
                  >
                    <Copy className="h-4 w-4 text-blue-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveRow(row.tempId)}
                    aria-label="Remove row"
                    title="Remove row"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <div className="flex justify-start space-x-2">
        <Button onClick={handleAddRow} variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Row
        </Button>
        {rows.length > 0 && (
          <Button onClick={handleBatchSubmit}>
            <SaveAll className="mr-2 h-4 w-4" /> Add All Tasks to Schedule
          </Button>
        )}
      </div>
    </div>
  );
}
