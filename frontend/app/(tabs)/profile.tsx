import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Modal, TextInput, Alert, Share, Linking, Animated, Dimensions, useWindowDimensions, PanResponder, FlatList, Platform, KeyboardAvoidingView } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  Star,
  MapPin,
  Edit3,
  ChevronRight,
  Shield,
  ShieldCheck,
  Award,
  Briefcase,
  X,
  Video as VideoIcon,
  Camera as CameraIcon,
  Image as LucideImage,
  Code,
  Palette,
  Hammer,
  GanttChart,
  Users,
  GraduationCap,
  UserCircle,
  HelpCircle,
  Mail,
  Phone,
  BadgeCheck,
  Clock3,
  UploadCloud,
  FileText,
  Lock,
  SlidersHorizontal,
  Sparkles,
  Share2,
  ExternalLink,
  Link2,
  Globe,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Linkedin,
  Github,
} from 'lucide-react-native';
import {
  getCurrentUserProfile,
  getVerificationStatus,
  getVerificationFee,
  applyForVerification,
  getRatingEligibility,
  rateUser,
  getUserRatings,
  updateUserProfile,
  uploadCoverPhoto,
  uploadProfilePhoto,
  deleteProfilePhoto,
  deleteCoverPhoto,
} from '@/lib/profileApi';
import { createMyPost, deleteMyPost, getMyPosts, MyPost, updateMyPostCaption } from '@/lib/postsApi';
import { Button } from '@/components/Button';
import Badge from '@/components/Badge';
import Stars from '@/components/Stars';

const MENU_ITEMS = [
  { icon: Shield, label: 'Verification', color: Colors.primary },
  { icon: Award, label: 'Badges & Achievements', color: Colors.accent },
  { icon: Star, label: 'Reviews & Ratings', color: '#F59E0B' },
];

const PROFESSION_OPTIONS = ['tech', 'creative', 'engineering', 'professional', 'freelancer', 'student', 'none', 'other'] as const;
const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'] as const;

