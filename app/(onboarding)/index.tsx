import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../src/store/themeStore';
import { useAuthStore } from '../../src/store/authStore';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Sparkles, Timer, Brain, Flame, ArrowRight } from 'lucide-react-native';

export default function OnboardingScreen() {
  const colors = useThemeStore((state) => state.getColors());
  const completeOnboarding = useAuthStore((state) => state.completeOnboarding);
  const [activeStep, setActiveStep] = useState(0);
  const router = useRouter();

  const steps = [
    {
      title: 'What is Lumora?',
      tagline: 'Study Better. Stay Focused. Learn Smarter.',
      description: 'Lumora is your calm, cute study companion designed to protect your attention span and help you retain what you learn.',
      icon: (color: string) => <Sparkles size={56} color={color} strokeWidth={1.5} />,
    },
    {
      title: 'How Focus Cycles Work',
      tagline: 'Pomodoro timer at the heart.',
      description: 'Choose a topic, choose notes/PDF materials, and start. Focus for 25 minutes, take a 5-minute break, repeat, and follow today\'s study flow.',
      icon: (color: string) => <Timer size={56} color={color} strokeWidth={1.5} />,
    },
    {
      title: 'AI Revision Quizzes',
      tagline: 'Recall, do not replace.',
      description: 'After study sessions, Lumora uses Google Gemini to generate custom quizzes from your material. AI verifies your answers and explains errors—it never solves homework.',
      icon: (color: string) => <Brain size={56} color={color} strokeWidth={1.5} />,
    },
    {
      title: 'XP & Cute Gamification',
      tagline: 'Reward your persistence.',
      description: 'Earn XP for focus sessions and quiz scores. Build daily study streaks, unlock cutesy color palettes, and unlock cute animal avatars with accessories!',
      icon: (color: string) => <Flame size={56} color={color} strokeWidth={1.5} />,
    },
  ];

  const handleNext = async () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      await completeOnboarding();
      router.replace('/(auth)/login' as any);
    }
  };

  const handleSkip = async () => {
    await completeOnboarding();
    router.replace('/(auth)/login' as any);
  };

  const currentStep = steps[activeStep];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top bar with Skip button */}
      <View style={styles.topBar}>
        {activeStep < steps.length - 1 ? (
          <Pressable onPress={handleSkip}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
          </Pressable>
        ) : (
          <View />
        )}
      </View>

      {/* Main Illustration & Text Content Card */}
      <View style={styles.contentContainer}>
        <Card style={styles.card} bordered>
          <View style={[styles.iconWrapper, { backgroundColor: colors.secondary }]}>
            {currentStep.icon(colors.primary)}
          </View>
          
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {currentStep.title}
          </Text>
          
          <Text style={[styles.tagline, { color: colors.primary }]}>
            {currentStep.tagline}
          </Text>
          
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {currentStep.description}
          </Text>
        </Card>
      </View>

      {/* Footer with Step Dots and Button */}
      <View style={styles.footer}>
        {/* Progress dots */}
        <View style={styles.dotsContainer}>
          {steps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: index === activeStep ? colors.primary : colors.border,
                  width: index === activeStep ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Action Button */}
        <Button
          onPress={handleNext}
          title={activeStep === steps.length - 1 ? 'Get Started' : 'Next'}
          style={styles.actionButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '700',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  iconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 36,
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  actionButton: {
    width: '100%',
    maxWidth: 280,
  },
});
