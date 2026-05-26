import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/context/AuthContext';
import { getThemeMode, setThemeMode, THEME_STORAGE_KEY, useThemeMode } from '@/constants/theme';

export default function RootLayout() {
  useFrameworkReady();
  const themeMode = useThemeMode();
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function bootstrapTheme() {
      try {
        const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        const nextTheme = storedTheme === 'dark' || storedTheme === 'light'
          ? storedTheme
          : Appearance.getColorScheme() === 'dark'
            ? 'dark'
            : 'light';

        setThemeMode(nextTheme);
      } finally {
        if (mounted) {
          setThemeReady(true);
        }
      }
    }

    bootstrapTheme();

    return () => {
      mounted = false;
    };
  }, []);

  if (!themeReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'none',
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="chat/[id]" />
          <Stack.Screen name="reset-password" />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
