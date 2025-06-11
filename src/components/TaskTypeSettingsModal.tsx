
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
}

export function TaskTypeSettingsModal({ isOpen, onOpenChange }: TaskTypeSettingsModalProps) {
  const { userConfig, updateUserConfig, resetTaskTypeConfig } = useTaskTypeConfig();
  const [localConfig, setLocalConfig] = useState<UserTaskTypesConfig>({});
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      // Deep copy to prevent direct mutation of userConfig from hook
      setLocalConfig(JSON.parse(JSON.stringify(userConfig)));
    }
  }, [isOpen, userConfig]);

  const handleInputChange = (
    taskValue: TaskType,
    field: keyof UserEditableTaskTypeFields,
    value: string | number
  ) => {
    setLocalConfig(prev => {
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

  const handleSaveChanges = () => {
    updateUserConfig(localConfig);
    toast({
      title: "Settings Saved",
      description: "Task type configurations have been updated.",
    });
    onOpenChange(false);
  };

  const handleResetType = (taskValue: TaskType) => {
    setLocalConfig(prev => {
      const { [taskValue]: _, ...rest } = prev; // Remove specific type config from local state
      return rest;
    });
    // The actual reset in localStorage will happen on save, or if we add specific reset logic to hook
    toast({
      title: "Type Reset",
      description: `Configuration for "${DEFAULT_TASK_TYPE_OPTIONS.find(opt => opt.value === taskValue)?.label}" will revert to default on next save if no new changes are made, or use the hook's direct reset.`,
      variant: "default"
    });
  };
  
  const handleResetSingleTypeToDefault = (taskValue: TaskType) => {
    resetTaskTypeConfig(taskValue); // This updates localStorage directly via the hook
    // Optionally, refresh localConfig from the now updated userConfig if staying in modal
    // For simplicity, current effect [isOpen, userConfig] handles refreshing localConfig if modal re-opens or userConfig changes externally.
    // Or, force a re-fetch for local state:
    setLocalConfig(prev => {
        const { [taskValue]: _, ...rest } = prev;
        return rest; // Local state reflects that this type is now using defaults
    });
     toast({
      title: "Configuration Reset",
      description: `Settings for "${DEFAULT_TASK_TYPE_OPTIONS.find(opt => opt.value === taskValue)?.label}" have been reset to default.`,
    });
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl bg-card">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Configure Task Types</DialogTitle>
          <DialogDescription>
            Customize the names and default pre/post action durations for task types.
            Icons and colors are fixed.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] p-1 pr-4">
          <div className="space-y-6 py-4">
            {DEFAULT_TASK_TYPE_OPTIONS.map((defaultOption) => {
              const currentSettings = localConfig[defaultOption.value] || {};
              const displayLabel = currentSettings.label ?? defaultOption.label;
              const preDuration = currentSettings.preActionDuration ?? defaultOption.preActionDuration;
              const preLabel = currentSettings.preActionLabel ?? defaultOption.preActionLabel;
              const postDuration = currentSettings.postActionDuration ?? defaultOption.postActionDuration;
              const postLabel = currentSettings.postActionLabel ?? defaultOption.postActionLabel;

              return (
                <div key={defaultOption.value} className="p-4 border rounded-md shadow-sm bg-background">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-primary flex items-center">
                      <defaultOption.icon className="mr-2 h-5 w-5" /> 
                      Default: {defaultOption.label} (Type: {defaultOption.value})
                    </h3>
                     <Button variant="outline" size="sm" onClick={() => handleResetSingleTypeToDefault(defaultOption.value)}>
                        <RotateCcw className="mr-2 h-4 w-4" /> Reset This Type
                      </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor={`label-${defaultOption.value}`}>Display Name</Label>
                      <Input
                        id={`label-${defaultOption.value}`}
                        value={displayLabel}
                        onChange={(e) => handleInputChange(defaultOption.value, "label", e.target.value)}
                        placeholder={defaultOption.label}
                      />
                    </div>
                    <div></div> {/* Spacer for grid layout */}

                    <div className="space-y-1">
                      <Label htmlFor={`preActionDuration-${defaultOption.value}`}>Pre-Action Duration (min)</Label>
                      <Input
                        id={`preActionDuration-${defaultOption.value}`}
                        type="number"
                        value={preDuration}
                        onChange={(e) => handleInputChange(defaultOption.value, "preActionDuration", parseInt(e.target.value, 10))}
                        placeholder={String(defaultOption.preActionDuration)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`preActionLabel-${defaultOption.value}`}>Pre-Action Label</Label>
                      <Input
                        id={`preActionLabel-${defaultOption.value}`}
                        value={preLabel || ""}
                        onChange={(e) => handleInputChange(defaultOption.value, "preActionLabel", e.target.value)}
                        placeholder={defaultOption.preActionLabel || "E.g., Prep"}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`postActionDuration-${defaultOption.value}`}>Post-Action Duration (min)</Label>
                      <Input
                        id={`postActionDuration-${defaultOption.value}`}
                        type="number"
                        value={postDuration}
                        onChange={(e) => handleInputChange(defaultOption.value, "postActionDuration", parseInt(e.target.value, 10))}
                        placeholder={String(defaultOption.postActionDuration)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`postActionLabel-${defaultOption.value}`}>Post-Action Label</Label>
                      <Input
                        id={`postActionLabel-${defaultOption.value}`}
                        value={postLabel || ""}
                        onChange={(e) => handleInputChange(defaultOption.value, "postActionLabel", e.target.value)}
                        placeholder={defaultOption.postActionLabel || "E.g., Wrap-up"}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <DialogFooter className="pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSaveChanges}>
            <Save className="mr-2 h-4 w-4" /> Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
