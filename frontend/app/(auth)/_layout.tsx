import { Stack, Redirect, useSegments } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function AuthLayout() {
  const { user, loading } = useAuth();
  const segments = useSegments();

  if (loading) {
    return null;
  }

  const isForgotPasswordFlow = segments.includes('forgot-password') || segments.includes('forgot-password-otp');

  if (user && !isForgotPasswordFlow) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
    >
      <Stack.Screen name="login" options={{ animation: 'none' }} />
      <Stack.Screen name="register" options={{ animation: 'none' }} />
    </Stack>
  );
}
