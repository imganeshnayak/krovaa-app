import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import ChatListItem from '../../components/ChatListItem';
import { useAuth } from '@/context/AuthContext';
import { getConversations, type ChatConversation } from '@/lib/chatApi';
import { getConversationsListCache, setConversationsListCache, subscribeConversationsListCache } from '@/lib/chatCache';

type ChatThread = {
  id: string;
  userName: string;
  userHandle: string;
  profileImageUri: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
};

function formatConversationTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function ChatListScreen() {
  const { session } = useAuth();
  const [chats, setChats] = useState<ChatThread[]>([]);
  const router = useRouter();
  const currentUserId = session?.user.id;

  const mapConversationToThread = useCallback(
    (conversation: ChatConversation): ChatThread => {
      const otherParticipant =
        conversation.participants.find((participant) => participant.id !== currentUserId) ??
        conversation.participants[0];

      return {
        id: conversation.id,
        userName: otherParticipant?.fullName ?? 'Unknown',
        userHandle: otherParticipant?.username ? `@${otherParticipant.username}` : '',
        profileImageUri: otherParticipant?.avatar ?? '',
        lastMessage: conversation.lastMessage || 'No messages yet',
        timestamp: formatConversationTime(conversation.lastMessageAt),
        unreadCount: Number(conversation.unreadCount ?? 0),
      };
    },
    [currentUserId]
  );

  const hydrateFromConversations = useCallback(
    (conversations: ChatConversation[]) => {
      const sorted = [...conversations].sort(
        (a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
      );
      setChats(sorted.map(mapConversationToThread));
    },
    [mapConversationToThread]
  );

  const loadChats = useCallback(async () => {
    if (!session?.access_token) return;
    const { data, error } = await getConversations(session.access_token);
    if (error || !data) return;
    setConversationsListCache({ conversations: data.conversations });
    hydrateFromConversations(data.conversations);
  }, [hydrateFromConversations, session?.access_token]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useFocusEffect(
    useCallback(() => {
      loadChats();
    }, [loadChats])
  );

  useEffect(() => {
    const unsubscribe = subscribeConversationsListCache(() => {
      const cached = getConversationsListCache();
      if (cached?.conversations) {
        hydrateFromConversations(cached.conversations);
      }
    });

    return unsubscribe;
  }, [hydrateFromConversations]);

  const markChatAsReadHandler = (id: string) => {
    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat.id === id ? { ...chat, unreadCount: 0 } : chat
      )
    );

    const cached = getConversationsListCache();
    if (cached?.conversations?.length) {
      setConversationsListCache({
        conversations: cached.conversations.map((conversation) =>
          conversation.id === id ? { ...conversation, unreadCount: 0 } : conversation
        ),
      });
    }
  };

  const handleRowPress = (chat: ChatThread) => {
    markChatAsReadHandler(chat.id);

    router.push({
      pathname: '/chat/[id]',
      params: {
        id: chat.id,
        userName: chat.userName,
        profileImageUri: chat.profileImageUri,
        userHandle: chat.userHandle,
      },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <ChatListItem item={item} onRowPress={handleRowPress} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60, 
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0F172A',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
});
