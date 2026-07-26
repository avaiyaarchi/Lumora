import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../src/store/authStore';
import { useThemeStore } from '../src/store/themeStore';
import * as Notifications from '../src/utils/notifications';

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

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const colors = useThemeStore((state) => state.getColors());
  
  // Auth state
  const { user, initialized, initialize, onboardingCompleted } = useAuthStore();

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
        <ActivityIndicator size="large" color={colors.primary} />
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
});
