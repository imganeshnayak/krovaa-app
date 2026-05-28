import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { getUserProfile } from '@/lib/profileApi';
import { Colors } from '@/constants/theme';

export default function PublicProfile() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ?? '';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!id) {
        setError('Missing user id');
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await getUserProfile(id);
        if (!mounted) return;
        if (error) {
          setError(error);
        } else if (data) {
          setProfile(data.user);
        }
      } catch (err) {
        setError('Failed to load profile');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [id]);

  if (loading) return <View style={styles.center}><ActivityIndicator /></View>;
  if (error) return <View style={styles.center}><Text>{error}</Text></View>;
  if (!profile) return <View style={styles.center}><Text>No profile found</Text></View>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        {profile.coverPhotoUrl ? (
          <Image source={{ uri: profile.coverPhotoUrl }} style={styles.cover} />
        ) : null}
        <View style={styles.avatarRow}>
          {profile.avatar ? (
            <Image source={{ uri: profile.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.placeholder}><Text style={styles.placeholderText}>{(profile.fullName || 'U').charAt(0)}</Text></View>
          )}
          <View style={styles.meta}>
            <Text style={styles.name}>{profile.fullName}</Text>
            {profile.username ? <Text style={styles.handle}>@{profile.username}</Text> : null}
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        <TouchableOpacity style={styles.messageBtn} onPress={() => router.push(`/chat/${profile.id}`)}>
          <Text style={styles.messageBtnText}>Message</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: Colors.white },
  cover: { width: '100%', height: 180, backgroundColor: Colors.gray100 },
  avatarRow: { flexDirection: 'row', padding: 16, alignItems: 'center' },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.gray200 },
  placeholder: { width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.gray200, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontSize: 28, color: Colors.gray600 },
  meta: { marginLeft: 12 },
  name: { fontSize: 20, fontWeight: '700', color: Colors.gray900 },
  handle: { color: Colors.gray600 },
  body: { padding: 16 },
  bio: { marginBottom: 12, color: Colors.gray800 },
  messageBtn: { backgroundColor: Colors.primary, padding: 12, borderRadius: 8, alignItems: 'center' },
  messageBtnText: { color: '#fff', fontWeight: '600' },
});
