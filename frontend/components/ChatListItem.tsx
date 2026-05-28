import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface ChatListItemProps {
  item: {
    id: string;
    userName: string;
    userHandle: string;
    profileImageUri: string;
    lastMessage: string;
    timestamp: string;
    unreadCount: number;
  };
  onRowPress: (item: {
    id: string;
    userName: string;
    userHandle: string;
    profileImageUri: string;
    lastMessage: string;
    timestamp: string;
    unreadCount: number;
  }) => void;
}

export default function ChatListItem({ item, onRowPress }: ChatListItemProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);

  return (
    <View style={styles.rowContainer}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setIsModalVisible(true)}
        style={styles.avatarWrapper}
      >
        <Image source={{ uri: item.profileImageUri }} style={styles.avatar} />
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onRowPress(item)}
        style={styles.contentWrapper}
      >
        <View style={styles.textRow}>
          <Text style={styles.nameText} numberOfLines={1}>{item.userName}</Text>
          <Text style={styles.timeText}>{item.timestamp}</Text>
        </View>

        <View style={styles.textRow}>
          <Text style={styles.messageText} numberOfLines={1}>{item.lastMessage}</Text>

          {item.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>

        <Text style={styles.handleText}>{item.userHandle}</Text>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackground}
          activeOpacity={1}
          onPress={() => setIsModalVisible(false)}
        >
          <Text style={styles.closeText}>Tap anywhere to close</Text>
          <Image
            source={{ uri: item.profileImageUri }}
            style={styles.fullScreenImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  avatarWrapper: {
    paddingRight: 15,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#CBD5E1',
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  textRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  timeText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  messageText: {
    fontSize: 14,
    color: '#64748B',
    flex: 1,
    marginRight: 10,
  },
  handleText: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 1,
  },
  badge: {
    backgroundColor: '#0091FF',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
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
