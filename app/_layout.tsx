import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, View, StyleSheet, Text, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../src/store/authStore';
import { useThemeStore } from '../src/store/themeStore';
import { useFocusStore } from '../src/store/focusStore';
import { getXPNeededForNextLevel } from '../src/constants/xp';
import * as Notifications from '../src/utils/notifications';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { Award } from 'lucide-react-native';
import { LumoraLogo } from '../src/components/LumoraLogo';

// Configure default local notifications behaviour
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Toast notification component definition
const SprintCompleteToast = ({ stats, colors, user }: { stats: any; colors: any; user: any }) => {
  if (!user || !stats) return null;
  const needed = getXPNeededForNextLevel(user.level);
  const ratio = Math.min(1, Math.max(0, user.xp / needed));
  const percentage = Math.round(ratio * 100);

  return (
    <Animated.View
      entering={SlideInUp.duration(500)}
      exiting={SlideOutUp.duration(400)}
      style={[styles.toastContainer, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.toastHeader}>
        <Award size={20} color={colors.primary} />
        <Text style={[styles.toastTitle, { color: colors.textPrimary }]}>Sprint Complete!</Text>
      </View>
      <Text style={[styles.toastBody, { color: colors.textSecondary }]}>
        Focused {stats.duration} min • Earned +{stats.xpEarned} XP
      </Text>
      
      <View style={styles.toastProgressContainer}>
        <Text style={[styles.toastProgressText, { color: colors.textSecondary }]}>Level {user.level}</Text>
        <View style={[styles.toastProgressOuter, { backgroundColor: colors.progressBg }]}>
          <View style={[styles.toastProgressInner, { backgroundColor: colors.primary, width: `${percentage}%` }]} />
        </View>
      </View>
    </Animated.View>
  );
};

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const colors = useThemeStore((state) => state.getColors());
  
  // Auth state
  const { user, initialized, initialize, onboardingCompleted } = useAuthStore();

  // Focus Complete Stats Toast states
  const { lastCompletedSprintStats, clearLastCompletedSprintStats } = useFocusStore();
  const [toastVisible, setToastVisible] = useState(false);
  const [toastData, setToastData] = useState<any>(null);

  useEffect(() => {
    if (lastCompletedSprintStats) {
      setToastData(lastCompletedSprintStats);
      setToastVisible(true);

      const timer = setTimeout(() => {
        setToastVisible(false);
        clearLastCompletedSprintStats();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [lastCompletedSprintStats]);

  // Initialize auth listener on mount
  useEffect(() => {
    const unsubscribe = initialize();
    return () => {
      unsubscribe();
    };
  }, [initialize]);

  // Request notification permissions
  useEffect(() => {
    const requestNotificationPermission = async () => {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
      }
    };
    requestNotificationPermission();
  }, []);

  // Handle routing redirects reactive to Auth & Onboarding state
  useEffect(() => {
    if (!initialized) return;

    const segmentStr = segments[0] as string;
    const inAuthGroup = segmentStr === '(auth)';
    const inOnboardingGroup = segmentStr === '(onboarding)';
    const inAppGroup = segmentStr === '(tabs)' || segmentStr === 'focus' || segmentStr === 'quiz' || segmentStr === 'settings';

    if (!user) {
      // User is not signed in
      if (!onboardingCompleted) {
        // Must complete onboarding first
        if (!inOnboardingGroup) {
          router.replace('/(onboarding)' as any);
        }
      } else {
        // Onboarding completed, redirect to login
        if (!inAuthGroup) {
          router.replace('/(auth)/login' as any);
        }
      }
    } else {
      // User is signed in
      if (!onboardingCompleted) {
        if (!inOnboardingGroup) {
          router.replace('/(onboarding)' as any);
        }
      } else {
        // Signed in and onboarding done
        if (!inAppGroup && segmentStr !== 'index') {
          router.replace('/(tabs)' as any);
        }
      }
    }
  }, [user, initialized, onboardingCompleted, segments]);

  // Render splash loader until state is resolved
  if (!initialized) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <LumoraLogo size={96} showWordmark />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="focus/session" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="quiz/[sessionId]" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="settings/index" options={{ headerShown: false }} />
        </Stack>

        {/* Global non-disturbing toast banner notification */}
        {toastVisible && toastData && (
          <SprintCompleteToast
            stats={toastData}
            colors={colors}
            user={user}
          />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Toast layout stylesheet
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 55 : 35,
    left: '5%',
    right: '5%',
    width: '90%',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    shadowColor: 'rgba(142, 117, 200, 0.15)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
    zIndex: 9999,
  },
  toastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  toastTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.1,
  },
  toastBody: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  toastProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toastProgressText: {
    fontSize: 11,
    fontWeight: '800',
  },
  toastProgressOuter: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  toastProgressInner: {
    height: '100%',
    borderRadius: 3,
  },
});
