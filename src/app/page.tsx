
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TaskForm } from "@/components/TaskForm";
import { Timeline } from "@/components/Timeline";
import type { Task } from "@/types";
import { useTasks } from "@/hooks/useLocalStorage";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Sun, Moon, Loader2 } from "lucide-react";
import { DayScheduleChart } from "@/components/DayScheduleChart"; // Added import

export default function HomePage() {
  const [tasks, setTasks] = useTasks();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { toast } = useToast();
  const [selectedDateForChart, setSelectedDateForChart] = useState(new Date());


  useEffect(() => {
    setIsMounted(true);
    // Set selectedDateForChart to today in UTC
    const today = new Date();
    setSelectedDateForChart(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())));

    const savedTheme = localStorage.getItem('timeflow-theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
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

  const handleAddTask = (task: Task) => {
    setTasks((prevTasks) => [...prevTasks, task]);
    toast({
      title: "Task Added",
      description: `"${task.name}" has been added to your schedule.`,
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

  const handleToggleComplete = (taskId: string) => {
    let taskName = "";
    let newCompletedState = false;
    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.id === taskId) {
          taskName = task.name;
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
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };
  
  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
          <Button variant="outline" size="icon" onClick={toggleDarkMode} aria-label="Toggle dark mode">
            {isDarkMode ? <Sun className="h-[1.2rem] w-[1.2rem]" /> : <Moon className="h-[1.2rem] w-[1.2rem]" />}
          </Button>
          <Button onClick={openAddModal} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Task
          </Button>
        </div>
      </header>

      <main className="flex-grow space-y-8">
        <section>
          <h2 className="text-2xl font-headline font-semibold text-foreground mb-4">Task List</h2>
          <Timeline
            tasks={tasks}
            onEditTask={openEditModal}
            onDeleteTask={handleDeleteTask}
            onToggleComplete={handleToggleComplete}
          />
        </section>
        
        <section>
          {/* We can add controls here later to change selectedDateForChart */}
          <DayScheduleChart tasks={tasks} selectedDate={selectedDateForChart} />
        </section>
      </main>

      <TaskForm
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={editingTask ? handleEditTask : handleAddTask}
        initialTask={editingTask}
      />
      
      <footer className="mt-8 pt-4 text-center text-sm text-muted-foreground border-t border-border">
        <p>&copy; {new Date().getFullYear()} TimeFlow. Stay organized, effortlessly.</p>
      </footer>
    </div>
  );
}

