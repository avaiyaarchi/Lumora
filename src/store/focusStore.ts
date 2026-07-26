import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { saveFocusSession } from '../services/firebase/firestore';
import { useAuthStore } from './authStore';

export type SessionMode = 'focus' | 'shortBreak' | 'longBreak' | 'quizReady';

interface FocusSettings {
  focusDuration: number; // in minutes
  shortBreakDuration: number; // in minutes
  longBreakDuration: number; // in minutes
  sessionsBeforeLongBreak: number;
  autoStartFocus: boolean;
  autoStartShortBreak: boolean;
  autoStartLongBreak: boolean;
  autoStartQuiz: boolean;
}

interface FocusState extends FocusSettings {
  // Timer State
  mode: SessionMode;
  isRunning: boolean;
  timeLeft: number; // in seconds
  completedSessionsToday: number;
  completedSessionsTotal: number;
  currentStreak: number;
  
  // Timer References for Background Resiliency
  startTime: number | null; // epoch timestamp ms
  secondsElapsedBeforeStart: number; // accumulator for pause/resume

  // Study Context
  subject: string;
  topic: string;
  notes: string;
  fileUri: string | null;
  fileName: string | null;

  // Actions
  setSettings: (settings: Partial<FocusSettings>) => void;
  setContext: (context: { subject: string; topic: string; notes?: string; fileUri?: string | null; fileName?: string | null }) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  tick: () => void;
  syncBackgroundTimer: () => void;
  completeCurrentStage: () => Promise<void>;
  skipToNext: () => void;
  resetDailySessions: () => void;
  completeQuiz: () => void;
}

// Convert minutes to seconds
const minToSec = (min: number) => min * 60;

