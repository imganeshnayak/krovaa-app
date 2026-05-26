import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, FlatList, Image, ActivityIndicator, Alert,
  Animated, Pressable, Dimensions,
} from 'react-native';
import {
  Search, MapPin, IndianRupee, Briefcase, X, Plus,
  List, ChevronDown, Clock, Building2,
  GraduationCap, Wifi, Home, Globe, User,
  Pencil, Trash2, ArrowLeft, Send, Eye, MessageCircle,
  CheckCircle, XCircle, Clock as Hourglass,
  Heart, Award, Star,
} from 'lucide-react-native';
import { Colors, FontWeights, Spacing, BorderRadius, FontSizes } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import {
  getJobs, postJob, applyJob, getMyJobs, deleteJob, updateJob,
  getAppliedJobs, withdrawApplication, getJobApplicants, getUserProfile,
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

function getModeIcon(mode: string) {
  const found = JOB_MODES.find((m) => m.value === mode);
  return found?.icon || Briefcase;
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
  const [showMyListings, setShowMyListings] = useState(false);
  const [myListingsTab, setMyListingsTab] = useState<'applicants' | 'applied'>('applicants');
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [myJobsLoading, setMyJobsLoading] = useState(false);
  const [appliedJobs, setAppliedJobs] = useState<AppliedJob[]>([]);
  const [appliedJobsLoading, setAppliedJobsLoading] = useState(false);

  // Messaging state
  const [messagingApplicantId, setMessagingApplicantId] = useState<string | null>(null);

  // Premium profile modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileUser, setProfileUser] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Applicants dashboard
  const [showApplicantsDashboard, setShowApplicantsDashboard] = useState(false);
  const [dashboardJob, setDashboardJob] = useState<Job | null>(null);
  const [dashboardApplicants, setDashboardApplicants] = useState<JobApplicant[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // Post form
  const [postTitle, setPostTitle] = useState('');
  const [postBudget, setPostBudget] = useState('');
  const [postDescription, setPostDescription] = useState('');
  const [postCategory, setPostCategory] = useState('Development');
  const [postLocation, setPostLocation] = useState('');
  const [postMode, setPostMode] = useState('remote');
  const [posting, setPosting] = useState(false);

  // Edit form
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editMode, setEditMode] = useState('');
  const [editUpdating, setEditUpdating] = useState(false);

  // Animations
  const fabScale = useRef(new Animated.Value(1)).current;
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
    setPostTitle(''); setPostBudget(''); setPostDescription('');
    setPostLocation(''); setPostCategory('Development'); setPostMode('remote');
    setShowPostModal(true);
  };

  // Post job
  const handlePostJob = async () => {
    if (!session?.access_token) {
      Alert.alert('Authentication required', 'Please sign in to post a job.');
      return;
    }
    if (!postTitle.trim() || !postBudget.trim() || !postLocation.trim() || !postDescription.trim()) {
      Alert.alert('Validation Error', 'All fields are required.');
      return;
    }
    setPosting(true);
    const { data, error: postError } = await postJob(session.access_token, {
      title: postTitle, budget: postBudget, location: postLocation,
      type: postCategory, mode: postMode, description: postDescription,
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
    setEditDescription(job.description);
    setEditLocation(job.location);
    setEditCategory(job.type);
    setEditMode(job.mode || 'remote');
    setShowMyListings(false);
    setShowPostModal(true);
  };

  const handleUpdateJob = async () => {
    if (!session?.access_token || !editingJob) return;
    if (!editTitle.trim() || !editBudget.trim() || !editLocation.trim() || !editDescription.trim()) {
      Alert.alert('Validation Error', 'All fields are required.');
      return;
    }
    setPosting(true);
    const { data } = await updateJob(session.access_token, editingJob.id, {
      title: editTitle.trim(), budget: editBudget.trim(), location: editLocation.trim(),
      type: editCategory, mode: editMode, description: editDescription.trim(),
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

  const openProfileModal = async (applicant: JobApplicant) => {
    if (!session?.access_token) return;
    setShowProfileModal(true);
    setProfileLoading(true);
    setProfileSaved(false);
    const { data } = await getUserProfile(session.access_token, applicant.id);
    if (data) setProfileUser(data);
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

  const handleHireInvite = () => {
    Alert.alert('Coming Soon', 'Hire/Invite functionality will be available shortly.');
  };

  const handleSaveProfile = () => {
    setProfileSaved((prev) => !prev);
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
      <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity
          style={styles.fabInner}
          onPress={handleFabPress}
          activeOpacity={0.85}
        >
          <Plus size={24} color={Colors.white} />
        </TouchableOpacity>
      </Animated.View>

      {/* Applicants Dashboard Modal */}
      <Modal visible={showApplicantsDashboard} transparent animationType="slide" onRequestClose={() => setShowApplicantsDashboard(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { paddingHorizontal: 0, paddingTop: 0 }]}>
            <View style={styles.dashHeader}>
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
            ) : (
              <FlatList
                data={dashboardApplicants}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}
                renderItem={({ item }) => (
                  <View style={styles.applicantCard}>
                    <View style={styles.applicantCardTop}>
                      <Image source={{ uri: item.avatar }} style={styles.applicantAvatar} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.applicantName}>{item.name}</Text>
                        {item.profession ? (
                          <Text style={styles.applicantBio} numberOfLines={1}>{item.profession}</Text>
                        ) : null}
                      </View>
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
                        onPress={() => openProfileModal(item)}
                      >
                        <Eye size={15} color={Colors.white} />
                        <Text style={styles.viewProfileBtnText}>View Profile</Text>
                      </AnimatedPressable>
                    </View>
                  </View>
                )}
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
            <View style={styles.profileHeader}>
              <TouchableOpacity onPress={() => setShowProfileModal(false)} style={styles.dashBackBtn}>
                <ArrowLeft size={22} color={Colors.gray800} />
              </TouchableOpacity>
            </View>

            {profileLoading ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ width: '100%', aspectRatio: 3, backgroundColor: Colors.gray200 }} />
                <View style={{ alignItems: 'center', marginTop: -AVATAR_OVERLAP }}>
                  <View style={styles.skeletonAvatar} />
                </View>
                <View style={{ padding: Spacing.lg, paddingTop: AVATAR_OVERLAP + 12, gap: 14 }}>
                  <View style={[styles.skeletonBlock, { width: '50%', height: 24, alignSelf: 'center' }]} />
                  <View style={[styles.skeletonBlock, { width: '35%', height: 16, alignSelf: 'center' }]} />
                  <View style={[styles.skeletonBlock, { width: '45%', height: 14, alignSelf: 'center' }]} />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={[styles.skeletonBlock, { flex: 1, height: 46 }]} />
                    <View style={[styles.skeletonBlock, { flex: 1, height: 46 }]} />
                    <View style={[styles.skeletonBlock, { flex: 1, height: 46 }]} />
                  </View>
                  <View style={{ gap: 6 }}>
                    <View style={[styles.skeletonBlock, { height: 12 }]} />
                    <View style={[styles.skeletonBlock, { width: '90%', height: 12 }]} />
                    <View style={[styles.skeletonBlock, { width: '70%', height: 12 }]} />
                  </View>
                  <View>
                    <View style={[styles.skeletonBlock, { width: 80, height: 14, marginBottom: 10 }]} />
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {[1, 2, 3, 4].map((i) => (
                        <View key={i} style={[styles.skeletonBlock, { width: 70, height: 28 }]} />
                      ))}
                    </View>
                  </View>
                </View>
              </ScrollView>
            ) : profileUser ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Cover Image */}
                <View style={{ height: COVER_HEIGHT + AVATAR_OVERLAP }}>
                  <Image
                    source={{ uri: profileUser.coverPhotoUrl || 'https://images.pexels.com/photos/313782/pexels-photo-313782.jpeg?auto=compress&cs=tinysrgb&w=800' }}
                    style={{ width: '100%', height: COVER_HEIGHT }}
                  />
                  {!profileUser.coverPhotoUrl && (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.primary + '15' }]} />
                  )}
                  {/* Overlapping Avatar */}
                  <View style={{ position: 'absolute', bottom: -AVATAR_OVERLAP, left: 0, right: 0, alignItems: 'center' }}>
                    <View style={{ position: 'relative' }}>
                      <Image
                        source={{ uri: profileUser.avatar || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200' }}
                        style={styles.profileModalAvatar}
                      />
                      <View style={styles.statusDot} />
                    </View>
                  </View>
                </View>

                {/* Info Section */}
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

                  {/* Action Buttons */}
                  <View style={styles.profileActions}>
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
                      style={styles.profileActionPrimary}
                      onPress={handleHireInvite}
                    >
                      <Award size={16} color={Colors.white} />
                      <Text style={styles.profileActionPrimaryText}>Hire</Text>
                    </AnimatedPressable>
                    <AnimatedPressable
                      style={[styles.profileActionOutline, profileSaved && styles.profileActionSaved]}
                      onPress={handleSaveProfile}
                    >
                      <Heart
                        size={16}
                        color={profileSaved ? Colors.white : Colors.gray600}
                        fill={profileSaved ? Colors.white : 'transparent'}
                      />
                      <Text style={[styles.profileActionOutlineText, profileSaved && { color: Colors.white }]}>
                        {profileSaved ? 'Saved' : 'Save'}
                      </Text>
                    </AnimatedPressable>
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

                  {Spacing.xxl && <View style={{ height: Spacing.xxl }} />}
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Post / Edit Job Modal */}
      <Modal visible={showPostModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPostModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingJob ? 'Edit Job' : 'Post a Job'}</Text>
            <TouchableOpacity onPress={() => { setShowPostModal(false); setEditingJob(null); }}>
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
            <View style={styles.categoryRow}>
              {['Design', 'Development', 'Marketing', 'Writing', 'Video'].map((cat) => {
                const isActive = editingJob ? editCategory === cat : postCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                    onPress={() => {
                      if (editingJob) setEditCategory(cat);
                      else setPostCategory(cat);
                    }}
                  >
                    <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Work Mode</Text>
            <View style={styles.categoryRow}>
              {JOB_MODES.filter((m) => m.value !== 'ALL_MODES').map((mode) => {
                const isActive = editingJob ? editMode === mode.value : postMode === mode.value;
                const ModeIcon = mode.icon;
                return (
                  <TouchableOpacity
                    key={mode.value}
                    style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                    onPress={() => {
                      if (editingJob) setEditMode(mode.value);
                      else setPostMode(mode.value);
                    }}
                  >
                    <ModeIcon size={13} color={isActive ? Colors.white : Colors.gray600} />
                    <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>{mode.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Budget Range</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g. ₹500 - ₹1,000"
              placeholderTextColor={Colors.gray400}
              value={editingJob ? editBudget : postBudget}
              onChangeText={editingJob ? setEditBudget : setPostBudget}
            />

            <Text style={styles.fieldLabel}>Location</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g. Remote or San Francisco, CA"
              placeholderTextColor={Colors.gray400}
              value={editingJob ? editLocation : postLocation}
              onChangeText={editingJob ? setEditLocation : setPostLocation}
            />

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldTextarea]}
              placeholder="Describe the job requirements..."
              placeholderTextColor={Colors.gray400}
              value={editingJob ? editDescription : postDescription}
              onChangeText={editingJob ? setEditDescription : setPostDescription}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.submitBtn, posting && { backgroundColor: Colors.gray400 }]}
              onPress={editingJob ? handleUpdateJob : handlePostJob}
              disabled={posting}
            >
              {posting ? (
                <ActivityIndicator color={Colors.white} />
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
          <View style={styles.modalHeader}>
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
    bottom: 96,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
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
    paddingTop: 60,
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
    marginTop: Spacing.sm,
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
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  submitBtnText: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semiBold as any,
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
    paddingTop: 60,
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
  profileHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.sm,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  profileModalAvatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: Colors.gray200,
    borderWidth: 4,
    borderColor: Colors.white,
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
    paddingTop: AVATAR_OVERLAP + 16,
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
  profileActionSaved: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  profileSection: {
    width: '100%',
    marginTop: Spacing.lg,
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
    gap: 10,
  },
  activityCard: {
    flex: 1,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
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
