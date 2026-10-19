import { Tabs } from 'expo-router';
import { BarChart2, Calendar, Timer, User2 } from 'lucide-react-native';
import { Platform, StyleSheet } from 'react-native';
import { LumoraLogo } from '../../src/components/LumoraLogo';
import { useThemeStore } from '../../src/store/themeStore';

export default function TabLayout() {
  const colors = useThemeStore((state) => state.getColors());

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.background,
          borderBottomWidth: Platform.OS === 'ios' ? 0.5 : 1,
          borderBottomColor: colors.border,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 18,
          color: colors.textPrimary,
        },
        headerLeftContainerStyle: {
          paddingLeft: 16,
        },
        headerLeft: () => <LumoraLogo size={28} />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary + '80',
        tabBarLabelStyle: styles.label,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            borderTopWidth: Platform.OS === 'ios' ? 0.5 : 1,
            shadowColor: colors.shadow,
          },
        ],
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Study',
          tabBarIcon: ({ color, size }) => <Timer size={size} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: 'Planner',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, size }) => <BarChart2 size={size} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User2 size={size} color={color} strokeWidth={2.2} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingTop: 10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 8,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
});
