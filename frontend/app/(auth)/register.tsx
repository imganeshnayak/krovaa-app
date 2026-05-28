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
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleRegister = async () => {
    setError(null);
    if (!email) { setError('Please enter your email'); return; }
    if (!username.trim()) { setError('Please choose a username'); return; }

    const normalizedUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
      setError('Username must be 3 to 20 characters and use only letters, numbers, or underscores.');
      return;
    }
    if (password !== retypePassword) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters long'); return; }

    setLoading(true);
    try {
      const { error } = await sendRegistrationOtp(email, normalizedUsername, password, retypePassword);
      if (error) { setError(error); return; }
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
      if (error) { setError(error); return; }
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
        
        {/* Architectural Header */}
        <View style={styles.header}>
          <View style={styles.logoWrapper}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoInitial}>K</Text>
            </View>
            <Text style={styles.logoBrand}>krovaa</Text>
          </View>
          <Text style={styles.title}>
            {showOtpScreen ? 'Verify Email' : 'Create Account'}
          </Text>
          <Text style={styles.subtitle}>
            {showOtpScreen ? 'Enter the code sent to your email' : 'Join the community today'}
          </Text>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!showOtpScreen ? (
          <View style={styles.form}>
            {/* Email */}
            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              containerStyle={styles.customInputContainer}
            />

            {/* Username */}
            <Input
              label="Username"
              placeholder="Choose a unique username"
              value={username}
              onChangeText={(text) => setUsername(text.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
              autoCapitalize="none"
              containerStyle={styles.customInputContainer}
            />

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={[
                styles.passwordWrapper, 
                focusedField === 'password' && styles.inputFieldFocused
              ]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Create a password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((prev) => !prev)}
                  activeOpacity={0.5}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={[
                styles.passwordWrapper, 
                focusedField === 'confirmPassword' && styles.inputFieldFocused
              ]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Re-enter your password"
                  placeholderTextColor="#9CA3AF"
                  value={retypePassword}
                  onChangeText={setRetypePassword}
                  secureTextEntry={!showRetypePassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowRetypePassword((prev) => !prev)}
                  activeOpacity={0.5}
                >
                  <Ionicons
                    name={showRetypePassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ marginTop: Spacing.md }}>
              <Button title="Create Account" onPress={handleRegister} loading={loading} />
            </View>
          </View>
        ) : (
          <View style={styles.form}>
            {/* OTP Notification Banner */}
            {otpSent && (
              <View style={styles.otpMessageBox}>
                <View style={styles.otpIconCircle}>
                  <Ionicons name="mail" size={18} color={Colors.primary} />
                </View>
                <View style={styles.otpMessageRight}>
                  <Text style={styles.otpMessageText}>We sent a code verification sequence to</Text>
                  <Text style={styles.otpEmailText}>{email}</Text>
                </View>
              </View>
            )}

            {/* Premium Block Segments for OTP */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Security Code</Text>
              <View style={styles.otpContainer}>
                {/* Hidden Core TextInput */}
                <TextInput
                  style={styles.absoluteHiddenInput}
                  value={otp}
                  onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
                
                {/* Simulated High-End UI Box Matrices */}
                {Array.from({ length: 6 }).map((_, index) => {
                  const digit = otp[index] || '';
                  const isCurrent = index === otp.length;
                  return (
                    <View 
                      key={index} 
                      style={[
                        styles.otpBoxMatrix,
                        digit !== '' && styles.otpBoxFilled,
                        isCurrent && styles.otpBoxActive
                      ]}
                    >
                      <Text style={styles.otpBoxText}>{digit}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <Button title="Verify OTP" onPress={handleVerifyOtp} loading={loading} />

            {/* Resend Actions Row */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive code? </Text>
              <TouchableOpacity onPress={handleResendOtp} disabled={loading}>
                <Text style={[styles.resendLink, loading && { opacity: 0.5 }]}>
                  Resend OTP
                </Text>
              </TouchableOpacity>
            </View>

            {/* Back Call to Action Wrapper */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToRegister}
              disabled={loading}
              activeOpacity={0.6}
            >
              <Ionicons name="arrow-back" size={16} color={Colors.gray600} />
              <Text style={styles.backButtonText}>Modify configuration details</Text>
            </TouchableOpacity>
          </View>
        )}

        {!showOtpScreen && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/login" asChild>
              <TouchableOpacity activeOpacity={0.6}>
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
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: Spacing.xl,
  },

  // ── Premium Header Layout ──────────────────────────
  header: {
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  logoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  logoCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  logoInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.white,
  },
  logoBrand: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.gray900,
    letterSpacing: -0.75,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.gray900,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: FontSizes.sm ?? 14,
    color: Colors.gray500 ?? '#6B7280',
    fontWeight: '400',
  },

  // ── Form Components ─────────────────────────────────
  form: {
    gap: 4,
  },
  customInputContainer: {
    marginBottom: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },

  // ── Segmented Input Group Elements ──────────────────
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray800 ?? '#1F2937',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  inputFieldFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: Colors.gray900,
    fontWeight: '500',
  },
  eyeButton: {
    height: '100%',
    justifyContent: 'center',
    paddingLeft: 12,
  },

  // ── Premium OTP Segment Blocks ──────────────────────
  otpMessageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  otpIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpMessageRight: {
    flex: 1,
  },
  otpMessageText: {
    fontSize: 12,
    color: Colors.gray600,
  },
  otpEmailText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.gray900,
    marginTop: 1,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
    position: 'relative',
  },
  absoluteHiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
    zIndex: 10,
  },
  otpBoxMatrix: {
    width: 46,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxFilled: {
    borderColor: '#D1D5DB',
    backgroundColor: '#F3F4F6',
  },
  otpBoxActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
    borderWidth: 2,
  },
  otpBoxText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.gray900,
  },

  // ── Link Layout Actions ─────────────────────────────
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  resendText: {
    fontSize: 13,
    color: Colors.gray500,
  },
  resendLink: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '700',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 6,
    marginTop: 8,
  },
  backButtonText: {
    fontSize: 13,
    color: Colors.gray600,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    paddingBottom: 12,
  },
  footerText: {
    fontSize: 14,
    color: Colors.gray500,
  },
  footerLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '700',
  },
});