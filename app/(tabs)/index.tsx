import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { ChevronRight, FileText, Flame, Plus, Sliders, Square, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Input } from '../../src/components/Input';
import { TimerCircle } from '../../src/components/TimerCircle';
import { AvatarLayer } from '../../src/components/avatars/AvatarLayer';
import { useAuthStore } from '../../src/store/authStore';
import { useFocusStore } from '../../src/store/focusStore';
import { useThemeStore } from '../../src/store/themeStore';

export default function HomeScreen() {
  const router = useRouter();
  const colors = useThemeStore((state) => state.getColors());
  const user = useAuthStore((state) => state.user);

  // Timer store fields and actions
  const {
    mode,
    isRunning,
    timeLeft,
    focusDuration,
    shortBreakDuration,
    longBreakDuration,
    sessionsBeforeLongBreak,
    completedSessionsToday,
    autoStartFocus,
    autoStartShortBreak,
    autoStartLongBreak,
    autoStartQuiz,
    subject,
    topic,
    notes,
    fileName,
    fileUri,
    startTimer,
    pauseTimer,
    resetTimer,
    tick,
    skipToNext,
    setSettings,
    setContext,
  } = useFocusStore();

  // Modals Visibility
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [contextVisible, setContextVisible] = useState(false);

  // Local Form state for Settings
  const [localFocus, setLocalFocus] = useState(focusDuration.toString());
  const [localShort, setLocalShort] = useState(shortBreakDuration.toString());
  const [localLong, setLocalLong] = useState(longBreakDuration.toString());
  const [localCount, setLocalCount] = useState(sessionsBeforeLongBreak.toString());
  const [localAutoFocus, setLocalAutoFocus] = useState(autoStartFocus);
  const [localAutoShort, setLocalAutoShort] = useState(autoStartShortBreak);
  const [localAutoLong, setLocalAutoLong] = useState(autoStartLongBreak);
  const [localAutoQuiz, setLocalAutoQuiz] = useState(autoStartQuiz);

  // Local Form state for Context
  const [localSubject, setLocalSubject] = useState(subject);
  const [localTopic, setLocalTopic] = useState(topic);
  const [localNotes, setLocalNotes] = useState(notes);
  const [localFileName, setLocalFileName] = useState(fileName);
  const [localFileUri, setLocalFileUri] = useState(fileUri);

  // Navigate to distraction-free focus screen when in Focus mode and running
  useEffect(() => {
    if (mode === 'focus' && isRunning) {
      router.push('/focus/session' as any);
    }
  }, [mode, isRunning]);

  // Route to Quiz screen when quiz is ready
  useEffect(() => {
    if (mode === 'quizReady') {
      router.push(`/quiz/session-${Math.random().toString(36).substr(2, 9)}` as any);
    }
  }, [mode]);

  // Get active session parameters
  const getActiveDuration = () => {
    if (mode === 'focus') return focusDuration * 60;
    if (mode === 'shortBreak') return shortBreakDuration * 60;
    return longBreakDuration * 60;
  };

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good Morning';
    if (hours < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Document Picking function
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setLocalFileName(file.name);
        setLocalFileUri(file.uri);
      }
    } catch (err) {
      console.log('Error picking document:', err);
    }
  };

  const handleRemoveDocument = () => {
    setLocalFileName(null);
    setLocalFileUri(null);
  };

  // Save Settings Modal Handler
  const handleSaveSettings = () => {
    const focusVal = parseInt(localFocus, 10);
    const shortVal = parseInt(localShort, 10);
    const longVal = parseInt(localLong, 10);
    const countVal = parseInt(localCount, 10);

    if (isNaN(focusVal) || isNaN(shortVal) || isNaN(longVal) || isNaN(countVal)) {
      Alert.alert('Invalid Settings', 'Please enter valid numbers.');
      return;
    }

    setSettings({
      focusDuration: focusVal,
      shortBreakDuration: shortVal,
      longBreakDuration: longVal,
      sessionsBeforeLongBreak: countVal,
      autoStartFocus: localAutoFocus,
      autoStartShortBreak: localAutoShort,
      autoStartLongBreak: localAutoLong,
      autoStartQuiz: localAutoQuiz,
    });
    setSettingsVisible(false);
  };

  // Save Study Context Handler
  const handleSaveContext = () => {
    setContext({
      subject: localSubject,
      topic: localTopic,
      notes: localNotes,
      fileName: localFileName,
      fileUri: localFileUri,
    });
    setContextVisible(false);
  };

  // Generate Today's Flow Elements (4 steps preview)
  const renderFlowStrip = () => {
    const flow = [
      { type: 'Focus', val: `${focusDuration}m` },
      { type: 'Break', val: `${shortBreakDuration}m` },
      { type: 'Focus', val: `${focusDuration}m` },
      { type: 'Quiz', val: 'AI Quiz' },
    ];

    return (
      <View style={styles.flowStrip}>
        {flow.map((item, index) => (
          <React.Fragment key={index}>
            <View style={[styles.flowChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Text style={[styles.flowChipText, { color: colors.primary }]}>{item.type}</Text>
              <Text style={[styles.flowChipVal, { color: colors.textSecondary }]}>{item.val}</Text>
            </View>
            {index < flow.length - 1 && (
              <ChevronRight size={16} color={colors.textSecondary + '70'} style={styles.flowArrow} />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Banner Row */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            {getGreeting()},
          </Text>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>
            {user?.name || 'Student'}
          </Text>
        </View>

        <View style={styles.headerStats}>
          {/* Streaks */}
          <View style={[styles.streakBadge, { backgroundColor: colors.secondary }]}>
            <Flame size={20} color="#FF7D4D" fill="#FF7D4D" />
            <Text style={[styles.streakText, { color: colors.textPrimary }]}>
              {user?.streak || 1}
            </Text>
          </View>

          {/* Settings icon */}
          <Pressable
            style={[styles.settingsButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              setLocalFocus(focusDuration.toString());
              setLocalShort(shortBreakDuration.toString());
              setLocalLong(longBreakDuration.toString());
              setLocalCount(sessionsBeforeLongBreak.toString());
              setLocalAutoFocus(autoStartFocus);
              setLocalAutoShort(autoStartShortBreak);
              setLocalAutoLong(autoStartLongBreak);
              setLocalAutoQuiz(autoStartQuiz);
              setSettingsVisible(true);
            }}
          >
            <Sliders size={20} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      {/* Goal Progress Bar */}


      {/* Central Timer & Avatar Section */}
      <View style={styles.timerSection}>
        <View style={styles.timerRow}>
          <AvatarLayer
            avatar={user?.equippedAvatar || 'cat'}
            accessories={user?.equippedAccessories || []}
            size={140}
          />
          <TimerCircle timeLeft={timeLeft} totalDuration={getActiveDuration()} mode={mode} />
        </View>

        {/* Controls */}
        <View style={styles.controlsRow}>
          {isRunning ? (
            <Button
              title="Pause"
              variant="secondary"
              onPress={pauseTimer}
              style={styles.controlBtn}
              textStyle={styles.controlBtnText}
            />
          ) : (
            <Button
              title="Start"
              onPress={startTimer}
              style={styles.controlBtn}
              textStyle={styles.controlBtnText}
            />
          )}

          <Button
            title="Skip"
            variant="ghost"
            onPress={skipToNext}
          />

          <Pressable
            onPress={resetTimer}
            style={[styles.resetIconButton, { borderColor: colors.border }]}
          >
            <Square size={16} color={colors.textSecondary} fill={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Study Context Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Active Subject</Text>
          <Pressable
            onPress={() => {
              setLocalSubject(subject);
              setLocalTopic(topic);
              setLocalNotes(notes);
              setLocalFileName(fileName);
              setLocalFileUri(fileUri);
              setContextVisible(true);
            }}
            style={styles.editContextLink}
          >
            <Plus size={16} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.editContextText, { color: colors.primary }]}>
              {subject ? 'Change' : 'Set Topic'}
            </Text>
          </Pressable>
        </View>

        <Card style={styles.contextCard}>
          {subject ? (
            <View>
              <Text style={[styles.contextSubject, { color: colors.textPrimary }]}>{subject}</Text>
              {topic ? (
                <Text style={[styles.contextTopic, { color: colors.textSecondary }]}>{topic}</Text>
              ) : null}
              {fileName ? (
                <View style={[styles.contextFileRow, { backgroundColor: colors.progressBg }]}>
                  <FileText size={16} color={colors.primary} />
                  <Text style={[styles.contextFileName, { color: colors.textSecondary }]} numberOfLines={1}>
                    {fileName}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.noContextContainer}>
              <Text style={[styles.noContextText, { color: colors.textSecondary }]}>
                No study topic set. Tap 'Set Topic' to link notes or files for AI Quizzes.
              </Text>
            </View>
          )}
        </Card>
      </View>



      {/* TIMER SETTINGS MODAL */}
      <Modal visible={settingsVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Timer Settings</Text>
              <Pressable onPress={() => setSettingsVisible(false)}>
                <X size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.inputsGrid}>
                <Input
                  label="Focus Duration (min)"
                  value={localFocus}
                  onChangeText={setLocalFocus}
                  keyboardType="numeric"
                  containerStyle={{ width: '48%' }}
                />
                <Input
                  label="Short Break (min)"
                  value={localShort}
                  onChangeText={setLocalShort}
                  keyboardType="numeric"
                  containerStyle={{ width: '48%' }}
                />
                <Input
                  label="Long Break (min)"
                  value={localLong}
                  onChangeText={setLocalLong}
                  keyboardType="numeric"
                  containerStyle={{ width: '48%' }}
                />
                <Input
                  label="Sessions before Long Break"
                  value={localCount}
                  onChangeText={setLocalCount}
                  keyboardType="numeric"
                  containerStyle={{ width: '48%' }}
                />
              </View>

              {/* Toggles */}
              <Text style={[styles.sectionSubTitle, { color: colors.textPrimary, marginTop: 12 }]}>
                Auto-Start Preferences
              </Text>
              <View style={styles.toggleRow}>
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Auto-Start Focus</Text>
                <Pressable
                  onPress={() => setLocalAutoFocus(!localAutoFocus)}
                  style={[
                    styles.toggleSwitch,
                    {
                      backgroundColor: localAutoFocus ? colors.primary : colors.border,
                      alignItems: localAutoFocus ? 'flex-end' : 'flex-start',
                    },
                  ]}
                >
                  <View style={styles.toggleKnob} />
                </Pressable>
              </View>
              <View style={styles.toggleRow}>
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Auto-Start Short Break</Text>
                <Pressable
                  onPress={() => setLocalAutoShort(!localAutoShort)}
                  style={[
                    styles.toggleSwitch,
                    {
                      backgroundColor: localAutoShort ? colors.primary : colors.border,
                      alignItems: localAutoShort ? 'flex-end' : 'flex-start',
                    },
                  ]}
                >
                  <View style={styles.toggleKnob} />
                </Pressable>
              </View>
              <View style={styles.toggleRow}>
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Auto-Start Long Break</Text>
                <Pressable
                  onPress={() => setLocalAutoLong(!localAutoLong)}
                  style={[
                    styles.toggleSwitch,
                    {
                      backgroundColor: localAutoLong ? colors.primary : colors.border,
                      alignItems: localAutoLong ? 'flex-end' : 'flex-start',
                    },
                  ]}
                >
                  <View style={styles.toggleKnob} />
                </Pressable>
              </View>
              <View style={styles.toggleRow}>
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Auto-Start AI Quiz</Text>
                <Pressable
                  onPress={() => setLocalAutoQuiz(!localAutoQuiz)}
                  style={[
                    styles.toggleSwitch,
                    {
                      backgroundColor: localAutoQuiz ? colors.primary : colors.border,
                      alignItems: localAutoQuiz ? 'flex-end' : 'flex-start',
                    },
                  ]}
                >
                  <View style={styles.toggleKnob} />
                </Pressable>
              </View>

              <Button title="Save Configurations" onPress={handleSaveSettings} style={{ marginTop: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* STUDY CONTEXT MODAL */}
      <Modal visible={contextVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Define Study Subject</Text>
              <Pressable onPress={() => setContextVisible(false)}>
                <X size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <Input
                label="Subject / Course"
                placeholder="Operating Systems"
                value={localSubject}
                onChangeText={setLocalSubject}
              />
              <Input
                label="Topic Name"
                placeholder="Deadlocks & Semaphores"
                value={localTopic}
                onChangeText={setLocalTopic}
              />
              <Input
                label="Self-Study Notes (Optional)"
                placeholder="Write summaries or paste details here..."
                value={localNotes}
                onChangeText={setLocalNotes}
                multiline
                numberOfLines={3}
                inputStyle={{ height: 80, textAlignVertical: 'top', paddingTop: 10 }}
              />

              {/* PDF Document Upload */}
              <Text style={[styles.sectionSubTitle, { color: colors.textPrimary, marginBottom: 8 }]}>
                PDF Material (Optional)
              </Text>

              {localFileName ? (
                <View style={[styles.fileUploadedCard, { backgroundColor: colors.progressBg, borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <FileText size={22} color={colors.primary} style={{ marginRight: 10 }} />
                    <Text style={{ color: colors.textPrimary, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                      {localFileName}
                    </Text>
                  </View>
                  <Pressable onPress={handleRemoveDocument}>
                    <Trash2 size={20} color={colors.error} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={handlePickDocument}
                  style={[styles.fileUploadBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                >
                  <FileText size={24} color={colors.primary} style={{ marginBottom: 6 }} />
                  <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 13 }}>
                    Upload Study PDF
                  </Text>
                </Pressable>
              )}

              <Button title="Apply Topic" onPress={handleSaveContext} style={{ marginTop: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '600',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    gap: 6,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '800',
  },
  settingsButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalCard: {
    marginBottom: 24,
    padding: 16,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  goalProgress: {
    fontSize: 14,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 10,
    borderRadius: 5,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  timerSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  controlBtn: {
    width: 130,
  },
  controlBtnText: {
    fontSize: 16,
    fontWeight: '800',
  },

  resetIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 4,
  },
  editContextLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  editContextText: {
    fontSize: 14,
    fontWeight: '800',
  },
  contextCard: {
    padding: 18,
  },
  contextSubject: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  contextTopic: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  contextFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    gap: 6,
  },
  contextFileName: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  noContextContainer: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  noContextText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  flowStrip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flowChip: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  flowChipText: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  flowChipVal: {
    fontSize: 10,
    fontWeight: '700',
  },
  flowArrow: {
    marginHorizontal: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalScroll: {
    paddingBottom: 20,
  },
  inputsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 4,
  },
  sectionSubTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
    marginLeft: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  toggleSwitch: {
    width: 48,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 3,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    elevation: 2,
  },
  fileUploadBtn: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 18,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileUploadedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 2,
  },
});
