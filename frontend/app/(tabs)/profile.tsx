import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { Star, MapPin, Edit3, ChevronRight, Shield, Award, Briefcase, X, Video as VideoIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { ResizeMode, Video } from 'expo-av';
import { useAuth } from '@/context/AuthContext';
import { Colors, FontWeights, Spacing, BorderRadius, FontSizes } from '@/constants/theme';
import { getCurrentUserProfile, UserProfile, updateUserProfile, uploadProfilePhoto } from '@/lib/profileApi';
import { createMyPost, deleteMyPost, getMyPosts, MyPost, updateMyPostCaption } from '@/lib/postsApi';
import { Button } from '@/components/Button';

const MENU_ITEMS = [
  { icon: Shield, label: 'Verification', color: Colors.primary },
  { icon: Award, label: 'Badges & Achievements', color: Colors.accent },
  { icon: Briefcase, label: 'My Portfolio', color: Colors.secondary },
  { icon: Star, label: 'Reviews & Ratings', color: '#F59E0B' },
];

const PROFESSION_OPTIONS = ['tech', 'creative', 'engineering', 'professional', 'freelancer', 'student', 'none', 'other'] as const;
const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'] as const;
type ProfessionOption = (typeof PROFESSION_OPTIONS)[number];

function normalizeProfession(value: string): ProfessionOption {
  const normalized = value.trim().toLowerCase() as ProfessionOption;
  return (PROFESSION_OPTIONS as readonly string[]).includes(normalized) ? normalized : 'none';
}

function formatProfessionLabel(value: ProfessionOption) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function ProfileScreen() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
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
    profession: 'none' as ProfessionOption,
    skillsText: '',
    bio: '',
    avatar: '',
  });

  useEffect(() => {
    let isMounted = true;

    async function fetchProfile() {
      if (!session?.access_token) {
        setError('No authentication token available');
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

  useEffect(() => {
    let isMounted = true;

    async function fetchPosts() {
      if (!session?.access_token) {
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

  const handleOpenEditModal = () => {
    if (profile) {
      setEditForm({
        fullName: profile.fullName,
        city: profile.city || profile.location || '',
        pincode: profile.pincode || '',
        phoneNumber: profile.phoneNumber || '',
        age: profile.age !== null && profile.age !== undefined ? String(profile.age) : '',
        gender: profile.gender || '',
        profession: normalizeProfession(profile.profession || 'none'),
        skillsText: profile.skills.join(', '),
        bio: profile.bio,
        avatar: profile.avatar,
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

  const handlePickImage = async () => {
    if (!session?.access_token) {
      setEditError('No authentication token available.');
      return;
    }

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
      setPhotoUploading(true);
      setEditError(null);

      try {
        const { data, error: uploadError } = await uploadProfilePhoto(session.access_token, result.assets[0].uri);
        if (uploadError) {
          setEditError(uploadError);
          return;
        }

        if (data?.user?.avatar) {
          setEditForm((prev) => ({ ...prev, avatar: data.user.avatar }));
          setProfile((prev) => (prev ? { ...prev, avatar: data.user.avatar } : prev));
        }
      } catch {
        setEditError('Failed to upload profile photo.');
      } finally {
        setPhotoUploading(false);
      }
    }
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
        profession: editForm.profession,
        skills,
        bio: editForm.bio.trim(),
        avatar: editForm.avatar,
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
      </View>
    );
  }

  const STATS = [
    { label: 'Jobs Done', value: profile.stats.jobsDone.toString() },
    { label: 'Reviews', value: profile.stats.reviews.toFixed(1) },
    { label: 'Earned', value: `$${(profile.stats.earned / 1000).toFixed(1)}K` },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerBg}>
        <View style={styles.profileSection}>
          {/* Profile Picture with Edit Button */}
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: profile.avatar }}
              style={styles.avatar}
            />
            <TouchableOpacity style={styles.avatarEditButton} activeOpacity={0.7} onPress={handleOpenEditModal}>
              <Edit3 size={14} color={Colors.white} />
            </TouchableOpacity>
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
          {profile.userCode && (
            <View style={styles.userCodeBadge}>
              <Text style={styles.userCodeLabel}>Your Code</Text>
              <Text style={styles.userCodeText}>{profile.userCode}</Text>
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
            {posts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.postCard}
                activeOpacity={0.95}
                onLongPress={() => handlePostOptions(post)}
              >
                {post.mediaType === 'image' ? (
                  <Image source={{ uri: post.mediaUrl }} style={styles.postImage} />
                ) : (
                  <Video
                    source={{ uri: post.mediaUrl }}
                    style={styles.postVideoPlayer}
                    resizeMode={ResizeMode.COVER}
                    useNativeControls
                    isLooping
                  />
                )}
                {!!post.caption && <Text style={styles.postCaption} numberOfLines={2}>{post.caption}</Text>}
                <Text style={styles.postDateText}>{new Date(post.createdAt).toLocaleDateString()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.menuSection}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity key={item.label} style={styles.menuItem}>
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={handleCloseEditModal} activeOpacity={0.7}>
                <X size={24} color={Colors.gray800} />
              </TouchableOpacity>
            </View>

            {editError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{editError}</Text>
              </View>
            )}

            <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
              <View style={styles.photoSection}>
                <Image source={{ uri: editForm.avatar || profile.avatar }} style={styles.modalAvatar} />
                <Button title="Upload Photo" onPress={handlePickImage} loading={photoUploading} />
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
                <View style={styles.optionWrap}>
                  {PROFESSION_OPTIONS.map((option) => {
                    const selected = editForm.profession === option;
                    return (
                      <TouchableOpacity
                        key={option}
                        style={[styles.optionChip, selected && styles.optionChipSelected]}
                        onPress={() => setEditForm({ ...editForm, profession: option })}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.optionChipText, selected && styles.optionChipTextSelected]}>
                          {formatProfessionLabel(option)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
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

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.formButton, styles.cancelButton]}
                  onPress={handleCloseEditModal}
                  disabled={editLoading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Button
                  title="Save Changes"
                  onPress={handleSaveProfile}
                  loading={editLoading}
                />
              </View>
            </ScrollView>
          </View>
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
  headerBg: {
    backgroundColor: Colors.white,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  profileSection: {
    alignItems: 'center',
    paddingTop: 60,
  },
  avatarContainer: {
    position: 'relative',
    padding: 4, // Space for the border
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: BorderRadius.full,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
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
    shadowRadius: 2,
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
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  postCard: {
    width: '47%',
  },
  postImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
  },
  postVideoPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray800,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  postVideoPlayer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.black,
  },
  postVideoText: {
    color: Colors.white,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium as any,
  },
  postCaption: {
    marginTop: 6,
    color: Colors.gray800,
    fontSize: FontSizes.xs,
  },
  postDateText: {
    marginTop: 4,
    color: Colors.gray500,
    fontSize: FontSizes.xs,
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
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    maxHeight: '90%',
  },
  postModalImagePreview: {
    width: '100%',
    height: 180,
    borderRadius: BorderRadius.md,
  },
  postModalVideoPreview: {
    width: '100%',
    height: 140,
    borderRadius: BorderRadius.md,
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
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray900,
  },
  formContent: {
    marginBottom: Spacing.lg,
  },
  formGroup: {
    marginBottom: Spacing.lg,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  modalAvatar: {
    width: 84,
    height: 84,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  formLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray700,
    marginBottom: Spacing.sm,
  },
  formInput: {
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.gray900,
    backgroundColor: Colors.white,
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
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: Colors.white,
  },
  optionChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '14',
  },
  optionChipText: {
    color: Colors.gray700,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium as any,
  },
  optionChipTextSelected: {
    color: Colors.primary,
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
    marginBottom: Spacing.xl,
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
});