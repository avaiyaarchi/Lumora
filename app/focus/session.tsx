import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { BackHandler, Modal, Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Button } from '../../src/components/Button';
import { TimerCircle } from '../../src/components/TimerCircle';
import { AvatarLayer } from '../../src/components/avatars/AvatarLayer';
import { useAuthStore } from '../../src/store/authStore';
import { useFocusStore } from '../../src/store/focusStore';
import { useThemeStore } from '../../src/store/themeStore';
import { getXPNeededForNextLevel } from '../../src/constants/xp';
import { saveHydrationLog } from '../../src/services/firebase/firestore';

export default function FocusSessionScreen() {
  const router = useRouter();
  const colors = useThemeStore((state) => state.getColors());
  const user = useAuthStore((state) => state.user);
  const addXP = useAuthStore((state) => state.addXP);

  const {
    mode,
    isRunning,
    timeLeft,
    focusDuration,
    subject,
    topic,
    startTimer,
    pauseTimer,
    resetTimer,
    completeCurrentStage,
    // Extra states from store
    showWaterReminder,
    focusSprintFinished,
    lastCompletedSprintStats,
    dismissWaterReminder,
    clearLastCompletedSprintStats,
  } = useFocusStore();

  const [quitModalVisible, setQuitModalVisible] = useState(false);

  // If the focus timer completes, or state moves away from 'focus', return to tabs index
  useEffect(() => {
    if (mode !== 'focus') {
      router.replace('/(tabs)' as any);
    }
  }, [mode]);

  // Disable physical back button on Android to prevent accidental exit
  useEffect(() => {
    const onBackPress = () => {
      if (mode === 'focus') {
        setQuitModalVisible(true);
      }
      return true; // prevent default
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [mode]);

  const handleQuitAlert = () => {
    setQuitModalVisible(true);
  };

  const handleConfirmQuit = () => {
    setQuitModalVisible(false);
    resetTimer();
    router.replace('/(tabs)' as any);
  };

  const handleDrinkWater = async () => {
    if (user) {
      await addXP(10); // Wellness XP (+10 XP)
      await saveHydrationLog(user.uid, 10);
    }
    dismissWaterReminder();
  };

  // SVGs Illustrations
  const renderSleepyCloudSVG = () => (
    <View style={styles.svgWrapper}>
      <Svg width={130} height={130} viewBox="0 0 120 120">
        <Defs>
          <LinearGradient id="cloudBgGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity={0.25} />
            <Stop offset="100%" stopColor={colors.primary} stopOpacity={0.03} />
          </LinearGradient>
        </Defs>
        <Circle cx={60} cy={60} r={46} fill="url(#cloudBgGrad)" />
        
        <Path
          d="M74 34 A 14 14 0 1 0 88 52 A 11 11 0 1 1 74 34"
          fill="#FFD54F"
          opacity={0.9}
        />

        <Path
          d="M36 68 C 36 59, 45 54, 52 57 C 55 48, 69 45, 77 51 C 83 49, 90 55, 90 62 C 90 70, 83 73, 77 73 L 36 73 C 29 73, 29 68, 36 68 Z"
          fill={colors.card}
          stroke={colors.primary}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        <Path
          d="M48 64 Q 51 67 54 64"
          fill="none"
          stroke={colors.textSecondary}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Path
          d="M66 64 Q 69 67 72 64"
          fill="none"
          stroke={colors.textSecondary}
          strokeWidth={2}
          strokeLinecap="round"
        />
        
        <Circle cx={44} cy={67} r={2.5} fill="#FF8A8A" opacity={0.6} />
        <Circle cx={76} cy={67} r={2.5} fill="#FF8A8A" opacity={0.6} />
      </Svg>
    </View>
  );

  const renderWaterDropletSVG = () => (
    <View style={styles.svgWrapper}>
      <Svg width={130} height={130} viewBox="0 0 120 120">
        <Defs>
          <LinearGradient id="waterBgGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#4DD0E1" stopOpacity={0.25} />
            <Stop offset="100%" stopColor="#4DD0E1" stopOpacity={0.03} />
          </LinearGradient>
        </Defs>
        <Circle cx={60} cy={60} r={46} fill="url(#waterBgGrad)" />
        
        <Path
          d="M60 25 C 60 25, 38 52, 38 68 C 38 80, 48 90, 60 90 C 72 90, 82 80, 82 68 C 82 52, 60 25, 60 25 Z"
          fill={colors.card}
          stroke="#4DD0E1"
          strokeWidth={3.5}
          strokeLinejoin="round"
        />
        
        <Circle cx={52} cy={66} r={2} fill="#263238" />
        <Circle cx={68} cy={66} r={2} fill="#263238" />
        <Path
          d="M56 73 Q 60 77 64 73"
          fill="none"
          stroke="#263238"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );

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
        <AvatarLayer
          avatar={user?.equippedAvatar || 'cat'}
          accessories={user?.equippedAccessories || []}
          size={120}
        />
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

      {/* 1. END FOCUS SESSION CONFIRMATION MODAL */}
      <Modal visible={quitModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {renderSleepyCloudSVG()}
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>End your focus session?</Text>
            <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
              You haven't completed this sprint yet. Ending it now means you won't earn XP, your study time won't be counted, and your streak progress for this sprint won't increase.
            </Text>
            <View style={styles.modalButtons}>
              <Button
                title="Continue Studying"
                onPress={() => setQuitModalVisible(false)}
                variant="primary"
                style={styles.modalActionBtn}
              />
              <Button
                title="End Anyway"
                onPress={handleConfirmQuit}
                variant="ghost"
                style={[styles.modalActionBtn, styles.dangerOutlineBtn]}
                textStyle={{ color: colors.error }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* 3. WATER SIP REMINDER MODAL */}
      <Modal visible={showWaterReminder} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {renderWaterDropletSVG()}
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>💧 Stay Hydrated</Text>
            <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
              Your brain works better when you're hydrated.
            </Text>
            <View style={styles.modalButtons}>
              <Button
                title="I Drank Water"
                onPress={handleDrinkWater}
                variant="primary"
                style={styles.modalActionBtn}
              />
              <Button
                title="Later"
                onPress={dismissWaterReminder}
                variant="ghost"
                style={styles.modalActionBtn}
                textStyle={{ color: colors.textSecondary }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  // Modal Overlays and Panels
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(25, 20, 35, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 30,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    shadowColor: 'rgba(142, 117, 200, 0.16)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  modalDescription: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButtons: {
    width: '100%',
    gap: 10,
  },
  modalActionBtn: {
    width: '100%',
  },
  dangerOutlineBtn: {
    borderColor: '#EF5350',
    borderWidth: 1.5,
  },
  // Sprint Complete Stats styles
  statsCardContainer: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: 'rgba(142, 117, 200, 0.05)',
    paddingVertical: 4,
    paddingHorizontal: 16,
    marginVertical: 14,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  // Level Progress
  levelProgressWrapper: {
    width: '100%',
    marginTop: 6,
    marginBottom: 18,
  },
  levelLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  levelLabelText: {
    fontSize: 13,
    fontWeight: '800',
  },
  xpProgressText: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarOuter: {
    height: 10,
    width: '100%',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarInner: {
    height: '100%',
    borderRadius: 5,
  },
});
