import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { useThemeStore } from '../../src/store/themeStore';
import { useAuthStore } from '../../src/store/authStore';
import { Card } from '../../src/components/Card';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { User, Mail, Lock, GraduationCap } from 'lucide-react-native';
import { LumoraLogo } from '../../src/components/LumoraLogo';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
  semester: z.string().min(1, 'Please select/enter your semester'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const colors = useThemeStore((state) => state.getColors());
  const { register, error: authError } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const { control, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      semester: 'Semester 1',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    // Extra validation check for refinement
    const check = registerSchema.safeParse(data);
    if (!check.success) {
      return;
    }

    setLoading(true);
    try {
      await register(data.name, data.email, data.password, data.semester);
      // AuthStore listener in _layout.tsx will auto-redirect to /(tabs)
    } catch (err) {
      console.log('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const semesters = ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Other'];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContainer, { backgroundColor: colors.background }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={{ marginBottom: 12 }}>
            <LumoraLogo size={40} />
          </View>
          <Text style={[styles.titleText, { color: colors.textPrimary }]}>Create Account</Text>
          <Text style={[styles.subtitleText, { color: colors.textSecondary }]}>
            Join Lumora to build focus habits!
          </Text>
        </View>

        <Card style={styles.card} bordered>
          {authError && (
            <View style={[styles.errorContainer, { backgroundColor: colors.error + '15', borderColor: colors.error }]}>
              <Text style={[styles.errorText, { color: colors.error }]}>{authError}</Text>
            </View>
          )}

          <Controller
            control={control}
            name="name"
            rules={{ required: 'Name is required' }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Full Name"
                placeholder="Aarchi"
                autoCapitalize="words"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.name?.message}
                icon={<User size={20} color={colors.textSecondary} />}
              />
            )}
          />

          <Controller
            control={control}
            name="email"
            rules={{ required: 'Email is required' }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email"
                placeholder="your.email@domain.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                icon={<Mail size={20} color={colors.textSecondary} />}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            rules={{ required: 'Password is required' }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                placeholder="Choose a strong password"
                secureTextEntry
                autoCapitalize="none"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                icon={<Lock size={20} color={colors.textSecondary} />}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            rules={{ required: 'Please confirm your password' }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Confirm Password"
                placeholder="Confirm your password"
                secureTextEntry
                autoCapitalize="none"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.confirmPassword?.message}
                icon={<Lock size={20} color={colors.textSecondary} />}
              />
            )}
          />

          {/* Semester Selector */}
          <Controller
            control={control}
            name="semester"
            render={({ field: { onChange, value } }) => (
              <View style={styles.semesterContainer}>
                <Text style={[styles.semesterLabel, { color: colors.textPrimary }]}>
                  Current Semester
                </Text>
                <View style={styles.semesterGrid}>
                  {semesters.map((sem) => {
                    const isSelected = value === sem;
                    return (
                      <Pressable
                        key={sem}
                        onPress={() => onChange(sem)}
                        style={[
                          styles.semesterChip,
                          {
                            borderColor: isSelected ? colors.primary : colors.border,
                            backgroundColor: isSelected ? colors.secondary : colors.card,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.semesterChipText,
                            {
                              color: isSelected ? colors.primary : colors.textSecondary,
                              fontWeight: isSelected ? '700' : '500',
                            },
                          ]}
                        >
                          {sem}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          />

          <Button
            title="Create Account"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            style={styles.submitButton}
          />
        </Card>

        {/* Footer Link */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Already have an account?{' '}
          </Text>
          <Pressable onPress={() => router.push('/(auth)/login' as any)}>
            <Text style={[styles.footerLink, { color: colors.primary }]}>Log In</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 50,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  card: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    width: '100%',
  },
  errorContainer: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  semesterContainer: {
    marginBottom: 28,
  },
  semesterLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    marginLeft: 6,
  },
  semesterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginLeft: 4,
  },
  semesterChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  semesterChipText: {
    fontSize: 13,
  },
  submitButton: {
    width: '100%',
    marginTop: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  footerText: {
    fontSize: 15,
    fontWeight: '600',
  },
  footerLink: {
    fontSize: 15,
    fontWeight: '800',
  },
});
