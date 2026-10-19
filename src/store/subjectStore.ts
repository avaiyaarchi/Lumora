import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './authStore';
import { updateUserProfile } from '../services/firebase/firestore';

export const DEFAULT_SUBJECTS: string[] = [
  'Operating Systems',
  'Data Structures',
  'Artificial Intelligence',
  'Database Systems',
  'Computer Networks',
  'Software Architecture',
];

interface SubjectState {
  subjects: string[];
  
  // Actions
  addSubject: (name: string) => { success: boolean; error?: string; subject?: string };
  renameSubject: (oldName: string, newName: string) => { success: boolean; error?: string };
  removeSubject: (name: string) => void;
  syncWithTasksAndSessions: (externalSubjects: (string | undefined | null)[]) => void;
  setSubjectsForUser: (userId: string) => Promise<void>;
  resetToDefaults: () => void;
}

/**
 * Case-insensitive duplicate search helper.
 * Returns the matched existing subject string or undefined.
 */
export const findDuplicateSubject = (list: string[], name: string): string | undefined => {
  const normalized = name.trim().toLowerCase();
  return list.find((s) => s.trim().toLowerCase() === normalized);
};

export const useSubjectStore = create<SubjectState>()(
  persist(
    (set, get) => ({
      subjects: [...DEFAULT_SUBJECTS],

      addSubject: (name: string) => {
        const trimmed = (name || '').trim();

        // 1. Validation: Prevent empty or whitespace-only names
        if (!trimmed) {
          return { success: false, error: 'Subject name cannot be empty.' };
        }

        // 2. Validation: Case-insensitive duplicate check
        const currentSubjects = get().subjects;
        const duplicate = findDuplicateSubject(currentSubjects, trimmed);
        if (duplicate) {
          return {
            success: false,
            error: `"${duplicate}" already exists in your subjects list.`,
            subject: duplicate,
          };
        }

        // 3. Add to shared subject list
        const updated = [...currentSubjects, trimmed];
        set({ subjects: updated });

        // 4. Asynchronously persist to user profile / Firestore if authenticated
        const currentUser = useAuthStore.getState().user;
        if (currentUser && currentUser.uid) {
          updateUserProfile(currentUser.uid, {
            customSubjects: updated,
          } as any).catch((err) => {
            // Gracefully ignore network/offline/permission errors
            console.log('[SubjectStore] Syncing subjects to profile (offline/non-fatal):', err?.message || err);
          });
        }

        return { success: true, subject: trimmed };
      },

      renameSubject: (oldName: string, newName: string) => {
        const trimmedOld = (oldName || '').trim();
        const trimmedNew = (newName || '').trim();

        if (!trimmedNew) {
          return { success: false, error: 'Subject name cannot be empty.' };
        }

        const currentSubjects = get().subjects;
        const existingIdx = currentSubjects.findIndex(
          (s) => s.trim().toLowerCase() === trimmedOld.toLowerCase()
        );

        if (existingIdx === -1) {
          return { success: false, error: 'Original subject not found.' };
        }

        // Check if new name conflicts with an existing different subject
        const duplicate = currentSubjects.find(
          (s, idx) => idx !== existingIdx && s.trim().toLowerCase() === trimmedNew.toLowerCase()
        );
        if (duplicate) {
          return {
            success: false,
            error: `A subject named "${duplicate}" already exists.`,
          };
        }

        const updated = [...currentSubjects];
        updated[existingIdx] = trimmedNew;
        set({ subjects: updated });

        const currentUser = useAuthStore.getState().user;
        if (currentUser && currentUser.uid) {
          updateUserProfile(currentUser.uid, {
            customSubjects: updated,
          } as any).catch(() => {});
        }

        return { success: true };
      },

      removeSubject: (name: string) => {
        const trimmed = (name || '').trim().toLowerCase();
        const updated = get().subjects.filter((s) => s.trim().toLowerCase() !== trimmed);
        set({ subjects: updated.length > 0 ? updated : [...DEFAULT_SUBJECTS] });

        const currentUser = useAuthStore.getState().user;
        if (currentUser && currentUser.uid) {
          updateUserProfile(currentUser.uid, {
            customSubjects: updated,
          } as any).catch(() => {});
        }
      },

      syncWithTasksAndSessions: (externalSubjects: (string | undefined | null)[]) => {
        const currentSubjects = get().subjects;
        const toAdd: string[] = [];

        externalSubjects.forEach((sub) => {
          if (!sub) return;
          const trimmed = sub.trim();
          if (!trimmed) return;

          const existsInCurrent = findDuplicateSubject(currentSubjects, trimmed);
          const existsInToAdd = findDuplicateSubject(toAdd, trimmed);

          if (!existsInCurrent && !existsInToAdd) {
            toAdd.push(trimmed);
          }
        });

        if (toAdd.length > 0) {
          set({ subjects: [...currentSubjects, ...toAdd] });
        }
      },

      setSubjectsForUser: async (userId: string) => {
        // Can be called on auth changes to merge any user-specific saved subjects
        try {
          const userKey = `lumora_custom_subjects_${userId}`;
          const saved = await AsyncStorage.getItem(userKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              get().syncWithTasksAndSessions(parsed);
            }
          }
        } catch (e) {
          console.warn('[SubjectStore] Error loading user subjects:', e);
        }
      },

      resetToDefaults: () => {
        set({ subjects: [...DEFAULT_SUBJECTS] });
      },
    }),
    {
      name: 'lumora-subjects-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        subjects: state.subjects,
      }),
    }
  )
);
