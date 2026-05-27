import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bell, Mail } from 'lucide-react-native';
import { Colors, FontWeights, Spacing, BorderRadius, FontSizes } from '@/constants/theme';

type NotificationPrefs = {
  messageNotifications: boolean;
  emailNotifications: boolean;
};

const STORAGE_KEY = 'krovaa.notification.preferences';

const DEFAULT_PREFS: NotificationPrefs = {
  messageNotifications: true,
  emailNotifications: true,
};

export default function NotificationsScreen() {
  const [preferences, setPreferences] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadPreferences() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<NotificationPrefs>;
          const nextPreferences: NotificationPrefs = {
            messageNotifications: parsed.messageNotifications ?? DEFAULT_PREFS.messageNotifications,
            emailNotifications: parsed.emailNotifications ?? DEFAULT_PREFS.emailNotifications,
          };

          if (mounted) {
            setPreferences(nextPreferences);
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadPreferences();

    return () => {
      mounted = false;
    };
  }, []);

  const updatePreference = async (key: keyof NotificationPrefs, value: boolean) => {
    const nextPreferences = { ...preferences, [key]: value };
    setPreferences(nextPreferences);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextPreferences));
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Text style={styles.headerSubtitle}>Choose how you want to be notified.</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Bell size={18} color={Colors.warning} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Message notifications</Text>
              <Text style={styles.rowDesc}>Get notified when someone sends you a message.</Text>
            </View>
            <Switch
              value={preferences.messageNotifications}
              onValueChange={(value) => updatePreference('messageNotifications', value)}
              disabled={loading}
              trackColor={{ false: Colors.gray200, true: Colors.primary + '55' }}
              thumbColor={preferences.messageNotifications ? Colors.primary : Colors.gray400}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Mail size={18} color={Colors.secondary} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Email notifications</Text>
              <Text style={styles.rowDesc}>Receive important updates and summaries by email.</Text>
            </View>
            <Switch
              value={preferences.emailNotifications}
              onValueChange={(value) => updatePreference('emailNotifications', value)}
              disabled={loading}
              trackColor={{ false: Colors.gray200, true: Colors.primary + '55' }}
              thumbColor={preferences.emailNotifications ? Colors.primary : Colors.gray400}
            />
          </View>
        </View>
      </View>

      <Text style={styles.note}>Your choices are saved on this device and applied immediately.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
  },
  headerTitle: {
    fontSize: FontSizes.xxxl,
    fontWeight: FontWeights.extraBold as any,
    color: Colors.gray900,
  },
  headerSubtitle: {
    marginTop: Spacing.sm,
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  section: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
  },
  rowDesc: {
    marginTop: 2,
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gray100,
    marginLeft: 56,
  },
  note: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },
});
