
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
import { Save, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TaskTypeSettingsModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  ownerName: string;
  onOwnerNameChange: (ownerName: string) => void;
}

export function TaskTypeSettingsModal({ isOpen, onOpenChange, ownerName, onOwnerNameChange }: TaskTypeSettingsModalProps) {
  const { userConfig, updateUserConfig, resetTaskTypeConfig } = useTaskTypeConfig();
  const [localTaskTypeConfig, setLocalTaskTypeConfig] = useState<UserTaskTypesConfig>({});
  const [localOwnerName, setLocalOwnerName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      // Deep clone to prevent direct state mutation issues with nested objects if any
      const currentConfigCopy = JSON.parse(JSON.stringify(userConfig));
      // Ensure all default task types have an entry in local state for editing
      const fullLocalConfig: UserTaskTypesConfig = {};
      DEFAULT_TASK_TYPE_OPTIONS.forEach(defaultOpt => {
        fullLocalConfig[defaultOpt.value] = {
          label: currentConfigCopy[defaultOpt.value]?.label ?? defaultOpt.label,
          preActionDuration: currentConfigCopy[defaultOpt.value]?.preActionDuration ?? defaultOpt.preActionDuration,
          postActionDuration: currentConfigCopy[defaultOpt.value]?.postActionDuration ?? defaultOpt.postActionDuration,
        };
      });
      setLocalTaskTypeConfig(fullLocalConfig);
      setLocalOwnerName(ownerName);
    }
  }, [isOpen, userConfig, ownerName]);


  const handleTaskTypeInputChange = (
    taskValue: TaskType,
    field: keyof UserEditableTaskTypeFields,
    value: string | number
  ) => {
    setLocalTaskTypeConfig(prev => {
      const defaultSettings = DEFAULT_TASK_TYPE_OPTIONS.find(option => option.value === taskValue);
      const existingTypeSettings: UserEditableTaskTypeFields = prev[taskValue] || {
        label: defaultSettings?.label ?? taskValue,
        preActionDuration: defaultSettings?.preActionDuration ?? 0,
        postActionDuration: defaultSettings?.postActionDuration ?? 0,
      };
      const newSettings: UserEditableTaskTypeFields = {
        ...existingTypeSettings, // preserve other fields like label
        label: existingTypeSettings.label, // ensure label is preserved or set from default
        preActionDuration: existingTypeSettings.preActionDuration,
        postActionDuration: existingTypeSettings.postActionDuration
      };

      if (field === 'preActionDuration' || field === 'postActionDuration') {
        newSettings[field] = Math.max(0, Number(value));
      } else if (field === 'label') {
        newSettings[field] = String(value);
      }
      
      return { ...prev, [taskValue]: newSettings };
    });
  };


  const handleSaveSettings = () => {
    // Filter out any entries that are identical to defaults to keep storage minimal
    const configToSave: UserTaskTypesConfig = {};
    for (const taskVal in localTaskTypeConfig) {
        const taskValue = taskVal as TaskType;
        const currentLocal = localTaskTypeConfig[taskValue];
        const defaultOpt = DEFAULT_TASK_TYPE_OPTIONS.find(opt => opt.value === taskValue);

        if (defaultOpt && currentLocal &&
            (currentLocal.label !== defaultOpt.label ||
             currentLocal.preActionDuration !== defaultOpt.preActionDuration ||
             currentLocal.postActionDuration !== defaultOpt.postActionDuration)) {
            configToSave[taskValue] = currentLocal;
        }
    }
    updateUserConfig(configToSave);
    onOwnerNameChange(localOwnerName.trim());
    toast({
      title: "Settings Saved",
      description: "Your app settings have been updated.",
    });
  };

  const handleResetSingleTaskTypeToDefault = (taskValue: TaskType) => {
    resetTaskTypeConfig(taskValue); 
    // Update local state to reflect this reset for the UI
    const defaultOpt = DEFAULT_TASK_TYPE_OPTIONS.find(opt => opt.value === taskValue);
    if (defaultOpt) {
        setLocalTaskTypeConfig(prev => ({
            ...prev,
            [taskValue]: { // Revert to default values for this specific type
                label: defaultOpt.label,
                preActionDuration: defaultOpt.preActionDuration,
                postActionDuration: defaultOpt.postActionDuration,
            }
        }));
    }
     toast({
      title: "Task Type Configuration Reset",
      description: `Settings for "${DEFAULT_TASK_TYPE_OPTIONS.find(opt => opt.value === taskValue)?.label}" have been reset to default. Save to persist.`,
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg md:max-w-2xl bg-card">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl">Settings</DialogTitle>
            <DialogDescription>
              Customize your task ownership and task type defaults.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] p-1 pr-4">
            <div className="mb-8 rounded-md border bg-background p-4 shadow-sm">
              <h3 className="mb-3 text-xl font-semibold text-foreground">Personal Settings</h3>
              <div className="space-y-1">
                <Label htmlFor="owner-name">Your Name</Label>
                <Input
                  id="owner-name"
                  value={localOwnerName}
                  onChange={(event) => setLocalOwnerName(event.target.value)}
                  placeholder="E.g., Casey"
                />
              </div>
            </div>
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-foreground mb-3">Task Type Configuration</h3>
              <div className="space-y-6">
                {DEFAULT_TASK_TYPE_OPTIONS.map((defaultOption) => {
                  // Ensure localTaskTypeConfig has an entry for defaultOption.value
                  const currentSettings = localTaskTypeConfig[defaultOption.value] || {
                      label: defaultOption.label,
                      preActionDuration: defaultOption.preActionDuration,
                      postActionDuration: defaultOption.postActionDuration,
                  };
                  
                  const displayLabel = currentSettings.label;
                  const preDuration = currentSettings.preActionDuration;
                  const postDuration = currentSettings.postActionDuration;

                  return (
                    <div key={defaultOption.value} className="p-4 border rounded-md shadow-sm bg-background">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-lg font-semibold text-primary flex items-center">
                          <defaultOption.icon className="mr-2 h-5 w-5" /> 
                          {defaultOption.label} Default Values
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
                         <div className="space-y-1 md:col-start-1"> {/* Pre Action Duration on new line for clarity if needed */}
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
                      </div>
                    </div>
                  );
                })}
              </div>
               <Button onClick={handleSaveSettings} className="mt-4">
                <Save className="mr-2 h-4 w-4" /> Save Settings
              </Button>
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
