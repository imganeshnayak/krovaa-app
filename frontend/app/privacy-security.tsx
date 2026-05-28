import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontWeights, Spacing, BorderRadius, FontSizes } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getBlockedUsers, unblockUser, type BlockedUserDetail } from '@/lib/profileApi';

export default function PrivacySecurityScreen() {
  const router = useRouter();
  const { session } = useAuth();
  
  // Mock settings switches
  const [isProfilePublic, setIsProfilePublic] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);

  // Live blocked users list state
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const fetchBlockedUsers = async () => {
    if (!session?.access_token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await getBlockedUsers(session.access_token);
      if (result.error) {
        Alert.alert('Error', result.error);
      } else if (result.data) {
        setBlockedUsers(result.data.blockedUsers);
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to fetch blocked users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockedUsers();
  }, [session?.access_token]);

  const handleUnblock = async (userId: string, fullName: string) => {
    if (!session?.access_token) return;

    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${fullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'destructive',
          onPress: async () => {
            try {
              setRefreshingId(userId);
              const result = await unblockUser(session.access_token, userId);
              
              if (result.error) {
                Alert.alert('Error', result.error);
              } else {
                // Success! Immediately filter out from active UI state
                setBlockedUsers((prev) => prev.filter((user) => user.id !== userId));
                Alert.alert('Success', `${fullName} has been unblocked successfully.`);
              }
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to unblock user.');
            } finally {
              setRefreshingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.gray900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Security</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Mock Privacy Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy Settings</Text>
          <View style={styles.card}>
            {/* Profile Visibility */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Public Profile</Text>
                <Text style={styles.settingDescription}>Allow everyone to view your jobs and posts</Text>
              </View>
              <Switch
                value={isProfilePublic}
                onValueChange={setIsProfilePublic}
                trackColor={{ false: Colors.gray200, true: Colors.secondary + '40' }}
                thumbColor={isProfilePublic ? Colors.secondary : Colors.gray400}
              />
            </View>

            {/* Read Receipts */}
            <View style={[styles.settingRow, styles.rowBorder]}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Read Receipts</Text>
                <Text style={styles.settingDescription}>Let others see when you have read their messages</Text>
              </View>
              <Switch
                value={readReceipts}
                onValueChange={setReadReceipts}
                trackColor={{ false: Colors.gray200, true: Colors.secondary + '40' }}
                thumbColor={readReceipts ? Colors.secondary : Colors.gray400}
              />
            </View>
          </View>
        </View>

        {/* Mock Security Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Settings</Text>
          <View style={styles.card}>
            {/* Two-Factor Auth */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Two-Factor Authentication</Text>
                <Text style={styles.settingDescription}>Protect your account with an extra layer of security</Text>
              </View>
              <Switch
                value={twoFactorAuth}
                onValueChange={setTwoFactorAuth}
                trackColor={{ false: Colors.gray200, true: Colors.secondary + '40' }}
                thumbColor={twoFactorAuth ? Colors.secondary : Colors.gray400}
              />
            </View>
          </View>
        </View>

        {/* Live Blocked Users Section */}
        <View style={[styles.section, { marginBottom: Spacing.xl }]}>
          <Text style={styles.sectionTitle}>Manage Blocked Users</Text>
          <View style={styles.card}>
            {loading ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loaderText}>Loading blocked users...</Text>
              </View>
            ) : blockedUsers.length > 0 ? (
              blockedUsers.map((user, index) => (
                <View
                  key={user.id}
                  style={[
                    styles.blockedRow,
                    index < blockedUsers.length - 1 && styles.rowBorder,
                  ]}
                >
                  <Image source={{ uri: user.avatar }} style={styles.avatar} />
                  <View style={styles.blockedInfo}>
                    <Text style={styles.blockedName} numberOfLines={1}>{user.fullName}</Text>
                    <Text style={styles.blockedUsername} numberOfLines={1}>@{user.username}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.unblockButton}
                    disabled={refreshingId === user.id}
                    onPress={() => handleUnblock(user.id, user.fullName)}
                    activeOpacity={0.7}
                  >
                    {refreshingId === user.id ? (
                      <ActivityIndicator size="xs" color={Colors.primary} />
                    ) : (
                      <Text style={styles.unblockText}>Unblock</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="shield-checkmark-outline" size={32} color={Colors.gray400} />
                </View>
                <Text style={styles.emptyStateTitle}>No Blocked Users</Text>
                <Text style={styles.emptyStateDescription}>
                  Users you block will appear here. They won't be able to message you or view your profile.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.gray100,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray900,
  },
  section: {
    marginTop: Spacing.lg,
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
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  settingInfo: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  settingLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },
  rowBorder: {
    borderTopWidth: 0.5,
    borderTopColor: Colors.gray100,
  },
  blockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.md,
    backgroundColor: Colors.gray100,
  },
  blockedInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  blockedName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
    marginBottom: 2,
  },
  blockedUsername: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },
  unblockButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  unblockText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.primary,
  },
  loaderContainer: {
    paddingVertical: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: Spacing.sm,
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  emptyState: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  emptyIconContainer: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyStateTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray900,
    marginBottom: Spacing.xs,
  },
  emptyStateDescription: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 18,
  },
});
