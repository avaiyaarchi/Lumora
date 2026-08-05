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
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import { LumoraLogo } from '../../src/components/LumoraLogo';

const resetSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ResetFormData = z.infer<typeof resetSchema>;

export default function ForgotPasswordScreen() {
  const colors = useThemeStore((state) => state.getColors());
  const { resetPassword, error: authError } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const { control, handleSubmit, formState: { errors } } = useForm<ResetFormData>({
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ResetFormData) => {
    setLoading(true);
    setSuccess(false);
    try {
      await resetPassword(data.email);
      setSuccess(true);
    } catch (err) {
      console.log('Reset password error:', err);
    } finally {
      setLoading(false);
    }
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
        {/* Back Link */}
        <Pressable
          style={styles.backButton}
          onPress={() => router.replace('/(auth)/login' as any)}
        >
          <ArrowLeft size={20} color={colors.textPrimary} style={styles.backIcon} />
          <Text style={[styles.backText, { color: colors.textPrimary }]}>Back to Log In</Text>
        </Pressable>

        <View style={styles.header}>
          <View style={{ marginBottom: 12 }}>
            <LumoraLogo size={40} />
          </View>
          <Text style={[styles.titleText, { color: colors.textPrimary }]}>Reset Password</Text>
          <Text style={[styles.subtitleText, { color: colors.textSecondary }]}>
            Enter your email and we'll send a recovery link.
          </Text>
        </View>

        <Card style={styles.card} bordered>
          {success ? (
            <View style={styles.successWrapper}>
              <CheckCircle2 size={48} color={colors.success} style={styles.successIcon} />
              <Text style={[styles.successTitle, { color: colors.textPrimary }]}>Link Sent!</Text>
              <Text style={[styles.successDescription, { color: colors.textSecondary }]}>
                Please check your inbox (and spam folder) for instructions to reset your password.
              </Text>
              <Button
                title="Back to Login"
                variant="secondary"
                onPress={() => router.replace('/(auth)/login' as any)}
                style={styles.backToLoginBtn}
              />
            </View>
          ) : (
            <>
              {authError && (
                <View style={[styles.errorContainer, { backgroundColor: colors.error + '15', borderColor: colors.error }]}>
                  <Text style={[styles.errorText, { color: colors.error }]}>{authError}</Text>
                </View>
              )}

              <Controller
                control={control}
                name="email"
                rules={{ required: 'Email is required' }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Email Address"
                    placeholder="student@domain.com"
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

              <Button
                title="Send Reset Link"
                onPress={handleSubmit(onSubmit)}
                loading={loading}
                style={styles.submitButton}
              />
            </>
          )}
        </Card>
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 32,
    paddingVertical: 4,
  },
  backIcon: {
    marginRight: 6,
  },
  backText: {
    fontSize: 15,
    fontWeight: '700',
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
    lineHeight: 22,
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
  submitButton: {
    width: '100%',
    marginTop: 8,
  },
  successWrapper: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
  },
  successDescription: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  backToLoginBtn: {
    width: '100%',
  },
});
