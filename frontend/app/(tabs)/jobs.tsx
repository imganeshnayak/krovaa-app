import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, FlatList, Image, ActivityIndicator, Alert,
  Animated, Pressable, Dimensions, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Search, MapPin, IndianRupee, Briefcase, X, Plus,
  List, ChevronDown, Clock, Building2,
  GraduationCap, Wifi, Home, Globe, User,
  Pencil, Trash2, ArrowLeft, Send, Eye, MessageCircle,
  CheckCircle, XCircle, Clock as Hourglass,
  Heart, Award, Star, Code, Palette, Hammer,
  GanttChart, Users, UserCircle, HelpCircle,
  ShieldCheck, Mail, Phone, Calendar, Sparkles,
} from 'lucide-react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Colors, FontWeights, Spacing, BorderRadius, FontSizes } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import {
  getJobs, postJob, applyJob, getMyJobs, deleteJob, updateJob,
  getAppliedJobs, withdrawApplication, getJobApplicants, getUserProfile,
  updateApplicantStatus,
  type Job, type AppliedJob, type JobApplicant,
} from '@/lib/jobsApi';
import { createConversationWithUserId } from '@/lib/chatApi';

const JOB_CATEGORIES = ['All', 'Design', 'Development', 'Marketing', 'Writing', 'Video'];
const JOB_MODES = [
  { value: 'ALL_MODES', label: 'All Modes', icon: Globe },
  { value: 'remote', label: 'Remote', icon: Wifi },
  { value: 'hybrid', label: 'Hybrid', icon: Home },
  { value: 'onsite', label: 'Onsite', icon: Building2 },
  { value: 'freelance', label: 'Freelance', icon: Briefcase },
  { value: 'internship', label: 'Internship', icon: GraduationCap },
];

const CATEGORIES = [
  { id: "tech",         label: "Tech",         icon: Code,        color: "text-blue-400",   bg: "bg-blue-400/10",   border: "border-blue-400/20"   },
  { id: "creative",    label: "Creative",     icon: Palette,     color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" },
  { id: "engineering", label: "Engineering",  icon: Hammer,      color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
  { id: "professional",label: "Professional", icon: GanttChart,  color: "text-emerald-400",bg: "bg-emerald-400/10",border: "border-emerald-400/20" },
  { id: "freelancer",  label: "Freelancer",   icon: Users,        color: "text-pink-400",   bg: "bg-pink-400/10",   border: "border-pink-400/20"   },
  { id: "student",     label: "Student",      icon: GraduationCap,color:"text-cyan-400",   bg: "bg-cyan-400/10",   border: "border-cyan-400/20"   },
  { id: "none",        label: "None",         icon: UserCircle,  color: "text-indigo-400", bg: "bg-indigo-400/10", border: "border-indigo-400/20" },
  { id: "other",       label: "Other",        icon: HelpCircle,  color: "text-slate-400",   bg: "bg-slate-400/10",   border: "border-slate-400/20"   },
];

const SUB_PROFESSIONS: Record<string, string[]> = {
  tech:         ["Software Developer","Web Developer","Data Scientist","AI / ML Engineer","Cybersecurity Analyst","DevOps Engineer","Mobile App Developer"],
  creative:     ["UI/UX Designer","Graphic Designer","3D Designer","2D Designer","Content Creator","Video Editor","Photographer","Videographer","Artist / Illustrator","Musician"],
  engineering:  ["Civil Engineer","Mechanical Engineer","Electrical Engineer","Architect","Structural Engineer"],
  professional: ["Product Manager","Digital Marketer","Doctor","Nurse","Pharmacist","Lawyer","Chartered Accountant","Teacher / Educator","Consultant"],
};

const CATEGORY_HEX: Record<string, { main: string; bg: string; border: string }> = {
  tech:         { main: '#60A5FA', bg: '#60A5FA1A', border: '#60A5FA33' },
  creative:     { main: '#C084FC', bg: '#C084FC1A', border: '#C084FC33' },
  engineering:  { main: '#FB923C', bg: '#FB923C1A', border: '#FB923C33' },
  professional: { main: '#34D399', bg: '#34D3991A', border: '#34D39933' },
  freelancer:   { main: '#F472B6', bg: '#F472B61A', border: '#F472B633' },
  student:      { main: '#22D3EE', bg: '#22D3EE1A', border: '#22D3EE33' },
  none:         { main: '#818CF8', bg: '#818CF81A', border: '#818CF833' },
  other:        { main: '#94A3B8', bg: '#94A3B81A', border: '#94A3B833' },
};

function getModeIcon(mode: string) {
  const found = JOB_MODES.find((m) => m.value === mode);
  return found?.icon || Briefcase;
}

function getCategoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label || id;
}

function getCategoryId(label: string): string {
  return CATEGORIES.find((c) => c.label === label || c.id === label)?.id || 'other';
}

const AnimatedPressable = ({ style, onPress, disabled, children }: any) => {
  const scale = useRef(new Animated.Value(1)).current;
  const animateIn = () => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, friction: 8 }).start();
  };
  const animateOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
  };
  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.75}
        onPressIn={animateIn}
        onPressOut={animateOut}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const COVER_HEIGHT = SCREEN_WIDTH / 3;
const AVATAR_SIZE = 96;
const AVATAR_OVERLAP = AVATAR_SIZE / 2;

function getSavedApplicantsStorageKey(userId?: string | null) {
  return userId ? `krovaa.savedApplicants.${userId}` : null;
}

