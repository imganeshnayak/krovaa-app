import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Star, MapPin, CreditCard as Edit3, ChevronRight, Shield, Award, Briefcase } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { Colors, FontWeights, Spacing, BorderRadius, FontSizes } from '@/constants/theme';

const STATS = [
  { label: 'Jobs Done', value: '47' },
  { label: 'Reviews', value: '4.9' },
  { label: 'Earned', value: '$12.4K' },
];

const MENU_ITEMS = [
  { icon: Shield, label: 'Verification', color: Colors.primary },
  { icon: Award, label: 'Badges & Achievements', color: Colors.accent },
  { icon: Briefcase, label: 'My Portfolio', color: Colors.secondary },
  { icon: Star, label: 'Reviews & Ratings', color: '#F59E0B' },
];

export default function ProfileScreen() {
  const { user } = useAuth();
  const fullName = user?.user_metadata?.full_name || 'User';
  const email = user?.email || 'user@example.com';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerBg}>
        <View style={styles.profileSection}>
          <Image
            source={{ uri: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200' }}
            style={styles.avatar}
          />
          <TouchableOpacity style={styles.editButton}>
            <Edit3 size={14} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.name}>{fullName}</Text>
          <View style={styles.locationRow}>
            <MapPin size={14} color={Colors.gray600} />
            <Text style={styles.location}>San Francisco, CA</Text>
          </View>
          <Text style={styles.email}>{email}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        {STATS.map((stat) => (
          <View key={stat.label} style={styles.statItem}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.menuSection}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity key={item.label} style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
              <item.icon size={20} color={item.color} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <ChevronRight size={18} color={Colors.gray400} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.bioSection}>
        <Text style={styles.bioTitle}>About</Text>
        <Text style={styles.bioText}>
          Experienced freelance developer specializing in mobile apps and web development.
          Passionate about creating beautiful, functional user experiences.
        </Text>
      </View>

      <View style={styles.skillsSection}>
        <Text style={styles.skillsTitle}>Skills</Text>
        <View style={styles.skillsRow}>
          {['React Native', 'TypeScript', 'Node.js', 'UI/UX', 'Firebase'].map((skill) => (
            <View key={skill} style={styles.skillChip}>
              <Text style={styles.skillText}>{skill}</Text>
            </View>
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
  headerBg: {
    backgroundColor: Colors.white,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  profileSection: {
    alignItems: 'center',
    paddingTop: 80,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  editButton: {
    position: 'absolute',
    top: 158,
    right: '38%',
    backgroundColor: Colors.primary,
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray900,
    marginTop: Spacing.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 2,
  },
  location: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    marginLeft: 4,
  },
  email: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginTop: -Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray900,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    marginTop: 2,
  },
  menuSection: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  menuLabel: {
    flex: 1,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium as any,
    color: Colors.gray800,
  },
  bioSection: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  bioTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
    marginBottom: Spacing.sm,
  },
  bioText: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    lineHeight: 22,
  },
  skillsSection: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  skillsTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    backgroundColor: Colors.primary + '12',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  skillText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: FontWeights.medium as any,
  },
});
