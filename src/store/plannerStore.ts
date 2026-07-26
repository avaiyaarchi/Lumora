import { create } from 'zustand';
import { Task } from '../types';
import { getTasks, saveTask, deleteTask } from '../services/firebase/firestore';

interface PlannerState {
  tasks: Task[];
  loading: boolean;
  
  loadTasks: (userId: string) => Promise<void>;
  addTask: (task: Omit<Task, 'actualSessions' | 'createdAt'>) => Promise<void>;
  toggleTaskComplete: (userId: string, taskId: string) => Promise<void>;
  removeTask: (userId: string, taskId: string) => Promise<void>;
  incrementTaskSessions: (userId: string, taskId: string) => Promise<void>;
}

export const usePlannerStore = create<PlannerState>((set, get) => ({
  tasks: [],
  loading: false,

  loadTasks: async (userId) => {
    set({ loading: true });
    try {
      const list = await getTasks(userId);
      set({ tasks: list, loading: false });
    } catch (err) {
      set({ loading: false });
    }
  },

  addTask: async (taskData) => {
    const newTask: Task = {
      ...taskData,
      actualSessions: 0,
      createdAt: new Date().toISOString(),
    };

    // Optimistic UI update
    const currentTasks = get().tasks;
    set({ tasks: [newTask, ...currentTasks] });

    try {
      await saveTask(newTask);
    } catch (err) {
      // Revert if database fails
      set({ tasks: currentTasks });
      throw err;
    }
  },

  toggleTaskComplete: async (userId, taskId) => {
    const currentTasks = get().tasks;
    const taskIndex = currentTasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return;

    const task = currentTasks[taskIndex];
    const updatedTask = { ...task, completed: !task.completed };
    
    const updatedTasks = [...currentTasks];
    updatedTasks[taskIndex] = updatedTask;
    set({ tasks: updatedTasks });

    try {
      await saveTask(updatedTask);
    } catch (err) {
      set({ tasks: currentTasks });
    }
  },

  removeTask: async (userId, taskId) => {
    const currentTasks = get().tasks;
    const updatedTasks = currentTasks.filter((t) => t.id !== taskId);
    set({ tasks: updatedTasks });

    try {
      await deleteTask(userId, taskId);
    } catch (err) {
      set({ tasks: currentTasks });
    }
  },

  incrementTaskSessions: async (userId, taskId) => {
    const currentTasks = get().tasks;
    const taskIndex = currentTasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return;

    const task = currentTasks[taskIndex];
    const updatedTask = { ...task, actualSessions: task.actualSessions + 1 };

    const updatedTasks = [...currentTasks];
    updatedTasks[taskIndex] = updatedTask;
    set({ tasks: updatedTasks });

    try {
      await saveTask(updatedTask);
    } catch (err) {
      set({ tasks: currentTasks });
    }
  },
}));
