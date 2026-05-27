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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Colors, FontWeights, Spacing, BorderRadius, FontSizes } from '@/constants/theme';
import {
  changePasswordAfterReset,
  requestPasswordReset,
  verifyPasswordResetOtp,
} from '@/lib/authApi';

type ResetStep = 'request' | 'verify' | 'change';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<ResetStep>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRetypePassword, setShowRetypePassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async () => {
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const { error: requestError } = await requestPasswordReset(email.trim());
      if (requestError) {
        setError(requestError);
        return;
      }

      setSuccess('We sent a password reset code to your email.');
      setStep('verify');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError(null);
    setSuccess(null);

    if (otp.length !== 6) {
      setError('Please enter the 6-digit code from your email.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: verifyError } = await verifyPasswordResetOtp(email.trim(), otp);
      if (verifyError) {
        setError(verifyError);
        return;
      }

      if (!data?.resetToken) {
        setError('Unable to verify the reset code.');
        return;
      }

      setResetToken(data.resetToken);
      setSuccess('Code verified. Choose a new password.');
      setStep('change');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setError(null);
    setSuccess(null);

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== retypePassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!resetToken) {
      setError('Your reset session expired. Please request a new code.');
      setStep('request');
      return;
    }

    setLoading(true);
    try {
      const { error: changeError } = await changePasswordAfterReset(resetToken, password, retypePassword);
      if (changeError) {
        setError(changeError);
        return;
      }

      setSuccess('Password updated successfully. You can sign in now.');
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'change') {
      setStep('verify');
      setSuccess(null);
      setError(null);
      return;
    }

    if (step === 'verify') {
      setStep('request');
      setOtp('');
      setSuccess(null);
      setError(null);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoWrapper}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoInitial}>K</Text>
            </View>
            <Text style={styles.logoBrand}>krovaa</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.title}>
            {step === 'request' ? 'Reset Password' : step === 'verify' ? 'Verify Code' : 'New Password'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'request'
              ? 'We’ll send a one-time code to your email.'
              : step === 'verify'
                ? 'Enter the 6-digit code from your inbox.'
                : 'Choose a strong new password.'}
          </Text>
        </View>

        <View style={styles.form}>
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {success && (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle-outline" size={20} color={Colors.secondary} />
              <Text style={styles.successText}>{success}</Text>
            </View>
          )}

          {step === 'request' && (
            <>
              <Input
                label="Email"
                placeholder="Enter your account email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />
              <Button title="Send Reset Code" onPress={handleRequestReset} loading={loading} />
            </>
          )}

          {step === 'verify' && (
            <>
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>Code sent to</Text>
                <Text style={styles.infoValue}>{email}</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Reset Code</Text>
                <TextInput
                  style={styles.otpInput}
                  placeholder="000000"
                  placeholderTextColor={Colors.gray400 ?? '#9CA3AF'}
                  value={otp}
                  onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  textAlign="center"
                />
              </View>

              <Button title="Verify Code" onPress={handleVerifyOtp} loading={loading} />
            </>
          )}

          {step === 'change' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password</Text>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter a new password"
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

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Re-enter your new password"
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

              <Button title="Update Password" onPress={handleChangePassword} loading={loading} />
            </>
          )}

          {step !== 'request' && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack} disabled={loading}>
              <Ionicons name="arrow-back-outline" size={20} color={Colors.gray600} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Remembered your password? </Text>
          <TouchableOpacity onPress={() => router.replace('/login')}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
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
    textAlign: 'center',
  },
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
  successBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  successText: {
    color: Colors.secondary,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium as any,
    flex: 1,
  },
  infoBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  infoText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
  },
  inputGroup: {
    marginBottom: Spacing.sm,
  },
  inputLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium as any,
    color: Colors.gray700,
    marginBottom: 6,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    flexWrap: 'wrap',
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