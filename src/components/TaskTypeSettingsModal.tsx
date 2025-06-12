
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
import type { TaskType, UserEditableTaskTypeFields, UserTaskTypesConfig } from "@/types";
import { Save, RotateCcw, Settings2 } from "lucide-react"; // Changed PlusCircle, Edit, Trash2 to Settings2 for DST
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { useDayChartSettings } from "@/hooks/useDayChartSettings";
import { Switch } from "@/components/ui/switch"; // Added Switch import

interface TaskTypeSettingsModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function TaskTypeSettingsModal({ isOpen, onOpenChange }: TaskTypeSettingsModalProps) {
  const { userConfig, updateUserConfig, resetTaskTypeConfig } = useTaskTypeConfig();
  const { isDstActive, toggleDstActive } = useDayChartSettings();

  const [localTaskTypeConfig, setLocalTaskTypeConfig] = useState<UserTaskTypesConfig>({});
  const { toast } = useToast();

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

  const handleDstToggle = () => {
    toggleDstActive();
    toast({
        title: `Daylight Savings Time ${!isDstActive ? "Enabled" : "Disabled"}`,
        description: `Chart time ranges will be shifted by ${!isDstActive ? "+1" : "-1"} hour.`,
    });
  };

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

            <div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Chart Display Settings</h3>
              <div className="p-4 border rounded-md shadow-sm bg-background">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="dst-toggle" className="text-base">Daylight Savings Time Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable to shift chart time ranges by +1 hour.
                    </p>
                  </div>
                  <Switch
                    id="dst-toggle"
                    checked={isDstActive}
                    onCheckedChange={handleDstToggle}
                  />
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 mt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
