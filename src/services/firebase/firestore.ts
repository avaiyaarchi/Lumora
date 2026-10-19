import { auth, db, isFirebaseEnabled } from './config';
import { UserProfile, Task, FocusSession, Quiz } from '../../types';
import { isDemoMode, DEMO_CONFIG } from '../../config/demoConfig';
import * as demoProvider from '../demo/demoDataProvider';
import { HydrationLog } from '../demo/demoDataProvider';

// Standard Firebase SDK Firestore imports
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
} from 'firebase/firestore';

export type { HydrationLog };

// Re-export mock generators for backward compatibility
export const generateAdminMockSessions = demoProvider.generateDemoSessions;
export const generateAdminMockQuizzes = demoProvider.generateDemoQuizzes;
export const generateAdminMockTasks = demoProvider.generateDemoTasks;

/**
 * Determines whether a data operation should be handled by the local Demo Data Provider.
 * Routing rules:
 * 1. Global demo/presentation mode is active (`isDemoMode()`).
 * 2. The request is for the preserved demo/admin identity (`DEMO_CONFIG.demoUserId`).
 * 3. Firebase is disabled or db instance is not configured.
 * 4. No authenticated user exists in Firebase Auth (prevents unauthenticated queries
 *    that trigger Firestore 'permission-denied' errors).
 */
export const isDemoRequest = (userId?: string): boolean => {
  if (isDemoMode()) return true;
  if (!userId) return true;
  if (userId === DEMO_CONFIG.demoUserId || userId.toLowerCase().includes('admin')) {
    return true;
  }
  if (!isFirebaseEnabled || !db) return true;
  // If not in demo mode, but no user is signed in to Firebase Auth,
  // do not issue an unauthenticated network request that will fail security rules
  if (!auth?.currentUser) return true;
  return false;
};

// ==========================================
// USER PROFILE DATABASE OPERATIONS
// ==========================================

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (isDemoRequest(uid)) {
    return demoProvider.demoGetUserProfile(uid);
  }

  // Authenticated Mode
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    console.warn('[Firestore] Skipped profile fetch: No authenticated Firebase session.');
    return null;
  }

  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      console.error(`[Firestore Security] Permission denied reading user profile for uid: ${uid}. Request rejected by Firestore security rules.`);
      throw err;
    }
    console.error(`[Firestore Error] Error fetching user profile for uid ${uid}:`, err);
    throw err;
  }
};

export const createUserProfile = async (profile: UserProfile): Promise<void> => {
  if (isDemoRequest(profile.uid)) {
    return demoProvider.demoCreateUserProfile(profile);
  }

  // Authenticated Mode
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    console.warn('[Firestore] Skipped profile creation: No authenticated Firebase session.');
    return;
  }

  try {
    const docRef = doc(db, 'users', profile.uid);
    await setDoc(docRef, profile);
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      console.error(`[Firestore Security] Permission denied creating user profile for uid: ${profile.uid}. Request rejected by Firestore security rules.`);
      throw err;
    }
    console.error(`[Firestore Error] Error creating user profile for uid ${profile.uid}:`, err);
    throw err;
  }
};

export const updateUserProfile = async (uid: string, updates: Partial<UserProfile>): Promise<void> => {
  if (isDemoRequest(uid)) {
    return demoProvider.demoUpdateUserProfile(uid, updates);
  }

  // Authenticated Mode
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    console.warn('[Firestore] Skipped profile update: No authenticated Firebase session.');
    return;
  }

  try {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, updates);
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      console.error(`[Firestore Security] Permission denied updating user profile for uid: ${uid}. Request rejected by Firestore security rules.`);
      throw err;
    }
    console.error(`[Firestore Error] Error updating user profile for uid ${uid}:`, err);
    throw err;
  }
};

// ==========================================
// PLANNER TASK DATABASE OPERATIONS
// ==========================================

export const getTasks = async (userId: string): Promise<Task[]> => {
  if (isDemoRequest(userId)) {
    return demoProvider.demoGetTasks(userId);
  }

  // Authenticated Mode
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    console.warn('[Firestore] Skipped tasks fetch: No authenticated Firebase session.');
    return [];
  }

  try {
    const q = query(collection(db, 'tasks'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const tasks: Task[] = [];
    querySnapshot.forEach((docSnap) => {
      tasks.push(docSnap.data() as Task);
    });
    return tasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      console.error(`[Firestore Security] Permission denied reading tasks for user: ${userId}. Request rejected by Firestore security rules.`);
      throw err;
    }
    console.error(`[Firestore Error] Error fetching tasks for user ${userId}:`, err);
    throw err;
  }
};

export const saveTask = async (task: Task): Promise<void> => {
  if (isDemoRequest(task.userId)) {
    return demoProvider.demoSaveTask(task);
  }

  // Authenticated Mode
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    console.warn('[Firestore] Skipped save task: No authenticated Firebase session.');
    return;
  }

  try {
    const docRef = doc(db, 'tasks', task.id);
    await setDoc(docRef, task);
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      console.error(`[Firestore Security] Permission denied saving task for user: ${task.userId}. Request rejected by Firestore security rules.`);
      throw err;
    }
    console.error(`[Firestore Error] Error saving task ${task.id}:`, err);
    throw err;
  }
};

