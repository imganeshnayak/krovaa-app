import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Animated,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, MoreVertical, Send, Search, Ban, Image as ImageIcon, Camera, FileText, Reply, Forward, Copy, Trash2, Star, X, Archive } from 'lucide-react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { io, Socket } from 'socket.io-client';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Colors, FontWeights, Spacing, BorderRadius, FontSizes } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from '@/lib/apiBaseUrl';
import {
  getConversationMessages,
  getConversations,
  markConversationRead,
  deleteMessage as apiDeleteMessage,
  forwardMessage as apiForwardMessage,
  type ChatConversation,
  type ChatMessage,
} from '@/lib/chatApi';
import { getCurrentUserProfile } from '@/lib/profileApi';
import { getConversationCache, setConversationCache, updateConversationMessages, setConversationScrollOffset } from '@/lib/chatCache';

type MessageSender = string | { _id?: string; id?: string; fullName?: string; avatar?: string };
type SocketAck = { error?: string; message?: ChatMessage };

function getSenderId(sender: MessageSender | undefined) {
  if (!sender) {
    return '';
  }

  return typeof sender === 'string' ? sender : sender._id ?? sender.id ?? '';
}

function formatTime(value?: string) {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function appendUniqueMessage(messages: ChatMessage[], nextMessage: ChatMessage) {
  const nextId = nextMessage.id;
  if (!nextId || messages.some((message) => message.id === nextId)) {
    return messages;
  }

  return [...messages, nextMessage];
}

function getFileIcon(fileName: string, type: string): { icon: string; label: string } {
  const lowerFileName = fileName.toLowerCase();
  
  // Audio files
  if (type === 'audio' || lowerFileName.match(/\.(mp3|wav|aac|flac|ogg|m4a|wma|opus)$/i)) {
    return { icon: '🎵', label: 'Audio' };
  }
  
  // Document files
  if (lowerFileName.endsWith('.pdf')) return { icon: '📕', label: 'PDF' };
  if (lowerFileName.match(/\.(doc|docx)$/i)) return { icon: '📄', label: 'Document' };
  if (lowerFileName.match(/\.(xls|xlsx)$/i)) return { icon: '📊', label: 'Excel' };
  if (lowerFileName.match(/\.(ppt|pptx)$/i)) return { icon: '🎬', label: 'PowerPoint' };
  if (lowerFileName.match(/\.(txt|rtf)$/i)) return { icon: '📝', label: 'Text' };
  
  // Archive files
  if (lowerFileName.match(/\.(zip|rar|7z|tar|gz)$/i)) return { icon: '📦', label: 'Archive' };
  
  // Code files
  if (lowerFileName.match(/\.(json|xml|js|ts|py|java|cpp|c|html|css)$/i)) return { icon: '</>', label: 'Code' };
  
  // Video (already handled, but for safety)
  if (type === 'video') return { icon: '🎥', label: 'Video' };
  
  // Default
  return { icon: '📄', label: 'File' };
}

function getAttachmentColor(type: string): string {
  switch (type) {
    case 'audio':
      return 'rgba(168, 85, 247, 0.2)'; // Purple for audio
    case 'video':
      return 'rgba(59, 130, 246, 0.2)'; // Blue for video
    case 'file':
      return 'rgba(100, 116, 139, 0.2)'; // Gray for files
    default:
      return 'rgba(0, 0, 0, 0.2)';
  }
}

function isForwardedMessage(message: ChatMessage) {
  const forwardedMessage = message as ChatMessage & { forwarded?: boolean; isForwarded?: boolean; forwardedFrom?: string };
  return Boolean(forwardedMessage.forwarded || forwardedMessage.isForwarded || forwardedMessage.forwardedFrom);
}

function getReplyPreviewLabel(message: ChatMessage) {
  if (message.text?.trim()) {
    return message.text.trim();
  }

  if (message.attachments?.length) {
    return 'Attachment';
  }

  return 'Message';
}

export default function ChatDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { session } = useAuth();
  const scrollViewRef = useRef<ScrollView | null>(null);
  const inputRef = useRef<TextInput | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isParticipantTyping, setIsParticipantTyping] = useState(false);
  const [composerHeight, setComposerHeight] = useState(44);
  const [attachmentModalVisible, setAttachmentModalVisible] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<{ url: string; type: string } | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [starredMessages, setStarredMessages] = useState<Record<string, boolean>>({});
  const [forwardModalVisible, setForwardModalVisible] = useState(false);
  const [forwardConversations, setForwardConversations] = useState<ChatConversation[]>([]);
  const [forwardSourceMessages, setForwardSourceMessages] = useState<ChatMessage[]>([]);
  
  // Menu features state
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [mediaVisible, setMediaVisible] = useState(false);
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);

  const conversationId = String(params.id ?? '');
  const currentUserId = session?.user.id ?? '';

  // Hydrate instantly from in-memory cache if available
  useEffect(() => {
    const cached = getConversationCache(conversationId);
    if (cached) {
      if (cached.conversation) setConversation(cached.conversation as ChatConversation);
      if (cached.messages) setMessages(cached.messages as ChatMessage[]);
      setLoading(false);
      requestAnimationFrame(() => {
        if (cached.scrollOffset != null && scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: cached.scrollOffset, animated: false });
        }
      });
    }
  }, [conversationId]);

  const participant = useMemo(() => {
    if (!conversation) {
      return null;
    }

    return conversation.participants.find((item) => item.id !== currentUserId) ?? conversation.participants[0] ?? null;
  }, [conversation, currentUserId]);

  const isParticipantBlocked = useMemo(() => {
    if (!participant?.id) return false;
    return blockedUsers.includes(participant.id);
  }, [blockedUsers, participant?.id]);

  const selectionModeActive = selectedMessages.length > 0;

  const isMessageSelected = useCallback(
    (id: string) => selectedMessages.includes(id),
    [selectedMessages]
  );

  const clearSelection = useCallback(() => {
    setSelectedMessages([]);
  }, []);

  const toggleMessageSelection = useCallback((id: string) => {
    setSelectedMessages((previous) => {
      const exists = previous.includes(id);
      const next = exists ? previous.filter((messageId) => messageId !== id) : [...previous, id];

      if (next.length === 0) {
        Haptics.selectionAsync().catch(() => null);
        return [];
      }

      Haptics.selectionAsync().catch(() => null);
      return next;
    });
  }, []);

  const enterSelectionMode = useCallback((id: string) => {
    setSelectedMessages((previous) => (previous.includes(id) ? previous : [id]));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
  }, []);

  useEffect(() => {
    if (!messages.length) {
      return;
    }

    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages]);

  useEffect(() => {
    let mounted = true;

    async function loadConversation() {
      try {
        if (!conversationId || !session?.access_token) {
          if (mounted) {
            setLoading(false);
            setError('No authentication token available.');
          }
          return;
        }

        // Only show loading UI if we don't have cached messages
        const cached = getConversationCache(conversationId);
        if (!cached || !cached.messages) {
          setLoading(true);
        }
        setError(null);

        const [
          convoResult,
          msgResult,
          profileResult,
        ] = await Promise.all([
          getConversations(session.access_token),
          getConversationMessages(session.access_token, conversationId),
          getCurrentUserProfile(session.access_token),
        ]);

        if (!mounted) {
          return;
        }

        if (profileResult?.data?.user?.blockedUsers) {
          setBlockedUsers(profileResult.data.user.blockedUsers);
        }

        const conversationData = convoResult?.data;
        const conversationError = convoResult?.error;
        const messageData = msgResult?.data;
        const messageError = msgResult?.error;

        if (conversationError || !conversationData) {
          // keep existing conversation from cache if present
          if (!getConversationCache(conversationId)?.conversation) {
            setConversation(null);
          }
          setError(conversationError || 'Unable to load chat.');
        } else {
          const activeConversation = conversationData?.conversations?.find((item) => item.id === conversationId) ?? null;
          setConversation(activeConversation);
          try {
            setConversationCache(conversationId, { conversation: activeConversation });
          } catch {}
        }

        if (messageError || !messageData) {
          // preserve cached messages when available
          if (!getConversationCache(conversationId)?.messages) {
            setMessages([]);
          }
          setError((previousError) => previousError ?? messageError ?? null);
        } else {
          setMessages(messageData.messages);
          try {
            updateConversationMessages(conversationId, messageData.messages);
          } catch {}
          // Mark conversation as read on the server
          try {
            if (session?.access_token) {
              markConversationRead(session.access_token, conversationId).catch(() => null);
            }
          } catch {}
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || 'An unexpected error occurred while loading chat.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadConversation();

    return () => {
      mounted = false;
    };
  }, [conversationId, session?.access_token]);

  useEffect(() => {
    if (!conversationId || !session?.access_token) {
      return;
    }

    const socket = io(API_BASE_URL, {
      transports: ['websocket'],
      auth: {
        token: session.access_token,
      },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join', conversationId);
    });

    socket.on('message', (message: ChatMessage) => {
      replaceOrAppendMessage(message);
      setIsParticipantTyping(false);
    });

    socket.on('messageDeleted', ({ id }: { id?: string }) => {
      if (!id) return;
      setMessages((previousMessages) => previousMessages.filter((message) => message.id !== id));
    });

    socket.on('conversationRead', () => {
      // reserved for future in-chat read receipts / sync
    });

    socket.on('typing', ({ userId, isTyping }) => {
      if (userId === currentUserId) {
        return;
      }

      setIsParticipantTyping(Boolean(isTyping));
    });

    return () => {
      socket.emit('leave', conversationId);
      socket.disconnect();
      socketRef.current = null;

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [conversationId, currentUserId, session?.access_token]);

  const toggleMenu = () => setMenuVisible((previous) => !previous);

  const emitTypingState = (isTyping: boolean) => {
    const socket = socketRef.current;
    if (!socket || !conversationId) {
      return;
    }

    socket.emit('typing', { conversationId, isTyping });
  };

  const replaceOrAppendMessage = (nextMessage: ChatMessage) => {
    setMessages((previousMessages) => {
      let next = previousMessages;
      if (nextMessage.clientMessageId) {
        const optimisticIndex = previousMessages.findIndex((message) => message.clientMessageId === nextMessage.clientMessageId);
        if (optimisticIndex >= 0) {
          const copy = [...previousMessages];
          copy[optimisticIndex] = nextMessage;
          next = copy;
        }
      }

      if (next === previousMessages) {
        next = appendUniqueMessage(previousMessages, nextMessage);
      }

      try {
        updateConversationMessages(conversationId, next);
      } catch {}

      return next;
    });
  };

  const panRefs = useRef<Record<string, any>>({});

  function ensurePanValue(id: string) {
    if (!panRefs.current[id]) panRefs.current[id] = new Animated.Value(0);
    return panRefs.current[id];
  }

  const handleReplyTriggered = (message: ChatMessage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => null);
    clearSelection();
    setReplyToMessage(message);
    inputRef.current?.focus();
  };

  const handleLongPress = (message: ChatMessage) => {
    if (selectionModeActive) {
      toggleMessageSelection(message.id);
      return;
    }

    enterSelectionMode(message.id);
  };

  const copyMessage = async (messagesToCopy: ChatMessage[]) => {
    const copyText = messagesToCopy
      .map((message) => message.text?.trim())
      .filter((text): text is string => Boolean(text))
      .join('\n\n');

    if (!copyText) {
      return;
    }

    await Clipboard.setStringAsync(copyText);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
    clearSelection();
  };

  const handleDeleteLocal = (messageIds: string[]) => {
    setMessages((prev) => {
      const next = prev.filter((message) => !messageIds.includes(message.id));
      try {
        updateConversationMessages(conversationId, next);
      } catch {}
      return next;
    });
  };

  const toggleStar = (messagesToToggle: ChatMessage[]) => {
    setStarredMessages((prev) => {
      const next = { ...prev };
      messagesToToggle.forEach((message) => {
        next[message.id] = !next[message.id];
      });
      return next;
    });
    clearSelection();
  };

  const openForwardModal = async (messagesToForward: ChatMessage[]) => {
    clearSelection();
    setForwardSourceMessages(messagesToForward);
    setForwardModalVisible(true);
    try {
      if (!session?.access_token) return;
      const res = await getConversations(session.access_token);
      if (res?.data?.conversations) {
        // exclude current conversation
        setForwardConversations(res.data.conversations.filter((c) => c.id !== conversationId));
      }
    } catch (err) {
      // ignore
    }
  };

  const handleForwardTo = async (targetConversationId: string) => {
    if (!session?.access_token || !forwardSourceMessages.length) return;
    try {
      for (const sourceMessage of forwardSourceMessages) {
        const res = await apiForwardMessage(session.access_token, conversationId, sourceMessage.id, targetConversationId);
        if (res?.error) {
          setError(res.error);
          return;
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
      alert('Message forwarded');
      setForwardModalVisible(false);
      setForwardSourceMessages([]);
    } catch (err: any) {
      setError(err?.message || 'Forward failed');
    }
  };

  const handleDeleteMessage = async (message: ChatMessage) => {
    if (!session?.access_token) {
      setError('Not authenticated');
      return;
    }

    try {
      const res = await apiDeleteMessage(session.access_token, conversationId, message.id);
      if (res?.error) {
        setError(res.error);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
        handleDeleteLocal([message.id]);
      }
    } catch (err: any) {
      setError(err?.message || 'Delete failed');
    }
  };

  const handleDeleteSelectedMessages = async () => {
    if (!session?.access_token || !selectedMessages.length) {
      return;
    }

    const selectedMessagesInOrder = messages.filter((message) => selectedMessages.includes(message.id));
    handleDeleteLocal(selectedMessagesInOrder.map((message) => message.id));
    clearSelection();

    try {
      for (const message of selectedMessagesInOrder) {
        const res = await apiDeleteMessage(session.access_token, conversationId, message.id);
        if (res?.error) {
          setError(res.error);
          break;
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
    } catch (err: any) {
      setError(err?.message || 'Delete failed');
    }
  };

  const handleCopySelectedMessages = async () => {
    const selectedMessagesInOrder = messages.filter((message) => selectedMessages.includes(message.id));
    await copyMessage(selectedMessagesInOrder);
  };

  const handleToggleSelectedStars = () => {
    const selectedMessagesInOrder = messages.filter((message) => selectedMessages.includes(message.id));
    toggleStar(selectedMessagesInOrder);
  };

  const handleReplyFromSelection = () => {
    if (selectedMessages.length !== 1) {
      return;
    }

    const selectedMessage = messages.find((message) => message.id === selectedMessages[0]);
    if (selectedMessage) {
      clearSelection();
      handleReplyTriggered(selectedMessage);
    }
  };

  const handleMessageChange = (text: string) => {
    setNewMessage(text);

    const trimmedText = text.trim();
    if (!trimmedText) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      emitTypingState(false);
      return;
    }

    emitTypingState(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      emitTypingState(false);
      typingTimeoutRef.current = null;
    }, 900);
  };

  const sendMessage = () => {
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage || !conversationId || !session?.access_token) {
      return;
    }

    const socket = socketRef.current;
    if (!socket) {
      setError('Chat connection is not ready yet.');
      return;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    emitTypingState(false);

    const clientMessageId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMessage: ChatMessage = {
      id: clientMessageId,
      conversation: conversationId,
      sender: {
        id: currentUserId,
        fullName: 'You',
      },
      text: trimmedMessage,
      attachments: [],
      createdAt: new Date().toISOString(),
      clientMessageId,
    };

    setMessages((previousMessages) => [...previousMessages, optimisticMessage]);

    socket.emit(
      'sendMessage',
      { conversationId, text: trimmedMessage, replyTo: replyToMessage?.id ?? undefined, clientMessageId },
      (response: SocketAck) => {
        if (response?.error) {
          setError(response.error);
          setMessages((previousMessages) => previousMessages.filter((message) => message.clientMessageId !== clientMessageId));
          return;
        }

        if (response?.message) {
          replaceOrAppendMessage(response.message as ChatMessage);
          setNewMessage('');
          setReplyToMessage(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
          // Keep the input focused for smooth continuous typing
          inputRef.current?.focus();
        }
      }
    );
  };

  const pickFromGallery = async () => {
    setAttachmentModalVisible(false);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Camera roll permission required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = asset.fileName || asset.uri.split('/').pop() || 'attachment';
        const lowerFileName = fileName.toLowerCase();
        
        let fileType: 'image' | 'video' | 'audio' | 'file' = 'image';
        if (asset.type === 'video' || lowerFileName.match(/\.(mp4|mov|avi|mkv|flv|wmv|webm)$/i)) {
          fileType = 'video';
        } else if (lowerFileName.match(/\.(mp3|wav|aac|flac|ogg|m4a|wma|opus)$/i)) {
          fileType = 'audio';
        }
        
        await sendAttachment(asset.uri, fileType, fileName);
      }
    } catch (err) {
      setError('Failed to pick from gallery.');
    }
  };

  const pickFromCamera = async () => {
    setAttachmentModalVisible(false);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError('Camera permission required.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = asset.fileName || asset.uri.split('/').pop() || 'attachment';
        const fileType = asset.type === 'video' ? 'video' : 'image';
        await sendAttachment(asset.uri, fileType, fileName);
      }
    } catch (err) {
      setError('Failed to capture from camera.');
    }
  };

  const pickDocument = async () => {
    setAttachmentModalVisible(false);
    try {
      // Use document picker to browse actual files on device
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const fileUri = asset.uri;
        const fileName = asset.name || 'document';
        const lowerFileName = fileName.toLowerCase();
        
        // Determine file type from extension
        let fileType: 'image' | 'video' | 'audio' | 'file' = 'file';
        
        if (lowerFileName.match(/\.(jpg|jpeg|png|gif|webp|bmp|heic)$/i)) {
          fileType = 'image';
        } else if (lowerFileName.match(/\.(mp4|mov|avi|mkv|flv|wmv|webm)$/i)) {
          fileType = 'video';
        } else if (lowerFileName.match(/\.(mp3|wav|aac|flac|ogg|m4a|wma|opus)$/i)) {
          fileType = 'audio';
        }
        
        await sendAttachment(fileUri, fileType, fileName);
      }
    } catch (err) {
      console.error('Document picker error:', err);
      setError('Failed to pick file.');
    }
  };

  const openAttachmentFile = async (attachment: any) => {
    if (!attachment?.url) {
      setError('File URL not available');
      return;
    }

    try {
      setError(null);
      
      // For Cloudinary URLs or remote files, try to open with Linking
      if (attachment.url.startsWith('http')) {
        const canOpen = await Linking.canOpenURL(attachment.url);
        if (canOpen) {
          await Linking.openURL(attachment.url);
        } else {
          // If can't open directly, try to share it
          await Sharing.shareAsync(attachment.url);
        }
      } else {
        // For local files, use Sharing API
        await Sharing.shareAsync(attachment.url);
      }
    } catch (err) {
      console.error('Error opening file:', err);
      setError('Unable to open file. Try downloading or sharing it.');
    }
  };

  const getSearchResults = () => {
    if (!searchText.trim()) return messages;
    return messages.filter((msg) =>
      msg.text?.toLowerCase().includes(searchText.toLowerCase())
    );
  };

  const getAllMedia = () => {
    const mediaMessages: ChatMessage[] = [];
    messages.forEach((msg) => {
      if (msg.attachments && msg.attachments.length > 0) {
        mediaMessages.push(msg);
      }
    });
    return mediaMessages;
  };

  const handleBlockAction = async () => {
    if (!participant?.id || !session?.access_token) {
      setError(isParticipantBlocked ? 'Unable to unblock user.' : 'Unable to block user.');
      return;
    }

    setIsBlocking(true);
    try {
      const endpoint = isParticipantBlocked
        ? `${API_BASE_URL}/api/profile/unblock/${participant.id}`
        : `${API_BASE_URL}/api/profile/block/${participant.id}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${isParticipantBlocked ? 'unblock' : 'block'} user`);
      }

      const data = await response.json();
      if (data.blockedUsers) {
        setBlockedUsers(data.blockedUsers.map((id: any) => String(id)));
      } else {
        if (isParticipantBlocked) {
          setBlockedUsers((prev) => prev.filter((id) => id !== participant.id));
        } else {
          setBlockedUsers((prev) => [...prev, participant.id]);
        }
      }

      setMenuVisible(false);
      setBlockModalVisible(false);
      setError(null);
      alert(`You have ${isParticipantBlocked ? 'unblocked' : 'blocked'} ${participant.fullName || participant.username}`);
      if (!isParticipantBlocked) {
        router.back();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${isParticipantBlocked ? 'unblock' : 'block'} user`;
      setError(errorMessage);
    } finally {
      setIsBlocking(false);
    }
  };

  const sendAttachment = async (fileUri: string, attachmentType: 'image' | 'video' | 'audio' | 'file', fileName?: string) => {
    if (!conversationId || !session?.access_token) {
      setError('Not authenticated or no conversation selected.');
      return;
    }

    const socket = socketRef.current;
    if (!socket) {
      setError('Chat connection is not ready yet.');
      return;
    }

    try {
      setError(null);
      emitTypingState(false);

      // Create FormData with proper file handling for React Native
      const formData = new FormData();
      
      // Extract file name from URI if not provided
      const finalFileName = fileName || fileUri.split('/').pop() || `attachment-${Date.now()}`;
      
      // Determine MIME type based on attachment type and file extension
      let mimeType = 'application/octet-stream';
      const lowerFileName = finalFileName.toLowerCase();
      
      if (attachmentType === 'image') {
        mimeType = 'image/jpeg';
      } else if (attachmentType === 'video') {
        mimeType = 'video/mp4';
      } else if (attachmentType === 'audio') {
        if (lowerFileName.endsWith('.mp3')) mimeType = 'audio/mpeg';
        else if (lowerFileName.endsWith('.wav')) mimeType = 'audio/wav';
        else if (lowerFileName.endsWith('.aac')) mimeType = 'audio/aac';
        else if (lowerFileName.endsWith('.flac')) mimeType = 'audio/flac';
        else if (lowerFileName.endsWith('.ogg')) mimeType = 'audio/ogg';
        else if (lowerFileName.endsWith('.m4a')) mimeType = 'audio/mp4';
        else mimeType = 'audio/*';
      } else {
        // File type - detect from extension
        if (lowerFileName.endsWith('.pdf')) mimeType = 'application/pdf';
        else if (lowerFileName.endsWith('.doc') || lowerFileName.endsWith('.docx')) mimeType = 'application/msword';
        else if (lowerFileName.endsWith('.xls') || lowerFileName.endsWith('.xlsx')) mimeType = 'application/vnd.ms-excel';
        else if (lowerFileName.endsWith('.ppt') || lowerFileName.endsWith('.pptx')) mimeType = 'application/vnd.ms-powerpoint';
        else if (lowerFileName.endsWith('.zip')) mimeType = 'application/zip';
        else if (lowerFileName.endsWith('.rar')) mimeType = 'application/x-rar-compressed';
        else if (lowerFileName.endsWith('.7z')) mimeType = 'application/x-7z-compressed';
        else if (lowerFileName.endsWith('.txt')) mimeType = 'text/plain';
        else if (lowerFileName.endsWith('.json')) mimeType = 'application/json';
        else if (lowerFileName.endsWith('.csv')) mimeType = 'text/csv';
      }
      
      // For React Native/Expo, append file directly by URI
      const file = {
        uri: fileUri,
        type: mimeType,
        name: finalFileName,
      };

      formData.append('file', file as any);

      console.log('Uploading attachment:', { fileUri, attachmentType, fileName: finalFileName, mimeType });

      const uploadResponse = await fetch(`${API_BASE_URL}/api/chats/conversations/${conversationId}/attachment`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Accept': 'application/json',
        },
        body: formData,
      });

      console.log('Upload response status:', uploadResponse.status);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Upload error response:', errorText);
        try {
          const errorData = JSON.parse(errorText);
          setError(errorData.error || 'Failed to upload attachment.');
        } catch {
          setError(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
        }
        return;
      }

      const uploadedData = await uploadResponse.json();
      console.log('Upload successful:', uploadedData);
      
      if (!uploadedData.attachment) {
        setError('No attachment data returned from server.');
        return;
      }

      // Send message with attachment via socket
      socket.emit(
        'sendMessage',
        { 
          conversationId, 
          text: '', 
          attachments: [uploadedData.attachment]
        },
        (ackResponse: SocketAck) => {
          if (ackResponse?.error) {
            console.error('Socket error:', ackResponse.error);
            setError(ackResponse.error);
            return;
          }

          if (ackResponse?.message) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
            console.log('Message sent successfully:', ackResponse.message);
            setMessages((previousMessages) => appendUniqueMessage(previousMessages, ackResponse.message as ChatMessage));
            inputRef.current?.focus();
          }
        }
      );
    } catch (err) {
      console.error('Attachment error details:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to send attachment: ${errorMessage}`);
    }
  };

  if (!conversationId || !session?.access_token) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Sign in to continue</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }


  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.select({ ios: 'padding', android: 'height' })}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backIconButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.gray900} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Image source={{ uri: participant?.avatar }} style={styles.headerAvatar} />
          <View>
            <Text style={styles.headerName} numberOfLines={1}>
              {participant?.fullName ?? 'Conversation'}
            </Text>
            <Text style={styles.headerMeta}>
              {participant?.username ? `@${participant.username}` : participant?.email ?? 'Active now'}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <View style={styles.currencyBadge}>
            <Text style={styles.currencyText}>₹</Text>
          </View>

          <TouchableOpacity style={styles.iconButton} onPress={toggleMenu}>
            <MoreVertical size={18} color={Colors.gray900} />
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={toggleMenu}>
        <Pressable style={styles.modalOverlay} onPress={toggleMenu}>
          <View style={styles.menuDropdown}>
            <TouchableOpacity 
              style={styles.menuOption} 
              onPress={() => {
                setMenuVisible(false);
                setSearchVisible(true);
              }}
            >
              <Search size={18} color={Colors.gray700} />
              <Text style={styles.menuOptionText}>Search</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuOption}
              onPress={() => {
                setMenuVisible(false);
                setMediaVisible(true);
              }}
            >
              <ImageIcon size={18} color={Colors.gray700} />
              <Text style={styles.menuOptionText}>Media</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity 
              style={styles.menuOption}
              onPress={() => {
                setMenuVisible(false);
                setBlockModalVisible(true);
              }}
            >
              <Ban size={18} color="#EF4444" />
              <Text style={[styles.menuOptionText, { color: '#EF4444' }]}>
                {isParticipantBlocked ? 'Unblock' : 'Block'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {selectionModeActive ? (
        <BlurView intensity={24} tint="light" style={styles.selectionToolbar}>
          <View style={styles.selectionToolbarContent}>
            <TouchableOpacity onPress={clearSelection} style={styles.selectionToolbarClose} activeOpacity={0.7}>
              <X size={18} color={Colors.gray900} />
            </TouchableOpacity>

            <View style={styles.selectionToolbarTitleWrap}>
              <Text style={styles.selectionToolbarTitle}>{selectedMessages.length} selected</Text>
            </View>

            <View style={styles.selectionToolbarActions}>
              {selectedMessages.length === 1 ? (
                <TouchableOpacity onPress={handleReplyFromSelection} style={styles.selectionToolbarButton} activeOpacity={0.7}>
                  <Reply size={18} color={Colors.gray900} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={() => openForwardModal(messages.filter((message) => selectedMessages.includes(message.id)))} style={styles.selectionToolbarButton} activeOpacity={0.7}>
                <Forward size={18} color={Colors.gray900} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCopySelectedMessages} style={styles.selectionToolbarButton} activeOpacity={0.7}>
                <Copy size={18} color={Colors.gray900} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteSelectedMessages} style={styles.selectionToolbarButton} activeOpacity={0.7}>
                <Trash2 size={18} color="#EF4444" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleToggleSelectedStars} style={styles.selectionToolbarButton} activeOpacity={0.7}>
                <Star size={18} color={Colors.gray900} />
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      ) : null}

      <Pressable style={styles.messagesSurface} onPress={selectionModeActive ? clearSelection : undefined}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.messages}
        showsVerticalScrollIndicator={false}
        style={styles.messagesScrollView}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        scrollEventThrottle={120}
        onScroll={(e) => {
          try {
            const y = e.nativeEvent.contentOffset.y;
            setConversationScrollOffset(conversationId, y);
          } catch {}
        }}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyConversationState}>
            <Text style={styles.emptyConversationTitle}>No messages yet</Text>
            <Text style={styles.emptyConversationText}>Send the first message to start the conversation.</Text>
          </View>
        ) : (
          messages.map((message) => {
            const isMine = getSenderId(message.sender as MessageSender) === currentUserId;
            const hasAttachments = message.attachments && message.attachments.length > 0;
            const pan = ensurePanValue(message.id);
            const forwarded = isForwardedMessage(message);
            const messageSelected = isMessageSelected(message.id);

            const onGestureEvent = Animated.event(
              [{ nativeEvent: { translationX: pan } }],
              { useNativeDriver: true }
            );

            const onHandlerStateChange = ({ nativeEvent }: any) => {
              if (nativeEvent.state !== State.END && nativeEvent.oldState !== State.ACTIVE) {
                return;
              }

              const translationX = nativeEvent.translationX ?? 0;
              if (translationX > 70) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
                handleReplyTriggered(message);
              } else if (translationX < -70) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
                openForwardModal(message);
              }

              Animated.timing(pan, {
                toValue: 0,
                duration: 90,
                useNativeDriver: true,
              }).start();
            };

            return (
              <PanGestureHandler key={message.id} onGestureEvent={onGestureEvent} onHandlerStateChange={onHandlerStateChange} activeOffsetX={[-10, 10]}>
              <Animated.View
                key={message.id}
                style={[
                  styles.messageRow,
                  isMine ? styles.messageRowRight : styles.messageRowLeft,
                  { transform: [{ translateX: pan }] },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.85}
                  onLongPress={() => handleLongPress(message)}
                  onPress={() => {
                    if (selectionModeActive) {
                      toggleMessageSelection(message.id);
                    }
                  }}
                >
                  <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble, messageSelected ? styles.selectedBubble : null]}>
                    {forwarded ? (
                      <View style={styles.forwardedRow}>
                        <Forward size={11} color={Colors.gray500} />
                        <Text style={styles.forwardedText}>Forwarded</Text>
                      </View>
                    ) : null}

                    {message.replyTo ? (
                      <View style={styles.repliedMessageCard}>
                        <View style={styles.replyAccent} />
                        <View style={styles.repliedMessageBody}>
                          <Text style={styles.repliedMessageAuthor}>{(message.replyTo as any)?.sender?.fullName ?? 'Reply'}</Text>
                          <Text style={styles.repliedMessageText} numberOfLines={1}>{(message.replyTo as any)?.text ?? 'Attachment'}</Text>
                        </View>
                      </View>
                    ) : null}

                    {hasAttachments && (
                      <View style={styles.attachmentsContainer} pointerEvents={selectionModeActive ? 'none' : 'auto'}>
                        {message.attachments.map((attachment, idx) => {
                          const fileName = attachment.url?.split('/').pop() || `attachment-${idx}`;
                          const fileInfo = getFileIcon(fileName, attachment.type);

                          return (
                            <TouchableOpacity
                              key={idx}
                              style={styles.attachmentItem}
                              onPress={() => {
                                setError(null);
                                setSelectedAttachment(attachment);
                              }}
                            >
                              {attachment.type === 'image' && (
                                <Image source={{ uri: attachment.url }} style={styles.attachmentImage} />
                              )}
                              {attachment.type !== 'image' && (
                                <View style={[styles.attachmentPlaceholder, { backgroundColor: getAttachmentColor(attachment.type) }]}>
                                  <Text style={styles.attachmentPlaceholderText}>{fileInfo.icon}</Text>
                                  <Text style={styles.attachmentPlaceholderLabel}>{fileInfo.label}</Text>
                                  {fileName && <Text style={styles.attachmentFileName}>{fileName.substring(0, 12)}</Text>}
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {message.text && (
                      <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.theirMessageText]}>
                        {message.text}
                      </Text>
                    )}

                    <View style={styles.messageFooter}>
                      <Text style={[styles.messageTime, isMine ? styles.myMessageTime : styles.theirMessageTime]} numberOfLines={1}>
                        {formatTime(message.createdAt)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
              </PanGestureHandler>
            );
          })
        )}

        {isParticipantTyping ? (
          <View style={styles.typingRow}>
            <View style={styles.typingBubble}>
              <View style={styles.typingDots}>
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>
      </Pressable>

      {isParticipantBlocked ? (
        <View style={styles.blockedBanner}>
          <Text style={styles.blockedBannerText}>You blocked this contact.</Text>
          <TouchableOpacity 
            style={styles.unblockBannerButton} 
            onPress={() => setBlockModalVisible(true)}
            disabled={isBlocking}
          >
            <Text style={styles.unblockBannerButtonText}>Unblock</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <BlurView intensity={24} tint="light" style={styles.composerShell}>
          {replyToMessage ? (
            <View style={styles.replyPreview}>
              <View style={styles.replyAccent} />
              <View style={styles.replyPreviewBody}>
                <Text style={styles.replyPreviewAuthor}>{(replyToMessage.sender as any)?.fullName ?? 'Reply'}</Text>
                <Text style={styles.replyPreviewText} numberOfLines={1}>{getReplyPreviewLabel(replyToMessage)}</Text>
              </View>
              <TouchableOpacity onPress={() => setReplyToMessage(null)} style={styles.replyCancel}><Text style={styles.replyCancelText}>✕</Text></TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.composer}>
            <TouchableOpacity style={styles.attachButton} onPress={() => setAttachmentModalVisible(true)} activeOpacity={0.7}>
              <Text style={styles.attachText}>+</Text>
            </TouchableOpacity>
            <TextInput
              ref={inputRef}
              placeholder="Write a message"
              placeholderTextColor={Colors.gray500}
              style={[styles.input, { height: Math.min(Math.max(composerHeight, 44), 100) }]}
              value={newMessage}
              onChangeText={handleMessageChange}
              onBlur={() => emitTypingState(false)}
              onSubmitEditing={sendMessage}
              multiline
              textAlignVertical="center"
              returnKeyType="send"
              onContentSizeChange={(event) => {
                const nextHeight = event.nativeEvent.contentSize.height + 6;
                setComposerHeight(Math.min(Math.max(nextHeight, 44), 100));
              }}
            />
            <TouchableOpacity style={styles.sendButton} onPress={sendMessage} activeOpacity={0.7}>
              <Send size={18} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </BlurView>
      )}

      <Modal visible={attachmentModalVisible} transparent animationType="fade" onRequestClose={() => setAttachmentModalVisible(false)}>
        <Pressable style={styles.attachmentOverlay} onPress={() => setAttachmentModalVisible(false)}>
          <Pressable style={styles.attachmentSheet} onPress={() => undefined}>
            <Text style={styles.attachmentTitle}>Add Attachment</Text>

            <TouchableOpacity style={styles.attachmentOption} onPress={pickFromGallery}>
              <View style={styles.attachmentIconContainer}>
                <ImageIcon size={24} color={Colors.primary} />
              </View>
              <View style={styles.attachmentOptionContent}>
                <Text style={styles.attachmentOptionTitle}>Gallery</Text>
                <Text style={styles.attachmentOptionDescription}>Choose photos or videos from your gallery</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.attachmentOption} onPress={pickFromCamera}>
              <View style={styles.attachmentIconContainer}>
                <Camera size={24} color={Colors.primary} />
              </View>
              <View style={styles.attachmentOptionContent}>
                <Text style={styles.attachmentOptionTitle}>Camera</Text>
                <Text style={styles.attachmentOptionDescription}>Take a photo or video</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.attachmentOption} onPress={pickDocument}>
              <View style={styles.attachmentIconContainer}>
                <FileText size={24} color={Colors.primary} />
              </View>
              <View style={styles.attachmentOptionContent}>
                <Text style={styles.attachmentOptionTitle}>Documents</Text>
                <Text style={styles.attachmentOptionDescription}>Choose a file from your device</Text>
              </View>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* FORWARD MODAL */}
      <Modal visible={forwardModalVisible} transparent animationType="slide" onRequestClose={() => setForwardModalVisible(false)}>
        <View style={styles.attachmentOverlay}>
          <View style={[styles.attachmentSheet, { maxHeight: '70%' }]}>
            <Text style={styles.attachmentTitle}>Forward to</Text>
            <ScrollView>
              {forwardConversations.map((convo) => {
                const other = convo.participants.find((p) => p.id !== (session?.user.id ?? '')) ?? convo.participants[0];
                return (
                  <TouchableOpacity key={convo.id} style={styles.attachmentOption} onPress={() => handleForwardTo(convo.id)}>
                    <Image source={{ uri: other.avatar }} style={{ width: 40, height: 40, borderRadius: 8, marginRight: Spacing.md }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '600', color: Colors.gray900 }}>{other.fullName}</Text>
                      <Text style={{ color: Colors.gray600 }}>{convo.lastMessage}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={[styles.blockButton, { marginTop: Spacing.md }]} onPress={() => setForwardModalVisible(false)}>
              <Text style={styles.blockCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!selectedAttachment} transparent animationType="fade" onRequestClose={() => setSelectedAttachment(null)}>
        <Pressable style={styles.viewerOverlay} onPress={() => setSelectedAttachment(null)}>
          <View style={styles.viewerContainer}>
            {selectedAttachment?.type === 'image' && (
              <Image
                source={{ uri: selectedAttachment.url }}
                style={styles.viewerImage}
                resizeMode="contain"
              />
            )}
            {selectedAttachment?.type === 'video' && (
              <View style={styles.viewerPlaceholder}>
                <Text style={styles.viewerPlaceholderText}>🎥</Text>
                <Text style={styles.viewerPlaceholderLabel}>Video</Text>
              </View>
            )}
            {selectedAttachment?.type === 'audio' && (
              <View style={styles.viewerPlaceholder}>
                <Text style={styles.viewerPlaceholderText}>🎵</Text>
                <Text style={styles.viewerPlaceholderLabel}>Audio</Text>
              </View>
            )}
            {selectedAttachment?.type === 'file' && (
              <View style={styles.viewerPlaceholder}>
                <Text style={styles.viewerPlaceholderText}>📄</Text>
                <Text style={styles.viewerPlaceholderLabel}>File</Text>
              </View>
            )}
            
            {selectedAttachment?.type !== 'image' && (
              <TouchableOpacity 
                style={styles.downloadButton}
                onPress={() => openAttachmentFile(selectedAttachment)}
              >
                <Text style={styles.downloadButtonText}>Open File</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedAttachment(null)}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* SEARCH MODAL */}
      <Modal visible={searchVisible} transparent animationType="slide" onRequestClose={() => setSearchVisible(false)}>
        <View style={styles.searchContainer}>
          <View style={styles.searchHeader}>
            <TouchableOpacity onPress={() => setSearchVisible(false)}>
              <ArrowLeft size={24} color={Colors.gray900} />
            </TouchableOpacity>
            <TextInput
              placeholder="Search messages..."
              placeholderTextColor={Colors.gray500}
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
            />
            {searchText ? (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          
          <ScrollView style={styles.searchResults} showsVerticalScrollIndicator={false}>
            {getSearchResults().length === 0 ? (
              <View style={styles.emptySearchState}>
                <Text style={styles.emptySearchTitle}>
                  {searchText ? 'No messages found' : 'Search conversations'}
                </Text>
              </View>
            ) : (
              getSearchResults().map((msg, idx) => {
                const isMine = getSenderId(msg.sender as MessageSender) === currentUserId;
                return (
                  <View key={idx} style={styles.searchResultItem}>
                    <Text style={[styles.searchResultText, isMine ? styles.myMessageText : styles.theirMessageText]}>
                      {msg.text}
                    </Text>
                    <Text style={styles.searchResultTime}>{formatTime(msg.createdAt)}</Text>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* MEDIA MODAL */}
      <Modal visible={mediaVisible} transparent animationType="slide" onRequestClose={() => setMediaVisible(false)}>
        <View style={styles.mediaContainer}>
          <View style={styles.mediaHeader}>
            <TouchableOpacity onPress={() => setMediaVisible(false)}>
              <ArrowLeft size={24} color={Colors.white} />
            </TouchableOpacity>
            <Text style={styles.mediaHeaderTitle}>
              Media ({getAllMedia().reduce((sum, msg) => sum + (msg.attachments?.length || 0), 0)})
            </Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView style={styles.mediaGrid} showsVerticalScrollIndicator={false} scrollEnabled>
            {getAllMedia().length === 0 ? (
              <View style={styles.emptyMediaState}>
                <Text style={styles.emptyMediaTitle}>No media shared</Text>
              </View>
            ) : (
              <View style={styles.mediaGridContainer}>
                {getAllMedia().map((msg, msgIdx) =>
                  msg.attachments?.map((attachment, attIdx) => {
                    const fileName = attachment.url?.split('/').pop() || `attachment-${attIdx}`;
                    const fileInfo = getFileIcon(fileName, attachment.type);
                    
                    return (
                      <TouchableOpacity
                        key={`${msgIdx}-${attIdx}`}
                        style={styles.mediaGridItem}
                        onPress={() => {
                          setMediaVisible(false);
                          setSelectedAttachment(attachment);
                        }}
                      >
                        {attachment.type === 'image' ? (
                          <Image
                            source={{ uri: attachment.url }}
                            style={styles.mediaGridImage}
                          />
                        ) : (
                          <View style={[styles.mediaGridPlaceholder, { backgroundColor: getAttachmentColor(attachment.type) }]}>
                            <Text style={styles.mediaGridIcon}>{fileInfo.icon}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* BLOCK CONFIRMATION MODAL */}
      <Modal visible={blockModalVisible} transparent animationType="fade" onRequestClose={() => setBlockModalVisible(false)}>
        <Pressable style={styles.blockOverlay} onPress={() => setBlockModalVisible(false)}>
          <View style={styles.blockDialog}>
            <Text style={styles.blockTitle}>
              {isParticipantBlocked ? `Unblock ${participant?.fullName || 'this user'}?` : `Block ${participant?.fullName || 'this user'}?`}
            </Text>
            <Text style={styles.blockMessage}>
              {isParticipantBlocked
                ? 'They will be able to send you messages and view your profile.'
                : "This user won't be able to contact you or see your profile."}
            </Text>
            
            <View style={styles.blockActions}>
              <TouchableOpacity 
                style={[styles.blockButton, styles.blockCancelButton]}
                onPress={() => setBlockModalVisible(false)}
              >
                <Text style={styles.blockCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.blockButton, styles.blockConfirmButton, isParticipantBlocked && styles.unblockConfirmButton]}
                onPress={handleBlockAction}
                disabled={isBlocking}
              >
                <Text style={styles.blockConfirmText}>
                  {isBlocking
                    ? (isParticipantBlocked ? 'Unblocking...' : 'Blocking...')
                    : (isParticipantBlocked ? 'Unblock' : 'Block')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FC',
    flexDirection: 'column',
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
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
    zIndex: 10,
  },
  backIconButton: {
    padding: 4,
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
  currencyBadge: {
    backgroundColor: Colors.gray100,
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray900,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  
  /* Menu Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  menuDropdown: {
    position: 'absolute',
    top: 100,
    right: 16,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    width: 160,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
  },
  menuOptionText: {
    fontSize: FontSizes.md,
    color: Colors.gray800,
    fontWeight: FontWeights.medium as any,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.gray100,
    marginVertical: 4,
  },

  actionSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    justifyContent: 'flex-end',
  },
  actionSheetCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    borderRadius: 24,
    padding: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  actionSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  actionSheetTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
  },
  actionSheetClose: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSheetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  actionSheetButton: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  actionSheetIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionSheetDangerIcon: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  actionSheetLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray800,
    fontWeight: FontWeights.semiBold as any,
  },

  selectionToolbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    paddingTop: 56,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  selectionToolbarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  selectionToolbarClose: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionToolbarTitleWrap: {
    flex: 1,
  },
  selectionToolbarTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
  },
  selectionToolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectionToolbarButton: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.76)',
  },
  messagesSurface: {
    flex: 1,
  },

  messages: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    paddingBottom: Spacing.lg,
    flexGrow: 1,
  },
  messagesScrollView: {
    flex: 1,
  },
  emptyConversationState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyConversationTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
  },
  emptyConversationText: {
    marginTop: 8,
    color: Colors.gray600,
    fontSize: FontSizes.sm,
    textAlign: 'center',
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
    width: '100%',
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
    maxWidth: '78%',
    minWidth: 90,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  theirBubble: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    alignSelf: 'flex-start',
  },
  selectedBubble: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  myBubble: {
    backgroundColor: '#0b7ed0',
    borderBottomRightRadius: 8,
    alignSelf: 'flex-end',
  },
  forwardedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  forwardedText: {
    fontSize: 11,
    color: Colors.gray500,
    fontWeight: FontWeights.semiBold as any,
    letterSpacing: 0.4,
  },
  repliedMessageCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    borderRadius: 16,
    marginBottom: 8,
    overflow: 'hidden',
  },
  replyAccent: {
    width: 3,
    backgroundColor: Colors.primary,
  },
  repliedMessageBody: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  repliedMessageAuthor: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: FontWeights.semiBold as any,
    marginBottom: 2,
  },
  repliedMessageText: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
  },
  messageText: {
    fontSize: 17,
    lineHeight: 24,
    flexShrink: 1,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  theirMessageText: {
    color: Colors.gray900,
  },
  myMessageText: {
    color: Colors.white,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    opacity: 0.7,
    includeFontPadding: false,
    textAlign: 'right',
  },
  theirMessageTime: {
    color: Colors.gray500,
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.75)',
  },
  typingRow: {
    marginBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  typingBubble: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  typingText: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    fontStyle: 'italic',
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 18,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    opacity: 0.55,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  composerShell: {
    marginHorizontal: 10,
    marginBottom: 8,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  attachButton: {
    width: 42,
    height: 42,
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
    marginHorizontal: 10,
    color: Colors.gray900,
    fontSize: FontSizes.md,
    minHeight: 44,
    paddingVertical: 8,
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  replyPreviewAuthor: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.primary,
  },
  replyPreviewText: {
    color: Colors.gray600,
    flex: 1,
  },
  replyPreviewBody: {
    flex: 1,
    marginHorizontal: 10,
  },
  replyAccent: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
  replyCancel: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  replyCancelText: {
    color: Colors.gray500,
    fontSize: 18,
  },
  sendButton: {
    width: 44,
    height: 44,
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
  attachmentOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  attachmentSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  attachmentTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
    marginBottom: Spacing.lg,
  },
  attachmentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray50,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  attachmentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    opacity: 0.1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  attachmentOptionContent: {
    flex: 1,
  },
  attachmentOptionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
    marginBottom: 2,
  },
  attachmentOptionDescription: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
  },
  attachmentsContainer: {
    marginBottom: 8,
  },
  attachmentItem: {
    marginBottom: 8,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  attachmentImage: {
    width: 210,
    height: 210,
    borderRadius: 18,
  },
  attachmentPlaceholder: {
    width: 168,
    height: 156,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentPlaceholderText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
  },
  attachmentPlaceholderLabel: {
    fontSize: 10,
    color: Colors.white,
    marginTop: 2,
    fontWeight: FontWeights.medium as any,
  },
  attachmentFileName: {
    fontSize: 10,
    color: Colors.white,
    marginTop: 4,
    fontWeight: FontWeights.medium as any,
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  viewerImage: {
    width: '100%',
    height: '100%',
  },
  viewerPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  viewerPlaceholderText: {
    fontSize: 60,
    marginBottom: 12,
  },
  viewerPlaceholderLabel: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semiBold as any,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: Colors.white,
    fontSize: 28,
    fontWeight: FontWeights.bold as any,
  },
  downloadButton: {
    position: 'absolute',
    bottom: 50,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  downloadButtonText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
  },
  
  /* SEARCH MODAL STYLES */
  searchContainer: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingTop: 56,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    gap: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.gray900,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.gray50,
    borderRadius: 18,
  },
  clearSearchText: {
    fontSize: 24,
    color: Colors.gray500,
  },
  searchResults: {
    flex: 1,
  },
  emptySearchState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptySearchTitle: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
  },
  searchResultItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    backgroundColor: Colors.white,
  },
  searchResultText: {
    fontSize: FontSizes.md,
    color: Colors.gray900,
    marginBottom: 4,
  },
  searchResultTime: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },

  /* MEDIA MODAL STYLES */
  mediaContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    paddingTop: 56,
  },
  mediaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  mediaHeaderTitle: {
    fontSize: FontSizes.lg,
    color: Colors.white,
    fontWeight: FontWeights.semiBold as any,
  },
  mediaGrid: {
    flex: 1,
  },
  mediaGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.sm,
  },
  mediaGridItem: {
    width: '33.33%',
    aspectRatio: 1,
    padding: 2,
  },
  mediaGridImage: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.sm,
  },
  mediaGridPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaGridIcon: {
    fontSize: 24,
  },
  emptyMediaState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyMediaTitle: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
  },

  /* BLOCK MODAL STYLES */
  blockOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockDialog: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  blockTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  blockMessage: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    marginBottom: Spacing.lg,
    textAlign: 'center',
    lineHeight: 22,
  },
  blockActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  blockButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockCancelButton: {
    backgroundColor: Colors.gray100,
  },
  blockConfirmButton: {
    backgroundColor: '#EF4444',
  },
  blockCancelText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
  },
  blockConfirmText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.white,
  },
  unblockConfirmButton: {
    backgroundColor: Colors.primary,
  },
  blockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    shadowColor: Colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 3,
  },
  blockedBannerText: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    fontWeight: FontWeights.medium as any,
  },
  unblockBannerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unblockBannerButtonText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
  },
});