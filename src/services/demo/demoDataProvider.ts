import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, Task, FocusSession, Quiz } from '../../types';
import { ALL_THEMES, ALL_AVATARS, ALL_ACCESSORIES } from '../../constants/xp';
import { DEMO_CONFIG, ADMIN_USER_PROFILE, ADMIN_USER_EMAIL } from '../../config/demoConfig';

export interface HydrationLog {
  id: string;
  userId: string;
  timestamp: string;
  xpAwarded: number;
}

// Helper: Safe JSON parsing
const safeParse = <T>(val: string | null, fallback: T): T => {
  if (!val) return fallback;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
};

// ==========================================
// REALISTIC DEMO DATA GENERATORS
// ==========================================

export const generateDemoTasks = (userId: string): Task[] => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 3);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  return [
    {
      id: 'demo-task-1',
      userId,
      subject: 'Operating Systems',
      topic: 'Virtual Memory & Page Replacement',
      estimatedSessions: 3,
      actualSessions: 2,
      priority: 'high',
      completed: false,
      deadline: todayStr,
      notes: 'Review LRU, Clock, and Working Set algorithms.',
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
    {
      id: 'demo-task-2',
      userId,
      subject: 'Data Structures',
      topic: 'Graph Algorithms & Dijkstra',
      estimatedSessions: 2,
      actualSessions: 2,
      priority: 'medium',
      completed: true,
      deadline: todayStr,
      notes: 'Implemented adjacency list and min-heap.',
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    },
    {
      id: 'demo-task-3',
      userId,
      subject: 'Artificial Intelligence',
      topic: 'Neural Networks & Deep Learning',
      estimatedSessions: 4,
      actualSessions: 1,
      priority: 'high',
      completed: false,
      deadline: tomorrowStr,
      notes: 'Backpropagation gradient calculus review.',
      createdAt: new Date(Date.now() - 3600000 * 9).toISOString(),
    },
    {
      id: 'demo-task-4',
      userId,
      subject: 'Database Systems',
      topic: 'SQL Optimization & Indexing',
      estimatedSessions: 2,
      actualSessions: 0,
      priority: 'low',
      completed: false,
      deadline: nextWeekStr,
      notes: 'B+ Tree index scans vs table scans.',
      createdAt: new Date(Date.now() - 3600000 * 14).toISOString(),
    },
  ];
};

export const generateDemoSessions = (userId: string): FocusSession[] => {
  const mockSessions: FocusSession[] = [];
  const subjects = [
    { subject: 'Operating Systems', topic: 'Kernel & Process Management' },
    { subject: 'Data Structures', topic: 'Tree Traversals & Graph Algorithms' },
    { subject: 'Artificial Intelligence', topic: 'Neural Networks & Deep Learning' },
    { subject: 'Database Systems', topic: 'SQL Optimization & Indexing' },
    { subject: 'Software Architecture', topic: 'Microservices & System Design' },
  ];

  const today = new Date();
  for (let i = 89; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // Seed realistic study pattern (approx 78% active study days)
    const seedVal = (i * 17 + 5) % 100;
    if (seedVal > 22) {
      const count = (seedVal % 4) + 1; // 1 to 4 focus sessions per day
      for (let s = 0; s < count; s++) {
        const subObj = subjects[(i + s) % subjects.length];
        const duration = [25, 30, 45, 60][(i + s) % 4];
        const hourStr = String(9 + s * 3).padStart(2, '0');
        const timestamp = `${dateStr}T${hourStr}:30:00.000Z`;

        mockSessions.push({
          id: `demo-sess-${i}-${s}`,
          userId,
          subject: subObj.subject,
          topic: subObj.topic,
          duration,
          timestamp,
          completed: true,
          difficulty: (['easy', 'medium', 'hard'] as const)[(i + s) % 3],
        });
      }
    }
  }
  return mockSessions;
};

export const generateDemoQuizzes = (userId: string): Quiz[] => {
  const mockQuizzes: Quiz[] = [];
  const subjects = [
    { subject: 'Operating Systems', topic: 'Kernel & Process Management' },
    { subject: 'Data Structures', topic: 'Tree Traversals & Graph Algorithms' },
    { subject: 'Artificial Intelligence', topic: 'Neural Networks & Deep Learning' },
    { subject: 'Database Systems', topic: 'SQL Optimization & Indexing' },
  ];

  const today = new Date();
  for (let i = 85; i >= 0; i -= 4) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const subObj = subjects[i % subjects.length];
    const score = i % 5 === 0 ? 5 : 4;

    mockQuizzes.push({
      id: `demo-quiz-${i}`,
      sessionId: `demo-sess-${i}-0`,
      userId,
      subject: subObj.subject,
      topic: subObj.topic,
      score,
      totalQuestions: 5,
      timestamp: `${dateStr}T16:00:00.000Z`,
      questions: [],
    });
  }
  return mockQuizzes;
};

// ==========================================
// LOCAL DEMO PROVIDER OPERATIONS
// ==========================================

export const demoGetUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const localData = await AsyncStorage.getItem(`lumora_profile_${uid}`);
  const parsed = safeParse<UserProfile | null>(localData, null);
  if (parsed) {
    return parsed;
  }
  // Return preserved admin demo profile as safe default
  const defaultProfile: UserProfile = {
    ...ADMIN_USER_PROFILE,
    uid,
    unlockedThemes: ALL_THEMES,
    unlockedAvatars: ALL_AVATARS,
    unlockedAccessories: ALL_ACCESSORIES,
  };
  await AsyncStorage.setItem(`lumora_profile_${uid}`, JSON.stringify(defaultProfile));
  return defaultProfile;
};

