import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, MoreVertical, Send, Search, Ban, Image as ImageIcon, Camera, FileText } from 'lucide-react-native';
import { io, Socket } from 'socket.io-client';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Colors, FontWeights, Spacing, BorderRadius, FontSizes } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from '@/lib/apiBaseUrl';
import {
  getConversationMessages,
  getConversations,
  type ChatConversation,
  type ChatMessage,
} from '@/lib/chatApi';
import { getCurrentUserProfile } from '@/lib/profileApi';

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
  const [attachmentModalVisible, setAttachmentModalVisible] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<{ url: string; type: string } | null>(null);
  
  // Menu features state
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [mediaVisible, setMediaVisible] = useState(false);
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);

  const conversationId = String(params.id ?? '');
  const currentUserId = session?.user.id ?? '';

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

        setLoading(true);
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
          setConversation(null);
          setMessages([]);
          setError(conversationError || 'Unable to load chat.');
        } else {
          const activeConversation = conversationData?.conversations?.find((item) => item.id === conversationId) ?? null;
          setConversation(activeConversation);
        }

        if (messageError || !messageData) {
          setMessages([]);
          setError((previousError) => previousError ?? messageError ?? null);
        } else {
          setMessages(messageData.messages);
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
      setMessages((previousMessages) => appendUniqueMessage(previousMessages, message));
      setIsParticipantTyping(false);
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

    socket.emit(
      'sendMessage',
      { conversationId, text: trimmedMessage },
      (response: SocketAck) => {
        if (response?.error) {
          setError(response.error);
          return;
        }

        if (response?.message) {
          setMessages((previousMessages) => appendUniqueMessage(previousMessages, response.message as ChatMessage));
          setNewMessage('');
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

  if (loading) {
    return (
      <View style={[styles.container, styles.centerState]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

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

  if (!conversation || error) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>{error || 'Chat not found'}</Text>
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

      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.messages} showsVerticalScrollIndicator={false} style={styles.messagesScrollView}>
        {messages.length === 0 ? (
          <View style={styles.emptyConversationState}>
            <Text style={styles.emptyConversationTitle}>No messages yet</Text>
            <Text style={styles.emptyConversationText}>Send the first message to start the conversation.</Text>
          </View>
        ) : (
          messages.map((message) => {
            const isMine = getSenderId(message.sender as MessageSender) === currentUserId;
            const hasAttachments = message.attachments && message.attachments.length > 0;
            
            return (
              <View
                key={message.id}
                style={[styles.messageRow, isMine ? styles.messageRowRight : styles.messageRowLeft]}
              >
                <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
                  {hasAttachments && (
                    <View style={styles.attachmentsContainer}>
                      {message.attachments.map((attachment, idx) => {
                        const fileName = attachment.url?.split('/').pop() || `attachment-${idx}`;
                        const fileInfo = getFileIcon(fileName, attachment.type);
                        
                        return (
                          <TouchableOpacity
                            key={idx}
                            style={styles.attachmentItem}
                            onPress={() => {
                              console.log('Viewing attachment:', attachment);
                              setError(null);
                              setSelectedAttachment(attachment);
                            }}
                          >
                            {attachment.type === 'image' && (
                              <Image
                                source={{ uri: attachment.url }}
                                style={styles.attachmentImage}
                              />
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
                  <Text style={[styles.messageTime, isMine ? styles.myMessageTime : styles.theirMessageTime]}>
                    {formatTime(message.createdAt)}
                  </Text>
                </View>
              </View>
            );
          })
        )}

        {isParticipantTyping ? (
          <View style={styles.typingRow}>
            <View style={styles.typingBubble}>
              <Text style={styles.typingText}>{participant?.fullName ?? 'The other user'} is typing...</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

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
        <View style={styles.composer}>
          <TouchableOpacity style={styles.attachButton} onPress={() => setAttachmentModalVisible(true)}>
            <Text style={styles.attachText}>+</Text>
          </TouchableOpacity>
          <TextInput
            ref={inputRef}
            placeholder="Write a message"
            placeholderTextColor={Colors.gray500}
            style={styles.input}
            value={newMessage}
            onChangeText={handleMessageChange}
            onBlur={() => emitTypingState(false)}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Send size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>
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
  typingRow: {
    marginBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  typingBubble: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: Colors.black,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  typingText: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    fontStyle: 'italic',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    shadowColor: Colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
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
    width: 200,
    height: 200,
    borderRadius: BorderRadius.md,
  },
  attachmentPlaceholder: {
    width: 150,
    height: 150,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: BorderRadius.md,
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.gray900,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
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
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
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