function getProfileInitials(name?: string) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function JobsScreen() {
  const router = useRouter();
  const { session } = useAuth();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState('ALL_MODES');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [debouncedLocationQuery, setDebouncedLocationQuery] = useState('');

  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);

  const insets = useSafeAreaInsets();
  const compactHeaderTopPadding = Math.max(12, (insets?.top ?? 0) + 8);
  const [showMyListings, setShowMyListings] = useState(false);
  const [myListingsTab, setMyListingsTab] = useState<'applicants' | 'applied'>('applicants');
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [myJobsLoading, setMyJobsLoading] = useState(false);
  const [appliedJobs, setAppliedJobs] = useState<AppliedJob[]>([]);
  const [appliedJobsLoading, setAppliedJobsLoading] = useState(false);

  // Messaging state
  const [messagingApplicantId, setMessagingApplicantId] = useState<string | null>(null);
  const [hiringLoading, setHiringLoading] = useState(false);
  const [showRehireModal, setShowRehireModal] = useState(false);
  const hireStatusMap = useRef<Record<string, 'accepted' | null>>({});

  // Premium profile modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileUser, setProfileUser] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savedProfiles, setSavedProfiles] = useState<Set<string>>(new Set());
  const [savedProfilesLoaded, setSavedProfilesLoaded] = useState(false);
  const profileCache = useRef<Record<string, any>>({});
  const profileContextRef = useRef<{ applicationId: string; jobId: string } | null>(null);
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Applicants dashboard
  const [showApplicantsDashboard, setShowApplicantsDashboard] = useState(false);
  const [dashboardJob, setDashboardJob] = useState<Job | null>(null);
  const [dashboardApplicants, setDashboardApplicants] = useState<JobApplicant[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [applicantSubTab, setApplicantSubTab] = useState<'all' | 'saved'>('all');

  // Post form
  const [postTitle, setPostTitle] = useState('');
  const [postBudget, setPostBudget] = useState('');
  const [postBudgetMin, setPostBudgetMin] = useState('');
  const [postBudgetMax, setPostBudgetMax] = useState('');
  const [postDescription, setPostDescription] = useState('');
  const [postCategory, setPostCategory] = useState('Development');
  const [postCategoryId, setPostCategoryId] = useState<string | null>(null);
  const [postSubProfession, setPostSubProfession] = useState('');
  const [postCustomCategory, setPostCustomCategory] = useState('');
  const [postLocation, setPostLocation] = useState('');
  const [postMode, setPostMode] = useState('remote');
  const [posting, setPosting] = useState(false);

  // Edit form
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [editBudgetMin, setEditBudgetMin] = useState('');
  const [editBudgetMax, setEditBudgetMax] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editSubProfession, setEditSubProfession] = useState('');
  const [editCustomCategory, setEditCustomCategory] = useState('');
  const [editMode, setEditMode] = useState('');
  const [editUpdating, setEditUpdating] = useState(false);
  const [descInputHeight, setDescInputHeight] = useState(100);

  // Animations
  const fabScale = useRef(new Animated.Value(1)).current;
  const fabEntrance = useRef(new Animated.Value(0)).current;
  const fabBreathe = useRef(new Animated.Value(0)).current;
  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Debounce search and location
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchQuery(searchQuery), 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedLocationQuery(locationQuery), 400);
    return () => clearTimeout(handler);
  }, [locationQuery]);

  // Fetch jobs
  const fetchJobs = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setError(null);

    const { data, error: fetchError } = await getJobs(session?.access_token, {
      category: selectedCategory,
      q: debouncedSearchQuery || undefined,
      location: debouncedLocationQuery || undefined,
      mode: selectedMode,
      excludePosterId: session?.user?.id,
    });

    if (fetchError) {
      setError(fetchError);
    } else if (data) {
      setJobs(data);
    }
    setLoading(false);
    setRefreshing(false);
  }, [session?.access_token, session?.user?.id, selectedCategory, debouncedSearchQuery, debouncedLocationQuery, selectedMode]);

  useEffect(() => {
    fetchJobs(true);
  }, [fetchJobs]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 400, useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSavedProfiles = async () => {
      const storageKey = getSavedApplicantsStorageKey(session?.user?.id);
      if (!storageKey) {
        if (isMounted) {
          setSavedProfiles(new Set());
          setSavedProfilesLoaded(true);
        }
        return;
      }

      try {
        const rawSavedProfiles = await AsyncStorage.getItem(storageKey);
        const savedIds = rawSavedProfiles ? JSON.parse(rawSavedProfiles) : [];
        if (!isMounted) return;
        setSavedProfiles(new Set(Array.isArray(savedIds) ? savedIds : []));
      } catch (error) {
        console.error('Failed to load saved applicants:', error);
        if (isMounted) setSavedProfiles(new Set());
      } finally {
        if (isMounted) setSavedProfilesLoaded(true);
      }
    };

    setSavedProfilesLoaded(false);
    loadSavedProfiles();

    return () => {
      isMounted = false;
    };
  }, [session?.user?.id]);

  // FAB entrance + breathing
  useEffect(() => {
    Animated.spring(fabEntrance, {
      toValue: 1, useNativeDriver: true, friction: 6, tension: 40,
    }).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(fabBreathe, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(fabBreathe, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Shimmer pulse for profile skeleton
  useEffect(() => {
    if (!profileLoading) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [profileLoading, shimmerAnim]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchJobs(false);
  }, [fetchJobs]);

  // Mode dropdown animation
  useEffect(() => {
    Animated.timing(dropdownAnim, {
      toValue: showModeDropdown ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [showModeDropdown]);

  const dropdownHeight = dropdownAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 280],
  });

  const dropdownOpacity = dropdownAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  // FAB press animation
  const animateFabPress = () => {
    Animated.sequence([
      Animated.timing(fabScale, { toValue: 0.85, duration: 100, useNativeDriver: true }),
      Animated.timing(fabScale, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const handleFabPress = () => {
    animateFabPress();
    setEditingJob(null);
    setPostTitle(''); setPostBudget(''); setPostBudgetMin(''); setPostBudgetMax(''); setPostDescription('');
    setPostLocation(''); setPostCategory('Development'); setPostMode('remote');
    setPostCategoryId(null); setPostSubProfession(''); setPostCustomCategory('');
    setShowPostModal(true);
  };

  // Post job
  const handlePostJob = async () => {
    if (!session?.access_token) {
      Alert.alert('Authentication required', 'Please sign in to post a job.');
      return;
    }
    const finalBudget = postBudgetMin || postBudgetMax
      ? [postBudgetMin, postBudgetMax].filter(Boolean).map((p) => `₹${p}`).join(' - ')
      : postBudget;
    if (!postTitle.trim() || !finalBudget.trim() || !postLocation.trim() || !postDescription.trim()) {
      Alert.alert('Validation Error', 'All fields are required.');
      return;
    }
    const derivedType = postCustomCategory.trim() || postSubProfession || getCategoryLabel(postCategoryId || '') || postCategory;
    setPosting(true);
    const { data, error: postError } = await postJob(session.access_token, {
      title: postTitle, budget: finalBudget, location: postLocation,
      type: derivedType, mode: postMode, description: postDescription,
    });
    setPosting(false);

    if (postError || !data) {
      Alert.alert('Error', postError || 'Failed to post job.');
    } else {
      setShowPostModal(false);
      setJobs((prev) => [data, ...prev]);
    }
  };

  // Apply for job
  const handleApply = async (job: Job) => {
    if (!session?.access_token) {
      Alert.alert('Authentication required', 'Please sign in to apply.');
      return;
    }
    if (job.hasApplied) { Alert.alert('Already Applied', 'You already applied.'); return; }
    if (job.posterId === session.user.id) { Alert.alert('Restricted', 'Cannot apply to your own job.'); return; }

    Alert.alert(
      'Apply for Job',
      `Apply to "${job.title}"? A chat will start with ${job.posterName}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply Now',
          onPress: async () => {
            const { data, error: applyError } = await applyJob(session.access_token, job.id);
            if (applyError || !data) {
              Alert.alert('Error', applyError || 'Failed to apply.');
            } else {
              Alert.alert('Success!', 'Application sent.', [
                { text: 'Open Chat', onPress: () => router.push(`/chat/${data.conversationId}`) },
              ]);
              setJobs((prev) =>
                prev.map((j) =>
                  j.id === job.id ? { ...j, hasApplied: true, applicantCount: j.applicantCount + 1 } : j
                )
              );
            }
          },
        },
      ]
    );
  };

  // My Listings
  const openMyListings = async () => {
    if (!session?.access_token) return;
    setShowMyListings(true);
    setMyListingsTab('applicants');
    setMyJobsLoading(true);
    setAppliedJobsLoading(true);
    const [myResult, appliedResult] = await Promise.all([
      getMyJobs(session.access_token),
      getAppliedJobs(session.access_token),
    ]);
    if (myResult.data) setMyJobs(myResult.data);
    if (appliedResult.data) setAppliedJobs(appliedResult.data);
    setMyJobsLoading(false);
    setAppliedJobsLoading(false);
  };

  const handleDeleteMyJob = (job: Job) => {
    Alert.alert('Delete Job', `Delete "${job.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          if (!session?.access_token) return;
          await deleteJob(session.access_token, job.id);
          setMyJobs((prev) => prev.filter((j) => j.id !== job.id));
          setJobs((prev) => prev.filter((j) => j.id !== job.id));
        },
      },
    ]);
  };

  const handleEditMyJob = (job: Job) => {
    setEditingJob(job);
    setEditTitle(job.title);
    setEditBudget(job.budget);
    const parts = job.budget.replace(/₹/g, '').split('-').map((s) => s.trim());
    if (parts.length === 2) {
      setEditBudgetMin(parts[0]);
      setEditBudgetMax(parts[1]);
    } else {
      setEditBudgetMin('');
      setEditBudgetMax('');
    }
    setEditDescription(job.description);
    setEditLocation(job.location);
    setEditCategory(job.type);
    setEditCategoryId(getCategoryId(job.type));
    setEditSubProfession('');
    setEditCustomCategory('');
    setEditMode(job.mode || 'remote');
    setShowMyListings(false);
    setShowPostModal(true);
  };

  const handleUpdateJob = async () => {
    if (!session?.access_token || !editingJob) return;
    const editFinalBudget = editBudgetMin || editBudgetMax
      ? [editBudgetMin, editBudgetMax].filter(Boolean).map((p) => `₹${p}`).join(' - ')
      : editBudget;
    if (!editTitle.trim() || !editFinalBudget.trim() || !editLocation.trim() || !editDescription.trim()) {
      Alert.alert('Validation Error', 'All fields are required.');
      return;
    }
    const derivedType = editCustomCategory.trim() || editSubProfession || getCategoryLabel(editCategoryId || '') || editCategory;
    setPosting(true);
    const { data } = await updateJob(session.access_token, editingJob.id, {
      title: editTitle.trim(), budget: editFinalBudget.trim(), location: editLocation.trim(),
      type: derivedType, mode: editMode, description: editDescription.trim(),
    });
    setPosting(false);
    if (data) {
      setShowPostModal(false);
      setEditingJob(null);
      setJobs((prev) => prev.map((j) => (j.id === data.id ? data : j)));
      setMyJobs((prev) => prev.map((j) => (j.id === data.id ? data : j)));
    }
  };

  const handleViewApplicants = (jobId: string) => {
    router.push({ pathname: '/jobs/applicants/[id]' as any, params: { id: jobId } });
  };

  // Applicants Dashboard
  const openApplicantsDashboard = async (job: Job) => {
    if (!session?.access_token) return;
    setDashboardJob(job);
    setShowApplicantsDashboard(true);
    setApplicantSubTab('all');
    setDashboardLoading(true);
    const { data } = await getJobApplicants(session.access_token, job.id);
    if (data) setDashboardApplicants(data);
    setDashboardLoading(false);
  };

  const handleWithdraw = (job: AppliedJob) => {
    Alert.alert('Withdraw Application', `Withdraw your application for "${job.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Withdraw', style: 'destructive',
        onPress: async () => {
          if (!session?.access_token) return;
          await withdrawApplication(session.access_token, job.id);
          setAppliedJobs((prev) => prev.filter((j) => j.id !== job.id));
        },
      },
    ]);
  };

  const handleMessageApplicant = async (applicant: JobApplicant) => {
    if (!session?.access_token || !applicant.id) return;
    setMessagingApplicantId(applicant.id);
    try {
      const { data: convData } = await createConversationWithUserId(
        session.access_token,
        applicant.id
      );
      if (convData?.conversation) {
        router.push(`/chat/${convData.conversation.id}`);
      }
    } catch (err) {
      console.error('Error creating conversation:', err);
    } finally {
      setMessagingApplicantId(null);
    }
  };

  const openProfileModal = async (applicant: JobApplicant, job?: Job | null) => {
    if (!session?.access_token) return;
    profileContextRef.current = job ? { applicationId: applicant.applicationId, jobId: job.id } : null;
    if (applicant.status === 'accepted') hireStatusMap.current[applicant.id] = 'accepted';
    if (profileCache.current[applicant.id]) {
      setProfileUser(profileCache.current[applicant.id]);
      setShowProfileModal(true);
      setProfileError(null);
      return;
    }
    setShowProfileModal(true);
    setProfileLoading(true);
    setProfileError(null);
    const { data, error } = await getUserProfile(session.access_token, applicant.id);
    if (error) {
      setProfileError(error);
      setProfileUser(null);
    } else if (data) {
      profileCache.current[applicant.id] = data;
      setProfileUser(data);
    }
    setProfileLoading(false);
  };

  const handleMessageFromProfile = async (userId: string) => {
    if (!session?.access_token || !userId) return;
    setMessagingApplicantId(userId);
    try {
      const { data: convData } = await createConversationWithUserId(session.access_token, userId);
      if (convData?.conversation) {
        setShowProfileModal(false);
        router.push(`/chat/${convData.conversation.id}`);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setMessagingApplicantId(null);
    }
  };

  const executeHire = async () => {
    if (!session?.access_token || !profileUser?.id || !profileContextRef.current) return;
    const { applicationId, jobId } = profileContextRef.current;
    setHiringLoading(true);
    try {
      const { error: statusError } = await updateApplicantStatus(session.access_token, jobId, applicationId, 'accepted');
      if (statusError) {
        Alert.alert('Error', statusError);
        return;
      }
      hireStatusMap.current[profileUser.id] = 'accepted';
      setDashboardApplicants((prev) =>
        prev.map((a) => (a.id === profileUser.id ? { ...a, status: 'accepted' as const } : a))
      );
      const { data: convData } = await createConversationWithUserId(session.access_token, profileUser.id);
      setShowProfileModal(false);
      setProfileError(null);
      if (convData?.conversation) {
        router.push(`/chat/${convData.conversation.id}`);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to complete hire action');
    } finally {
      setHiringLoading(false);
    }
  };

  const handleHireInvite = () => {
    if (!profileUser?.id) return;
    const alreadyHired = hireStatusMap.current[profileUser.id] === 'accepted';
    if (alreadyHired) {
      setShowRehireModal(true);
    } else {
      executeHire();
    }
  };

  const handleConfirmRehire = () => {
    setShowRehireModal(false);
    executeHire();
  };

  const handleSaveProfile = () => {
    if (!profileUser?.id) return;
    const storageKey = getSavedApplicantsStorageKey(session?.user?.id);
    if (!storageKey) {
      Alert.alert('Sign in required', 'Please sign in to save applicant profiles.');
      return;
    }

    setSavedProfiles((prev) => {
      const next = new Set(prev);
      if (next.has(profileUser.id)) {
        next.delete(profileUser.id);
      } else {
        next.add(profileUser.id);
      }

      AsyncStorage.setItem(storageKey, JSON.stringify(Array.from(next))).catch((error) => {
        console.error('Failed to persist saved applicants:', error);
      });

      return next;
    });
  };

  const handleToggleSaveApplicant = (applicantId: string) => {
    const storageKey = getSavedApplicantsStorageKey(session?.user?.id);
    if (!storageKey) return;

    setSavedProfiles((prev) => {
      const next = new Set(prev);
      if (next.has(applicantId)) {
        next.delete(applicantId);
      } else {
        next.add(applicantId);
      }
      AsyncStorage.setItem(storageKey, JSON.stringify(Array.from(next))).catch((error) => {
        console.error('Failed to persist saved applicants:', error);
      });
      return next;
    });
  };

  const retryProfileLoad = async () => {
    if (!session?.access_token || !profileUser?.id) return;
    setProfileLoading(true);
    setProfileError(null);
    const { data, error } = await getUserProfile(session.access_token, profileUser.id);
    if (error) {
      setProfileError(error);
    } else if (data) {
      profileCache.current[profileUser.id] = data;
      setProfileUser(data);
    }
    setProfileLoading(false);
  };

  // Render job card
  const renderJobCard = ({ item }: { item: Job }) => {
    const isJobOwner = session?.user?.id === item.posterId;
    const ModeIcon = getModeIcon(item.mode);

    return (
      <View style={styles.jobCard}>
        <View style={styles.jobCardTop}>
          <Image source={{ uri: item.avatar }} style={styles.jobAvatar} />
          <View style={styles.jobInfo}>
            <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.jobCompany}>{item.company}</Text>
          </View>
          {item.mode ? (
            <View style={styles.modeBadge}>
              <ModeIcon size={11} color={Colors.primary} />
              <Text style={styles.modeBadgeText}>{item.mode}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.jobMeta}>
          <View style={styles.jobMetaItem}>
            <IndianRupee size={13} color={Colors.secondary} />
            <Text style={styles.jobMetaText}>{item.budget}</Text>
          </View>
          <View style={styles.jobMetaItem}>
            <MapPin size={13} color={Colors.gray500} />
            <Text style={styles.jobMetaText}>{item.location}</Text>
          </View>
          <View style={styles.jobMetaItem}>
            <Clock size={13} color={Colors.gray500} />
            <Text style={styles.jobMetaText}>{item.posted}</Text>
          </View>
        </View>

        {item.description ? (
          <Text style={styles.jobDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}

        <View style={styles.jobFooter}>
          <View style={styles.jobTypeBadge}>
            <Text style={styles.jobTypeText}>{item.type}</Text>
          </View>
          {isJobOwner ? (
            <TouchableOpacity
              style={styles.viewApplicantsBtn}
              onPress={() => handleViewApplicants(item.id)}
            >
              <Text style={styles.viewApplicantsText}>
                Applicants ({item.applicantCount})
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.applyBtn, item.hasApplied && styles.appliedBtn]}
              onPress={() => handleApply(item)}
              disabled={item.hasApplied}
            >
              <Text style={styles.applyBtnText}>
                {item.hasApplied ? 'Applied' : 'Apply'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const dropdownRotation = dropdownAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Explore</Text>
          <TouchableOpacity style={styles.myListingsBtn} onPress={openMyListings} activeOpacity={0.7}>
            <List size={15} color={Colors.primary} />
            <Text style={styles.myListingsText}>My Listings</Text>
          </TouchableOpacity>
        </View>

        {/* Search + Location row */}
        <View style={styles.filterRow}>
          <View style={styles.searchBar}>
            <Search size={16} color={Colors.gray500} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search roles, companies, or keywords..."
              placeholderTextColor={Colors.gray400}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <View style={styles.locationInput}>
            <MapPin size={16} color={Colors.gray500} />
            <TextInput
              style={styles.searchInput}
              placeholder="Location..."
              placeholderTextColor={Colors.gray400}
              value={locationQuery}
              onChangeText={setLocationQuery}
            />
          </View>
        </View>

        {/* Mode dropdown + Categories */}
        <View style={styles.modeRow}>
          <View style={styles.dropdownWrap}>
            <Pressable
              style={styles.dropdownToggle}
              onPress={() => setShowModeDropdown((prev) => !prev)}
            >
              <Text style={styles.dropdownToggleText}>
                {selectedMode === 'ALL_MODES' ? 'All Modes' : selectedMode}
              </Text>
              <Animated.View style={{ transform: [{ rotate: dropdownRotation }] }}>
                <ChevronDown size={14} color={Colors.gray600} />
              </Animated.View>
            </Pressable>
            <Animated.View
              style={[
                styles.dropdownMenu,
                { height: dropdownHeight, opacity: dropdownOpacity },
              ]}
            >
              {JOB_MODES.map((mode) => {
                const Icon = mode.icon;
                const isActive = selectedMode === mode.value;
                return (
                  <TouchableOpacity
                    key={mode.value}
                    style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
                    onPress={() => { setSelectedMode(mode.value); setShowModeDropdown(false); }}
                  >
                    <Icon size={15} color={isActive ? Colors.primary : Colors.gray600} />
                    <Text style={[styles.dropdownItemText, isActive && styles.dropdownItemTextActive]}>
                      {mode.label}
                    </Text>
                    {isActive && <View style={styles.dropdownCheck} />}
                  </TouchableOpacity>
                );
              })}
            </Animated.View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
            {JOB_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Dropdown backdrop */}
        {showModeDropdown && (
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowModeDropdown(false)} />
        )}

        {/* Job list */}
        {loading && jobs.length === 0 ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.centerState}>
            <Briefcase size={52} color={Colors.gray300} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchJobs(true)}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={jobs}
            renderItem={renderJobCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.jobList}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={onRefresh}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Briefcase size={52} color={Colors.gray200} />
                <Text style={styles.emptyTitle}>No jobs found</Text>
                <Text style={styles.emptyDesc}>
                  No live job clusters match current parameter combinations.
                </Text>
              </View>
            }
          />
        )}
      </Animated.View>

      {/* FAB */}
      <Animated.View style={[
        styles.fab,
        {
          opacity: fabEntrance,
          transform: [
            { scale: fabScale },
            { scale: fabEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
            { translateY: fabBreathe.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) },
          ],
        },
      ]}>
        <TouchableOpacity
          style={styles.fabInner}
          onPress={handleFabPress}
          activeOpacity={0.85}
        >
          <Plus size={20} color={Colors.white} />
        </TouchableOpacity>
      </Animated.View>

      {/* Applicants Dashboard Modal */}
      <Modal visible={showApplicantsDashboard} transparent animationType="slide" onRequestClose={() => setShowApplicantsDashboard(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { paddingHorizontal: 0, paddingTop: 0 }]}>
            <View style={[styles.dashHeader, { paddingTop: compactHeaderTopPadding }]}>
              <TouchableOpacity onPress={() => setShowApplicantsDashboard(false)} style={styles.dashBackBtn}>
                <ArrowLeft size={22} color={Colors.gray800} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.dashTitle} numberOfLines={1}>{dashboardJob?.title || 'Applicants'}</Text>
              </View>
              <View style={styles.dashCountBadge}>
                <Text style={styles.dashCountText}>{dashboardApplicants.length}</Text>
              </View>
            </View>

            {/* Segmented Sub-Tabs */}
            <View style={styles.applicantSegmentedWrap}>
              {(['all', 'saved'] as const).map((tab) => {
                const isActive = applicantSubTab === tab;
                const count = tab === 'saved'
                  ? dashboardApplicants.filter((a) => savedProfiles.has(a.id)).length
                  : dashboardApplicants.length;
                return (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.applicantSegmentedTab, isActive && styles.applicantSegmentedTabActive]}
                    onPress={() => setApplicantSubTab(tab)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.applicantSegmentedText, isActive && styles.applicantSegmentedTextActive]}>
                      {tab === 'all' ? 'All' : 'Saved'}
                    </Text>
                    <View style={[styles.applicantSegmentedBadge, isActive && styles.applicantSegmentedBadgeActive]}>
                      <Text style={[styles.applicantSegmentedBadgeText, isActive && styles.applicantSegmentedBadgeTextActive]}>{count}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {dashboardLoading ? (
              <View style={[styles.centerState, { paddingVertical: 80 }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : dashboardApplicants.length === 0 ? (
              <View style={[styles.emptyState, { paddingTop: 60 }]}>
                <User size={52} color={Colors.gray200} />
                <Text style={styles.emptyTitle}>No applicants yet</Text>
                <Text style={styles.emptyDesc}>When people apply, they will appear here.</Text>
              </View>
            ) : applicantSubTab === 'saved' && dashboardApplicants.filter((a) => savedProfiles.has(a.id)).length === 0 ? (
              <View style={[styles.emptyState, { paddingTop: 60 }]}>
                <Heart size={52} color={Colors.gray200} />
                <Text style={styles.emptyTitle}>No saved applicants</Text>
                <Text style={styles.emptyDesc}>Save applicant profiles to quickly find them later.</Text>
              </View>
            ) : (
              <FlatList
                data={applicantSubTab === 'saved'
                  ? dashboardApplicants.filter((a) => savedProfiles.has(a.id))
                  : dashboardApplicants
                }
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}
                renderItem={({ item }) => {
                  const isSaved = savedProfiles.has(item.id);
                  return (
                    <View style={styles.applicantCard}>
                      <View style={styles.applicantCardTop}>
                        <Image source={{ uri: item.avatar }} style={styles.applicantAvatar} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.applicantName}>{item.name}</Text>
                          {item.profession ? (
                            <Text style={styles.applicantBio} numberOfLines={1}>{item.profession}</Text>
                          ) : null}
                        </View>
                        <TouchableOpacity
                          style={styles.applicantSaveBtn}
                          onPress={() => handleToggleSaveApplicant(item.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Heart
                            size={16}
                            color={isSaved ? Colors.primary : Colors.gray400}
                            fill={isSaved ? Colors.primary : 'transparent'}
                          />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.applicantMeta}>
                        {item.bio ? (
                          <Text style={styles.applicantDetail} numberOfLines={2}>{item.bio}</Text>
                        ) : null}
                        <View style={styles.applicantMetaRow}>
                          <MapPin size={12} color={Colors.gray500} />
                          <Text style={styles.applicantDetail}>Applied {item.appliedAt ? new Date(item.appliedAt).toLocaleDateString() : ''}</Text>
                        </View>
                      </View>
                      <View style={styles.applicantCardActions}>
                        <AnimatedPressable
                          style={styles.messageBtn}
                          onPress={() => handleMessageApplicant(item)}
                          disabled={messagingApplicantId === item.id}
                        >
                          {messagingApplicantId === item.id ? (
                            <ActivityIndicator size="small" color={Colors.primary} />
                          ) : (
                            <>
                              <MessageCircle size={15} color={Colors.primary} />
                              <Text style={styles.messageBtnText}>Message</Text>
                            </>
                          )}
                        </AnimatedPressable>
                        <AnimatedPressable
                          style={styles.viewProfileBtn}
                          onPress={() => openProfileModal(item, dashboardJob)}
                        >
                          <Eye size={15} color={Colors.white} />
                          <Text style={styles.viewProfileBtnText}>View Profile</Text>
                        </AnimatedPressable>
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Premium Profile Modal */}
      <Modal visible={showProfileModal} transparent animationType="slide" onRequestClose={() => setShowProfileModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { paddingHorizontal: 0, paddingTop: 0 }]}>
            {/* Header */}
            {profileLoading ? (
              <View style={{ flex: 1 }}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={{ width: '100%', aspectRatio: 3, backgroundColor: Colors.gray200 }} />
                  <View style={{ alignItems: 'center', marginTop: -AVATAR_OVERLAP }}>
                    <Animated.View style={[styles.skeletonAvatar, { opacity: shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }]} />
                  </View>
                  <View style={{ padding: Spacing.lg, paddingTop: AVATAR_OVERLAP + 12, gap: 14 }}>
                    {[50, 35, 45].map((w, i) => (
                      <Animated.View key={i} style={[styles.skeletonBlock, { width: `${w}%`, height: i === 0 ? 24 : i === 1 ? 16 : 14, alignSelf: 'center', opacity: shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }]} />
                    ))}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {[1, 2, 3].map((i) => (
                        <Animated.View key={i} style={[styles.skeletonBlock, { flex: 1, height: 46, opacity: shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }]} />
                      ))}
                    </View>
                    <View style={{ gap: 6 }}>
                      <Animated.View style={[styles.skeletonBlock, { height: 12, opacity: shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }]} />
                      <Animated.View style={[styles.skeletonBlock, { width: '90%', height: 12, opacity: shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }]} />
                      <Animated.View style={[styles.skeletonBlock, { width: '70%', height: 12, opacity: shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }]} />
                    </View>
                    <View>
                      <Animated.View style={[styles.skeletonBlock, { width: 80, height: 14, marginBottom: 10, opacity: shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }]} />
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {[1, 2, 3, 4].map((i) => (
                          <Animated.View key={i} style={[styles.skeletonBlock, { width: 70, height: 28, opacity: shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }]} />
                        ))}
                      </View>
                    </View>
                  </View>
                </ScrollView>
              </View>
            ) : profileError ? (
              <View style={[styles.centerState, { flex: 1 }]}>
                <Text style={styles.errorText}>{profileError}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={retryProfileLoad}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : profileUser ? (
              <>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: Spacing.lg }}>
                    <View style={styles.profileHeroWrap}>
                      {/* Cover Image */}
                      <View style={styles.profileCoverSection}>
                        {profileUser.coverPhotoUrl ? (
                          <Image
                            source={{ uri: profileUser.coverPhotoUrl }}
                            style={styles.profileCoverImage}
                          />
                        ) : (
                          <View style={styles.profileCoverFallback}>
                            <User size={42} color={Colors.primary} />
                            <Text style={styles.profileCoverFallbackText}>No cover photo</Text>
                          </View>
                        )}

                        <TouchableOpacity
                          onPress={() => { setShowProfileModal(false); setProfileError(null); }}
                          style={[styles.profileBackButton, { top: compactHeaderTopPadding }]}
                          activeOpacity={0.8}
                        >
                          <ArrowLeft size={22} color={Colors.gray900} />
                        </TouchableOpacity>

                        <View style={styles.profileAvatarWrap}>
                          <View style={styles.profileAvatarShadow}>
                            {profileUser.avatar ? (
                              <Animated.View style={{ transform: [{ scale: 1 }] }}>
                                <Image
                                  source={{ uri: profileUser.avatar }}
                                  style={styles.profileModalAvatar}
                                />
                              </Animated.View>
                            ) : (
                              <Animated.View style={{ transform: [{ scale: 1 }] }}>
                                <View style={styles.profileAvatarFallback}>
                                  <Text style={styles.profileAvatarFallbackText}>{getProfileInitials(profileUser.fullName)}</Text>
                                </View>
                              </Animated.View>
                            )}
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Main Content Card */}
                    <View style={styles.profileContentCard}>
                      <View style={styles.profileInfoSection}>
                        <Text style={styles.profileName} numberOfLines={1}>{profileUser.fullName || 'Unknown'}</Text>
                        {profileUser.profession ? (
                          <Text style={styles.profileProfession} numberOfLines={1}>
                            {profileUser.profession.charAt(0).toUpperCase() + profileUser.profession.slice(1)}
                          </Text>
                        ) : null}
                        <View style={styles.profileLocationRow}>
                          <MapPin size={14} color={Colors.gray500} />
                          <Text style={styles.profileLocationText} numberOfLines={1}>
                            {profileUser.location || 'Location not set'}
                          </Text>
                        </View>

                        <View style={styles.profileBadgeRow}>
                          <View style={styles.profileBadge}>
                            <User size={12} color={Colors.primary} />
                            <Text style={styles.profileBadgeText}>{profileUser.username || 'No username'}</Text>
                          </View>
                          <View style={styles.profileBadge}>
                            <ShieldCheck size={12} color={Colors.primary} />
                            <Text style={styles.profileBadgeText}>
                              {profileUser.verificationStatus
                                ? profileUser.verificationStatus.charAt(0).toUpperCase() + profileUser.verificationStatus.slice(1)
                                : 'None'}
                            </Text>
                          </View>
                          <View style={styles.profileBadge}>
                            <Star size={12} color={Colors.warning} />
                            <Text style={styles.profileBadgeText}>
                              {profileUser.ratingsSummary
                                ? `${profileUser.ratingsSummary.averageRating || 0} · ${profileUser.ratingsSummary.totalRatings || 0}`
                                : '0 · 0'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.profileSection}>
                          <Text style={styles.profileSectionTitle}>Quick Info</Text>
                          <View style={styles.quickInfoList}>
                            <View style={styles.quickInfoItem}>
                              <Mail size={14} color={Colors.primary} />
                              <View style={{ flex: 1 }}>
                                <Text style={styles.quickInfoLabel}>Email</Text>
                                <Text style={styles.quickInfoValue} numberOfLines={1}>{profileUser.email || 'Not set'}</Text>
                              </View>
                            </View>
                            <View style={styles.quickInfoItem}>
                              <Phone size={14} color={Colors.primary} />
                              <View style={{ flex: 1 }}>
                                <Text style={styles.quickInfoLabel}>Phone</Text>
                                <Text style={styles.quickInfoValue} numberOfLines={1}>{profileUser.phoneNumber || 'Not set'}</Text>
                              </View>
                            </View>
                            <View style={styles.quickInfoItem}>
                              <Calendar size={14} color={Colors.primary} />
                              <View style={{ flex: 1 }}>
                                <Text style={styles.quickInfoLabel}>Age / Gender</Text>
                                <Text style={styles.quickInfoValue} numberOfLines={1}>
                                  {profileUser.age ?? 'Not set'}{profileUser.gender ? ` · ${profileUser.gender}` : ''}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.quickInfoItem}>
                              <Sparkles size={14} color={Colors.primary} />
                              <View style={{ flex: 1 }}>
                                <Text style={styles.quickInfoLabel}>Goal</Text>
                                <Text style={styles.quickInfoValue} numberOfLines={1}>
                                  {profileUser.userGoal === 'OFFER_SERVICE'
                                    ? 'Offering services'
                                    : profileUser.userGoal === 'HIRE_PROFESSIONALS'
                                      ? 'Hiring professionals'
                                      : 'Not set'}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>

                        {/* About */}
                        {profileUser.bio ? (
                          <View style={styles.profileSection}>
                            <Text style={styles.profileSectionTitle}>About</Text>
                            <Text style={styles.bioText}>{profileUser.bio}</Text>
                          </View>
                        ) : null}

                        {/* Skills */}
                        {profileUser.skills?.length > 0 ? (
                          <View style={styles.profileSection}>
                            <Text style={styles.profileSectionTitle}>Skills</Text>
                            <View style={styles.skillsWrap}>
                              {profileUser.skills.map((skill: string, index: number) => (
                                <View key={index} style={styles.skillChip}>
                                  <Text style={styles.skillChipText}>{skill}</Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        ) : null}

                        {/* Portfolio / Social Links */}
                        {profileUser.socialLinks?.length > 0 && (
                          <View style={styles.profileSection}>
                            <Text style={styles.profileSectionTitle}>Links</Text>
                            <View style={styles.skillsWrap}>
                              {profileUser.socialLinks.map((link: { platform: string; url: string }, index: number) => (
                                <TouchableOpacity key={index} style={styles.skillChip} onPress={() => {}} activeOpacity={0.7}>
                                  <Globe size={12} color={Colors.primary} />
                                  <Text style={styles.skillChipText}>{link.platform || link.url}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>
                        )}

                        {/* Activity Metrics */}
                        {profileUser.stats ? (
                          <View style={styles.profileSection}>
                            <Text style={styles.profileSectionTitle}>Activity</Text>
                            <View style={styles.activityGrid}>
                              <View style={styles.activityCard}>
                                <Briefcase size={20} color={Colors.primary} />
                                <Text style={styles.activityValue}>{profileUser.stats.jobsDone || 0}</Text>
                                <Text style={styles.activityLabel}>Projects</Text>
                              </View>
                              <View style={styles.activityCard}>
                                <Star size={20} color={Colors.warning} />
                                <Text style={styles.activityValue}>{profileUser.stats.reviews || 0}</Text>
                                <Text style={styles.activityLabel}>Reviews</Text>
                              </View>
                              <View style={styles.activityCard}>
                                <IndianRupee size={20} color={Colors.secondary} />
                                <Text style={styles.activityValue}>{profileUser.stats.earned || 0}</Text>
                                <Text style={styles.activityLabel}>Earned</Text>
                              </View>
                            </View>
                          </View>
                        ) : null}

                        <View style={{ height: 16 }} />
                      </View>
                    </View>
                </ScrollView>

                {/* Sticky Footer Action Bar */}
                <View style={styles.profileStickyFooter}>
                  <AnimatedPressable
                    style={styles.profileActionOutline}
                    onPress={() => handleMessageFromProfile(profileUser.id)}
                    disabled={messagingApplicantId === profileUser.id}
                  >
                    {messagingApplicantId === profileUser.id ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <>
                        <MessageCircle size={16} color={Colors.primary} />
                        <Text style={styles.profileActionOutlineText}>Message</Text>
                      </>
                    )}
                  </AnimatedPressable>
                  <AnimatedPressable
                    style={[
                      styles.profileActionPrimary,
                      hireStatusMap.current[profileUser.id] === 'accepted' && styles.profileActionHired,
                    ]}
                    onPress={handleHireInvite}
                    disabled={hiringLoading}
                  >
                    {hiringLoading ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : hireStatusMap.current[profileUser.id] === 'accepted' ? (
                      <>
                        <CheckCircle size={16} color={Colors.white} />
                        <Text style={styles.profileActionPrimaryText}>Hired</Text>
                      </>
                    ) : (
                      <>
                        <Award size={16} color={Colors.white} />
                        <Text style={styles.profileActionPrimaryText}>Hire</Text>
                      </>
                    )}
                  </AnimatedPressable>
                  {(() => {
                    const isSaved = savedProfilesLoaded && !!profileUser?.id && savedProfiles.has(profileUser.id);
                    return (
                      <AnimatedPressable
                        style={[styles.profileActionOutline, isSaved && styles.profileActionSaved]}
                        onPress={handleSaveProfile}
                        disabled={!savedProfilesLoaded}
                      >
                        <Heart
                          size={16}
                          color={isSaved ? Colors.white : Colors.gray600}
                          fill={isSaved ? Colors.white : 'transparent'}
                        />
                        <Text style={[styles.profileActionOutlineText, isSaved && { color: Colors.white }]}>
                          {isSaved ? 'Saved' : 'Save'}
                        </Text>
                      </AnimatedPressable>
                    );
                  })()}
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Rehire Confirmation Modal */}
      <Modal visible={showRehireModal} transparent animationType="fade" onRequestClose={() => setShowRehireModal(false)}>
        <View style={styles.rehireOverlay}>
          <View style={styles.rehireModal}>
            <Text style={styles.rehireTitle}>Already Hired</Text>
            <Text style={styles.rehireBody}>
              This applicant has already been hired. Do you want to continue the hiring process again?
            </Text>
            <View style={styles.rehireActions}>
              <TouchableOpacity style={styles.rehireCancelBtn} onPress={() => setShowRehireModal(false)}>
                <Text style={styles.rehireCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rehireConfirmBtn} onPress={handleConfirmRehire}>
                <Text style={styles.rehireConfirmText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Post / Edit Job Modal */}
      <Modal visible={showPostModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPostModal(false)}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalHeader, { paddingTop: compactHeaderTopPadding + 6 }]}>
            <Text style={styles.modalTitle}>{editingJob ? 'Edit Job' : 'Post a Job'}</Text>
            <TouchableOpacity onPress={() => { setShowPostModal(false); setEditingJob(null); }} style={{ padding: 10 }}>
              <X size={24} color={Colors.gray700} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Job Title</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g. Mobile App Developer"
              placeholderTextColor={Colors.gray400}
              value={editingJob ? editTitle : postTitle}
              onChangeText={editingJob ? setEditTitle : setPostTitle}
            />

            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map((cat) => {
                const CatIcon = cat.icon;
                const activeId = editingJob ? editCategoryId : postCategoryId;
                const isActive = activeId === cat.id;
                const hex = CATEGORY_HEX[cat.id];
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.catCard,
                      { borderColor: hex.border, backgroundColor: hex.bg },
                      isActive && { borderColor: hex.main, backgroundColor: hex.main + '25' },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      if (editingJob) {
                        setEditCategoryId(cat.id);
                        setEditSubProfession('');
                        setEditCustomCategory('');
                      } else {
                        setPostCategoryId(cat.id);
                        setPostCategory(getCategoryLabel(cat.id));
                        setPostSubProfession('');
                        setPostCustomCategory('');
                      }
                    }}
                  >
                    <CatIcon size={22} color={hex.main} />
                    <Text style={[styles.catCardLabel, { color: hex.main }]}>{cat.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {(editingJob ? editCategoryId : postCategoryId) ? (
              <View style={styles.subSection}>
                {(() => {
                  const activeId = editingJob ? editCategoryId! : postCategoryId!;
                  const subs = SUB_PROFESSIONS[activeId];
                  const hex = CATEGORY_HEX[activeId];
                  if (subs) {
                    const selected = editingJob ? editSubProfession : postSubProfession;
                    return (
                      <>
                        <Text style={styles.subLabel}>Sub-Profession</Text>
                        <View style={styles.subChipsRow}>
                          {subs.map((prof) => {
                            const isSelected = selected === prof;
                            return (
                              <TouchableOpacity
                                key={prof}
                                style={[
                                  styles.subChip,
                                  { borderColor: hex.border, backgroundColor: hex.bg },
                                  isSelected && { borderColor: hex.main, backgroundColor: hex.main },
                                ]}
                                onPress={() => {
                                  if (editingJob) setEditSubProfession(isSelected ? '' : prof);
                                  else setPostSubProfession(isSelected ? '' : prof);
                                }}
                              >
                                <Text style={[
                                  styles.subChipText,
                                  { color: hex.main },
                                  isSelected && { color: '#FFFFFF' },
                                ]}>{prof}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </>
                    );
                  }
                  const customVal = editingJob ? editCustomCategory : postCustomCategory;
                  return (
                    <>
                      <Text style={styles.subLabel}>Specify Category</Text>
                      <TextInput
                        style={styles.fieldInput}
                        placeholder="Type your category..."
                        placeholderTextColor={Colors.gray400}
                        value={customVal}
                        onChangeText={(v) => {
                          if (editingJob) setEditCustomCategory(v);
                          else setPostCustomCategory(v);
                        }}
                      />
                    </>
                  );
                })()}
              </View>
            ) : null}

            <Text style={styles.fieldLabel}>Work Mode</Text>
            <View style={styles.modeCardGrid}>
              {JOB_MODES.filter((m) => m.value !== 'ALL_MODES').map((mode) => {
                const isActive = editingJob ? editMode === mode.value : postMode === mode.value;
                const ModeIcon = mode.icon;
                return (
                  <TouchableOpacity
                    key={mode.value}
                    style={[styles.modeCard, isActive && styles.modeCardActive]}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (editingJob) setEditMode(mode.value);
                      else setPostMode(mode.value);
                    }}
                  >
                    <ModeIcon size={20} color={isActive ? Colors.white : Colors.primary} />
                    <Text style={[styles.modeCardLabel, isActive && styles.modeCardLabelActive]}>{mode.label}</Text>
                    {isActive && <View style={styles.modeCardCheck} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Budget Range</Text>
            <View style={styles.budgetCard}>
              <IndianRupee size={18} color={Colors.secondary} style={{ marginRight: 4 }} />
              <View style={styles.budgetDivider} />
              <TextInput
                style={styles.budgetInput}
                placeholder="Min"
                placeholderTextColor={Colors.gray400}
                keyboardType="numeric"
                value={editingJob ? editBudgetMin : postBudgetMin}
                onChangeText={editingJob ? setEditBudgetMin : setPostBudgetMin}
              />
              <Text style={styles.budgetSep}>—</Text>
              <TextInput
                style={styles.budgetInput}
                placeholder="Max"
                placeholderTextColor={Colors.gray400}
                keyboardType="numeric"
                value={editingJob ? editBudgetMax : postBudgetMax}
                onChangeText={editingJob ? setEditBudgetMax : setPostBudgetMax}
              />
            </View>

            <Text style={styles.fieldLabel}>Location</Text>
            <View style={styles.locationCard}>
              <MapPin size={18} color={Colors.primary} />
              <TextInput
                style={styles.locationInputField}
                placeholder="e.g. Remote or San Francisco, CA"
                placeholderTextColor={Colors.gray400}
                value={editingJob ? editLocation : postLocation}
                onChangeText={editingJob ? setEditLocation : setPostLocation}
              />
            </View>

            <Text style={styles.fieldLabel}>Description</Text>
            <View style={styles.descCard}>
              <TextInput
                style={[styles.descInput, { height: descInputHeight }]}
                placeholder="Describe the job requirements..."
                placeholderTextColor={Colors.gray400}
                value={editingJob ? editDescription : postDescription}
                onChangeText={editingJob ? setEditDescription : setPostDescription}
                multiline
                textAlignVertical="top"
                onContentSizeChange={(e) => {
                  setDescInputHeight(Math.max(100, e.nativeEvent.contentSize.height));
                }}
              />
              <View style={styles.descFooter}>
                <Text style={styles.descHelper}>Tips for better job posts</Text>
                <Text style={styles.descCounter}>
                  {(editingJob ? editDescription : postDescription).length}/500
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, posting && styles.submitBtnDisabled]}
              onPress={editingJob ? handleUpdateJob : handlePostJob}
              disabled={posting}
              activeOpacity={0.85}
            >
              {posting ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.submitBtnText}>{editingJob ? 'Update Job' : 'Post Job'}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* My Listings Modal */}
      <Modal visible={showMyListings} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowMyListings(false)}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalHeader, { paddingTop: Math.max(10, (insets?.top ?? 0) + 4) }]}>
            <Text style={styles.modalTitle}>My Listings</Text>
            <TouchableOpacity onPress={() => setShowMyListings(false)}>
              <X size={24} color={Colors.gray700} />
            </TouchableOpacity>
          </View>

          {/* Segmented tabs */}
          <View style={styles.segmentedWrap}>
            <TouchableOpacity
              style={[styles.segmentedTab, myListingsTab === 'applicants' && styles.segmentedTabActive]}
              onPress={() => setMyListingsTab('applicants')}
              activeOpacity={0.7}
            >
              <User size={14} color={myListingsTab === 'applicants' ? Colors.white : Colors.gray600} />
              <Text style={[styles.segmentedTabText, myListingsTab === 'applicants' && styles.segmentedTabTextActive]}>
                Applicants
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentedTab, myListingsTab === 'applied' && styles.segmentedTabActive]}
              onPress={() => setMyListingsTab('applied')}
              activeOpacity={0.7}
            >
              <Send size={14} color={myListingsTab === 'applied' ? Colors.white : Colors.gray600} />
              <Text style={[styles.segmentedTabText, myListingsTab === 'applied' && styles.segmentedTabTextActive]}>
                Applied
              </Text>
            </TouchableOpacity>
          </View>

          {myListingsTab === 'applicants' ? (
            myJobsLoading ? (
              <View style={styles.centerState}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : myJobs.length === 0 ? (
              <View style={styles.emptyState}>
                <Briefcase size={52} color={Colors.gray200} />
                <Text style={styles.emptyTitle}>No listings yet</Text>
                <Text style={styles.emptyDesc}>Jobs you post will appear here.</Text>
              </View>
            ) : (
              <FlatList
                data={myJobs}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.myJobCard}
                    activeOpacity={0.85}
                    onPress={() => openApplicantsDashboard(item)}
                  >
                    <View style={styles.myJobCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.jobCompany}>{item.company}</Text>
                      </View>
                      <View style={styles.myJobActions}>
                        <TouchableOpacity
                          style={styles.myJobActionBtn}
                          onPress={() => handleEditMyJob(item)}
                        >
                          <Pencil size={16} color={Colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.myJobActionBtn}
                          onPress={() => handleDeleteMyJob(item)}
                        >
                          <Trash2 size={16} color={Colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.jobMeta}>
                      <View style={styles.jobMetaItem}>
                        <IndianRupee size={13} color={Colors.secondary} />
                        <Text style={styles.jobMetaText}>{item.budget}</Text>
                      </View>
                      <View style={styles.jobMetaItem}>
                        <MapPin size={13} color={Colors.gray500} />
                        <Text style={styles.jobMetaText}>{item.location}</Text>
                      </View>
                      <View style={styles.jobMetaItem}>
                        <User size={13} color={Colors.gray500} />
                        <Text style={styles.jobMetaText}>{item.applicantCount} applicants</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )
          ) : (
            appliedJobsLoading ? (
              <View style={styles.centerState}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : appliedJobs.length === 0 ? (
              <View style={styles.emptyState}>
                <Send size={52} color={Colors.gray200} />
                <Text style={styles.emptyTitle}>No applications yet</Text>
                <Text style={styles.emptyDesc}>You haven't applied to any jobs yet.</Text>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => { setShowMyListings(false); }}
                >
                  <Text style={styles.retryBtnText}>Browse Jobs</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={appliedJobs}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}
                renderItem={({ item }) => {
                  const statusColors: Record<string, { bg: string; text: string }> = {
                    pending: { bg: '#FEF3C7', text: '#92400E' },
                    viewed: { bg: '#DBEAFE', text: '#1E40AF' },
                    shortlisted: { bg: '#DBEAFE', text: '#1E40AF' },
                    accepted: { bg: '#DCFCE7', text: '#166534' },
                    rejected: { bg: '#FEE2E2', text: '#991B1B' },
                  };
                  const colors = statusColors[item.applicationStatus] || statusColors.pending;
                  const statusLabel = item.applicationStatus.charAt(0).toUpperCase() + item.applicationStatus.slice(1);
                  const StatusIcon = item.applicationStatus === 'accepted' ? CheckCircle :
                    item.applicationStatus === 'rejected' ? XCircle : Hourglass;

                  return (
                    <View style={styles.appliedJobCard}>
                      <View style={styles.appliedJobCardTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
                          <Text style={styles.jobCompany}>{item.company}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
                          <StatusIcon size={12} color={colors.text} />
                          <Text style={[styles.statusBadgeText, { color: colors.text }]}>{statusLabel}</Text>
                        </View>
                      </View>
                      <View style={styles.jobMeta}>
                        <View style={styles.jobMetaItem}>
                          <IndianRupee size={13} color={Colors.secondary} />
                          <Text style={styles.jobMetaText}>{item.budget}</Text>
                        </View>
                        <View style={styles.jobMetaItem}>
                          <MapPin size={13} color={Colors.gray500} />
                          <Text style={styles.jobMetaText}>{item.location}</Text>
                        </View>
                        <View style={styles.jobMetaItem}>
                          <Clock size={13} color={Colors.gray500} />
                          <Text style={styles.jobMetaText}>{item.posted}</Text>
                        </View>
                      </View>
                      <View style={styles.appliedJobFooter}>
                        <TouchableOpacity onPress={() => handleWithdraw(item)} activeOpacity={0.7}>
                          <Text style={styles.withdrawText}>Withdraw Application</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.viewJobBtn} activeOpacity={0.7}>
                          <Text style={styles.viewJobBtnText}>View Job</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
              />
            )
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.white,
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray900,
  },
  myListingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary + '0E',
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  myListingsText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.primary,
  },

  // Filters
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
    flex: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.gray900,
    padding: 0,
  },
  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    height: 42,
    gap: 6,
    width: 120,
  },

  // Mode dropdown
  modeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.white,
    zIndex: 10,
  },
  dropdownWrap: {
    position: 'relative',
    zIndex: 20,
  },
  dropdownToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    height: 36,
  },
  dropdownToggleText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray700,
    textTransform: 'uppercase',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 40,
    left: 0,
    width: 190,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingVertical: 6,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  dropdownItemActive: {
    backgroundColor: Colors.primary + '0A',
  },
  dropdownItemText: {
    fontSize: FontSizes.sm,
    color: Colors.gray700,
    fontWeight: FontWeights.medium as any,
    flex: 1,
  },
  dropdownItemTextActive: {
    color: Colors.primary,
    fontWeight: FontWeights.semiBold as any,
  },
  dropdownCheck: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },

  // Categories
  categoriesScroll: {
    flex: 1,
    paddingVertical: 2,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
    marginRight: 6,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
  },
  categoryText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium as any,
    color: Colors.gray600,
  },
  categoryTextActive: {
    color: Colors.white,
  },

  // Job list
  jobList: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  jobCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  jobCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  jobAvatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray200,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
  },
  jobCompany: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: 1,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary + '0E',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  modeBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.primary,
    textTransform: 'capitalize',
  },
  jobMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  jobMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  jobMetaText: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
  },
  jobDesc: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 20,
    marginBottom: 10,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobTypeBadge: {
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  jobTypeText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray600,
  },
  viewApplicantsBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  viewApplicantsText: {
    color: Colors.white,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semiBold as any,
  },
  applyBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 18,
    paddingVertical: 7,
  },
  appliedBtn: {
    backgroundColor: Colors.gray400,
  },
  applyBtnText: {
    color: Colors.white,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semiBold as any,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: Spacing.lg,
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    zIndex: 50,
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // States
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing.lg,
  },
  errorText: {
    fontSize: FontSizes.md,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryBtnText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray600,
    marginTop: Spacing.md,
  },
  emptyDesc: {
    fontSize: FontSizes.sm,
    color: Colors.gray400,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 20,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.gray200,
  },
  modalTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray900,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  fieldLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray700,
    marginBottom: 6,
  },
  fieldInput: {
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
    fontSize: FontSizes.md,
    color: Colors.gray900,
    backgroundColor: Colors.gray50,
  },
  fieldTextarea: {
    height: 110,
    paddingTop: Spacing.md,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  // Category grid
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  catCard: {
    width: '47%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    gap: 8,
  },
  catCardLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    textAlign: 'center',
  },

  // Sub-profession section
  subSection: {
    marginTop: Spacing.md,
    gap: 10,
  },
  subLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray700,
  },
  subChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  subChipText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium as any,
  },

  // Work Mode cards
  modeCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  modeCard: {
    width: '30%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary + '25',
    backgroundColor: Colors.primary + '0A',
    gap: 8,
    position: 'relative',
  },
  modeCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  modeCardLabel: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.primary,
    textAlign: 'center',
  },
  modeCardLabelActive: {
    color: Colors.white,
  },
  modeCardCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white,
  },

  // Budget card
  budgetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary + '0A',
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.secondary + '20',
    paddingHorizontal: 14,
    height: 52,
    gap: 8,
  },
  budgetDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.secondary + '30',
    marginRight: 4,
  },
  budgetInput: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.gray900,
    padding: 0,
    height: 48,
  },
  budgetSep: {
    fontSize: FontSizes.md,
    color: Colors.gray400,
    fontWeight: FontWeights.semiBold as any,
    paddingHorizontal: 2,
  },

  // Location card
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '0A',
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary + '20',
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  locationInputField: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.gray900,
    padding: 0,
    height: 48,
  },

  // Description card
  descCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    paddingHorizontal: 14,
    paddingTop: 14,
    gap: 4,
  },
  descInput: {
    fontSize: FontSizes.md,
    color: Colors.gray900,
    padding: 0,
    minHeight: 100,
    lineHeight: 22,
  },
  descFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    paddingTop: 4,
  },
  descHelper: {
    fontSize: FontSizes.xs,
    color: Colors.gray400,
  },
  descCounter: {
    fontSize: FontSizes.xs,
    color: Colors.gray400,
    fontWeight: FontWeights.medium as any,
  },

  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xxl,
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitBtnDisabled: {
    backgroundColor: Colors.gray300,
    elevation: 0,
    shadowOpacity: 0,
  },
  submitBtnText: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold as any,
  },

  // My Listings
  myJobCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  myJobCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  myJobActions: {
    flexDirection: 'row',
    gap: 8,
  },
  myJobActionBtn: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Segmented tabs
  segmentedWrap: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    padding: 3,
  },
  segmentedTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
  },
  segmentedTabActive: {
    backgroundColor: Colors.primary,
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  segmentedTabText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray600,
  },
  segmentedTabTextActive: {
    color: Colors.white,
  },

  // Applied jobs
  appliedJobCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  appliedJobCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semiBold as any,
  },
  appliedJobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: Colors.gray200,
  },
  withdrawText: {
    fontSize: FontSizes.sm,
    color: Colors.error,
    fontWeight: FontWeights.medium as any,
  },
  viewJobBtn: {
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  viewJobBtnText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray700,
  },

  // Applicants Dashboard
  dashHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.gray200,
  },
  dashBackBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray900,
  },
  dashCountBadge: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    minWidth: 28,
    height: 28,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashCountText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold as any,
  },
  applicantSegmentedWrap: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.gray200,
  },
  applicantSegmentedTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
  },
  applicantSegmentedTabActive: {
    backgroundColor: Colors.primary,
  },
  applicantSegmentedText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray600,
  },
  applicantSegmentedTextActive: {
    color: Colors.white,
  },
  applicantSegmentedBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  applicantSegmentedBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  applicantSegmentedBadgeText: {
    fontSize: 11,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray600,
  },
  applicantSegmentedBadgeTextActive: {
    color: Colors.white,
  },
  applicantCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  applicantCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  applicantSaveBtn: {
    padding: 6,
    marginLeft: 8,
  },
  applicantAvatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray200,
  },
  applicantName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
  },
  applicantBio: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: 2,
  },
  applicantMeta: {
    marginTop: 8,
    gap: 4,
  },
  applicantMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  applicantDetail: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 20,
  },
  applicantCardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: Colors.gray200,
  },
  messageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  messageBtnText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.primary,
  },
  viewProfileBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
  },
  viewProfileBtnText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.white,
  },

  // Premium Profile Modal
  profileHeroWrap: {
    width: '100%',
  },
  profileCoverSection: {
    width: '100%',
    height: COVER_HEIGHT,
    position: 'relative',
    overflow: 'visible',
    backgroundColor: Colors.gray100,
  },
  profileCoverImage: {
    width: '100%',
    height: '100%',
  },
  profileBackButton: {
    position: 'absolute',
    left: Spacing.lg,
    zIndex: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  profileAvatarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -AVATAR_OVERLAP,
    alignItems: 'center',
    zIndex: 10,
  },
  profileAvatarShadow: {
    borderRadius: AVATAR_SIZE / 2,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  profileModalAvatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: Colors.gray200,
    borderWidth: 4,
    borderColor: Colors.white,
  },
  profileAvatarFallback: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: Colors.primary + '14',
    borderWidth: 4,
    borderColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarFallbackText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold as any,
    color: Colors.primary,
  },
  profileCoverFallback: {
    width: '100%',
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  profileCoverFallbackText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium as any,
    color: Colors.gray500,
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.success,
    borderWidth: 2.5,
    borderColor: Colors.white,
  },
  profileInfoSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: AVATAR_OVERLAP + 18,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
  },
  profileName: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray900,
    textAlign: 'center',
  },
  profileProfession: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium as any,
    color: Colors.primary,
    marginTop: 4,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  profileLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  profileLocationText: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  profileBadgeRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 10,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary + '0C',
    borderWidth: 1,
    borderColor: Colors.primary + '18',
  },
  profileBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray700,
  },
  quickInfoList: {
    width: '100%',
    gap: 8,
  },
  quickInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.gray50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.gray100,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  quickInfoLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    marginBottom: 2,
  },
  quickInfoValue: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
  },
  detailGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  detailItem: {
    width: '48%',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  detailLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailValue: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
  },
  profileActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.lg,
    width: '100%',
  },
  profileActionOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  profileActionOutlineText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.primary,
  },
  profileActionPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
  },
  profileActionPrimaryText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.white,
  },
  profileActionHired: {
    backgroundColor: Colors.gray500,
    opacity: 0.85,
  },
  profileActionSaved: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  profileStickyFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  profileContentCard: {
    marginTop: Spacing.sm,
    marginHorizontal: 0,
    backgroundColor: Colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.gray100,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    overflow: 'visible',
  },
  profileSection: {
    width: '100%',
    marginTop: Spacing.md,
    backgroundColor: Colors.gray50,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.gray100,
    padding: Spacing.md,
  },
  profileSectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray800,
    marginBottom: 10,
  },
  bioText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 22,
  },
  skillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    backgroundColor: Colors.primary + '0E',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  skillChipText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.primary,
  },
  activityGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  activityCard: {
    flex: 1,
    backgroundColor: Colors.gray50,
    borderRadius: 16,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  activityValue: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray900,
  },
  activityLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    fontWeight: FontWeights.medium as any,
  },
  rehireOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  rehireModal: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
  },
  rehireTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray900,
    marginBottom: 12,
  },
  rehireBody: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 22,
    marginBottom: 24,
  },
  rehireActions: {
    flexDirection: 'row',
    gap: 12,
  },
  rehireCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray300,
    alignItems: 'center',
  },
  rehireCancelText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray600,
  },
  rehireConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  rehireConfirmText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.white,
  },
  skeletonAvatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: Colors.gray200,
    borderWidth: 4,
    borderColor: Colors.white,
  },
  skeletonBlock: {
    backgroundColor: Colors.gray200,
    borderRadius: BorderRadius.sm,
  },
});
