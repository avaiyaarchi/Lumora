import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { ThemeName, ThemeMode, ThemeColors, themePalettes, starterThemes } from '../theme/colors';

interface ThemeState {
  themeName: ThemeName;
  themeMode: ThemeMode;
  unlockedThemes: ThemeName[];
  setThemeName: (name: ThemeName) => void;
  setThemeMode: (mode: ThemeMode) => void;
  unlockTheme: (name: ThemeName) => void;
  getColors: () => ThemeColors;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      themeName: 'lavender',
      themeMode: 'system',
      unlockedThemes: [...starterThemes],

      setThemeName: (name: ThemeName) => {
        if (get().unlockedThemes.includes(name)) {
          set({ themeName: name });
        }
      },

      setThemeMode: (mode: ThemeMode) => set({ themeMode: mode }),

      unlockTheme: (name: ThemeName) => {
        const { unlockedThemes } = get();
        if (!unlockedThemes.includes(name)) {
          set({ unlockedThemes: [...unlockedThemes, name] });
        }
      },

      getColors: () => {
        const { themeName, themeMode } = get();
        const palette = themePalettes[themeName] || themePalettes.lavender;
        
        let activeMode: 'light' | 'dark' = 'light';
        if (themeMode === 'system') {
          const systemScheme = Appearance.getColorScheme();
          activeMode = systemScheme === 'dark' ? 'dark' : 'light';
        } else {
          activeMode = themeMode;
        }

        return palette[activeMode];
      },
    }),
    {
      name: 'lumora-theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        themeName: state.themeName,
        themeMode: state.themeMode,
        unlockedThemes: state.unlockedThemes,
      }),
    }
  )
);
