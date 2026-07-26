import React, { useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, Platform, BackHandler, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../src/store/themeStore';
import { useFocusStore } from '../../src/store/focusStore';
import { TimerCircle } from '../../src/components/TimerCircle';
import { Button } from '../../src/components/Button';

export default function FocusSessionScreen() {
  const router = useRouter();
  const colors = useThemeStore((state) => state.getColors());

  const {
    mode,
    isRunning,
    timeLeft,
    focusDuration,
    subject,
    topic,
    startTimer,
    pauseTimer,
    completeCurrentStage,
    tick,
  } = useFocusStore();

  // Sync Timer local ticking
  useEffect(() => {
    let interval: any = null;
    if (isRunning) {
      interval = setInterval(() => {
        tick();
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, tick]);

  // If the focus timer completes, or state moves away from 'focus', return to tabs index
  useEffect(() => {
    if (mode !== 'focus') {
      router.replace('/(tabs)' as any);
    }
  }, [mode]);

  // Disable physical back button on Android to prevent accidental exit
  useEffect(() => {
    const onBackPress = () => {
      handleQuitAlert();
      return true; // prevent default
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  const handleQuitAlert = () => {
    Alert.alert(
      'Abandon Session?',
      'Are you sure you want to end this study focus session early? You will not earn full XP rewards.',
      [
        { text: 'Keep Studying', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: () => {
            pauseTimer();
            // Go back to tabs index which handles resetting/reconfig
            router.replace('/(tabs)' as any);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Subject Header */}
      <View style={styles.header}>
        <Text style={[styles.subjectText, { color: colors.primary }]} numberOfLines={1}>
          {subject || 'General Studies'}
        </Text>
        <Text style={[styles.topicText, { color: colors.textPrimary }]} numberOfLines={2}>
          {topic || 'Focus Session'}
        </Text>
      </View>

      {/* Main Focus Ring */}
      <View style={styles.timerWrapper}>
        <TimerCircle timeLeft={timeLeft} totalDuration={focusDuration * 60} mode="focus" size={260} />
      </View>

      {/* Encouragement text */}
      <Text style={[styles.encouragement, { color: colors.textSecondary }]}>
        Put away distractions. Keep your mind calm.
      </Text>

      {/* Distraction-Free Controls */}
      <View style={styles.controls}>
        {isRunning ? (
          <Button
            title="Pause Focus"
            variant="secondary"
            onPress={pauseTimer}
            style={styles.actionBtn}
          />
        ) : (
          <Button
            title="Resume"
            onPress={startTimer}
            style={styles.actionBtn}
          />
        )}

        <Button
          title="End Session"
          variant="ghost"
          onPress={handleQuitAlert}
          style={styles.endBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'ios' ? 40 : 20,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    width: '100%',
    paddingHorizontal: 12,
  },
  subjectText: {
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
    textAlign: 'center',
  },
  topicText: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 28,
  },
  timerWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  encouragement: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 24,
  },
  controls: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
    marginBottom: 30,
  },
  actionBtn: {
    width: '100%',
    maxWidth: 240,
  },
  endBtn: {
    width: '100%',
    maxWidth: 240,
  },
});