export const demoCreateUserProfile = async (profile: UserProfile): Promise<void> => {
  await AsyncStorage.setItem(`lumora_profile_${profile.uid}`, JSON.stringify(profile));
};

export const demoUpdateUserProfile = async (uid: string, updates: Partial<UserProfile>): Promise<void> => {
  const current = await demoGetUserProfile(uid);
  if (current) {
    const updated = { ...current, ...updates };
    await AsyncStorage.setItem(`lumora_profile_${uid}`, JSON.stringify(updated));
  }
};

export const demoGetTasks = async (userId: string): Promise<Task[]> => {
  const localData =
    (await AsyncStorage.getItem(`lumora_demo_tasks_${userId}`)) ||
    (await AsyncStorage.getItem(`lumora_tasks_${userId}`));
  let tasks: Task[] = safeParse(localData, []);

  // Seed realistic starter tasks on first load
  if (tasks.length === 0) {
    tasks = generateDemoTasks(userId);
    await AsyncStorage.setItem(`lumora_demo_tasks_${userId}`, JSON.stringify(tasks));
    await AsyncStorage.setItem(`lumora_tasks_${userId}`, JSON.stringify(tasks));
  }

  return tasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const demoSaveTask = async (task: Task): Promise<void> => {
  const tasks = await demoGetTasks(task.userId);
  const existingIdx = tasks.findIndex((t) => t.id === task.id);
  if (existingIdx > -1) {
    tasks[existingIdx] = task;
  } else {
    tasks.unshift(task);
  }
  await AsyncStorage.setItem(`lumora_demo_tasks_${task.userId}`, JSON.stringify(tasks));
  await AsyncStorage.setItem(`lumora_tasks_${task.userId}`, JSON.stringify(tasks));
};

export const demoDeleteTask = async (userId: string, taskId: string): Promise<void> => {
  const tasks = await demoGetTasks(userId);
  const updated = tasks.filter((t) => t.id !== taskId);
  await AsyncStorage.setItem(`lumora_demo_tasks_${userId}`, JSON.stringify(updated));
  await AsyncStorage.setItem(`lumora_tasks_${userId}`, JSON.stringify(updated));
};

export const demoGetFocusSessions = async (userId: string): Promise<FocusSession[]> => {
  const localData =
    (await AsyncStorage.getItem(`lumora_demo_sessions_${userId}`)) ||
    (await AsyncStorage.getItem(`lumora_sessions_${userId}`));
  let sessions: FocusSession[] = safeParse(localData, []);

  // Seed realistic 90-day progress history on first load
  if (sessions.length === 0) {
    sessions = generateDemoSessions(userId);
    await AsyncStorage.setItem(`lumora_demo_sessions_${userId}`, JSON.stringify(sessions));
    await AsyncStorage.setItem(`lumora_sessions_${userId}`, JSON.stringify(sessions));
  }

  return sessions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
};

export const demoSaveFocusSession = async (session: FocusSession): Promise<void> => {
  const sessions = await demoGetFocusSessions(session.userId);
  sessions.unshift(session);
  await AsyncStorage.setItem(`lumora_demo_sessions_${session.userId}`, JSON.stringify(sessions));
  await AsyncStorage.setItem(`lumora_sessions_${session.userId}`, JSON.stringify(sessions));
};

export const demoUpdateFocusSessionDifficulty = async (
  userId: string,
  sessionId: string,
  difficulty: 'easy' | 'medium' | 'hard'
): Promise<void> => {
  const sessions = await demoGetFocusSessions(userId);
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx > -1) {
    sessions[idx].difficulty = difficulty;
    await AsyncStorage.setItem(`lumora_demo_sessions_${userId}`, JSON.stringify(sessions));
    await AsyncStorage.setItem(`lumora_sessions_${userId}`, JSON.stringify(sessions));
  }
};

export const demoGetQuizzes = async (userId: string): Promise<Quiz[]> => {
  const localData =
    (await AsyncStorage.getItem(`lumora_demo_quizzes_${userId}`)) ||
    (await AsyncStorage.getItem(`lumora_quizzes_${userId}`));
  let quizzes: Quiz[] = safeParse(localData, []);

  // Seed realistic quiz history on first load
  if (quizzes.length === 0) {
    quizzes = generateDemoQuizzes(userId);
    await AsyncStorage.setItem(`lumora_demo_quizzes_${userId}`, JSON.stringify(quizzes));
    await AsyncStorage.setItem(`lumora_quizzes_${userId}`, JSON.stringify(quizzes));
  }

  return quizzes.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
};

export const demoSaveQuiz = async (quiz: Quiz): Promise<void> => {
  const quizzes = await demoGetQuizzes(quiz.userId);
  quizzes.unshift(quiz);
  await AsyncStorage.setItem(`lumora_demo_quizzes_${quiz.userId}`, JSON.stringify(quizzes));
  await AsyncStorage.setItem(`lumora_quizzes_${quiz.userId}`, JSON.stringify(quizzes));
};

export const demoSaveHydrationLog = async (userId: string, amountXp: number): Promise<void> => {
  const log: HydrationLog = {
    id: 'demo-hydration-' + Math.random().toString(36).substr(2, 9),
    userId,
    timestamp: new Date().toISOString(),
    xpAwarded: amountXp,
  };
  const localData = await AsyncStorage.getItem(`lumora_hydration_${userId}`);
  const logs: HydrationLog[] = safeParse(localData, []);
  logs.unshift(log);
  await AsyncStorage.setItem(`lumora_hydration_${userId}`, JSON.stringify(logs));
};
