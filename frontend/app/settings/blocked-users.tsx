import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { Colors, FontWeights, Spacing, BorderRadius, FontSizes } from '@/constants/theme';
import { getBlockedUsers, getUserProfile, unblockUser } from '@/lib/profileApi';

export default function BlockedUsersScreen() {
  const { session } = useAuth();
  const token = session?.access_token || '';

  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<Array<{ id: string; fullName?: string; avatar?: string; username?: string }>>([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getBlockedUsers(token);
      if (res.error) throw new Error(res.error);
      const ids: string[] = res.data || [];
      const details = await Promise.all(
        ids.map(async (id) => {
          try {
            const r = await getUserProfile(id);
            if (r.data && r.data.user) return { id, fullName: r.data.user.fullName, avatar: r.data.user.avatar, username: r.data.user.username };
          } catch {}
          return { id };
        })
      );
      setBlocked(details);
    } catch (err: any) {
      Alert.alert('Unable to load blocked users', err?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleUnblock = async (id: string) => {
    try {
      setLoading(true);
      const res = await unblockUser(token, id);
      if (res.error) throw new Error(res.error);
      // refresh
      await load();
    } catch (err: any) {
      Alert.alert('Unable to unblock', err?.message || 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Blocked Users</Text>
        <Text style={styles.headerSubtitle}>Users you have blocked. You can unblock them here.</Text>
      </View>

      <View style={styles.section}>
        {loading ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : blocked.length === 0 ? (
          <Text style={styles.empty}>You have not blocked anyone.</Text>
        ) : (
          blocked.map((u) => (
            <View key={u.id} style={styles.row}>
              <Image source={{ uri: u.avatar || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg' }} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{u.fullName || u.username || u.id}</Text>
                {u.username ? <Text style={styles.handle}>@{u.username}</Text> : null}
              </View>
              <TouchableOpacity style={styles.unblockBtn} onPress={() => handleUnblock(u.id)}>
                <Text style={styles.unblockText}>Unblock</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
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
  row: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: Spacing.md },
  name: { fontSize: FontSizes.md, fontWeight: FontWeights.semiBold as any, color: Colors.gray900 },
  handle: { color: Colors.gray500, marginTop: 2 },
  unblockBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.md },
  unblockText: { color: Colors.white, fontWeight: FontWeights.semiBold as any },
  empty: { color: Colors.gray500, padding: Spacing.md },
});
