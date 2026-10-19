import { format } from 'date-fns';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { Brain, Check, ChevronRight, FileText, Flame, Plus, Sliders, Square, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Input } from '../../src/components/Input';
import { SubjectSelector } from '../../src/components/SubjectSelector';
import { TimerCircle } from '../../src/components/TimerCircle';
import { AvatarLayer } from '../../src/components/avatars/AvatarLayer';
import { getFocusSessions, updateFocusSessionDifficulty } from '../../src/services/firebase/firestore';
import { useAuthStore } from '../../src/store/authStore';
import { useFocusStore } from '../../src/store/focusStore';
import { usePlannerStore } from '../../src/store/plannerStore';
import { useThemeStore } from '../../src/store/themeStore';
import { FocusSession } from '../../src/types';

const getStudyStreakDays = (sessions: FocusSession[]) => {
  const today = new Date();
  const past7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    past7Days.push(d);
  }

  const studyDates = new Set(
    sessions.map(s => s.timestamp.split('T')[0])
  );

  return past7Days.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return {
      date,
      dateStr,
      hasStudied: studyDates.has(dateStr),
      dayLabel: format(date, 'EEE'),
      dayNum: format(date, 'd'),
    };
  });
};

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
    completedSessionsTotal,
    autoStartFocus,
    autoStartShortBreak,
    autoStartLongBreak,
    autoStartQuiz,
    subject,
    topic,
    notes,
    fileName,
    fileUri,
    activeTaskId,
    lastCompletedSprintStats,
    startTimer,
    pauseTimer,
    resetTimer,
    tick,
    skipToNext,
    setSettings,
    setContext,
    clearLastCompletedSprintStats,
  } = useFocusStore();

  // Stores
  const { tasks, loadTasks, addTask } = usePlannerStore();

  // Modals Visibility
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [contextVisible, setContextVisible] = useState(false);
  const [difficultyModalVisible, setDifficultyModalVisible] = useState(false);

  // Local Form state for Settings
  const [localFocus, setLocalFocus] = useState(focusDuration.toString());
  const [localShort, setLocalShort] = useState(shortBreakDuration.toString());
  const [localLong, setLocalLong] = useState(longBreakDuration.toString());
  const [localCount, setLocalCount] = useState(sessionsBeforeLongBreak.toString());
  const [localAutoFocus, setLocalAutoFocus] = useState(autoStartFocus);
  const [localAutoShort, setLocalAutoShort] = useState(autoStartShortBreak);
  const [localAutoLong, setLocalAutoLong] = useState(autoStartLongBreak);
  const [localAutoQuiz, setLocalAutoQuiz] = useState(autoStartQuiz);

  // Local state for Context select / create task
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [taskSubject, setTaskSubject] = useState('');
  const [taskTopic, setTaskTopic] = useState('');
  const [taskSessions, setTaskSessions] = useState('2');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [taskNotes, setTaskNotes] = useState('');

  // Local Form state for Context (used for document picking fallback)
  const [localSubject, setLocalSubject] = useState(subject);
  const [localTopic, setLocalTopic] = useState(topic);
  const [localNotes, setLocalNotes] = useState(notes);
  const [localFileName, setLocalFileName] = useState(fileName);
  const [localFileUri, setLocalFileUri] = useState(fileUri);

  // Load tasks on mount or when user changes
  useEffect(() => {
    if (user) {
      loadTasks(user.uid);
    }
  }, [user]);

  // Load completed focus sessions to render streak indicators
  useEffect(() => {
    if (user) {
      getFocusSessions(user.uid).then(setSessions).catch(console.error);
    }
  }, [user, completedSessionsTotal]);

  // Sync settings local state when store updates
  useEffect(() => {
    setLocalFocus(focusDuration.toString());
    setLocalShort(shortBreakDuration.toString());
    setLocalLong(longBreakDuration.toString());
    setLocalCount(sessionsBeforeLongBreak.toString());
    setLocalAutoFocus(autoStartFocus);
    setLocalAutoShort(autoStartShortBreak);
    setLocalAutoLong(autoStartLongBreak);
    setLocalAutoQuiz(autoStartQuiz);
  }, [focusDuration, shortBreakDuration, longBreakDuration, sessionsBeforeLongBreak, autoStartFocus, autoStartShortBreak, autoStartLongBreak, autoStartQuiz]);

  // Sync post-session difficulty feedback visibility
  useEffect(() => {
    if (lastCompletedSprintStats) {
      setDifficultyModalVisible(true);
    } else {
      setDifficultyModalVisible(false);
    }
  }, [lastCompletedSprintStats]);

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

      {/* Daily Progress & Streak Indicators */}
      <View style={{ marginBottom: 24 }}>
        <Card style={{ padding: 18, marginBottom: 16 }} bordered>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Flame size={20} color={colors.primary} />
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>Daily Focus Target</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primary }}>
              {completedSessionsToday * focusDuration} / 100 mins
            </Text>
          </View>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.progressBg, overflow: 'hidden', marginBottom: 10 }}>
            <View style={{ height: '100%', borderRadius: 5, backgroundColor: colors.primary, width: `${Math.min(100, ((completedSessionsToday * focusDuration) / 100) * 100)}%` }} />
          </View>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>
            {completedSessionsToday * focusDuration >= 100
              ? "🎉 You've reached today's target! Amazing work!"
              : `Focus for ${100 - completedSessionsToday * focusDuration} more minutes to hit your goal.`}
          </Text>
        </Card>

        {/* 7-day Streak Calendar Indicators */}

      </View>


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
      <View>
        <Card style={{ padding: 16 }} bordered>
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textPrimary, marginBottom: 12, marginLeft: 2 }}>
            Weekly Activity Streak
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {getStudyStreakDays(sessions).map((day) => (
              <View key={day.dateStr} style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>
                  {day.dayLabel}
                </Text>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: day.hasStudied ? colors.primary : colors.border,
                    backgroundColor: day.hasStudied ? colors.secondary : colors.card,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {day.hasStudied ? (
                    <Check size={14} color={colors.primary} strokeWidth={3} />
                  ) : (
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
                      {day.dayNum}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </Card>
      </View>
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Active Subject</Text>
          <Pressable
            onPress={() => {
              setTaskSubject('');
              setTaskTopic('');
              setTaskSessions('2');
              setTaskPriority('medium');
              setTaskNotes('');
              setIsCreatingTask(false);
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
              {activeTaskId ? (
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary, marginTop: 4, marginBottom: 8 }}>
                  Linked to Planner Task
                </Text>
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
                No study topic set. Tap 'Set Topic' to select a task or define one.
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
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {isCreatingTask ? 'Create Study Target' : 'Select Study Target'}
              </Text>
              <Pressable onPress={() => {
                setContextVisible(false);
                setIsCreatingTask(false);
              }}>
                <X size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
              {!isCreatingTask ? (
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 12 }}>
                    Select an active task from your planner:
                  </Text>
                  {tasks.filter(t => !t.completed).length === 0 ? (
                    <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                      <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 16 }}>
                        No active tasks scheduled in your planner.
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 10, marginBottom: 20 }}>
                      {tasks.filter(t => !t.completed).map((task) => (
                        <Pressable
                          key={task.id}
                          onPress={() => {
                            setContext({
                              subject: task.subject,
                              topic: task.topic,
                              notes: task.notes || '',
                              fileUri: null,
                              fileName: null,
                              activeTaskId: task.id,
                            });
                            setContextVisible(false);
                          }}
                          style={{
                            padding: 14,
                            borderRadius: 16,
                            borderWidth: 1.5,
                            borderColor: activeTaskId === task.id ? colors.primary : colors.border,
                            backgroundColor: activeTaskId === task.id ? colors.secondary : colors.card,
                          }}
                        >
                          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }}>
                            {task.subject}
                          </Text>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 2 }}>
                            {task.topic}
                          </Text>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary, marginTop: 6 }}>
                            Cycles: {task.actualSessions}/{task.estimatedSessions}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  <Button
                    title="Or Create a New Target"
                    onPress={() => setIsCreatingTask(true)}
                    variant="secondary"
                  />
                </View>
              ) : (
                <View>
                  <SubjectSelector
                    value={taskSubject}
                    onChange={(subj) => {
                      setTaskSubject(subj);
                      setTaskTopic('');
                    }}
                  />

                  <View style={{ marginBottom: 16 }}>
                    <Input
                      label="Topic Name"
                      placeholder="E.g., Banker's Algorithm"
                      value={taskTopic}
                      onChangeText={setTaskTopic}
                    />
                    {Array.from(new Set(tasks.filter((t) => t.subject === taskSubject).map((t) => t.topic).filter(Boolean))).length > 0 && (
                      <View style={{ marginTop: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>
                          Or select an existing topic:
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', gap: 6, paddingBottom: 4 }}>
                          {Array.from(new Set(tasks.filter((t) => t.subject === taskSubject).map((t) => t.topic).filter(Boolean))).map((top) => (
                            <Pressable
                              key={top}
                              onPress={() => setTaskTopic(top)}
                              style={{
                                paddingVertical: 6,
                                paddingHorizontal: 12,
                                borderRadius: 14,
                                borderWidth: 1.5,
                                borderColor: taskTopic === top ? colors.primary : colors.border,
                                backgroundColor: taskTopic === top ? colors.secondary : colors.card,
                                marginRight: 6,
                              }}
                            >
                              <Text style={{ color: taskTopic === top ? colors.primary : colors.textPrimary, fontWeight: '700', fontSize: 11 }}>
                                {top}
                              </Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  <Input
                    label="Estimated Focus Cycles"
                    placeholder="2"
                    keyboardType="numeric"
                    value={taskSessions}
                    onChangeText={setTaskSessions}
                  />

                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 }}>
                      Priority Level
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {(['low', 'medium', 'high'] as const).map((p) => {
                        const isSelected = taskPriority === p;
                        let pColor = colors.success;
                        if (p === 'medium') pColor = colors.warning;
                        if (p === 'high') pColor = colors.error;

                        return (
                          <Pressable
                            key={p}
                            onPress={() => setTaskPriority(p)}
                            style={{
                              flex: 1,
                              paddingVertical: 10,
                              alignItems: 'center',
                              borderRadius: 14,
                              borderWidth: 1.5,
                              borderColor: isSelected ? pColor : colors.border,
                              backgroundColor: isSelected ? pColor + '15' : colors.card,
                            }}
                          >
                            <Text style={{ color: isSelected ? pColor : colors.textSecondary, fontWeight: '700', fontSize: 13 }}>
                              {p.toUpperCase()}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <Input
                    label="Self-Study Notes (Optional)"
                    placeholder="Write summaries or paste details here..."
                    value={taskNotes}
                    onChangeText={setTaskNotes}
                    multiline
                    numberOfLines={3}
                    inputStyle={{ height: 80, textAlignVertical: 'top', paddingTop: 10 }}
                  />

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                    <Button
                      title="Back to List"
                      onPress={() => setIsCreatingTask(false)}
                      variant="secondary"
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="Apply Target"
                      onPress={async () => {
                        if (!taskSubject.trim() || !taskTopic.trim()) {
                          Alert.alert('Missing Fields', 'Please enter subject and topic.');
                          return;
                        }
                        const newTaskId = 'task-' + Math.random().toString(36).substr(2, 9);
                        if (user) {
                          await addTask({
                            id: newTaskId,
                            userId: user.uid,
                            subject: taskSubject,
                            topic: taskTopic,
                            estimatedSessions: parseInt(taskSessions, 10) || 2,
                            priority: taskPriority,
                            deadline: format(new Date(), 'yyyy-MM-dd'),
                            notes: taskNotes,
                            completed: false,
                          });
                        }
                        setContext({
                          subject: taskSubject,
                          topic: taskTopic,
                          notes: taskNotes,
                          activeTaskId: newTaskId,
                        });
                        setContextVisible(false);
                        setIsCreatingTask(false);
                      }}
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* POST-SESSION DIFFICULTY FEEDBACK MODAL */}
      <Modal visible={difficultyModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderTopLeftRadius: 30, borderTopRightRadius: 30 }]}>
            <View style={{ alignItems: 'center', width: '100%', paddingVertical: 10 }}>
              <Brain size={48} color={colors.primary} style={{ marginBottom: 12 }} />
              <Text style={[styles.modalTitle, { color: colors.textPrimary, textAlign: 'center', marginBottom: 6 }]}>
                Focus Session Complete! 🎉
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, textAlign: 'center', marginBottom: 20, paddingHorizontal: 16 }}>
                You studied for {lastCompletedSprintStats?.duration} minutes and earned {lastCompletedSprintStats?.xpEarned} XP! How was the difficulty of this topic?
              </Text>

              <View style={{ width: '100%', gap: 10, paddingHorizontal: 10 }}>
                <Button
                  title="Easy 😊"
                  onPress={async () => {
                    if (user && lastCompletedSprintStats?.sessionId) {
                      await updateFocusSessionDifficulty(user.uid, lastCompletedSprintStats.sessionId, 'easy');
                    }
                    clearLastCompletedSprintStats();
                  }}
                  style={{ backgroundColor: colors.success }}
                />
                <Button
                  title="Medium 😐"
                  onPress={async () => {
                    if (user && lastCompletedSprintStats?.sessionId) {
                      await updateFocusSessionDifficulty(user.uid, lastCompletedSprintStats.sessionId, 'medium');
                    }
                    clearLastCompletedSprintStats();
                  }}
                  style={{ backgroundColor: colors.warning }}
                />
                <Button
                  title="Hard 😫"
                  onPress={async () => {
                    if (user && lastCompletedSprintStats?.sessionId) {
                      await updateFocusSessionDifficulty(user.uid, lastCompletedSprintStats.sessionId, 'hard');
                    }
                    clearLastCompletedSprintStats();
                  }}
                  style={{ backgroundColor: colors.error }}
                />
              </View>
            </View>
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
