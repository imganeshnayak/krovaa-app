import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, FlatList, TextInput, ScrollView
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MessageSquare, Search, Star, CheckCircle2, Clock } from 'lucide-react-native';
import { Colors, FontWeights, Spacing, BorderRadius, FontSizes } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getJobApplicants, getJobApplicantStats, type JobApplicant } from '@/lib/jobsApi';
import { createConversationWithUserId } from '@/lib/chatApi';

type ApplicantWithStatus = JobApplicant & {
  rating?: number;
  reviewCount?: number;
  status?: string;
  viewedAt?: string;
  shortlistedAt?: string;
};

type DashboardStats = {
  total: number;
  viewed: number;
  shortlisted: number;
  accepted: number;
  rejected: number;
  pending: number;
  conversionRate: string;
};

export default function JobApplicantsScreen() {
  const router = useRouter();
  const { id: jobId } = useLocalSearchParams();
  const { session } = useAuth();

  const [applicants, setApplicants] = useState<ApplicantWithStatus[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messagingApplicantId, setMessagingApplicantId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [selectedApplicants, setSelectedApplicants] = useState<Set<string>>(new Set());

  const fetchApplicants = async () => {
    if (!session?.access_token || !jobId) return;

    setLoading(true);
    setError(null);

    try {
      const jobIdStr = Array.isArray(jobId) ? jobId[0] : jobId;

      // Fetch applicants
      const { data: applicantsData, error: fetchError } = await getJobApplicants(
        session.access_token,
        jobIdStr
      );

      if (fetchError) {
        setError(fetchError);
      } else if (applicantsData) {
        setApplicants(applicantsData);
      }

      // Fetch stats
      const { data: statsData, error: statsError } = await getJobApplicantStats(
        session.access_token,
        jobIdStr
      );

      if (!statsError && statsData) {
        setStats(statsData);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicants();
  }, [jobId, session?.access_token]);

  const handleMessageApplicant = async (applicant: ApplicantWithStatus) => {
    if (!session?.access_token) return;

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
      console.error('Error messaging applicant:', err);
    } finally {
      setMessagingApplicantId(null);
    }
  };

  const handleToggleApplicant = (applicantId: string) => {
    const newSelected = new Set(selectedApplicants);
    if (newSelected.has(applicantId)) {
      newSelected.delete(applicantId);
    } else {
      newSelected.add(applicantId);
    }
    setSelectedApplicants(newSelected);
  };

  const filteredApplicants = applicants
    .filter(app => {
      const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           app.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (app.profession?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
      const matchesFilter = filterStatus === 'all' || (app.status === filterStatus);
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
      if (sortBy === 'oldest') return new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime();
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      return 0;
    });

  const renderStatCard = (label: string, value: number, bgColor: string) => (
    <View style={[styles.statCard, { borderLeftColor: bgColor }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: bgColor }]}>{value}</Text>
    </View>
  );

  const renderApplicantCard = ({ item }: { item: ApplicantWithStatus }) => {
    const isSelected = selectedApplicants.has(item.id);
    const statusColor = {
      pending: Colors.primary,
      viewed: Colors.gray500,
      shortlisted: Colors.secondary,
      accepted: Colors.secondary,
      rejected: Colors.error,
    }[item.status || 'pending'] || Colors.primary;

    return (
      <TouchableOpacity
        style={[styles.applicantCard, isSelected && styles.applicantCardSelected]}
        onLongPress={() => handleToggleApplicant(item.id)}
      >
        <View style={styles.applicantCardHeader}>
          {selectedApplicants.size > 0 && (
            <TouchableOpacity
              style={[styles.checkbox, isSelected && styles.checkboxSelected]}
              onPress={() => handleToggleApplicant(item.id)}
            >
              {isSelected && <CheckCircle2 size={20} color={Colors.white} />}
            </TouchableOpacity>
          )}
          <Image source={{ uri: item.avatar }} style={styles.applicantAvatar} />
          <View style={styles.applicantInfo}>
            <Text style={styles.applicantName}>{item.name}</Text>
            <Text style={styles.applicantUsername}>@{item.username}</Text>
            {item.profession && item.profession !== 'none' && (
              <Text style={styles.applicantProfession}>{item.profession}</Text>
            )}
          </View>
        </View>

        {item.bio && (
          <Text style={styles.applicantBio} numberOfLines={2}>
            {item.bio}
          </Text>
        )}

        <View style={styles.applicantMeta}>
          {item.rating ? (
            <View style={styles.ratingBadge}>
              <Star size={12} color={Colors.secondary} fill={Colors.secondary} />
              <Text style={styles.ratingText}>{item.rating}</Text>
              {item.reviewCount && item.reviewCount > 0 && (
                <Text style={styles.reviewCount}>({item.reviewCount})</Text>
              )}
            </View>
          ) : null}
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Pending'}
            </Text>
          </View>
        </View>

        <View style={styles.appliedInfo}>
          <Clock size={12} color={Colors.gray400} />
          <Text style={styles.appliedDate}>
            Applied {new Date(item.appliedAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
            })}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.messageButton, messagingApplicantId === item.id && { opacity: 0.6 }]}
          onPress={() => handleMessageApplicant(item)}
          disabled={messagingApplicantId === item.id}
        >
          {messagingApplicantId === item.id ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <MessageSquare size={14} color={Colors.white} />
              <Text style={styles.messageButtonText}>Message</Text>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={Colors.gray900} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Applicants</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={[styles.centerContent, { flex: 1 }]}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.gray900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Applicants {applicants.length > 0 && `(${applicants.length})`}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        ListHeaderComponent={
          <>
            {/* Stats Section */}
            {stats && (
              <View style={styles.statsContainer}>
                <View style={styles.statsRow}>
                  {renderStatCard('Total', stats.total, Colors.primary)}
                  {renderStatCard('Viewed', stats.viewed, Colors.gray500)}
                  {renderStatCard('Shortlisted', stats.shortlisted, Colors.secondary)}
                </View>
              </View>
            )}

            {/* Search and Filters */}
            <View style={styles.controlsContainer}>
              <View style={styles.searchBar}>
                <Search size={16} color={Colors.gray500} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search applicants..."
                  placeholderTextColor={Colors.gray400}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filtersScroll}
                contentContainerStyle={styles.filtersContainer}
              >
                {['all', 'pending', 'viewed', 'shortlisted'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterChip,
                      filterStatus === status && styles.filterChipActive,
                    ]}
                    onPress={() => setFilterStatus(status)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        filterStatus === status && styles.filterChipTextActive,
                      ]}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.sortScroll}
                contentContainerStyle={styles.sortContainer}
              >
                <Text style={styles.sortLabel}>Sort by:</Text>
                {['recent', 'oldest', 'rating'].map((sort) => (
                  <TouchableOpacity
                    key={sort}
                    style={[
                      styles.sortChip,
                      sortBy === sort && styles.sortChipActive,
                    ]}
                    onPress={() => setSortBy(sort)}
                  >
                    <Text
                      style={[
                        styles.sortChipText,
                        sortBy === sort && styles.sortChipTextActive,
                      ]}
                    >
                      {sort.charAt(0).toUpperCase() + sort.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchApplicants}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        }
        data={filteredApplicants}
        renderItem={renderApplicantCard}
        keyExtractor={(item) => item.applicationId}
        contentContainerStyle={styles.applicantsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !error ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📭</Text>
              <Text style={styles.emptyStateTitle}>
                {searchQuery ? 'No matches found' : 'No applicants yet'}
              </Text>
              <Text style={styles.emptyStateText}>
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'Share your job post to receive applications'}
              </Text>
            </View>
          ) : null
        }
      />
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    backgroundColor: Colors.white,
    elevation: 1,
    shadowColor: Colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray500,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold as any,
  },
  controlsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: FontSizes.sm,
    color: Colors.gray900,
  },
  filtersScroll: {
    maxHeight: 40,
  },
  filtersContainer: {
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium as any,
    color: Colors.gray600,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  sortScroll: {
    maxHeight: 40,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sortLabel: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray500,
    marginRight: Spacing.sm,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  sortChipActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  sortChipText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium as any,
    color: Colors.gray600,
  },
  sortChipTextActive: {
    color: Colors.white,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  errorText: {
    fontSize: FontSizes.sm,
    color: Colors.error,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyStateTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    textAlign: 'center',
  },
  applicantsList: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  applicantCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    elevation: 1,
    shadowColor: Colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    borderWidth: 2,
    borderColor: 'transparent',
  },
  applicantCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  applicantCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  applicantAvatar: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
  },
  applicantInfo: {
    flex: 1,
  },
  applicantName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
    marginBottom: 2,
  },
  applicantUsername: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginBottom: 4,
  },
  applicantProfession: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: FontWeights.semiBold as any,
    backgroundColor: Colors.primary + '12',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  applicantBio: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  applicantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.secondary + '12',
    borderRadius: BorderRadius.full,
  },
  ratingText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.secondary,
  },
  reviewCount: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semiBold as any,
  },
  appliedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.md,
  },
  appliedDate: {
    fontSize: FontSizes.xs,
    color: Colors.gray400,
  },
  messageButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    gap: 6,
  },
  messageButtonText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
  },
});
