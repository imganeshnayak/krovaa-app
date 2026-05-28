import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { Bell, Lock, Circle as HelpCircle, LogOut, ChevronRight, Shield, MessageSquare, Info, FileText, CreditCard, Mail } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors, FontWeights, Spacing, BorderRadius, FontSizes } from '@/constants/theme';

const SETTINGS_SECTIONS = [
  {
    title: 'Account',
    items: [
      { icon: Lock, label: 'Change Password', color: Colors.primary },
      { icon: Shield, label: 'Privacy & Security', color: Colors.secondary },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { icon: Bell, label: 'Notifications', color: Colors.warning },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: HelpCircle, label: 'Help Center', color: Colors.secondary },
      { icon: MessageSquare, label: 'Contact Support', color: Colors.primary },
    ],
  },
  {
    title: 'About Us',
    items: [
      { icon: Info, label: 'App Version', color: Colors.gray500 },
      { icon: FileText, label: 'Terms of Service', color: Colors.primary },
      { icon: Shield, label: 'Privacy Policy', color: Colors.secondary },
      { icon: CreditCard, label: 'Refund Policy', color: Colors.accent },
      { icon: FileText, label: 'Cookie Policy', color: Colors.warning },
      { icon: Mail, label: 'Contact Us', color: Colors.primary },
    ],
  },
];

export default function SettingsScreen() {
  const { signOut, user } = useAuth();
  const router = useRouter();

  const handlePress = (label: string) => {
    if (label === 'Change Password') {
      router.push({
        pathname: '/(auth)/forgot-password',
        params: { fromSettings: 'true' },
      });
    } else if (label === 'Privacy & Security') {
      router.push('/privacy-security');
    } else if (label === 'Terms of Service') {
      Linking.openURL('https://krovaa.com/terms').catch(() =>
        Alert.alert('Error', 'Unable to open website link.')
      );
    } else if (label === 'Privacy Policy') {
      Linking.openURL('https://krovaa.com/privacy').catch(() =>
        Alert.alert('Error', 'Unable to open website link.')
      );
    } else if (label === 'Refund Policy') {
      Linking.openURL('https://krovaa.com/refund').catch(() =>
        Alert.alert('Error', 'Unable to open website link.')
      );
    } else if (label === 'Cookie Policy') {
      Linking.openURL('https://krovaa.com/cookie-policy').catch(() =>
        Alert.alert('Error', 'Unable to open website link.')
      );
    } else if (label === 'Contact Us' || label === 'Contact Support') {
      Linking.openURL('mailto:support@krovaa.com').catch(() =>
        Alert.alert('Error', 'Unable to open mail client. Please contact support@krovaa.com.')
      );
    } else if (['Notifications', 'Help Center'].includes(label)) {
      Alert.alert(label, `This option will open the ${label.toLowerCase()} screen/page.`);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      {SETTINGS_SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionCard}>
            {section.items.map((item, index) => {
              const isVersion = item.label === 'App Version';
              return (
                <TouchableOpacity
                  key={item.label}
                  disabled={isVersion}
                  onPress={() => handlePress(item.label)}
                  style={[
                    styles.settingItem,
                    index < section.items.length - 1 && styles.settingItemBorder,
                  ]}
                >
                  <View style={[styles.settingIcon, { backgroundColor: item.color + '15' }]}>
                    <item.icon size={18} color={item.color} />
                  </View>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  {isVersion ? (
                    <Text style={styles.versionValue}>1.0.0</Text>
                  ) : (
                    <ChevronRight size={16} color={Colors.gray400} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}

      <View style={styles.section}>
        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <LogOut size={18} color={Colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Spacing at the bottom of the list */}
      <View style={{ height: Spacing.xxl }} />
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
  section: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  settingItemBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.gray100,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  settingLabel: {
    flex: 1,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium as any,
    color: Colors.gray800,
  },
  versionValue: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium as any,
    color: Colors.gray500,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    gap: 8,
  },
  signOutText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.error,
  },
});