const CATEGORIES = [
  { id: "tech", label: "Tech", icon: Code, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
  { id: "creative", label: "Creative", icon: Palette, color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" },
  { id: "engineering", label: "Engineering", icon: Hammer, color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
  { id: "professional", label: "Professional", icon: GanttChart, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
  { id: "freelancer", label: "Freelancer", icon: Users, color: "text-pink-400", bg: "bg-pink-400/10", border: "border-pink-400/20" },
  { id: "student", label: "Student", icon: GraduationCap, color: "text-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/20" },
  { id: "none", label: "None", icon: UserCircle, color: "text-indigo-400", bg: "bg-indigo-400/10", border: "border-indigo-400/20" },
  { id: "other", label: "Other", icon: HelpCircle, color: "text-zinc-400", bg: "bg-zinc-400/10", border: "border-zinc-400/20" },
];

const SUB_PROFESSIONS: Record<string, string[]> = {
  tech: ["Software Developer", "Web Developer", "Data Scientist", "AI / ML Engineer", "Cybersecurity Analyst", "DevOps Engineer", "Mobile App Developer"],
  creative: ["UI/UX Designer", "Graphic Designer", "3D Designer", "2D Designer", "Content Creator", "Video Editor", "Photographer", "Videographer", "Artist / Illustrator", "Musician"],
  engineering: ["Civil Engineer", "Mechanical Engineer", "Electrical Engineer", "Architect", "Structural Engineer"],
  professional: ["Product Manager", "Digital Marketer", "Doctor", "Nurse", "Pharmacist", "Lawyer", "Chartered Accountant", "Teacher / Educator", "Consultant"],
};
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

type VerificationTaskState = 'none' | 'pending' | 'verified' | 'rejected';

type ReviewSortMode = 'recent' | 'highest';

type BadgeMilestone = {
  id: string;
  title: string;
  description: string;
  rarity: string;
  unlockText: string;
  active: boolean;
  color: string;
};

const VERIFICATION_TASKS = [
  {
    key: 'email',
    label: 'Email',
    icon: Mail,
    helper: 'Primary inbox confirmation',
  },
  {
    key: 'phone',
    label: 'Phone',
    icon: Phone,
    helper: 'Reachability and recovery line',
  },
  {
    key: 'identity',
    label: 'Identity',
    icon: BadgeCheck,
    helper: 'Document-backed identity proof',
  },
] as const;

function getRelativeTime(value?: string) {
  if (!value) return 'No timestamp yet';

  const inputDate = new Date(value);
  if (Number.isNaN(inputDate.getTime())) return value;

  const diffMs = Date.now() - inputDate.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

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

function getImageSource(uri?: string | null) {
  const trimmed = uri?.trim();
  return trimmed ? { uri: trimmed } : null;
}

function formatGoal(goal?: string) {
  if (!goal) return '';
  if (goal === 'OFFER_SERVICE') return 'Offering services';
  if (goal === 'HIRE_PROFESSIONALS') return 'Hiring professionals';
  return goal;
}

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
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);
  const [verificationDocs, setVerificationDocs] = useState<Array<{ name: string; uri: string; mimeType?: string }>>([]);
  const [reviewSortMode, setReviewSortMode] = useState<ReviewSortMode>('recent');
  const [reviewFilterMode, setReviewFilterMode] = useState<'all' | 'verified'>('all');
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shareScaleAnim = useRef(new Animated.Value(1)).current;
  const verificationPulseAnim = useRef(new Animated.Value(0)).current;
  const previousVerificationStatus = useRef<VerificationStatus>('none');

  const [showFullscreenViewer, setShowFullscreenViewer] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);
  const [showPostActionSheet, setShowPostActionSheet] = useState(false);
  const [selectedPostForAction, setSelectedPostForAction] = useState<MyPost | null>(null);
  const [showAvatarSheet, setShowAvatarSheet] = useState(false);
  const [showCoverSheet, setShowCoverSheet] = useState(false);

  const gridItemOpacities = useRef<Animated.Value[]>([]);

  const currentVerificationState: VerificationTaskState = verificationStatus === 'verified'
    ? 'verified'
    : verificationStatus === 'pending'
      ? 'pending'
      : verificationStatus === 'rejected'
        ? 'rejected'
        : 'none';

  const verificationTasks = useMemo(() => {
    return VERIFICATION_TASKS.map((task, index) => ({
      ...task,
      state: currentVerificationState,
      isFirst: index === 0,
      isLast: index === VERIFICATION_TASKS.length - 1,
      timestampLabel: currentVerificationState === 'pending'
        ? `Under review ${getRelativeTime(verificationRequestedAt)}`
        : currentVerificationState === 'verified'
          ? `Verified ${getRelativeTime(verificationRequestedAt || new Date().toISOString())}`
          : currentVerificationState === 'rejected'
            ? `Rejected ${getRelativeTime(verificationRequestedAt)}`
            : 'Ready to start',
      actionLabel: currentVerificationState === 'verified'
        ? 'Completed'
        : currentVerificationState === 'rejected'
          ? 'Retry verification'
          : 'Start verification',
    }));
  }, [currentVerificationState, verificationRequestedAt]);

  const badgeMilestones = useMemo<BadgeMilestone[]>(() => {
    const earnedPortfolio = posts.length > 0;
    const earnedCommunity = (ratingsSummary.totalRatings || 0) > 0;
    const earnedVerification = verificationStatus === 'verified';
    const earnedGoal = !!profile?.userGoal && profile.userGoal !== 'none';
    const earnedProfile = !!profile?.fullName && !!profile?.bio && !!profile?.avatar;

    return [
      {
        id: 'verified-profile',
        title: 'Verified Profile',
        description: 'Complete identity and trust verification.',
        rarity: 'Rare',
        unlockText: 'Unlocked after identity approval.',
        active: earnedVerification,
        color: Colors.primary,
      },
      {
        id: 'portfolio-builder',
        title: 'Portfolio Builder',
        description: 'Showcase your work with shared posts.',
        rarity: 'Common',
        unlockText: 'Unlocked when you publish your first post.',
        active: earnedPortfolio,
        color: Colors.secondary,
      },
      {
        id: 'goal-set',
        title: 'Goal Set',
        description: 'Your profile has a clear service goal.',
        rarity: 'Uncommon',
        unlockText: 'Unlocked when you define your work goal.',
        active: earnedGoal,
        color: Colors.accent,
      },
      {
        id: 'community-rated',
        title: 'Community Rated',
        description: 'Earn feedback from other users.',
        rarity: 'Epic',
        unlockText: 'Unlocked after your first review.',
        active: earnedCommunity,
        color: '#F59E0B',
      },
      {
        id: 'profile-complete',
        title: 'Profile Complete',
        description: 'Basic profile details are filled in.',
        rarity: 'Common',
        unlockText: 'Unlocked when your core profile is complete.',
        active: earnedProfile,
        color: '#22C55E',
      },
      {
        id: 'connected',
        title: 'Connected',
        description: 'Share public social links and reachability.',
        rarity: 'Uncommon',
        unlockText: 'Unlocked when you add a public social link.',
        active: (profile?.socialLinks?.length || 0) > 0,
        color: '#8B5CF6',
      },
    ];
  }, [posts.length, profile?.avatar, profile?.bio, profile?.fullName, profile?.socialLinks?.length, profile?.userGoal, ratingsSummary.totalRatings, verificationStatus]);

  const sortedRatings = useMemo(() => {
    const visible = reviewFilterMode === 'all'
      ? ratings
      : ratings.filter((item) => item.comment || item.rating >= 4);

    return [...visible].sort((left, right) => {
      if (reviewSortMode === 'highest' && right.rating !== left.rating) {
        return right.rating - left.rating;
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }, [ratings, reviewFilterMode, reviewSortMode]);

  const ratingDistribution = useMemo(() => {
    return [5, 4, 3, 2, 1].map((star) => {
      const count = ratings.filter((item) => Math.round(item.rating) === star).length;
      const percentage = ratings.length ? Math.round((count / ratings.length) * 100) : 0;
      return { star, count, percentage };
    });
  }, [ratings]);

  useEffect(() => {
    if (previousVerificationStatus.current !== verificationStatus) {
      previousVerificationStatus.current = verificationStatus;
      verificationPulseAnim.setValue(0);
      Animated.timing(verificationPulseAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [verificationPulseAnim, verificationStatus]);

  useEffect(() => {
    gridItemOpacities.current = posts.map(() => new Animated.Value(0));
  }, [posts.length]);

  useEffect(() => {
    if (posts.length > 0 && gridItemOpacities.current.length > 0) {
      gridItemOpacities.current.forEach((val, i) => {
        Animated.timing(val, {
          toValue: 1,
          duration: 200,
          delay: i * 50,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [posts]);


  const { width } = useWindowDimensions();
  const isTablet = width >= 700;
  const avatarSize = isTablet ? 140 : 110;
  const coverHeight = isTablet ? 220 : 170;
  const postGridGap = 4;
  const postTileSize = Math.floor((width - (Spacing.lg * 2) - (Spacing.lg * 2) - (postGridGap * 2)) / 3);

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
  profession: 'none',
  skillsText: '',
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
          if (fetchError) {
            setError(fetchError);
          } else if (data) {
            setProfile(data.user);
            // If viewing someone else's profile, fetch rating eligibility
            try {
              if (session?.access_token && data?.user && currentUser && String(data.user.id) !== String(currentUser.id)) {
                const { data: eligData, error: eligErr } = await getRatingEligibility(session.access_token, data.user.id);
                if (!eligErr && eligData) {
                  setCanRateUser(Boolean(eligData.canRate));
                  setRatingEligibilityReason(eligData.reason || '');
                } else {
                  setCanRateUser(false);
                }
              }
            } catch {
              setCanRateUser(false);
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to load profile');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [session?.access_token]);

  // Dev fallback: when using the dev sign-in helper, populate a minimal profile
  useEffect(() => {
    if (!__DEV__) return;
    if (!session?.access_token) return;
    if (profile) return;
    if (!currentUser) return;

    const devProfile: UserProfile = {
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
      userCode: currentUser.userCode || '',
      createdAt: new Date().toISOString(),
    } as unknown as UserProfile;

    // Set profile and additional demo content so the screen shows all features
    setProfile(devProfile);
    setLoading(false);
    setError(null);

    // Sample posts for the dev profile
    const samplePosts: MyPost[] = [
      {
        id: 'p1',
        mediaUrl: 'https://picsum.photos/600/600?random=1',
        mediaType: 'image',
        caption: 'Recent project: mobile app UI',
        createdAt: new Date().toISOString(),
      } as MyPost,
      {
        id: 'p2',
        mediaUrl: 'https://picsum.photos/600/600?random=2',
        mediaType: 'image',
        caption: 'Portfolio sample — branding work',
        createdAt: new Date().toISOString(),
      } as MyPost,
    ];

    setPosts(samplePosts);
    setPostsLoading(false);
    setPostsError(null);

    // Sample ratings and summary
    const sampleRatings: ProfileRating[] = [
      {
        id: 'r1',
        rating: 5,
        comment: 'Great work, on time and communication was excellent.',
        createdAt: new Date().toISOString(),
        reviewer: { id: 'u2', fullName: 'Client One', avatar: '', username: 'client1' },
      },
    ];

    setRatings(sampleRatings as any);
    setRatingsSummary({ averageRating: 5, totalRatings: 1 });

    // Demo verification/badges
    setVerificationStatus('verified');
    setVerificationFee(0);
  }, [session?.access_token, currentUser, profile]);

  useEffect(() => {
    let isMounted = true;

    async function fetchPosts() {
      if (!session?.access_token) {
        if (isMounted) {
          setPostsLoading(false);
        }
        return;
      }

      if (session.access_token === 'dev-token') {
        if (isMounted) {
          setPostsLoading(false);
        }
        return;
      }

      try {
        const { data, error: fetchError } = await getMyPosts(session.access_token);
        if (!isMounted) return;

        if (fetchError) {
          setPostsError(fetchError);
        } else if (data) {
          setPosts(data.posts);
        }
      } catch {
        if (isMounted) {
          setPostsError('Failed to load posts');
        }
      } finally {
        if (isMounted) {
          setPostsLoading(false);
        }
      }
    }

    fetchPosts();

    return () => {
      isMounted = false;
    };
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

        if (feeResult.data) {
          setVerificationFee(feeResult.data.fee || 0);
        }
      } catch {
        if (isMounted) {
          setVerificationStatus('none');
        }
      }
    }

    fetchVerificationState();

    return () => {
      isMounted = false;
    };
  }, [session?.access_token]);

  // Animate content in when profile is ready
  useEffect(() => {
    if (!loading && profile && !error) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, profile, error, fadeAnim]);

const handleOpenEditModal = () => {
  if (profile) {
    // Set selected category and custom profession based on current profession
    let selectedCategory = '';
    let customProfession = '';
    
    if (profile.profession) {
      if (profile.profession === "none") selectedCategory = "none";
      else if (profile.profession === "freelancer") selectedCategory = "freelancer";
      else if (profile.profession === "student") selectedCategory = "student";
      else {
        let found = false;
        for (const [cat, subProfs] of Object.entries(SUB_PROFESSIONS)) {
          if (subProfs.includes(profile.profession)) {
            selectedCategory = cat;
            found = true;
            break;
          }
        }
        if (!found) {
          selectedCategory = "other";
          customProfession = profile.profession;
        }
      }
    }
    
    setEditForm({
      fullName: profile.fullName,
      city: profile.city || profile.location || '',
      pincode: profile.pincode || '',
      phoneNumber: profile.phoneNumber || '',
      age: profile.age !== null && profile.age !== undefined ? String(profile.age) : '',
      gender: profile.gender || '',
      profession: profile.profession || 'none',
      skillsText: profile.skills.join(', '),
      bio: profile.bio,
      avatar: profile.avatar,
      coverPhoto: profile.coverPhotoUrl || '',
      userGoal: profile.userGoal || '',
      socialLinks: profile.socialLinks || [],
      selectedCategory,
      customProfession
    });
    setEditError(null);
    setShowEditModal(true);
  }
};

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditForm({
      fullName: '',
      city: '',
      pincode: '',
      phoneNumber: '',
      age: '',
      gender: '',
      profession: 'none',
      skillsText: '',
      bio: '',
      avatar: '',
      userGoal: '',
      socialLinks: [],
      customProfession: '',
      selectedCategory: '',
      coverPhoto: '',
    });
    setEditError(null);
  };

  const handleOpenPostModal = () => {
    setEditingPostId(null);
    setPostError(null);
    setPostForm({ caption: '', mediaItems: [] });
    setShowPostModal(true);
  };

  const handleOpenEditPostModal = (post: MyPost) => {
    setEditingPostId(post.id);
    setPostError(null);
    setPostForm({
      caption: post.caption,
      mediaItems: [{ uri: post.mediaUrl, mimeType: post.mediaType === 'video' ? 'video/mp4' : 'image/jpeg' }],
    });
    setShowPostModal(true);
  };

  const handleClosePostModal = () => {
    setShowPostModal(false);
    setEditingPostId(null);
    setPostError(null);
    setPostForm({ caption: '', mediaItems: [] });
  };

    const handleSaveProfile = async () => {
      if (!session?.access_token || !profile) return;

      if (!editForm.fullName.trim()) {
        setEditError('Full name is required');
        return;
      }

      if (editForm.pincode && !/^\d{4,10}$/.test(editForm.pincode.trim())) {
        setEditError('Pincode must be 4 to 10 digits.');
        return;
      }

      if (editForm.phoneNumber && !/^\+?[0-9]{7,15}$/.test(editForm.phoneNumber.trim())) {
        setEditError('Phone number must be 7 to 15 digits (optional + prefix).');
        return;
      }

      let parsedAge: number | null = null;
      if (editForm.age.trim()) {
        parsedAge = Number(editForm.age.trim());
        if (!Number.isFinite(parsedAge) || parsedAge < 0 || parsedAge > 120) {
          setEditError('Age must be a number between 0 and 120.');
          return;
        }
      }

      const skills = editForm.skillsText
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean);

      const socialLinks = editForm.socialLinks
        .map((link) => ({
          platform: String(link.platform || '').trim().toLowerCase(),
          url: normalizeUrl(link.url),
        }))
        .filter((link) => link.platform && link.url);

      let finalProfession: string = editForm.profession;
      if (editForm.selectedCategory === "none") finalProfession = "none";
      else if (editForm.selectedCategory === "freelancer") finalProfession = "freelancer";
      else if (editForm.selectedCategory === "student") finalProfession = "student";
      else if (editForm.selectedCategory === "other") finalProfession = editForm.customProfession || "other";
      else if (editForm.profession === "other") finalProfession = editForm.customProfession || "other";

      const normalizedGoal = editForm.userGoal === 'OFFER_SERVICE' || editForm.userGoal === 'HIRE_PROFESSIONALS'
        ? editForm.userGoal
        : '';

      setEditLoading(true);
      setEditError(null);

      try {
        const { data, error } = await updateUserProfile(session.access_token, {
          fullName: editForm.fullName.trim(),
          location: editForm.city.trim(),
          city: editForm.city.trim(),
          pincode: editForm.pincode.trim(),
          phoneNumber: editForm.phoneNumber.trim(),
          age: parsedAge,
          gender: editForm.gender.trim(),
          profession: finalProfession as any,
          skills,
          bio: editForm.bio.trim(),
          avatar: editForm.avatar,
          coverPhotoUrl: editForm.coverPhoto || undefined,
          userGoal: normalizedGoal,
          socialLinks,
        });

        if (error) {
          setEditError(error);
        } else if (data) {
          setProfile(data.user);
          handleCloseEditModal();
        }
      } catch (err) {
        setEditError('Failed to update profile');
      } finally {
        setEditLoading(false);
      }
    };

  const addSocialLink = () => {
    setEditForm((prev) => ({
      ...prev,
      socialLinks: [...prev.socialLinks, { platform: 'website', url: '' }],
    }));
  };

  const removeSocialLink = (index: number) => {
    setEditForm((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  const updateSocialLink = (index: number, field: 'platform' | 'url', value: string) => {
    setEditForm((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.map((link, currentIndex) =>
        currentIndex === index ? { ...link, [field]: value } : link
      ),
    }));
  };

  const handleOpenUrl = async (url: string) => {
    const normalized = normalizeUrl(url);
    if (!normalized) return;

    try {
      await Linking.openURL(normalized);
    } catch {
      Alert.alert('Unable to open link', normalized);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!session?.access_token) return;

    try {
      const { data, error: deleteError } = await deleteProfilePhoto(session.access_token);
      if (deleteError) {
        Alert.alert('Unable to remove profile photo', deleteError);
        return;
      }

      if (data?.user?.avatar) {
        setProfile((prev) => (prev ? { ...prev, avatar: data.user.avatar } : prev));
        setEditForm((prev) => ({ ...prev, avatar: data.user.avatar }));
        setLocalAvatarPreview(null);
      }
    } catch {
      Alert.alert('Unable to remove profile photo');
    }
  };

  const handleDeleteCoverPhoto = async () => {
    if (!session?.access_token) return;

    try {
      const { data, error: deleteError } = await deleteCoverPhoto(session.access_token);
      if (deleteError) {
        Alert.alert('Unable to remove cover photo', deleteError);
        return;
      }

      if (data?.user?.coverPhotoUrl !== undefined) {
        setProfile((prev) => (prev ? { ...prev, coverPhotoUrl: data.user.coverPhotoUrl } : prev));
        setEditForm((prev) => ({ ...prev, coverPhoto: data.user.coverPhotoUrl || '' }));
        setLocalCoverPreview(null);
      }
    } catch {
      Alert.alert('Unable to remove cover photo');
    }
  };

  const handleShareProfile = async () => {
    if (!profile) return;

    const shareMessage = [
      `${profile.fullName} on Krovaa`,
      profile.profession && profile.profession !== 'none' ? formatProfessionLabel(profile.profession) : '',
      profile.city || profile.location || '',
      profile.userCode ? `Code: ${profile.userCode}` : '',
    ]
      .filter(Boolean)
      .join(' • ');

    try {
      await Share.share({
        message: shareMessage || 'Check out this Krovaa profile.',
      });
    } catch {
      // Fallback: copy profile link to clipboard
      try {
        const link = `https://krovaa.com/s/${(profile as any).shareId || profile.username}`;
        await Clipboard.setStringAsync(link);
        Alert.alert('Link copied', 'Profile link copied to clipboard.');
      } catch {
        Alert.alert('Unable to share profile');
      }
    }
  };

  const handleRequestVerification = async () => {
    if (!session?.access_token) return;

    setVerificationBusy(true);
    try {
      const { data, error } = await applyForVerification(session.access_token);
      if (error) {
        Alert.alert('Verification request failed', error);
        return;
      }

      if (data) {
        setVerificationStatus((data.status as VerificationStatus) || 'pending');
        setVerificationFee(data.fee || verificationFee || 0);
        setVerificationRequestedAt(new Date().toISOString());
        Alert.alert('Verification request submitted', data.message || 'Your request is under review.');
      }
    } catch {
      Alert.alert('Verification request failed');
    } finally {
      setVerificationBusy(false);
    }
  };

  const loadRatingEligibility = async () => {
    if (!profile || !session?.access_token) return;

    try {
      const { data, error: eligibilityError } = await getRatingEligibility(session.access_token, profile.id);
      if (eligibilityError) {
        setCanRateUser(false);
        setRatingEligibilityReason(eligibilityError);
        return;
      }

      setCanRateUser(Boolean(data?.canRate));
      setRatingEligibilityReason(data?.reason || '');
    } catch {
      setCanRateUser(false);
      setRatingEligibilityReason('Unable to check rating eligibility right now.');
    }
  };

  const handleSubmitRating = async () => {
    if (!profile || !session?.access_token) return;

    if (!canRateUser) {
      Alert.alert('Cannot rate profile', ratingEligibilityReason || 'You are not eligible to rate this profile.');
      return;
    }

    if (!ratingComment.trim()) {
      Alert.alert('Add a review', 'Please share a short review before submitting.');
      return;
    }

    setRatingSubmitting(true);
    try {
      const { data, error: submitError } = await rateUser(session.access_token, profile.id, ratingValue, ratingComment.trim());
      if (submitError) {
        Alert.alert('Rating failed', submitError);
        return;
      }

      if (data) {
        setRatingsSummary(data.summary || ratingsSummary);
        setShowRatingModal(false);
        setShowRatingsModal(true);
        setRatingComment('');
        setRatingValue(5);
        await loadRatings();
      }
    } catch {
      Alert.alert('Rating failed', 'Unable to submit your rating.');
    } finally {
      setRatingSubmitting(false);
    }
  };

  const loadRatings = async () => {
    if (!profile) return;

    setInsightsLoading(true);
    try {
      const { data, error: ratingsError } = await getUserRatings(profile.id);
      if (ratingsError) {
        setRatings([]);
        setRatingsSummary({
          averageRating: profile.stats.reviews || 0,
          totalRatings: 0,
        });
        return;
      }

      if (data) {
        setRatings(data.ratings);
        setRatingsSummary(data.summary);
      }
    } catch {
      setRatings([]);
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleMenuPress = (label: string) => {
    if (label === 'Verification') {
      setShowVerificationModal(true);
      return;
    }

    if (label === 'Badges & Achievements') {
      setShowBadgesModal(true);
      return;
    }

    if (label === 'Reviews & Ratings') {
      setShowAllRatings(false);
      setShowRatingsModal(true);
      void loadRatingEligibility();
      void loadRatings();
    }
  };

  const handlePickVerificationDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      setVerificationDocs((previous) => [
        ...previous,
        ...result.assets.map((asset) => ({
          name: asset.name,
          uri: asset.uri,
          mimeType: asset.mimeType,
        })),
      ]);
    } catch {
      Alert.alert('Upload failed', 'Unable to open the document picker right now.');
    }
  };

  const uploadAvatarSelection = async (uri: string) => {
    if (!session?.access_token) {
      setEditError('No authentication token available.');
      return;
    }

    setLocalAvatarPreview(uri);
    setEditForm((prev) => ({ ...prev, avatar: uri }));
    setPhotoUploading(true);
    setEditError(null);

    try {
      const { data, error: uploadError } = await uploadProfilePhoto(session.access_token, uri);
      if (uploadError) {
        setEditError(uploadError);
        return;
      }

      if (data?.user?.avatar) {
        setEditForm((prev) => ({ ...prev, avatar: data.user.avatar }));
        setProfile((prev) => (prev ? { ...prev, avatar: data.user.avatar } : prev));
        setLocalAvatarPreview(null);
      }
    } catch {
      setEditError('Failed to upload profile photo.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      setEditError('Media library permission is required to upload a profile photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      await uploadAvatarSelection(result.assets[0].uri);
    }
  };

  const handleTakeImage = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      setEditError('Camera permission is required to take a profile photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      await uploadAvatarSelection(result.assets[0].uri);
    }
  };

  const uploadCoverSelection = async (uri: string) => {
    if (!session?.access_token) {
      setEditError('No authentication token available.');
      return;
    }

    setLocalCoverPreview(uri);
    setEditForm((prev) => ({ ...prev, coverPhoto: uri }));
    setPhotoUploading(true);
    setEditError(null);

    try {
      const { data, error: uploadError } = await uploadCoverPhoto(session.access_token, uri);
      if (uploadError) {
        setEditError(uploadError);
        return;
      }

      if (data?.user?.coverPhotoUrl) {
        setEditForm((prev) => ({ ...prev, coverPhoto: data.user.coverPhotoUrl || '' }));
        setProfile((prev) => (prev ? { ...prev, coverPhotoUrl: data.user.coverPhotoUrl } : prev));
        setLocalCoverPreview(null);
      }
    } catch {
      setEditError('Failed to upload cover photo.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handlePickCoverPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      setEditError('Media library permission is required to upload a cover photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      await uploadCoverSelection(result.assets[0].uri);
    }
  };

  const handleTakeCoverPhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      setEditError('Camera permission is required to take a cover photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      await uploadCoverSelection(result.assets[0].uri);
    }
  };

  const handlePickPostMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      setPostError('Media library permission is required to upload a post.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const mediaItems = result.assets.map((asset) => ({
        uri: asset.uri,
        mimeType: asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
      }));

      setPostForm((prev) => ({
        ...prev,
        mediaItems,
      }));
      setPostError(null);
    }
  };

  const handleUploadPost = async () => {
    if (!session?.access_token) {
      setPostError('No authentication token available.');
      return;
    }

    setPostUploading(true);
    setPostError(null);

    try {
      if (editingPostId) {
        const { data, error: updateError } = await updateMyPostCaption(
          session.access_token,
          editingPostId,
          postForm.caption.trim()
        );

        if (updateError) {
          setPostError(updateError);
          return;
        }

        if (data?.post) {
          setPosts((prev) => prev.map((post) => (post.id === data.post.id ? data.post : post)));
          handleClosePostModal();
        }
      } else {
        if (postForm.mediaItems.length === 0) {
          setPostError('Please choose one or more photos/videos first.');
          return;
        }

        const createdPosts: MyPost[] = [];
        for (const mediaItem of postForm.mediaItems) {
          const { data, error: uploadError } = await createMyPost(
            session.access_token,
            mediaItem.uri,
            mediaItem.mimeType,
            postForm.caption.trim()
          );

          if (uploadError) {
            if (createdPosts.length > 0) {
              setPosts((prev) => [...createdPosts.reverse(), ...prev]);
            }
            setPostError(uploadError);
            return;
          }

          if (data?.post) {
            createdPosts.push(data.post);
          }
        }

        if (createdPosts.length > 0) {
          setPosts((prev) => [...createdPosts.reverse(), ...prev]);
          handleClosePostModal();
        }
      }
    } catch {
      setPostError(editingPostId ? 'Failed to update post.' : 'Failed to upload post.');
    } finally {
      setPostUploading(false);
    }
  };

  const handleDeletePost = (postId: string) => {
    if (!session?.access_token) {
      setPostsError('No authentication token available.');
      return;
    }

    Alert.alert('Delete post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingPostId(postId);
          setPostsError(null);

          try {
            const { error: deleteError } = await deleteMyPost(session.access_token as string, postId);
            if (deleteError) {
              setPostsError(deleteError);
              return;
            }
            setPosts((prev) => prev.filter((post) => post.id !== postId));
          } catch {
            setPostsError('Failed to delete post.');
          } finally {
            setDeletingPostId(null);
          }
        },
      },
    ]);
  };

  const handlePostOptions = (post: MyPost) => {
    Alert.alert('Post options', 'Choose an action for this post.', [
      {
        text: 'Edit caption',
        onPress: () => handleOpenEditPostModal(post),
      },
      {
        text: 'Delete post',
        style: 'destructive',
        onPress: () => handleDeletePost(post.id),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.errorText}>{error || 'Unable to load profile'}</Text>
        {/* Dev helper: sign in quickly when no session to populate the profile during local development */}
        {(!session || !session.access_token) && signInDev && (
          <TouchableOpacity
            style={styles.devSignInBtn}
            onPress={() => signInDev?.()}
            activeOpacity={0.8}
          >
            <Text style={styles.devSignInText}>Sign in (dev)</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const STATS = [
    { label: 'Jobs Done', value: profile.stats.jobsDone.toString() },
    { label: 'Reviews', value: profile.stats.reviews.toFixed(1) },
    { label: 'Earned', value: `₹${(profile.stats.earned / 1000).toFixed(1)}K` },
  ];
  const goalLabel = formatGoal(profile.userGoal);
  const averageRating = ratingsSummary.averageRating || profile.stats.reviews || 0;
  const isOwnProfile = !!currentUser && !!profile && String(profile.id) === String(currentUser.id);
  const editableAvatarSource = getImageSource(localAvatarPreview || editForm.avatar || profile.avatar);
  const editableCoverSource = getImageSource(localCoverPreview || editForm.coverPhoto || profile.coverPhotoUrl);

  return (
    <ScrollView ref={scrollViewRef} style={styles.container} showsVerticalScrollIndicator={false}>
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [18, 0],
              }),
            },
          ],
        }}
      >
        <View style={styles.headerBg}>
          <View style={[styles.coverSection, { height: coverHeight }] }>
            {localCoverPreview ? (
              <Image source={{ uri: localCoverPreview }} style={[styles.coverImage, { height: coverHeight }]} />
            ) : profile.coverPhotoUrl ? (
              <Image source={{ uri: profile.coverPhotoUrl }} style={[styles.coverImage, { height: coverHeight }]} />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Text style={styles.coverPlaceholderText}>Add a cover photo</Text>
              </View>
            )}
            <View style={styles.coverOverlay} />
            <View style={styles.coverActions}>
              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShareProfile}
                onPressIn={() => {
                  Animated.spring(shareScaleAnim, {
                    toValue: 0.92,
                    useNativeDriver: true,
                  }).start();
                }}
                onPressOut={() => {
                  Animated.spring(shareScaleAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                  }).start();
                }}
                activeOpacity={1}
              >
                <Animated.View style={[styles.shareButtonInner, { transform: [{ scale: shareScaleAnim }] }]}>
                  <Share2 size={18} color={Colors.white} />
                </Animated.View>
              </TouchableOpacity>
            </View>
            {!!goalLabel && (
              <View style={styles.goalBadge}>
                <Text style={styles.goalBadgeText}>{goalLabel}</Text>
              </View>
            )}
          </View>

          <View style={[styles.profileSection, { paddingHorizontal: isTablet ? Spacing.xl : Spacing.lg, marginTop: isTablet ? -60 : -46 }]}>
            <View style={styles.avatarContainer}>
              <View style={[styles.avatarWrapper, { width: avatarSize + 8, height: avatarSize + 8, borderRadius: (avatarSize + 8) / 2 }]}>
                {getImageSource(localAvatarPreview || profile.avatar) ? (
                  <Image
                    source={getImageSource(localAvatarPreview || profile.avatar)!}
                    style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatar,
                      {
                        width: avatarSize,
                        height: avatarSize,
                        borderRadius: avatarSize / 2,
                        backgroundColor: Colors.gray200,
                        justifyContent: 'center',
                        alignItems: 'center',
                      },
                    ]}
                  >
                    <CameraIcon size={24} color={Colors.gray500} />
                  </View>
                )}
                <TouchableOpacity style={styles.avatarOverlay} activeOpacity={0.8} onPress={handleOpenEditModal}>
                  <View style={styles.avatarCameraBadge}>
                    <CameraIcon size={16} color={Colors.white} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.name}>{profile.fullName}</Text>
            <View style={styles.locationRow}>
              <MapPin size={14} color={Colors.gray600} />
              <Text style={styles.location}>{profile.city || profile.location || 'Not set'}</Text>
            </View>
            {!!profile.profession && profile.profession !== 'none' && (
              <Text style={styles.professionText}>{formatProfessionLabel(profile.profession)}</Text>
            )}
            {!!profile.phoneNumber && <Text style={styles.subInfo}>{profile.phoneNumber}</Text>}
            <Text style={styles.email}>{profile.email}</Text>

            <View style={styles.headerMetaRow}>
              {profile.userCode && (
                <View style={styles.userCodeBadge}>
                  <Text style={styles.userCodeLabel}>Your Code</Text>
                  <Text style={styles.userCodeText}>{profile.userCode}</Text>
                </View>
              )}

              <View
                style={[
                  styles.verificationChip,
                  verificationStatus === 'verified'
                    ? styles.verificationChipVerified
                    : verificationStatus === 'pending'
                      ? styles.verificationChipPending
                      : styles.verificationChipNeutral,
                ]}
              >
                <Text style={styles.verificationChipText}>
                  {verificationStatus === 'verified'
                    ? 'Verified'
                    : verificationStatus === 'pending'
                      ? 'Verification pending'
                      : 'Not verified'}
                </Text>
              </View>
            </View>

            {!!profile.socialLinks?.length && (
              <View style={styles.socialPreviewWrap}>
                <Text style={styles.sectionEyebrow}>Connect</Text>
                <View style={styles.socialPreviewRow}>
                  {profile.socialLinks.map((link) => {
                    const Icon = getSocialIcon(link.platform);
                    return (
                      <TouchableOpacity
                        key={`${link.platform}-${link.url}`}
                        style={styles.socialPreviewChip}
                        onPress={() => handleOpenUrl(link.url)}
                        activeOpacity={0.8}
                      >
                        <Icon size={14} color={Colors.primary} />
                        <Text style={styles.socialPreviewText} numberOfLines={1}>
                          {link.platform}
                        </Text>
                        <ExternalLink size={12} color={Colors.gray400} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </View>

      {/* Rest of the UI remains the same */}
      <View style={styles.statsRow}>
        {STATS.map((stat) => (
          <View key={stat.label} style={styles.statItem}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
      
      <View style={styles.postsSection}>
        <View style={styles.postsHeader}>
          <Text style={styles.postsTitle}>My Posts</Text>
          <TouchableOpacity style={styles.addPostButton} onPress={handleOpenPostModal} activeOpacity={0.8}>
            <Text style={styles.addPostButtonText}>Upload</Text>
          </TouchableOpacity>
        </View>

        {postsLoading && (
          <View style={styles.postsStateWrap}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        )}

        {!postsLoading && !!postsError && (
          <Text style={styles.postsErrorText}>{postsError}</Text>
        )}

        {!postsLoading && !postsError && posts.length === 0 && (
          <Text style={styles.postsEmptyText}>No posts yet. Share your previous works and achievements.</Text>
        )}

        {!postsLoading && !postsError && posts.length > 0 && (
          <View style={styles.postsGrid}>
            {posts.map((post, index) => {
              const itemOpacity = gridItemOpacities.current[index] || new Animated.Value(1);
              return (
                <Animated.View
                  key={post.id}
                  style={[styles.postCardWrap, { width: postTileSize, height: postTileSize, opacity: itemOpacity }]}
                >
                  <TouchableOpacity
                    style={styles.postCard}
                    activeOpacity={0.95}
                    onPress={() => {
                      setSelectedPostIndex(index);
                      setShowFullscreenViewer(true);
                    }}
                    onLongPress={() => {
                      setSelectedPostForAction(post);
                      setShowPostActionSheet(true);
                    }}
                  >
                    {post.mediaType === 'image' ? (
                      <Image
                        source={{ uri: post.mediaUrl }}
                        style={styles.postImage}
                      />
                    ) : (
                      <View style={styles.postVideoThumb}>
                        <Video
                          source={{ uri: post.mediaUrl }}
                          style={styles.postVideoPlayer}
                          resizeMode={ResizeMode.COVER}
                          isLooping
                          shouldPlay={false}
                        />
                        <View style={styles.postVideoPlayOverlay}>
                          <VideoIcon size={24} color={Colors.white} />
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.menuSection}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity key={item.label} style={styles.menuItem} activeOpacity={0.75} onPress={() => handleMenuPress(item.label)}>
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
          {profile.bio}
        </Text>
      </View>

      <View style={styles.skillsSection}>
        <Text style={styles.skillsTitle}>Skills</Text>
        <View style={styles.skillsRow}>
          {profile.skills.length > 0 ? profile.skills.map((skill) => (
            <View key={skill} style={styles.skillChip}>
              <Text style={styles.skillText}>{skill}</Text>
            </View>
          )) : <Text style={styles.emptySkillsText}>No skills added yet.</Text>}
        </View>
      </View>

      {isOwnProfile && !isEditing && (
        <View style={styles.profileInfoSection}>
          <Text style={styles.profileInfoSectionLabel}>Profile Information</Text>

          <View style={styles.profileInfoGrid}>
            <View style={styles.profileInfoCard}>
              <View style={styles.profileInfoCardHeader}>
                <View style={[styles.profileInfoAccent, { backgroundColor: '#22C55E' }]} />
                <Text style={styles.profileInfoCardLabel}>Personal Details</Text>
              </View>

              <View style={styles.profileInfoRow}>
                <View style={styles.profileInfoCell}>
                  <Text style={styles.profileInfoKey}>Age</Text>
                  <Text style={styles.profileInfoValue}>{profile.age ?? '—'}</Text>
                </View>
                <View style={styles.profileInfoCell}>
                  <Text style={styles.profileInfoKey}>Gender</Text>
                  <Text style={styles.profileInfoValue}>{profile.gender || '—'}</Text>
                </View>
              </View>

              <View style={styles.profileInfoDivider} />

              <View style={styles.profileInfoItem}>
                <View style={styles.profileInfoInlineRow}>
                  <MapPin size={13} color={Colors.gray500} />
                  <Text style={styles.profileInfoValue}>
                    {profile.city || profile.location || 'Not set'}
                    {profile.pincode ? ` (${profile.pincode})` : ''}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.profileInfoCard}>
              <View style={styles.profileInfoCardHeader}>
                <View style={[styles.profileInfoAccent, { backgroundColor: Colors.primary }]} />
                <Text style={styles.profileInfoCardLabel}>Identity & Contact</Text>
              </View>

              <View style={styles.profileInfoItem}>
                <Text style={styles.profileInfoKey}>Username</Text>
                <View style={styles.profileInfoInlineRow}>
                  <Text style={styles.profileInfoValue}>@{profile.username}</Text>
                  <View style={styles.profileInfoPill}>
                    <Text style={styles.profileInfoPillText}>Verified</Text>
                  </View>
                </View>
              </View>

              {!!profile.phoneNumber && (
                <View style={styles.profileInfoItem}>
                  <Text style={styles.profileInfoKey}>Phone</Text>
                  <Text style={styles.profileInfoValueEmphasis}>{profile.phoneNumber}</Text>
                </View>
              )}

              <View style={styles.profileInfoItem}>
                <Text style={styles.profileInfoKey}>Email</Text>
                <Text style={styles.profileInfoValue}>{profile.email}</Text>
              </View>
            </View>
          </View>
        </View>
      )}
{/* 
      <View style={styles.postsSection}>
        <View style={styles.postsHeader}>
          <Text style={styles.postsTitle}>My Posts</Text>
          <TouchableOpacity style={styles.addPostButton} onPress={handleOpenPostModal} activeOpacity={0.8}>
            <Text style={styles.addPostButtonText}>Upload</Text>
          </TouchableOpacity>
        </View>

        {postsLoading && (
          <View style={styles.postsStateWrap}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        )}

        {!postsLoading && !!postsError && (
          <Text style={styles.postsErrorText}>{postsError}</Text>
        )}

        {!postsLoading && !postsError && posts.length === 0 && (
          <Text style={styles.postsEmptyText}>No posts yet. Share your previous works and achievements.</Text>
        )}

        {!postsLoading && !postsError && posts.length > 0 && (
          <View style={styles.postsGrid}>
            {posts.map((post) => (
              <View key={post.id} style={styles.postCard}>
                {post.mediaType === 'image' ? (
                  <Image source={{ uri: post.mediaUrl }} style={styles.postImage} />
                ) : (
                  <View style={styles.postVideoPlaceholder}>
                    <Video size={22} color={Colors.white} />
                    <Text style={styles.postVideoText}>Video</Text>
                  </View>
                )}
                {!!post.caption && <Text style={styles.postCaption} numberOfLines={2}>{post.caption}</Text>}
                <Text style={styles.postDateText}>{new Date(post.createdAt).toLocaleDateString()}</Text>
              </View>
            ))}
          </View>
        )}
      </View> */}

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={handleCloseEditModal}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView style={styles.editModalKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.modalContent}>
              <View style={styles.editModalHeader}>
                <TouchableOpacity onPress={handleCloseEditModal} activeOpacity={0.8} style={styles.editHeaderIconButton}>
                  <X size={22} color={Colors.gray800} />
                </TouchableOpacity>
                <View style={styles.editModalHeaderCopy}>
                  <Text style={styles.modalTitle}>Edit Profile</Text>
                  <Text style={styles.editModalSubtitle}>Update your visuals, identity, and public details.</Text>
                </View>
                <View style={styles.editHeaderSpacer} />
              </View>

              {editError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorBoxText}>{editError}</Text>
                </View>
              )}

              <ScrollView
                style={styles.formContent}
                contentContainerStyle={styles.editScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.editHeroCard}>
                  <TouchableOpacity activeOpacity={0.92} onPress={() => setShowCoverSheet(true)}>
                    <View style={styles.editCoverStage}>
                      {editableCoverSource ? (
                        <Image source={editableCoverSource} style={styles.editCoverImage} />
                      ) : (
                        <View style={styles.editCoverPlaceholderStage}>
                          <CameraIcon size={28} color={Colors.gray400} />
                          <Text style={styles.editCoverPlaceholderText}>Add a cover photo</Text>
                          <Text style={styles.editCoverPlaceholderSubtext}>16:9 banner recommended</Text>
                        </View>
                      )}
                      <View style={styles.editCoverShade} />
                      <View style={styles.editCoverActionPill}>
                        <CameraIcon size={14} color={Colors.white} />
                        <Text style={styles.editCoverActionText}>{editableCoverSource ? 'Change Cover' : 'Add Cover'}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.editAvatarOverlapRow}>
                    <TouchableOpacity activeOpacity={0.9} onPress={() => setShowAvatarSheet(true)}>
                      <View style={styles.editAvatarStack}>
                        {editableAvatarSource ? (
                          <Image source={editableAvatarSource} style={styles.editAvatarImage} />
                        ) : (
                          <View style={styles.editAvatarFallback}>
                            <CameraIcon size={24} color={Colors.gray500} />
                          </View>
                        )}
                        <View style={styles.editAvatarBadge}>
                          <CameraIcon size={14} color={Colors.white} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.editHeroCopy}>
                    <Text style={styles.editHeroName}>{profile.fullName}</Text>
                    <Text style={styles.editHeroDescription}>Tap the banner or avatar to update your profile visuals first.</Text>
                  </View>
                </View>

                <View style={styles.editContentCard}>
                  <View style={styles.formSectionHeader}>
                    <Text style={styles.formSectionHeaderText}>Profile Information</Text>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Full Name</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Enter your full name"
                      value={editForm.fullName}
                      onChangeText={(text) => setEditForm({ ...editForm, fullName: text })}
                      placeholderTextColor={Colors.gray400}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>City</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Enter your city"
                      value={editForm.city}
                      onChangeText={(text) => setEditForm({ ...editForm, city: text })}
                      placeholderTextColor={Colors.gray400}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Pincode</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Enter pincode"
                      value={editForm.pincode}
                      onChangeText={(text) => setEditForm({ ...editForm, pincode: text })}
                      placeholderTextColor={Colors.gray400}
                      keyboardType="number-pad"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Phone Number</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Enter phone number"
                      value={editForm.phoneNumber}
                      onChangeText={(text) => setEditForm({ ...editForm, phoneNumber: text })}
                      placeholderTextColor={Colors.gray400}
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Age</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Enter age"
                      value={editForm.age}
                      onChangeText={(text) => setEditForm({ ...editForm, age: text })}
                      placeholderTextColor={Colors.gray400}
                      keyboardType="number-pad"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Gender</Text>
                    <View style={styles.optionWrap}>
                      {GENDER_OPTIONS.map((option) => {
                        const selected = editForm.gender.toLowerCase() === option.toLowerCase();
                        return (
                          <TouchableOpacity
                            key={option}
                            style={[styles.optionChip, selected && styles.optionChipSelected]}
                            onPress={() => setEditForm({ ...editForm, gender: option })}
                            activeOpacity={0.75}
                          >
                            <Text style={[styles.optionChipText, selected && styles.optionChipTextSelected]}>{option}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Profession</Text>

                    <View style={styles.categoryWrap}>
                      {CATEGORIES.map((cat) => (
                        <TouchableOpacity
                          key={cat.id}
                          activeOpacity={0.7}
                          onPress={() => {
                            setEditForm((prev) => ({
                              ...prev,
                              selectedCategory: cat.id,
                              profession: 'none',
                              customProfession: '',
                            }));
                          }}
                          style={[styles.categoryChip, editForm.selectedCategory === cat.id && styles.optionChipSelected]}
                        >
                          <View style={styles.categoryChipInner}>
                            <cat.icon size={16} color={cat.color.replace('text-', '').replace('-400', '600')} />
                            <Text style={[styles.categoryChipText, editForm.selectedCategory === cat.id && styles.optionChipTextSelected]}>{cat.label}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {editForm.selectedCategory && SUB_PROFESSIONS[editForm.selectedCategory] && (
                      <View style={styles.inlineBlockSpacing}>
                        <Text style={styles.inlineBlockLabel}>Select Expertise</Text>
                        <View style={styles.optionWrap}>
                          {SUB_PROFESSIONS[editForm.selectedCategory].map((prof) => (
                            <TouchableOpacity
                              key={prof}
                              activeOpacity={0.7}
                              onPress={() =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  profession: prof,
                                  customProfession: '',
                                }))
                              }
                              style={[styles.optionChip, editForm.profession === prof && styles.optionChipSelected]}
                            >
                              <Text style={[styles.optionChipText, editForm.profession === prof && styles.optionChipTextSelected]}>{prof}</Text>
                            </TouchableOpacity>
                          ))}
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() =>
                              setEditForm((prev) => ({
                                ...prev,
                                profession: 'other',
                                customProfession: '',
                              }))
                            }
                            style={[styles.optionChip, editForm.profession === 'other' && styles.optionChipSelected]}
                          >
                            <Text style={[styles.optionChipText, editForm.profession === 'other' && styles.optionChipTextSelected]}>Other...</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {(editForm.selectedCategory === 'other' || editForm.profession === 'other') && (
                      <View style={styles.inlineBlockSpacing}>
                        <Text style={styles.inlineBlockLabel}>Specify Profession</Text>
                        <TextInput
                          style={styles.formInput}
                          placeholder="E.g. Full Stack Engineer, UX Specialist..."
                          value={editForm.customProfession}
                          onChangeText={(text) =>
                            setEditForm((prev) => ({
                              ...prev,
                              customProfession: text,
                              profession: text ? 'other' : 'none',
                            }))
                          }
                        />
                      </View>
                    )}
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Skills</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. React Native, Figma, Java"
                      value={editForm.skillsText}
                      onChangeText={(text) => setEditForm({ ...editForm, skillsText: text })}
                      placeholderTextColor={Colors.gray400}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Bio</Text>
                    <TextInput
                      style={[styles.formInput, styles.bioInput]}
                      placeholder="Tell us about yourself"
                      value={editForm.bio}
                      onChangeText={(text) => setEditForm({ ...editForm, bio: text })}
                      placeholderTextColor={Colors.gray400}
                      multiline
                      numberOfLines={4}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>I am here to...</Text>
                    <View style={styles.optionWrap}>
                      {[
                        { value: 'OFFER_SERVICE', label: 'Offer services' },
                        { value: 'HIRE_PROFESSIONALS', label: 'Hire professionals' },
                      ].map((option) => {
                        const selected = editForm.userGoal === option.value;
                        return (
                          <TouchableOpacity
                            key={option.value}
                            style={[styles.optionChip, selected && styles.optionChipSelected]}
                            onPress={() => setEditForm((prev) => ({ ...prev, userGoal: option.value }))}
                            activeOpacity={0.75}
                          >
                            <Text style={[styles.optionChipText, selected && styles.optionChipTextSelected]}>{option.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.formLabel}>Social Links</Text>
                      <TouchableOpacity onPress={addSocialLink} activeOpacity={0.75}>
                        <Text style={styles.inlineActionText}>+ Add</Text>
                      </TouchableOpacity>
                    </View>

                    {editForm.socialLinks.length === 0 && (
                      <Text style={styles.helperText}>Add your Facebook, LinkedIn, Instagram, GitHub, website, or other public link.</Text>
                    )}

                    {editForm.socialLinks.map((link, index) => (
                      <View key={`${link.platform}-${index}`} style={styles.socialLinkEditor}>
                        <View style={styles.optionWrap}>
                          {SOCIAL_PLATFORM_OPTIONS.map((option) => {
                            const selected = link.platform === option.value;
                            return (
                              <TouchableOpacity
                                key={option.value}
                                style={[styles.optionChip, styles.platformChip, selected && styles.optionChipSelected]}
                                onPress={() => updateSocialLink(index, 'platform', option.value)}
                                activeOpacity={0.75}
                              >
                                <Text style={[styles.optionChipText, selected && styles.optionChipTextSelected]}>{option.label}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        <TextInput
                          style={styles.formInput}
                          placeholder="Paste profile URL"
                          value={link.url}
                          onChangeText={(text) => updateSocialLink(index, 'url', text)}
                          placeholderTextColor={Colors.gray400}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />

                        <TouchableOpacity style={styles.removeSocialLinkButton} onPress={() => removeSocialLink(index)} activeOpacity={0.75}>
                          <Text style={styles.removeSocialLinkText}>Remove link</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>

              <View style={styles.editFooter}>
                <TouchableOpacity style={styles.editFooterCancelButton} onPress={handleCloseEditModal} disabled={editLoading} activeOpacity={0.8}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Button title="Save" onPress={handleSaveProfile} loading={editLoading} style={styles.editFooterPrimaryButton} />
              </View>

          {/* Avatar Action Sheet */}
          <Modal visible={showAvatarSheet} transparent animationType="none" onRequestClose={() => setShowAvatarSheet(false)}>
            <TouchableOpacity
              style={styles.actionSheetOverlay}
              activeOpacity={1}
              onPress={() => setShowAvatarSheet(false)}
            >
              <View style={styles.actionSheetContainer}>
                <View style={styles.actionSheetContent}>
                  <TouchableOpacity
                    style={styles.actionSheetOption}
                    onPress={() => { setShowAvatarSheet(false); void handleTakeImage(); }}
                    activeOpacity={0.7}
                  >
                    <CameraIcon size={20} color={Colors.gray800} />
                    <Text style={styles.actionSheetOptionText}>Take Photo</Text>
                  </TouchableOpacity>
                  <View style={styles.actionSheetDivider} />
                  <TouchableOpacity
                    style={styles.actionSheetOption}
                    onPress={() => { setShowAvatarSheet(false); void handlePickImage(); }}
                    activeOpacity={0.7}
                  >
                    <LucideImage size={20} color={Colors.gray800} />
                    <Text style={styles.actionSheetOptionText}>Choose from Gallery</Text>
                  </TouchableOpacity>
                  <View style={styles.actionSheetDivider} />
                  <TouchableOpacity
                    style={styles.actionSheetOption}
                    onPress={() => { setShowAvatarSheet(false); handleDeleteAvatar(); }}
                    activeOpacity={0.7}
                  >
                    <X size={20} color={Colors.error} />
                    <Text style={[styles.actionSheetOptionText, { color: Colors.error }]}>Remove Current Photo</Text>
                  </TouchableOpacity>
                  <View style={styles.actionSheetCancelDivider} />
                  <TouchableOpacity
                    style={styles.actionSheetCancelOption}
                    onPress={() => setShowAvatarSheet(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.actionSheetCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Cover Action Sheet */}
          <Modal visible={showCoverSheet} transparent animationType="none" onRequestClose={() => setShowCoverSheet(false)}>
            <TouchableOpacity
              style={styles.actionSheetOverlay}
              activeOpacity={1}
              onPress={() => setShowCoverSheet(false)}
            >
              <View style={styles.actionSheetContainer}>
                <View style={styles.actionSheetContent}>
                  <TouchableOpacity
                    style={styles.actionSheetOption}
                    onPress={() => { setShowCoverSheet(false); void handleTakeCoverPhoto(); }}
                    activeOpacity={0.7}
                  >
                    <CameraIcon size={20} color={Colors.gray800} />
                    <Text style={styles.actionSheetOptionText}>Take Photo</Text>
                  </TouchableOpacity>
                  <View style={styles.actionSheetDivider} />
                  <TouchableOpacity
                    style={styles.actionSheetOption}
                    onPress={() => { setShowCoverSheet(false); void handlePickCoverPhoto(); }}
                    activeOpacity={0.7}
                  >
                    <LucideImage size={20} color={Colors.gray800} />
                    <Text style={styles.actionSheetOptionText}>Choose from Gallery</Text>
                  </TouchableOpacity>
                  <View style={styles.actionSheetDivider} />
                  <TouchableOpacity
                    style={styles.actionSheetOption}
                    onPress={() => { setShowCoverSheet(false); void handleDeleteCoverPhoto(); }}
                    activeOpacity={0.7}
                  >
                    <X size={20} color={Colors.error} />
                    <Text style={[styles.actionSheetOptionText, { color: Colors.error }]}>Remove Cover Photo</Text>
                  </TouchableOpacity>
                  <View style={styles.actionSheetCancelDivider} />
                  <TouchableOpacity
                    style={styles.actionSheetCancelOption}
                    onPress={() => setShowCoverSheet(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.actionSheetCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Modal>

          </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={showPostModal} transparent animationType="slide" onRequestClose={handleClosePostModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingPostId ? 'Edit Post' : 'Create Post'}</Text>
              <TouchableOpacity onPress={handleClosePostModal} activeOpacity={0.7}>
                <X size={24} color={Colors.gray800} />
              </TouchableOpacity>
            </View>

            {postError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{postError}</Text>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Caption</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Describe this work or achievement"
                value={postForm.caption}
                onChangeText={(text) => setPostForm((prev) => ({ ...prev, caption: text }))}
                placeholderTextColor={Colors.gray400}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Media</Text>
              {postForm.mediaItems.length > 0 ? (
                postForm.mediaItems[0].mimeType.startsWith('video/') ? (
                  <View style={styles.postModalVideoPreview}>
                    <VideoIcon size={22} color={Colors.white} />
                    <Text style={styles.postVideoText}>
                      {postForm.mediaItems.length === 1 ? 'Video selected' : `${postForm.mediaItems.length} media selected`}
                    </Text>
                  </View>
                ) : (
                  <Image source={{ uri: postForm.mediaItems[0].uri }} style={styles.postModalImagePreview} />
                )
              ) : (
                <Text style={styles.postsEmptyText}>No media selected</Text>
              )}
              {!editingPostId ? (
                <View style={styles.postModalButtons}>
                  <Button title="Choose Photo/Video(s)" onPress={handlePickPostMedia} />
                </View>
              ) : (
                <Text style={styles.editPostHint}>Media replacement is not enabled yet. You can update caption.</Text>
              )}
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.formButton, styles.cancelButton]}
                onPress={handleClosePostModal}
                disabled={postUploading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <Button
                title={editingPostId ? 'Save Changes' : 'Upload Post'}
                onPress={handleUploadPost}
                loading={postUploading}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showVerificationModal} transparent animationType="fade" onRequestClose={() => setShowVerificationModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.infoModalContent, styles.dashboardModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verification</Text>
              <TouchableOpacity onPress={() => setShowVerificationModal(false)} activeOpacity={0.7}>
                <X size={24} color={Colors.gray800} />
              </TouchableOpacity>
            </View>

            <Text style={styles.dashboardIntro}>
              Track email, phone, and identity status separately. Each step stays visible while your verification review moves forward.
            </Text>

            <View style={styles.verificationTimeline}>
              {verificationTasks.map((task, index) => {
                const TaskIcon = task.icon;
                const isVerified = task.state === 'verified';
                const isPending = task.state === 'pending';
                const isRejected = task.state === 'rejected';

                return (
                  <View key={task.key} style={styles.verificationStepRow}>
                    <View style={[styles.verificationStepRail, task.isLast && styles.verificationStepRailHidden]} />
                    <Animated.View
                      style={[
                        styles.verificationStepIcon,
                        isVerified && styles.verificationStepIconVerified,
                        isPending && styles.verificationStepIconPending,
                        isRejected && styles.verificationStepIconRejected,
                        {
                          transform: [{ scale: verificationPulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) }],
                        },
                      ]}
                    >
                      <TaskIcon size={18} color={isVerified ? Colors.white : isPending ? Colors.warning : isRejected ? Colors.error : Colors.primary} />
                    </Animated.View>

                    <View style={styles.verificationStepBody}>
                      <View style={styles.verificationStepHeader}>
                        <Text style={styles.verificationStepTitle}>{task.label}</Text>
                        <View
                          style={[
                            styles.verificationStatusPill,
                            isVerified && styles.verificationStatusPillVerified,
                            isPending && styles.verificationStatusPillPending,
                            isRejected && styles.verificationStatusPillRejected,
                            !isVerified && !isPending && !isRejected && styles.verificationStatusPillNeutral,
                          ]}
                        >
                          <Text
                            style={[
                              styles.verificationStatusPillText,
                              isVerified && styles.verificationStatusPillTextVerified,
                              isPending && styles.verificationStatusPillTextPending,
                              isRejected && styles.verificationStatusPillTextRejected,
                            ]}
                          >
                            {isVerified ? 'Verified' : isPending ? 'Pending' : isRejected ? 'Rejected' : 'Not verified'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.verificationStepHelper}>{task.helper}</Text>
                      <Text style={styles.verificationStepMeta}>{task.timestampLabel}</Text>

                      <View style={styles.verificationStepActions}>
                        {isPending ? (
                          <View style={styles.verificationDisabledPill}>
                            <Clock3 size={14} color={Colors.gray600} />
                            <Text style={styles.verificationDisabledPillText}>Under review</Text>
                          </View>
                        ) : isVerified ? (
                          <View style={styles.verificationSuccessPill}>
                            <BadgeCheck size={14} color={Colors.white} />
                            <Text style={styles.verificationSuccessPillText}>Completed</Text>
                          </View>
                        ) : (
                          <Button title={task.actionLabel} onPress={handleRequestVerification} loading={verificationBusy} />
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity style={styles.verificationUploadCard} onPress={handlePickVerificationDocument} activeOpacity={0.85}>
              <UploadCloud size={24} color={Colors.primary} />
              <Text style={styles.verificationUploadTitle}>Drop or tap to upload documents</Text>
              <Text style={styles.verificationUploadText}>Images and PDFs appear here before you submit the flow.</Text>
            </TouchableOpacity>

            {verificationDocs.length > 0 && (
              <View style={styles.verificationDocsGrid}>
                {verificationDocs.map((doc) => (
                  <View key={`${doc.uri}-${doc.name}`} style={styles.verificationDocChip}>
                    <View style={styles.verificationDocIconWrap}>
                      {doc.mimeType?.includes('pdf') ? <FileText size={14} color={Colors.primary} /> : <LucideImage size={14} color={Colors.primary} />}
                    </View>
                    <Text style={styles.verificationDocText} numberOfLines={1}>
                      {doc.name}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.infoModalCard}>
              <Text style={styles.infoModalCardLabel}>Fee</Text>
              <Text style={styles.infoModalCardValue}>₹{verificationFee || 299}</Text>
            </View>

            {verificationStatus === 'rejected' && (
              <Text style={styles.verificationRetryCopy}>
                Your previous request was rejected. Replace the files above and retry the workflow.
              </Text>
            )}

            {!!verificationRequestedAt && (
              <Text style={styles.infoModalMeta}>
                Requested on {new Date(verificationRequestedAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showBadgesModal} transparent animationType="fade" onRequestClose={() => setShowBadgesModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.infoModalContent, styles.dashboardModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Badges & Achievements</Text>
              <TouchableOpacity onPress={() => setShowBadgesModal(false)} activeOpacity={0.7}>
                <X size={24} color={Colors.gray800} />
              </TouchableOpacity>
            </View>

            <Text style={styles.dashboardIntro}>
              Earn badges as your profile activity grows. Locked milestones stay muted until you unlock them.
            </Text>

            <View style={styles.badgesGrid}>
              {badgeMilestones.map((badge) => {
                const isSelected = selectedBadgeId === badge.id;
                return (
                  <TouchableOpacity
                    key={badge.id}
                    style={[
                      styles.badgeCard,
                      badge.active ? styles.badgeCardActive : styles.badgeCardInactive,
                      !badge.active && Platform.OS === 'web' ? ({ filter: 'grayscale(100%)' } as any) : null,
                    ]}
                    onPress={() => setSelectedBadgeId((current) => (current === badge.id ? null : badge.id))}
                    activeOpacity={0.85}
                  >
                    <View style={styles.badgeCardTopRow}>
                      <View style={[styles.badgeIconWrap, { backgroundColor: `${badge.color}20` }]}> 
                        <Award size={18} color={badge.color} />
                      </View>
                      <View style={[styles.badgeStatePill, badge.active ? styles.badgeStatePillEarned : styles.badgeStatePillLocked]}>
                        <Text style={[styles.badgeStatePillText, badge.active ? styles.badgeStatePillTextEarned : styles.badgeStatePillTextLocked]}>
                          {badge.active ? 'Earned' : 'Locked'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.badgeTitle}>{badge.title}</Text>
                    <Text style={styles.badgeDescription}>{badge.description}</Text>
                    <Text style={styles.badgeRarity}>{badge.rarity}</Text>

                    {!badge.active && (
                      <View style={styles.badgeLockOverlay}>
                        <Lock size={18} color={Colors.white} />
                      </View>
                    )}

                    {isSelected && (
                      <View style={styles.badgeTooltip}>
                        <Text style={styles.badgeTooltipTitle}>{badge.title}</Text>
                        <Text style={styles.badgeTooltipText}>{badge.description}</Text>
                        <Text style={styles.badgeTooltipMeta}>Tier: {badge.rarity}</Text>
                        <Text style={styles.badgeTooltipMeta}>{badge.unlockText}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showRatingsModal} transparent animationType="fade" onRequestClose={() => setShowRatingsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.infoModalContent, styles.dashboardModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reviews & Ratings</Text>
              <TouchableOpacity onPress={() => setShowRatingsModal(false)} activeOpacity={0.7}>
                <X size={24} color={Colors.gray800} />
              </TouchableOpacity>
            </View>

            <Text style={styles.dashboardIntro}>
              An analytics-backed review ledger with sorting, filters, and a virtualized feed for faster browsing.
            </Text>

            <View style={styles.ratingSummaryCard}>
              <Text style={styles.ratingSummaryValue}>{averageRating.toFixed(1)}</Text>
              <View style={styles.ratingStarsRow}>
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    size={14}
                    color={index < Math.round(averageRating) ? '#F59E0B' : Colors.gray300}
                    fill={index < Math.round(averageRating) ? '#F59E0B' : 'transparent'}
                  />
                ))}
              </View>
              <Text style={styles.ratingSummaryMeta}>{ratingsSummary.totalRatings || 0} reviews</Text>
            </View>

            <View style={styles.ratingAnalyticsGrid}>
              <View style={styles.ratingDistributionCard}>
                {ratingDistribution.map((row) => (
                  <View key={row.star} style={styles.ratingDistributionRow}>
                    <Text style={styles.ratingDistributionLabel}>{row.star}★</Text>
                    <View style={styles.ratingDistributionBarTrack}>
                      <View style={[styles.ratingDistributionBarFill, { width: `${row.percentage}%` }]} />
                    </View>
                    <Text style={styles.ratingDistributionValue}>{row.percentage}%</Text>
                  </View>
                ))}
              </View>

              <View style={styles.reviewControlsRow}>
                <TouchableOpacity
                  style={[styles.reviewControlChip, reviewSortMode === 'recent' && styles.reviewControlChipActive]}
                  onPress={() => setReviewSortMode('recent')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.reviewControlChipText, reviewSortMode === 'recent' && styles.reviewControlChipTextActive]}>Most Recent</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.reviewControlChip, reviewSortMode === 'highest' && styles.reviewControlChipActive]}
                  onPress={() => setReviewSortMode('highest')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.reviewControlChipText, reviewSortMode === 'highest' && styles.reviewControlChipTextActive]}>Highest Rated</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.reviewControlChip, reviewFilterMode === 'verified' && styles.reviewControlChipActive]}
                  onPress={() => setReviewFilterMode((current) => (current === 'all' ? 'verified' : 'all'))}
                  activeOpacity={0.8}
                >
                  <SlidersHorizontal size={14} color={reviewFilterMode === 'verified' ? Colors.primary : Colors.gray600} />
                  <Text style={[styles.reviewControlChipText, reviewFilterMode === 'verified' && styles.reviewControlChipTextActive]}>Verified Only</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.rateProfileButton, !canRateUser && styles.rateProfileButtonDisabled]}
              onPress={() => setShowRatingModal(true)}
              activeOpacity={0.8}
              disabled={!canRateUser}
            >
              <Star size={16} color={Colors.white} fill={Colors.white} />
              <Text style={styles.rateProfileButtonText}>{canRateUser ? 'Rate this profile' : (ratingEligibilityReason || 'Not eligible to rate')}</Text>
            </TouchableOpacity>

            {insightsLoading ? (
              <View style={styles.reviewSkeletonList}>
                {Array.from({ length: 3 }).map((_, index) => (
                  <View key={index} style={styles.reviewSkeletonRow}>
                    <View style={styles.reviewSkeletonAvatar} />
                    <View style={styles.reviewSkeletonBody}>
                      <View style={styles.reviewSkeletonLineShort} />
                      <View style={styles.reviewSkeletonLineLong} />
                      <View style={styles.reviewSkeletonLineLonger} />
                    </View>
                  </View>
                ))}
              </View>
            ) : sortedRatings.length > 0 ? (
              <FlatList
                data={sortedRatings}
                keyExtractor={(item) => item.id}
                style={styles.reviewFeed}
                contentContainerStyle={styles.reviewFeedContent}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                ListHeaderComponent={
                  showAllRatings ? null : (
                    <Text style={styles.reviewFeedHeader}>Showing the most relevant reviews first. Toggle the filters above to refine the feed.</Text>
                  )
                }
                renderItem={({ item }) => (
                  <View style={styles.ratingItem}>
                    {getImageSource(item.reviewer.avatar) ? (
                      <Image source={getImageSource(item.reviewer.avatar)!} style={styles.ratingAvatar} />
                    ) : (
                      <View style={[styles.ratingAvatar, { backgroundColor: Colors.gray200, justifyContent: 'center', alignItems: 'center' }]}>
                        <UserCircle size={18} color={Colors.gray500} />
                      </View>
                    )}
                    <View style={styles.ratingContent}>
                      <View style={styles.ratingMetaRow}>
                        <Text style={styles.ratingName}>{item.reviewer.fullName || item.reviewer.username}</Text>
                        <Text style={styles.ratingTimeText}>{getRelativeTime(item.createdAt)}</Text>
                      </View>
                      <View style={styles.ratingStarsRow}>
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={index}
                            size={12}
                            color={index < item.rating ? '#F59E0B' : Colors.gray300}
                            fill={index < item.rating ? '#F59E0B' : 'transparent'}
                          />
                        ))}
                        <View style={styles.verifiedReviewPill}>
                          <BadgeCheck size={11} color={Colors.primary} />
                          <Text style={styles.verifiedReviewPillText}>Verified Review</Text>
                        </View>
                      </View>
                      <Text style={styles.ratingScoreText}>{item.rating.toFixed(1)} / 5</Text>
                      {!!item.comment ? (
                        <Text style={styles.ratingComment}>{item.comment}</Text>
                      ) : (
                        <Text style={styles.ratingCommentMuted}>No written feedback was left for this review.</Text>
                      )}
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyReviewState}>
                    <Sparkles size={24} color={Colors.primary} />
                    <Text style={styles.emptyReviewTitle}>No reviews yet</Text>
                    <Text style={styles.emptyReviewCopy}>When reviews arrive, they will appear here with timestamps, star detail, and verification context.</Text>
                  </View>
                }
              />
            ) : (
              <View style={styles.emptyReviewState}>
                <Sparkles size={24} color={Colors.primary} />
                <Text style={styles.emptyReviewTitle}>No matching reviews</Text>
                <Text style={styles.emptyReviewCopy}>Try switching the sort or filter controls to widen the ledger.</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showRatingModal} transparent animationType="fade" onRequestClose={() => setShowRatingModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.infoModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rate Profile</Text>
              <TouchableOpacity onPress={() => setShowRatingModal(false)} activeOpacity={0.7}>
                <X size={24} color={Colors.gray800} />
              </TouchableOpacity>
            </View>

            <Text style={styles.infoModalText}>
              Share a quick review for {profile.fullName}.
            </Text>

            <View style={styles.ratingPickerWrap}>
              <View style={styles.ratingPickerRow}>
                {Array.from({ length: 5 }).map((_, index) => {
                  const value = index + 1;
                  const active = value <= ratingValue;
                  return (
                    <TouchableOpacity
                      key={value}
                      onPress={() => setRatingValue(value)}
                      activeOpacity={0.85}
                      style={styles.ratingPickButton}
                    >
                      <Star size={22} color={active ? '#F59E0B' : Colors.gray300} fill={active ? '#F59E0B' : 'transparent'} />
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
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <Button
              title={ratingSubmitting ? 'Submitting...' : 'Submit rating'}
              onPress={handleSubmitRating}
              loading={ratingSubmitting}
            />
          </View>
        </View>
      </Modal>

      {/* Post Action Sheet */}
      <Modal visible={showPostActionSheet} transparent animationType="none" onRequestClose={() => setShowPostActionSheet(false)}>
        <TouchableOpacity
          style={styles.actionSheetOverlay}
          activeOpacity={1}
          onPress={() => setShowPostActionSheet(false)}
        >
          <View style={styles.actionSheetContainer}>
            <View style={styles.actionSheetContent}>
              <TouchableOpacity
                style={styles.actionSheetOption}
                onPress={() => {
                  setShowPostActionSheet(false);
                  if (selectedPostForAction) handleOpenEditPostModal(selectedPostForAction);
                }}
                activeOpacity={0.7}
              >
                <Edit3 size={20} color={Colors.gray800} />
                <Text style={styles.actionSheetOptionText}>Edit Post</Text>
              </TouchableOpacity>
              <View style={styles.actionSheetDivider} />
              <TouchableOpacity
                style={styles.actionSheetOption}
                onPress={() => {
                  setShowPostActionSheet(false);
                  if (selectedPostForAction) handleDeletePost(selectedPostForAction.id);
                }}
                activeOpacity={0.7}
              >
                <X size={20} color={Colors.error} />
                <Text style={[styles.actionSheetOptionText, { color: Colors.error }]}>Delete Post</Text>
              </TouchableOpacity>
              <View style={styles.actionSheetDivider} />
              <TouchableOpacity
                style={styles.actionSheetOption}
                onPress={() => {
                  setShowPostActionSheet(false);
                  if (selectedPostForAction) {
                    Share.share({ message: selectedPostForAction.caption || 'Check out this post on Krovaa.' });
                  }
                }}
                activeOpacity={0.7}
              >
                <Share2 size={20} color={Colors.gray800} />
                <Text style={styles.actionSheetOptionText}>Share Post</Text>
              </TouchableOpacity>
              <View style={styles.actionSheetCancelDivider} />
              <TouchableOpacity
                style={styles.actionSheetCancelOption}
                onPress={() => setShowPostActionSheet(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.actionSheetCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Fullscreen Post Viewer */}
      <Modal visible={showFullscreenViewer} transparent animationType="none" onRequestClose={() => setShowFullscreenViewer(false)}>
        <View style={styles.fullscreenViewer}>
          <TouchableOpacity
            style={styles.fullscreenCloseButton}
            onPress={() => setShowFullscreenViewer(false)}
            activeOpacity={0.8}
          >
            <X size={24} color={Colors.white} />
          </TouchableOpacity>

          <View
            style={styles.fullscreenContent}
            {...(PanResponder.create({
              onStartShouldSetPanResponder: () => true,
              onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 10,
              onPanResponderRelease: (_, gs) => {
                if (gs.dx > 80 && selectedPostIndex > 0) {
                  setSelectedPostIndex((prev) => prev - 1);
                } else if (gs.dx < -80 && selectedPostIndex < posts.length - 1) {
                  setSelectedPostIndex((prev) => prev + 1);
                } else if (Math.abs(gs.dy) > 100) {
                  setShowFullscreenViewer(false);
                }
              },
            }).panHandlers)}
          >
            {posts[selectedPostIndex]?.mediaType === 'image' ? (
              <Image
                source={{ uri: posts[selectedPostIndex]?.mediaUrl }}
                style={styles.fullscreenMedia}
                resizeMode="contain"
              />
            ) : (
              <Video
                source={{ uri: posts[selectedPostIndex]?.mediaUrl }}
                style={styles.fullscreenMedia}
                resizeMode={ResizeMode.CONTAIN}
                useNativeControls
                shouldPlay
              />
            )}
          </View>

          <View style={styles.fullscreenCaptionBar}>
            <Text style={styles.fullscreenCaptionText} numberOfLines={2}>
              {posts[selectedPostIndex]?.caption || ''}
            </Text>
            <Text style={styles.fullscreenCounterText}>
              {selectedPostIndex + 1} / {posts.length}
            </Text>
          </View>
        </View>
      </Modal>
    </Animated.View>
  </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  errorText: {
    fontSize: FontSizes.md,
    color: Colors.error,
    fontWeight: FontWeights.medium as any,
  },
  devSignInBtn: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  devSignInText: {
    color: Colors.white,
    fontWeight: FontWeights.semiBold as any,
  },
  headerBg: {
    backgroundColor: Colors.white,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  coverSection: {
    height: 170,
    marginBottom: Spacing.lg,
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    backgroundColor: Colors.gray100,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverPlaceholderText: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    fontWeight: FontWeights.medium as any,
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 24, 39, 0.18)',
  },
  coverActions: {
    position: 'absolute',
    top: 60,
    right: Spacing.md,
    zIndex: 10,
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
    overflow: 'hidden',
  },
  shareButtonInner: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalBadge: {
    position: 'absolute',
    left: Spacing.md,
    bottom: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  goalBadgeText: {
    fontSize: FontSizes.xs,
    color: Colors.gray900,
    fontWeight: FontWeights.semiBold as any,
  },
  profileSection: {
    alignItems: 'center',
    paddingTop: 0,
    marginTop: -46,
    paddingHorizontal: Spacing.lg,
  },
  avatarContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    borderWidth: 3,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: BorderRadius.full,
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: Colors.white,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  avatarCameraBadge: {
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
  professionText: {
    marginTop: 4,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: FontWeights.semiBold as any,
  },
  subInfo: {
    marginTop: 2,
    fontSize: FontSizes.xs,
    color: Colors.gray600,
  },
  email: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  headerMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.md,
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
  socialPreviewWrap: {
    marginTop: Spacing.md,
    width: '100%',
  },
  sectionEyebrow: {
    fontSize: FontSizes.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.gray500,
    fontWeight: FontWeights.semiBold as any,
    marginBottom: 8,
  },
  socialPreviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  socialPreviewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  socialPreviewText: {
    maxWidth: 84,
    fontSize: FontSizes.xs,
    color: Colors.gray700,
    fontWeight: FontWeights.medium as any,
    textTransform: 'capitalize',
  },
  verificationChip: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  verificationChipVerified: {
    backgroundColor: '#DCFCE7',
  },
  verificationChipPending: {
    backgroundColor: '#FEF3C7',
  },
  verificationChipNeutral: {
    backgroundColor: Colors.gray100,
  },
  verificationChipText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
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
  profileInfoSection: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: 12,
    marginBottom: Spacing.xl,
  },
  profileInfoSectionLabel: {
    fontSize: 10,
    color: Colors.gray500,
    fontWeight: FontWeights.bold as any,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  profileInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  profileInfoCard: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: 12,
  },
  profileInfoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileInfoAccent: {
    width: 6,
    height: 18,
    borderRadius: BorderRadius.full,
  },
  profileInfoCardLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    fontWeight: FontWeights.bold as any,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  profileInfoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  profileInfoCell: {
    flex: 1,
    gap: 3,
  },
  profileInfoItem: {
    gap: 4,
  },
  profileInfoDivider: {
    height: 1,
    backgroundColor: Colors.gray200,
  },
  profileInfoKey: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    fontWeight: FontWeights.medium as any,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  profileInfoValue: {
    fontSize: FontSizes.sm,
    color: Colors.gray900,
    fontWeight: FontWeights.semiBold as any,
  },
  profileInfoValueEmphasis: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: FontWeights.semiBold as any,
  },
  profileInfoInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  profileInfoPill: {
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.md,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  profileInfoPillText: {
    fontSize: 9,
    color: Colors.primary,
    fontWeight: FontWeights.bold as any,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
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
  emptySkillsText: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  inlineActionText: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
  },
  helperText: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    lineHeight: 18,
  },
  socialLinkEditor: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.gray50,
    gap: 10,
  },
  platformChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  removeSocialLinkButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  removeSocialLinkText: {
    color: Colors.error,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semiBold as any,
  },
  postsSection: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  postsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  postsTitle: {
    fontSize: FontSizes.lg,
    color: Colors.gray900,
    fontWeight: FontWeights.semiBold as any,
  },
  addPostButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  addPostButtonText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
  },
  postsStateWrap: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  postsErrorText: {
    color: Colors.error,
    fontSize: FontSizes.sm,
  },
  postsEmptyText: {
    color: Colors.gray500,
    fontSize: FontSizes.sm,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'flex-start',
  },
  postCardWrap: {
    flexGrow: 0,
    flexShrink: 0,
    aspectRatio: 1,
  },
  postCard: {
    flex: 1,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.gray100,
  },
  postImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  postVideoThumb: {
    flex: 1,
    position: 'relative',
  },
  postVideoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  postVideoPlayer: {
    width: '100%',
    height: '100%',
  },
  postCaption: {
    marginTop: 4,
    color: Colors.gray800,
    fontSize: FontSizes.xs,
  },
  postDateText: {
    marginTop: 2,
    color: Colors.gray500,
    fontSize: FontSizes.xs,
  },
  postVideoText: {
    color: Colors.white,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium as any,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    maxHeight: '90%',
  },
  postModalImagePreview: {
    width: '100%',
    height: 180,
    borderRadius: BorderRadius.lg,
  },
  postModalVideoPreview: {
    width: '100%',
    height: 140,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray800,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  postModalButtons: {
    marginTop: Spacing.md,
  },
  editPostHint: {
    marginTop: Spacing.sm,
    color: Colors.gray500,
    fontSize: FontSizes.xs,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray900,
  },
  formContent: {
    marginBottom: Spacing.xl,
  },
  formGroup: {
    marginBottom: Spacing.xl,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  formSectionHeader: {
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  formSectionHeaderText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray500,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  modalAvatar: {
    width: 84,
    height: 84,
    borderRadius: BorderRadius.full,
    borderWidth: 2.5,
    borderColor: Colors.primary,
  },
  formLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray700,
    marginBottom: Spacing.sm,
    letterSpacing: 0.2,
  },
  formInput: {
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: FontSizes.md,
    color: Colors.gray900,
    backgroundColor: Colors.gray50,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.white,
  },
  optionChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  optionChipText: {
    color: Colors.gray700,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium as any,
  },
  optionChipTextSelected: {
    color: Colors.primary,
    fontWeight: FontWeights.semiBold as any,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  errorBoxText: {
    color: Colors.error,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium as any,
  },
  formActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  infoModalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    maxHeight: '88%',
  },
  infoModalText: {
    color: Colors.gray700,
    fontSize: FontSizes.md,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  infoModalCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  infoModalCardLabel: {
    color: Colors.gray500,
    fontSize: FontSizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
    fontWeight: FontWeights.semiBold as any,
  },
  infoModalCardValue: {
    color: Colors.gray900,
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold as any,
  },
  infoModalMeta: {
    color: Colors.gray500,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.md,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: Spacing.md,
  },
  badgeCard: {
    width: '48%',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    gap: 8,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 156,
    paddingBottom: 42,
  },
  badgeCardActive: {
    backgroundColor: '#F8FAFC',
    borderColor: Colors.primary + '24',
  },
  badgeCardInactive: {
    backgroundColor: Colors.gray50,
    borderColor: Colors.gray200,
    opacity: 0.72,
  },
  badgeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
  },
  badgeDescription: {
    fontSize: FontSizes.xs,
    lineHeight: 18,
    color: Colors.gray600,
  },
  ratingSummaryCard: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray50,
    marginBottom: Spacing.md,
  },
  rateProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  rateProfileButtonDisabled: {
    backgroundColor: Colors.gray300,
  },
  rateProfileButtonText: {
    color: Colors.white,
    fontWeight: FontWeights.semiBold as any,
    marginLeft: 6,
  },
  ratingPickerWrap: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  ratingPickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.xs,
  },
  ratingPickerLabel: {
    color: Colors.gray600,
    fontSize: FontSizes.sm,
    marginTop: 4,
  },
  ratingPickButton: {
    padding: Spacing.xs,
  },
  ratingCommentInput: {
    height: 96,
    textAlignVertical: 'top',
  },
  ratingSummaryValue: {
    fontSize: 34,
    color: Colors.gray900,
    fontWeight: FontWeights.bold as any,
  },
  ratingSummaryMeta: {
    marginTop: 6,
    color: Colors.gray500,
    fontSize: FontSizes.sm,
  },
  ratingStarsRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 6,
  },
  ratingsList: {
    gap: 12,
    paddingBottom: Spacing.md,
  },
  viewAllRatingsButton: {
    marginTop: Spacing.xs,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '10',
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  viewAllRatingsText: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
  },
  ratingItem: {
    flexDirection: 'row',
    gap: 12,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.gray100,
    alignItems: 'flex-start',
  },
  ratingAvatar: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray200,
  },
  ratingContent: {
    flex: 1,
    gap: 6,
  },
  ratingName: {
    color: Colors.gray900,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
  },
  ratingComment: {
    color: Colors.gray700,
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
  formButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.gray100,
  },
  cancelButtonText: {
    color: Colors.gray700,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
  },
  userCodeBadge: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    alignItems: 'center',
  },
  userCodeLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
    fontWeight: FontWeights.medium as any,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userCodeText: {
    fontSize: FontSizes.lg,
    color: Colors.primary,
    fontWeight: FontWeights.bold as any,
    letterSpacing: 1.5,
  },
  emptyStateText: {
    color: Colors.gray500,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },

  // Action Sheet Styles
  actionSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  actionSheetContainer: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  actionSheetContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    overflow: 'hidden',
  },
  actionSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: 14,
  },
  actionSheetOptionText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium as any,
    color: Colors.gray800,
  },
  actionSheetDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.gray200,
    marginHorizontal: Spacing.lg,
  },
  actionSheetCancelDivider: {
    height: 8,
    backgroundColor: Colors.gray100,
    marginTop: Spacing.sm,
  },
  actionSheetCancelOption: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
  },
  actionSheetCancelText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray600,
  },

  // Fullscreen Viewer Styles
  fullscreenViewer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenCloseButton: {
    position: 'absolute',
    top: 54,
    right: Spacing.lg,
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  fullscreenContent: {
    width: '100%',
    height: '75%',
    justifyContent: 'center',
  },
  fullscreenMedia: {
    width: '100%',
    height: '100%',
  },
  fullscreenCaptionBar: {
    position: 'absolute',
    bottom: 40,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fullscreenCaptionText: {
    flex: 1,
    color: Colors.white,
    fontSize: FontSizes.sm,
    marginRight: Spacing.md,
  },
  fullscreenCounterText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium as any,
  },

  // Editable Photo Overlay Styles
  editableAvatarWrap: {
    position: 'relative',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  editableCoverWrap: {
    position: 'relative',
    width: '100%',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  editableOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  editableOverlayText: {
    color: Colors.white,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semiBold as any,
    marginTop: 4,
  },
  editCoverPreview: {
    width: '100%',
    height: 150,
    borderRadius: BorderRadius.md,
    resizeMode: 'cover',
  },
  editCoverPlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: Colors.gray200,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalKeyboard: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: Spacing.md,
  },
  editHeaderIconButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  editModalSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 20,
  },
  editHeaderSpacer: {
    width: 40,
    height: 40,
  },
  editScrollContent: {
    paddingBottom: Spacing.xl + 28,
    gap: 16,
  },
  editHeroCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray100,
    gap: 12,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  editCoverStage: {
    aspectRatio: 16 / 9,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.gray100,
    position: 'relative',
  },
  editCoverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  editCoverPlaceholderStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.gray100,
  },
  editCoverPlaceholderText: {
    marginTop: 6,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray700,
  },
  editCoverPlaceholderSubtext: {
    marginTop: 4,
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },
  editCoverShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.14)',
  },
  editCoverActionPill: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editCoverActionText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.white,
  },
  editAvatarOverlapRow: {
    alignItems: 'center',
    marginTop: -40,
    marginBottom: 4,
  },
  editAvatarStack: {
    width: 92,
    height: 92,
    borderRadius: BorderRadius.full,
    borderWidth: 4,
    borderColor: Colors.white,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    position: 'relative',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  editAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  editAvatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray200,
  },
  editAvatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editHeroCopy: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
  },
  editHeroName: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray900,
    textAlign: 'center',
  },
  editHeroDescription: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 20,
    textAlign: 'center',
  },
  editContentCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    gap: 16,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.white,
  },
  categoryChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryChipText: {
    color: Colors.gray700,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium as any,
  },
  inlineBlockSpacing: {
    gap: 8,
    marginTop: 8,
  },
  inlineBlockLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray700,
  },
  editFooter: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingTop: Spacing.md,
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  editFooterCancelButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editFooterPrimaryButton: {
    flex: 1,
  },
  visualsCard: {
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: 12,
  },
  visualsHelperText: {
    fontSize: FontSizes.xs,
    lineHeight: 18,
    color: Colors.gray600,
    marginTop: 4,
  },
  visualsGrid: {
    gap: 12,
  },
  photoSectionCompact: {
    alignItems: 'center',
    gap: 8,
  },
  coverPhotoSectionCompact: {
    gap: 8,
  },
  inlineVisualAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary + '10',
  },
  inlineVisualActionText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.primary,
  },
  coverPreviewBadge: {
    position: 'absolute',
    right: Spacing.sm,
    bottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  coverPreviewBadgeText: {
    fontSize: 10,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.white,
  },
  visualQuickActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  visualQuickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  visualQuickActionText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray700,
  },
  dashboardModalContent: {
    gap: 12,
  },
  dashboardIntro: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 20,
  },
  verificationTimeline: {
    gap: 14,
    marginBottom: Spacing.sm,
  },
  verificationStepRow: {
    flexDirection: 'row',
    gap: 12,
    position: 'relative',
    paddingRight: 2,
  },
  verificationStepRail: {
    position: 'absolute',
    left: 19,
    top: 40,
    bottom: -18,
    width: 2,
    backgroundColor: Colors.gray200,
  },
  verificationStepRailHidden: {
    opacity: 0,
  },
  verificationStepIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    borderWidth: 1,
    borderColor: Colors.gray200,
    zIndex: 1,
  },
  verificationStepIconVerified: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  verificationStepIconPending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  verificationStepIconRejected: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  verificationStepBody: {
    flex: 1,
    gap: 6,
    paddingBottom: 2,
  },
  verificationStepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  verificationStepTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
  },
  verificationStatusPill: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  verificationStatusPillVerified: {
    backgroundColor: '#DCFCE7',
  },
  verificationStatusPillPending: {
    backgroundColor: '#FEF3C7',
  },
  verificationStatusPillRejected: {
    backgroundColor: '#FEE2E2',
  },
  verificationStatusPillNeutral: {
    backgroundColor: Colors.gray100,
  },
  verificationStatusPillText: {
    fontSize: 10,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray700,
  },
  verificationStatusPillTextVerified: {
    color: Colors.secondary,
  },
  verificationStatusPillTextPending: {
    color: '#B45309',
  },
  verificationStatusPillTextRejected: {
    color: Colors.error,
  },
  verificationStepHelper: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
    lineHeight: 18,
  },
  verificationStepMeta: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },
  verificationStepActions: {
    marginTop: 2,
  },
  verificationDisabledPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  verificationDisabledPillText: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
    fontWeight: FontWeights.semiBold as any,
  },
  verificationSuccessPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  verificationSuccessPillText: {
    fontSize: FontSizes.xs,
    color: Colors.white,
    fontWeight: FontWeights.semiBold as any,
  },
  verificationUploadCard: {
    marginTop: Spacing.xs,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.gray300,
    backgroundColor: Colors.gray50,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 6,
  },
  verificationUploadTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
    textAlign: 'center',
  },
  verificationUploadText: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
    lineHeight: 18,
    textAlign: 'center',
  },
  verificationDocsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  verificationDocChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  verificationDocIconWrap: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verificationDocText: {
    flexShrink: 1,
    fontSize: FontSizes.xs,
    color: Colors.gray700,
    fontWeight: FontWeights.medium as any,
  },
  verificationRetryCopy: {
    fontSize: FontSizes.xs,
    lineHeight: 18,
    color: Colors.error,
  },
  badgeCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  badgeStatePill: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  badgeStatePillEarned: {
    backgroundColor: Colors.primary + '10',
  },
  badgeStatePillLocked: {
    backgroundColor: Colors.gray200,
  },
  badgeStatePillText: {
    fontSize: 10,
    fontWeight: FontWeights.semiBold as any,
  },
  badgeStatePillTextEarned: {
    color: Colors.primary,
  },
  badgeStatePillTextLocked: {
    color: Colors.gray600,
  },
  badgeRarity: {
    fontSize: 10,
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: FontWeights.medium as any,
  },
  badgeLockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeTooltip: {
    position: 'absolute',
    left: Spacing.sm,
    right: Spacing.sm,
    bottom: Spacing.sm,
    backgroundColor: Colors.gray900,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: 2,
  },
  badgeTooltipTitle: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.white,
  },
  badgeTooltipText: {
    fontSize: 10,
    color: Colors.gray100,
    lineHeight: 16,
  },
  badgeTooltipMeta: {
    fontSize: 10,
    color: Colors.gray300,
    lineHeight: 14,
  },
  ratingAnalyticsGrid: {
    gap: 12,
    marginBottom: Spacing.md,
  },
  ratingDistributionCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray100,
    gap: 10,
  },
  ratingDistributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingDistributionLabel: {
    width: 28,
    fontSize: FontSizes.xs,
    color: Colors.gray700,
    fontWeight: FontWeights.semiBold as any,
  },
  ratingDistributionBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.gray200,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  ratingDistributionBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  ratingDistributionValue: {
    width: 38,
    textAlign: 'right',
    fontSize: FontSizes.xs,
    color: Colors.gray600,
    fontWeight: FontWeights.medium as any,
  },
  reviewControlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  reviewControlChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
  },
  reviewControlChipActive: {
    borderColor: Colors.primary + '40',
    backgroundColor: Colors.primary + '10',
  },
  reviewControlChipText: {
    fontSize: FontSizes.xs,
    color: Colors.gray700,
    fontWeight: FontWeights.semiBold as any,
  },
  reviewControlChipTextActive: {
    color: Colors.primary,
  },
  reviewSkeletonList: {
    gap: 10,
    marginTop: 4,
  },
  reviewSkeletonRow: {
    flexDirection: 'row',
    gap: 12,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  reviewSkeletonAvatar: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray200,
  },
  reviewSkeletonBody: {
    flex: 1,
    gap: 8,
  },
  reviewSkeletonLineShort: {
    height: 10,
    width: '42%',
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray200,
  },
  reviewSkeletonLineLong: {
    height: 10,
    width: '82%',
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray200,
  },
  reviewSkeletonLineLonger: {
    height: 10,
    width: '64%',
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray200,
  },
  reviewFeed: {
    maxHeight: 320,
    marginTop: 2,
  },
  reviewFeedContent: {
    gap: 12,
    paddingBottom: Spacing.md,
  },
  reviewFeedHeader: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    lineHeight: 18,
  },
  ratingMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  ratingTimeText: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    flexShrink: 0,
  },
  verifiedReviewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary + '10',
  },
  verifiedReviewPillText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: FontWeights.semiBold as any,
  },
  ratingScoreText: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
    fontWeight: FontWeights.medium as any,
  },
  ratingCommentMuted: {
    color: Colors.gray500,
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
  emptyReviewState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    gap: 8,
  },
  emptyReviewTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
  },
  emptyReviewCopy: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    textAlign: 'center',
    lineHeight: 20,
  },
});