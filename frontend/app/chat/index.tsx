import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { /*useFocusEffect*/ } from '@react-navigation/native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { io } from 'socket.io-client';
import { Archive, MessageCircle } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getConversations, getConversationMessages, type ChatConversation } from '@/lib/chatApi';
import { getConversationsListCache, setConversationsListCache, getConversationCache, setConversationCache, subscribeConversationsListCache } from '@/lib/chatCache';
import { API_BASE_URL } from '@/lib/apiBaseUrl';

export default function ChatListScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [archivedConversationIds, setArchivedConversationIds] = useState<string[]>([]);

  const currentUserId = session?.user.id;
  const panRefs = useRef<Record<string, Animated.Value>>({});

  const ensurePanValue = (id: string) => {
    if (!panRefs.current[id]) {
      panRefs.current[id] = new Animated.Value(0);
    }

    return panRefs.current[id];
  };

  // Do not refetch the full conversations list on every focus — use cache and socket updates instead
  const refreshConversations = useCallback(async () => {
    if (!session?.access_token) return;
    const result = await getConversations(session.access_token);
    if (result?.data?.conversations) {
      setConversations(result.data.conversations);
      try { setConversationsListCache({ conversations: result.data.conversations }); } catch {}
    }
  }, [session?.access_token]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!session?.access_token) return;
      const cachedList = getConversationsListCache();
      if (cachedList?.conversations) {
        setConversations(cachedList.conversations);
        setLoading(false);
      }

      // Always refresh in background to get authoritative counts, but do not block UI
      try {
        const result = await getConversations(session.access_token);
        if (!mounted) return;
        if (result?.data?.conversations) {
          setConversations(result.data.conversations);
          try { setConversationsListCache({ conversations: result.data.conversations }); } catch {}
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();

    const unsubscribeConversationsList = subscribeConversationsListCache(() => {
      const cachedList = getConversationsListCache();
      if (cachedList?.conversations) {
        setConversations(cachedList.conversations);
      }
    });

    let socket: any = null;
    if (session?.access_token) {
      socket = io(API_BASE_URL, { transports: ['websocket'], auth: { token: session.access_token } });

      socket.on('message', async (message: any) => {
        // quick local update
        const senderId = message?.sender?.id ?? message?.sender?._id ?? message?.sender;
        if (String(senderId) === String(currentUserId)) {
          return;
        }

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === message.conversation) {
              return { ...c, unreadCount: (c.unreadCount ?? 0) + 1, lastMessage: message.text ?? '', lastMessageAt: message.createdAt };
            }
            return c;
          })
        );
      });

      // Avoid full list refetches on socket events; update local state for changes
      // We keep the 'message' event to update lastMessage/unread locally.

      socket.on('connect', () => {
        // no-op
      });
    }

    return () => {
      mounted = false;
      unsubscribeConversationsList();
      if (socket) socket.disconnect();
    };
  }, [session?.access_token]);

  const visibleConversations = conversations.filter((conversation) => !archivedConversationIds.includes(conversation.id));

  const markConversationUnread = (conversationId: string) => {
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, unreadCount: Math.max(conversation.unreadCount ?? 0, 1) }
          : conversation
      )
    );
  };

  const archiveConversation = (conversationId: string) => {
    setArchivedConversationIds((previous) => (previous.includes(conversationId) ? previous : [...previous, conversationId]));
  };

  // Prefetch messages for faster opening (non-blocking)
  const prefetchMessages = useCallback(
    async (id: string) => {
      if (!session?.access_token || !id) return;
      try {
        const existing = getConversationCache(id);
        if (existing && existing.lastFetched && Date.now() - existing.lastFetched < 60 * 1000) return;
        const res = await getConversationMessages(session.access_token, id);
        if (res?.data?.messages) {
          setConversationCache(id, { messages: res.data.messages });
        }
      } catch {}
    },
    [session?.access_token]
  );

  const renderItem = ({ item }: { item: ChatConversation }) => {
    const participant = item.participants.find((candidate) => candidate.id !== currentUserId) ?? item.participants[0];
    const translateX = ensurePanValue(item.id);
    const onGestureEvent = Animated.event([{ nativeEvent: { translationX: translateX } }], { useNativeDriver: true });

    const onHandlerStateChange = ({ nativeEvent }: any) => {
      if (nativeEvent.state !== State.END && nativeEvent.oldState !== State.ACTIVE) {
        return;
      }

      const dx = nativeEvent.translationX ?? 0;
      if (dx > 70) {
        markConversationUnread(item.id);
      } else if (dx < -70) {
        archiveConversation(item.id);
      }

      Animated.timing(translateX, { toValue: 0, duration: 85, useNativeDriver: true }).start();
    };

    const isUnread = (item.unreadCount ?? 0) > 0;
    return (
      <PanGestureHandler onGestureEvent={onGestureEvent} onHandlerStateChange={onHandlerStateChange} activeOffsetX={[-10, 10]}>
        <Animated.View style={[styles.rowWrap, { transform: [{ translateX }] }]}>
          <TouchableOpacity
            style={[styles.row, isUnread ? styles.unreadCard : null]}
            activeOpacity={0.7}
            onPress={() => {
              router.prefetch(`/chat/${item.id}`);
              prefetchMessages(item.id);
              router.push(`/chat/${item.id}`);
            }}
          >
            <View style={styles.avatarWrap}>
              <Image source={{ uri: participant?.avatar }} style={styles.avatar} />
              <View style={styles.onlineDot} />
            </View>
            <View style={styles.meta}>
              <Text style={styles.name} numberOfLines={1}>{participant?.fullName}</Text>
              <Text style={[styles.preview, isUnread ? styles.previewUnread : null]} numberOfLines={1}>{item.lastMessage || 'No messages yet'}</Text>
              {participant?.username ? <Text style={styles.username}>@{participant.username}</Text> : null}
            </View>

            <View style={styles.rightMeta}>
              <Text style={styles.time}>{item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}</Text>
              {isUnread ? (
                <View style={styles.unreadBadgeContainer}>
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unreadCount! > 99 ? '99+' : String(item.unreadCount)}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.archiveChip}>
                  <Archive size={14} color={Colors.gray400} />
                </View>
              )}
            </View>
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MessageCircle size={24} color={Colors.primary} />
          <Text style={styles.headerTitle}>Chats</Text>
        </View>
        <Text style={styles.headerCount}>{visibleConversations.length}</Text>
      </View>
      <FlatList
        data={visibleConversations}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingTop: Spacing.sm, paddingBottom: Spacing.xl }}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews={true}
        getItemLayout={(_data, index) => ({
          length: 90,
          offset: 90 * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F9FD' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray900,
  },
  headerCount: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    fontWeight: FontWeights.medium as any,
    backgroundColor: Colors.gray100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  rowWrap: { marginHorizontal: 12, marginVertical: 5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  unreadCard: { backgroundColor: 'rgba(14, 165, 233, 0.03)' },
  avatarWrap: { position: 'relative', marginRight: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  onlineDot: { position: 'absolute', right: 1, bottom: 1, width: 12, height: 12, borderRadius: 6, backgroundColor: '#0ea5e9', borderWidth: 2.5, borderColor: Colors.white },
  meta: { flex: 1 },
  name: { fontSize: FontSizes.md, fontWeight: FontWeights.semiBold as any, color: Colors.gray900 },
  preview: { marginTop: 4, color: Colors.gray600 },
  previewUnread: { color: Colors.gray900, fontWeight: FontWeights.semiBold as any },
  username: { marginTop: 2, fontSize: FontSizes.xs, color: Colors.gray500 },
  rightMeta: { alignItems: 'flex-end', justifyContent: 'center' },
  time: { color: Colors.gray500, fontSize: FontSizes.xs },
  unreadBadgeContainer: { marginTop: 8, alignItems: 'flex-end' },
  unreadBadge: { minWidth: 24, height: 24, paddingHorizontal: 6, borderRadius: 12, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: Colors.white, fontWeight: '800', fontSize: 12 },
  archiveChip: { marginTop: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.04)', alignItems: 'center', justifyContent: 'center' },
});
