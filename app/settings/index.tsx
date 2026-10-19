import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, Brain, Clock, User } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Input } from '../../src/components/Input';
import { LumoraLogo } from '../../src/components/LumoraLogo';
import { useAuthStore } from '../../src/store/authStore';
import { useFocusStore } from '../../src/store/focusStore';
import { useThemeStore } from '../../src/store/themeStore';

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useThemeStore((state) => state.getColors());
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  // Stores states
  const {
    focusDuration,
    shortBreakDuration,
    longBreakDuration,
    sessionsBeforeLongBreak,
    autoStartFocus,
    autoStartShortBreak,
    autoStartLongBreak,
    autoStartQuiz,
    aiQuizEnabled,
    quizFrequency,
    waterReminderEnabled,
    waterReminderInterval,
    setSettings,
  } = useFocusStore();

  // Local notification toggles
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(true);

  // Custom Selector States
  const [isCustomQuiz, setIsCustomQuiz] = useState(![1, 2, 3, 5].includes(quizFrequency));
  const [customQuizFreq, setCustomQuizFreq] = useState(![1, 2, 3, 5].includes(quizFrequency) ? quizFrequency.toString() : '');

  const [isCustomWater, setIsCustomWater] = useState(![15, 20, 25, 30, 45, 60].includes(waterReminderInterval));
  const [customWaterInterval, setCustomWaterInterval] = useState(![15, 20, 25, 30, 45, 60].includes(waterReminderInterval) ? waterReminderInterval.toString() : '');

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login' as any);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account?',
      'This will permanently delete your study history, tasks, and achievements. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/register' as any);
          },
        },
      ]
    );
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)' as any);
    }
  };

  const renderSectionHeader = (title: string, Icon: any) => (
    <View style={styles.sectionHeader}>
      <Icon size={18} color={colors.primary} style={{ marginRight: 8 }} />
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with Back button */}
      <View style={styles.headerRow}>
        <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Settings</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* 1. Timer Preferences */}
      <View style={styles.section}>
        {renderSectionHeader('Timer Configuration', Clock)}
        <Card style={styles.settingsCard} bordered>
          <View style={styles.settingsRow}>
            <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Focus Duration</Text>
            <Text style={[styles.rowValue, { color: colors.primary }]}>{focusDuration} min</Text>
          </View>
          <View style={styles.settingsRow}>
            <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Short Break</Text>
            <Text style={[styles.rowValue, { color: colors.primary }]}>{shortBreakDuration} min</Text>
          </View>
          <View style={styles.settingsRow}>
            <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Long Break</Text>
            <Text style={[styles.rowValue, { color: colors.primary }]}>{longBreakDuration} min</Text>
          </View>
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            Change these parameters directly using the slider control icon on the Study page.
          </Text>
        </Card>
      </View>

      {/* 2. Notifications & Alerts */}
      <View style={styles.section}>
        {renderSectionHeader('Notifications & Reminders', Bell)}
        <Card style={styles.settingsCard} bordered>
          <View style={styles.settingsRow}>
            <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Sound Effects</Text>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={styles.settingsRow}>
            <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Vibration Feedback</Text>
            <Switch
              value={vibrationEnabled}
              onValueChange={setVibrationEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={styles.settingsRow}>
            <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Water Sip Reminders</Text>
            <Switch
              value={waterReminderEnabled}
              onValueChange={(val) => setSettings({ waterReminderEnabled: val })}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {waterReminderEnabled && (
            <View style={styles.settingsRowColumn}>
              <Text style={[styles.rowLabel, { color: colors.textPrimary, marginBottom: 8 }]}>Reminder Interval</Text>
              <View style={styles.chipRow}>
                {[15, 20, 25, 30, 45, 60].map((opt) => (
                  <Pressable
                    key={opt}
                    onPress={() => {
                      setIsCustomWater(false);
                      setSettings({ waterReminderInterval: opt });
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: !isCustomWater && waterReminderInterval === opt ? colors.primary : colors.progressBg,
                        borderColor: !isCustomWater && waterReminderInterval === opt ? colors.primary : colors.border,
                      }
                    ]}
                  >
                    <Text style={[styles.chipText, { color: !isCustomWater && waterReminderInterval === opt ? '#FFF' : colors.textPrimary }]}>
                      {opt}m
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => setIsCustomWater(true)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isCustomWater ? colors.primary : colors.progressBg,
                      borderColor: isCustomWater ? colors.primary : colors.border,
                    }
                  ]}
                >
                  <Text style={[styles.chipText, { color: isCustomWater ? '#FFF' : colors.textPrimary }]}>
                    Custom
                  </Text>
                </Pressable>
              </View>
              {isCustomWater && (
                <Input
                  label="Interval (minutes):"
                  placeholder="30"
                  value={customWaterInterval}
                  onChangeText={(text) => {
                    setCustomWaterInterval(text);
                    const val = parseInt(text, 10);
                    if (!isNaN(val) && val > 0) {
                      setSettings({ waterReminderInterval: val });
                    }
                  }}
                  keyboardType="numeric"
                  containerStyle={{ marginTop: 8 }}
                  inputStyle={{ paddingVertical: 8 }}
                />
              )}
            </View>
          )}

          <View style={styles.settingsRow}>
            <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Daily Goal Reminders</Text>
            <Switch
              value={dailyReminderEnabled}
              onValueChange={setDailyReminderEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>
      </View>

      {/* 3. AI Quiz Preferences */}
      <View style={styles.section}>
        {renderSectionHeader('AI Quiz', Brain)}
        <Card style={styles.settingsCard} bordered>
          <View style={styles.settingsRow}>
            <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Enable AI Quiz</Text>
            <Switch
              value={aiQuizEnabled}
              onValueChange={(val) => setSettings({ aiQuizEnabled: val })}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {aiQuizEnabled && (
            <View style={styles.settingsRowColumn}>
              <Text style={[styles.rowLabel, { color: colors.textPrimary, marginBottom: 8 }]}>Quiz Frequency</Text>
              <View style={styles.chipRow}>
                {[1, 2, 3, 5].map((opt) => (
                  <Pressable
                    key={opt}
                    onPress={() => {
                      setIsCustomQuiz(false);
                      setSettings({ quizFrequency: opt });
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: !isCustomQuiz && quizFrequency === opt ? colors.primary : colors.progressBg,
                        borderColor: !isCustomQuiz && quizFrequency === opt ? colors.primary : colors.border,
                      }
                    ]}
                  >
                    <Text style={[styles.chipText, { color: !isCustomQuiz && quizFrequency === opt ? '#FFF' : colors.textPrimary }]}>
                      Every {opt}
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => setIsCustomQuiz(true)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isCustomQuiz ? colors.primary : colors.progressBg,
                      borderColor: isCustomQuiz ? colors.primary : colors.border,
                    }
                  ]}
                >
                  <Text style={[styles.chipText, { color: isCustomQuiz ? '#FFF' : colors.textPrimary }]}>
                    Custom
                  </Text>
                </Pressable>
              </View>
              {isCustomQuiz && (
                <Input
                  label="Every (completed focus sessions):"
                  placeholder="3"
                  value={customQuizFreq}
                  onChangeText={(text) => {
                    setCustomQuizFreq(text);
                    const val = parseInt(text, 10);
                    if (!isNaN(val) && val > 0) {
                      setSettings({ quizFrequency: val });
                    }
                  }}
                  keyboardType="numeric"
                  containerStyle={{ marginTop: 8 }}
                  inputStyle={{ paddingVertical: 8 }}
                />
              )}
            </View>
          )}

          <View style={styles.settingsRow}>
            <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Auto-start Quiz</Text>
            <Switch
              value={autoStartQuiz}
              onValueChange={(val) => setSettings({ autoStartQuiz: val })}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={styles.settingsRow}>
            <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Default Question Count</Text>
            <Text style={[styles.rowValue, { color: colors.primary }]}>5 Questions</Text>
          </View>
          <View style={styles.settingsRow}>
            <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>AI Engine</Text>
            <Text style={[styles.rowValue, { color: colors.textSecondary }]}>Gemini 1.5 Flash</Text>
          </View>
        </Card>
      </View>

      {/* 4. Account Settings */}
      <View style={[styles.section, { marginBottom: 40 }]}>
        {renderSectionHeader('Account Actions', User)}
        <Card style={styles.settingsCard} bordered>
          <View style={styles.settingsRow}>
            <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Current Student</Text>
            <Text style={[styles.rowValue, { color: colors.textSecondary }]}>{user?.name}</Text>
          </View>
          <View style={styles.settingsRow}>
            <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Registered Email</Text>
            <Text style={[styles.rowValue, { color: colors.textSecondary }]} numberOfLines={1}>
              {user?.email}
            </Text>
          </View>

          <View style={styles.btnRow}>
            <Button
              title="Log Out"
              variant="secondary"
              onPress={handleLogout}
              style={styles.actionBtn}
            />
            <Button
              title="Delete Account"
              variant="danger"
              onPress={handleDeleteAccount}
              style={styles.actionBtn}
            />
          </View>
        </Card>
      </View>

      {/* 5. About Lumora Branding & Creator Footer */}
      <View style={[styles.section, styles.footerSection]}>
        <Card style={styles.footerCard} bordered>
          {/* Main Brand with Sparkle Logo & Wordmark */}
          <LumoraLogo size={40} showWordmark />

          {/* Cozy tagline */}
          <Text style={[styles.footerTagline, { color: colors.textSecondary }]}>
            A little space to focus and grow.
          </Text>

          {/* Subtle divider */}
          <View style={[styles.footerDivider, { backgroundColor: colors.border }]} />

          {/* Subtle personal creator credit */}
          <Text style={[styles.creatorCredit, { color: colors.textSecondary }]}>
            Crafted with <Text style={[styles.heartIcon, { color: colors.primary }]}>♡</Text> by Aarchi
          </Text>

          {/* Clean version number */}
          <Text style={[styles.versionText, { color: colors.textSecondary }]}>
            Version {Constants.expoConfig?.version || '1.0.0'}
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  settingsCard: {
    padding: 18,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F6F6F6',
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  helperText: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
  },
  settingsRowColumn: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F6F6F6',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  footerSection: {
    marginBottom: 36,
    alignItems: 'center',
  },
  footerCard: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  footerTagline: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
    letterSpacing: 0.15,
  },
  footerDivider: {
    width: 60,
    height: 1,
    marginVertical: 12,
    opacity: 0.65,
  },
  creatorCredit: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  heartIcon: {
    fontSize: 13,
    fontWeight: '400',
  },
  versionText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
    letterSpacing: 0.2,
    opacity: 0.65,
  },
});
