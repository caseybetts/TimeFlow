
"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { TaskForm, type TaskFormSubmitOptions } from "@/components/TaskForm";
import { Timeline } from "@/components/Timeline";
import type { Task, TaskType, Spacecraft } from "@/types";
import { BLANK_SPACECRAFT, SPACECRAFT_OPTIONS } from "@/types";
import { useTasks } from "@/hooks/useLocalStorage";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Sun, Moon, LoaderCircle, Settings, Upload, Download, Trash2, Calendar as CalendarIcon, ClipboardPaste, UserRound, Info } from "lucide-react";
import { DayScheduleChart } from "@/components/DayScheduleChart";
import { TaskTypeSettingsModal } from "@/components/TaskTypeSettingsModal";
import { useTaskTypeConfig } from "@/hooks/useTaskTypeConfig";
import { SpreadsheetTaskInput } from "@/components/SpreadsheetTaskInput";
import { getTaskTypeDetails, getUniqueAutoTaskName } from "@/lib/task-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const normalizeCsvHeader = (header: string) =>
  header.trim().replace(/^\uFEFF/, "").toLowerCase().replace(/^"|"$/g, "").replace(/[\s_-]/g, "");

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let currentValue = "";
  let isInQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const character = line[i];
    const nextCharacter = line[i + 1];

    if (character === '"' && isInQuotes && nextCharacter === '"') {
      currentValue += '"';
      i++;
    } else if (character === '"') {
      isInQuotes = !isInQuotes;
    } else if (character === "," && !isInQuotes) {
      values.push(currentValue.trim());
      currentValue = "";
    } else {
      currentValue += character;
    }
  }

  values.push(currentValue.trim());
  return values;
};

const getCsvValue = (values: string[], columnIndex: number) =>
  columnIndex >= 0 ? values[columnIndex]?.trim() ?? "" : "";

const getFirstCsvHeaderIndex = (headers: string[], headerNames: string[]) => {
  for (const headerName of headerNames) {
    const headerIndex = headers.indexOf(headerName);
    if (headerIndex !== -1) {
      return headerIndex;
    }
  }

  return -1;
};

const parseCsvBoolean = (value: string) =>
  ["true", "yes", "y", "1", "done", "complete", "completed"].includes(value.trim().toLowerCase());

const getFsvColumnNumberFromHeader = (normalizedHeader: string): 1 | 2 | 3 | null => {
  const compactHeader = normalizedHeader.replace(/[^a-z0-9]/g, "");
  const match =
    compactHeader.match(/^fsv(?:time)?([123])$/) ??
    compactHeader.match(/^fsv([123])(?:time|datetime|utctime|gmttime|utc|gmt)?$/) ??
    compactHeader.match(/^([123])fsv(?:time|datetime|utctime|gmttime|utc|gmt)?$/);

  if (!match) {
    return null;
  }

  const fsvNumber = Number(match[1]);
  return fsvNumber === 1 || fsvNumber === 2 || fsvNumber === 3 ? fsvNumber : null;
};

const getTlTrackerFsvColumns = (headers: string[]) =>
  headers.flatMap((header, index) => {
    const fsvNumber = getFsvColumnNumberFromHeader(header);
    return fsvNumber ? [{ index, fsvNumber }] : [];
  });

const isEmptyTrackerCell = (value: string) => {
  const normalizedValue = value.trim().toLowerCase();
  return ["", "-", "--", "n/a", "na", "none"].includes(normalizedValue);
};

const CSV_TIME_FORMAT_DESCRIPTION = "H:mm, HH:mm, HH:mm:ss, Hmm, HHmm, Hmmss, or HHmmss";

const parseUtcTimeOnDate = (timeValue: string, targetDate: Date): Date | null => {
  const trimmedTimeValue = timeValue.trim();
  const colonTimeParts = trimmedTimeValue.match(/^(\d{1,2}):(\d{2})(:(\d{2}))?$/);
  const compactTimeParts = trimmedTimeValue.match(/^(\d{3,6})$/);
  let timeParts: { hours: string; minutes: string; seconds: string } | null = null;

  if (colonTimeParts) {
    timeParts = {
      hours: colonTimeParts[1],
      minutes: colonTimeParts[2],
      seconds: colonTimeParts[4] ?? "0",
    };
  } else if (compactTimeParts) {
    const compactTime = compactTimeParts[1];
    const includesSeconds = compactTime.length > 4;
    timeParts = {
      hours: compactTime.slice(0, includesSeconds ? -4 : -2),
      minutes: compactTime.slice(includesSeconds ? -4 : -2, includesSeconds ? -2 : undefined),
      seconds: includesSeconds ? compactTime.slice(-2) : "0",
    };
  }

  if (!timeParts) {
    return null;
  }

  const hours = Number(timeParts.hours);
  const minutes = Number(timeParts.minutes);
  const seconds = Number(timeParts.seconds);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    !Number.isInteger(seconds) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) {
    return null;
  }

  const combinedDateTime = new Date(targetDate);
  combinedDateTime.setUTCHours(hours, minutes, seconds, 0);
  return combinedDateTime;
};

