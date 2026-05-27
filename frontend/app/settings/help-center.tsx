import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CircleHelp, Mail, MessageSquare, PhoneCall, ArrowRight, BookOpen } from 'lucide-react-native';
import { Colors, FontWeights, Spacing, BorderRadius, FontSizes } from '@/constants/theme';

const FAQ_ITEMS = [
  {
    icon: BookOpen,
    title: 'How do I get started?',
    description: 'Set up your profile, explore jobs, and start chatting with people who match your needs.',
  },
  {
    icon: MessageSquare,
    title: 'How do chats work?',
    description: 'Open a conversation from the chat tab and send messages instantly once both users are connected.',
  },
  {
    icon: CircleHelp,
    title: 'How do I manage account settings?',
    description: 'Use Settings to update privacy, notifications, and feature preferences.',
  },
];

export default function HelpCenterScreen() {
  const handleContactSupport = () => {
    Linking.openURL('mailto:support@krovaa.app?subject=Krovaa%20Support%20Request');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Help Center</Text>
        <Text style={styles.headerSubtitle}>Find answers quickly or contact the support team directly.</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {FAQ_ITEMS.map((item, index) => (
            <View key={item.title} style={[styles.faqItem, index < FAQ_ITEMS.length - 1 && styles.faqItemBorder]}>
              <View style={styles.faqIcon}>
                <item.icon size={18} color={Colors.primary} />
              </View>
              <View style={styles.faqTextWrap}>
                <Text style={styles.faqTitle}>{item.title}</Text>
                <Text style={styles.faqDescription}>{item.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Support</Text>

          <TouchableOpacity style={styles.supportButton} onPress={handleContactSupport} activeOpacity={0.85}>
            <View style={[styles.supportIcon, { backgroundColor: Colors.primary + '15' }]}>
              <Mail size={18} color={Colors.primary} />
            </View>
            <View style={styles.supportCopy}>
              <Text style={styles.supportTitle}>Contact Support</Text>
              <Text style={styles.supportDescription}>Send us an email and we’ll respond as soon as possible.</Text>
            </View>
            <ArrowRight size={16} color={Colors.gray400} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.supportButton} onPress={() => Linking.openURL('tel:+911234567890')} activeOpacity={0.85}>
            <View style={[styles.supportIcon, { backgroundColor: Colors.secondary + '15' }]}>
              <PhoneCall size={18} color={Colors.secondary} />
            </View>
            <View style={styles.supportCopy}>
              <Text style={styles.supportTitle}>Call Support</Text>
              <Text style={styles.supportDescription}>Speak with our team for urgent help.</Text>
            </View>
            <ArrowRight size={16} color={Colors.gray400} />
          </TouchableOpacity>
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
  faqItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  faqItemBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.gray100,
  },
  faqIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqTextWrap: {
    flex: 1,
  },
  faqTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
  },
  faqDescription: {
    marginTop: 4,
    color: Colors.gray600,
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.gray100,
  },
  supportIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportCopy: {
    flex: 1,
  },
  supportTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
  },
  supportDescription: {
    marginTop: 2,
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 18,
  },
});
