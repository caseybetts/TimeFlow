
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTaskTypeConfig } from "@/hooks/useTaskTypeConfig";
import { DEFAULT_TASK_TYPE_OPTIONS } from "@/lib/task-utils";
import type { TaskType, UserEditableTaskTypeFields, UserTaskTypesConfig, DayChartTimeRangeOption } from "@/types";
import { Save, RotateCcw, PlusCircle, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { useDayChartSettings } from "@/hooks/useDayChartSettings";

interface TaskTypeSettingsModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

interface TimeRangeFormState extends Omit<DayChartTimeRangeOption, 'id' | 'startMinute' | 'endMinute'> {
  id?: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}


export function TaskTypeSettingsModal({ isOpen, onOpenChange }: TaskTypeSettingsModalProps) {
  const { userConfig, updateUserConfig, resetTaskTypeConfig } = useTaskTypeConfig();
  const { 
    customTimeRanges, 
    addCustomTimeRange, 
    updateCustomTimeRange, 
    deleteCustomTimeRange 
  } = useDayChartSettings();

  const [localTaskTypeConfig, setLocalTaskTypeConfig] = useState<UserTaskTypesConfig>({});
  const { toast } = useToast();

  // State for managing DayChartTimeRange form
  const [isTimeRangeFormOpen, setIsTimeRangeFormOpen] = useState(false);
  const [editingTimeRange, setEditingTimeRange] = useState<TimeRangeFormState | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalTaskTypeConfig(JSON.parse(JSON.stringify(userConfig)));
    }
  }, [isOpen, userConfig]);

  const handleTaskTypeInputChange = (
    taskValue: TaskType,
    field: keyof UserEditableTaskTypeFields,
    value: string | number
  ) => {
    setLocalTaskTypeConfig(prev => {
      const currentTypeSettings = prev[taskValue] || {};
      const defaultTypeSettings = DEFAULT_TASK_TYPE_OPTIONS.find(opt => opt.value === taskValue);
      
      const newSettings: UserEditableTaskTypeFields = {
        label: currentTypeSettings.label ?? defaultTypeSettings?.label ?? "",
        preActionDuration: currentTypeSettings.preActionDuration ?? defaultTypeSettings?.preActionDuration ?? 0,
        preActionLabel: currentTypeSettings.preActionLabel ?? defaultTypeSettings?.preActionLabel ?? "",
        postActionDuration: currentTypeSettings.postActionDuration ?? defaultTypeSettings?.postActionDuration ?? 0,
        postActionLabel: currentTypeSettings.postActionLabel ?? defaultTypeSettings?.postActionLabel ?? "",
      };

      if (field === 'preActionDuration' || field === 'postActionDuration') {
        newSettings[field] = Math.max(0, Number(value));
      } else {
        (newSettings[field] as string) = String(value);
      }
      
      return { ...prev, [taskValue]: newSettings };
    });
  };

  const handleTaskTypeSaveChanges = () => {
    updateUserConfig(localTaskTypeConfig);
    toast({
      title: "Task Type Settings Saved",
      description: "Task type configurations have been updated.",
    });
    // onOpenChange(false); // Keep modal open if other settings are present
  };

  const handleResetSingleTaskTypeToDefault = (taskValue: TaskType) => {
    resetTaskTypeConfig(taskValue); 
    setLocalTaskTypeConfig(prev => {
        const { [taskValue]: _, ...rest } = prev;
        return rest;
    });
     toast({
      title: "Task Type Configuration Reset",
      description: `Settings for "${DEFAULT_TASK_TYPE_OPTIONS.find(opt => opt.value === taskValue)?.label}" have been reset to default.`,
    });
  };

  // --- DayChartTimeRange Methods ---
  const openTimeRangeForm = (range?: DayChartTimeRangeOption) => {
    if (range) {
      setEditingTimeRange({
        id: range.id,
        label: range.label,
        startTime: `${String(range.startHour).padStart(2, '0')}:${String(range.startMinute).padStart(2, '0')}`,
        endTime: `${String(range.endHour).padStart(2, '0')}:${String(range.endMinute).padStart(2, '0')}`,
        // Raw hours/minutes for direct use if needed, but startTime/endTime strings are primary for form
        startHour: range.startHour, 
        endHour: range.endHour,
      });
    } else {
      setEditingTimeRange({ label: "", startTime: "09:00", endTime: "17:00", startHour: 9, endHour: 17 });
    }
    setIsTimeRangeFormOpen(true);
  };

  const handleTimeRangeFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTimeRange) return;

    const [startH, startM] = editingTimeRange.startTime.split(':').map(Number);
    const [endH, endM] = editingTimeRange.endTime.split(':').map(Number);

    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM) ||
        startH < 0 || startH > 23 || startM < 0 || startM > 59 ||
        endH < 0 || endH > 24 || endM < 0 || endM > 59 || (endH === 24 && endM > 0)) {
      toast({ title: "Invalid Time", description: "Please enter valid hours (0-23, or 24 for end hour) and minutes (0-59).", variant: "destructive" });
      return;
    }
     if ((startH * 60 + startM) >= (endH * 60 + endM)) {
      toast({ title: "Invalid Range", description: "Start time must be before end time.", variant: "destructive" });
      return;
    }


    const rangeData = {
      label: editingTimeRange.label,
      startHour: startH,
      startMinute: startM,
      endHour: endH,
      endMinute: endM,
    };

    if (editingTimeRange.id) {
      updateCustomTimeRange({ ...rangeData, id: editingTimeRange.id });
      toast({ title: "Time Range Updated", description: `"${rangeData.label}" has been updated.` });
    } else {
      addCustomTimeRange(rangeData);
      toast({ title: "Time Range Added", description: `"${rangeData.label}" has been added.` });
    }
    setIsTimeRangeFormOpen(false);
    setEditingTimeRange(null);
  };
  
  const formatTime = (hour: number, minute: number) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;


  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg md:max-w-2xl bg-card">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl">Application Settings</DialogTitle>
            <DialogDescription>
              Customize task types and chart display preferences.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] p-1 pr-4">
            {/* Task Type Configuration Section */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-foreground mb-3">Task Type Configuration</h3>
              <div className="space-y-6">
                {DEFAULT_TASK_TYPE_OPTIONS.map((defaultOption) => {
                  const currentSettings = localTaskTypeConfig[defaultOption.value] || {};
                  const displayLabel = currentSettings.label ?? defaultOption.label;
                  const preDuration = currentSettings.preActionDuration ?? defaultOption.preActionDuration;
                  const preLabel = currentSettings.preActionLabel ?? defaultOption.preActionLabel;
                  const postDuration = currentSettings.postActionDuration ?? defaultOption.postActionDuration;
                  const postLabel = currentSettings.postActionLabel ?? defaultOption.postActionLabel;

                  return (
                    <div key={defaultOption.value} className="p-4 border rounded-md shadow-sm bg-background">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-lg font-semibold text-primary flex items-center">
                          <defaultOption.icon className="mr-2 h-5 w-5" /> 
                          Default: {defaultOption.label} (Type: {defaultOption.value})
                        </h4>
                        <Button variant="outline" size="sm" onClick={() => handleResetSingleTaskTypeToDefault(defaultOption.value)}>
                            <RotateCcw className="mr-2 h-4 w-4" /> Reset
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor={`label-${defaultOption.value}`}>Display Name</Label>
                          <Input
                            id={`label-${defaultOption.value}`}
                            value={displayLabel}
                            onChange={(e) => handleTaskTypeInputChange(defaultOption.value, "label", e.target.value)}
                            placeholder={defaultOption.label}
                          />
                        </div>
                        <div></div> 

                        <div className="space-y-1">
                          <Label htmlFor={`preActionDuration-${defaultOption.value}`}>Pre-Action Duration (min)</Label>
                          <Input
                            id={`preActionDuration-${defaultOption.value}`}
                            type="number"
                            value={preDuration}
                            min="0"
                            onChange={(e) => handleTaskTypeInputChange(defaultOption.value, "preActionDuration", parseInt(e.target.value, 10))}
                            placeholder={String(defaultOption.preActionDuration)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`preActionLabel-${defaultOption.value}`}>Pre-Action Label</Label>
                          <Input
                            id={`preActionLabel-${defaultOption.value}`}
                            value={preLabel || ""}
                            onChange={(e) => handleTaskTypeInputChange(defaultOption.value, "preActionLabel", e.target.value)}
                            placeholder={defaultOption.preActionLabel || "E.g., Prep"}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`postActionDuration-${defaultOption.value}`}>Post-Action Duration (min)</Label>
                          <Input
                            id={`postActionDuration-${defaultOption.value}`}
                            type="number"
                            value={postDuration}
                            min="0"
                            onChange={(e) => handleTaskTypeInputChange(defaultOption.value, "postActionDuration", parseInt(e.target.value, 10))}
                            placeholder={String(defaultOption.postActionDuration)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`postActionLabel-${defaultOption.value}`}>Post-Action Label</Label>
                          <Input
                            id={`postActionLabel-${defaultOption.value}`}
                            value={postLabel || ""}
                            onChange={(e) => handleTaskTypeInputChange(defaultOption.value, "postActionLabel", e.target.value)}
                            placeholder={defaultOption.postActionLabel || "E.g., Wrap-up"}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
               <Button onClick={handleTaskTypeSaveChanges} className="mt-4">
                <Save className="mr-2 h-4 w-4" /> Save Task Type Changes
              </Button>
            </div>

            <Separator className="my-8" />

            {/* Day Chart Time Range Configuration Section */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xl font-semibold text-foreground">Chart Time Ranges</h3>
                <Button variant="outline" onClick={() => openTimeRangeForm()}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Time Range
                </Button>
              </div>
              {customTimeRanges.length === 0 && <p className="text-muted-foreground">No custom time ranges defined. The chart will use "Full Day".</p>}
              <div className="space-y-4">
                {customTimeRanges.map(range => (
                  <div key={range.id} className="p-4 border rounded-md shadow-sm bg-background flex justify-between items-center">
                    <div>
                      <p className="font-medium text-primary">{range.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(range.startHour, range.startMinute)} - {formatTime(range.endHour, range.endMinute)} UTC
                      </p>
                    </div>
                    <div className="space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => openTimeRangeForm(range)} title="Edit time range">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteCustomTimeRange(range.id)} title="Delete time range">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub-Dialog for Adding/Editing Time Range */}
      <Dialog open={isTimeRangeFormOpen} onOpenChange={setIsTimeRangeFormOpen}>
        <DialogContent className="sm:max-w-md bg-card">
          <DialogHeader>
            <DialogTitle>{editingTimeRange?.id ? "Edit" : "Add"} Chart Time Range</DialogTitle>
            <DialogDescription>Define a custom time range for the daily schedule graph.</DialogDescription>
          </DialogHeader>
          {editingTimeRange && (
            <form onSubmit={handleTimeRangeFormSubmit} className="space-y-4 py-2">
              <div>
                <Label htmlFor="range-label">Label</Label>
                <Input
                  id="range-label"
                  value={editingTimeRange.label}
                  onChange={(e) => setEditingTimeRange(prev => prev ? { ...prev, label: e.target.value } : null)}
                  placeholder="E.g., Work Hours"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="range-start-time">Start Time (UTC)</Label>
                  <Input
                    id="range-start-time"
                    type="time"
                    value={editingTimeRange.startTime}
                    onChange={(e) => setEditingTimeRange(prev => prev ? { ...prev, startTime: e.target.value } : null)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="range-end-time">End Time (UTC)</Label>
                  <Input
                    id="range-end-time"
                    type="time"
                    value={editingTimeRange.endTime}
                    onChange={(e) => setEditingTimeRange(prev => prev ? { ...prev, endTime: e.target.value } : null)}
                    required
                  />
                    <p className="text-xs text-muted-foreground pt-1">Use 23:59 for end of day, or 00:00 for start of next day if range spans midnight (up to 24:00 internally).</p>
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsTimeRangeFormOpen(false)}>Cancel</Button>
                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" /> {editingTimeRange.id ? "Save Changes" : "Add Range"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
