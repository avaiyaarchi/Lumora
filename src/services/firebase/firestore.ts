import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, isFirebaseEnabled } from './config';
import { UserProfile, Task, FocusSession, Quiz } from '../../types';

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

// Helper: safe JSON parsing
const safeParse = (val: string | null, fallback: any) => {
  if (!val) return fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
};

// ==========================================
// USER PROFILE DATABASE OPERATIONS
// ==========================================

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (isFirebaseEnabled && db) {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      return null;
    } catch (e) {
      console.error('Error fetching user profile from Firestore, checking offline:', e);
    }
  }

  // Local storage fallback
  const localData = await AsyncStorage.getItem(`lumora_profile_${uid}`);
  return safeParse(localData, null);
};

export const createUserProfile = async (profile: UserProfile): Promise<void> => {
  if (isFirebaseEnabled && db) {
    try {
      const docRef = doc(db, 'users', profile.uid);
      await setDoc(docRef, profile);
      return;
    } catch (e) {
      console.error('Error creating user profile in Firestore, checking offline:', e);
    }
  }

  // Local storage fallback
  await AsyncStorage.setItem(`lumora_profile_${profile.uid}`, JSON.stringify(profile));
};

export const updateUserProfile = async (uid: string, updates: Partial<UserProfile>): Promise<void> => {
  if (isFirebaseEnabled && db) {
    try {
      const docRef = doc(db, 'users', uid);
      await updateDoc(docRef, updates);
      return;
    } catch (e) {
      console.error('Error updating user profile in Firestore, checking offline:', e);
    }
  }

  // Local storage fallback
  const profile = await getUserProfile(uid);
  if (profile) {
    const updatedProfile = { ...profile, ...updates };
    await AsyncStorage.setItem(`lumora_profile_${uid}`, JSON.stringify(updatedProfile));
  }
};

// ==========================================
// PLANNER TASK DATABASE OPERATIONS
// ==========================================

export const getTasks = async (userId: string): Promise<Task[]> => {
  if (isFirebaseEnabled && db) {
    try {
      const q = query(collection(db, 'tasks'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const tasks: Task[] = [];
      querySnapshot.forEach((doc) => {
        tasks.push(doc.data() as Task);
      });
      return tasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (e) {
      console.error('Error fetching tasks from Firestore, checking offline:', e);
    }
  }

  // Local storage fallback
  const localData = await AsyncStorage.getItem(`lumora_tasks_${userId}`);
  const tasks: Task[] = safeParse(localData, []);
  return tasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const saveTask = async (task: Task): Promise<void> => {
  if (isFirebaseEnabled && db) {
    try {
      const docRef = doc(db, 'tasks', task.id);
      await setDoc(docRef, task);
      return;
    } catch (e) {
      console.error('Error saving task to Firestore, checking offline:', e);
    }
  }

  // Local storage fallback
  const tasks = await getTasks(task.userId);
  const existingIndex = tasks.findIndex((t) => t.id === task.id);
  if (existingIndex > -1) {
    tasks[existingIndex] = task;
  } else {
    tasks.push(task);
  }
  await AsyncStorage.setItem(`lumora_tasks_${task.userId}`, JSON.stringify(tasks));
};

export const deleteTask = async (userId: string, taskId: string): Promise<void> => {
  if (isFirebaseEnabled && db) {
    try {
      const docRef = doc(db, 'tasks', taskId);
      await deleteDoc(docRef);
      return;
    } catch (e) {
      console.error('Error deleting task from Firestore, checking offline:', e);
    }
  }

  // Local storage fallback
  const tasks = await getTasks(userId);
  const updatedTasks = tasks.filter((t) => t.id !== taskId);
  await AsyncStorage.setItem(`lumora_tasks_${userId}`, JSON.stringify(updatedTasks));
};

// ==========================================
// FOCUS SESSION DATABASE OPERATIONS
// ==========================================

export const getFocusSessions = async (userId: string): Promise<FocusSession[]> => {
  if (isFirebaseEnabled && db) {
    try {
      const q = query(collection(db, 'sessions'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const sessions: FocusSession[] = [];
      querySnapshot.forEach((doc) => {
        sessions.push(doc.data() as FocusSession);
      });
      return sessions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    } catch (e) {
      console.error('Error fetching sessions from Firestore, checking offline:', e);
    }
  }

  // Local storage fallback
  const localData = await AsyncStorage.getItem(`lumora_sessions_${userId}`);
  const sessions: FocusSession[] = safeParse(localData, []);
  return sessions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
};

export const saveFocusSession = async (session: FocusSession): Promise<void> => {
  if (isFirebaseEnabled && db) {
    try {
      const docRef = doc(db, 'sessions', session.id);
      await setDoc(docRef, session);
      return;
    } catch (e) {
      console.error('Error saving session to Firestore, checking offline:', e);
    }
  }

  // Local storage fallback
  const sessions = await getFocusSessions(session.userId);
  sessions.push(session);
  await AsyncStorage.setItem(`lumora_sessions_${session.userId}`, JSON.stringify(sessions));
};

// ==========================================
// QUIZ DATABASE OPERATIONS
// ==========================================

export const getQuizzes = async (userId: string): Promise<Quiz[]> => {
  if (isFirebaseEnabled && db) {
    try {
      const q = query(collection(db, 'quizzes'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const quizzes: Quiz[] = [];
      querySnapshot.forEach((doc) => {
        quizzes.push(doc.data() as Quiz);
      });
      return quizzes.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    } catch (e) {
      console.error('Error fetching quizzes from Firestore, checking offline:', e);
    }
  }

  // Local storage fallback
  const localData = await AsyncStorage.getItem(`lumora_quizzes_${userId}`);
  const quizzes: Quiz[] = safeParse(localData, []);
  return quizzes.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
};

export const saveQuiz = async (quiz: Quiz): Promise<void> => {
  if (isFirebaseEnabled && db) {
    try {
      const docRef = doc(db, 'quizzes', quiz.id);
      await setDoc(docRef, quiz);
      return;
    } catch (e) {
      console.error('Error saving quiz to Firestore, checking offline:', e);
    }
  }

  // Local storage fallback
  const quizzes = await getQuizzes(quiz.userId);
  quizzes.push(quiz);
  await AsyncStorage.setItem(`lumora_quizzes_${quiz.userId}`, JSON.stringify(quizzes));
};
