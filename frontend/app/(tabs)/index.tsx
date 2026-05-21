import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Search, ArrowLeft, MessageSquare, User, Clock } from 'lucide-react-native';
import { io, type Socket } from 'socket.io-client';
import { Colors, FontWeights, Spacing, BorderRadius, FontSizes } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  createConversationWithUserId,
  getConversations,
  searchChatsAndMessages,
  type ChatConversation,
  type ChatMessage,
} from '@/lib/chatApi';
import { getUserProfileByUsername, type UserProfile } from '@/lib/profileApi';
import { API_BASE_URL } from '@/lib/apiBaseUrl';

function formatConversationTime(value?: string) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function ChatScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedChats, setSearchedChats] = useState<ChatConversation[]>([]);
  const [searchedMessages, setSearchedMessages] = useState<any[]>([]);
  const currentUserId = session?.user.id;

  const refreshConversations = useCallback(async () => {
    if (!session?.access_token) {
      return;
    }

    const { data, error: fetchError } = await getConversations(session.access_token);
    if (fetchError || !data) {
      return;
    }

    setConversations(data.conversations);
  }, [session?.access_token]);

  useFocusEffect(
    useCallback(() => {
      refreshConversations();
    }, [refreshConversations])
  );

  useEffect(() => {
    let mounted = true;

    async function loadConversations() {
      if (!session?.access_token) {
        if (mounted) {
          setLoading(false);
          setError('No authentication token available.');
        }
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await getConversations(session.access_token);
      if (!mounted) {
        return;
      }

      if (fetchError || !data) {
        setConversations([]);
        setError(fetchError || 'Unable to load conversations.');
      } else {
        setConversations(data.conversations);
      }

      setLoading(false);
    }

    loadConversations();

    return () => {
      mounted = false;
    };
  }, [session?.access_token]);

  // Real-time conversation updates via Socket.IO
  useEffect(() => {
    if (!session?.access_token) {
      return;
    }

    const socket = io(API_BASE_URL, {
      transports: ['websocket'],
      auth: {
        token: session.access_token,
      },
    });

    socketRef.current = socket;

    socket.on('conversationUpdate', () => {
      refreshConversations();
    });

    socket.on('conversationRead', () => {
      refreshConversations();
    });

    socket.on('messageDeleted', () => {
      refreshConversations();
    });

    socket.on('message', (message: any) => {
      const senderId = message?.sender?.id ?? message?.sender?._id ?? message?.sender;
      if (String(senderId) === String(currentUserId)) {
        refreshConversations();
        return;
      }

      setConversations((prevConversations) =>
        prevConversations
          .map((convo) =>
            convo.id === message.conversation
              ? {
                  ...convo,
                  unreadCount: (convo.unreadCount ?? 0) + 1,
                  lastMessage: message.text ?? convo.lastMessage,
                  lastMessageAt: message.createdAt ?? convo.lastMessageAt,
                }
              : convo
          )
          .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUserId, refreshConversations, session?.access_token]);

  // Debounced search query for chats and messages
  useEffect(() => {
    if (!session?.access_token) {
      return;
    }

    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      setSearchedChats([]);
      setSearchedMessages([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError(null);
      try {
        const { data, error } = await searchChatsAndMessages(session.access_token, trimmedQuery);
        if (error) {
          setSearchError(error);
        } else if (data) {
          setSearchedChats(data.conversations);
          setSearchedMessages(data.messages);
        }
      } catch (err) {
        setSearchError('Search failed. Please try again.');
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, session?.access_token]);

  const normalizedSearchUsername = searchUsername.trim().toLowerCase();

  const listData = useMemo(() => conversations, [conversations]);

  const openSearch = () => {
    setSearchVisible(true);
    setSearchError(null);
    setSearchResult(null);
    setSearchUsername('');
    setSearchQuery('');
    setSearchedChats([]);
    setSearchedMessages([]);
  };

  const closeSearch = () => {
    setSearchVisible(false);
    setSearchError(null);
    setSearchResult(null);
    setSearchUsername('');
    setSearchQuery('');
    setSearchedChats([]);
    setSearchedMessages([]);
  };

  const handleSearchByUsername = async (targetUsername?: string) => {
    if (!session?.access_token) {
      setSearchError('No authentication token available.');
      return;
    }

    const username = (targetUsername || normalizedSearchUsername).trim().toLowerCase();

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      setSearchError('Enter a valid username (3-20 characters, letters, numbers, or underscores).');
      return;
    }

    setSearchLoading(true);
    setSearchError(null);
    setSearchResult(null);

    try {
      const { data, error: fetchError } = await getUserProfileByUsername(username);
      if (fetchError || !data?.user) {
        setSearchError(fetchError || 'User not found.');
        return;
      }

      if (data.user.id === currentUserId) {
        setSearchError('You cannot start a chat with yourself.');
        return;
      }

      setSearchResult(data.user);
    } catch {
      setSearchError('Unable to search profiles right now.');
    } finally {
      setSearchLoading(false);
    }
  };

  const startChat = async () => {
    if (!session?.access_token || !searchResult) {
      return;
    }

    setSearchLoading(true);
    setSearchError(null);

    try {
      const { data, error: createError } = await createConversationWithUserId(session.access_token, searchResult.id);
      if (createError || !data?.conversation) {
        setSearchError(createError || 'Unable to start chat.');
        return;
      }

      closeSearch();
      router.push(`/chat/${data.conversation.id}`);
    } catch {
      setSearchError('Unable to start chat right now.');
    } finally {
      setSearchLoading(false);
    }
  };

  const renderItem = ({ item }: { item: ChatConversation }) => {
    const previewParticipant = item.participants.find((participant) => participant.id !== currentUserId) ?? item.participants[0];

    return (
      <TouchableOpacity
        style={styles.chatItem}
        activeOpacity={0.7}
        onPress={() => router.push(`/chat/${item.id}`)}
      >
        <Image source={{ uri: previewParticipant?.avatar }} style={styles.avatar} />
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName}>{previewParticipant?.fullName ?? 'Unknown'}</Text>
            <Text style={styles.chatTime}>{formatConversationTime(item.lastMessageAt)}</Text>
          </View>
          <View style={styles.chatFooter}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage || 'No messages yet'}
            </Text>
            {item.unreadCount && item.unreadCount > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{item.unreadCount > 99 ? '99+' : String(item.unreadCount)}</Text>
              </View>
            ) : null}
          </View>
          {previewParticipant?.username ? (
            <Text style={styles.chatCode}>@{previewParticipant.username}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerState]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {searchVisible ? (
        <View style={styles.fullSearchHeader}>
          <TouchableOpacity onPress={closeSearch} style={styles.backIconButton}>
            <ArrowLeft size={24} color={Colors.gray900} />
          </TouchableOpacity>
          <TextInput
            style={styles.fullSearchInput}
            placeholder="Search chats or messages..."
            placeholderTextColor={Colors.gray500}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearIconButton}>
              <Text style={styles.clearIconText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
          <TouchableOpacity style={styles.searchButton} onPress={openSearch}>
            <Search size={20} color={Colors.gray700} />
          </TouchableOpacity>
        </View>
      )}
      {searchVisible && searchQuery.trim() !== '' ? (
        <View style={{ flex: 1 }}>
          {searchLoading && (
            <View style={styles.searchLoadingContainer}>
              <ActivityIndicator color={Colors.primary} size="small" />
            </View>
          )}

          {searchError ? (
            <Text style={styles.searchErrorText}>{searchError}</Text>
          ) : null}

          {/* Results ScrollView */}
          <ScrollView style={styles.searchResultsList} keyboardShouldPersistTaps="handled">
            <View style={{ paddingBottom: 40 }}>
              {/* Global search result card inside the list if found */}
              {searchResult ? (
                <View style={styles.searchSection}>
                  <View style={styles.sectionHeader}>
                    <User size={16} color={Colors.primary} />
                    <Text style={[styles.sectionHeaderTitle, { color: Colors.primary }]}>GLOBAL LOOKUP RESULT</Text>
                  </View>
                  <View style={styles.searchResultCard}>
                    <Image source={{ uri: searchResult.avatar }} style={styles.searchAvatar} />
                    <View style={styles.searchResultBody}>
                      <Text style={styles.searchResultName}>{searchResult.fullName}</Text>
                      <Text style={styles.searchResultCode}>@{searchResult.username}</Text>
                      <Text style={styles.searchResultMeta}>{searchResult.city || searchResult.location || 'No location set'}</Text>
                    </View>
                    <TouchableOpacity style={styles.startChatBtn} onPress={startChat}>
                      <Text style={styles.startChatBtnText}>Chat</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              {searchedChats.length === 0 && searchedMessages.length === 0 && !searchLoading && !searchResult && (
                <View style={styles.searchPromptState}>
                  <Text style={styles.searchPromptTitle}>No results found</Text>
                  <Text style={styles.searchPromptText}>
                    We couldn't find any chats or messages matching "{searchQuery}".
                  </Text>
                </View>
              )}

              {/* Matching Chats */}
              {searchedChats.length > 0 && (
                <View style={styles.searchSection}>
                  <View style={styles.sectionHeader}>
                    <User size={16} color={Colors.gray500} />
                    <Text style={styles.sectionHeaderTitle}>CHATS</Text>
                  </View>
                  {searchedChats.map((item) => {
                    const previewParticipant = item.participants.find((p) => p.id !== currentUserId) ?? item.participants[0];
                    return (
                      <TouchableOpacity
                        key={`chat-${item.id}`}
                        style={styles.searchChatItem}
                        onPress={() => {
                          closeSearch();
                          router.push(`/chat/${item.id}`);
                        }}
                      >
                        <Image source={{ uri: previewParticipant?.avatar }} style={styles.searchAvatarSmall} />
                        <View style={styles.searchChatDetails}>
                          <Text style={styles.searchChatName}>{previewParticipant?.fullName ?? 'Unknown'}</Text>
                          <Text style={styles.searchChatUsername}>@{previewParticipant?.username}</Text>
                        </View>
                        <Text style={styles.searchChatTime}>{formatConversationTime(item.lastMessageAt)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Matching Messages */}
              {searchedMessages.length > 0 && (
                <View style={styles.searchSection}>
                  <View style={styles.sectionHeader}>
                    <MessageSquare size={16} color={Colors.gray500} />
                    <Text style={styles.sectionHeaderTitle}>MESSAGES</Text>
                  </View>
                  {searchedMessages.map((item) => {
                    const participantName = item.sender?.fullName ?? 'Unknown';
                    const isMe = item.sender?.id === currentUserId;
                    const convoId = item.conversationDetail?.id || item.conversation;
                    
                    // Identify other participant for the avatar/title
                    const chatConvo = conversations.find(c => c.id === convoId) || item.conversationDetail;
                    const previewParticipant = chatConvo?.participants?.find((p: any) => p.id !== currentUserId) ?? item.sender;

                    return (
                      <TouchableOpacity
                        key={`msg-${item.id}`}
                        style={styles.searchMessageItem}
                        onPress={() => {
                          closeSearch();
                          router.push(`/chat/${convoId}`);
                        }}
                      >
                        <Image source={{ uri: previewParticipant?.avatar }} style={styles.searchAvatarSmall} />
                        <View style={styles.searchMessageDetails}>
                          <View style={styles.searchMessageHeader}>
                            <Text style={styles.searchMessageChatName}>
                              {previewParticipant?.fullName ?? 'Chat'}
                            </Text>
                            <View style={styles.timeRow}>
                              <Clock size={11} color={Colors.gray400} style={{ marginRight: 3 }} />
                              <Text style={styles.searchMessageTime}>{formatConversationTime(item.createdAt)}</Text>
                            </View>
                          </View>
                          <Text style={styles.searchMessageText} numberOfLines={2}>
                            <Text style={{ fontWeight: '600', color: Colors.gray800 }}>
                              {isMe ? 'You: ' : `${participantName}: `}
                            </Text>
                            {item.text}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Secondary global search trigger if query isn't empty */}
              <View style={styles.searchSectionSeparator} />
              <TouchableOpacity
                style={styles.searchGlobalTriggerRow}
                onPress={() => {
                  handleSearchByUsername(searchQuery);
                }}
              >
                <Search size={16} color={Colors.primary} />
                <Text style={styles.searchGlobalTriggerText}>
                  Search globally for username "@ {searchQuery}"
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.emptyTitle}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={listData.length === 0 ? styles.emptyList : styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptyText}>Start a chat from a profile or existing contact.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
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
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  emptyList: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.gray100,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.md,
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
  },
  chatTime: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    flex: 1,
    marginRight: Spacing.sm,
  },
  chatCode: {
    marginTop: 2,
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    letterSpacing: 0.4,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  unreadBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 8,
    color: Colors.gray600,
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
  searchOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  searchSheet: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  searchTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray900,
  },
  searchSubtitle: {
    marginTop: 6,
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 20,
  },
  searchInput: {
    marginTop: Spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.gray900,
    letterSpacing: 2,
  },
  searchError: {
    marginTop: Spacing.sm,
    color: Colors.error,
    fontSize: FontSizes.sm,
  },
  searchResultCard: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray50,
    padding: Spacing.md,
  },
  searchAvatar: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.md,
  },
  searchResultBody: {
    flex: 1,
  },
  searchResultName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
  },
  searchResultCode: {
    marginTop: 2,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: FontWeights.bold as any,
    letterSpacing: 1.2,
  },
  searchResultMeta: {
    marginTop: 2,
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },
  searchActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  searchSecondaryButton: {
    flex: 1,
    height: 46,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSecondaryButtonText: {
    color: Colors.gray800,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
  },
  searchPrimaryButton: {
    flex: 1,
    height: 46,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchPrimaryButtonText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
  },
  fullSearchContainer: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  fullSearchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    backgroundColor: Colors.white,
    elevation: 2,
    shadowColor: Colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  backIconButton: {
    padding: Spacing.xs,
  },
  fullSearchInput: {
    flex: 1,
    height: 44,
    fontSize: FontSizes.lg,
    color: Colors.gray900,
    marginLeft: Spacing.sm,
  },
  clearIconButton: {
    padding: Spacing.xs,
  },
  clearIconText: {
    fontSize: FontSizes.lg,
    color: Colors.gray500,
  },
  searchLoadingContainer: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  searchErrorText: {
    color: Colors.error,
    fontSize: FontSizes.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    textAlign: 'center',
  },
  searchResultsList: {
    flex: 1,
  },
  searchPromptState: {
    paddingVertical: 40,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchPromptTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray800,
    marginBottom: 6,
    textAlign: 'center',
  },
  searchPromptText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    textAlign: 'center',
    lineHeight: 20,
  },
  globalSearchSection: {
    marginTop: 32,
    width: '100%',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  globalSearchHeaderTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray800,
    marginBottom: Spacing.sm,
  },
  globalSearchRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  globalSearchInput: {
    flex: 1,
    height: 42,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: FontSizes.sm,
    color: Colors.gray900,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  globalSearchButton: {
    height: 42,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  globalSearchButtonText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold as any,
  },
  startChatBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  startChatBtnText: {
    color: Colors.white,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold as any,
  },
  searchSection: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  sectionHeaderTitle: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray500,
    marginLeft: 6,
    letterSpacing: 1.2,
  },
  searchChatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.gray100,
  },
  searchAvatarSmall: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.md,
  },
  searchChatDetails: {
    flex: 1,
  },
  searchChatName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
  },
  searchChatUsername: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    marginTop: 2,
  },
  searchChatTime: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },
  searchMessageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.gray100,
  },
  searchMessageDetails: {
    flex: 1,
  },
  searchMessageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  searchMessageChatName: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray800,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchMessageTime: {
    fontSize: FontSizes.xs,
    color: Colors.gray400,
  },
  searchMessageText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 18,
  },
  searchSectionSeparator: {
    height: 1,
    backgroundColor: Colors.gray100,
    marginVertical: Spacing.lg,
    marginHorizontal: Spacing.lg,
  },
  searchGlobalTriggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
  },
  searchGlobalTriggerText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: FontWeights.semiBold as any,
  },
});
