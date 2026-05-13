import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Phone, Video, MoreVertical, Send } from 'lucide-react-native';
import { Colors, FontWeights, Spacing, BorderRadius, FontSizes } from '@/constants/theme';
import { getMockChatById } from '@/lib/mockChats';

export default function ChatDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const chat = useMemo(() => getMockChatById(String(params.id ?? '')), [params.id]);

  if (!chat) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Chat not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.gray900} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Image source={{ uri: chat.avatar }} style={styles.headerAvatar} />
          <View>
            <Text style={styles.headerName}>{chat.name}</Text>
            <Text style={styles.headerMeta}>{chat.role}</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton}>
            <Phone size={18} color={Colors.gray900} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Video size={18} color={Colors.gray900} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <MoreVertical size={18} color={Colors.gray900} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.messages} showsVerticalScrollIndicator={false}>
        <View style={styles.dayChip}>
          <Text style={styles.dayChipText}>Today</Text>
        </View>

        {chat.messages.map((message) => (
          <View
            key={message.id}
            style={[styles.messageRow, message.fromMe ? styles.messageRowRight : styles.messageRowLeft]}
          >
            <View style={[styles.bubble, message.fromMe ? styles.myBubble : styles.theirBubble]}>
              <Text style={[styles.messageText, message.fromMe ? styles.myMessageText : styles.theirMessageText]}>
                {message.text}
              </Text>
              <Text style={[styles.messageTime, message.fromMe ? styles.myMessageTime : styles.theirMessageTime]}>
                {message.time}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.composer}>
        <TouchableOpacity style={styles.attachButton}>
          <Text style={styles.attachText}>+</Text>
        </TouchableOpacity>
        <TextInput
          placeholder="Write a message"
          placeholderTextColor={Colors.gray500}
          style={styles.input}
        />
        <TouchableOpacity style={styles.sendButton}>
          <Send size={18} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: Spacing.sm,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    marginRight: 10,
  },
  headerName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
  },
  headerMeta: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  messages: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    paddingBottom: 120,
  },
  dayChip: {
    alignSelf: 'center',
    backgroundColor: Colors.gray200,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
  },
  dayChipText: {
    color: Colors.gray700,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium as any,
  },
  messageRow: {
    marginBottom: Spacing.md,
    flexDirection: 'row',
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  theirBubble: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 6,
  },
  myBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 6,
  },
  messageText: {
    fontSize: FontSizes.md,
    lineHeight: 22,
  },
  theirMessageText: {
    color: Colors.gray900,
  },
  myMessageText: {
    color: Colors.white,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 6,
  },
  theirMessageTime: {
    color: Colors.gray500,
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.75)',
  },
  composer: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 28,
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowColor: Colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachText: {
    fontSize: 22,
    color: Colors.gray700,
    marginTop: -2,
  },
  input: {
    flex: 1,
    height: 44,
    marginHorizontal: 10,
    color: Colors.gray900,
    fontSize: FontSizes.md,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  backButtonText: {
    color: Colors.white,
    fontWeight: FontWeights.medium as any,
  },
});