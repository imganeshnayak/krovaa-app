import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, FlatList, Image
} from 'react-native';
import { Search, Plus, MapPin, Clock, DollarSign, Briefcase, ListFilter as Filter, X, ChevronDown } from 'lucide-react-native';
import { Colors, FontWeights, Spacing, BorderRadius, FontSizes } from '@/constants/theme';

const JOB_CATEGORIES = ['All', 'Design', 'Development', 'Marketing', 'Writing', 'Video'];

const MOCK_JOBS = [
  { id: '1', title: 'Mobile App UI Design', company: 'TechCorp', budget: '$500 - $1,000', location: 'Remote', type: 'Design', posted: '2h ago', avatar: 'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=100' },
  { id: '2', title: 'React Native Developer', company: 'StartupXYZ', budget: '$2,000 - $3,500', location: 'San Francisco, CA', type: 'Development', posted: '5h ago', avatar: 'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?auto=compress&cs=tinysrgb&w=100' },
  { id: '3', title: 'Social Media Campaign', company: 'BrandCo', budget: '$300 - $600', location: 'Remote', type: 'Marketing', posted: '1d ago', avatar: 'https://images.pexels.com/photos/3183171/pexels-photo-3183171.jpeg?auto=compress&cs=tinysrgb&w=100' },
  { id: '4', title: 'Blog Content Writer', company: 'MediaGroup', budget: '$150 - $400', location: 'Remote', type: 'Writing', posted: '1d ago', avatar: 'https://images.pexels.com/photos/3183185/pexels-photo-3183185.jpeg?auto=compress&cs=tinysrgb&w=100' },
  { id: '5', title: 'Product Explainer Video', company: 'VidStudio', budget: '$800 - $1,500', location: 'Los Angeles, CA', type: 'Video', posted: '2d ago', avatar: 'https://images.pexels.com/photos/3183165/pexels-photo-3183165.jpeg?auto=compress&cs=tinysrgb&w=100' },
  { id: '6', title: 'E-commerce Website Build', company: 'ShopEasy', budget: '$3,000 - $5,000', location: 'New York, NY', type: 'Development', posted: '3d ago', avatar: 'https://images.pexels.com/photos/3183136/pexels-photo-3183136.jpeg?auto=compress&cs=tinysrgb&w=100' },
];

export default function JobsScreen() {
  const [activeTab, setActiveTab] = useState<'search' | 'post'>('search');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPostModal, setShowPostModal] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postBudget, setPostBudget] = useState('');
  const [postDescription, setPostDescription] = useState('');
  const [postCategory, setPostCategory] = useState('Development');
  const [postLocation, setPostLocation] = useState('');

  const filteredJobs = MOCK_JOBS.filter((job) => {
    const matchesCategory = selectedCategory === 'All' || job.type === selectedCategory;
    const matchesSearch = !searchQuery || job.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const renderJobCard = ({ item }: { item: typeof MOCK_JOBS[0] }) => (
    <TouchableOpacity style={styles.jobCard} activeOpacity={0.7}>
      <View style={styles.jobCardHeader}>
        <Image source={{ uri: item.avatar }} style={styles.jobAvatar} />
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>{item.title}</Text>
          <Text style={styles.jobCompany}>{item.company}</Text>
        </View>
      </View>
      <View style={styles.jobMeta}>
        <View style={styles.jobMetaItem}>
          <DollarSign size={14} color={Colors.secondary} />
          <Text style={styles.jobMetaText}>{item.budget}</Text>
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
        <TouchableOpacity style={styles.applyButton}>
          <Text style={styles.applyButtonText}>Apply Now</Text>
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll} contentContainerStyle={styles.categoriesContainer}>
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

      <FlatList
        data={filteredJobs}
        renderItem={renderJobCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.jobList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Briefcase size={48} color={Colors.gray300} />
            <Text style={styles.emptyText}>No jobs found</Text>
          </View>
        }
      />

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
                placeholder="e.g. $500 - $1,000"
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
              style={styles.submitButton}
              onPress={() => setShowPostModal(false)}
            >
              <Text style={styles.submitButtonText}>Post Job</Text>
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
  applyButtonText: {
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