const parseCompactUtcTimeOnDate = (timeValue: string, targetDate: Date): Date | null => {
  const timeParts = timeValue.trim().match(/^([01]\d|2[0-3])([0-5]\d)$/);
  if (!timeParts) {
    return null;
  }

  const combinedDateTime = new Date(targetDate);
  combinedDateTime.setUTCHours(Number(timeParts[1]), Number(timeParts[2]), 0, 0);
  return combinedDateTime;
};

const HIGH_PRIORITY_TIME_GROUP_PATTERN =
  /(^|[^/\d])((?:[01]\d|2[0-3])[0-5]\d(?:\/(?:[01]\d|2[0-3])[0-5]\d)+)(?=$|[^/\d])/g;

const OWNER_NAME_STORAGE_KEY = "timeflow-owner-name";
const normalizeOwnerFilterValue = (value: string) => value.trim().toLowerCase();

const extractHighPriorityTimeGroups = (pastedText: string, targetDate: Date) => {
  const groups: Date[][] = [];

  pastedText.split(/\r\n|\n/).forEach((line) => {
    HIGH_PRIORITY_TIME_GROUP_PATTERN.lastIndex = 0;
    const lineTimes: Date[] = [];
    let match: RegExpExecArray | null;

    while ((match = HIGH_PRIORITY_TIME_GROUP_PATTERN.exec(line)) !== null) {
      match[2].split("/").forEach((timeValue) => {
        const dateTime = parseCompactUtcTimeOnDate(timeValue, targetDate);
        if (dateTime) {
          lineTimes.push(dateTime);
        }
      });
    }

    if (lineTimes.length > 0) {
      groups.push(lineTimes);
    }
  });

  return groups;
};