export const useFocusStore = create<FocusState>()(
  persist(
    (set, get) => {
      // Background synchronization handler
      const handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          get().syncBackgroundTimer();
        }
      };

      // Subscribe to AppState changes
      AppState.addEventListener('change', handleAppStateChange);

      return {
        // Default settings
        focusDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 10,
        sessionsBeforeLongBreak: 4,
        autoStartFocus: false,
        autoStartShortBreak: true,
        autoStartLongBreak: true,
        autoStartQuiz: true,

        // Initial State
        mode: 'focus',
        isRunning: false,
        timeLeft: 25 * 60,
        completedSessionsToday: 0,
        completedSessionsTotal: 0,
        currentStreak: 0,
        startTime: null,
        secondsElapsedBeforeStart: 0,

        // Study Context
        subject: '',
        topic: '',
        notes: '',
        fileUri: null,
        fileName: null,

        setSettings: (settings) => {
          set(settings);
          // Recalculate timeLeft if not running and settings changed
          const state = get();
          if (!state.isRunning) {
            let nextDuration = state.focusDuration;
            if (state.mode === 'shortBreak') nextDuration = state.shortBreakDuration;
            else if (state.mode === 'longBreak') nextDuration = state.longBreakDuration;
            set({ timeLeft: minToSec(nextDuration) });
          }
        },

        setContext: (context) => {
          set(context);
        },

        startTimer: () => {
          const { isRunning, mode, focusDuration, shortBreakDuration, longBreakDuration } = get();
          if (isRunning) return;

          let targetSec = minToSec(focusDuration);
          if (mode === 'shortBreak') targetSec = minToSec(shortBreakDuration);
          if (mode === 'longBreak') targetSec = minToSec(longBreakDuration);

          // Schedule a notification for when the timer ends
          const secondsRemaining = get().timeLeft;
          if (secondsRemaining > 0) {
            Notifications.scheduleNotificationAsync({
              identifier: `lumora-timer-${mode}`,
              content: {
                title: mode === 'focus' ? 'Focus Completed!' : 'Break Completed!',
                body: mode === 'focus' 
                  ? 'Great job studying! Ready for a break?' 
                  : 'Time to get back to work!',
                sound: true,
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: new Date(Date.now() + secondsRemaining * 1000),
              },
            }).catch((err) => console.log('Error scheduling notification', err));
          }

          set({
            isRunning: true,
            startTime: Date.now(),
          });
        },

        pauseTimer: () => {
          const { isRunning, startTime, secondsElapsedBeforeStart, mode } = get();
          if (!isRunning) return;

          // Cancel scheduled notification
          Notifications.cancelScheduledNotificationAsync(`lumora-timer-${mode}`).catch(() => {});

          const elapsedSinceLastStart = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
          set({
            isRunning: false,
            secondsElapsedBeforeStart: secondsElapsedBeforeStart + elapsedSinceLastStart,
            startTime: null,
          });
        },

        resetTimer: () => {
          const { mode, focusDuration, shortBreakDuration, longBreakDuration } = get();
          
          // Cancel scheduled notification
          Notifications.cancelScheduledNotificationAsync(`lumora-timer-${mode}`).catch(() => {});

          let targetDuration = focusDuration;
          if (mode === 'shortBreak') targetDuration = shortBreakDuration;
          else if (mode === 'longBreak') targetDuration = longBreakDuration;

          set({
            isRunning: false,
            startTime: null,
            secondsElapsedBeforeStart: 0,
            timeLeft: minToSec(targetDuration),
          });
        },

        tick: () => {
          const { isRunning, startTime, secondsElapsedBeforeStart, mode, focusDuration, shortBreakDuration, longBreakDuration } = get();
          if (!isRunning || !startTime) return;

          const targetDuration = 
            mode === 'focus' ? focusDuration :
            mode === 'shortBreak' ? shortBreakDuration : longBreakDuration;
          
          const totalTargetSec = minToSec(targetDuration);
          const elapsedSinceStart = Math.floor((Date.now() - startTime) / 1000);
          const totalElapsed = secondsElapsedBeforeStart + elapsedSinceStart;
          const remaining = Math.max(0, totalTargetSec - totalElapsed);

          if (remaining === 0) {
            get().completeCurrentStage();
          } else {
            set({ timeLeft: remaining });
          }
        },

        syncBackgroundTimer: () => {
          const { isRunning, startTime, secondsElapsedBeforeStart, mode, focusDuration, shortBreakDuration, longBreakDuration } = get();
          if (!isRunning || !startTime) return;

          const targetDuration = 
            mode === 'focus' ? focusDuration :
            mode === 'shortBreak' ? shortBreakDuration : longBreakDuration;

          const totalTargetSec = minToSec(targetDuration);
          const elapsedSinceStart = Math.floor((Date.now() - startTime) / 1000);
          const totalElapsed = secondsElapsedBeforeStart + elapsedSinceStart;
          const remaining = Math.max(0, totalTargetSec - totalElapsed);

          if (remaining === 0) {
            get().completeCurrentStage();
          } else {
            set({ timeLeft: remaining });
          }
        },

        completeCurrentStage: async () => {
          const {
            mode,
            focusDuration,
            shortBreakDuration,
            longBreakDuration,
            sessionsBeforeLongBreak,
            completedSessionsToday,
            completedSessionsTotal,
            autoStartFocus,
            autoStartShortBreak,
            autoStartLongBreak,
            autoStartQuiz,
            subject,
            topic,
            notes,
          } = get();

          // Cancel any notifications
          Notifications.cancelScheduledNotificationAsync(`lumora-timer-${mode}`).catch(() => {});

          set({ isRunning: false, startTime: null, secondsElapsedBeforeStart: 0 });

          if (mode === 'focus') {
            const nextSessionsToday = completedSessionsToday + 1;
            const nextSessionsTotal = completedSessionsTotal + 1;

            // Trigger XP update in authStore
            const user = useAuthStore.getState().user;
            if (user) {
              await useAuthStore.getState().addXP(25); // 25 XP for focus session completion
              await useAuthStore.getState().updateStreak();
              
              // Save Focus Session to DB
              const session = {
                id: 'session-' + Math.random().toString(36).substr(2, 9),
                userId: user.uid,
                subject: subject || 'General Studies',
                topic: topic || 'Core concepts',
                duration: focusDuration,
                timestamp: new Date().toISOString(),
                completed: true,
                notes: notes,
              };
              await saveFocusSession(session);
            }

            set({
              completedSessionsToday: nextSessionsToday,
              completedSessionsTotal: nextSessionsTotal,
            });

            // Determine if next is a long break or a quiz or short break
            const shouldTakeLongBreak = nextSessionsToday % sessionsBeforeLongBreak === 0;

            if (autoStartQuiz && (subject.trim() || topic.trim())) {
              set({
                mode: 'quizReady',
                timeLeft: 0,
              });
            } else if (shouldTakeLongBreak) {
              set({
                mode: 'longBreak',
                timeLeft: minToSec(longBreakDuration),
              });
              if (autoStartLongBreak) {
                get().startTimer();
              }
            } else {
              set({
                mode: 'shortBreak',
                timeLeft: minToSec(shortBreakDuration),
              });
              if (autoStartShortBreak) {
                get().startTimer();
              }
            }
          } else {
            // Completed a break (short or long)
            set({
              mode: 'focus',
              timeLeft: minToSec(focusDuration),
            });
            if (autoStartFocus) {
              get().startTimer();
            }
          }
        },

        skipToNext: () => {
          const { mode, focusDuration, shortBreakDuration, longBreakDuration, completedSessionsToday, sessionsBeforeLongBreak } = get();
          
          Notifications.cancelScheduledNotificationAsync(`lumora-timer-${mode}`).catch(() => {});
          
          set({ isRunning: false, startTime: null, secondsElapsedBeforeStart: 0 });

          if (mode === 'focus') {
            const shouldTakeLongBreak = (completedSessionsToday + 1) % sessionsBeforeLongBreak === 0;
            set({
              mode: shouldTakeLongBreak ? 'longBreak' : 'shortBreak',
              timeLeft: minToSec(shouldTakeLongBreak ? longBreakDuration : shortBreakDuration),
            });
          } else {
            set({
              mode: 'focus',
              timeLeft: minToSec(focusDuration),
            });
          }
        },

        resetDailySessions: () => {
          set({ completedSessionsToday: 0 });
        },

        completeQuiz: () => {
          const { completedSessionsToday, sessionsBeforeLongBreak, shortBreakDuration, longBreakDuration, autoStartShortBreak, autoStartLongBreak } = get();
          const shouldTakeLongBreak = completedSessionsToday % sessionsBeforeLongBreak === 0;

          if (shouldTakeLongBreak) {
            set({
              mode: 'longBreak',
              timeLeft: minToSec(longBreakDuration),
            });
            if (autoStartLongBreak) {
              get().startTimer();
            }
          } else {
            set({
              mode: 'shortBreak',
              timeLeft: minToSec(shortBreakDuration),
            });
            if (autoStartShortBreak) {
              get().startTimer();
            }
          }
        },
      };
    },
    {
      name: 'lumora-focus-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        focusDuration: state.focusDuration,
        shortBreakDuration: state.shortBreakDuration,
        longBreakDuration: state.longBreakDuration,
        sessionsBeforeLongBreak: state.sessionsBeforeLongBreak,
        autoStartFocus: state.autoStartFocus,
        autoStartShortBreak: state.autoStartShortBreak,
        autoStartLongBreak: state.autoStartLongBreak,
        autoStartQuiz: state.autoStartQuiz,
        completedSessionsToday: state.completedSessionsToday,
        completedSessionsTotal: state.completedSessionsTotal,
        mode: state.mode,
        timeLeft: state.timeLeft,
      }),
    }
  )
);
