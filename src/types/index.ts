import { ThemeName, ThemeMode } from '../theme/colors';
import { AvatarType, AccessoryType } from '../components/avatars/AvatarLayer';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  semester: string;
  level: number;
  xp: number;
  streak: number;
  lastStudyDate: string | null; // YYYY-MM-DD
  joinedDate: string;
  unlockedThemes: ThemeName[];
  equippedAvatar: AvatarType;
  equippedAccessories: AccessoryType[];
  unlockedAvatars: AvatarType[];
  unlockedAccessories: AccessoryType[];
}

export interface Task {
  id: string;
  userId: string;
  subject: string;
  topic: string;
  estimatedSessions: number;
  actualSessions: number;
  priority: 'low' | 'medium' | 'high';
  deadline: string; // YYYY-MM-DD
  notes?: string;
  completed: boolean;
  createdAt: string;
}

export interface FocusSession {
  id: string;
  userId: string;
  subject: string;
  topic: string;
  duration: number; // in minutes
  timestamp: string; // ISO string
  completed: boolean;
  notes?: string;
  quizScore?: string; // e.g., "4/5" or null if no quiz
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  sessionId: string;
  userId: string;
  subject: string;
  topic: string;
  questions: QuizQuestion[];
  score: number;
  totalQuestions: number;
  timestamp: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
  icon: string; // Lucide icon name
}

// Scaffolded data model for future "Focus Templates" (Section 15)
export interface FocusTemplate {
  id: string;
  userId: string;
  name: string;
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
  quizFrequency: 'never' | 'every_session' | 'every_two_sessions' | 'after_long_break';
  quizCount: number;
  quizDifficulty: 'easy' | 'medium' | 'hard' | 'adaptive';
  autoStartFocus: boolean;
  autoStartBreak: boolean;
  autoStartQuiz: boolean;
}
