import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Plus, Send, X } from 'lucide-react-native';

interface ReplyPreviewMessage {
  sender?: { fullName?: string } | string;
  text?: string;
  attachments?: any[];
}

interface ChatInputBarProps {
  newMessage: string;
  handleMessageChange: (text: string) => void;
  sendMessage: () => void;
  replyToMessage: ReplyPreviewMessage | null;
  setReplyToMessage: (msg: any) => void;
  inputRef: React.RefObject<TextInput | null>;
  getReplyPreviewLabel: (message: { text?: string; attachments?: any[] }) => string;
  setAttachmentModalVisible: (v: boolean) => void;
  bottomInset: number;
}

export default function ChatInputBar({
  newMessage,
  handleMessageChange,
  sendMessage,
  replyToMessage,
  setReplyToMessage,
  inputRef,
  getReplyPreviewLabel,
  setAttachmentModalVisible,
  bottomInset,
}: ChatInputBarProps) {

  return (
    <View style={[styles.footerContainer, { paddingBottom: bottomInset > 0 ? bottomInset : 12 }]}>
      {replyToMessage && (
        <View style={styles.replyPreview}>
          <View style={styles.replyPreviewAccent} />
          <View style={styles.replyPreviewBody}>
            <Text style={styles.replyPreviewAuthor}>
              {(typeof replyToMessage.sender === 'object' ? replyToMessage.sender?.fullName : undefined) ?? 'Reply'}
            </Text>
            <Text style={styles.replyPreviewText} numberOfLines={1}>
              {getReplyPreviewLabel(replyToMessage)}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyToMessage(null)} style={styles.replyCancel}>
            <X size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.inputCapsule}>
        <TouchableOpacity style={styles.attachButton} onPress={() => setAttachmentModalVisible(true)} activeOpacity={0.7}>
          <Plus size={22} color="#64748B" />
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          style={styles.textInput}
          placeholder="Write a message"
          placeholderTextColor="#94A3B8"
          value={newMessage}
          onChangeText={handleMessageChange}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />

        <TouchableOpacity
          style={[styles.sendCircle, { backgroundColor: newMessage.trim() ? '#0EA5E9' : '#E2E8F0' }]}
          activeOpacity={0.8}
          disabled={!newMessage.trim()}
          onPress={sendMessage}
        >
          <Send size={16} color={newMessage.trim() ? '#FFFFFF' : '#94A3B8'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footerContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  replyPreviewAccent: {
    width: 3,
    height: 32,
    borderRadius: 2,
    backgroundColor: '#0EA5E9',
    marginRight: 10,
  },
  replyPreviewBody: {
    flex: 1,
    marginHorizontal: 10,
  },
  replyPreviewAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0EA5E9',
  },
  replyPreviewText: {
    color: '#64748B',
    fontSize: 13,
    flex: 1,
  },
  replyCancel: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  inputCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 6,
    paddingVertical: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    height: 40,
    fontSize: 15,
    color: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 0,
    includeFontPadding: false,
  },
  sendCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
});
