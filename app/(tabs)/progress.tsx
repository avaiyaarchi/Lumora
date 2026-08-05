import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, ActivityIndicator } from 'react-native';
import Svg, { Rect, G, Text as SvgText } from 'react-native-svg';
import { useThemeStore } from '../../src/store/themeStore';
import { useAuthStore } from '../../src/store/authStore';
import { getFocusSessions, getQuizzes } from '../../src/services/firebase/firestore';
import { FocusSession, Quiz, Achievement } from '../../src/types';
import { Card } from '../../src/components/Card';
import { Flame, Clock, Calendar, CheckSquare, Award, BookOpen, Sparkles, Star, Trophy, GraduationCap, Zap } from 'lucide-react-native';
import { subDays, format, parseISO, eachDayOfInterval } from 'date-fns';
import { LumoraLogo } from '../../src/components/LumoraLogo';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';

export default function ProgressScreen() {
  const colors = useThemeStore((state) => state.getColors());
  const user = useAuthStore((state) => state.user);

  // Opacity pulsing for loading states
  const opacity = useSharedValue(0.4);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 600 }), -1, true);
  }, []);
  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // States
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  // Statistics
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalHours: '0.0',
    avgFocusTime: 0,
    avgQuizScore: '0.0',
    mostStudiedSubject: 'None',
  });

  // Fetch statistics data
  useEffect(() => {
    let active = true;
    const loadStats = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const [fetchedSessions, fetchedQuizzes] = await Promise.all([
          getFocusSessions(user.uid),
          getQuizzes(user.uid),
        ]);

        if (!active) return;

        setSessions(fetchedSessions);
        setQuizzes(fetchedQuizzes);

        // Compute metrics
        const totalSessions = fetchedSessions.length;
        const totalMinutes = fetchedSessions.reduce((acc, curr) => acc + curr.duration, 0);
        const totalHours = (totalMinutes / 60).toFixed(1);
        const avgFocusTime = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;
        
        let avgQuizScore = '0.0';
        if (fetchedQuizzes.length > 0) {
          const totalScore = fetchedQuizzes.reduce((acc, curr) => acc + curr.score, 0);
          const totalQuestions = fetchedQuizzes.reduce((acc, curr) => acc + curr.totalQuestions, 0);
          avgQuizScore = totalQuestions > 0 ? ((totalScore / totalQuestions) * 100).toFixed(0) + '%' : '0.0%';
        }

        // Most studied subject
        const subjectMap: Record<string, number> = {};
        fetchedSessions.forEach((s) => {
          const subj = s.subject || 'General Studies';
          subjectMap[subj] = (subjectMap[subj] || 0) + s.duration;
        });

        let mostStudied = 'None';
        let maxDuration = 0;
        Object.entries(subjectMap).forEach(([subj, duration]) => {
          if (duration > maxDuration) {
            maxDuration = duration;
            mostStudied = subj;
          }
        });

        setStats({
          totalSessions,
          totalHours,
          avgFocusTime,
          avgQuizScore,
          mostStudiedSubject: mostStudied,
        });

      } catch (err) {
        console.error('Failed to load progress stats:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadStats();
    return () => {
      active = false;
    };
  }, [user]);

  // Define Achievements list based on stats
  const getAchievements = (): Achievement[] => {
    const totalMins = sessions.reduce((acc, curr) => acc + curr.duration, 0);
    const totalHoursNum = totalMins / 60;
    const totalPerfectQuizzes = quizzes.filter((q) => q.score === q.totalQuestions && q.totalQuestions > 0).length;

    return [
      {
        id: 'first_session',
        title: 'First Step',
        description: 'Complete your first focus session',
        unlocked: sessions.length >= 1,
        icon: 'Zap',
      },
      {
        id: 'streak_week',
        title: 'Weekly Habit',
        description: 'Reach a study streak of 7 days',
        unlocked: (user?.streak || 0) >= 7,
        icon: 'Flame',
      },
      {
        id: 'sessions_100',
        title: 'Focus Master',
        description: 'Complete 100 focus sessions',
        unlocked: sessions.length >= 100,
        icon: 'Trophy',
      },
      {
        id: 'perfect_quizzes',
        title: 'Scholar',
        description: 'Achieve 5 perfect scores in AI Quizzes',
        unlocked: totalPerfectQuizzes >= 5,
        icon: 'GraduationCap',
      },
      {
        id: 'hours_50',
        title: 'Dedication',
        description: 'Study for a total of 50 hours',
        unlocked: totalHoursNum >= 50,
        icon: 'Award',
      },
    ];
  };

  // Render SVG Heatmap Grid
  const renderHeatmap = () => {
    // Generate dates for the last 13 weeks (91 days)
    const today = new Date();
    const startDate = subDays(today, 90); // 13 weeks of squares
    const allDays = eachDayOfInterval({ start: startDate, end: today });

    // Map sessions to dates
    const dateCounts: Record<string, number> = {};
    sessions.forEach((s) => {
      const dateKey = s.timestamp.split('T')[0];
      dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;
    });

    const rectSize = 13;
    const gap = 3.5;
    const columns: React.ReactNode[] = [];

    // Group dates into weeks (7 days each)
    let currentWeek: React.ReactNode[] = [];
    let colIdx = 0;

    allDays.forEach((day, index) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const count = dateCounts[dateKey] || 0;
      
      // Determine themed shading
      let color = colors.progressBg;
      if (count === 1) color = colors.secondary;
      else if (count === 2) color = colors.primary + '50';
      else if (count === 3 || count === 4) color = colors.primary + 'A0';
      else if (count >= 5) color = colors.primary;

      const y = (index % 7) * (rectSize + gap);

      currentWeek.push(
        <Rect
          key={dateKey}
          x={0}
          y={y}
          width={rectSize}
          height={rectSize}
          rx={3}
          fill={color}
        />
      );

      // Start next column when week completes or at final item
      if (index % 7 === 6 || index === allDays.length - 1) {
        const x = colIdx * (rectSize + gap);
        columns.push(
          <G key={colIdx} transform={`translate(${x}, 0)`}>
            {currentWeek}
          </G>
        );
        currentWeek = [];
        colIdx += 1;
      }
    });

    // Compute dimensions
    const heatmapWidth = colIdx * (rectSize + gap);
    const heatmapHeight = 7 * (rectSize + gap) - gap;

    return (
      <View style={styles.heatmapWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Svg width={heatmapWidth + 10} height={heatmapHeight + 10} style={{ padding: 5 }}>
            {columns}
          </Svg>
        </ScrollView>
        <View style={styles.legendRow}>
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Less</Text>
          <View style={[styles.legendBox, { backgroundColor: colors.progressBg }]} />
          <View style={[styles.legendBox, { backgroundColor: colors.secondary }]} />
          <View style={[styles.legendBox, { backgroundColor: colors.primary + '50' }]} />
          <View style={[styles.legendBox, { backgroundColor: colors.primary + 'A0' }]} />
          <View style={[styles.legendBox, { backgroundColor: colors.primary }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>More</Text>
        </View>
      </View>
    );
  };

  const getAchievementIcon = (name: string, isUnlocked: boolean) => {
    const stroke = isUnlocked ? colors.primary : colors.textSecondary + '70';
    const fill = isUnlocked ? colors.secondary : 'transparent';
    const size = 24;

    switch (name) {
      case 'Zap':
        return <Zap size={size} color={stroke} fill={fill} />;
      case 'Flame':
        return <Flame size={size} color={stroke} fill={fill} />;
      case 'Trophy':
        return <Trophy size={size} color={stroke} fill={fill} />;
      case 'GraduationCap':
        return <GraduationCap size={size} color={stroke} fill={fill} />;
      case 'Award':
      default:
        return <Award size={size} color={stroke} fill={fill} />;
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Animated.View style={pulseAnimatedStyle}>
          <LumoraLogo size={48} />
        </Animated.View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.headerBar}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Your Progress</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Track focus achievements and analytics
        </Text>
      </View>

      {/* Grid of Stats Cards */}
      <View style={styles.statsGrid}>
        <Card style={styles.statCard} bordered>
          <Clock size={20} color={colors.primary} style={{ marginBottom: 6 }} />
          <Text style={[styles.statVal, { color: colors.textPrimary }]}>{stats.totalHours}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Hours</Text>
        </Card>
        
        <Card style={styles.statCard} bordered>
          <Calendar size={20} color={colors.primary} style={{ marginBottom: 6 }} />
          <Text style={[styles.statVal, { color: colors.textPrimary }]}>{stats.totalSessions}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sessions</Text>
        </Card>

        <Card style={styles.statCard} bordered>
          <CheckSquare size={20} color={colors.primary} style={{ marginBottom: 6 }} />
          <Text style={[styles.statVal, { color: colors.textPrimary }]}>{stats.avgQuizScore}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Quiz Avg</Text>
        </Card>

        <Card style={styles.statCard} bordered>
          <Flame size={20} color={colors.primary} style={{ marginBottom: 6 }} />
          <Text style={[styles.statVal, { color: colors.textPrimary }]}>{user?.streak || 1}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active Streak</Text>
        </Card>
      </View>

      {/* Extra Stat summaries */}
      <Card style={styles.summaryCard} bordered>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Avg Focus Duration:</Text>
          <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>{stats.avgFocusTime} mins</Text>
        </View>
        <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 10, marginTop: 10 }]}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Most Studied Subject:</Text>
          <Text style={[styles.summaryVal, { color: colors.textPrimary }]} numberOfLines={1}>
            {stats.mostStudiedSubject}
          </Text>
        </View>
      </Card>

      {/* SVG Streak Heatmap Card */}
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Study Heatmap</Text>
        <Card style={styles.heatmapCard} bordered>
          {renderHeatmap()}
        </Card>
      </View>

      {/* Achievements List */}
      <View style={[styles.sectionContainer, { marginBottom: 110 }]}>
        <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Badges & Milestones</Text>
        <View style={styles.achievementsList}>
          {getAchievements().map((ach) => {
            return (
              <Card
                key={ach.id}
                style={[
                  styles.achievementCard,
                  {
                    opacity: ach.unlocked ? 1 : 0.6,
                  },
                ]}
                bordered
              >
                <View
                  style={[
                    styles.badgeCircle,
                    {
                      backgroundColor: ach.unlocked ? colors.secondary : colors.progressBg,
                      borderColor: ach.unlocked ? colors.primary : colors.border,
                    },
                  ]}
                >
                  {getAchievementIcon(ach.icon, ach.unlocked)}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.achievementTitle, { color: colors.textPrimary }]}>
                    {ach.title}
                  </Text>
                  <Text style={[styles.achievementDesc, { color: colors.textSecondary }]}>
                    {ach.description}
                  </Text>
                </View>

                {!ach.unlocked && (
                  <View style={[styles.lockedPill, { backgroundColor: colors.border }]}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary }}>LOCKED</Text>
                  </View>
                )}
              </Card>
            );
          })}
        </View>
      </View>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    padding: 16,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  summaryCard: {
    padding: 16,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  summaryVal: {
    fontSize: 14,
    fontWeight: '800',
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
  heatmapCard: {
    padding: 16,
    alignItems: 'center',
  },
  heatmapWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
    marginTop: 10,
    gap: 4,
    paddingRight: 6,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '700',
    marginHorizontal: 2,
  },
  legendBox: {
    width: 10,
    height: 10,
    borderRadius: 2.5,
  },
  achievementsList: {
    gap: 12,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  badgeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  achievementTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  achievementDesc: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  lockedPill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginLeft: 10,
  },
});
