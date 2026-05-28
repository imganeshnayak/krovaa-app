import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Forward, CornerUpLeft } from 'lucide-react-native';
import DocumentMessage from './DocumentMessage';
import { Colors, FontWeights, FontSizes } from '@/constants/theme';
import type { ExtendedChatMessage } from '@/lib/chatTypes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');


interface MessageBubbleProps {
  message: ExtendedChatMessage;
  currentUserId: string;
  selectionModeActive: boolean;
  isMessageSelected: (id: string) => boolean;
  onLongPress: (message: ExtendedChatMessage, event: any) => void;
  onPress: (message: ExtendedChatMessage) => void;
  onReplyTriggered: (message: ExtendedChatMessage) => void;
  onScrollToMessage: (messageId: string) => void;
  formatTime: (value?: string) => string;
  imageAspectRatios: Record<string, number>;
  onImageLoad: (url: string, width: number, height: number) => void;
  onAttachmentPress: (attachment: any) => void;
}

function getSenderId(sender: string | { _id?: string; id?: string } | undefined) {
  if (!sender) return '';
  return typeof sender === 'string' ? sender : sender._id ?? sender.id ?? '';
}

function isForwardedMessage(message: ExtendedChatMessage) {
  return Boolean(message.isForwarded || message.forwardedFrom);
}

