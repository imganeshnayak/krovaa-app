import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, MoreVertical } from 'lucide-react-native';

interface ChatHeaderProps {
  userName: string;
  userHandle?: string;
  profileImageUri?: string;
  isTyping?: boolean;
  onMenuPress?: () => void;
  userId?: string | null;
}

const { width, height } = Dimensions.get('window');

export default function ChatHeader({
  userName = 'Conversation',
  userHandle,
  profileImageUri,
  isTyping = false,
  onMenuPress,
  userId = null,
}: ChatHeaderProps) {
  const insets = useSafeAreaInsets();
  const [isModalVisible, setIsModalVisible] = useState(false);

  return (
    <View style={[styles.headerContainer, { paddingTop: insets.top > 0 ? insets.top + 6 : 12 }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
        <ArrowLeft size={24} color="#1E293B" />
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          if (userId) {
            router.push({ pathname: '/profile/[id]', params: { id: String(userId), fromChat: 'true' } });
          } else {
            router.push('/(tabs)/profile');
          }
        }}
        style={styles.middleSection}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setIsModalVisible(true)}
          style={styles.avatarWrapper}
        >
          {profileImageUri ? (
            <Image source={{ uri: profileImageUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarPlaceholderText}>{userName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.textWrapper}>
          <Text style={styles.nameText} numberOfLines={1}>{userName}</Text>
          {isTyping ? (
            <Text style={styles.typingText}>typing...</Text>
          ) : userHandle ? (
            <Text style={styles.handleText} numberOfLines={1}>{userHandle}</Text>
          ) : null}
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
        <MoreVertical size={20} color="#1E293B" />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackground}
          activeOpacity={1}
          onPress={() => setIsModalVisible(false)}
        >
          <Text style={styles.closeText}>Tap anywhere to close</Text>
          {profileImageUri ? (
            <Image
              source={{ uri: profileImageUri }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          ) : null}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconButton: {
    padding: 4,
    marginRight: 4,
  },
  middleSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  avatarWrapper: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#CBD5E1',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
  },
  textWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  nameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 20,
  },
  handleText: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 1,
  },
  typingText: {
    fontSize: 13,
    color: '#0EA5E9',
    fontStyle: 'italic',
    marginTop: 1,
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#94A3B8',
    fontSize: 14,
    position: 'absolute',
    top: 60,
  },
  fullScreenImage: {
    width: width * 0.9,
    height: height * 0.6,
  },
});
