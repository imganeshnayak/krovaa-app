import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Colors, FontWeights, Spacing, BorderRadius, FontSizes } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { sendRegistrationOtp, verifyRegistrationOtp } from '@/lib/authApi';

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRetypePassword, setShowRetypePassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const handleRegister = async () => {
    setError(null);

    if (!email) {
      setError('Please enter your email');
      return;
    }

    if (!username.trim()) {
      setError('Please choose a username');
      return;
    }

    const normalizedUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
      setError('Username must be 3 to 20 characters and use only letters, numbers, or underscores.');
      return;
    }

    if (password !== retypePassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const { error } = await sendRegistrationOtp(email, normalizedUsername, password, retypePassword);
      if (error) {
        setError(error);
        return;
      }

      setShowOtpScreen(true);
      setOtpSent(true);
    } catch (err) {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError(null);

    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const { error } = await verifyRegistrationOtp(email, otp);
      if (error) {
        setError(error);
        return;
      }

      router.replace('/login');
    } catch (err) {
      setError('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      // TODO: Resend OTP to email
      console.log('Resending OTP to:', email);
      setError(null);
    } catch (err) {
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToRegister = () => {
    setShowOtpScreen(false);
    setOtp('');
    setOtpSent(false);
    setError(null);
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

          <Text style={styles.title}>
            {showOtpScreen ? 'Verify Email' : 'Create Account'}
          </Text>
          <Text style={styles.subtitle}>
            {showOtpScreen ? 'Enter the code sent to your email' : 'Join the community today'}
          </Text>
        </View>

        {!showOtpScreen ? (
          <View style={styles.form}>
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Email */}
            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />

            <Input
              label="Username"
              placeholder="Choose a unique username"
              value={username}
              onChangeText={(text) => setUsername(text.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
              autoCapitalize="none"
            />

            {/* Password Field with Eye Toggle */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Create a password"
                  placeholderTextColor={Colors.gray400 ?? '#9CA3AF'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((prev) => !prev)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={Colors.gray500 ?? '#6B7280'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Field with Eye Toggle */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Re-enter your password"
                  placeholderTextColor={Colors.gray400 ?? '#9CA3AF'}
                  value={retypePassword}
                  onChangeText={setRetypePassword}
                  secureTextEntry={!showRetypePassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowRetypePassword((prev) => !prev)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showRetypePassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={Colors.gray500 ?? '#6B7280'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <Button title="Create Account" onPress={handleRegister} loading={loading} />
          </View>
        ) : (
          <View style={styles.form}>
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* OTP Sent Message */}
            {otpSent && (
              <View style={styles.otpMessageBox}>
                <Ionicons
                  name="mail-outline"
                  size={24}
                  color={Colors.primary}
                  style={{ marginBottom: Spacing.sm }}
                />
                <Text style={styles.otpMessageText}>
                  We've sent a 6-digit code to:
                </Text>
                <Text style={styles.otpEmailText}>{email}</Text>
              </View>
            )}

            {/* OTP Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Enter OTP</Text>
              <TextInput
                style={styles.otpInput}
                placeholder="000000"
                placeholderTextColor={Colors.gray400 ?? '#9CA3AF'}
                value={otp}
                onChangeText={(text) => {
                  // Only allow digits and limit to 6 characters
                  const filtered = text.replace(/[^0-9]/g, '').slice(0, 6);
                  setOtp(filtered);
                }}
                keyboardType="number-pad"
                maxLength={6}
                textAlign="center"
              />
            </View>

            <Button title="Verify OTP" onPress={handleVerifyOtp} loading={loading} />

            {/* Resend OTP */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive code? </Text>
              <TouchableOpacity onPress={handleResendOtp} disabled={loading}>
                <Text style={[styles.resendLink, loading && { opacity: 0.5 }]}>
                  Resend OTP
                </Text>
              </TouchableOpacity>
            </View>

            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToRegister}
              disabled={loading}
            >
              <Ionicons
                name="arrow-back-outline"
                size={20}
                color={Colors.gray600}
              />
              <Text style={styles.backButtonText}>Back to Register</Text>
            </TouchableOpacity>
          </View>
        )}

        {!showOtpScreen && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/login" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        )}
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

  // ── Password with Eye ─────────────────────────────────────
  inputGroup: {
    marginBottom: Spacing.sm,
  },
  inputLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium as any,
    color: Colors.gray700 ?? '#374151',
    marginBottom: 6,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray300 ?? '#D1D5DB',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
  },
  passwordInput: {
    flex: 1,
    height: 48,
    fontSize: FontSizes.md,
    color: Colors.gray900,
    paddingRight: Spacing.sm,
  },
  eyeButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
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

  // ── OTP Screen ────────────────────────────────────────────
  otpMessageBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  otpMessageText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    marginBottom: 4,
  },
  otpEmailText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
  },
  otpInput: {
    height: 56,
    borderWidth: 2,
    borderColor: Colors.gray300 ?? '#D1D5DB',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    fontSize: 24,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray900,
    textAlign: 'center',
    letterSpacing: 8,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  resendText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  resendLink: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: FontWeights.semiBold as any,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: 8,
  },
  backButtonText: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    fontWeight: FontWeights.medium as any,
  },
});