export const deleteTask = async (userId: string, taskId: string): Promise<void> => {
  if (isDemoRequest(userId)) {
    return demoProvider.demoDeleteTask(userId, taskId);
  }

  // Authenticated Mode
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    console.warn('[Firestore] Skipped delete task: No authenticated Firebase session.');
    return;
  }

  try {
    const docRef = doc(db, 'tasks', taskId);
    await deleteDoc(docRef);
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      console.error(`[Firestore Security] Permission denied deleting task ${taskId} for user: ${userId}. Request rejected by Firestore security rules.`);
      throw err;
    }
    console.error(`[Firestore Error] Error deleting task ${taskId}:`, err);
    throw err;
  }
};

// ==========================================
// FOCUS SESSION DATABASE OPERATIONS
// ==========================================

export const getFocusSessions = async (userId: string): Promise<FocusSession[]> => {
  if (isDemoRequest(userId)) {
    return demoProvider.demoGetFocusSessions(userId);
  }

  // Authenticated Mode
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    console.warn('[Firestore] Skipped sessions fetch: No authenticated Firebase session.');
    return [];
  }

  try {
    const q = query(collection(db, 'sessions'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const sessions: FocusSession[] = [];
    querySnapshot.forEach((docSnap) => {
      sessions.push(docSnap.data() as FocusSession);
    });
    return sessions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      console.error(`[Firestore Security] Permission denied reading focus sessions for user: ${userId}. Request rejected by Firestore security rules.`);
      throw err;
    }
    console.error(`[Firestore Error] Error fetching sessions for user ${userId}:`, err);
    throw err;
  }
};

export const saveFocusSession = async (session: FocusSession): Promise<void> => {
  if (isDemoRequest(session.userId)) {
    return demoProvider.demoSaveFocusSession(session);
  }

  // Authenticated Mode
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    console.warn('[Firestore] Skipped save session: No authenticated Firebase session.');
    return;
  }

  try {
    const docRef = doc(db, 'sessions', session.id);
    await setDoc(docRef, session);
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      console.error(`[Firestore Security] Permission denied saving focus session for user: ${session.userId}. Request rejected by Firestore security rules.`);
      throw err;
    }
    console.error(`[Firestore Error] Error saving session ${session.id}:`, err);
    throw err;
  }
};

export const updateFocusSessionDifficulty = async (
  userId: string,
  sessionId: string,
  difficulty: 'easy' | 'medium' | 'hard'
): Promise<void> => {
  if (isDemoRequest(userId)) {
    return demoProvider.demoUpdateFocusSessionDifficulty(userId, sessionId, difficulty);
  }

  // Authenticated Mode
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    console.warn('[Firestore] Skipped update session difficulty: No authenticated Firebase session.');
    return;
  }

  try {
    const docRef = doc(db, 'sessions', sessionId);
    await updateDoc(docRef, { difficulty });
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      console.error(`[Firestore Security] Permission denied updating session difficulty for user: ${userId}. Request rejected by Firestore security rules.`);
      throw err;
    }
    console.error(`[Firestore Error] Error updating session difficulty for ${sessionId}:`, err);
    throw err;
  }
};

// ==========================================
// QUIZ DATABASE OPERATIONS
// ==========================================

export const getQuizzes = async (userId: string): Promise<Quiz[]> => {
  if (isDemoRequest(userId)) {
    return demoProvider.demoGetQuizzes(userId);
  }

  // Authenticated Mode
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    console.warn('[Firestore] Skipped quizzes fetch: No authenticated Firebase session.');
    return [];
  }

  try {
    const q = query(collection(db, 'quizzes'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const quizzes: Quiz[] = [];
    querySnapshot.forEach((docSnap) => {
      quizzes.push(docSnap.data() as Quiz);
    });
    return quizzes.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      console.error(`[Firestore Security] Permission denied reading quizzes for user: ${userId}. Request rejected by Firestore security rules.`);
      throw err;
    }
    console.error(`[Firestore Error] Error fetching quizzes for user ${userId}:`, err);
    throw err;
  }
};

export const saveQuiz = async (quiz: Quiz): Promise<void> => {
  if (isDemoRequest(quiz.userId)) {
    return demoProvider.demoSaveQuiz(quiz);
  }

  // Authenticated Mode
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    console.warn('[Firestore] Skipped save quiz: No authenticated Firebase session.');
    return;
  }

  try {
    const docRef = doc(db, 'quizzes', quiz.id);
    await setDoc(docRef, quiz);
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      console.error(`[Firestore Security] Permission denied saving quiz for user: ${quiz.userId}. Request rejected by Firestore security rules.`);
      throw err;
    }
    console.error(`[Firestore Error] Error saving quiz ${quiz.id}:`, err);
    throw err;
  }
};

// ==========================================
// HYDRATION LOG DATABASE OPERATIONS
// ==========================================

export const saveHydrationLog = async (userId: string, amountXp: number): Promise<void> => {
  if (isDemoRequest(userId)) {
    return demoProvider.demoSaveHydrationLog(userId, amountXp);
  }

  // Authenticated Mode
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    console.warn('[Firestore] Skipped save hydration: No authenticated Firebase session.');
    return;
  }

  const log: HydrationLog = {
    id: 'hydration-' + Math.random().toString(36).substr(2, 9),
    userId,
    timestamp: new Date().toISOString(),
    xpAwarded: amountXp,
  };

  try {
    const docRef = doc(db, 'hydration', log.id);
    await setDoc(docRef, log);
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      console.error(`[Firestore Security] Permission denied saving hydration log for user: ${userId}. Request rejected by Firestore security rules.`);
      throw err;
    }
    console.error(`[Firestore Error] Error saving hydration log:`, err);
    throw err;
  }
};