export default function HomePage() {
  const [tasks, setTasks] = useTasks();
  const [isTaskFormModalOpen, setIsTaskFormModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { toast } = useToast();
  const [selectedDateForChart, setSelectedDateForChart] = useState(new Date());
  const { effectiveTaskTypeOptions } = useTaskTypeConfig();

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [highPriorityPasteText, setHighPriorityPasteText] = useState("");
  const [importTargetDate, setImportTargetDate] = useState<Date | undefined>(new Date());
  const [importMode, setImportMode] = useState<"replace" | "add">("add");
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);
  const [nowRefreshKey, setNowRefreshKey] = useState(0);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [showOnlyMyTasks, setShowOnlyMyTasks] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const normalizedOwnerName = normalizeOwnerFilterValue(ownerName);
  const taskListTasks = showOnlyMyTasks
    ? tasks.filter((task) => normalizedOwnerName !== "" && normalizeOwnerFilterValue(task.owner ?? "") === normalizedOwnerName)
    : tasks;
  const completedTaskCount = taskListTasks.filter((task) => task.isCompleted).length;


  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  useEffect(() => {
    if(isMounted) {
      const today = new Date();
      setSelectedDateForChart(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())));
    }
  }, [isMounted]);

  useEffect(() => {
    if (isMounted) {
      const savedTheme = localStorage.getItem('timeflow-theme');
      let newDarkModeState = false;
      if (savedTheme) {
        newDarkModeState = savedTheme === 'dark';
      } else if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        newDarkModeState = true;
      }
      setIsDarkMode(newDarkModeState);
      if (typeof window !== 'undefined') {
        document.documentElement.classList.toggle('dark', newDarkModeState);
      }
    }
  }, [isMounted]);

  useEffect(() => {
    if (isMounted) {
      setOwnerName(localStorage.getItem(OWNER_NAME_STORAGE_KEY) ?? "");
    }
  }, [isMounted]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNowRefreshKey((prevKey) => prevKey + 1);
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  const toggleDarkMode = () => {
    const newDarkModeState = !isDarkMode;
    setIsDarkMode(newDarkModeState);
    document.documentElement.classList.toggle('dark', newDarkModeState);
    localStorage.setItem('timeflow-theme', newDarkModeState ? 'dark' : 'light');
     toast({
      title: `Switched to ${newDarkModeState ? 'Dark' : 'Light'} Mode`,
      variant: "default",
    });
  };

  const handleOwnerNameChange = (newOwnerName: string) => {
    const trimmedOwnerName = newOwnerName.trim();
    setOwnerName(trimmedOwnerName);
    localStorage.setItem(OWNER_NAME_STORAGE_KEY, trimmedOwnerName);
  };

  const handleToggleShowOnlyMyTasks = () => {
    setShowOnlyMyTasks((current) => !current);
  };

  const handleAddTask = (task: Task) => {
    setTasks((prevTasks) => [...prevTasks, task]);
    toast({
      title: "Task Added",
      description: `"${task.name}" has been added to your schedule.`,
      variant: "default",
      className: "bg-accent text-accent-foreground border-accent"
    });
  };

  const handleBatchAddTasks = (tasksData: Omit<Task, "id" | "isCompleted">[]) => {
    const newTasks: Task[] = tasksData.map(taskData => {
      return {
        ...taskData,
        id: crypto.randomUUID(),
        isCompleted: false,
      };
    });

    setTasks(prevTasks => [...prevTasks, ...newTasks]);
    toast({
      title: "Tasks Added",
      description: `${newTasks.length} task(s) have been added to your schedule.`,
      variant: "default",
      className: "bg-accent text-accent-foreground border-accent"
    });
  };

  const handleEditTask = (updatedTask: Task, options?: TaskFormSubmitOptions) => {
    const originalTaskName = options?.originalTaskName.trim() ?? "";
    const updatedTaskName = updatedTask.name?.trim() || "Task";
    const shouldChangeMatchingTaskNames = Boolean(options?.changeMatchingTaskNames && originalTaskName);
    const changedTaskCount = shouldChangeMatchingTaskNames
      ? tasks.filter((task) => task.id === updatedTask.id || task.name?.trim() === originalTaskName).length
      : 1;

    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.id === updatedTask.id) {
          return updatedTask;
        }

        if (shouldChangeMatchingTaskNames && task.name?.trim() === originalTaskName) {
          return { ...task, name: updatedTask.name };
        }

        return task;
      })
    );
    setEditingTask(null);
    toast({
      title: "Task Updated",
      description:
        shouldChangeMatchingTaskNames && changedTaskCount > 1 && originalTaskName !== updatedTaskName
          ? `${changedTaskCount} task(s) named "${originalTaskName}" were renamed to "${updatedTaskName}".`
          : `"${updatedTaskName}" has been updated.`,
      variant: "default",
    });
  };

  const handleDeleteTask = (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
    if (taskToDelete) {
      toast({
        title: "Task Deleted",
        description: `"${taskToDelete.name}" has been removed.`,
        variant: "destructive",
      });
    }
  };

  const handleOpenDeleteAllConfirmation = () => {
    if (tasks.length === 0) {
      toast({
        title: "No Tasks",
        description: "There are no tasks to delete.",
        variant: "default",
      });
      return;
    }
    setIsDeleteAllConfirmOpen(true);
  };

  const handleExecuteDeleteAllTasks = () => {
    const numTasksDeleted = tasks.length;
    setTasks([]);
    setIsDeleteAllConfirmOpen(false); // Close the dialog
    toast({
      title: "All Tasks Deleted",
      description: `${numTasksDeleted} task(s) have been removed from your schedule.`,
      variant: "destructive",
    });
  };


  const handleToggleComplete = (taskId: string) => {
    let taskName = "";
    let newCompletedState = false;
    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.id === taskId) {
          taskName = task.name || "Task";
          newCompletedState = !task.isCompleted;
          return { ...task, isCompleted: !task.isCompleted };
        }
        return task;
      })
    );
     if (taskName) {
      toast({
        title: newCompletedState ? "Task Completed!" : "Task Marked Incomplete",
        description: `"${taskName}" status updated.`,
        variant: "default",
        className: newCompletedState ? "bg-accent text-accent-foreground border-accent" : ""
      });
    }
  };

  const handleUpdateOwner = (taskId: string, owner: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => (task.id === taskId ? { ...task, owner } : task))
    );
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setIsTaskFormModalOpen(true);
  };

  const openAddModal = () => {
    setEditingTask(null);
    setIsTaskFormModalOpen(true);
  };

  const escapeCsvField = (field: string | number | boolean | undefined): string => {
    if (field === undefined || field === null) return '';
    const stringField = String(field);
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
  };

  const handleExportTasks = () => {
    if (tasks.length === 0) {
      toast({ title: "No Tasks", description: "There are no tasks to export.", variant: "default" });
      return;
    }

    const header = [
      "name", "spacecraft", "startTime", 
      "type", "preActionDuration", "postActionDuration", "Done", "Owner"
    ];
    const csvRows = [header.join(',')];

    tasks.forEach(task => {
      const startTime = new Date(task.startTime);
      const timeString = `${String(startTime.getUTCHours()).padStart(2,'0')}:${String(startTime.getUTCMinutes()).padStart(2,'0')}:${String(startTime.getUTCSeconds()).padStart(2,'0')}`;

      const row = [
        escapeCsvField(task.name),
        escapeCsvField(task.spacecraft),
        escapeCsvField(timeString), 
        escapeCsvField(task.type),
        escapeCsvField(task.preActionDuration),
        escapeCsvField(task.postActionDuration),
        escapeCsvField(Boolean(task.isCompleted)),
        escapeCsvField(task.owner ?? "")
      ];
      csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      const today = new Date().toISOString().slice(0, 10);
      link.setAttribute("href", url);
      link.setAttribute("download", `missionboard_tasks_template_${today}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Export Successful", description: "Day-agnostic tasks template exported to CSV.", className: "bg-accent text-accent-foreground border-accent" });
    } else {
      toast({ title: "Export Failed", description: "Your browser does not support this feature.", variant: "destructive" });
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setCsvFile(event.target.files[0]);
    } else {
      setCsvFile(null);
    }
  };

  const handleImportHighPriorityPaste = () => {
    if (!importTargetDate) {
      toast({ title: "No Date Selected", description: "Please select a target date for the import.", variant: "destructive" });
      return;
    }

    if (!highPriorityPasteText.trim()) {
      toast({ title: "No Text Entered", description: "Paste text containing high priority FSV times first.", variant: "destructive" });
      return;
    }

    const timeGroups = extractHighPriorityTimeGroups(highPriorityPasteText, importTargetDate);
    if (timeGroups.length === 0) {
      toast({
        title: "No High Pri Times Found",
        description: "No valid slash-separated hhmm time groups were found.",
        variant: "destructive",
      });
      return;
    }

    const fsvTaskTypeDetails = getTaskTypeDetails("fsv", effectiveTaskTypeOptions);
    const reservedTaskNames = importMode === "replace" ? [] : tasks.map((task) => task.name);
    const importedTasks: Task[] = timeGroups.flatMap((group) => {
      const taskName = getUniqueAutoTaskName("High Pri 1", reservedTaskNames);
      reservedTaskNames.push(taskName);

      return group.map((dateTime) => {
        return {
          id: crypto.randomUUID(),
          name: taskName,
          spacecraft: BLANK_SPACECRAFT,
          startTime: dateTime.toISOString(),
          type: "fsv" as TaskType,
          preActionDuration: fsvTaskTypeDetails?.preActionDuration ?? 0,
          postActionDuration: fsvTaskTypeDetails?.postActionDuration ?? 0,
          isCompleted: false,
        };
      });
    });

    if (importMode === "replace") {
      setTasks(importedTasks);
    } else {
      setTasks((prevTasks) => [...prevTasks, ...importedTasks]);
    }

    toast({
      title: "High Pri Import Successful",
      description: `${importedTasks.length} FSV task(s) imported from ${timeGroups.length} line group(s).`,
      className: "bg-accent text-accent-foreground border-accent",
    });
    setHighPriorityPasteText("");
  };

  const handleImportTasks = () => {
    if (!csvFile) {
      toast({ title: "No File Selected", description: "Please select a CSV file to import.", variant: "destructive" });
      return;
    }
    if (!importTargetDate) {
      toast({ title: "No Date Selected", description: "Please select a target date for the import.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvString = event.target?.result as string;
      if (!csvString) {
        toast({ title: "Import Error", description: "Could not read file content.", variant: "destructive" });
        return;
      }

      const lines = csvString.split(/\r\n|\n/).filter(line => line.trim() !== ''); 
      if (lines.length < 2) {
        toast({ title: "Import Error", description: "CSV file must have a header and at least one data row.", variant: "destructive" });
        return;
      }

      const headerLine = parseCsvLine(lines[0]).map(normalizeCsvHeader);
      const importedTasks: Task[] = [];
      const errors: string[] = [];
      const reservedTaskNames = importMode === "replace" ? [] : tasks.map((task) => task.name);

      const tlTrackerColIndices = {
        quantity: headerLine.indexOf("quantity"),
        spacecraft: headerLine.indexOf("scid"),
        acquisitionTime: headerLine.indexOf("acquisitiontime"),
        needsCadCheck: headerLine.indexOf("needscadcheck"),
        owner: headerLine.indexOf("owner"),
      };
      const tlTrackerFsvColumns = getTlTrackerFsvColumns(headerLine);

      const isTlMonitoringTrackerCsv =
        tlTrackerColIndices.quantity !== -1 &&
        tlTrackerColIndices.spacecraft !== -1 &&
        tlTrackerColIndices.acquisitionTime !== -1 &&
        tlTrackerColIndices.needsCadCheck !== -1;

      const colIndices = {
        name: headerLine.indexOf("name"),
        spacecraft: headerLine.indexOf("spacecraft"),
        startTime: headerLine.indexOf("starttime"),
        type: headerLine.indexOf("type"),
        preActionDuration: headerLine.indexOf("preactionduration"),
        postActionDuration: headerLine.indexOf("postactionduration"),
        isCompleted: getFirstCsvHeaderIndex(headerLine, ["done", "iscompleted"]),
        owner: headerLine.indexOf("owner"),
      };

      if (isTlMonitoringTrackerCsv) {
        const tlTaskTypeDetails = getTaskTypeDetails("tl", effectiveTaskTypeOptions);
        const cadCheckTaskTypeDetails = getTaskTypeDetails("rtp", effectiveTaskTypeOptions);
        const fsvTaskTypeDetails = getTaskTypeDetails("fsv", effectiveTaskTypeOptions);

        for (let i = 1; i < lines.length; i++) {
          const values = parseCsvLine(lines[i]);
          const quantity = getCsvValue(values, tlTrackerColIndices.quantity);
          const csvSpacecraft = getCsvValue(values, tlTrackerColIndices.spacecraft) as Spacecraft;
          const acquisitionTime = getCsvValue(values, tlTrackerColIndices.acquisitionTime);
          const needsCadCheck = getCsvValue(values, tlTrackerColIndices.needsCadCheck);
          const owner = getCsvValue(values, tlTrackerColIndices.owner);
          const fsvValues = tlTrackerFsvColumns.map((column) => ({
            ...column,
            time: getCsvValue(values, column.index),
          }));
          const hasFsvData = fsvValues.some(({ time }) => !isEmptyTrackerCell(time));

          if (!quantity && !csvSpacecraft && !acquisitionTime && !needsCadCheck && !hasFsvData) {
            continue;
          }

          if (!quantity || !csvSpacecraft) {
            errors.push(`Row ${i + 1}: Missing Quantity or SCID.`);
            continue;
          }

          if (!SPACECRAFT_OPTIONS.includes(csvSpacecraft)) {
            errors.push(`Row ${i + 1}: Invalid SCID "${csvSpacecraft}".`);
            continue;
          }

          const taskName = `${quantity} Timelines`;
          const acquisitionDateTime = parseUtcTimeOnDate(acquisitionTime, importTargetDate!);

          if (!acquisitionTime) {
            errors.push(`Row ${i + 1}: Missing Acquisition Time.`);
          } else if (!acquisitionDateTime) {
            errors.push(`Row ${i + 1}: Invalid Acquisition Time "${acquisitionTime}". Must be ${CSV_TIME_FORMAT_DESCRIPTION}.`);
          } else {
            importedTasks.push({
              id: crypto.randomUUID(),
              name: taskName,
              spacecraft: csvSpacecraft,
              startTime: acquisitionDateTime.toISOString(),
              type: "tl",
              preActionDuration: tlTaskTypeDetails?.preActionDuration ?? 0,
              postActionDuration: tlTaskTypeDetails?.postActionDuration ?? 0,
              isCompleted: false,
              owner,
            });

            if (needsCadCheck.toLowerCase() === "yes") {
              const cadCheckStartTime = new Date(acquisitionDateTime.getTime() - 120 * 60000);

              importedTasks.push({
                id: crypto.randomUUID(),
                name: taskName,
                spacecraft: csvSpacecraft,
                startTime: cadCheckStartTime.toISOString(),
                type: "rtp",
                preActionDuration: cadCheckTaskTypeDetails?.preActionDuration ?? 0,
                postActionDuration: cadCheckTaskTypeDetails?.postActionDuration ?? 0,
                isCompleted: false,
                owner,
              });
            }
          }

          fsvValues.forEach(({ fsvNumber, time }) => {
            if (isEmptyTrackerCell(time)) {
              return;
            }

            const fsvDateTime = parseUtcTimeOnDate(time, importTargetDate!);
            if (!fsvDateTime) {
              errors.push(`Row ${i + 1}: Invalid FSV ${fsvNumber} time "${time}". Must be ${CSV_TIME_FORMAT_DESCRIPTION}.`);
              return;
            }

            importedTasks.push({
              id: crypto.randomUUID(),
              name: `${quantity} ${csvSpacecraft} FSV ${fsvNumber}`,
              spacecraft: csvSpacecraft,
              startTime: fsvDateTime.toISOString(),
              type: "fsv",
              preActionDuration: fsvTaskTypeDetails?.preActionDuration ?? 0,
              postActionDuration: fsvTaskTypeDetails?.postActionDuration ?? 0,
              isCompleted: false,
              owner,
            });
          });
        }

        if (errors.length > 0) {
          toast({
            title: "Import Partially Failed",
            description: (
              <div>
                <p>{importedTasks.length} task(s) imported. {errors.length} row(s) had errors.</p>
                <ul className="list-disc list-inside max-h-20 overflow-y-auto text-xs">
                  {errors.slice(0, 5).map((err, idx) => <li key={idx}>{err}</li>)}
                  {errors.length > 5 && <li>...and {errors.length - 5} more errors.</li>}
                </ul>
              </div>
            ),
            variant: "destructive",
            duration: 10000,
          });
        } else if (importedTasks.length === 0 && lines.length > 1) {
          toast({
            title: "Import Failed",
            description: "No valid TL monitoring tracker rows found in the CSV file.",
            variant: "destructive",
          });
          return;
        }

        if (importedTasks.length > 0) {
          if (importMode === 'replace') {
            setTasks(importedTasks);
          } else {
            setTasks(prevTasks => [...prevTasks, ...importedTasks]);
          }
          toast({
            title: "TL Tracker Import Successful",
            description: `${importedTasks.length} task(s) imported from the TL monitoring tracker.`,
            className: "bg-accent text-accent-foreground border-accent"
          });
        }
        setCsvFile(null);
        const fileInput = document.getElementById('csvImporter') as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        return;
      }
      
      const isMissingRequiredGenericHeader =
        colIndices.spacecraft === -1 || colIndices.startTime === -1 || colIndices.type === -1;

      if (isMissingRequiredGenericHeader) {
        errors.push("CSV header is missing one or more required columns: spacecraft, startTime, type. Optional: name, preActionDuration, postActionDuration, Done, Owner.");
      }

      for (let i = 1; i < lines.length; i++) {
        if (isMissingRequiredGenericHeader) {
          break;
        }

        const values = parseCsvLine(lines[i]);
        if (values.length < headerLine.length && errors.length === 0) { 
            errors.push(`Row ${i + 1}: Incorrect number of columns. Expected ${headerLine.length}, got ${values.length}.`);
            continue;
        }

        try {
          const csvSpacecraft = values[colIndices.spacecraft] as Spacecraft;
          const csvTime = values[colIndices.startTime];
          const csvTaskType = values[colIndices.type] as TaskType;

          if (!SPACECRAFT_OPTIONS.includes(csvSpacecraft)) {
            errors.push(`Row ${i + 1}: Invalid spacecraft "${csvSpacecraft}".`);
            continue;
          }

          const combinedDateTime = parseUtcTimeOnDate(csvTime, importTargetDate!);
          if (!combinedDateTime) {
            errors.push(`Row ${i + 1}: Invalid startTime format "${csvTime}". Must be ${CSV_TIME_FORMAT_DESCRIPTION}.`);
            continue;
          }

          const isValidTaskType = effectiveTaskTypeOptions.some(option => option.value === csvTaskType);
          if (!isValidTaskType) {
            const validTypesString = effectiveTaskTypeOptions.map(opt => opt.value).join(', ');
            errors.push(`Row ${i + 1}: Invalid task type "${csvTaskType}". Valid types are: ${validTypesString}.`);
            continue;
          }

          const taskTypeDetails = getTaskTypeDetails(csvTaskType, effectiveTaskTypeOptions);

          let name = colIndices.name !== -1 ? values[colIndices.name] : undefined;
          if (!name || name.trim() === "") {
            const autoName = csvSpacecraft
              ? `${taskTypeDetails?.label || csvTaskType} - ${csvSpacecraft}`
              : `${taskTypeDetails?.label || csvTaskType}`;
            name = getUniqueAutoTaskName(autoName, reservedTaskNames);
          }
          reservedTaskNames.push(name);

          const preActionDurationStr = colIndices.preActionDuration !== -1 ? values[colIndices.preActionDuration] : undefined;
          const preActionDuration = preActionDurationStr !== undefined && !isNaN(parseInt(preActionDurationStr)) ? parseInt(preActionDurationStr) : (taskTypeDetails?.preActionDuration ?? 0);

          const postActionDurationStr = colIndices.postActionDuration !== -1 ? values[colIndices.postActionDuration] : undefined;
          const postActionDuration = postActionDurationStr !== undefined && !isNaN(parseInt(postActionDurationStr)) ? parseInt(postActionDurationStr) : (taskTypeDetails?.postActionDuration ?? 0);
          
          const isCompleted = colIndices.isCompleted !== -1 ? parseCsvBoolean(values[colIndices.isCompleted] ?? "") : false;
          const owner = colIndices.owner !== -1 ? values[colIndices.owner]?.trim() : "";


          importedTasks.push({
            id: crypto.randomUUID(),
            name,
            spacecraft: csvSpacecraft,
            startTime: combinedDateTime.toISOString(),
            type: csvTaskType,
            preActionDuration: Math.max(0, preActionDuration),
            postActionDuration: Math.max(0, postActionDuration),
            isCompleted,
            owner,
          });
        } catch (e: any) {
          errors.push(`Row ${i + 1}: Error processing row - ${e.message}`);
        }
      }

      if (errors.length > 0) {
        toast({
          title: "Import Partially Failed",
          description: (
            <div>
              <p>{importedTasks.length} task(s) imported. {errors.length} row(s) had errors.</p>
              <ul className="list-disc list-inside max-h-20 overflow-y-auto text-xs">
                {errors.slice(0, 5).map((err, idx) => <li key={idx}>{err}</li>)}
                {errors.length > 5 && <li>...and {errors.length - 5} more errors.</li>}
              </ul>
            </div>
          ),
          variant: "destructive",
          duration: 10000,
        });
      } else if (importedTasks.length === 0 && lines.length > 1) {
         toast({
          title: "Import Failed",
          description: "No valid tasks found in the CSV file.",
          variant: "destructive",
        });
        return;
      }


      if (importedTasks.length > 0) {
        if (importMode === 'replace') {
          setTasks(importedTasks);
        } else {
          setTasks(prevTasks => [...prevTasks, ...importedTasks]);
        }
        toast({
          title: "Import Successful",
          description: `${importedTasks.length} task(s) imported.`,
          className: "bg-accent text-accent-foreground border-accent"
        });
      }
      setCsvFile(null); 
      const fileInput = document.getElementById('csvImporter') as HTMLInputElement;
      if (fileInput) fileInput.value = "";


    };
    reader.onerror = () => {
      toast({ title: "File Read Error", description: "Could not read the selected file.", variant: "destructive" });
      setCsvFile(null);
    };
    reader.readAsText(csvFile);
  };

  const handleRefreshNowLine = () => {
    setNowRefreshKey((prevKey) => prevKey + 1);
  };
  
  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="missionboard-page-shell min-h-screen flex flex-col p-4 md:p-8 transition-colors duration-300">
      <header className="relative z-10 mb-6 flex flex-col gap-4 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-4xl font-headline font-bold text-primary">
          MissionBoard
        </h1>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <div className="flex items-center gap-1 rounded-md bg-card/70 p-1 shadow-sm backdrop-blur-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSettingsModalOpen(true)}
              aria-label="Open settings"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
          <Button onClick={handleExportTasks} variant="outline" className="h-9 border-border/60 bg-card/80 px-3 text-muted-foreground hover:bg-card hover:text-foreground">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <div className="flex items-center gap-2 border-l border-border/70 pl-3">
            <Button onClick={handleOpenDeleteAllConfirmation} variant="outline" disabled={tasks.length === 0} className="h-9 border-destructive/30 bg-destructive/10 px-3 text-destructive hover:bg-destructive hover:text-destructive-foreground">
              <Trash2 className="mr-2 h-4 w-4" /> Clear
            </Button>
            <Button onClick={openAddModal} className="h-9 bg-[color-mix(in_srgb,hsl(var(--primary))_84%,black_16%)] px-3 text-primary-foreground hover:bg-[color-mix(in_srgb,hsl(var(--primary))_76%,black_24%)]">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Task
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-grow space-y-8">
        <section>
          <DayScheduleChart
            tasks={taskListTasks}
            selectedDate={selectedDateForChart}
            onRefreshNowLine={handleRefreshNowLine}
            refreshSignal={nowRefreshKey}
          />
        </section>
        
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-headline font-semibold text-foreground">Task List</h2>
              <span className="rounded-md border bg-card px-2.5 py-1 text-sm font-medium text-muted-foreground">
                {showOnlyMyTasks
                  ? `${taskListTasks.length} of ${tasks.length} tasks`
                  : `${taskListTasks.length} ${taskListTasks.length === 1 ? "task" : "tasks"}`}
              </span>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleShowOnlyMyTasks}
                className={cn(
                  "h-8 border-border/60 px-3 text-xs shadow-sm backdrop-blur-sm hover:bg-card",
                  showOnlyMyTasks ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : "bg-card/95"
                )}
              >
                <UserRound className="mr-2 h-3.5 w-3.5" />
                My Tasks
              </Button>
              {completedTaskCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCompletedTasks((current) => !current)}
                  className="h-8 border-border/60 bg-card/95 px-3 text-xs shadow-sm backdrop-blur-sm hover:bg-card"
                >
                  {showCompletedTasks ? "Hide" : "Show"} {completedTaskCount} Completed {completedTaskCount === 1 ? "Task" : "Tasks"}
                </Button>
              )}
            </div>
          </div>
          <Timeline
            tasks={taskListTasks}
            onEditTask={openEditModal}
            onDeleteTask={handleDeleteTask}
            onToggleComplete={handleToggleComplete}
            onUpdateOwner={handleUpdateOwner}
            refreshKey={nowRefreshKey}
            showCompletedTasks={showCompletedTasks}
          />
        </section>

        <SpreadsheetTaskInput
          onBatchAddTasks={handleBatchAddTasks}
          existingTaskNames={tasks.map((task) => task.name)}
        />

        <Card className="border-0">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Import Tasks</CardTitle>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    aria-label="Show import tips"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-80 space-y-3 text-sm leading-6">
                  <div>
                    <p className="font-medium text-foreground">Pro tip</p>
                    <p className="text-muted-foreground">
                      Select a target UTC date, and day-agnostic times will be applied to that date.
                    </p>
                  </div>
                  <div className="space-y-1 text-muted-foreground">
                    <p>
                      Import mode defaults to <strong>Add to existing tasks</strong>; choose <strong>Replace existing tasks</strong> to start over with only the imported tasks.
                    </p>
                    <p>
                      Generic CSV required columns: <strong>spacecraft</strong>, <strong>startTime</strong> (colon or compact UTC time), <strong>type</strong>.
                    </p>
                    <p>
                      Generic CSV optional columns: <strong>name</strong>, <strong>preActionDuration</strong>, <strong>postActionDuration</strong>, <strong>Done</strong>, <strong>Owner</strong>.
                    </p>
                    <p>
                      TL Monitoring Tracker CSVs require <strong>Quantity</strong>, <strong>SCID</strong>, <strong>Acquisition Time</strong>, <strong>Needs CAD Check</strong>, and support optional <strong>Owner</strong>, <strong>FSV 1</strong>, <strong>FSV 2</strong>, <strong>FSV 3</strong> columns.
                    </p>
                    <p>
                      High priority pasted text uses slash-separated <strong>hhmm</strong> groups; each line group gets the next available <strong>High Pri x</strong> name.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="csvImporter">CSV File</Label>
                <Input id="csvImporter" type="file" accept=".csv" onChange={handleFileChange} className="mt-1" />
              </div>
              <div>
                <Label>Target Date for Import (UTC)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !importTargetDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {importTargetDate ? format(importTargetDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={importTargetDate}
                      onSelect={setImportTargetDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div>
              <Label>Import Mode</Label>
              <RadioGroup defaultValue="add" onValueChange={(value: "replace" | "add") => setImportMode(value)} className="mt-1 flex space-x-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="replace" id="replaceMode" />
                  <Label htmlFor="replaceMode">Replace existing tasks</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="add" id="addMode" />
                  <Label htmlFor="addMode">Add to existing tasks</Label>
                </div>
              </RadioGroup>
            </div>
            <Button onClick={handleImportTasks} disabled={!csvFile || !importTargetDate}>
              <Upload className="mr-2 h-4 w-4" /> Process Import
            </Button>
            <div className="space-y-2 border-t border-border/60 pt-4">
              <Label htmlFor="highPriorityPaste">High Pri FSV Paste</Label>
              <Textarea
                id="highPriorityPaste"
                value={highPriorityPasteText}
                onChange={(event) => setHighPriorityPasteText(event.target.value)}
                placeholder="0730/0745/0810"
                className="min-h-[120px] font-mono text-sm"
              />
              <Button onClick={handleImportHighPriorityPaste} disabled={!highPriorityPasteText.trim() || !importTargetDate}>
                <ClipboardPaste className="mr-2 h-4 w-4" /> Process Paste
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <TaskForm
        isOpen={isTaskFormModalOpen}
        onOpenChange={setIsTaskFormModalOpen}
        onSubmit={editingTask ? handleEditTask : handleAddTask}
        initialTask={editingTask}
        existingTaskNames={tasks.filter((task) => task.id !== editingTask?.id).map((task) => task.name)}
      />

      <TaskTypeSettingsModal
        isOpen={isSettingsModalOpen}
        onOpenChange={setIsSettingsModalOpen}
        ownerName={ownerName}
        onOwnerNameChange={handleOwnerNameChange}
      />

      <AlertDialog open={isDeleteAllConfirmOpen} onOpenChange={setIsDeleteAllConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all {tasks.length} task(s).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleExecuteDeleteAllTasks} 
              className={buttonVariants({ variant: "destructive" })}
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <footer className="relative z-10 mt-8 pt-4 text-center text-sm text-muted-foreground border-t border-border">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="inline-block cursor-default">&copy; {new Date().getFullYear()} MissionBoard. Stay mission-ready.</p>
            </TooltipTrigger>
            <TooltipContent>
              <p>Created by Casey Betts with the help of AI</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </footer>
    </div>
  );
}
