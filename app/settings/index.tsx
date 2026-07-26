import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, Alert, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../src/store/themeStore';
import { useAuthStore } from '../../src/store/authStore';
import { useFocusStore } from '../../src/store/focusStore';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { ArrowLeft, Clock, Brain, Bell, Palette, User, LogOut, Trash2 } from 'lucide-react-native';

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
    setSettings,
  } = useFocusStore();

  // Local notification toggles
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [waterReminderEnabled, setWaterReminderEnabled] = useState(true);
  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(true);

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
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
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
              onValueChange={setWaterReminderEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
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
        {renderSectionHeader('AI Review Mode', Brain)}
        <Card style={styles.settingsCard} bordered>
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
});
