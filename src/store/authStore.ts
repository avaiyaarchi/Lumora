import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../types';
import {
  subscribeToAuthChanges,
  loginUser,
  registerUser,
  logoutUser,
  resetPassword as apiResetPassword,
} from '../services/firebase/auth';
import { updateUserProfile } from '../services/firebase/firestore';
import { processXPAdd } from '../constants/xp';
import { useThemeStore } from './themeStore';
import { AvatarType, AccessoryType } from '../components/avatars/AvatarLayer';


interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  onboardingCompleted: boolean;
  
  initialize: () => () => void;
  login: (email: string, password: string) => Promise<void>;
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
  user: null,
  loading: true,
  error: null,
  initialized: false,
  onboardingCompleted: false,

  initialize: () => {
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
      
      // If user profile is loaded, sync theme store with unlocked themes
      if (profile) {
        profile.unlockedThemes.forEach((theme) => {
          useThemeStore.getState().unlockTheme(theme);
        });
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

    const updates: Partial<UserProfile> = {
      xp: result.newXP,
      level: result.newLevel,
      unlockedThemes: result.unlockedThemes,
      unlockedAvatars: result.unlockedAvatars,
      unlockedAccessories: result.unlockedAccessories,
    };

    await updateUserProfile(user.uid, updates);

    // Sync newly unlocked themes to the theme store
    result.unlockedThemes.forEach((theme) => {
      useThemeStore.getState().unlockTheme(theme);
    });

    set({ user: { ...user, ...updates } });

    return { leveledUp: result.leveledUp, newLevel: result.newLevel };
  },

  equipAvatar: async (avatar) => {
    const { user } = get();
    if (!user) return;

    if (user.unlockedAvatars.includes(avatar)) {
      await updateUserProfile(user.uid, { equippedAvatar: avatar });
      set({ user: { ...user, equippedAvatar: avatar } });
    }
  },

  equipAccessories: async (accessories) => {
    const { user } = get();
    if (!user) return;

    // Filter to ensure only unlocked accessories are equipped
    const valid = accessories.filter((acc) => user.unlockedAccessories.includes(acc));
    await updateUserProfile(user.uid, { equippedAccessories: valid });
    set({ user: { ...user, equippedAccessories: valid } });
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
