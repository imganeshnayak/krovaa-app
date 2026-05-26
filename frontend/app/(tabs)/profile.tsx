import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, Modal, TextInput, Alert, Linking,
  Animated, useWindowDimensions, Pressable, Dimensions, PanResponder,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  Star, MapPin, Edit3, ChevronRight, Shield, ShieldCheck, Award,
  Briefcase, X, Video as VideoIcon, Camera, Code, Palette, Hammer,
  GanttChart, Users, GraduationCap, UserCircle, HelpCircle, Share2,
  Link2, ExternalLink, Facebook, Twitter, Instagram, Youtube, Linkedin,
  Github, Globe, Mail, Phone, User, Calendar, MapPinned, CheckCircle,
  Clock, BadgeCheck, ImagePlus, Plus, Trash2, Sparkles,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { ResizeMode, Video } from 'expo-av';
import { useAuth } from '@/context/AuthContext';
import { Colors, FontWeights, Spacing, BorderRadius, FontSizes } from '@/constants/theme';
import {
  applyForVerification, deleteCoverPhoto, deleteProfilePhoto,
  getCurrentUserProfile, getRatingEligibility, getUserRatings,
  getVerificationFee, getVerificationStatus, rateUser,
  type UserProfile, updateUserProfile, uploadCoverPhoto, uploadProfilePhoto,
} from '@/lib/profileApi';
import { createMyPost, deleteMyPost, getMyPosts, MyPost, updateMyPostCaption } from '@/lib/postsApi';
import { Button } from '@/components/Button';
import Stars from '@/components/Stars';
import ShareProfileAction from '@/components/share/ShareProfileAction';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = Spacing.lg;
const CARD_GAP = 2;
const COL_COUNT = 3;
const POST_ITEM_WIDTH = (SCREEN_WIDTH - CARD_MARGIN * 2 - Spacing.md * 2 - (COL_COUNT - 1) * CARD_GAP) / COL_COUNT;

const MENU_ITEMS = [
  { icon: Shield, label: 'Verification', color: Colors.primary, desc: 'Verify your identity' },
  { icon: Award, label: 'Badges & Achievements', color: Colors.accent, desc: 'Your earned badges' },
  { icon: Star, label: 'Reviews & Ratings', color: '#F59E0B', desc: 'See what others say' },
];

const PROFESSION_OPTIONS = ['tech', 'creative', 'engineering', 'professional', 'freelancer', 'student', 'none', 'other'] as const;
const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'] as const;

const CATEGORIES = [
  { id: "tech", label: "Tech", icon: Code },
  { id: "creative", label: "Creative", icon: Palette },
  { id: "engineering", label: "Engineering", icon: Hammer },
  { id: "professional", label: "Professional", icon: GanttChart },
  { id: "freelancer", label: "Freelancer", icon: Users },
  { id: "student", label: "Student", icon: GraduationCap },
  { id: "none", label: "None", icon: UserCircle },
  { id: "other", label: "Other", icon: HelpCircle },
];

const SUB_PROFESSIONS: Record<string, string[]> = {
  tech: ["Software Developer", "Web Developer", "Data Scientist", "AI / ML Engineer", "Cybersecurity Analyst", "DevOps Engineer", "Mobile App Developer"],
  creative: ["UI/UX Designer", "Graphic Designer", "3D Designer", "2D Designer", "Content Creator", "Video Editor", "Photographer", "Videographer", "Artist / Illustrator", "Musician"],
  engineering: ["Civil Engineer", "Mechanical Engineer", "Electrical Engineer", "Architect", "Structural Engineer"],
  professional: ["Product Manager", "Digital Marketer", "Doctor", "Nurse", "Pharmacist", "Lawyer", "Chartered Accountant", "Teacher / Educator", "Consultant"],
};

const PROFESSIONAL_CATEGORIES: ProfessionOption[] = ['tech', 'creative', 'engineering', 'professional'];

type ProfessionOption = (typeof PROFESSION_OPTIONS)[number];
type VerificationStatus = 'none' | 'pending' | 'verified' | 'rejected';

type ProfileRating = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewer: {
    id: string;
    fullName: string;
    avatar: string;
    username: string;
  };
};

const SOCIAL_PLATFORM_OPTIONS = [
  { value: 'facebook', label: 'Facebook', icon: Facebook },
  { value: 'twitter', label: 'Twitter / X', icon: Twitter },
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'youtube', label: 'YouTube', icon: Youtube },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { value: 'github', label: 'GitHub', icon: Github },
  { value: 'website', label: 'Website', icon: Globe },
  { value: 'other', label: 'Other', icon: Link2 },
];

const SOCIAL_COLORS: Record<string, string> = {
  facebook: '#1877F2', twitter: '#1DA1F2', instagram: '#E4405F',
  youtube: '#FF0000', linkedin: '#0A66C2', github: '#333333',
  website: Colors.primary, other: Colors.gray600,
};

function normalizeProfession(value: string): ProfessionOption {
  const normalized = value.trim().toLowerCase() as ProfessionOption;
  return (PROFESSION_OPTIONS as readonly string[]).includes(normalized) ? normalized : 'none';
}

function formatProfessionLabel(value: ProfessionOption) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function formatGoal(goal?: string) {
  if (!goal) return '';
  if (goal === 'OFFER_SERVICE') return 'Offering services';
  if (goal === 'HIRE_PROFESSIONALS') return 'Hiring professionals';
  return goal;
}

const getSocialIcon = (platform: string) => {
  const value = platform.toLowerCase();
  if (value.includes('facebook')) return Facebook;
  if (value.includes('twitter')) return Twitter;
  if (value.includes('instagram')) return Instagram;
  if (value.includes('youtube')) return Youtube;
  if (value.includes('linkedin')) return Linkedin;
  if (value.includes('github')) return Github;
  return Globe;
};

function SkeletonBlock({ width, height, borderRadius = BorderRadius.md, style }: {
  width?: number | string; height?: number | string; borderRadius?: number; style?: any;
}) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[{ width: width as any, height: height as any, borderRadius, backgroundColor: Colors.gray200, opacity }, style]}
    />
  );
}

function ProfileSkeleton() {
  return (
    <View style={{ paddingHorizontal: CARD_MARGIN }}>
      <SkeletonBlock width="100%" height={170} borderRadius={BorderRadius.xl} style={{ marginBottom: -46 }} />
      <View style={{ alignItems: 'center', marginTop: 0 }}>
        <SkeletonBlock width={110} height={110} borderRadius={999} style={{ borderWidth: 4, borderColor: Colors.white }} />
        <SkeletonBlock width={180} height={24} borderRadius={6} style={{ marginTop: 16 }} />
        <SkeletonBlock width={120} height={16} borderRadius={6} style={{ marginTop: 8 }} />
        <SkeletonBlock width={90} height={14} borderRadius={6} style={{ marginTop: 6 }} />
      </View>
      <SkeletonBlock width="100%" height={80} borderRadius={BorderRadius.lg} style={{ marginTop: 24 }} />
      <SkeletonBlock width="100%" height={180} borderRadius={BorderRadius.lg} style={{ marginTop: 16 }} />
      <SkeletonBlock width="100%" height={90} borderRadius={BorderRadius.lg} style={{ marginTop: 16 }} />
      <SkeletonBlock width="100%" height={90} borderRadius={BorderRadius.lg} style={{ marginTop: 16 }} />
    </View>
  );
}

function SectionCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

function AnimatedPressable({ children, onPress, style, activeOpacity = 0.92, ...props }: any) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} {...props}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

