"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wand2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Task } from "@/types";
import { optimizeTaskOrder, type OptimizeTaskOrderInput, type OptimizeTaskOrderOutput } from "@/ai/flows/optimize-task-order";
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

interface OptimizeButtonProps {
  tasks: Task[];
  onApplyOptimization: (optimizedTaskIds: string[]) => void;
  disabled?: boolean;
}

export function OptimizeButton({ tasks, onApplyOptimization, disabled }: OptimizeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizeTaskOrderOutput | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();

  const handleOptimize = async () => {
    if (tasks.length === 0) {
      toast({
        title: "No Tasks to Optimize",
        description: "Please add some tasks before optimizing.",
        variant: "default",
      });
      return;
    }

    setIsLoading(true);
    try {
      const input: OptimizeTaskOrderInput = {
        tasks: tasks.map(t => ({ id: t.id, type: t.type, startTime: t.startTime, duration: t.duration, buffer: t.buffer })),
        currentTime: new Date().toISOString(),
      };
      const result = await optimizeTaskOrder(input);
      setOptimizationResult(result);
      setShowDialog(true);
    } catch (error) {
      console.error("Error optimizing tasks:", error);
      toast({
        title: "Optimization Failed",
        description: "Could not optimize task order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyOptimization = () => {
    if (optimizationResult) {
      onApplyOptimization(optimizationResult.optimizedOrder);
      toast({
        title: "Schedule Optimized!",
        description: "Your tasks have been reordered.",
        variant: "default",
        className: "bg-accent text-accent-foreground border-accent",
      });
    }
    setShowDialog(false);
    setOptimizationResult(null);
  };

  return (
    <>
      <Button onClick={handleOptimize} disabled={isLoading || disabled} className="bg-primary hover:bg-primary/90 text-primary-foreground">
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Wand2 className="mr-2 h-4 w-4" />
        )}
        Optimize Schedule
      </Button>

      {optimizationResult && (
        <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
          <AlertDialogContent className="bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-headline text-xl">Optimized Schedule Suggestion</AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-muted-foreground whitespace-pre-wrap">
                <p className="font-semibold mb-2">Reasoning:</p>
                <p>{optimizationResult.reasoning}</p>
                <p className="font-semibold mt-4 mb-2">Suggested Order:</p>
                <ol className="list-decimal list-inside">
                  {optimizationResult.optimizedOrder.map((taskId, index) => {
                    const task = tasks.find(t => t.id === taskId);
                    return <li key={taskId}>{task ? task.name : `Task ID: ${taskId}`}</li>;
                  })}
                </ol>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setOptimizationResult(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={applyOptimization} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                Apply Optimization
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
