import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, FlatList, Image, ActivityIndicator, Alert,
  Animated, Pressable,
} from 'react-native';
import {
  Search, MapPin, IndianRupee, Briefcase, X, Plus,
  List, ChevronDown, Clock, Building2,
  GraduationCap, Wifi, Home, Globe, User,
  Pencil, Trash2,
} from 'lucide-react-native';
import { Colors, FontWeights, Spacing, BorderRadius, FontSizes } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import {
  getJobs, postJob, applyJob, getMyJobs, deleteJob, updateJob,
  type Job,
} from '@/lib/jobsApi';

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
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [myJobsLoading, setMyJobsLoading] = useState(false);

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
    });

    if (fetchError) {
      setError(fetchError);
    } else if (data) {
      setJobs(data);
    }
    setLoading(false);
    setRefreshing(false);
  }, [session?.access_token, selectedCategory, debouncedSearchQuery, debouncedLocationQuery, selectedMode]);

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
    setMyJobsLoading(true);
    const { data } = await getMyJobs(session.access_token);
    if (data) setMyJobs(data);
    setMyJobsLoading(false);
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
          {myJobsLoading ? (
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
                <View style={styles.myJobCard}>
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
                </View>
              )}
            />
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
});