export default function ProfileScreen() {
  const { session, user: currentUser, loading: authLoading, signInDev } = useAuth() as any;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [localAvatarPreview, setLocalAvatarPreview] = useState<string | null>(null);
  const [localCoverPreview, setLocalCoverPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [photoPickerTarget, setPhotoPickerTarget] = useState<'avatar' | 'cover' | null>(null);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postUploading, setPostUploading] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);
  const [posts, setPosts] = useState<MyPost[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('none');
  const [verificationFee, setVerificationFee] = useState(0);
  const [verificationRequestedAt, setVerificationRequestedAt] = useState<string | null>(null);
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [ratings, setRatings] = useState<ProfileRating[]>([]);
  const [ratingsSummary, setRatingsSummary] = useState({ averageRating: 0, totalRatings: 0 });
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [showAllRatings, setShowAllRatings] = useState(false);
  const [canRateUser, setCanRateUser] = useState(false);
  const [ratingEligibilityReason, setRatingEligibilityReason] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showRatingsModal, setShowRatingsModal] = useState(false);
  const [showBadgesModal, setShowBadgesModal] = useState(false);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);

  const mediaViewerAnim = useRef(new Animated.Value(0)).current;
  const mediaViewerPan = useRef(new Animated.ValueXY()).current;
  const mediaViewerScale = useRef(new Animated.Value(0.92)).current;

  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(0)).current;

  const { width } = useWindowDimensions();
  const isTablet = width >= 700;
  const avatarSize = isTablet ? 140 : 110;
  const coverHeight = isTablet ? 220 : 170;

  const [postForm, setPostForm] = useState({
    caption: '',
    mediaItems: [] as Array<{ uri: string; mimeType: string }>,
  });

  const [editForm, setEditForm] = useState({
    fullName: '',
    city: '',
    pincode: '',
    phoneNumber: '',
    age: '',
    gender: '',
    profession: 'none' as string,
    skillsText: '',
    expertiseSelections: [] as string[],
    bio: '',
    avatar: '',
    userGoal: '',
    socialLinks: [] as Array<{ platform: string; url: string }>,
    customProfession: '',
    selectedCategory: '',
    coverPhoto: '',
  });

  useEffect(() => {
    let isMounted = true;
    async function fetchProfile() {
      if (!session?.access_token) {
        setError('No authentication token available');
        setLoading(false);
        return;
      }
      if (session.access_token === 'dev-token') {
        setLoading(false);
        return;
      }
      try {
        const { data, error: fetchError } = await getCurrentUserProfile(session.access_token);
        if (isMounted) {
          if (fetchError) setError(fetchError);
          else if (data) {
            setProfile(data.user);
            if (session?.access_token && data?.user && currentUser && String(data.user.id) !== String(currentUser.id)) {
              try {
                const { data: eligData } = await getRatingEligibility(session.access_token, data.user.id);
                if (eligData) {
                  setCanRateUser(Boolean(eligData.canRate));
                  setRatingEligibilityReason(eligData.reason || '');
                }
              } catch { setCanRateUser(false); }
            }
          }
        }
      } catch { if (isMounted) setError('Failed to load profile'); }
      finally { if (isMounted) setLoading(false); }
    }
    fetchProfile();
    return () => { isMounted = false; };
  }, [session?.access_token]);

  useEffect(() => {
    if (!__DEV__) return;
    if (!session?.access_token) return;
    if (profile) return;
    if (!currentUser) return;

    const devProfile = {
      id: currentUser.id,
      username: currentUser.username || 'dev',
      fullName: currentUser.fullName || currentUser.user_metadata?.full_name || currentUser.username || 'Dev User',
      email: currentUser.email,
      avatar: (currentUser as any).avatar || '',
      coverPhotoUrl: '',
      bio: 'Developer preview account — this is a local preview with example data. Edit to test save flows.',
      skills: ['Photoshop', 'UI/UX', 'React Native'],
      socialLinks: [
        { platform: 'website', url: 'https://example.com' },
        { platform: 'instagram', url: 'instagram.com/dev' },
      ],
      stats: { jobsDone: 0, reviews: 0, earned: 0 },
      userGoal: '',
      profession: 'none',
      phoneNumber: '',
      city: '',
      pincode: '',
      age: null,
      gender: '',
      createdAt: new Date().toISOString(),
    } as unknown as UserProfile;

    setProfile(devProfile);
    setLoading(false);
    setError(null);

    const samplePosts: MyPost[] = [
      { id: 'p1', mediaUrl: 'https://picsum.photos/600/600?random=1', mediaType: 'image', caption: 'Recent project: mobile app UI', createdAt: new Date().toISOString() } as MyPost,
      { id: 'p2', mediaUrl: 'https://picsum.photos/600/600?random=2', mediaType: 'image', caption: 'Portfolio sample — branding work', createdAt: new Date().toISOString() } as MyPost,
    ];
    setPosts(samplePosts); setPostsLoading(false); setPostsError(null);

    const sampleRatings: ProfileRating[] = [
      { id: 'r1', rating: 5, comment: 'Great work, on time and communication was excellent.', createdAt: new Date().toISOString(), reviewer: { id: 'u2', fullName: 'Client One', avatar: '', username: 'client1' } },
    ];
    setRatings(sampleRatings as any);
    setRatingsSummary({ averageRating: 5, totalRatings: 1 });
    setVerificationStatus('verified'); setVerificationFee(0);
  }, [session?.access_token, currentUser, profile]);

  useEffect(() => {
    let isMounted = true;
    async function fetchPosts() {
      if (!session?.access_token) { if (isMounted) setPostsLoading(false); return; }
      if (session.access_token === 'dev-token') { if (isMounted) setPostsLoading(false); return; }
      try {
        const { data, error: fetchError } = await getMyPosts(session.access_token);
        if (!isMounted) return;
        if (fetchError) setPostsError(fetchError);
        else if (data) setPosts(data.posts);
      } catch { if (isMounted) setPostsError('Failed to load posts'); }
      finally { if (isMounted) setPostsLoading(false); }
    }
    fetchPosts();
    return () => { isMounted = false; };
  }, [session?.access_token]);

  useEffect(() => {
    let isMounted = true;
    async function fetchVerificationState() {
      if (!session?.access_token) return;
      if (session.access_token === 'dev-token') return;
      try {
        const [statusResult, feeResult] = await Promise.all([
          getVerificationStatus(session.access_token),
          getVerificationFee(),
        ]);
        if (!isMounted) return;
        if (statusResult.data) {
          setVerificationStatus(statusResult.data.verificationStatus as VerificationStatus);
          setVerificationFee(statusResult.data.verificationFee || 0);
          setVerificationRequestedAt(statusResult.data.verificationRequestedAt || null);
        }
        if (feeResult.data) setVerificationFee(feeResult.data.fee || 0);
      } catch { if (isMounted) setVerificationStatus('none'); }
    }
    fetchVerificationState();
    return () => { isMounted = false; };
  }, [session?.access_token]);

  useEffect(() => {
    if (!loading && profile && !error) {
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 500, useNativeDriver: true,
      }).start();
    }
  }, [loading, profile, error, fadeAnim]);

  useEffect(() => {
    if (photoPickerTarget !== null) {
      Animated.spring(sheetAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      sheetAnim.setValue(0);
    }
  }, [photoPickerTarget, sheetAnim]);

  const handleOpenEditModal = () => {
    if (profile) {
      let selectedCategory = '';
      let customProfession = '';
      let expertiseSelections: string[] = [];
      if (profile.profession) {
        if (profile.profession === "none") selectedCategory = "none";
        else if (profile.profession === "freelancer") selectedCategory = "freelancer";
        else if (profile.profession === "student") selectedCategory = "student";
        else {
          let found = false;
          for (const [cat, subProfs] of Object.entries(SUB_PROFESSIONS)) {
            if (subProfs.includes(profile.profession)) { selectedCategory = cat; found = true; break; }
          }
          if (!found) { selectedCategory = "other"; customProfession = profile.profession; }
        }
      }

      if (selectedCategory && SUB_PROFESSIONS[selectedCategory]) {
        expertiseSelections = profile.skills.filter((skill) => SUB_PROFESSIONS[selectedCategory].includes(skill));
      }

      setEditForm({
        fullName: profile.fullName, city: profile.city || profile.location || '',
        pincode: profile.pincode || '', phoneNumber: profile.phoneNumber || '',
        age: profile.age !== null && profile.age !== undefined ? String(profile.age) : '',
        gender: profile.gender || '', profession: profile.profession || 'none',
        skillsText: profile.skills.filter((skill) => !expertiseSelections.includes(skill)).join(', '),
        expertiseSelections,
        bio: profile.bio, avatar: profile.avatar,
        coverPhoto: profile.coverPhotoUrl || '', userGoal: profile.userGoal || '',
        socialLinks: profile.socialLinks || [], selectedCategory, customProfession,
      });
      setEditError(null);
      setShowEditModal(true);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditForm({ fullName: '', city: '', pincode: '', phoneNumber: '', age: '', gender: '', profession: 'none', skillsText: '', expertiseSelections: [], bio: '', avatar: '', userGoal: '', socialLinks: [], customProfession: '', selectedCategory: '', coverPhoto: '' });
    setEditError(null);
  };

  const handleOpenPostModal = () => {
    setEditingPostId(null); setPostError(null);
    setPostForm({ caption: '', mediaItems: [] });
    setShowPostModal(true);
  };

  const handleOpenEditPostModal = (post: MyPost) => {
    setEditingPostId(post.id); setPostError(null);
    setPostForm({ caption: post.caption, mediaItems: [{ uri: post.mediaUrl, mimeType: post.mediaType === 'video' ? 'video/mp4' : 'image/jpeg' }] });
    setShowPostModal(true);
  };

  const handleClosePostModal = () => {
    setShowPostModal(false); setEditingPostId(null); setPostError(null);
    setPostForm({ caption: '', mediaItems: [] });
  };

  const handlePickImage = async () => {
    if (!session?.access_token) { setEditError('No authentication token available.'); return; }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') { setEditError('Media library permission is required.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      const pickedUri = result.assets[0].uri;
      setLocalAvatarPreview(pickedUri);
      setEditForm((prev) => ({ ...prev, avatar: pickedUri }));
      setPhotoUploading(true); setEditError(null);
      try {
        const { data, error: uploadError } = await uploadProfilePhoto(session.access_token, pickedUri);
        if (uploadError) { setEditError(uploadError); return; }
        if (data?.user?.avatar) {
          setEditForm((prev) => ({ ...prev, avatar: data.user.avatar }));
          setProfile((prev) => (prev ? { ...prev, avatar: data.user.avatar } : prev));
          setLocalAvatarPreview(null);
        }
      } catch { setEditError('Failed to upload profile photo.'); }
      finally { setPhotoUploading(false); }
    }
  };

  const handlePickCoverPhoto = async () => {
    if (!session?.access_token) { setEditError('No authentication token available.'); return; }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') { setEditError('Media library permission is required.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [16, 9], quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      const pickedUri = result.assets[0].uri;
      setLocalCoverPreview(pickedUri);
      setEditForm((prev) => ({ ...prev, coverPhoto: pickedUri }));
      setPhotoUploading(true); setEditError(null);
      try {
        const { data, error: uploadError } = await uploadCoverPhoto(session.access_token, pickedUri);
        if (uploadError) { setEditError(uploadError); return; }
        if (data?.user?.coverPhotoUrl) {
          setEditForm((prev) => ({ ...prev, coverPhoto: data.user.coverPhotoUrl || '' }));
          setProfile((prev) => (prev ? { ...prev, coverPhotoUrl: data.user.coverPhotoUrl } : prev));
          setLocalCoverPreview(null);
        }
      } catch { setEditError('Failed to upload cover photo.'); }
      finally { setPhotoUploading(false); }
    }
  };

  const handlePhotoPickerOption = async (option: 'camera' | 'gallery' | 'remove') => {
    if (!photoPickerTarget) return;
    setPhotoPickerTarget(null);
    if (option === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') { setEditError('Camera permission is required.'); return; }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: photoPickerTarget === 'avatar' ? [1, 1] : [16, 9],
        quality: 0.7,
      });
      if (!result.canceled && result.assets.length > 0) {
        const pickedUri = result.assets[0].uri;
        if (photoPickerTarget === 'avatar') {
          setLocalAvatarPreview(pickedUri);
          setEditForm((prev) => ({ ...prev, avatar: pickedUri }));
        } else {
          setLocalCoverPreview(pickedUri);
          setEditForm((prev) => ({ ...prev, coverPhoto: pickedUri }));
        }
        setPhotoUploading(true); setEditError(null);
        try {
          const uploadFn = photoPickerTarget === 'avatar' ? uploadProfilePhoto : uploadCoverPhoto;
          const { data, error: uploadError } = await uploadFn(session!.access_token, pickedUri);
          if (uploadError) { setEditError(uploadError); return; }
          if (photoPickerTarget === 'avatar' && data?.user?.avatar) {
            setEditForm((prev) => ({ ...prev, avatar: data.user.avatar }));
            setProfile((prev) => (prev ? { ...prev, avatar: data.user.avatar } : prev));
            setLocalAvatarPreview(null);
          }
          if (photoPickerTarget === 'cover' && data?.user?.coverPhotoUrl !== undefined) {
            setEditForm((prev) => ({ ...prev, coverPhoto: data.user.coverPhotoUrl || '' }));
            setProfile((prev) => (prev ? { ...prev, coverPhotoUrl: data.user.coverPhotoUrl } : prev));
            setLocalCoverPreview(null);
          }
        } catch { setEditError('Failed to upload photo.'); }
        finally { setPhotoUploading(false); }
      }
    } else if (option === 'gallery') {
      if (photoPickerTarget === 'avatar') await handlePickImage();
      else await handlePickCoverPhoto();
    } else if (option === 'remove') {
      if (photoPickerTarget === 'avatar') await handleDeleteAvatar();
      else await handleDeleteCoverPhoto();
    }
  };

  const handleSaveProfile = async () => {
    if (!session?.access_token || !profile) return;
    if (!editForm.fullName.trim()) { setEditError('Full name is required'); return; }
    if (editForm.pincode && !/^\d{4,10}$/.test(editForm.pincode.trim())) { setEditError('Pincode must be 4 to 10 digits.'); return; }
    if (editForm.phoneNumber && !/^\+?[0-9]{7,15}$/.test(editForm.phoneNumber.trim())) { setEditError('Phone number must be 7 to 15 digits.'); return; }
    let parsedAge: number | null = null;
    if (editForm.age.trim()) {
      parsedAge = Number(editForm.age.trim());
      if (!Number.isFinite(parsedAge) || parsedAge < 0 || parsedAge > 120) { setEditError('Age must be between 0 and 120.'); return; }
    }
    const expertiseSkills = Array.from(new Set(editForm.expertiseSelections.map((skill) => skill.trim()).filter(Boolean)));
    const freeformSkills = editForm.skillsText.split(',').map((s) => s.trim()).filter(Boolean);
    const skills = Array.from(new Set([...expertiseSkills, ...freeformSkills]));
    const socialLinks = editForm.socialLinks.map((link) => ({ platform: String(link.platform || '').trim().toLowerCase(), url: normalizeUrl(link.url) })).filter((link) => link.platform && link.url);
    let finalProfession = editForm.profession;
    if (editForm.selectedCategory === "none") finalProfession = "none";
    else if (editForm.selectedCategory === "freelancer") finalProfession = "freelancer";
    else if (editForm.selectedCategory === "student") finalProfession = "student";
    else if (editForm.selectedCategory === "other") finalProfession = "other";
    else if (PROFESSIONAL_CATEGORIES.includes(editForm.selectedCategory as ProfessionOption)) finalProfession = editForm.selectedCategory;
    else if (editForm.profession === "other") finalProfession = "other";
    if (!['tech', 'creative', 'engineering', 'professional', 'freelancer', 'student', 'none', 'other'].includes(finalProfession)) {
      finalProfession = 'none';
    }
    const normalizedGoal = editForm.userGoal === 'OFFER_SERVICE' || editForm.userGoal === 'HIRE_PROFESSIONALS' ? editForm.userGoal : '';
    setEditLoading(true); setEditError(null);
    try {
      const { data, error } = await updateUserProfile(session.access_token, {
        fullName: editForm.fullName.trim(), location: editForm.city.trim(), city: editForm.city.trim(),
        pincode: editForm.pincode.trim(), phoneNumber: editForm.phoneNumber.trim(), age: parsedAge,
        gender: editForm.gender.trim(), profession: finalProfession as any, skills, bio: editForm.bio.trim(),
        avatar: editForm.avatar, coverPhotoUrl: editForm.coverPhoto || undefined, userGoal: normalizedGoal, socialLinks,
      });
      if (error) setEditError(error);
      else if (data) { setProfile(data.user); handleCloseEditModal(); }
    } catch { setEditError('Failed to update profile'); }
    finally { setEditLoading(false); }
  };

  const addSocialLink = () => {
    setEditForm((prev) => ({ ...prev, socialLinks: [...prev.socialLinks, { platform: 'website', url: '' }] }));
  };

  const removeSocialLink = (index: number) => {
    setEditForm((prev) => ({ ...prev, socialLinks: prev.socialLinks.filter((_, i) => i !== index) }));
  };

  const updateSocialLink = (index: number, field: 'platform' | 'url', value: string) => {
    setEditForm((prev) => ({ ...prev, socialLinks: prev.socialLinks.map((link, i) => i === index ? { ...link, [field]: value } : link) }));
  };

  const handleOpenUrl = async (url: string) => {
    const normalized = normalizeUrl(url);
    if (!normalized) return;
    try { await Linking.openURL(normalized); } catch { Alert.alert('Unable to open link', normalized); }
  };

  const handleDeleteAvatar = async () => {
    if (!session?.access_token) return;
    try {
      const { data, error: deleteError } = await deleteProfilePhoto(session.access_token);
      if (deleteError) { Alert.alert('Unable to remove profile photo', deleteError); return; }
      if (data?.user?.avatar) {
        setProfile((prev) => (prev ? { ...prev, avatar: data.user.avatar } : prev));
        setEditForm((prev) => ({ ...prev, avatar: data.user.avatar }));
        setLocalAvatarPreview(null);
      }
    } catch { Alert.alert('Unable to remove profile photo'); }
  };

  const handleDeleteCoverPhoto = async () => {
    if (!session?.access_token) return;
    try {
      const { data, error: deleteError } = await deleteCoverPhoto(session.access_token);
      if (deleteError) { Alert.alert('Unable to remove cover photo', deleteError); return; }
      if (data?.user?.coverPhotoUrl !== undefined) {
        setProfile((prev) => (prev ? { ...prev, coverPhotoUrl: data.user.coverPhotoUrl } : prev));
        setEditForm((prev) => ({ ...prev, coverPhoto: data.user.coverPhotoUrl || '' }));
        setLocalCoverPreview(null);
      }
    } catch { Alert.alert('Unable to remove cover photo'); }
  };

  const handleRequestVerification = async () => {
    if (!session?.access_token) return;
    setVerificationBusy(true);
    try {
      const { data, error } = await applyForVerification(session.access_token);
      if (error) { Alert.alert('Verification request failed', error); return; }
      if (data) {
        setVerificationStatus((data.status as VerificationStatus) || 'pending');
        setVerificationFee(data.fee || verificationFee || 0);
        setVerificationRequestedAt(new Date().toISOString());
        Alert.alert('Verification request submitted', data.message || 'Your request is under review.');
      }
    } catch { Alert.alert('Verification request failed'); }
    finally { setVerificationBusy(false); }
  };

  const loadRatingEligibility = async () => {
    if (!profile || !session?.access_token) return;
    try {
      const { data, error: eligibilityError } = await getRatingEligibility(session.access_token, profile.id);
      if (eligibilityError) { setCanRateUser(false); setRatingEligibilityReason(eligibilityError); return; }
      setCanRateUser(Boolean(data?.canRate));
      setRatingEligibilityReason(data?.reason || '');
    } catch { setCanRateUser(false); setRatingEligibilityReason('Unable to check eligibility.'); }
  };

  const handleSubmitRating = async () => {
    if (!profile || !session?.access_token) return;
    if (!canRateUser) { Alert.alert('Cannot rate profile', ratingEligibilityReason || 'Not eligible.'); return; }
    if (!ratingComment.trim()) { Alert.alert('Add a review', 'Please share a short review.'); return; }
    setRatingSubmitting(true);
    try {
      const { data, error: submitError } = await rateUser(session.access_token, profile.id, ratingValue, ratingComment.trim());
      if (submitError) { Alert.alert('Rating failed', submitError); return; }
      if (data) {
        setRatingsSummary(data.summary || ratingsSummary);
        setShowRatingModal(false); setShowRatingsModal(true);
        setRatingComment(''); setRatingValue(5);
        await loadRatings();
      }
    } catch { Alert.alert('Rating failed', 'Unable to submit your rating.'); }
    finally { setRatingSubmitting(false); }
  };

  const loadRatings = async () => {
    if (!profile) return;
    setInsightsLoading(true);
    try {
      const { data, error: ratingsError } = await getUserRatings(profile.id);
      if (ratingsError) {
        setRatings([]); setRatingsSummary({ averageRating: profile.stats.reviews || 0, totalRatings: 0 }); return;
      }
      if (data) { setRatings(data.ratings); setRatingsSummary(data.summary); }
    } catch { setRatings([]); }
    finally { setInsightsLoading(false); }
  };

  const handleMenuPress = (label: string) => {
    if (label === 'Verification') { setShowVerificationModal(true); return; }
    if (label === 'Badges & Achievements') { setShowBadgesModal(true); return; }
    if (label === 'Reviews & Ratings') {
      setShowAllRatings(false); setShowRatingsModal(true);
      void loadRatingEligibility(); void loadRatings();
    }
  };

  const handlePickPostMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') { setPostError('Media library permission is required.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true, allowsEditing: false, quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const mediaItems = result.assets.map((asset) => ({
        uri: asset.uri, mimeType: asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
      }));
      setPostForm((prev) => ({ ...prev, mediaItems }));
      setPostError(null);
    }
  };

  const handleUploadPost = async () => {
    if (!session?.access_token) { setPostError('No authentication token available.'); return; }
    setPostUploading(true); setPostError(null);
    try {
      if (editingPostId) {
        const { data, error: updateError } = await updateMyPostCaption(session.access_token, editingPostId, postForm.caption.trim());
        if (updateError) { setPostError(updateError); return; }
        if (data?.post) { setPosts((prev) => prev.map((p) => (p.id === data.post.id ? data.post : p))); handleClosePostModal(); }
      } else {
        if (postForm.mediaItems.length === 0) { setPostError('Please choose media first.'); return; }
        const createdPosts: MyPost[] = [];
        for (const mediaItem of postForm.mediaItems) {
          const { data, error: uploadError } = await createMyPost(session.access_token, mediaItem.uri, mediaItem.mimeType, postForm.caption.trim());
          if (uploadError) { if (createdPosts.length > 0) setPosts((prev) => [...createdPosts.reverse(), ...prev]); setPostError(uploadError); return; }
          if (data?.post) createdPosts.push(data.post);
        }
        if (createdPosts.length > 0) { setPosts((prev) => [...createdPosts.reverse(), ...prev]); handleClosePostModal(); }
      }
    } catch { setPostError(editingPostId ? 'Failed to update post.' : 'Failed to upload post.'); }
    finally { setPostUploading(false); }
  };

  const handleDeletePost = (postId: string) => {
    if (!session?.access_token) { setPostsError('No authentication token.'); return; }
    Alert.alert('Delete post', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setDeletingPostId(postId); setPostsError(null);
        try {
          const { error: deleteError } = await deleteMyPost(session.access_token as string, postId);
          if (deleteError) { setPostsError(deleteError); return; }
          setPosts((prev) => prev.filter((p) => p.id !== postId));
        } catch { setPostsError('Failed to delete post.'); }
        finally { setDeletingPostId(null); }
      }},
    ]);
  };

  const handlePostOptions = (post: MyPost) => {
    Alert.alert('Post options', 'Choose an action.', [
      { text: 'Edit caption', onPress: () => handleOpenEditPostModal(post) },
      { text: 'Delete post', style: 'destructive', onPress: () => handleDeletePost(post.id) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const openMediaViewer = (index: number) => {
    setMediaViewerIndex(index);
    setShowMediaViewer(true);
    mediaViewerAnim.setValue(0);
    mediaViewerPan.setValue({ x: 0, y: 0 });
    mediaViewerScale.setValue(0.92);
    Animated.parallel([
      Animated.timing(mediaViewerAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(mediaViewerScale, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
    ]).start();
  };

  const closeMediaViewer = () => {
    Animated.parallel([
      Animated.timing(mediaViewerAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(mediaViewerScale, { toValue: 0.92, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setShowMediaViewer(false);
    });
  };

  const goToNextPost = () => {
    if (mediaViewerIndex < posts.length - 1) {
      setMediaViewerIndex(mediaViewerIndex + 1);
    }
  };

  const goToPrevPost = () => {
    if (mediaViewerIndex > 0) {
      setMediaViewerIndex(mediaViewerIndex - 1);
    }
  };

  const mediaPanResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 10 || Math.abs(gs.dy) > 10,
    onPanResponderMove: (_, gs) => {
      if (Math.abs(gs.dx) > Math.abs(gs.dy)) {
        mediaViewerPan.setValue({ x: gs.dx, y: 0 });
      } else {
        mediaViewerPan.setValue({ x: 0, y: gs.dy });
      }
    },
    onPanResponderRelease: (_, gs) => {
      if (Math.abs(gs.dx) > 80 && Math.abs(gs.dx) > Math.abs(gs.dy)) {
        if (gs.dx > 0) goToPrevPost();
        else goToNextPost();
        Animated.spring(mediaViewerPan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
      } else if (Math.abs(gs.dy) > 100 && Math.abs(gs.dy) > Math.abs(gs.dx)) {
        closeMediaViewer();
      } else {
        Animated.spring(mediaViewerPan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
      }
    },
  })).current;

  if (loading) {
    return (
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <ProfileSkeleton />
        </ScrollView>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }]}>
        <View style={{ alignItems: 'center', gap: 16 }}>
          <UserCircle size={64} color={Colors.gray300} />
          <Text style={{ fontSize: FontSizes.md, color: Colors.gray600, textAlign: 'center' }}>{error || 'Unable to load profile'}</Text>
          {(!session || !session.access_token) && signInDev && (
            <TouchableOpacity
              style={{ backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: BorderRadius.md }}
              onPress={() => signInDev?.()}
              activeOpacity={0.8}
            >
              <Text style={{ color: Colors.white, fontWeight: FontWeights.semiBold as any }}>Sign in (dev)</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  const STATS = [
    { label: 'Jobs Done', value: profile.stats.jobsDone.toString(), icon: Briefcase, color: Colors.primary },
    { label: 'Reviews', value: profile.stats.reviews.toFixed(1), icon: Star, color: '#F59E0B' },
    { label: 'Earned', value: `₹${(profile.stats.earned / 1000).toFixed(1)}K`, icon: Award, color: Colors.success },
  ];

  const goalLabel = formatGoal(profile.userGoal);
  const isOwnProfile = !!currentUser && !!profile && String(profile.id) === String(currentUser.id);
  const profileShareUrl = profile ? `https://krovaa.com/s/${(profile as any).shareId || profile.username}` : '';
  const profileShareTitle = profile
    ? (profile.profession && profile.profession !== 'none'
      ? formatProfessionLabel(profile.profession)
      : profile.bio?.trim().slice(0, 72) || 'Professional profile')
    : 'Professional profile';

  const badgesData = [
    { title: 'Verified Profile', description: 'Identity and trust verified.', color: Colors.primary, active: verificationStatus === 'verified' },
    { title: 'Portfolio Builder', description: 'Showcase your work.', color: Colors.secondary, active: posts.length > 0 },
    { title: 'Goal Set', description: 'Clear service goal.', color: Colors.accent, active: !!goalLabel },
    { title: 'Community Rated', description: 'Feedback from others.', color: '#F59E0B', active: (ratingsSummary.totalRatings || 0) > 0 },
    { title: 'Profile Complete', description: 'Details are filled in.', color: '#22C55E', active: !!profile.fullName && !!profile.bio && !!profile.avatar },
    { title: 'Connected', description: 'Public social links.', color: '#8B5CF6', active: (profile.socialLinks?.length || 0) > 0 },
  ];

  return (
    <View style={styles.container}>
      <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }}>
          {/* Cover */}
          <View style={[styles.coverWrapper, { height: coverHeight }]}>
            {(localCoverPreview || profile.coverPhotoUrl) ? (
              <Image source={{ uri: localCoverPreview || profile.coverPhotoUrl }} style={[styles.coverImage, { height: coverHeight }]} />
            ) : (
              <View style={styles.coverPlaceholder}>
                <ImagePlus size={32} color={Colors.gray400} />
              </View>
            )}
            <View style={styles.coverOverlay} />
            <View style={styles.coverActions}>
              <ShareProfileAction
                profileUrl={profileShareUrl}
                userName={profile.fullName || profile.username || 'User'}
                userTitle={profileShareTitle}
              >
                {({ openShare, isSharing }) => (
                  <AnimatedPressable onPress={openShare} style={styles.coverActionBtn} disabled={isSharing}>
                    <Share2 size={16} color={Colors.white} />
                  </AnimatedPressable>
                )}
              </ShareProfileAction>
            </View>
            {!!goalLabel && (
              <View style={styles.goalBadge}>
                <Sparkles size={12} color={Colors.primary} />
                <Text style={styles.goalBadgeText}>{goalLabel}</Text>
              </View>
            )}
          </View>

          {/* Profile Info */}
          <View style={[styles.profileInfoWrapper, { marginTop: -(avatarSize / 2 + 4) }]}>
            <View style={styles.avatarOuter}>
              <Image
                source={{ uri: localAvatarPreview || profile.avatar || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200' }}
                style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
              />
              {isOwnProfile && (
                <TouchableOpacity style={styles.avatarEditBtn} onPress={handleOpenEditModal} activeOpacity={0.8}>
                  <Edit3 size={14} color={Colors.white} />
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.name}>{profile.fullName}</Text>

            {(profile.city || profile.location) && (
              <View style={styles.infoRow}>
                <MapPin size={14} color={Colors.gray400} />
                <Text style={styles.infoText}>{profile.city || profile.location}</Text>
              </View>
            )}

            {!!profile.profession && profile.profession !== 'none' && (
              <View style={styles.professionBadge}>
                <Briefcase size={12} color={Colors.primary} />
                <Text style={styles.professionText}>{formatProfessionLabel(profile.profession)}</Text>
              </View>
            )}

            {!!profile.email && <Text style={styles.email}>{profile.email}</Text>}

            <View style={styles.metaRow}>
              <View style={[styles.verificationChip,
                verificationStatus === 'verified' ? styles.verifiedChip :
                verificationStatus === 'pending' ? styles.pendingChip : styles.neutralChip
              ]}>
                {verificationStatus === 'verified' ? (
                  <CheckCircle size={12} color="#16A34A" />
                ) : verificationStatus === 'pending' ? (
                  <Clock size={12} color="#D97706" />
                ) : (
                  <Shield size={12} color={Colors.gray500} />
                )}
                <Text style={[styles.verificationText,
                  verificationStatus === 'verified' ? { color: '#16A34A' } :
                  verificationStatus === 'pending' ? { color: '#D97706' } : { color: Colors.gray500 }
                ]}>
                  {verificationStatus === 'verified' ? 'Verified' :
                   verificationStatus === 'pending' ? 'Pending' : 'Not verified'}
                </Text>
              </View>
            </View>

            {!!profile.socialLinks?.length && (
              <View style={styles.socialWrap}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.socialRow}>
                  {profile.socialLinks.map((link) => {
                    const Icon = getSocialIcon(link.platform);
                    const platformKey = link.platform.toLowerCase();
                    const iconColor = SOCIAL_COLORS[platformKey] || Colors.primary;
                    return (
                      <TouchableOpacity
                        key={`${link.platform}-${link.url}`}
                        style={[styles.socialChip, { borderColor: iconColor + '30', backgroundColor: iconColor + '0A' }]}
                        onPress={() => handleOpenUrl(link.url)}
                        activeOpacity={0.7}
                      >
                        <Icon size={13} color={iconColor} />
                        <Text style={[styles.socialChipText, { color: iconColor }]}>{link.platform}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Stats */}
          <SectionCard style={{ marginTop: Spacing.md }}>
            <View style={styles.statsRow}>
              {STATS.map((stat) => (
                <View key={stat.label} style={styles.statItem}>
                  <View style={[styles.statIconWrap, { backgroundColor: stat.color + '14' }]}>
                    <stat.icon size={16} color={stat.color} />
                  </View>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </SectionCard>

          {/* Menu */}
          <SectionCard style={{ marginTop: 12 }}>
            {MENU_ITEMS.map((item, idx) => (
              <React.Fragment key={item.label}>
                <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => handleMenuPress(item.label)}>
                  <View style={[styles.menuIconWrap, { backgroundColor: item.color + '12' }]}>
                    <item.icon size={20} color={item.color} />
                  </View>
                  <View style={styles.menuContent}>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <Text style={styles.menuDesc}>{item.desc}</Text>
                  </View>
                  <ChevronRight size={18} color={Colors.gray300} />
                </TouchableOpacity>
                {idx < MENU_ITEMS.length - 1 && <View style={styles.menuDivider} />}
              </React.Fragment>
            ))}
          </SectionCard>

          {/* Bio */}
          {!!profile.bio && (
            <SectionCard style={{ marginTop: 12 }}>
              <SectionTitle title="About" />
              <Text style={styles.bioText}>{profile.bio}</Text>
            </SectionCard>
          )}

          {/* Skills */}
          <SectionCard style={{ marginTop: 12 }}>
            <SectionTitle title="Skills" />
            {profile.skills.length > 0 ? (
              <View style={styles.skillsRow}>
                {profile.skills.map((skill) => (
                  <View key={skill} style={styles.skillChip}>
                    <Text style={styles.skillText}>{skill}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>No skills added yet.</Text>
            )}
          </SectionCard>

          {/* Profile Info Cards (own profile only) */}
          {isOwnProfile && (
            <SectionCard style={{ marginTop: 12 }}>
              <SectionTitle title="Profile Information" />
              <View style={styles.infoGrid}>
                <View style={styles.infoCard}>
                  <View style={[styles.infoCardAccent, { backgroundColor: '#22C55E' }]} />
                  <Text style={styles.infoCardLabel}>Personal Details</Text>
                  <View style={styles.infoRow}>
                    <View style={styles.infoCell}>
                      <Calendar size={12} color={Colors.gray400} />
                      <Text style={styles.infoKey}>Age</Text>
                      <Text style={styles.infoValue}>{profile.age ?? '—'}</Text>
                    </View>
                    <View style={styles.infoCell}>
                      <User size={12} color={Colors.gray400} />
                      <Text style={styles.infoKey}>Gender</Text>
                      <Text style={styles.infoValue}>{profile.gender || '—'}</Text>
                    </View>
                  </View>
                  <View style={styles.infoDivider} />
                  <View>
                    <Text style={styles.infoKey}>Location</Text>
                    <View style={[styles.infoRow, { marginTop: 4 }]}>
                      <MapPinned size={13} color={Colors.gray400} />
                      <Text style={styles.infoValue}>
                        {profile.city || profile.location || 'Not set'}
                        {profile.pincode ? ` (${profile.pincode})` : ''}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.infoCard}>
                  <View style={[styles.infoCardAccent, { backgroundColor: Colors.primary }]} />
                  <Text style={styles.infoCardLabel}>Identity & Contact</Text>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoKey}>Username</Text>
                    <Text style={styles.infoValue}>@{profile.username}</Text>
                  </View>
                  {!!profile.phoneNumber && (
                    <View style={styles.infoItem}>
                      <Phone size={12} color={Colors.gray400} />
                      <Text style={styles.infoKey}>Phone</Text>
                      <Text style={[styles.infoValue, { color: Colors.primary }]}>{profile.phoneNumber}</Text>
                    </View>
                  )}
                  <View style={styles.infoItem}>
                    <Mail size={12} color={Colors.gray400} />
                    <Text style={styles.infoKey}>Email</Text>
                    <Text style={styles.infoValue}>{profile.email}</Text>
                  </View>
                </View>
              </View>
            </SectionCard>
          )}

          {/* Posts */}
          <SectionCard style={{ marginTop: 12 }}>
            <SectionTitle
              title="Posts"
              action={
                <TouchableOpacity style={styles.uploadBtn} onPress={handleOpenPostModal} activeOpacity={0.7}>
                  <Plus size={16} color={Colors.white} />
                  <Text style={styles.uploadBtnText}>Upload</Text>
                </TouchableOpacity>
              }
            />

            {postsLoading && (
              <View style={{ paddingVertical: Spacing.lg, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            )}

            {!postsLoading && !!postsError && (
              <Text style={{ color: Colors.error, fontSize: FontSizes.sm }}>{postsError}</Text>
            )}

            {!postsLoading && !postsError && posts.length === 0 && (
              <Text style={styles.emptyText}>No posts yet. Share your work.</Text>
            )}

            {!postsLoading && !postsError && posts.length > 0 && (
              <View style={styles.postsGrid}>
                {posts.map((post, idx) => (
                  <TouchableOpacity
                    key={post.id}
                    style={[styles.postCard, { width: POST_ITEM_WIDTH }]}
                    activeOpacity={0.95}
                    onPress={() => openMediaViewer(idx)}
                    onLongPress={() => handlePostOptions(post)}
                  >
                    {post.mediaType === 'image' ? (
                      <Image source={{ uri: post.mediaUrl }} style={styles.postMedia} />
                    ) : (
                      <View style={styles.postMediaVideo}>
                        <Video
                          source={{ uri: post.mediaUrl }}
                          style={styles.postMedia}
                          resizeMode={ResizeMode.COVER}
                          isLooping
                          shouldPlay={false}
                        />
                        <View style={styles.videoPlayIcon}>
                          <VideoIcon size={20} color={Colors.white} fill={Colors.white} />
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </SectionCard>
        </Animated.View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={handleCloseEditModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={handleCloseEditModal} activeOpacity={0.7}>
                <X size={24} color={Colors.gray800} />
              </TouchableOpacity>
            </View>

            {editError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{editError}</Text>
              </View>
            )}

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.editCoverWrap}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setPhotoPickerTarget('cover')}
                  style={styles.editCoverTouch}
                >
                  {editForm.coverPhoto || profile?.coverPhotoUrl ? (
                    <Image
                      source={{ uri: editForm.coverPhoto || profile?.coverPhotoUrl || '' }}
                      style={styles.editCoverImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.editCoverPlaceholder}>
                      <Camera size={28} color={Colors.gray300} />
                    </View>
                  )}
                  <View style={styles.editCoverOverlay}>
                    <Camera size={18} color={Colors.white} />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setPhotoPickerTarget('avatar')}
                  style={styles.editAvatarWrap}
                >
                  <Image
                    source={{ uri: editForm.avatar || profile?.avatar || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200' }}
                    style={styles.editAvatarImg}
                  />
                  <View style={styles.editAvatarOverlay}>
                    <Camera size={14} color={Colors.white} />
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Basic Information</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Full Name</Text>
                  <TextInput style={styles.formInput} placeholder="Enter your full name" value={editForm.fullName} onChangeText={(t) => setEditForm({ ...editForm, fullName: t })} placeholderTextColor={Colors.gray400} />
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>City</Text>
                    <TextInput style={styles.formInput} placeholder="City" value={editForm.city} onChangeText={(t) => setEditForm({ ...editForm, city: t })} placeholderTextColor={Colors.gray400} />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Age</Text>
                    <TextInput style={styles.formInput} placeholder="Age" value={editForm.age} onChangeText={(t) => setEditForm({ ...editForm, age: t })} placeholderTextColor={Colors.gray400} keyboardType="number-pad" />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Phone</Text>
                    <TextInput style={styles.formInput} placeholder="Phone number" value={editForm.phoneNumber} onChangeText={(t) => setEditForm({ ...editForm, phoneNumber: t })} placeholderTextColor={Colors.gray400} keyboardType="phone-pad" />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Pincode</Text>
                    <TextInput style={styles.formInput} placeholder="Pincode" value={editForm.pincode} onChangeText={(t) => setEditForm({ ...editForm, pincode: t })} placeholderTextColor={Colors.gray400} keyboardType="number-pad" />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Gender</Text>
                  <View style={styles.chipWrap}>
                    {GENDER_OPTIONS.map((option) => {
                      const selected = editForm.gender.toLowerCase() === option.toLowerCase();
                      return (
                        <TouchableOpacity key={option} style={[styles.chip, selected && styles.chipActive]} onPress={() => setEditForm({ ...editForm, gender: option })} activeOpacity={0.7}>
                          <Text style={[styles.chipText, selected && styles.chipTextActive]}>{option}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Profession</Text>
                  <View style={styles.chipWrap}>
                    {CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.chip, editForm.selectedCategory === cat.id && styles.chipActive]}
                        onPress={() => setEditForm((prev) => ({
                          ...prev,
                          selectedCategory: cat.id,
                          profession: cat.id,
                          customProfession: '',
                          expertiseSelections: [],
                        }))}
                        activeOpacity={0.7}
                      >
                        <cat.icon size={14} color={editForm.selectedCategory === cat.id ? Colors.primary : Colors.gray600} />
                        <Text style={[styles.chipText, editForm.selectedCategory === cat.id && styles.chipTextActive]}>{cat.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {editForm.selectedCategory && SUB_PROFESSIONS[editForm.selectedCategory] && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={styles.formLabel}>Expertise</Text>
                      <Text style={styles.helperText}>Select one or more.</Text>
                      <View style={styles.chipWrap}>
                        {SUB_PROFESSIONS[editForm.selectedCategory].map((prof) => (
                          <TouchableOpacity
                            key={prof}
                            style={[styles.chip, editForm.expertiseSelections.includes(prof) && styles.chipActive]}
                            onPress={() => setEditForm((prev) => {
                              const isSelected = prev.expertiseSelections.includes(prof);
                              return {
                                ...prev,
                                expertiseSelections: isSelected
                                  ? prev.expertiseSelections.filter((item) => item !== prof)
                                  : [...prev.expertiseSelections, prof],
                              };
                            })}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.chipText, editForm.expertiseSelections.includes(prof) && styles.chipTextActive]}>{prof}</Text>
                          </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={[styles.chip, editForm.profession === 'other' && styles.chipActive]} onPress={() => setEditForm((prev) => ({ ...prev, profession: 'other', customProfession: '' }))} activeOpacity={0.7}>
                          <Text style={[styles.chipText, editForm.profession === 'other' && styles.chipTextActive]}>Other...</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {(editForm.selectedCategory === 'other' || editForm.profession === 'other') && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={styles.formLabel}>Specify Profession</Text>
                      <TextInput style={styles.formInput} placeholder="E.g. Full Stack Engineer" value={editForm.customProfession} onChangeText={(t) => setEditForm((prev) => ({ ...prev, customProfession: t, profession: t ? 'other' : 'none' }))} />
                    </View>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Skills</Text>
                  <TextInput style={styles.formInput} placeholder="e.g. React Native, Figma, Java (comma separated)" value={editForm.skillsText} onChangeText={(t) => setEditForm({ ...editForm, skillsText: t })} placeholderTextColor={Colors.gray400} />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Bio</Text>
                  <TextInput style={[styles.formInput, styles.bioInput]} placeholder="Tell us about yourself" value={editForm.bio} onChangeText={(t) => setEditForm({ ...editForm, bio: t })} placeholderTextColor={Colors.gray400} multiline numberOfLines={4} />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Goal & Social</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>I am here to...</Text>
                  <View style={styles.chipWrap}>
                    {[
                      { value: 'OFFER_SERVICE', label: 'Offer services' },
                      { value: 'HIRE_PROFESSIONALS', label: 'Hire professionals' },
                    ].map((option) => {
                      const selected = editForm.userGoal === option.value;
                      return (
                        <TouchableOpacity key={option.value} style={[styles.chip, selected && styles.chipActive]} onPress={() => setEditForm((prev) => ({ ...prev, userGoal: option.value }))} activeOpacity={0.7}>
                          <Text style={[styles.chipText, selected && styles.chipTextActive]}>{option.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.formLabel}>Social Links</Text>
                    <TouchableOpacity onPress={addSocialLink} activeOpacity={0.7}>
                      <Text style={{ color: Colors.primary, fontSize: FontSizes.sm, fontWeight: FontWeights.semiBold as any }}>+ Add</Text>
                    </TouchableOpacity>
                  </View>

                  {editForm.socialLinks.length === 0 && (
                    <Text style={styles.helperText}>Add your social media links.</Text>
                  )}

                  {editForm.socialLinks.map((link, index) => (
                    <View key={`${link.platform}-${index}`} style={styles.socialEditor}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                        <View style={styles.chipWrap}>
                          {SOCIAL_PLATFORM_OPTIONS.map((option) => {
                            const selected = link.platform === option.value;
                            return (
                              <TouchableOpacity key={option.value} style={[styles.platformChip, selected && styles.chipActive]} onPress={() => updateSocialLink(index, 'platform', option.value)} activeOpacity={0.7}>
                                <option.icon size={14} color={selected ? Colors.primary : Colors.gray600} />
                                <Text style={[styles.chipText, selected && styles.chipTextActive]}>{option.label}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </ScrollView>
                      <TextInput style={styles.formInput} placeholder="Paste profile URL" value={link.url} onChangeText={(t) => updateSocialLink(index, 'url', t)} placeholderTextColor={Colors.gray400} autoCapitalize="none" autoCorrect={false} />
                      <TouchableOpacity onPress={() => removeSocialLink(index)} activeOpacity={0.7} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                        <Text style={{ color: Colors.error, fontSize: FontSizes.xs, fontWeight: FontWeights.semiBold as any }}>Remove link</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleCloseEditModal} disabled={editLoading}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <Button title="Save Changes" onPress={handleSaveProfile} loading={editLoading} style={{ flex: 1 }} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Photo picker bottom sheet */}
      <Modal visible={photoPickerTarget !== null} transparent animationType="none" onRequestClose={() => {
        Animated.timing(sheetAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start();
        setPhotoPickerTarget(null);
      }}>
        <Pressable style={styles.bottomSheetBackdrop} onPress={() => {
          Animated.timing(sheetAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start();
          setPhotoPickerTarget(null);
        }} />
        <Animated.View
          style={[
            styles.bottomSheet,
            { transform: [{ translateY: sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] }) }] },
          ]}
        >
          <View style={styles.bottomSheetHandle} />
          <Text style={styles.bottomSheetTitle}>
            {photoPickerTarget === 'avatar' ? 'Profile Photo' : 'Cover Photo'}
          </Text>
          <TouchableOpacity style={styles.bottomSheetOption} onPress={() => handlePhotoPickerOption('camera')} activeOpacity={0.7}>
            <Camera size={20} color={Colors.gray700} />
            <Text style={styles.bottomSheetOptionText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomSheetOption} onPress={() => handlePhotoPickerOption('gallery')} activeOpacity={0.7}>
            <ImagePlus size={20} color={Colors.gray700} />
            <Text style={styles.bottomSheetOptionText}>Choose from Gallery</Text>
          </TouchableOpacity>
          {((photoPickerTarget === 'avatar' && (editForm.avatar || profile?.avatar)) ||
            (photoPickerTarget === 'cover' && (editForm.coverPhoto || profile?.coverPhotoUrl))) && (
            <TouchableOpacity style={styles.bottomSheetOption} onPress={() => handlePhotoPickerOption('remove')} activeOpacity={0.7}>
              <Trash2 size={20} color={Colors.error} />
              <Text style={[styles.bottomSheetOptionText, { color: Colors.error }]}>Remove Current Photo</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.bottomSheetCancel} onPress={() => setPhotoPickerTarget(null)} activeOpacity={0.7}>
            <Text style={styles.bottomSheetCancelText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>

      {/* Post Modal */}
      <Modal visible={showPostModal} transparent animationType="slide" onRequestClose={handleClosePostModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingPostId ? 'Edit Post' : 'New Post'}</Text>
              <TouchableOpacity onPress={handleClosePostModal} activeOpacity={0.7}>
                <X size={24} color={Colors.gray800} />
              </TouchableOpacity>
            </View>

            {postError && (
              <View style={styles.errorBox}><Text style={styles.errorText}>{postError}</Text></View>
            )}

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Caption</Text>
                <TextInput style={styles.formInput} placeholder="Describe this work" value={postForm.caption} onChangeText={(t) => setPostForm((prev) => ({ ...prev, caption: t }))} placeholderTextColor={Colors.gray400} />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Media</Text>
                {postForm.mediaItems.length > 0 ? (
                  postForm.mediaItems[0].mimeType.startsWith('video/') ? (
                    <View style={styles.mediaPreviewPlaceholder}>
                      <VideoIcon size={24} color={Colors.white} />
                      <Text style={{ color: Colors.white, fontSize: FontSizes.sm, marginTop: 6 }}>Video selected</Text>
                    </View>
                  ) : (
                    <Image source={{ uri: postForm.mediaItems[0].uri }} style={styles.mediaPreview} />
                  )
                ) : (
                  <View style={styles.mediaPlaceholder}>
                    <Camera size={32} color={Colors.gray400} />
                    <Text style={{ color: Colors.gray500, fontSize: FontSizes.sm, marginTop: 8 }}>No media selected</Text>
                  </View>
                )}
                {!editingPostId && (
                  <Button title="Choose Photo/Video(s)" onPress={handlePickPostMedia} variant="outline" style={{ marginTop: 12 }} />
                )}
                {editingPostId && (
                  <Text style={{ color: Colors.gray500, fontSize: FontSizes.xs, marginTop: 8 }}>Media cannot be changed when editing.</Text>
                )}
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleClosePostModal} disabled={postUploading}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <Button title={editingPostId ? 'Save' : 'Upload'} onPress={handleUploadPost} loading={postUploading} style={{ flex: 1 }} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Verification Modal */}
      <Modal visible={showVerificationModal} transparent animationType="fade" onRequestClose={() => setShowVerificationModal(false)}>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.infoModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verification</Text>
              <TouchableOpacity onPress={() => setShowVerificationModal(false)} activeOpacity={0.7}>
                <X size={24} color={Colors.gray800} />
              </TouchableOpacity>
            </View>

            <View style={styles.verificationStatusCard}>
              {verificationStatus === 'verified' ? (
                <ShieldCheck size={48} color="#16A34A" />
              ) : verificationStatus === 'pending' ? (
                <Clock size={48} color="#D97706" />
              ) : (
                <Shield size={48} color={Colors.gray300} />
              )}
              <Text style={styles.verificationTitle}>
                {verificationStatus === 'verified' ? 'Profile Verified' :
                 verificationStatus === 'pending' ? 'Under Review' : 'Not Verified'}
              </Text>
              <Text style={styles.verificationDesc}>
                {verificationStatus === 'verified' ? 'Your identity has been verified.' :
                 verificationStatus === 'pending' ? 'Your verification request is being reviewed.' :
                 'Verify your profile to build trust.'}
              </Text>
            </View>

            <View style={styles.feeCard}>
              <Text style={styles.feeLabel}>Verification Fee</Text>
              <Text style={styles.feeValue}>₹{verificationFee || 299}</Text>
            </View>

            {!!verificationRequestedAt && (
              <Text style={styles.feeDate}>Requested on {new Date(verificationRequestedAt).toLocaleDateString()}</Text>
            )}

            {(verificationStatus === 'none' || verificationStatus === 'rejected') && (
              <Button title="Request Verification" onPress={handleRequestVerification} loading={verificationBusy} style={{ marginTop: 16 }} />
            )}
          </View>
        </View>
      </Modal>

      {/* Badges Modal */}
      <Modal visible={showBadgesModal} transparent animationType="fade" onRequestClose={() => setShowBadgesModal(false)}>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.infoModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Badges & Achievements</Text>
              <TouchableOpacity onPress={() => setShowBadgesModal(false)} activeOpacity={0.7}>
                <X size={24} color={Colors.gray800} />
              </TouchableOpacity>
            </View>

            <View style={styles.badgesGrid}>
              {badgesData.map((badge) => (
                <View key={badge.title} style={[styles.badgeCard, badge.active ? styles.badgeCardActive : styles.badgeCardInactive]}>
                  <View style={[styles.badgeIconWrap, { backgroundColor: `${badge.color}18` }]}>
                    <BadgeCheck size={20} color={badge.active ? badge.color : Colors.gray400} />
                  </View>
                  <Text style={[styles.badgeTitle, !badge.active && { color: Colors.gray400 }]}>{badge.title}</Text>
                  <Text style={[styles.badgeDesc, !badge.active && { color: Colors.gray400 }]}>{badge.description}</Text>
                  {badge.active && <Text style={[styles.badgeEarned, { color: badge.color }]}>Earned</Text>}
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Ratings Modal */}
      <Modal visible={showRatingsModal} transparent animationType="fade" onRequestClose={() => setShowRatingsModal(false)}>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.infoModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reviews & Ratings</Text>
              <TouchableOpacity onPress={() => setShowRatingsModal(false)} activeOpacity={0.7}>
                <X size={24} color={Colors.gray800} />
              </TouchableOpacity>
            </View>

            <View style={styles.ratingSummary}>
              <Text style={styles.ratingSummaryValue}>{(ratingsSummary.averageRating || profile.stats.reviews || 0).toFixed(1)}</Text>
              <Stars value={Math.round(ratingsSummary.averageRating || profile.stats.reviews || 0)} size={16} />
              <Text style={styles.ratingSummaryMeta}>{ratingsSummary.totalRatings || 0} review{(ratingsSummary.totalRatings || 0) !== 1 ? 's' : ''}</Text>
            </View>

            <TouchableOpacity
              style={[styles.rateBtn, !canRateUser && styles.rateBtnDisabled]}
              onPress={() => setShowRatingModal(true)}
              activeOpacity={0.8}
              disabled={!canRateUser}
            >
              <Star size={16} color={Colors.white} fill={Colors.white} />
              <Text style={styles.rateBtnText}>{canRateUser ? 'Rate this profile' : (ratingEligibilityReason || 'Not eligible')}</Text>
            </TouchableOpacity>

            {insightsLoading ? (
              <View style={{ paddingVertical: Spacing.lg, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : ratings.length > 0 ? (
              <View style={styles.ratingsList}>
                {ratings.slice(0, showAllRatings ? ratings.length : 5).map((item) => (
                  <View key={item.id} style={styles.ratingItem}>
                    <Image source={{ uri: item.reviewer.avatar || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200' }} style={styles.ratingAvatar} />
                    <View style={styles.ratingContent}>
                      <Text style={styles.ratingName}>{item.reviewer.fullName || item.reviewer.username}</Text>
                      <Stars value={item.rating} size={12} />
                      {!!item.comment && <Text style={styles.ratingComment}>{item.comment}</Text>}
                    </View>
                  </View>
                ))}
                {ratings.length > 5 && (
                  <TouchableOpacity style={styles.viewAllBtn} onPress={() => setShowAllRatings((prev) => !prev)} activeOpacity={0.7}>
                    <Text style={styles.viewAllText}>{showAllRatings ? 'Show less' : `View all ${ratings.length} reviews`}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <Text style={{ color: Colors.gray500, fontSize: FontSizes.sm, textAlign: 'center', paddingVertical: Spacing.md }}>No reviews yet.</Text>
            )}
          </View>
        </View>
      </Modal>

      {/* Rating Modal */}
      <Modal visible={showRatingModal} transparent animationType="fade" onRequestClose={() => setShowRatingModal(false)}>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.infoModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rate Profile</Text>
              <TouchableOpacity onPress={() => setShowRatingModal(false)} activeOpacity={0.7}>
                <X size={24} color={Colors.gray800} />
              </TouchableOpacity>
            </View>

            <Text style={styles.ratingPrompt}>Review for {profile.fullName}</Text>

            <View style={styles.ratingPicker}>
              <View style={styles.ratingPickerRow}>
                {Array.from({ length: 5 }).map((_, index) => {
                  const value = index + 1;
                  const active = value <= ratingValue;
                  return (
                    <TouchableOpacity key={value} onPress={() => setRatingValue(value)} activeOpacity={0.8} style={styles.ratingPickBtn}>
                      <Star size={28} color={active ? '#F59E0B' : Colors.gray300} fill={active ? '#F59E0B' : 'transparent'} />
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.ratingPickerLabel}>{['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][ratingValue]}</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Your review</Text>
              <TextInput
                style={[styles.formInput, styles.ratingCommentInput]}
                placeholder="Share your experience..."
                value={ratingComment}
                onChangeText={setRatingComment}
                placeholderTextColor={Colors.gray400}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <Button title="Submit rating" onPress={handleSubmitRating} loading={ratingSubmitting} />
          </View>
        </View>
      </Modal>

      {/* Full-Screen Media Viewer */}
      <Modal visible={showMediaViewer} transparent animationType="none" onRequestClose={closeMediaViewer} statusBarTranslucent>
        <View style={styles.viewerContainer}>
          <Animated.View
            style={[StyleSheet.absoluteFill, { opacity: mediaViewerAnim, backgroundColor: '#000' }]}
          />
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                transform: [
                  { translateX: mediaViewerPan.x },
                  { translateY: mediaViewerPan.y },
                  { scale: mediaViewerScale },
                ],
              },
            ]}
            {...mediaPanResponder.panHandlers}
          >
            {posts[mediaViewerIndex]?.mediaType === 'image' ? (
              <Image
                source={{ uri: posts[mediaViewerIndex]?.mediaUrl }}
                style={styles.viewerMedia}
                resizeMode="contain"
              />
            ) : (
              <Video
                source={{ uri: posts[mediaViewerIndex]?.mediaUrl }}
                style={styles.viewerMedia}
                resizeMode={ResizeMode.CONTAIN}
                useNativeControls
                shouldPlay
                isLooping
              />
            )}
          </Animated.View>

          {/* Close button */}
          <TouchableOpacity style={styles.viewerCloseBtn} onPress={closeMediaViewer} activeOpacity={0.7}>
            <X size={24} color={Colors.white} />
          </TouchableOpacity>

          {/* Post counter */}
          {posts.length > 1 && (
            <View style={styles.viewerCounter}>
              <Text style={styles.viewerCounterText}>{mediaViewerIndex + 1} / {posts.length}</Text>
            </View>
          )}

          {/* Caption */}
          {!!posts[mediaViewerIndex]?.caption && (
            <View style={styles.viewerCaption}>
              <Text style={styles.viewerCaptionText} numberOfLines={2}>{posts[mediaViewerIndex].caption}</Text>
            </View>
          )}

          {/* Swipe hints */}
          {posts.length > 1 && (
            <View style={styles.viewerNavHints}>
              {mediaViewerIndex > 0 && (
                <TouchableOpacity style={styles.viewerNavBtn} onPress={goToPrevPost} activeOpacity={0.7}>
                  <ChevronRight size={20} color={Colors.white} style={{ transform: [{ rotate: '180deg' }] }} />
                </TouchableOpacity>
              )}
              {mediaViewerIndex < posts.length - 1 && (
                <TouchableOpacity style={styles.viewerNavBtn} onPress={goToNextPost} activeOpacity={0.7}>
                  <ChevronRight size={20} color={Colors.white} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  card: {
    backgroundColor: Colors.white,
    marginHorizontal: CARD_MARGIN,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // Cover
  coverWrapper: {
    position: 'relative',
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    resizeMode: 'cover',
  },
  coverPlaceholder: {
    flex: 1,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.20)',
  },
  coverActions: {
    position: 'absolute',
    top: 56,
    right: Spacing.md,
    flexDirection: 'row',
    gap: 8,
  },
  coverActionBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalBadge: {
    position: 'absolute',
    left: Spacing.md,
    bottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  goalBadgeText: {
    fontSize: FontSizes.xs,
    color: Colors.gray900,
    fontWeight: FontWeights.semiBold as any,
  },

  // Profile Info
  profileInfoWrapper: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  avatarOuter: {
    position: 'relative',
    padding: 4,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  avatar: {
    borderWidth: 3,
    borderColor: Colors.white,
  },
  avatarEditBtn: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: Colors.primary,
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  name: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray900,
    marginTop: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  infoText: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  professionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: Colors.primary + '0E',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  professionText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: FontWeights.semiBold as any,
  },
  email: {
    fontSize: FontSizes.sm,
    color: Colors.gray400,
    marginTop: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.md,
  },
  verificationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  verifiedChip: {
    backgroundColor: '#DCFCE7',
  },
  pendingChip: {
    backgroundColor: '#FEF3C7',
  },
  neutralChip: {
    backgroundColor: Colors.gray100,
  },
  verificationText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semiBold as any,
  },
  socialWrap: {
    marginTop: Spacing.md,
    width: '100%',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  socialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  socialChipText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium as any,
    textTransform: 'capitalize',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray900,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },

  // Menu
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 14,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.gray100,
    marginLeft: 54,
  },
  menuIconWrap: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
    gap: 2,
  },
  menuLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
  },
  menuDesc: {
    fontSize: FontSizes.xs,
    color: Colors.gray400,
  },

  // Section
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
  },

  // Bio
  bioText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 22,
  },

  // Skills
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    backgroundColor: Colors.primary + '0E',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  skillText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: FontWeights.medium as any,
  },

  // Profile Info Cards
  infoGrid: {
    gap: 10,
  },
  infoCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: 10,
  },
  infoCardAccent: {
    width: 6,
    height: 20,
    borderRadius: BorderRadius.full,
    marginBottom: 4,
  },
  infoCardLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    fontWeight: FontWeights.bold as any,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoCell: {
    flex: 1,
    gap: 2,
  },
  infoItem: {
    gap: 2,
  },
  infoDivider: {
    height: 1,
    backgroundColor: Colors.gray200,
    marginVertical: 4,
  },
  infoKey: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    fontWeight: FontWeights.medium as any,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  infoValue: {
    fontSize: FontSizes.sm,
    color: Colors.gray900,
    fontWeight: FontWeights.semiBold as any,
  },

  // Posts
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  uploadBtnText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  postCard: {
  },
  postMedia: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.gray100,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    maxHeight: '92%',
  },
  infoModal: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray900,
  },
  modalBody: {
    marginBottom: Spacing.lg,
  },

  // Form
  formSection: {
    marginBottom: Spacing.lg,
  },
  formSectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  formGroup: {
    marginBottom: Spacing.md,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray700,
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: FontSizes.md,
    color: Colors.gray900,
    backgroundColor: Colors.white,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.white,
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '0E',
  },
  chipText: {
    color: Colors.gray700,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium as any,
  },
  chipTextActive: {
    color: Colors.primary,
  },
  platformChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  // Error
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium as any,
  },

  // Actions
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.xl,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
  },
  cancelBtnText: {
    color: Colors.gray700,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
  },

  // Edit photo area - overlapping cover + avatar
  editCoverWrap: {
    position: 'relative',
    marginBottom: 60,
    marginHorizontal: -Spacing.lg,
  },
  editCoverTouch: {
    width: '100%',
    height: 180,
    overflow: 'hidden',
  },
  editCoverImg: {
    width: '100%',
    height: '100%',
  },
  editCoverPlaceholder: {
    flex: 1,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editCoverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 12,
  },
  editAvatarWrap: {
    position: 'absolute',
    bottom: -40,
    alignSelf: 'center',
    borderRadius: BorderRadius.full,
    borderWidth: 4,
    borderColor: Colors.white,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  editAvatarImg: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray200,
  },
  editAvatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: Colors.white,
  },

  // Bottom sheet
  bottomSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
    paddingTop: Spacing.sm,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  bottomSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gray300,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  bottomSheetTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray900,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  bottomSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  bottomSheetOptionText: {
    fontSize: FontSizes.md,
    color: Colors.gray800,
    fontWeight: FontWeights.medium as any,
  },
  bottomSheetCancel: {
    marginTop: Spacing.sm,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray100,
  },
  bottomSheetCancelText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray700,
  },

  // Social editor
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  helperText: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    lineHeight: 18,
  },
  socialEditor: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.gray50,
    gap: 8,
  },

  // Media
  mediaPreview: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray100,
  },
  mediaPreviewPlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaPlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Verification
  verificationStatusCard: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray50,
    marginBottom: Spacing.md,
    gap: 8,
  },
  verificationTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray900,
  },
  verificationDesc: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  feeCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  feeLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: FontWeights.semiBold as any,
    marginBottom: 4,
  },
  feeValue: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray900,
  },
  feeDate: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: Spacing.sm,
  },

  // Badges
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: Spacing.sm,
  },
  badgeCard: {
    width: '47%',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    gap: 6,
  },
  badgeCardActive: {
    backgroundColor: Colors.gray50,
    borderColor: Colors.primary + '20',
  },
  badgeCardInactive: {
    backgroundColor: Colors.gray50,
    borderColor: Colors.gray200,
    opacity: 0.65,
  },
  badgeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
  },
  badgeDesc: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    lineHeight: 16,
  },
  badgeEarned: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold as any,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // Ratings
  ratingSummary: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray50,
    marginBottom: Spacing.md,
    gap: 8,
  },
  ratingSummaryValue: {
    fontSize: 36,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray900,
  },
  ratingSummaryMeta: {
    color: Colors.gray500,
    fontSize: FontSizes.sm,
  },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  rateBtnDisabled: {
    backgroundColor: Colors.gray300,
  },
  rateBtnText: {
    color: Colors.white,
    fontWeight: FontWeights.semiBold as any,
  },
  ratingsList: {
    gap: 10,
    paddingBottom: Spacing.sm,
  },
  ratingItem: {
    flexDirection: 'row',
    gap: 12,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  ratingAvatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray200,
  },
  ratingContent: {
    flex: 1,
    gap: 4,
  },
  ratingName: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
  },
  ratingComment: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 20,
  },
  viewAllBtn: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '0A',
    borderWidth: 1,
    borderColor: Colors.primary + '18',
  },
  viewAllText: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
  },

  // Rating picker
  ratingPrompt: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  ratingPicker: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: 8,
  },
  ratingPickerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  ratingPickBtn: {
    padding: 4,
  },
  ratingPickerLabel: {
    color: Colors.gray600,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium as any,
  },
  ratingCommentInput: {
    height: 90,
    textAlignVertical: 'top',
  },

  // Video play icon overlay
  postMediaVideo: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
  },
  videoPlayIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -18,
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Full-screen media viewer
  viewerContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerMedia: {
    width: '100%',
    height: '100%',
  },
  viewerCloseBtn: {
    position: 'absolute',
    top: 56,
    right: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  viewerCounter: {
    position: 'absolute',
    top: 60,
    left: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewerCounterText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
  },
  viewerCaption: {
    position: 'absolute',
    bottom: 40,
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  viewerCaptionText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
  viewerNavHints: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    pointerEvents: 'box-none',
  },
  viewerNavBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Misc
  emptyText: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
});
