import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Lock, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors, FontWeights, Spacing, BorderRadius, FontSizes } from '@/constants/theme';

export default function PrivacyScreen() {
  const router = useRouter();

  const SETTINGS = [
    { icon: Lock, label: 'Blocked users', description: 'Manage users you have blocked', route: '/settings/blocked-users' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <Text style={styles.headerSubtitle}>Manage users you have blocked.</Text>
      </View>

      <View style={styles.section}>
        {SETTINGS.map((s) => (
          <TouchableOpacity key={s.label} style={styles.item} onPress={() => s.route && router.push(s.route)}>
            <View style={styles.iconWrap}>
              <s.icon size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemLabel}>{s.label}</Text>
              {s.description ? <Text style={styles.itemDesc}>{s.description}</Text> : null}
            </View>
            <ChevronRight size={16} color={Colors.gray400} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray50 },
  header: { paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md, backgroundColor: Colors.white },
  headerTitle: { fontSize: FontSizes.xxxl, fontWeight: FontWeights.extraBold as any, color: Colors.gray900 },
  headerSubtitle: { marginTop: Spacing.sm, color: Colors.gray600 },
  section: { marginTop: Spacing.md, paddingHorizontal: Spacing.lg },
  item: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  iconWrap: { width: 40, height: 40, borderRadius: BorderRadius.md, backgroundColor: Colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  itemLabel: { fontSize: FontSizes.md, fontWeight: FontWeights.semiBold as any, color: Colors.gray900 },
  itemDesc: { color: Colors.gray500, marginTop: 4, fontSize: FontSizes.sm },
});
