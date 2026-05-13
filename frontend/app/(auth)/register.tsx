import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Colors, FontWeights, Spacing, BorderRadius, FontSizes } from '@/constants/theme';
import { mockSignUp } from '@/lib/mockAuth';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    setError(null);
    const { error } = await mockSignUp(email, password, fullName);
    if (error) setError(error);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          {/* Logo Mark */}
          <View style={styles.logoWrapper}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoInitial}>K</Text>
            </View>
            <Text style={styles.logoBrand}>krovaa</Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the community today</Text>
        </View>

        <View style={styles.form}>
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          <Input
            label="Full Name"
            placeholder="Enter your full name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
          <Input
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <Input
            label="Password"
            placeholder="Create a password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Button title="Create Account" onPress={handleRegister} loading={false} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/login" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: 56,
    paddingBottom: Spacing.xl,
  },

  // ── Logo Section ──────────────────────────────────────────
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: Spacing.lg,
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInitial: {
    fontSize: 22,
    fontWeight: FontWeights.extraBold as any,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  logoBrand: {
    fontSize: 28,
    fontWeight: FontWeights.extraBold as any,
    color: Colors.gray900,
    letterSpacing: -1,
  },
  divider: {
    width: 32,
    height: 2,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginBottom: Spacing.lg,
    opacity: 0.25,
  },

  // ── Heading ───────────────────────────────────────────────
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: FontWeights.extraBold as any,
    color: Colors.gray900,
    marginBottom: Spacing.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    fontWeight: FontWeights.regular as any,
  },

  // ── Form ─────────────────────────────────────────────────
  form: {
    marginBottom: Spacing.xl,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium as any,
  },

  // ── Footer ────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
  },
  footerText: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
  },
  footerLink: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: FontWeights.semiBold as any,
  },
});