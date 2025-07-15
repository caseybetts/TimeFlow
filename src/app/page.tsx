
"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { TaskForm } from "@/components/TaskForm";
import { Timeline } from "@/components/Timeline";
import type { Task, TaskType, Spacecraft } from "@/types";
import { SPACECRAFT_OPTIONS } from "@/types";
import { useTasks } from "@/hooks/useLocalStorage";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Sun, Moon, LoaderCircle, Settings, Upload, Download, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { DayScheduleChart } from "@/components/DayScheduleChart";
import { TaskTypeSettingsModal } from "@/components/TaskTypeSettingsModal";
import { useTaskTypeConfig } from "@/hooks/useTaskTypeConfig";
import { SpreadsheetTaskInput } from "@/components/SpreadsheetTaskInput";
import { getTaskTypeDetails } from "@/lib/task-utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  const [importTargetDate, setImportTargetDate] = useState<Date | undefined>(new Date());
  const [importMode, setImportMode] = useState<"replace" | "add">("replace");
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);


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

  const handleEditTask = (updatedTask: Task) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => (task.id === updatedTask.id ? updatedTask : task))
    );
    setEditingTask(null);
    toast({
      title: "Task Updated",
      description: `"${updatedTask.name}" has been updated.`,
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
      "type", "preActionDuration", "postActionDuration", "isCompleted"
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
        escapeCsvField(task.isCompleted)
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
      link.setAttribute("download", `timeflow_tasks_template_${today}.csv`);
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

      const headerLine = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
      const importedTasks: Task[] = [];
      const errors: string[] = [];

      const colIndices = {
        name: headerLine.indexOf("name"),
        spacecraft: headerLine.indexOf("spacecraft"),
        startTime: headerLine.indexOf("starttime"),
        type: headerLine.indexOf("type"),
        preActionDuration: headerLine.indexOf("preactionduration"),
        postActionDuration: headerLine.indexOf("postactionduration"),
        isCompleted: headerLine.indexOf("iscompleted"),
      };
      
      if (colIndices.spacecraft === -1 || colIndices.startTime === -1 || colIndices.type === -1) {
          errors.push("CSV header is missing one or more required columns: spacecraft, startTime, type. Optional: name, preActionDuration, postActionDuration, isCompleted.");
      }

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        if (values.length < headerLine.length && errors.length === 0) { 
            errors.push(`Row ${i + 1}: Incorrect number of columns. Expected ${headerLine.length}, got ${values.length}.`);
            continue;
        }
        if (errors.length > 0 && colIndices.spacecraft === -1) break; 

        try {
          const csvSpacecraft = values[colIndices.spacecraft] as Spacecraft;
          const csvTime = values[colIndices.startTime];
          const csvTaskType = values[colIndices.type] as TaskType;

          if (!SPACECRAFT_OPTIONS.includes(csvSpacecraft)) {
            errors.push(`Row ${i + 1}: Invalid spacecraft "${csvSpacecraft}".`);
            continue;
          }

          const timeParts = csvTime.match(/^(\d{2}):(\d{2})(:(\d{2}))?$/);
          if (!timeParts) {
            errors.push(`Row ${i + 1}: Invalid startTime format "${csvTime}". Must be HH:mm or HH:mm:ss.`);
            continue;
          }
          
          const hours = parseInt(timeParts[1], 10);
          const minutes = parseInt(timeParts[2], 10);
          const seconds = timeParts[4] ? parseInt(timeParts[4], 10) : 0;
          
          const combinedDateTime = new Date(importTargetDate!);
          combinedDateTime.setUTCHours(hours, minutes, seconds, 0);

          const isValidTaskType = effectiveTaskTypeOptions.some(option => option.value === csvTaskType);
          if (!isValidTaskType) {
            const validTypesString = effectiveTaskTypeOptions.map(opt => opt.value).join(', ');
            errors.push(`Row ${i + 1}: Invalid task type "${csvTaskType}". Valid types are: ${validTypesString}.`);
            continue;
          }

          const taskTypeDetails = getTaskTypeDetails(csvTaskType, effectiveTaskTypeOptions);

          let name = colIndices.name !== -1 ? values[colIndices.name] : undefined;
          if (!name || name.trim() === "") {
            name = taskTypeDetails ? `${taskTypeDetails.label} - ${csvSpacecraft}` : `${csvTaskType} - ${csvSpacecraft}`;
          }

          const preActionDurationStr = colIndices.preActionDuration !== -1 ? values[colIndices.preActionDuration] : undefined;
          const preActionDuration = preActionDurationStr !== undefined && !isNaN(parseInt(preActionDurationStr)) ? parseInt(preActionDurationStr) : (taskTypeDetails?.preActionDuration ?? 0);

          const postActionDurationStr = colIndices.postActionDuration !== -1 ? values[colIndices.postActionDuration] : undefined;
          const postActionDuration = postActionDurationStr !== undefined && !isNaN(parseInt(postActionDurationStr)) ? parseInt(postActionDurationStr) : (taskTypeDetails?.postActionDuration ?? 0);
          
          const isCompletedStr = colIndices.isCompleted !== -1 ? values[colIndices.isCompleted]?.toLowerCase() : "false";
          const isCompleted = isCompletedStr === "true";


          importedTasks.push({
            id: crypto.randomUUID(),
            name,
            spacecraft: csvSpacecraft,
            startTime: combinedDateTime.toISOString(),
            type: csvTaskType,
            preActionDuration: Math.max(0, preActionDuration),
            postActionDuration: Math.max(0, postActionDuration),
            isCompleted,
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
  
  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 bg-background transition-colors duration-300">
      <header className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b-2 border-border">
        <h1 className="text-4xl font-headline font-bold text-primary mb-4 sm:mb-0">
          TimeFlow
        </h1>
        <div className="flex items-center space-x-2 sm:space-x-4">
           <Button variant="outline" size="icon" onClick={() => setIsSettingsModalOpen(true)} aria-label="Configure Task Types">
            <Settings className="h-[1.2rem] w-[1.2rem]" />
          </Button>
          <Button variant="outline" size="icon" onClick={toggleDarkMode} aria-label="Toggle dark mode">
            {isDarkMode ? <Sun className="h-[1.2rem] w-[1.2rem]" /> : <Moon className="h-[1.2rem] w-[1.2rem]" />}
          </Button>
          <Button onClick={handleExportTasks} variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export Template (CSV)
          </Button>
          <Button onClick={handleOpenDeleteAllConfirmation} variant="destructive" disabled={tasks.length === 0}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete All
          </Button>
          <Button onClick={openAddModal} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Task (Modal)
          </Button>
        </div>
      </header>

      <main className="flex-grow space-y-8">
        <section>
          <DayScheduleChart tasks={tasks} selectedDate={selectedDateForChart} />
        </section>
        
        <section>
          <h2 className="text-2xl font-headline font-semibold text-foreground mb-4">Task List</h2>
          <Timeline
            tasks={tasks}
            onEditTask={openEditModal}
            onDeleteTask={handleDeleteTask}
            onToggleComplete={handleToggleComplete}
          />
        </section>

        <SpreadsheetTaskInput onBatchAddTasks={handleBatchAddTasks} />

        <Card>
          <CardHeader>
            <CardTitle>Import Tasks from CSV</CardTitle>
            <CardDescription>
              Upload a day-agnostic CSV file to import tasks. Select a target date, and the times from the file will be applied to that date.
              <br />
              Required columns: <strong>spacecraft</strong>, <strong>startTime</strong> (in `HH:mm` or `HH:mm:ss` format), <strong>type</strong>.
              <br />
              Optional columns: <strong>name</strong>, <strong>preActionDuration</strong>, <strong>postActionDuration</strong>, <strong>isCompleted</strong>.
            </CardDescription>
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
              <RadioGroup defaultValue="replace" onValueChange={(value: "replace" | "add") => setImportMode(value)} className="mt-1 flex space-x-4">
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
          </CardContent>
        </Card>
      </main>

      <TaskForm
        isOpen={isTaskFormModalOpen}
        onOpenChange={setIsTaskFormModalOpen}
        onSubmit={editingTask ? handleEditTask : handleAddTask}
        initialTask={editingTask}
      />

      <TaskTypeSettingsModal
        isOpen={isSettingsModalOpen}
        onOpenChange={setIsSettingsModalOpen}
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
      
      <footer className="mt-8 pt-4 text-center text-sm text-muted-foreground border-t border-border">
        <p>&copy; {new Date().getFullYear()} TimeFlow. Stay organized, effortlessly.</p>
      </footer>
    </div>
  );
}