export default function MessageBubble({
  message,
  currentUserId,
  selectionModeActive,
  isMessageSelected,
  onLongPress,
  onPress,
  onReplyTriggered,
  onScrollToMessage,
  formatTime,
  imageAspectRatios,
  onImageLoad,
  onAttachmentPress,
}: MessageBubbleProps) {
  const isMine = getSenderId(message.sender) === currentUserId;
  const hasAttachments = message.attachments && message.attachments.length > 0;
  const isMediaOnly = hasAttachments && !message.text;
  const forwarded = isForwardedMessage(message);
  const replyTo = message.replyTo as any;
  const pan = useRef(new Animated.Value(0)).current;

  const onGestureEvent = (event: any) => {
    pan.setValue(event.nativeEvent.translationX);
  };

  const onHandlerStateChange = ({ nativeEvent }: any) => {
    if (nativeEvent.state !== State.END && nativeEvent.oldState !== State.ACTIVE) return;
    const translationX = nativeEvent.translationX ?? 0;
    if ((isMine && translationX < -65) || (!isMine && translationX > 65)) {
      onReplyTriggered(message);
    }
    Animated.spring(pan, {
      toValue: 0,
      tension: 60,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const replyOpacity = pan.interpolate({
    inputRange: isMine ? [-70, -30, 0] : [0, 30, 70],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });
  const replyScale = pan.interpolate({
    inputRange: isMine ? [-70, -30, 0] : [0, 30, 70],
    outputRange: [1, 0.7, 0],
    extrapolate: 'clamp',
  });

  const formattedTime = message.createdAt
    ? formatTime(message.createdAt)
    : '';

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
      activeOffsetX={isMine ? [-15, 1000] : [-1000, 15]}
    >
      <View style={[styles.rowContainer, isMine ? styles.rowRight : styles.rowLeft]}>
        <Animated.View
          style={[
            styles.replyActionBackground,
            { opacity: replyOpacity },
            isMine ? styles.replyActionRight : styles.replyActionLeft,
          ]}
        >
          <Animated.View style={[styles.replyActionIcon, { transform: [{ scale: replyScale }] }]}>
            <CornerUpLeft size={18} color={Colors.gray500} />
          </Animated.View>
        </Animated.View>

        <Animated.View style={{ transform: [{ translateX: pan }] }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onLongPress={(e) => onLongPress(message, e)}
            onPress={() => onPress(message)}
          >
            <View
              style={[
                styles.bubble,
                isMine ? styles.bubbleMe : styles.bubbleThem,
                isMessageSelected(message.id) ? styles.selectedBubble : null,
                isMediaOnly ? styles.mediaBubbleModifier : null,
              ]}
            >
              {forwarded && (
                <View style={styles.forwardedRow}>
                  <Forward size={11} color={isMine ? 'rgba(255,255,255,0.7)' : Colors.gray500} />
                  <Text style={[styles.forwardedText, isMine && { color: 'rgba(255,255,255,0.7)' }]}>
                    Forwarded
                  </Text>
                </View>
              )}

              {replyTo && (
                <TouchableOpacity
                  style={[
                    styles.repliedMessageCard,
                    isMine ? styles.repliedMessageCardMine : styles.repliedMessageCardTheirs,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => onScrollToMessage(replyTo.id)}
                >
                  <View style={styles.repliedMessageBody}>
                    <Text
                      style={[
                        styles.repliedMessageAuthor,
                        isMine && { color: 'rgba(255,255,255,0.9)' },
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {replyTo.sender?.fullName ?? 'Reply'}
                    </Text>
                    <Text
                      style={[
                        styles.repliedMessageText,
                        isMine && { color: 'rgba(255,255,255,0.7)' },
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {replyTo.text || 'Attachment'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {isMediaOnly ? (
                message.attachments!.map((attachment, idx) => {
                  const isImageAttachment = attachment.type === 'image';
                  const fileName = attachment.url?.split('/').pop() || `attachment-${idx}`;
                  return (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.9}
                      onPress={() => onAttachmentPress(attachment)}
                    >
                      {isImageAttachment ? (
                        <View style={styles.mediaContainer}>
                          <Image
                            source={{ uri: attachment.url }}
                            style={styles.bubbleImage}
                            resizeMode="cover"
                            onLoad={(event) => {
                              const source = event.nativeEvent.source;
                              if (source?.width && source?.height) {
                                onImageLoad(attachment.url, source.width, source.height);
                              }
                            }}
                          />
                          <View style={styles.mediaTimestampOverlay}>
                            <Text style={styles.mediaTimestampText}>{formattedTime}</Text>
                          </View>
                        </View>
                      ) : (
                        <DocumentMessage
                          fileName={fileName}
                          isMine={isMine}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <>
                  {hasAttachments && (
                    <View style={styles.attachmentsContainer} pointerEvents={selectionModeActive ? 'none' : 'auto'}>
                      {message.attachments!.map((attachment, idx) => {
                        const fileName = attachment.url?.split('/').pop() || `attachment-${idx}`;
                        const isImageAttachment = attachment.type === 'image';
                        const imageAspectRatio = imageAspectRatios[attachment.url] ?? 1;
                        return (
                          <TouchableOpacity
                            key={idx}
                            style={[styles.attachmentItem, isImageAttachment ? styles.imageAttachmentItem : null]}
                            onPress={() => onAttachmentPress(attachment)}
                          >
                            {isImageAttachment ? (
                              <View style={[styles.imageAttachmentShell, { aspectRatio: imageAspectRatio }]}>
                                <Image
                                  source={{ uri: attachment.url }}
                                  style={styles.attachmentImage}
                                  resizeMode="cover"
                                  onLoad={(event) => {
                                    const source = event.nativeEvent.source;
                                    if (source?.width && source?.height) {
                                      onImageLoad(attachment.url, source.width, source.height);
                                    }
                                  }}
                                />
                                <View style={styles.mediaTimestampOverlay}>
                                  <Text style={styles.mediaTimestampText}>{formattedTime}</Text>
                                </View>
                              </View>
                            ) : (
                              <DocumentMessage
                                fileName={fileName}
                                isMine={isMine}
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                  <View style={styles.textContainerWrapper}>
                    {message.text && (
                      <Text style={[styles.msgText, isMine ? styles.textMe : styles.textThem]}>
                        {message.text}
                      </Text>
                    )}
                    {formattedTime ? (
                      <Text style={[styles.timestamp, isMine ? styles.timeMe : styles.timeThem]}>
                        {formattedTime}
                      </Text>
                    ) : null}
                  </View>
                </>
              )}
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  rowContainer: {
    width: '100%',
    marginVertical: 3,
    paddingHorizontal: 14,
    position: 'relative',
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  rowLeft: {
    alignItems: 'flex-start',
  },
  replyActionBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 0,
  },
  replyActionRight: {
    right: 24,
  },
  replyActionLeft: {
    left: 24,
  },
  replyActionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: SCREEN_WIDTH * 0.75,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1.5,
    elevation: 1,
  },
  mediaBubbleModifier: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    overflow: 'hidden',
  },
  bubbleMe: {
    backgroundColor: '#0ea5e9',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  selectedBubble: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  forwardedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
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
    alignSelf: 'stretch',
    width: '100%',
    borderRadius: 8,
    marginBottom: 6,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderLeftWidth: 3,
  },
  repliedMessageCardMine: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderLeftColor: '#FFFFFF',
  },
  repliedMessageCardTheirs: {
    backgroundColor: 'rgba(14, 165, 233, 0.06)',
    borderLeftColor: '#0ea5e9',
  },
  repliedMessageBody: {
    flex: 1,
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
  textContainerWrapper: {
    flexDirection: 'column',
    minWidth: 45,
  },
  msgText: {
    fontSize: 15,
    lineHeight: 20,
  },
  textMe: { color: '#FFFFFF' },
  textThem: { color: '#1E293B' },
  timestamp: {
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 2,
    includeFontPadding: false,
  },
  timeMe: { color: 'rgba(255, 255, 255, 0.75)' },
  timeThem: { color: '#94A3B8' },
  attachmentsContainer: {
    marginBottom: 6,
  },
  attachmentItem: {
    marginBottom: 6,
    borderRadius: 10,
    overflow: 'hidden',
  },
  imageAttachmentItem: {
    borderRadius: 16,
  },
  imageAttachmentShell: {
    width: '100%',
    minWidth: 180,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.gray100,
    position: 'relative',
  },
  attachmentImage: {
    width: '100%',
    height: '100%',
  },
  imageTimestampPill: {
    position: 'absolute',
    right: 8,
    bottom: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  imageTimestampText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
    includeFontPadding: false,
  },
  mediaContainer: {
    position: 'relative',
    width: SCREEN_WIDTH * 0.72,
    height: SCREEN_WIDTH * 0.9,
  },
  bubbleImage: {
    width: '100%',
    height: '100%',
  },
  mediaTimestampOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  mediaTimestampText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
    includeFontPadding: false,
  },
});
