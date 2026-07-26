import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../src/store/themeStore';
import { useAuthStore } from '../../src/store/authStore';
import { getFocusSessions } from '../../src/services/firebase/firestore';
import { AvatarLayer, AvatarType, AccessoryType } from '../../src/components/avatars/AvatarLayer';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { ThemeName, themePalettes } from '../../src/theme/colors';
import { getXPNeededForNextLevel } from '../../src/constants/xp';
import { FocusSession } from '../../src/types';
import { Sparkles, Calendar, Award, Palette, Shirt, Sliders, LogOut, Sun, Moon, Laptop, Lock, Settings } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';


export default function ProfileScreen() {
  const colors = useThemeStore((state) => state.getColors());
  const router = useRouter();
  
  // Auth Store
  const { user, logout, equipAvatar, equipAccessories, loading: authLoading } = useAuthStore();
  
  // Theme Store
  const { themeName, themeMode, setThemeName, setThemeMode, unlockedThemes } = useThemeStore();

  // States
  const [history, setHistory] = useState<FocusSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeDressingTab, setActiveDressingTab] = useState<'avatar' | 'accessory'>('avatar');

  // Load history log
  useEffect(() => {
    let active = true;
    const fetchHistory = async () => {
      if (!user) return;
      try {
        setLoadingHistory(true);
        const fetched = await getFocusSessions(user.uid);
        if (active) {
          setHistory(fetched);
        }
      } catch (err) {
        console.log('Error loading history:', err);
      } finally {
        if (active) setLoadingHistory(false);
      }
    };
    fetchHistory();
    return () => {
      active = false;
    };
  }, [user]);

  if (!user) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Level XP maths
  const xpNeeded = getXPNeededForNextLevel(user.level);
  const xpPercentage = Math.min(100, (user.xp / xpNeeded) * 100);

  // Milestone lists to render items with locks
  const avatarMilestones: { id: AvatarType; name: string; level: number }[] = [
    { id: 'cat', name: 'Cat base', level: 1 },
    { id: 'rabbit', name: 'Rabbit base', level: 1 },
    { id: 'fox', name: 'Fox base', level: 2 },
    { id: 'panda', name: 'Panda base', level: 4 },
    { id: 'penguin', name: 'Penguin base', level: 6 },
    { id: 'sloth', name: 'Sloth base', level: 8 },
  ];

  const accessoryMilestones: { id: AccessoryType; name: string; level: number }[] = [
    { id: 'glasses', name: 'Glasses', level: 1 },
    { id: 'headphones', name: 'Headphones', level: 2 },
    { id: 'flower', name: 'Flower pin', level: 3 },
    { id: 'coffee', name: 'Coffee mug', level: 5 },
    { id: 'scarf', name: 'Warm Scarf', level: 7 },
    { id: 'books', name: 'Study Books', level: 9 },
  ];

  const handleToggleAccessory = (accId: AccessoryType) => {
    const equipped = user.equippedAccessories || [];
    if (equipped.includes(accId)) {
      equipAccessories(equipped.filter((a) => a !== accId));
    } else {
      equipAccessories([...equipped, accId]);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login' as any);
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Greeting */}
      <View style={styles.headerBar}>
        <View style={styles.headerTitleContainer}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Student Profile</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Manage avatars, cosmetic themes, and history
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/settings' as any)}
            style={[styles.settingsButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Settings size={20} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      {/* User Card */}
      <Card style={styles.userCard} bordered>
        <View style={styles.userRow}>
          <View style={[styles.avatarBox, { backgroundColor: colors.progressBg }]}>
            <AvatarLayer
              avatar={user.equippedAvatar}
              accessories={user.equippedAccessories}
              size={110}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>{user.name}</Text>
            <Text style={[styles.userJoined, { color: colors.textSecondary }]}>
              Joined: {user.joinedDate}
            </Text>

            {/* Level details */}
            <View style={styles.levelRow}>
              <Award size={18} color={colors.primary} />
              <Text style={[styles.levelText, { color: colors.primary }]}>
                Level {user.level} Scholar
              </Text>
            </View>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.xpProgressContainer}>
          <View style={styles.xpLabelRow}>
            <Text style={[styles.xpText, { color: colors.textSecondary }]}>Level Progress</Text>
            <Text style={[styles.xpText, { color: colors.primary, fontWeight: '700' }]}>
              {user.xp} / {xpNeeded} XP
            </Text>
          </View>
          <View style={[styles.progressBarBg, { backgroundColor: colors.progressBg }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: colors.primary,
                  width: `${xpPercentage}%`,
                },
              ]}
            />
          </View>
        </View>
      </Card>

      {/* Avatar Dressing room */}
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Avatar Dressing Room</Text>
        <Card style={styles.dressingCard} bordered>
          {/* Sub tabs */}
          <View style={[styles.dressingTabs, { backgroundColor: colors.progressBg }]}>
            <Pressable
              onPress={() => setActiveDressingTab('avatar')}
              style={[
                styles.dressingTab,
                {
                  backgroundColor: activeDressingTab === 'avatar' ? colors.card : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.dressingTabText,
                  {
                    color: activeDressingTab === 'avatar' ? colors.primary : colors.textSecondary,
                    fontWeight: activeDressingTab === 'avatar' ? '800' : '600',
                  },
                ]}
              >
                Base Animals
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveDressingTab('accessory')}
              style={[
                styles.dressingTab,
                {
                  backgroundColor: activeDressingTab === 'accessory' ? colors.card : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.dressingTabText,
                  {
                    color: activeDressingTab === 'accessory' ? colors.primary : colors.textSecondary,
                    fontWeight: activeDressingTab === 'accessory' ? '800' : '600',
                  },
                ]}
              >
                Accessories
              </Text>
            </Pressable>
          </View>

          {/* Grid Selection */}
          <View style={styles.dressingGrid}>
            {activeDressingTab === 'avatar' ? (
              avatarMilestones.map((item) => {
                const isUnlocked = user.level >= item.level;
                const isEquipped = user.equippedAvatar === item.id;

                return (
                  <Pressable
                    key={item.id}
                    onPress={() => isUnlocked && equipAvatar(item.id)}
                    style={[
                      styles.dressingChip,
                      {
                        borderColor: isEquipped
                          ? colors.primary
                          : isUnlocked
                          ? colors.border
                          : colors.border + '50',
                        backgroundColor: isEquipped ? colors.secondary : colors.card,
                        opacity: isUnlocked ? 1 : 0.6,
                      },
                    ]}
                    disabled={!isUnlocked}
                  >
                    {!isUnlocked && (
                      <Lock size={12} color={colors.textSecondary} style={styles.lockIcon} />
                    )}
                    <Text
                      style={[
                        styles.dressingChipText,
                        {
                          color: isEquipped ? colors.primary : colors.textSecondary,
                          fontWeight: isEquipped ? '700' : '500',
                        },
                      ]}
                    >
                      {item.name}
                    </Text>
                    {!isUnlocked && (
                      <Text style={styles.lockLabel}>Lvl {item.level}</Text>
                    )}
                  </Pressable>
                );
              })
            ) : (
              accessoryMilestones.map((item) => {
                const isUnlocked = user.level >= item.level;
                const isEquipped = (user.equippedAccessories || []).includes(item.id);

                return (
                  <Pressable
                    key={item.id}
                    onPress={() => isUnlocked && handleToggleAccessory(item.id)}
                    style={[
                      styles.dressingChip,
                      {
                        borderColor: isEquipped
                          ? colors.primary
                          : isUnlocked
                          ? colors.border
                          : colors.border + '50',
                        backgroundColor: isEquipped ? colors.secondary : colors.card,
                        opacity: isUnlocked ? 1 : 0.6,
                      },
                    ]}
                    disabled={!isUnlocked}
                  >
                    {!isUnlocked && (
                      <Lock size={12} color={colors.textSecondary} style={styles.lockIcon} />
                    )}
                    <Text
                      style={[
                        styles.dressingChipText,
                        {
                          color: isEquipped ? colors.primary : colors.textSecondary,
                          fontWeight: isEquipped ? '700' : '500',
                        },
                      ]}
                    >
                      {item.name}
                    </Text>
                    {!isUnlocked && (
                      <Text style={styles.lockLabel}>Lvl {item.level}</Text>
                    )}
                  </Pressable>
                );
              })
            )}
          </View>
        </Card>
      </View>

      {/* Theme picker */}
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Appearance settings</Text>
        <Card style={styles.themeCard} bordered>
          {/* Mode selector */}
          <Text style={[styles.themeSubLabel, { color: colors.textPrimary }]}>Theme Mode</Text>
          <View style={[styles.modeRow, { backgroundColor: colors.progressBg }]}>
            {(['light', 'dark', 'system'] as const).map((mode) => {
              const isSelected = themeMode === mode;
              const Icon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Laptop;

              return (
                <Pressable
                  key={mode}
                  onPress={() => setThemeMode(mode)}
                  style={[
                    styles.modeBtn,
                    {
                      backgroundColor: isSelected ? colors.card : 'transparent',
                    },
                  ]}
                >
                  <Icon size={16} color={isSelected ? colors.primary : colors.textSecondary} />
                  <Text
                    style={[
                      styles.modeBtnText,
                      {
                        color: isSelected ? colors.primary : colors.textSecondary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {mode.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Accent palettes color chips */}
          <Text style={[styles.themeSubLabel, { color: colors.textPrimary, marginTop: 20 }]}>
            Accent Theme
          </Text>
          <View style={styles.accentGrid}>
            {Object.entries(themePalettes).map(([paletteId, meta]) => {
              const name = paletteId as ThemeName;
              const isSelected = themeName === name;
              const isUnlocked = unlockedThemes.includes(name);

              const previewColors = meta.light;

              return (
                <Pressable
                  key={name}
                  onPress={() => isUnlocked && setThemeName(name)}
                  style={[
                    styles.accentChip,
                    {
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderWidth: isSelected ? 3 : 1.5,
                      opacity: isUnlocked ? 1 : 0.45,
                    },
                  ]}
                  disabled={!isUnlocked}
                >
                  <View style={[styles.accentColorDot, { backgroundColor: previewColors.primary }]}>
                    {!isUnlocked && <Lock size={12} color="#FFF" />}
                  </View>
                  <Text style={[styles.accentLabel, { color: colors.textPrimary, fontWeight: isSelected ? '700' : '500' }]}>
                    {meta.displayName}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>
      </View>

      {/* Focus log history */}
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Study Log History</Text>
        <Card style={styles.historyCard} bordered>
          {loadingHistory ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 14 }} />
          ) : history.length === 0 ? (
            <Text style={[styles.noHistoryText, { color: colors.textSecondary }]}>
              You haven't completed any focus sessions yet. Start studying from the home page!
            </Text>
          ) : (
            <View style={styles.historyList}>
              {history.slice(0, 10).map((session) => {
                return (
                  <View key={session.id} style={styles.historyItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.historySubject, { color: colors.textPrimary }]}>
                        {session.subject}
                      </Text>
                      <Text style={[styles.historyTopic, { color: colors.textSecondary }]}>
                        {session.topic}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.historyTime, { color: colors.primary }]}>
                        {session.duration} mins
                      </Text>
                      <Text style={[styles.historyDate, { color: colors.textSecondary + 'B0' }]}>
                        {format(parseISO(session.timestamp), 'MMM dd, h:mm a')}
                      </Text>
                    </View>
                  </View>
                );
              })}
              {history.length > 10 && (
                <Text style={[styles.moreLogsText, { color: colors.textSecondary }]}>
                  Showing last 10 completed focus sessions.
                </Text>
              )}
            </View>
          )}
        </Card>
      </View>

      {/* Logout button */}
      <Button
        title="Log Out"
        variant="danger"
        onPress={handleLogout}
        style={[styles.logoutBtn, { marginBottom: 110 }]}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 40,
  },
  headerBar: {
    marginBottom: 24,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  userCard: {
    padding: 20,
    marginBottom: 24,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  avatarBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  userJoined: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  levelText: {
    fontSize: 13,
    fontWeight: '800',
  },
  xpProgressContainer: {
    marginTop: 20,
  },
  xpLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  xpText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
    marginLeft: 4,
  },
  dressingCard: {
    padding: 16,
  },
  dressingTabs: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  dressingTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dressingTabText: {
    fontSize: 13,
  },
  dressingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dressingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 2,
    gap: 6,
  },
  dressingChipText: {
    fontSize: 13,
  },
  lockIcon: {
    marginRight: 2,
  },
  lockLabel: {
    fontSize: 9,
    fontWeight: '800',
    backgroundColor: '#E0E0E0',
    color: '#666',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 2,
  },
  themeCard: {
    padding: 16,
  },
  themeSubLabel: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
    marginLeft: 4,
  },
  modeRow: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeBtnText: {
    fontSize: 12,
  },
  accentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  accentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 8,
  },
  accentColorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accentLabel: {
    fontSize: 13,
  },
  historyCard: {
    padding: 16,
  },
  noHistoryText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
    paddingVertical: 20,
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F6F6F6',
  },
  historySubject: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  historyTopic: {
    fontSize: 12,
    fontWeight: '600',
  },
  historyTime: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 11,
    fontWeight: '700',
  },
  moreLogsText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
  logoutBtn: {
    width: '100%',
    marginTop: 10,
  },
});
