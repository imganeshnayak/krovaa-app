import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Mail, Phone, Calendar, Compass, Briefcase, Star, IndianRupee, Globe, MapPin, ShieldCheck } from 'lucide-react-native';
import { getUserProfile } from '@/lib/profileApi';
import { Colors, BorderRadius, FontSizes, FontWeights, Spacing } from '@/constants/theme';

const { width } = Dimensions.get('window');

type ProfileUser = {
  id: string;
  fullName?: string;
  username?: string;
  profession?: string;
  userGoal?: string;
  location?: string;
  city?: string;
  email?: string;
  phoneNumber?: string;
  age?: number | null;
  gender?: string;
  avatar?: string;
  coverPhotoUrl?: string;
  bio?: string;
  skills?: string[];
  socialLinks?: Array<{ platform?: string; url?: string }>;
  stats?: { jobsDone?: number; reviews?: number; earned?: number };
};

export default function DetailedProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; fromChat?: string }>();
  const userId = String(params.id ?? '');
  const fromChatValue = Array.isArray(params.fromChat) ? params.fromChat[0] : params.fromChat;
  const fromChat = fromChatValue === 'true';
  const showBottomActions = !fromChat;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileUser | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      if (!userId) {
        if (mounted) {
          setError('Missing user id');
          setLoading(false);
        }
        return;
      }

      try {
        const { data, error: fetchError } = await getUserProfile(userId);
        if (!mounted) return;

        if (fetchError) {
          setError(fetchError);
        } else if (data?.user) {
          setProfile(data.user as ProfileUser);
        } else {
          setError('No profile found');
        }
      } catch {
        if (mounted) setError('Failed to load profile');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [userId]);

  const displayName = profile?.fullName || 'Unknown User';
  const handle = profile?.username ? `@${profile.username}` : '';
  const roleLabel = profile?.profession || 'Profile';
  const locationLabel = profile?.location || profile?.city || 'No location yet';
  const emailLabel = profile?.email || 'Not shared';
  const phoneLabel = profile?.phoneNumber || 'Not shared';
  const ageGenderLabel = [profile?.age ?? null, profile?.gender || ''].filter(Boolean).join(' · ') || 'Not shared';
  const goalLabel = profile?.userGoal === 'OFFER_SERVICE'
    ? 'Offering services'
    : profile?.userGoal === 'HIRE_PROFESSIONALS'
      ? 'Hiring professionals'
      : profile?.userGoal || 'Not set';
  const stats = profile?.stats || {};
  const skills = profile?.skills || [];
  const links = profile?.socialLinks || [];

  const skillsPreview = useMemo(() => skills.filter(Boolean), [skills]);
  const scrollBottomPadding = showBottomActions ? 108 : 28;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'No profile found'}</Text>
        <TouchableOpacity style={styles.backFallbackButton} onPress={() => router.back()}>
          <Text style={styles.backFallbackButtonText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: scrollBottomPadding }]} showsVerticalScrollIndicator={false}>
        <View style={styles.bannerContainer}>
          {profile.coverPhotoUrl ? (
            <Image source={{ uri: profile.coverPhotoUrl }} style={styles.bannerImage} />
          ) : (
            <View style={[styles.bannerImage, styles.bannerPlaceholder]} />
          )}

          <TouchableOpacity style={styles.floatingBackButton} activeOpacity={0.8} onPress={() => router.back()}>
            <ArrowLeft size={22} color="#000000" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {profile.avatar ? (
              <Image source={{ uri: profile.avatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>

          <Text style={styles.userNameText}>{displayName}</Text>
          <Text style={styles.roleText}>{roleLabel}</Text>
          <View style={styles.locationRow}>
            <MapPin size={16} color="#94A3B8" />
            <Text style={styles.locationText}>{locationLabel}</Text>
          </View>

          <View style={styles.badgeRow}>
            <View style={styles.badgePill}>
              <Text style={styles.badgeText}>{handle || '@unknown'}</Text>
            </View>
            <View style={styles.badgePill}>
              <Text style={styles.badgeText}><ShieldCheck size={13} color="#0EA5E9" /> {' '}None</Text>
            </View>
            <View style={styles.badgePill}>
              <Text style={styles.badgeText}><Star size={13} color="#F59E0B" /> {' '}{Number(stats.reviews ?? 0)} · 0</Text>
            </View>
          </View>

          {profile.bio ? (
            <View style={styles.bioCard}>
              <Text style={styles.bioText}>{profile.bio}</Text>
            </View>
          ) : null}

          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Quick Info</Text>

            <View style={styles.infoRow}>
              <Mail size={18} color="#0091FF" style={styles.infoIcon} />
              <View>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{emailLabel}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Phone size={18} color="#0091FF" style={styles.infoIcon} />
              <View>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{phoneLabel}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Calendar size={18} color="#0091FF" style={styles.infoIcon} />
              <View>
                <Text style={styles.infoLabel}>Age / Gender</Text>
                <Text style={styles.infoValue}>{ageGenderLabel}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Compass size={18} color="#0091FF" style={styles.infoIcon} />
              <View>
                <Text style={styles.infoLabel}>Goal</Text>
                <Text style={styles.infoValue}>{goalLabel}</Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillsWrapper}>
              {skillsPreview.length > 0 ? skillsPreview.map((skill, index) => (
                <View key={`${skill}-${index}`} style={styles.skillPill}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              )) : (
                <Text style={styles.emptyText}>No skills shared yet.</Text>
              )}
            </View>
          </View>

          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Links</Text>
            <View style={styles.linksWrapper}>
              {links.length > 0 ? links.map((link, index) => (
                <TouchableOpacity key={`${link.platform || 'link'}-${index}`} style={styles.linkButton} activeOpacity={0.8}>
                  <Globe size={16} color="#0091FF" />
                  <Text style={styles.linkButtonText}>{link.platform || link.url || 'link'}</Text>
                </TouchableOpacity>
              )) : (
                <Text style={styles.emptyText}>No public links shared.</Text>
              )}
            </View>
          </View>

          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Activity</Text>
            <View style={styles.activityRow}>
              <View style={styles.activityStat}>
                <Briefcase size={20} color="#0091FF" />
                <Text style={styles.activityNumber}>{Number(stats.jobsDone ?? 0)}</Text>
                <Text style={styles.activityLabel}>Projects</Text>
              </View>
              <View style={styles.activityStat}>
                <Star size={20} color="#FFB000" />
                <Text style={styles.activityNumber}>{Number(stats.reviews ?? 0)}</Text>
                <Text style={styles.activityLabel}>Reviews</Text>
              </View>
              <View style={styles.activityStat}>
                <IndianRupee size={20} color="#00E676" />
                <Text style={styles.activityNumber}>{Number(stats.earned ?? 0)}</Text>
                <Text style={styles.activityLabel}>Earned</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {showBottomActions && (
        <View style={styles.bottomActionBar}>
          <TouchableOpacity style={[styles.actionButton, styles.messageBtn]} onPress={() => router.push({ pathname: '/chat/[id]', params: { id: String(profile.id) } })}>
            <Text style={styles.messageBtnText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.hiredBtn]}>
            <Text style={styles.hiredBtnText}>Hired</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.saveBtn]}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContainer: {},
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#F8FAFC' },
  errorText: { color: Colors.gray700, fontSize: FontSizes.md, textAlign: 'center', marginBottom: 16 },
  backFallbackButton: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: BorderRadius.full, backgroundColor: Colors.primary },
  backFallbackButtonText: { color: Colors.white, fontWeight: FontWeights.semiBold as any },
  bannerContainer: { width: '100%', height: 180, position: 'relative' },
  bannerImage: { width: '100%', height: '100%' },
  bannerPlaceholder: { backgroundColor: Colors.gray200 },
  floatingBackButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -28,
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 20,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    marginTop: -54,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    elevation: 3,
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E2E8F0' },
  avatarPlaceholderText: { fontSize: 28, color: Colors.gray600, fontWeight: '700' },
  userNameText: { fontSize: 24, fontWeight: '700', color: '#0F172A', marginTop: 12 },
  roleText: { fontSize: 16, fontWeight: '600', color: '#0091FF', marginTop: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  locationText: { fontSize: 14, color: '#94A3B8' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 15, marginBottom: 8 },
  badgePill: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeText: { fontSize: 13, color: '#64748B' },
  bioCard: {
    width: '100%',
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  bioText: { fontSize: 15, color: '#334155', lineHeight: 22 },
  sectionBox: { width: '100%', backgroundColor: '#FAFAFA', borderRadius: 20, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  infoIcon: { marginRight: 15 },
  infoLabel: { fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: '600' },
  infoValue: { fontSize: 14, color: '#334155', fontWeight: '500', marginTop: 1 },
  skillsWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillPill: { backgroundColor: '#E0F2FE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#BAE6FD' },
  skillText: { color: '#0369A1', fontSize: 13, fontWeight: '500' },
  emptyText: { color: Colors.gray500, fontSize: FontSizes.sm },
  linksWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  linkButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E0F2FE', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  linkButtonText: { color: '#0369A1', fontSize: 13, fontWeight: '500' },
  activityRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, gap: 8 },
  activityStat: { alignItems: 'center', flex: 1, backgroundColor: '#FFF', borderRadius: 16, paddingVertical: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  activityNumber: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginTop: 4 },
  activityLabel: { fontSize: 12, color: '#94A3B8', marginTop: 1, textAlign: 'center' },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionButton: { flex: 1, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  messageBtn: { borderWidth: 1, borderColor: '#0091FF', backgroundColor: '#FFFFFF' },
  messageBtnText: { color: '#0091FF', fontWeight: '600', fontSize: 14 },
  hiredBtn: { backgroundColor: '#CBD5E1' },
  hiredBtnText: { color: '#64748B', fontWeight: '600', fontSize: 14 },
  saveBtn: { borderWidth: 1, borderColor: '#0091FF', backgroundColor: '#FFFFFF' },
  saveBtnText: { color: '#0091FF', fontWeight: '600', fontSize: 14 },
});
