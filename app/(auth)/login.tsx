import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { useThemeStore } from '../../src/store/themeStore';
import { useAuthStore } from '../../src/store/authStore';
import { Card } from '../../src/components/Card';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Sparkles, Mail, Lock, Check } from 'lucide-react-native';
import { LumoraLogo } from '../../src/components/LumoraLogo';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const colors = useThemeStore((state) => state.getColors());
  const { login, error: authError } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      // AuthStore listener in _layout.tsx will auto-redirect to /(tabs)
    } catch (err) {
      console.log('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    // Mocking Google Sign In for demo / fallback environments
    setTimeout(async () => {
      try {
        await login('demo@lumora.app', 'demopass123');
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    }, 1200);
  };

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
            <LumoraLogo size={64} showWordmark />
          </View>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Study Better. Stay Focused. Learn Smarter.
          </Text>
        </View>

        <Card style={styles.card} bordered>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Welcome Back!</Text>

          {authError && (
            <View style={[styles.errorContainer, { backgroundColor: colors.error + '15', borderColor: colors.error }]}>
              <Text style={[styles.errorText, { color: colors.error }]}>{authError}</Text>
            </View>
          )}

          <Controller
            control={control}
            name="email"
            rules={{
              required: 'Email is required',
              validate: (val) => {
                const check = loginSchema.shape.email.safeParse(val);
                return check.success ? true : check.error.issues[0]?.message || 'Invalid email';
              }
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email"
                placeholder="hello@student.com"
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
            rules={{
              required: 'Password is required',
              validate: (val) => {
                const check = loginSchema.shape.password.safeParse(val);
                return check.success ? true : check.error.issues[0]?.message || 'Invalid password';
              }
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                placeholder="Enter your password"
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

          {/* Options Row */}
          <View style={styles.optionsRow}>
            <Pressable
              style={styles.rememberMeContainer}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: colors.border,
                    backgroundColor: rememberMe ? colors.primary : colors.card,
                  },
                ]}
              >
                {rememberMe && <Check size={12} color="#FFF" strokeWidth={3} />}
              </View>
              <Text style={[styles.rememberMeText, { color: colors.textSecondary }]}>Remember me</Text>
            </Pressable>

            <Pressable onPress={() => router.push('/(auth)/forgot-password' as any)}>
              <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>Forgot?</Text>
            </Pressable>
          </View>

          {/* Action Buttons */}
          <Button
            title="Log In"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            style={styles.submitButton}
          />

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <Button
            title="Continue with Google"
            variant="secondary"
            onPress={handleGoogleSignIn}
            disabled={loading}
            style={styles.googleButton}
          />
        </Card>

        {/* Footer Link */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Don't have an account?{' '}
          </Text>
          <Pressable onPress={() => router.push('/(auth)/register' as any)}>
            <Text style={[styles.footerLink, { color: colors.primary }]}>Sign Up</Text>
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
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  card: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    width: '100%',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 24,
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
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rememberMeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '700',
  },
  submitButton: {
    width: '100%',
    marginBottom: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1.5,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 14,
    fontWeight: '700',
  },
  googleButton: {
    width: '100%',
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
