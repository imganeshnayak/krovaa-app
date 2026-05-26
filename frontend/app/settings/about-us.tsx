import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ArrowRight, BookOpen, Cookie, FileText, Mail, Shield } from 'lucide-react-native';
import { Colors, FontWeights, Spacing, BorderRadius, FontSizes } from '@/constants/theme';

const POLICY_LINKS = [
  {
    icon: BookOpen,
    label: 'Terms of Service',
    url: 'https://krovaa.com/terms',
  },
  {
    icon: Shield,
    label: 'Privacy Policy',
    url: 'https://krovaa.com/privacy',
  },
  {
    icon: FileText,
    label: 'Refund Policy',
    url: 'https://krovaa.com/refund',
  },
  {
    icon: Cookie,
    label: 'Cookie Policy',
    url: 'https://krovaa.com/cookie-policy',
  },
];

export default function AboutUsScreen() {
  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  const handleContactUs = () => {
    Linking.openURL('mailto:support@krovaa.app?subject=Krovaa%20Contact%20Request');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>About Us</Text>
        <Text style={styles.headerSubtitle}>Learn more about Krovaa and review the policies that guide the app.</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>App Version</Text>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Current Version</Text>
            <Text style={styles.versionValue}>1.0.0</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Support</Text>
          <TouchableOpacity style={styles.contactItem} onPress={handleContactUs} activeOpacity={0.85}>
            <View style={styles.contactIcon}>
              <Mail size={18} color={Colors.primary} />
            </View>
            <View style={styles.contactCopy}>
              <Text style={styles.contactLabel}>Contact Us</Text>
              <Text style={styles.contactDescription}>Send a message to our support team.</Text>
            </View>
            <ArrowRight size={16} color={Colors.gray400} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Policies</Text>
          {POLICY_LINKS.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.policyItem, index < POLICY_LINKS.length - 1 && styles.policyItemBorder]}
              onPress={() => openLink(item.url)}
              activeOpacity={0.85}
            >
              <View style={styles.policyIcon}>
                <item.icon size={18} color={Colors.primary} />
              </View>
              <Text style={styles.policyLabel}>{item.label}</Text>
              <ArrowRight size={16} color={Colors.gray400} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
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
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  versionLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium as any,
    color: Colors.gray800,
  },
  versionValue: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.primary,
  },
  policyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  policyItemBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.gray100,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.gray100,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactCopy: {
    flex: 1,
  },
  contactLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium as any,
    color: Colors.gray800,
  },
  contactDescription: {
    marginTop: 2,
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 18,
  },
  policyIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  policyLabel: {
    flex: 1,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium as any,
    color: Colors.gray800,
  },
});
