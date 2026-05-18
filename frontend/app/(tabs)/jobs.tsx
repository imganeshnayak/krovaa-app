import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, FlatList, Image, ActivityIndicator, Alert
} from 'react-native';
import { Search, Plus, MapPin, Clock, IndianRupee, Briefcase, ListFilter as Filter, X, ChevronDown } from 'lucide-react-native';
import { Colors, FontWeights, Spacing, BorderRadius, FontSizes } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { getJobs, postJob, applyJob, type Job } from '@/lib/jobsApi';

const JOB_CATEGORIES = ['All', 'Design', 'Development', 'Marketing', 'Writing', 'Video'];

export default function JobsScreen() {
  const router = useRouter();
  const { session } = useAuth();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Post form state
  const [showPostModal, setShowPostModal] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postBudget, setPostBudget] = useState('');
  const [postDescription, setPostDescription] = useState('');
  const [postCategory, setPostCategory] = useState('Development');
  const [postLocation, setPostLocation] = useState('');
  const [posting, setPosting] = useState(false);

  // Debounce search query to optimize API requests
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const fetchJobs = async (showLoadingIndicator = false) => {
    if (showLoadingIndicator) setLoading(true);
    setError(null);

    const { data, error: fetchError } = await getJobs(
      session?.access_token,
      selectedCategory,
      debouncedSearchQuery
    );

    if (fetchError) {
      setError(fetchError);
    } else if (data) {
      setJobs(data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchJobs(true);
  }, [selectedCategory, debouncedSearchQuery, session?.access_token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchJobs(false);
  };

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
      title: postTitle,
      budget: postBudget,
      location: postLocation,
      type: postCategory,
      description: postDescription,
    });

    setPosting(false);

    if (postError || !data) {
      Alert.alert('Error', postError || 'Failed to post job.');
    } else {
      Alert.alert('Success', 'Your job post has been published!');
      setShowPostModal(false);
      // Reset form
      setPostTitle('');
      setPostBudget('');
      setPostLocation('');
      setPostDescription('');
      // Prepend newly posted job to active list
      setJobs((prev) => [data, ...prev]);
    }
  };

  const handleApply = async (job: Job) => {
    if (!session?.access_token) {
      Alert.alert('Authentication required', 'Please sign in to apply for this job.');
      return;
    }

    if (job.hasApplied) {
      Alert.alert('Already Applied', 'You have already submitted your application for this job.');
      return;
    }

    if (job.posterId === session.user.id) {
      Alert.alert('Action Restricted', 'You cannot apply for your own job posting.');
      return;
    }

    Alert.alert(
      'Apply for Job',
      `Would you like to apply for "${job.title}"? This will instantly start a chat with the employer, ${job.posterName}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply Now',
          onPress: async () => {
            setLoading(true);
            const { data, error: applyError } = await applyJob(session.access_token, job.id);
            setLoading(false);

            if (applyError || !data) {
              Alert.alert('Error', applyError || 'Failed to apply for job.');
            } else {
              Alert.alert(
                'Success!',
                'Your application was sent successfully. We are redirecting you to your chat with the employer.',
                [
                  {
                    text: 'Open Chat',
                    onPress: () => {
                      router.push(`/chat/${data.conversationId}`);
                    },
                  },
                ]
              );
              // Mark as applied locally
              setJobs((prev) =>
                prev.map((j) =>
                  j.id === job.id
                    ? { ...j, hasApplied: true, applicantCount: j.applicantCount + 1 }
                    : j
                )
              );
            }
          },
        },
      ]
    );
  };

  const renderJobCard = ({ item }: { item: Job }) => (
    <TouchableOpacity
      style={styles.jobCard}
      activeOpacity={0.7}
      onPress={() => {
        Alert.alert(
          item.title,
          `Company: ${item.company}\nLocation: ${item.location}\nBudget: ${item.budget ? String(item.budget).replace(/\$/g, '₹') : ''}\nCategory: ${item.type}\n\nDescription:\n${item.description}`
        );
      }}
    >
      <View style={styles.jobCardHeader}>
        <Image source={{ uri: item.avatar }} style={styles.jobAvatar} />
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>{item.title}</Text>
          <Text style={styles.jobCompany}>{item.company}</Text>
        </View>
      </View>
      <View style={styles.jobMeta}>
        <View style={styles.jobMetaItem}>
          <IndianRupee size={14} color={Colors.secondary} />
          <Text style={styles.jobMetaText}>
            {item.budget ? String(item.budget).replace(/\$/g, '₹') : ''}
          </Text>
        </View>
        <View style={styles.jobMetaItem}>
          <MapPin size={14} color={Colors.primary} />
          <Text style={styles.jobMetaText}>{item.location}</Text>
        </View>
        <View style={styles.jobMetaItem}>
          <Clock size={14} color={Colors.gray500} />
          <Text style={styles.jobMetaText}>{item.posted}</Text>
        </View>
      </View>
      <View style={styles.jobFooter}>
        <View style={styles.jobTypeBadge}>
          <Text style={styles.jobTypeText}>{item.type}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.applyButton,
            item.hasApplied && styles.appliedButton
          ]}
          onPress={() => handleApply(item)}
          disabled={item.hasApplied}
        >
          <Text style={styles.applyButtonText}>
            {item.hasApplied ? 'Applied' : 'Apply Now'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Jobs</Text>
        <TouchableOpacity style={styles.postJobButton} onPress={() => setShowPostModal(true)}>
          <Plus size={18} color={Colors.white} />
          <Text style={styles.postJobButtonText}>Post Job</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Search size={18} color={Colors.gray500} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search jobs..."
          placeholderTextColor={Colors.gray400}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={{ height: 50 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContainer}
        >
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

      {loading && jobs.length === 0 ? (
        <View style={[styles.centerState, { flex: 1 }]}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Briefcase size={48} color={Colors.gray300} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchJobs(true)}>
            <Text style={styles.retryButtonText}>Retry</Text>
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
              <Briefcase size={48} color={Colors.gray300} />
              <Text style={styles.emptyText}>No jobs found</Text>
            </View>
          }
        />
      )}

      <Modal visible={showPostModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Post a Job</Text>
            <TouchableOpacity onPress={() => setShowPostModal(false)}>
              <X size={24} color={Colors.gray700} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Job Title</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Mobile App Developer"
                placeholderTextColor={Colors.gray400}
                value={postTitle}
                onChangeText={setPostTitle}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categorySelector}>
                {['Design', 'Development', 'Marketing', 'Writing', 'Video'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.modalCategoryChip, postCategory === cat && styles.modalCategoryChipActive]}
                    onPress={() => setPostCategory(cat)}
                  >
                    <Text style={[styles.modalCategoryText, postCategory === cat && styles.modalCategoryTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Budget Range</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. ₹500 - ₹1,000"
                placeholderTextColor={Colors.gray400}
                value={postBudget}
                onChangeText={setPostBudget}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Location</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Remote or San Francisco, CA"
                placeholderTextColor={Colors.gray400}
                value={postLocation}
                onChangeText={setPostLocation}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Describe the job requirements..."
                placeholderTextColor={Colors.gray400}
                value={postDescription}
                onChangeText={setPostDescription}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, posting && { backgroundColor: Colors.gray400 }]}
              onPress={handlePostJob}
              disabled={posting}
            >
              {posting ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Post Job</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
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
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
  },
  headerTitle: {
    fontSize: FontSizes.xxxl,
    fontWeight: FontWeights.extraBold as any,
    color: Colors.gray900,
  },
  postJobButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 4,
  },
  postJobButtonText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    marginBottom: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.gray900,
  },
  categoriesScroll: {
    maxHeight: 50,
    backgroundColor: Colors.white,
    paddingVertical: Spacing.sm,
  },
  categoriesContainer: {
    paddingHorizontal: Spacing.lg,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
    marginRight: 4,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
  },
  categoryText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium as any,
    color: Colors.gray600,
  },
  categoryTextActive: {
    color: Colors.white,
  },
  jobList: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  jobCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    elevation: 1,
    shadowColor: Colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  jobCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  jobAvatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.md,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
    marginBottom: 2,
  },
  jobCompany: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  jobMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: Spacing.md,
  },
  jobMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  jobMetaText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobTypeBadge: {
    backgroundColor: Colors.primary + '12',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  jobTypeText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.primary,
  },
  applyButton: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  appliedButton: {
    backgroundColor: Colors.gray400,
  },
  applyButtonText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: Spacing.lg,
  },
  errorText: {
    fontSize: FontSizes.md,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.gray400,
    marginTop: Spacing.md,
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
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray700,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 50,
    fontSize: FontSizes.md,
    color: Colors.gray900,
    backgroundColor: Colors.gray50,
  },
  textArea: {
    height: 120,
    paddingTop: Spacing.md,
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalCategoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
  },
  modalCategoryChipActive: {
    backgroundColor: Colors.primary,
  },
  modalCategoryText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium as any,
    color: Colors.gray600,
  },
  modalCategoryTextActive: {
    color: Colors.white,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semiBold as any,
  },
});

