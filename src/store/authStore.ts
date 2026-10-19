import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../types';
import {
  subscribeToAuthChanges,
  loginUser,
  registerUser,
  logoutUser,
  resetPassword as apiResetPassword,
  ADMIN_USER_PROFILE,
} from '../services/firebase/auth';
import { updateUserProfile } from '../services/firebase/firestore';
import { processXPAdd, ALL_THEMES, ALL_AVATARS, ALL_ACCESSORIES } from '../constants/xp';
import { useThemeStore } from './themeStore';
import { useSubjectStore } from './subjectStore';
import { AvatarType, AccessoryType } from '../components/avatars/AvatarLayer';
import { isDemoMode, hasFullEntitlements, DEMO_CONFIG } from '../config/demoConfig';


interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  onboardingCompleted: boolean;
  
  initialize: () => () => void;
  login: (email: string, password: string) => Promise<void>;
  loginGuest: () => Promise<void>;
  register: (name: string, email: string, password: string, semester: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  
  addXP: (amount: number) => Promise<{ leveledUp: boolean; newLevel: number }>;
  equipAvatar: (avatar: AvatarType) => Promise<void>;
  equipAccessories: (accessories: AccessoryType[]) => Promise<void>;
  updateStreak: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: isDemoMode() ? ADMIN_USER_PROFILE : null,
  loading: !isDemoMode(),
  error: null,
  initialized: isDemoMode(),
  onboardingCompleted: isDemoMode(),

  initialize: () => {
    if (isDemoMode()) {
      set({ loading: true });

      // Immediate load for demo presentation mode with saved preference persistence
      AsyncStorage.getItem(`lumora_profile_${DEMO_CONFIG.demoUserId}`)
        .then((savedRaw) => {
          let demoProfile = { ...ADMIN_USER_PROFILE };
          if (savedRaw) {
            try {
              const parsed = JSON.parse(savedRaw);
              demoProfile = { ...demoProfile, ...parsed, isAdmin: true };
            } catch (e) {
              console.warn('Failed parsing saved demo profile, using default:', e);
            }
          } else {
            AsyncStorage.setItem(
              `lumora_profile_${DEMO_CONFIG.demoUserId}`,
              JSON.stringify(demoProfile)
            ).catch(() => {});
          }

          set({
            user: demoProfile,
            loading: false,
            initialized: true,
            onboardingCompleted: true,
            error: null,
          });

          // Unlock all themes for demo presentation
          useThemeStore.getState().unlockAllThemes();
          if (demoProfile.customSubjects && demoProfile.customSubjects.length > 0) {
            useSubjectStore.getState().syncWithTasksAndSessions(demoProfile.customSubjects);
          }
        })
        .catch(() => {
          set({
            user: ADMIN_USER_PROFILE,
            loading: false,
            initialized: true,
            onboardingCompleted: true,
            error: null,
          });
          useThemeStore.getState().unlockAllThemes();
        });

      return () => {};
    }

    set({ loading: true });

    // Check onboarding completion
    AsyncStorage.getItem('lumora_onboarding_completed')
      .then((val) => {
        set({ onboardingCompleted: val === 'true' });
      })
      .catch(() => {
        set({ onboardingCompleted: false });
      });

    const unsubscribe = subscribeToAuthChanges((profile) => {
      set({ user: profile, loading: false, initialized: true, error: null });
      
      // If user profile is loaded, sync theme store with unlocked themes and subject store
      if (profile) {
        if (profile.isAdmin) {
          useThemeStore.getState().unlockAllThemes();
        } else {
          profile.unlockedThemes.forEach((theme) => {
            useThemeStore.getState().unlockTheme(theme);
          });
        }
        if (profile.customSubjects && profile.customSubjects.length > 0) {
          useSubjectStore.getState().syncWithTasksAndSessions(profile.customSubjects);
        }
      }
    });
    return unsubscribe;
  },

  completeOnboarding: async () => {
    await AsyncStorage.setItem('lumora_onboarding_completed', 'true');
    set({ onboardingCompleted: true });
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const profile = await loginUser(email, password);
      set({ user: profile, loading: false });
    } catch (err: any) {
      let friendlyMessage = 'Failed to sign in. Please check your credentials.';
      if (err.code === 'auth/invalid-credential' || err.message === 'auth/invalid-credential') {
        friendlyMessage = 'Invalid email or password.';
      } else if (err.code === 'auth/user-not-found' || err.message === 'auth/user-not-found') {
        friendlyMessage = 'No account found with this email.';
      }
      set({ loading: false, error: friendlyMessage });
      throw err;
    }
  },

  loginGuest: async () => {
    set({ loading: true, error: null });
    if (isDemoMode()) {
      set({ user: ADMIN_USER_PROFILE, loading: false });
      return;
    }
    try {
      let profile: UserProfile;
      try {
        profile = await loginUser('guest@lumora.app', 'guestpass123');
      } catch {
        profile = await registerUser('Guest Scholar', 'guest@lumora.app', 'guestpass123', 'Semester 1');
      }
      set({ user: profile, loading: false });
    } catch (err: any) {
      const fallbackGuest: UserProfile = {
        uid: 'guest-user-uid',
        name: 'Guest Scholar',
        email: 'guest@lumora.app',
        semester: 'Semester 1',
        level: 1,
        xp: 0,
        streak: 1,
        lastStudyDate: new Date().toISOString().split('T')[0],
        joinedDate: new Date().toLocaleDateString(),
        unlockedThemes: ['lavender', 'pink', 'cream', 'sky', 'sage'],
        equippedAvatar: 'cat',
        equippedAccessories: [],
        unlockedAvatars: ['cat', 'rabbit'],
        unlockedAccessories: ['glasses'],
      };
      set({ user: fallbackGuest, loading: false });
    }
  },

  register: async (name, email, password, semester) => {
    set({ loading: true, error: null });
    try {
      const profile = await registerUser(name, email, password, semester);
      set({ user: profile, loading: false });
    } catch (err: any) {
      let friendlyMessage = 'Failed to create account.';
      if (err.code === 'auth/email-already-in-use' || err.message === 'auth/email-already-in-use') {
        friendlyMessage = 'This email is already in use by another account.';
      } else if (err.code === 'auth/weak-password' || err.message === 'auth/weak-password') {
        friendlyMessage = 'Password is too weak. Please use a stronger password.';
      }
      set({ loading: false, error: friendlyMessage });
      throw err;
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      await logoutUser();
      set({ user: null, loading: false });
    } catch (err) {
      set({ loading: false });
    }
  },

  resetPassword: async (email) => {
    set({ loading: true, error: null });
    try {
      await apiResetPassword(email);
      set({ loading: false });
    } catch (err: any) {
      let friendlyMessage = 'Failed to send password reset email.';
      if (err.code === 'auth/user-not-found' || err.message === 'auth/user-not-found') {
        friendlyMessage = 'No account found with this email.';
      }
      set({ loading: false, error: friendlyMessage });
      throw err;
    }
  },

  addXP: async (amount) => {
    const { user } = get();
    if (!user) return { leveledUp: false, newLevel: 1 };

    const result = processXPAdd(
      user.xp,
      user.level,
      amount,
      user.unlockedThemes,
      user.unlockedAvatars,
      user.unlockedAccessories
    );

    const isFull = hasFullEntitlements(user);
    const updates: Partial<UserProfile> = {
      xp: result.newXP,
      level: result.newLevel,
      unlockedThemes: isFull ? ALL_THEMES : result.unlockedThemes,
      unlockedAvatars: isFull ? ALL_AVATARS : result.unlockedAvatars,
      unlockedAccessories: isFull ? ALL_ACCESSORIES : result.unlockedAccessories,
    };

    const updatedUser = { ...user, ...updates };
    set({ user: updatedUser });
    await AsyncStorage.setItem(`lumora_profile_${user.uid}`, JSON.stringify(updatedUser)).catch(() => {});
    await updateUserProfile(user.uid, updates);

    // Sync newly unlocked themes to the theme store
    if (isFull) {
      useThemeStore.getState().unlockAllThemes();
    } else {
      result.unlockedThemes.forEach((theme) => {
        useThemeStore.getState().unlockTheme(theme);
      });
    }

    return { leveledUp: result.leveledUp, newLevel: result.newLevel };
  },

  equipAvatar: async (avatar) => {
    const { user } = get();
    if (!user) return;

    if (hasFullEntitlements(user) || user.unlockedAvatars.includes(avatar)) {
      const updatedUser = { ...user, equippedAvatar: avatar };
      set({ user: updatedUser });
      await AsyncStorage.setItem(`lumora_profile_${user.uid}`, JSON.stringify(updatedUser)).catch(() => {});
      await updateUserProfile(user.uid, { equippedAvatar: avatar });
    }
  },

  equipAccessories: async (accessories) => {
    const { user } = get();
    if (!user) return;

    // Filter to ensure only unlocked accessories are equipped (allow all for admin / demo)
    const valid = hasFullEntitlements(user)
      ? accessories
      : accessories.filter((acc) => user.unlockedAccessories.includes(acc));
    const updatedUser = { ...user, equippedAccessories: valid };
    set({ user: updatedUser });
    await AsyncStorage.setItem(`lumora_profile_${user.uid}`, JSON.stringify(updatedUser)).catch(() => {});
    await updateUserProfile(user.uid, { equippedAccessories: valid });
  },

  updateStreak: async () => {
    const { user } = get();
    if (!user) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const lastStudyStr = user.lastStudyDate;

    if (lastStudyStr === todayStr) return; // Already updated streak today

    let newStreak = user.streak;
    if (lastStudyStr) {
      const today = new Date(todayStr);
      const lastStudy = new Date(lastStudyStr);
      const diffTime = Math.abs(today.getTime() - lastStudy.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1; // Reset streak
      }
    } else {
      newStreak = 1;
    }

    const updates: Partial<UserProfile> = {
      streak: newStreak,
      lastStudyDate: todayStr,
    };

    await updateUserProfile(user.uid, updates);
    set({ user: { ...user, ...updates } });
  },
}));
