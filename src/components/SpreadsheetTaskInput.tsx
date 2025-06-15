
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

  const defaultTaskTypeOption = effectiveTaskTypeOptions.length > 0 ? effectiveTaskTypeOptions[0] : DEFAULT_TASK_TYPE_OPTIONS[0];
  const defaultSpacecraft = SPACECRAFT_OPTIONS[0];

  const handleAddRow = () => {
     const taskTypeDetails = getTaskTypeDetails(defaultTaskTypeOption.value, effectiveTaskTypeOptions);
    setRows([
      ...rows,
      {
        tempId: crypto.randomUUID(),
        name: "",
        spacecraft: defaultSpacecraft,
        startTime: getUtcDateTimeLocalString(new Date()),
        type: defaultTaskTypeOption.value,
        preActionDuration: taskTypeDetails?.preActionDuration ?? 0,
        postActionDuration: taskTypeDetails?.postActionDuration ?? 0,
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
    value: string | number
  ) => {
    setRows(
      rows.map((row) => {
        if (row.tempId === tempId) {
          const updatedRow = { ...row, [field]: value };
          if (field === "type") {
            const taskTypeDetails = getTaskTypeDetails(value as TaskType, effectiveTaskTypeOptions);
            updatedRow.preActionDuration = taskTypeDetails?.preActionDuration ?? 0;
            updatedRow.postActionDuration = taskTypeDetails?.postActionDuration ?? 0;
          }
          return updatedRow;
        }
        return row;
      })
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

      if (isNaN(Date.parse(row.startTime + 'Z'))) {
         toast({ title: "Validation Error", description: `Invalid start time for task "${taskName}". Ensure it's full date and time.`, variant: "destructive" });
        isValid = false;
        break;
      }
      
      const preActionDuration = row.preActionDuration !== undefined && !isNaN(Number(row.preActionDuration)) ? Number(row.preActionDuration) : taskTypeDetails.preActionDuration;
      const postActionDuration = row.postActionDuration !== undefined && !isNaN(Number(row.postActionDuration)) ? Number(row.postActionDuration) : taskTypeDetails.postActionDuration;


      tasksToAdd.push({
        name: taskName,
        spacecraft: row.spacecraft,
        startTime: new Date(row.startTime + 'Z').toISOString(),
        type: row.type,
        preActionDuration: Math.max(0, preActionDuration),
        postActionDuration: Math.max(0, postActionDuration),
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
        Batch Add Tasks (via Table)
      </h3>
      {rows.length === 0 && (
        <p className="text-muted-foreground mb-4">
          Click "Add Row" to start entering tasks in the table below. Pre/Post durations default from task type.
        </p>
      )}
      {rows.length > 0 && (
        <div className="overflow-x-auto">
        <Table className="mb-4 min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[20%]">Task Name (Optional)</TableHead>
              <TableHead className="w-[15%]">Spacecraft</TableHead>
              <TableHead className="w-[20%]">Core Event Time (UTC)</TableHead>
              <TableHead className="w-[15%]">Type</TableHead>
              <TableHead className="w-[10%]">Pre (min)</TableHead>
              <TableHead className="w-[10%]">Post (min)</TableHead>
              <TableHead className="w-[10%] text-right">Actions</TableHead>
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
                    className="h-9 text-xs"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={row.spacecraft}
                    onValueChange={(value) =>
                      handleInputChange(row.tempId, "spacecraft", value as Spacecraft)
                    }
                  >
                    <SelectTrigger className="h-9 text-xs">
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
                    className="h-9 text-xs"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={row.type}
                    onValueChange={(value) =>
                      handleInputChange(row.tempId, "type", value as TaskType)
                    }
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {effectiveTaskTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center">
                            <option.icon className="mr-2 h-3 w-3" />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    value={row.preActionDuration ?? ""}
                    onChange={(e) =>
                      handleInputChange(row.tempId, "preActionDuration", parseInt(e.target.value, 10) || 0)
                    }
                    placeholder="Def"
                    className="h-9 text-xs"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    value={row.postActionDuration ?? ""}
                    onChange={(e) =>
                      handleInputChange(row.tempId, "postActionDuration", parseInt(e.target.value, 10) || 0)
                    }
                    placeholder="Def"
                    className="h-9 text-xs"
                  />
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDuplicateRow(row.tempId)}
                    aria-label="Duplicate row"
                    title="Duplicate row"
                    className="h-7 w-7"
                  >
                    <Copy className="h-3.5 w-3.5 text-blue-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveRow(row.tempId)}
                    aria-label="Remove row"
                    title="Remove row"
                    className="h-7 w-7"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
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
