import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bell, Lock, Circle as HelpCircle, LogOut, ChevronRight, Shield, Smartphone, Sparkles, Info } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { Colors, FontWeights, Spacing, BorderRadius, FontSizes } from '@/constants/theme';

const SETTINGS_SECTIONS = [
  {
    title: 'Account',
    items: [
      { icon: Lock, label: 'Change Password', color: Colors.primary },
      { icon: Shield, label: 'Privacy & Security', color: Colors.secondary },
      { icon: Smartphone, label: 'Two-Factor Auth', color: Colors.accent },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { icon: Bell, label: 'Notifications', color: Colors.warning },
      { icon: Sparkles, label: 'Features', color: '#8B5CF6' },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: HelpCircle, label: 'Help Center', color: Colors.secondary },
      { icon: Info, label: 'About Us', color: '#3B82F6' },
    ],
  },
];

export default function SettingsScreen() {
  const { signOut, user } = useAuth();
  const router = useRouter();

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
              const isFeatureRow = item.label === 'Features';

              return (
                <View key={item.label}>
                  <TouchableOpacity
                    style={[
                      styles.settingItem,
                      index < section.items.length - 1 && styles.settingItemBorder,
                    ]}
                    onPress={() => {
                      if (item.label === 'Privacy & Security') {
                        router.push('/settings/privacy');
                        return;
                      }

                      if (item.label === 'Notifications') {
                        router.push('/settings/notifications');
                        return;
                      }

                      if (item.label === 'Help Center') {
                        router.push('/settings/help-center');
                        return;
                      }

                      if (item.label === 'About Us') {
                        router.push('/settings/about-us');
                        return;
                      }

                      if (isFeatureRow) {
                        router.push('/settings/features');
                        return;
                      }
                    }}
                  >
                    <View style={[styles.settingIcon, { backgroundColor: item.color + '15' }]}>
                      <item.icon size={18} color={item.color} />
                    </View>
                    <Text style={styles.settingLabel}>{item.label}</Text>
                    <ChevronRight size={16} color={Colors.gray400} />
                  </TouchableOpacity>
                </View>
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

      <Text style={styles.versionText}>Version 1.0.0</Text>
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
  versionText: {
    textAlign: 'center',
    fontSize: FontSizes.xs,
    color: Colors.gray400,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
});
